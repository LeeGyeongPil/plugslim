// AC-1: ls output, JSON shape, sample numbers, --max-tokens exit code.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { makeFixture } from './helpers/fixture.js';

interface LsJson {
  totalTokens: number;
  budgetTokens: number;
  plugins: Array<{
    id: string;
    enabled: boolean;
    overlay: boolean;
    tokens: number;
    items: Array<{ name: string; kind: string; chars: number; tokens: number; modelInvocable: boolean }>;
  }>;
}

describe('ls', () => {
  it('shows item count, estimated tokens and budget percent per plugin', () => {
    const fx = makeFixture();
    const r = fx.plug(['ls']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('gitkit@sample-market');
    expect(r.out).toMatch(/gitkit@sample-market\s+6\s+123\s+6\.2%/);
    expect(r.out).toContain('Total (enabled): 123 tok of 2000 budget (6.2%)');
    expect(r.out).toContain('Estimated tokens');
  });

  it('--json has plugins[].items[] and totalTokens; the 4 sample skills sum to 115', () => {
    const fx = makeFixture();
    const r = fx.plug(['ls', '--json']);
    expect(r.code).toBe(0);
    const data = JSON.parse(r.out) as LsJson;
    expect(data.budgetTokens).toBe(2000);
    expect(data.plugins).toHaveLength(1);
    const items = data.plugins[0]!.items;
    for (const item of items) {
      expect(Object.keys(item).sort()).toEqual(['chars', 'kind', 'modelInvocable', 'name', 'tokens']);
    }
    const invocableSkills = items.filter((i) => i.kind === 'skill' && i.modelInvocable);
    expect(invocableSkills.map((i) => i.name).sort()).toEqual(['changelog', 'clean-gone', 'commit', 'commit-push-pr']);
    expect(invocableSkills.reduce((sum, i) => sum + i.tokens, 0)).toBe(115);
    expect(items.find((i) => i.name === 'status')).toMatchObject({ kind: 'command', chars: 32, tokens: 8 });
    expect(data.totalTokens).toBe(123);
  });

  it('counts a disable-model-invocation skill as 0', () => {
    const fx = makeFixture();
    const data = JSON.parse(fx.plug(['ls', '--json']).out) as LsJson;
    const deploy = data.plugins[0]!.items.find((i) => i.name === 'deploy');
    expect(deploy).toEqual({ name: 'deploy', kind: 'skill', chars: 0, tokens: 0, modelInvocable: false });
    const detail = fx.plug(['ls', 'gitkit@sample-market']).out;
    expect(detail).toContain('not listed (disable-model-invocation)');
  });

  it('ls --path <dir> --max-tokens 50 exits 1, a large cap exits 0', () => {
    const fx = makeFixture();
    const over = fx.plug(['ls', '--path', fx.pluginDir, '--max-tokens', '50']);
    expect(over.code).toBe(1);
    expect(over.err).toContain('exceeds --max-tokens 50');
    const ok = fx.plug(['ls', '--path', fx.pluginDir, '--max-tokens', '500']);
    expect(ok.code).toBe(0);
  });

  it('resolves a plugin by bare name and rejects unknown ones with exit 2', () => {
    const fx = makeFixture();
    expect(fx.plug(['ls', 'gitkit']).code).toBe(0);
    const bad = fx.plug(['ls', 'nope@x']);
    expect(bad.code).toBe(2);
    expect(bad.err).toContain('gitkit@sample-market');
  });

  it('accepts the array form of installed_plugins.json and lists the heaviest plugin first', () => {
    const fx = makeFixture();
    const big = path.join(fx.config, 'plugins', 'cache', 'm', 'bigkit', '2.0.0');
    fs.mkdirSync(path.join(big, 'skills', 'long'), { recursive: true });
    fs.writeFileSync(path.join(big, 'skills', 'long', 'SKILL.md'), `---\nname: long\ndescription: ${'x'.repeat(800)}\n---\nBody\n`);
    fs.writeFileSync(
      path.join(fx.config, 'plugins', 'installed_plugins.json'),
      JSON.stringify([
        { id: 'gitkit@sample-market', installPath: fx.pluginDir, version: '1.0.0' },
        { name: 'bigkit', marketplace: 'm', installPath: big, version: '2.0.0' },
      ]),
    );
    fx.writeSettings({ enabledPlugins: { 'gitkit@sample-market': true, 'bigkit@m': true } });
    const data = JSON.parse(fx.plug(['ls', '--json']).out) as LsJson;
    expect(data.plugins.map((p) => p.id)).toEqual(['bigkit@m', 'gitkit@sample-market']);
    expect(data.totalTokens).toBe(data.plugins[0]!.tokens + data.plugins[1]!.tokens);
  });

  it('does not count disabled plugins in the total', () => {
    const fx = makeFixture();
    fx.writeSettings({ enabledPlugins: { 'gitkit@sample-market': false } });
    const data = JSON.parse(fx.plug(['ls', '--json']).out) as LsJson;
    expect(data.plugins[0]!.enabled).toBe(false);
    expect(data.totalTokens).toBe(0);
  });

  it('exits 2 on an unsupported installed_plugins.json format', () => {
    const fx = makeFixture();
    fs.writeFileSync(path.join(fx.config, 'plugins', 'installed_plugins.json'), '"nope"');
    const r = fx.plug(['ls']);
    expect(r.code).toBe(2);
    expect(r.err).toContain('Unsupported installed_plugins.json format');
  });

  it('exits 2 when --path is not a plugin folder', () => {
    const fx = makeFixture();
    const r = fx.plug(['ls', '--path', fx.root]);
    expect(r.code).toBe(2);
    expect(r.err).toContain('is not a plugin folder');
  });

  it('rejects a non-numeric --max-tokens with exit 2', () => {
    const fx = makeFixture();
    const r = fx.plug(['ls', '--max-tokens', 'abc']);
    expect(r.code).toBe(2);
    expect(r.err).toContain('--max-tokens');
  });
});
