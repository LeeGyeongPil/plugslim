// Fixes from QA round 3: git install without TypeScript, closed output pipes,
// unreadable settings files, and structured warnings in `ls --json`.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT, SAMPLE_CONFIG, makeFixture } from './helpers/fixture.js';

const BIN = path.join(REPO_ROOT, 'dist', 'bin.js');
const BUILD = path.join(REPO_ROOT, 'scripts', 'build.mjs');
const ID = 'gitkit@sample-market';

/** Run dist/bin.js with its stdout pipe closed before it writes anything (like `| head -0`). */
function runWithClosedStdout(args: string[]): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [BIN, ...args], {
      env: { PATH: process.env.PATH ?? '', HOME: os.tmpdir(), PLUGSLIM_LANG: 'en' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.destroy(); // the reader goes away right away
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stderr }));
  });
}

describe('closed output pipe (plugslim ls | head)', () => {
  it('ls --json exits with its own code and prints no EPIPE stack trace', async () => {
    const r = await runWithClosedStdout(['ls', '--json', '--config-dir', SAMPLE_CONFIG]);
    expect(r.stderr).not.toContain('EPIPE');
    expect(r.stderr).not.toContain('Unhandled');
    expect(r.code).toBe(0);
  });

  it('pick still finishes its file changes when the output reader is gone', async () => {
    const fx = makeFixture();
    const r = await runWithClosedStdout(['pick', ID, '--keep', 'commit,status', '--config-dir', fx.config, '--store-dir', fx.store]);
    expect(r.stderr).not.toContain('EPIPE');
    expect(r.code).toBe(0);
    const enabled = fx.readSettings().enabledPlugins as Record<string, boolean>;
    expect(enabled[ID]).toBe(false);
    expect(enabled['gitkit@plugslim']).toBe(true);
  });
});

