// Edge cases found in QA round 1: two-overlay restore, broken frontmatter, --path status, pick notes.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { type Fixture, makeFixture } from './helpers/fixture.js';

const GIT = 'gitkit@sample-market';
const DOC = 'dockit@sample-market';

/** Add a second installed plugin (a renamed copy of gitkit) and drop enabledPlugins from settings. */
function twoPluginsNoEnabledKey(fx: Fixture): Record<string, unknown> {
  const base = path.join(fx.config, 'plugins', 'cache', 'sample-market');
  const dest = path.join(base, 'dockit', '1.0.0');
  fs.cpSync(fx.pluginDir, dest, { recursive: true });
  const manifestFile = path.join(dest, '.claude-plugin', 'plugin.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')) as Record<string, unknown>;
  manifest.name = 'dockit';
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  const installedFile = path.join(fx.config, 'plugins', 'installed_plugins.json');
  const installed = JSON.parse(fs.readFileSync(installedFile, 'utf8')) as { plugins: Record<string, unknown> };
  installed.plugins[DOC] = [{ scope: 'user', installPath: 'plugins/cache/sample-market/dockit/1.0.0', version: '1.0.0', installedAt: '2026-11-01T00:00:00.000Z' }];
  fs.writeFileSync(installedFile, JSON.stringify(installed, null, 2));
  const settings = fx.readSettings();
  delete settings.enabledPlugins;
  fx.writeSettings(settings);
  return fx.readSettings();
}

describe('restore with two overlays when enabledPlugins did not exist', () => {
  const setup = (): { fx: Fixture; original: Record<string, unknown> } => {
    const fx = makeFixture();
    const original = twoPluginsNoEnabledKey(fx);
    expect(fx.plug(['pick', GIT, '--keep', 'commit']).code).toBe(0);
    expect(fx.plug(['pick', DOC, '--keep', 'status']).code).toBe(0);
    return { fx, original };
  };

  it('restore --all removes the empty enabledPlugins it created', () => {
    const { fx, original } = setup();
    expect(fx.plug(['restore', '--all']).code).toBe(0);
    expect(fx.readSettings()).toEqual(original);
  });

  it('restoring in pick order gives the original settings', () => {
    const { fx, original } = setup();
    fx.plug(['restore', GIT]);
    fx.plug(['restore', DOC]);
    expect(fx.readSettings()).toEqual(original);
  });

  it('restoring in reverse order gives the original settings', () => {
    const { fx, original } = setup();
    fx.plug(['restore', DOC]);
    fx.plug(['restore', GIT]);
    expect(fx.readSettings()).toEqual(original);
  });
});

describe('broken frontmatter', () => {
  it('is reported as a warning in the table and in --json, in both languages', () => {
    const fx = makeFixture();
    fs.writeFileSync(path.join(fx.pluginDir, 'skills', 'commit', 'SKILL.md'), '---\nname: commit\ndescription: [unclosed\n---\n\nBody\n');
    const en = fx.plug(['ls', '--path', fx.pluginDir, '--lang', 'en']);
    expect(en.out).toContain('skills/commit/SKILL.md: frontmatter is not valid YAML');
    expect(en.out).toContain('counted without description');
    const ko = fx.plug(['ls', '--path', fx.pluginDir, '--lang', 'ko']);
    expect(ko.out).toContain('skills/commit/SKILL.md: frontmatter 가 올바른 YAML 이 아닙니다');
    const json = JSON.parse(fx.plug(['ls', '--path', fx.pluginDir, '--json']).out) as { plugins: { warnings: { file?: string }[] }[] };
    expect(json.plugins[0]!.warnings.some((w) => w.file === 'skills/commit/SKILL.md')).toBe(true);
  });
});

describe('ls --path status', () => {
  it('shows a neutral status and no enabled flag for a plain folder', () => {
    const fx = makeFixture();
    const text = fx.plug(['ls', '--path', fx.pluginDir]).out;
    expect(text).toContain('[path]');
    expect(text).not.toContain('[enabled]');
    const json = JSON.parse(fx.plug(['ls', '--path', fx.pluginDir, '--json']).out) as { plugins: { enabled: boolean | null }[] };
    expect(json.plugins[0]!.enabled).toBeNull();
    expect(fx.plug(['ls', '--path', fx.pluginDir, '--lang', 'ko']).out).toContain('[경로]');
  });
});

describe('pick notes', () => {
  it('says so when the original was not enabled', () => {
    const fx = makeFixture();
    fx.writeSettings({ enabledPlugins: { [GIT]: false } });
    const r = fx.plug(['pick', GIT, '--keep', 'commit', '--dry-run']);
    expect(r.out).toContain('gitkit@sample-market was not enabled; the slim copy will be enabled.');
    const enabled = fx.plug(['pick', GIT, '--keep', 'commit', '--dry-run'], {});
    expect(enabled.code).toBe(0);
  });

  it('does not mention it when the original was enabled', () => {
    const fx = makeFixture();
    expect(fx.plug(['pick', GIT, '--keep', 'commit', '--dry-run']).out).not.toContain('was not enabled');
  });

  it('re-picking the same selection prints "no change" instead of an empty diff', () => {
    const fx = makeFixture();
    fx.plug(['pick', GIT, '--keep', 'commit']);
    const again = fx.plug(['pick', GIT, '--keep', 'commit']);
    expect(again.code).toBe(0);
    expect(again.out).toContain('Settings already point to the overlay; no change.');
    expect(again.out).not.toContain('Settings change in');
  });
});
