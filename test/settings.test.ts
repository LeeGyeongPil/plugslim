// AC-5: settings edits are backed up, minimal, order-preserving and safe.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { UsageError } from '../src/errors.js';
import { applyPick, diffSettings, readSettings } from '../src/settings.js';
import { hashTree, makeFixture } from './helpers/fixture.js';

const ID = 'gitkit@sample-market';

describe('settings edit', () => {
  it('creates a backup of the previous settings.json', () => {
    const fx = makeFixture();
    const original = fs.readFileSync(fx.settingsPath, 'utf8');
    const r = fx.plug(['pick', ID, '--keep', 'commit']);
    expect(r.code).toBe(0);
    const backups = fs.readdirSync(path.join(fx.store, 'backups'));
    expect(backups).toEqual(['2026-11-15T12-00-00-000Z-user-settings.json']);
    expect(fs.readFileSync(path.join(fx.store, 'backups', backups[0]!), 'utf8')).toBe(original);
    expect(r.out).toContain('Settings backup:');
  });

  it('keeps non-target keys in order with their values and appends new keys at the end', () => {
    const fx = makeFixture();
    const before = fx.readSettings();
    fx.plug(['pick', ID, '--keep', 'commit']);
    const after = fx.readSettings();
    expect(Object.keys(after)).toEqual(['model', 'theme', 'enabledPlugins', 'permissions', 'extraKnownMarketplaces']);
    expect(after.model).toEqual(before.model);
    expect(after.theme).toEqual(before.theme);
    expect(after.permissions).toEqual(before.permissions);
    expect(Object.entries(after.enabledPlugins as object)).toEqual([
      ['gitkit@sample-market', false],
      ['gitkit@plugslim', true],
    ]);
  });

  it('declares the overlay marketplace as a directory source with an absolute path', () => {
    const fx = makeFixture();
    fx.plug(['pick', ID, '--keep', 'commit']);
    const markets = fx.readSettings().extraKnownMarketplaces as Record<string, { source: { source: string; path: string } }>;
    expect(markets.plugslim!.source).toEqual({ source: 'directory', path: path.join(fx.store, 'marketplace') });
    expect(path.isAbsolute(markets.plugslim!.source.path)).toBe(true);
  });

  it('writes 2-space indented JSON with a trailing newline', () => {
    const fx = makeFixture();
    fx.plug(['pick', ID, '--keep', 'commit']);
    const text = fs.readFileSync(fx.settingsPath, 'utf8');
    expect(text.endsWith('}\n')).toBe(true);
    expect(text).toContain('\n  "model": "sonnet"');
  });

  it('creates settings.json when it is missing (no backup needed)', () => {
    const fx = makeFixture();
    fs.rmSync(fx.settingsPath);
    const r = fx.plug(['pick', ID, '--keep', 'commit']);
    expect(r.code).toBe(0);
    expect(fx.readSettings()).toEqual({
      enabledPlugins: { 'gitkit@sample-market': false, 'gitkit@plugslim': true },
      extraKnownMarketplaces: { plugslim: { source: { source: 'directory', path: path.join(fx.store, 'marketplace') } } },
    });
    expect(fs.existsSync(path.join(fx.store, 'backups'))).toBe(false);
  });

  it('invalid JSON exits 2 and writes nothing', () => {
    const fx = makeFixture();
    fs.writeFileSync(fx.settingsPath, '{ "enabledPlugins": ');
    const configBefore = hashTree(fx.config);
    const r = fx.plug(['pick', ID, '--keep', 'commit']);
    expect(r.code).toBe(2);
    expect(r.err).toContain('Nothing was written');
    expect(hashTree(fx.config)).toBe(configBefore);
    expect(fs.existsSync(fx.store)).toBe(false);
  });

  it('refuses an enabledPlugins that is not an object and writes nothing', () => {
    const fx = makeFixture();
    fx.writeSettings({ enabledPlugins: ['x'] });
    const configBefore = hashTree(fx.config);
    const r = fx.plug(['pick', ID, '--keep', 'commit']);
    expect(r.code).toBe(2);
    expect(r.err).toContain('"enabledPlugins" must be a JSON object');
    expect(hashTree(fx.config)).toBe(configBefore);
    expect(fs.existsSync(fx.store)).toBe(false);
  });

  it('applyPick does not mutate its input, and diffSettings lists only changed keys', () => {
    const fx = makeFixture();
    const file = readSettings(fx.settingsPath);
    const snapshot = JSON.stringify(file.data);
    const next = applyPick(file, { origId: ID, overlayId: 'gitkit@plugslim', marketplace: 'plugslim', marketplacePath: '/x' });
    expect(JSON.stringify(file.data)).toBe(snapshot);
    const diff = diffSettings(file.data, next).join('\n');
    expect(diff).toContain('-   "gitkit@sample-market": true');
    expect(diff).toContain('+   "gitkit@sample-market": false');
    expect(diff).toContain('+   "gitkit@plugslim": true');
    expect(diff).not.toContain('model');
    expect(() => applyPick({ ...file, data: { extraKnownMarketplaces: 5 } }, { origId: ID, overlayId: 'a@b', marketplace: 'b', marketplacePath: '/x' })).toThrow(
      UsageError,
    );
  });
});
