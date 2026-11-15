// AC-6: restore returns settings to the pre-pick state and removes the overlay; it is idempotent.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { hashTree, makeFixture } from './helpers/fixture.js';

const ID = 'gitkit@sample-market';

describe('restore', () => {
  it('puts enabledPlugins and extraKnownMarketplaces back and deletes the overlay', () => {
    const fx = makeFixture();
    const before = fx.readSettings();
    fx.plug(['pick', ID, '--keep', 'commit,status']);
    expect(fx.readSettings()).not.toEqual(before);
    const r = fx.plug(['restore', ID]);
    expect(r.code).toBe(0);
    expect(r.out).toContain('Restored gitkit@sample-market');
    const after = fx.readSettings();
    expect(after.enabledPlugins).toEqual(before.enabledPlugins);
    expect(after.extraKnownMarketplaces).toEqual(before.extraKnownMarketplaces);
    expect(after).toEqual(before);
    expect(fs.existsSync(path.join(fx.store, 'marketplace'))).toBe(false);
  });

  it('a second restore exits 0 and changes nothing', () => {
    const fx = makeFixture();
    fx.plug(['pick', ID, '--keep', 'commit']);
    fx.plug(['restore', ID]);
    const configBefore = hashTree(fx.config);
    const storeBefore = hashTree(fx.store);
    const again = fx.plug(['restore', ID]);
    expect(again.code).toBe(0);
    expect(again.out).toContain('Nothing to restore');
    expect(hashTree(fx.config)).toBe(configBefore);
    expect(hashTree(fx.store)).toBe(storeBefore);
  });

  it('leaves settings keys changed after the pick alone', () => {
    const fx = makeFixture();
    fx.plug(['pick', ID, '--keep', 'commit']);
    const edited = fx.readSettings();
    edited.theme = 'light';
    edited.extraKnownMarketplaces = { ...(edited.extraKnownMarketplaces as object), other: { source: { source: 'github', repo: 'a/b' } } };
    fx.writeSettings(edited);
    fx.plug(['restore', ID]);
    const after = fx.readSettings();
    expect(after.theme).toBe('light');
    expect(after.extraKnownMarketplaces).toEqual({ other: { source: { source: 'github', repo: 'a/b' } } });
    expect(after.enabledPlugins).toEqual({ 'gitkit@sample-market': true });
  });

  it('restores a previously declared marketplace value and a prior enabled flag', () => {
    const fx = makeFixture();
    const custom = { source: { source: 'directory', path: '/somewhere/else' } };
    fx.writeSettings({
      enabledPlugins: { 'gitkit@sample-market': true, 'gitkit@plugslim': false },
      extraKnownMarketplaces: { plugslim: custom },
    });
    const before = fx.readSettings();
    fx.plug(['pick', ID, '--keep', 'commit']);
    fx.plug(['restore', ID]);
    expect(fx.readSettings()).toEqual(before);
  });

  it('works on a settings.json that did not exist before the pick', () => {
    const fx = makeFixture();
    fs.rmSync(fx.settingsPath);
    fx.plug(['pick', ID, '--keep', 'commit']);
    expect(fx.plug(['restore', ID]).code).toBe(0);
    expect(fx.readSettings()).toEqual({});
  });

  it('needs an id or --all when overlays exist; --all restores every overlay', () => {
    const fx = makeFixture();
    fx.plug(['pick', ID, '--keep', 'commit']);
    const missing = fx.plug(['restore']);
    expect(missing.code).toBe(2);
    expect(missing.err).toContain(ID);
    const all = fx.plug(['restore', '--all']);
    expect(all.code).toBe(0);
    expect(fx.readSettings().enabledPlugins).toEqual({ 'gitkit@sample-market': true });
    expect(fx.plug(['restore']).out).toContain('Nothing to restore');
  });

  it('accepts the overlay id and invalid settings stop it before any write', () => {
    const fx = makeFixture();
    fx.plug(['pick', ID, '--keep', 'commit']);
    fs.writeFileSync(fx.settingsPath, 'not json');
    const storeBefore = hashTree(fx.store);
    const r = fx.plug(['restore', 'gitkit@plugslim']);
    expect(r.code).toBe(2);
    expect(hashTree(fx.store)).toBe(storeBefore);
  });
});
