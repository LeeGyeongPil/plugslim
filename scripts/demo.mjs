// End-to-end demo on a temporary copy of the practice fixture (examples/sample-home).
// It is NOT your real Claude Code config: everything happens in a temp folder that is deleted at the end.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../dist/cli.js';
import { detectLang, translate } from '../dist/i18n.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'plugslim-demo-'));
const config = path.join(tmp, '.claude');
const store = path.join(tmp, '.plugslim');
fs.cpSync(path.join(root, 'examples', 'sample-home', '.claude'), config, { recursive: true });

// Only the language variables are passed through; HOME points at the temp folder.
const env = { HOME: tmp };
for (const key of ['PLUGSLIM_LANG', 'LC_ALL', 'LC_MESSAGES', 'LANG']) if (process.env[key] !== undefined) env[key] = process.env[key];
// Same language rule as the CLI (PLUGSLIM_LANG > LC_ALL > LC_MESSAGES > LANG), so header and summary match the command output.
const lang = detectLang(env);
const t = (key, vars) => translate(lang, key, vars);
const common = ['--config-dir', config, '--store-dir', store];

function plugslim(args, { quiet = false } = {}) {
  let text = '';
  const io = {
    out: (s) => { text += `${s}\n`; if (!quiet) console.log(s); },
    err: (s) => { text += `${s}\n`; console.error(s); },
  };
  if (!quiet) console.log(`\n$ plugslim ${args.join(' ')}`);
  const code = run([...args, ...common], env, io, root);
  if (code !== 0) throw new Error(`plugslim ${args.join(' ')} exited with ${code}`);
  return text;
}

function totalTokens() {
  return JSON.parse(plugslim(['ls', '--json'], { quiet: true })).totalTokens;
}

try {
  console.log(t('demo.header', { dir: tmp }));
  const before = totalTokens();
  plugslim(['ls']);
  plugslim(['ls', 'gitkit@sample-market']);
  plugslim(['pick', 'gitkit@sample-market', '--keep', 'commit,status', '--dry-run']);
  plugslim(['pick', 'gitkit@sample-market', '--keep', 'commit,status']);
  const after = totalTokens();
  plugslim(['ls']);
  plugslim(['doctor']);
  plugslim(['restore', 'gitkit@sample-market']);
  const restoredTotal = totalTokens();
  console.log(`\n${t('demo.summary')}`);
  console.log(t('demo.before', { tokens: before }));
  console.log(t('demo.after', { tokens: after }));
  console.log(t('demo.restored', { answer: t(restoredTotal === before ? 'demo.yes' : 'demo.no'), tokens: restoredTotal }));
  if (!(after < before) || restoredTotal !== before) process.exitCode = 1;
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
