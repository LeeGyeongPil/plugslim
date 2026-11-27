// AC-3 (dry-run) and AC-4 (overlay contents, errors).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkPlugin } from '../src/check.js';
import { hashTree, makeFixture } from './helpers/fixture.js';

const ID = 'gitkit@sample-market';

describe('pick', () => {
  it('dry-run writes nothing and prints the settings diff with before/after tokens', () => {
    const fx = makeFixture();
    const configBefore = hashTree(fx.config);
    const storeBefore = hashTree(fx.store);
    const r = fx.plug(['pick', ID, '--keep', 'commit,status', '--dry-run']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('"gitkit@sample-market": false');
    expect(r.out).toContain('"gitkit@plugslim": true');
    expect(r.out).toContain('123 -> 37');
    expect(r.out).toContain('Dry run: nothing was written.');
    expect(hashTree(fx.config)).toBe(configBefore);
    expect(hashTree(fx.store)).toBe(storeBefore);
    expect(fs.existsSync(fx.store)).toBe(false);
  });

  it('overlay keeps only the picked skill and command, with non-skill files byte-identical', () => {
    const fx = makeFixture();
    const r = fx.plug(['pick', ID, '--keep', 'commit,status']);
    expect(r.code).toBe(0);
    const overlay = path.join(fx.store, 'marketplace', 'plugins', 'gitkit');
    expect(fs.existsSync(path.join(overlay, 'skills', 'commit', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(overlay, 'commands', 'status.md'))).toBe(true);
    for (const gone of ['skills/clean-gone', 'skills/commit-push-pr', 'skills/deploy', 'extra-skills/changelog']) {
      expect(fs.existsSync(path.join(overlay, gone)), gone).toBe(false);
    }
    for (const same of ['hooks/hooks.json', 'scripts/notify.sh']) {
      expect(fs.readFileSync(path.join(overlay, same)).equals(fs.readFileSync(path.join(fx.pluginDir, same))), same).toBe(true);
    }
    // The manifest no longer points at the emptied extra-skills folder, so nothing dangles.
    const manifest = JSON.parse(fs.readFileSync(path.join(overlay, '.claude-plugin', 'plugin.json'), 'utf8')) as Record<string, unknown>;
    expect(manifest.skills).toBeUndefined();
    expect(manifest.name).toBe('gitkit');
    expect(checkPlugin(overlay)).toEqual([]);
    expect(r.out).toContain('Removed manifest entries');
    // Local-directory marketplace file.
    const market = JSON.parse(fs.readFileSync(path.join(fx.store, 'marketplace', '.claude-plugin', 'marketplace.json'), 'utf8')) as {
      name: string;
      plugins: Array<{ name: string; source: string }>;
    };
    expect(market.name).toBe('plugslim');
    expect(market.plugins).toMatchObject([{ name: 'gitkit', source: './plugins/gitkit' }]);
    // The overlay costs less than the original.
    const slim = JSON.parse(fx.plug(['ls', '--path', overlay, '--json']).out) as { totalTokens: number };
    expect(slim.totalTokens).toBe(37);
    expect(slim.totalTokens).toBeLessThan(123);
    // The original cache is untouched.
    expect(fs.existsSync(path.join(fx.pluginDir, 'skills', 'clean-gone', 'SKILL.md'))).toBe(true);
  });

  it('overlay keeps a manifest skills path that still holds a picked skill', () => {
    const fx = makeFixture();
    expect(fx.plug(['pick', ID, '--keep', 'commit,changelog']).code).toBe(0);
    const overlay = path.join(fx.store, 'marketplace', 'plugins', 'gitkit');
    const manifest = JSON.parse(fs.readFileSync(path.join(overlay, '.claude-plugin', 'plugin.json'), 'utf8')) as { skills?: string[] };
    expect(manifest.skills).toEqual(['./extra-skills/']);
    expect(fs.existsSync(path.join(overlay, 'extra-skills', 'changelog', 'SKILL.md'))).toBe(true);
    // commands/status.md was not picked
    expect(fs.existsSync(path.join(overlay, 'commands', 'status.md'))).toBe(false);
    expect(checkPlugin(overlay)).toEqual([]);
  });

  it('overlay --drop keeps everything else', () => {
    const fx = makeFixture();
    const r = fx.plug(['pick', ID, '--drop', 'clean-gone,deploy,commit-push-pr']);
    expect(r.code).toBe(0);
    const overlay = path.join(fx.store, 'marketplace', 'plugins', 'gitkit');
    expect(fs.readdirSync(path.join(overlay, 'skills'))).toEqual(['commit']);
    expect(fs.existsSync(path.join(overlay, 'extra-skills', 'changelog'))).toBe(true);
    expect(fs.existsSync(path.join(overlay, 'commands', 'status.md'))).toBe(true);
  });

  it('overlay accepts <plugin>:<skill> names for --keep and --drop', () => {
    const fx = makeFixture();
    const r = fx.plug(['pick', ID, '--keep', 'gitkit:commit,status', '--dry-run']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('123 -> 37');
    expect(r.out).toContain('keep: commit, status');
    expect(r.out).not.toContain('gitkit:commit');
    const d = fx.plug(['pick', ID, '--drop', 'gitkit:deploy', '--dry-run']);
    expect(d.code).toBe(0);
    expect(d.out).toContain('drop: deploy');
  });

  it('overlay: an exact name wins over prefix stripping, and another plugin prefix exits 2', () => {
    const fx = makeFixture();
    const skill = path.join(fx.pluginDir, 'skills', 'pref');
    fs.mkdirSync(skill, { recursive: true });
    fs.writeFileSync(path.join(skill, 'SKILL.md'), '---\nname: gitkit:pref\ndescription: Exact-name skill.\n---\n\nBody.\n');
    const ok = fx.plug(['pick', ID, '--keep', 'gitkit:pref', '--dry-run']);
    expect(ok.code).toBe(0);
    expect(ok.out).toContain('keep: gitkit:pref');
    const bad = fx.plug(['pick', ID, '--keep', 'other:commit']);
    expect(bad.code).toBe(2);
    expect(bad.err).toContain('other:commit');
  });

  it('overlay: an unknown skill name exits 2 and lists the available names', () => {
    const fx = makeFixture();
    const configBefore = hashTree(fx.config);
    const r = fx.plug(['pick', ID, '--keep', 'commit,nope']);
    expect(r.code).toBe(2);
    expect(r.err).toContain('nope');
    expect(r.err).toContain('Available:');
    for (const name of ['clean-gone', 'commit', 'commit-push-pr', 'deploy', 'changelog', 'status']) expect(r.err).toContain(name);
    expect(hashTree(fx.config)).toBe(configBefore);
    expect(fs.existsSync(fx.store)).toBe(false);
  });

  it('overlay: a reserved marketplace name exits 2', () => {
    const fx = makeFixture();
    for (const name of ['inline', 'claude-plugins-official', 'skills-dir', 'synced']) {
      const r = fx.plug(['pick', ID, '--keep', 'commit', '--marketplace-name', name]);
      expect(r.code, name).toBe(2);
      expect(r.err).toContain('reserved');
    }
    expect(fs.existsSync(fx.store)).toBe(false);
  });

  it('overlay: a custom marketplace name changes the ids', () => {
    const fx = makeFixture();
    const r = fx.plug(['pick', ID, '--keep', 'commit', '--marketplace-name', 'my-slim']);
    expect(r.code).toBe(0);
    const settings = fx.readSettings() as { enabledPlugins: Record<string, boolean>; extraKnownMarketplaces: Record<string, unknown> };
    expect(settings.enabledPlugins['gitkit@my-slim']).toBe(true);
    expect(Object.keys(settings.extraKnownMarketplaces)).toEqual(['my-slim']);
  });

  it('overlay: keeping nothing, both flags, or neither exits 2', () => {
    const fx = makeFixture();
    const all = 'clean-gone,commit,commit-push-pr,deploy,changelog,status';
    expect(fx.plug(['pick', ID, '--drop', all]).code).toBe(2);
    expect(fx.plug(['pick', ID, '--keep', 'commit', '--drop', 'deploy']).code).toBe(2);
    expect(fx.plug(['pick', ID]).code).toBe(2);
    expect(fx.plug(['pick']).code).toBe(2);
    expect(fx.plug(['pick', 'ghost@nowhere', '--keep', 'x']).code).toBe(2);
  });

  it('overlay: ls afterwards shows the overlay enabled, the original disabled and a smaller total', () => {
    const fx = makeFixture();
    fx.plug(['pick', ID, '--keep', 'commit,status']);
    const data = JSON.parse(fx.plug(['ls', '--json']).out) as {
      totalTokens: number;
      plugins: Array<{ id: string; enabled: boolean; overlay: boolean; tokens: number }>;
    };
    expect(data.totalTokens).toBe(37);
    expect(data.plugins.find((p) => p.id === 'gitkit@plugslim')).toMatchObject({ enabled: true, overlay: true, tokens: 37 });
    expect(data.plugins.find((p) => p.id === ID)).toMatchObject({ enabled: false, overlay: false, tokens: 123 });
  });

  it('overlay: picking an overlay id is refused and picking again replaces the overlay', () => {
    const fx = makeFixture();
    fx.plug(['pick', ID, '--keep', 'commit']);
    const refused = fx.plug(['pick', 'gitkit@plugslim', '--keep', 'commit']);
    expect(refused.code).toBe(2);
    expect(refused.err).toContain(ID);
    const again = fx.plug(['pick', ID, '--keep', 'commit,deploy']);
    expect(again.code).toBe(0);
    const overlay = path.join(fx.store, 'marketplace', 'plugins', 'gitkit');
    expect(fs.readdirSync(path.join(overlay, 'skills')).sort()).toEqual(['commit', 'deploy']);
  });

  it('re-pick of an originally enabled plugin does not print the was-not-enabled notice (en and ko)', () => {
    const fx = makeFixture();
    const first = fx.plug(['--lang', 'en', 'pick', ID, '--keep', 'commit,status']);
    expect(first.out).not.toContain('was not enabled');
    for (const [lang, phrase] of [['en', 'was not enabled'], ['ko', '꺼져 있었습니다']]) {
      const again = fx.plug(['--lang', lang, 'pick', ID, '--keep', 'commit']);
      expect(again.code).toBe(0);
      expect(again.out).not.toContain(phrase);
      const dry = fx.plug(['--lang', lang, 'pick', ID, '--keep', 'commit', '--dry-run']);
      expect(dry.out).not.toContain(phrase);
    }
    expect(fx.plug(['restore', ID]).code).toBe(0);
    const settings = fx.readSettings() as { enabledPlugins: Record<string, boolean> };
    expect(settings.enabledPlugins[ID]).toBe(true);
  });

  it('an originally disabled plugin prints the notice on the first pick and on re-pick', () => {
    const fx = makeFixture();
    const settings = fx.readSettings() as { enabledPlugins: Record<string, boolean> };
    settings.enabledPlugins[ID] = false;
    fx.writeSettings(settings);
    const first = fx.plug(['--lang', 'en', 'pick', ID, '--keep', 'commit']);
    expect(first.out).toContain('was not enabled');
    const again = fx.plug(['--lang', 'en', 'pick', ID, '--keep', 'commit,status']);
    expect(again.out).toContain('was not enabled');
    const ko = fx.plug(['--lang', 'ko', 'pick', ID, '--keep', 'commit']);
    expect(ko.out).toContain('꺼져 있었습니다');
  });

  it('overlay: copies node_modules and resolves symlinks inside the plugin', () => {
    const fx = makeFixture();
    fs.mkdirSync(path.join(fx.pluginDir, 'node_modules', 'dep'), { recursive: true });
    fs.writeFileSync(path.join(fx.pluginDir, 'node_modules', 'dep', 'index.js'), 'module.exports = 1;\n');
    fs.symlinkSync(path.join(fx.pluginDir, 'scripts', 'notify.sh'), path.join(fx.pluginDir, 'scripts', 'link.sh'));
    expect(fx.plug(['pick', ID, '--keep', 'commit']).code).toBe(0);
    const overlay = path.join(fx.store, 'marketplace', 'plugins', 'gitkit');
    expect(fs.existsSync(path.join(overlay, 'node_modules', 'dep', 'index.js'))).toBe(true);
    expect(fs.lstatSync(path.join(overlay, 'scripts', 'link.sh')).isSymbolicLink()).toBe(false);
  });
});
