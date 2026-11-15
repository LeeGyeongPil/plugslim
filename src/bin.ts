#!/usr/bin/env node
import { run } from './cli.js';

// When the reader of our output goes away early (`plugslim ls --json | head -1`), writes fail with EPIPE.
// That is not an error of plugslim: stop writing to that stream and keep going, so a running command
// (for example `pick`) still finishes its file changes and exits with its own code. No stack trace.
const closed = { out: false, err: false };
function guard(stream: NodeJS.WriteStream, key: keyof typeof closed): void {
  stream.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EPIPE' || error.code === 'ERR_STREAM_DESTROYED') {
      closed[key] = true;
      return;
    }
    throw error;
  });
}
guard(process.stdout, 'out');
guard(process.stderr, 'err');

process.exitCode = run(
  process.argv.slice(2),
  process.env,
  {
    out: (text) => {
      if (!closed.out) process.stdout.write(`${text}\n`);
    },
    err: (text) => {
      if (!closed.err) process.stderr.write(`${text}\n`);
    },
  },
  process.cwd(),
);
