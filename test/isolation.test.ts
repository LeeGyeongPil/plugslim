// AC-10: the suite never touches the real home, and the demo runs end to end on a temp copy.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT, hashTree, makeFixture, runRaw } from './helpers/fixture.js';

function snapshotOfRealHome(): string {
  // Existence and listing only (read-only); permission errors just mean "cannot tell".
  try {
    const home = os.homedir();
    return ['.plugslim'].map((name) => `${name}:${fs.existsSync(path.join(home, name)) ? hashTree(path.join(home, name)) : 'absent'}`).join('|');
  } catch {
    return 'unknown';
  }
}

describe('isolation', () => {
  it('defaults come from HOME: a full flow with HOME=temp leaves the real home alone', () => {
    const before = snapshotOfRealHome();
    const fx = makeFixture();
    // No --config-dir/--store-dir: ~/.claude and ~/.plugslim resolve inside the temp HOME.
    const env = { HOME: fx.home };
    const ls = runRaw(['ls', '--json'], env, fx.root);
    expect(ls.code).toBe(0);
    expect(JSON.parse(ls.out).totalTokens).toBe(123);
    expect(runRaw(['pick', 'gitkit@sample-market', '--keep', 'commit,status'], env, fx.root).code).toBe(0);
    expect(fs.existsSync(path.join(fx.home, '.plugslim', 'state.json'))).toBe(true);
    expect(runRaw(['restore', '--all'], env, fx.root).code).toBe(0);
    expect(snapshotOfRealHome()).toBe(before);
  });

  it('CLAUDE_CONFIG_DIR and PLUGSLIM_HOME are honoured, --config-dir and --store-dir win over them', () => {
    const fx = makeFixture();
    const other = path.join(fx.root, 'elsewhere');
    fs.mkdirSync(other);
    const viaEnv = runRaw(['ls', '--json'], { HOME: other, CLAUDE_CONFIG_DIR: fx.config, PLUGSLIM_HOME: path.join(fx.root, 'store-env') }, fx.root);
    expect(JSON.parse(viaEnv.out).totalTokens).toBe(123);
    const wins = runRaw(['ls', '--json', '--config-dir', fx.config], { HOME: other, CLAUDE_CONFIG_DIR: other }, fx.root);
    expect(JSON.parse(wins.out).totalTokens).toBe(123);
    const pick = runRaw(['pick', 'gitkit@sample-market', '--keep', 'commit', '--store-dir', path.join(fx.root, 'store-opt')], {
      HOME: other,
      CLAUDE_CONFIG_DIR: fx.config,
      PLUGSLIM_HOME: path.join(fx.root, 'store-env'),
    }, fx.root);
    expect(pick.code).toBe(0);
    expect(fs.existsSync(path.join(fx.root, 'store-opt', 'state.json'))).toBe(true);
    expect(fs.existsSync(path.join(fx.root, 'store-env'))).toBe(false);
  });

  it('the demo header and summary follow the selected language (ko)', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'plugslim-demo-ko-'));
    try {
      const r = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts', 'demo.mjs')], {
        env: { PATH: process.env.PATH, HOME: home, PLUGSLIM_LANG: 'ko' },
        encoding: 'utf8',
      });
      expect(r.status, r.stderr).toBe(0);
      expect(r.stdout).toContain('연습용 샘플입니다');
      expect(r.stdout).toContain('--- 요약 ---');
      expect(r.stdout).toMatch(/복원:\s+예/);
      expect(r.stdout).not.toContain('practice fixture');
      expect(r.stdout).not.toContain('--- summary ---');
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });

  it('npm run demo works end to end: before/after token totals (after < before) and restored', () => {
    const entry = path.join(REPO_ROOT, 'dist', 'cli.js');
    expect(fs.existsSync(entry), 'run "npm run build" (npm test does this) before this test').toBe(true);
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'plugslim-demo-home-'));
    try {
      const r = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts', 'demo.mjs')], {
        env: { PATH: process.env.PATH, HOME: home, LANG: 'C' },
        encoding: 'utf8',
      });
      expect(r.status, r.stderr).toBe(0);
      const before = /before:\s+(\d+) tok/.exec(r.stdout);
      const after = /after:\s+(\d+) tok/.exec(r.stdout);
      expect(before && after).toBeTruthy();
      expect(Number(after![1])).toBeLessThan(Number(before![1]));
      expect(r.stdout).toContain('restored: yes');
      expect(r.stdout).toContain('practice fixture, not your real Claude Code config');
      expect(fs.readdirSync(home)).toEqual([]);
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });
});
