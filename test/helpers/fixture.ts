// Test fixture: a temporary copy of the practice config plus an empty store. The real home is never touched.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { run } from '../../src/cli.js';

export const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');
export const SAMPLE_CONFIG = path.join(REPO_ROOT, 'examples', 'sample-home', '.claude');

export interface Result {
  code: number;
  out: string;
  err: string;
}

export interface Fixture {
  root: string;
  home: string;
  config: string;
  store: string;
  settingsPath: string;
  /** Original plugin folder (version 1.0.0) inside the config dir. */
  pluginDir: string;
  /** Run the CLI against this fixture (explicit --config-dir / --store-dir are appended). */
  plug: (args: string[], env?: NodeJS.ProcessEnv) => Result;
  /** Run the CLI exactly as given (no appended dirs). */
  raw: (args: string[], env?: NodeJS.ProcessEnv, cwd?: string) => Result;
  readSettings: () => Record<string, unknown>;
  writeSettings: (value: unknown) => void;
  cleanup: () => void;
}

const created: string[] = [];

export function runRaw(args: string[], env: NodeJS.ProcessEnv, cwd: string): Result {
  let out = '';
  let err = '';
  const code = run(
    args,
    env,
    {
      out: (s) => {
        out += `${s}\n`;
      },
      err: (s) => {
        err += `${s}\n`;
      },
    },
    cwd,
    () => new Date('2026-11-15T12:00:00.000Z'),
  );
  return { code, out, err };
}

export function makeFixture(): Fixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plugslim-test-'));
  created.push(root);
  const home = path.join(root, 'home');
  const config = path.join(home, '.claude');
  const store = path.join(home, '.plugslim');
  fs.mkdirSync(home, { recursive: true });
  fs.cpSync(SAMPLE_CONFIG, config, { recursive: true });
  const settingsPath = path.join(config, 'settings.json');
  const baseEnv = { HOME: home };
  return {
    root,
    home,
    config,
    store,
    settingsPath,
    pluginDir: path.join(config, 'plugins', 'cache', 'sample-market', 'gitkit', '1.0.0'),
    plug: (args, env = {}) => runRaw([...args, '--config-dir', config, '--store-dir', store], { ...baseEnv, ...env }, root),
    raw: (args, env = {}, cwd = root) => runRaw(args, { ...baseEnv, ...env }, cwd),
    readSettings: () => JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as Record<string, unknown>,
    writeSettings: (value) => fs.writeFileSync(settingsPath, typeof value === 'string' ? value : JSON.stringify(value, null, 2)),
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

/** Simulate the upstream update to 1.1.0: `commit` gets a new description and a new `rebase` skill appears. */
export function upgradeToV110(fx: Fixture): string {
  const base = path.dirname(fx.pluginDir);
  const next = path.join(base, '1.1.0');
  fs.cpSync(fx.pluginDir, next, { recursive: true });
  fs.writeFileSync(
    path.join(next, 'skills', 'commit', 'SKILL.md'),
    '---\nname: commit\ndescription: Create a git commit with a conventional message and a ticket id. Use when the user asks to commit.\n---\n\nBody text for commit (1.1.0).\n',
  );
  fs.mkdirSync(path.join(next, 'skills', 'rebase'), { recursive: true });
  fs.writeFileSync(
    path.join(next, 'skills', 'rebase', 'SKILL.md'),
    '---\nname: rebase\ndescription: Rebase the current branch onto main and resolve simple conflicts.\n---\n\nBody.\n',
  );
  const manifestFile = path.join(next, '.claude-plugin', 'plugin.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')) as Record<string, unknown>;
  manifest.version = '1.1.0';
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  const installedFile = path.join(fx.config, 'plugins', 'installed_plugins.json');
  const installed = JSON.parse(fs.readFileSync(installedFile, 'utf8')) as {
    plugins: Record<string, Array<{ installPath: string; version: string }>>;
  };
  const record = installed.plugins['gitkit@sample-market']?.[0];
  if (record) {
    record.installPath = 'plugins/cache/sample-market/gitkit/1.1.0';
    record.version = '1.1.0';
  }
  fs.writeFileSync(installedFile, JSON.stringify(installed, null, 2));
  return next;
}

/** One hash over every file path and content under `dir` ("absent" when it does not exist). */
export function hashTree(dir: string): string {
  if (!fs.existsSync(dir)) return 'absent';
  const hash = crypto.createHash('sha256');
  const walk = (current: string): void => {
    for (const name of fs.readdirSync(current).sort()) {
      const full = path.join(current, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        hash.update(`dir:${path.relative(dir, full)}\0`);
        walk(full);
      } else {
        hash.update(`file:${path.relative(dir, full)}\0`);
        hash.update(fs.readFileSync(full));
      }
    }
  };
  walk(dir);
  return hash.digest('hex');
}

export function cleanupAll(): void {
  for (const dir of created.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
}
