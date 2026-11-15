// AC-7: sync follows upstream updates and keeps the same pick.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { hashTree, makeFixture, upgradeToV110 } from './helpers/fixture.js';

const ID = 'gitkit@sample-market';

function overlayOf(store: string): string {
  return path.join(store, 'marketplace', 'plugins', 'gitkit');
}

describe('sync', () => {
  it('prints "up to date" with exit 0 when nothing changed (also with --check)', () => {
    const fx = makeFixture();
    fx.plug(['pick', ID, '--keep', 'commit,status']);
    const r = fx.plug(['sync']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('up to date');
    expect(fx.plug(['sync', '--check']).code).toBe(0);
  });

  it('rebuilds after upstream 1.1.0 with the new commit text and leaves the new skill out', () => {
    const fx = makeFixture();
    fx.plug(['pick', ID, '--keep', 'commit,status']);
    upgradeToV110(fx);
    const r = fx.plug(['sync']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('new: rebase');
    expect(r.out).toContain('excluded');
    expect(r.out).toContain('rebuilt');
    const overlay = overlayOf(fx.store);
    expect(fs.readFileSync(path.join(overlay, 'skills', 'commit', 'SKILL.md'), 'utf8')).toContain('and a ticket id');
    expect(fs.existsSync(path.join(overlay, 'skills', 'rebase'))).toBe(false);
    expect(fs.existsSync(path.join(overlay, 'commands', 'status.md'))).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(path.join(overlay, '.claude-plugin', 'plugin.json'), 'utf8')) as { version: string };
    expect(manifest.version).toBe('1.1.0');
    // A second run has nothing left to do.
    const again = fx.plug(['sync']);
    expect(again.code).toBe(0);
    expect(again.out).toContain('up to date');
  });

  it('--include-new also keeps the new skill', () => {
    const fx = makeFixture();
    fx.plug(['pick', ID, '--keep', 'commit,status']);
    upgradeToV110(fx);
    const r = fx.plug(['sync', '--include-new']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('new: rebase');
    expect(r.out).toContain('(included)');
    expect(fs.existsSync(path.join(overlayOf(fx.store), 'skills', 'rebase', 'SKILL.md'))).toBe(true);
  });

  it('--check exits 1 when a rebuild is needed and writes nothing', () => {
    const fx = makeFixture();
    fx.plug(['pick', ID, '--keep', 'commit,status']);
    upgradeToV110(fx);
    const storeBefore = hashTree(fx.store);
    const r = fx.plug(['sync', '--check']);
    expect(r.code).toBe(1);
    expect(r.out).toContain('rebuild needed');
    expect(hashTree(fx.store)).toBe(storeBefore);
  });

  it('--dry-run reports but writes nothing', () => {
    const fx = makeFixture();
    fx.plug(['pick', ID, '--keep', 'commit,status']);
    upgradeToV110(fx);
    const storeBefore = hashTree(fx.store);
    const r = fx.plug(['sync', '--dry-run']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('Dry run');
    expect(hashTree(fx.store)).toBe(storeBefore);
  });

  it('keeps the overlay and reports SOURCE_MISSING when the original is gone', () => {
    const fx = makeFixture();
    fx.plug(['pick', ID, '--keep', 'commit,status']);
    fs.rmSync(fx.pluginDir, { recursive: true });
    const storeBefore = hashTree(fx.store);
    const r = fx.plug(['sync']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('SOURCE_MISSING');
    expect(hashTree(fx.store)).toBe(storeBefore);
  });

  it('reports a skill removed upstream and keeps the rest', () => {
    const fx = makeFixture();
    fx.plug(['pick', ID, '--keep', 'commit,status']);
    const next = upgradeToV110(fx);
    fs.rmSync(path.join(next, 'commands', 'status.md'));
    const r = fx.plug(['sync']);
    expect(r.out).toContain('removed upstream: status');
    expect(fs.existsSync(path.join(overlayOf(fx.store), 'commands', 'status.md'))).toBe(false);
  });

  it('says there is nothing to sync without overlays and rejects an unknown id', () => {
    const fx = makeFixture();
    expect(fx.plug(['sync']).out).toContain('No overlays to sync');
    fx.plug(['pick', ID, '--keep', 'commit']);
    expect(fx.plug(['sync', 'nope@x']).code).toBe(2);
  });
});