describe('build script (git install without devDependencies)', () => {
  /** A copy of scripts/build.mjs in a folder with no TypeScript anywhere above it. */
  function bareCopy(withDist: boolean): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugslim-build-'));
    fs.mkdirSync(path.join(dir, 'scripts'));
    fs.copyFileSync(BUILD, path.join(dir, 'scripts', 'build.mjs'));
    fs.writeFileSync(path.join(dir, 'package.json'), '{"name":"bare","type":"module"}\n');
    if (withDist) {
      fs.mkdirSync(path.join(dir, 'dist'));
      fs.writeFileSync(path.join(dir, 'dist', 'bin.js'), '// prebuilt\n');
    }
    return dir;
  }

  it('--allow-prebuilt (prepublishOnly) keeps the committed dist/ when TypeScript is missing', () => {
    const dir = bareCopy(true);
    try {
      const r = spawnSync(process.execPath, [path.join(dir, 'scripts', 'build.mjs'), '--allow-prebuilt'], { encoding: 'utf8' });
      expect(r.status).toBe(0);
      expect(r.stdout).toContain('prebuilt dist/');
      expect(fs.readFileSync(path.join(dir, 'dist', 'bin.js'), 'utf8')).toBe('// prebuilt\n');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails clearly when TypeScript is missing and there is nothing prebuilt', () => {
    const dir = bareCopy(false);
    try {
      const plain = spawnSync(process.execPath, [path.join(dir, 'scripts', 'build.mjs')], { encoding: 'utf8' });
      expect(plain.status).toBe(1);
      expect(plain.stderr).toContain('TypeScript is not installed');
      const prepare = spawnSync(process.execPath, [path.join(dir, 'scripts', 'build.mjs'), '--allow-prebuilt'], { encoding: 'utf8' });
      expect(prepare.status).toBe(1);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('the package ships the built CLI and runs as a bin', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')) as {
      bin: Record<string, string>;
      files: string[];
      scripts: Record<string, string>;
    };
    expect(pkg.bin.plugslim).toBe('dist/bin.js');
    expect(pkg.files).toContain('dist');
    // Any of these makes npm run an inner install in the git clone, which breaks `npm install -g github:...`.
    for (const name of ['build', 'prepare', 'prepack', 'preinstall', 'install', 'postinstall']) {
      expect(pkg.scripts[name], `scripts.${name} must not exist`).toBeUndefined();
    }
    const gitignore = fs.readFileSync(path.join(REPO_ROOT, '.gitignore'), 'utf8').split('\n');
    expect(gitignore.map((l) => l.trim())).not.toContain('dist/');
    const r = spawnSync(process.execPath, [BIN, '--version'], { encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/^plugslim \d+\.\d+\.\d+/);
  });
});

describe('settings file that cannot be read (not the same as bad JSON)', () => {
  it('names the read error instead of asking to fix the JSON (en and ko)', () => {
    const fx = makeFixture();
    fs.rmSync(fx.settingsPath);
    fs.mkdirSync(fx.settingsPath); // a folder in place of the file: reading fails with EISDIR on every OS
    const en = fx.plug(['ls', '--lang', 'en']);
    expect(en.code).toBe(2);
    expect(en.err).toContain('Cannot read');
    expect(en.err).toContain('EISDIR');
    expect(en.err).not.toContain('as JSON');
    const ko = fx.plug(['ls', '--lang', 'ko']);
    expect(ko.code).toBe(2);
    expect(ko.err).toContain('열 수 없습니다');
  });

  it('bad JSON still gets the parse message', () => {
    const fx = makeFixture();
    fx.writeSettings('{ not json');
    const r = fx.plug(['ls']);
    expect(r.code).toBe(2);
    expect(r.err).toContain('Cannot parse');
  });

  it('ls --path (plugin-author mode) falls back to default settings with a note', () => {
    const fx = makeFixture();
    fx.writeSettings('{ not json');
    const r = fx.plug(['ls', '--path', fx.pluginDir, '--max-tokens', '500']);
    expect(r.code).toBe(0);
    expect(r.err).toContain('default listing settings');
    expect(r.out).toContain('123 tok');
  });

  it('an unreadable installed_plugins.json is reported as unreadable, not as an unsupported format', () => {
    const fx = makeFixture();
    const installed = path.join(fx.config, 'plugins', 'installed_plugins.json');
    fs.rmSync(installed);
    fs.mkdirSync(installed);
    const r = fx.plug(['ls']);
    expect(r.code).toBe(2);
    expect(r.err).toContain('Cannot read');
    expect(r.err).not.toContain('Unsupported');
  });
});

describe('ls --json warnings are objects', () => {
  it('frontmatter warning has code, file, detail and the same message as the table', () => {
    const fx = makeFixture();
    fs.writeFileSync(path.join(fx.pluginDir, 'skills', 'commit', 'SKILL.md'), '---\nname: commit\ndescription: [unclosed\n---\n\nBody\n');
    const json = JSON.parse(fx.plug(['ls', '--path', fx.pluginDir, '--json']).out) as {
      plugins: { warnings: { code: string; file?: string; detail?: string; message: string }[] }[];
    };
    const w = json.plugins[0]!.warnings[0]!;
    expect(w.code).toBe('FRONTMATTER');
    expect(w.file).toBe('skills/commit/SKILL.md');
    expect(typeof w.detail).toBe('string');
    expect(w.message).toContain('frontmatter is not valid YAML');
    const table = fx.plug(['ls', '--path', fx.pluginDir]).out;
    expect(table).toContain(w.message);
  });

  it('unsafe manifest paths and a broken plugin.json are translated warnings', () => {
    const fx = makeFixture();
    const manifest = path.join(fx.pluginDir, '.claude-plugin', 'plugin.json');
    const data = JSON.parse(fs.readFileSync(manifest, 'utf8')) as Record<string, unknown>;
    data.skills = ['../outside'];
    fs.writeFileSync(manifest, JSON.stringify(data));
    const json = JSON.parse(fx.plug(['ls', '--path', fx.pluginDir, '--json']).out) as {
      plugins: { warnings: { code: string; field?: string; path?: string }[] }[];
    };
    expect(json.plugins[0]!.warnings).toContainEqual(expect.objectContaining({ code: 'UNSAFE_PATH', field: 'skills', path: '../outside' }));
    expect(fx.plug(['ls', '--path', fx.pluginDir, '--lang', 'ko']).out).toContain('플러그인 폴더 밖을 가리키는');

    fs.writeFileSync(manifest, '{ broken');
    const broken = JSON.parse(fx.plug(['ls', '--path', fx.pluginDir, '--json']).out) as {
      plugins: { warnings: { code: string; file?: string }[] }[];
    };
    expect(broken.plugins[0]!.warnings).toContainEqual(
      expect.objectContaining({ code: 'MANIFEST_INVALID', file: '.claude-plugin/plugin.json' }),
    );
  });
});
