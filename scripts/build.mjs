// Build dist/ from src/ with the TypeScript compiler (`npm run compile`; `npm test` and `npm run demo` call it too).
//
// Why dist/ is committed and package.json has no "build" / "prepare" script:
// for `npm install -g github:<owner>/plugslim`, npm clones the repo and, if the package has any of the
// scripts build, prepare, prepack, preinstall, install or postinstall, runs an inner `npm install` in the
// clone to prepare it. During a global install that inner install inherits the global flag, so it installs
// no devDependencies (no tsc) and installs the clone itself into the global folder, which breaks the real
// install. With none of those scripts, npm packs the clone as it is, and the committed dist/ is the CLI.
// CI checks that the committed dist/ matches src/.
//
// --allow-prebuilt (used by prepublishOnly): when TypeScript is not installed, keep the committed dist/
// instead of failing.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const allowPrebuilt = process.argv.includes('--allow-prebuilt');

// Find the tsc of the installed TypeScript devDependency, or null when it is not installed.
// ("typescript/bin/tsc" is not in the package's exports, so go through its package.json "bin" field.)
let tsc = null;
try {
  const pkgFile = createRequire(path.join(root, 'package.json')).resolve('typescript/package.json');
  const bin = JSON.parse(fs.readFileSync(pkgFile, 'utf8')).bin;
  const rel = typeof bin === 'string' ? bin : bin?.tsc;
  if (typeof rel === 'string') tsc = path.join(path.dirname(pkgFile), rel);
} catch {
  tsc = null;
}

if (tsc === null) {
  if (allowPrebuilt && fs.existsSync(path.join(dist, 'bin.js'))) {
    console.log('plugslim: TypeScript is not installed here; using the prebuilt dist/ from the repository.');
    process.exit(0);
  }
  console.error('plugslim: TypeScript is not installed. Run "npm install" first.');
  process.exit(1);
}

// Start from an empty dist/ so files of deleted sources do not linger.
fs.rmSync(dist, { recursive: true, force: true });
const result = spawnSync(process.execPath, [tsc], { cwd: root, stdio: 'inherit' });
process.exit(result.status ?? 1);
