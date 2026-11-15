// Command-line entry. `run` is pure with respect to the process (no process.exit, injectable env/cwd/output),
// so tests can call it directly against temporary config and store folders.
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { type Args, type Ctx, type IO, makeT } from './ctx.js';
import { doctorCommand } from './commands/doctor.js';
import { lsCommand, positiveNumber } from './commands/ls.js';
import { pickCommand } from './commands/pick.js';
import { restoreCommand } from './commands/restore.js';
import { syncCommand } from './commands/sync.js';
import { UsageError } from './errors.js';
import { type Lang, detectLang, isLang } from './i18n.js';
import { resolveConfigDir, resolveStoreDir } from './paths.js';

const OPTIONS = {
  lang: { type: 'string' },
  'config-dir': { type: 'string' },
  'store-dir': { type: 'string' },
  json: { type: 'boolean' },
  path: { type: 'string' },
  'context-window': { type: 'string' },
  'max-tokens': { type: 'string' },
  keep: { type: 'string' },
  drop: { type: 'string' },
  'dry-run': { type: 'boolean' },
  yes: { type: 'boolean' },
  'include-new': { type: 'boolean' },
  check: { type: 'boolean' },
  quiet: { type: 'boolean' },
  all: { type: 'boolean' },
  'project-dir': { type: 'string' },
  'marketplace-name': { type: 'string' },
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean', short: 'v' },
} as const;

function packageVersion(): string {
  try {
    const raw = fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8');
    return (JSON.parse(raw) as { version?: string }).version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/** Find --lang in raw argv, so even a failed parse is reported in the requested language. */
function rawLang(argv: string[]): Lang | undefined {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? '';
    const value = arg === '--lang' ? argv[i + 1] : arg.startsWith('--lang=') ? arg.slice('--lang='.length) : undefined;
    if (value !== undefined && isLang(value)) return value;
  }
  return undefined;
}

export function run(argv: string[], env: NodeJS.ProcessEnv, io: IO, cwd: string, now: () => Date = () => new Date()): number {
  let lang = detectLang(env, rawLang(argv));
  const t = makeT(lang);
  try {
    const parsed = (() => {
      try {
        return parseArgs({ args: argv, options: OPTIONS, allowPositionals: true, strict: true });
      } catch (error) {
        throw new UsageError('err.argParse', { detail: error instanceof Error ? error.message : String(error) });
      }
    })();
    const v = parsed.values;

    if (v.lang !== undefined && !isLang(v.lang)) throw new UsageError('err.badLang', { value: v.lang });
    lang = detectLang(env, v.lang as Lang | undefined);

    const args: Args = {
      positionals: parsed.positionals,
      json: v.json === true,
      path: v.path,
      contextWindow: positiveNumber('context-window', v['context-window']),
      maxTokens: positiveNumber('max-tokens', v['max-tokens']),
      keep: v.keep,
      drop: v.drop,
      dryRun: v['dry-run'] === true,
      yes: v.yes === true,
      includeNew: v['include-new'] === true,
      check: v.check === true,
      quiet: v.quiet === true,
      all: v.all === true,
      projectDir: v['project-dir'],
      marketplaceName: v['marketplace-name'],
    };
    const ctx: Ctx = {
      env,
      cwd,
      lang,
      io,
      configDir: resolveConfigDir(v['config-dir'], env, cwd),
      storeDir: resolveStoreDir(v['store-dir'], env, cwd),
      now,
      t: makeT(lang),
    };

    if (v.version === true) {
      io.out(ctx.t('version.text', { version: packageVersion() }));
      return 0;
    }
    const command = args.positionals[0];
    if (v.help === true || command === undefined || command === 'help') {
      io.out(ctx.t('help.text'));
      return 0;
    }

    switch (command) {
      case 'ls':
        return lsCommand(ctx, args);
      case 'pick':
        return pickCommand(ctx, args);
      case 'sync':
        return syncCommand(ctx, args);
      case 'restore':
        return restoreCommand(ctx, args);
      case 'doctor':
        return doctorCommand(ctx, args);
      default:
        throw new UsageError('err.unknownCommand', { name: command });
    }
  } catch (error) {
    const tt = makeT(lang);
    if (error instanceof UsageError) {
      io.err(tt(error.key, error.vars));
      return 2;
    }
    io.err(tt('err.internal', { detail: error instanceof Error ? error.message : String(error) }));
    return 70;
  }
}
