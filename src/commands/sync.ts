// plugslim sync: re-apply the same pick after the original plugin was updated.
import fs from 'node:fs';
import path from 'node:path';
import type { Args, Ctx } from '../ctx.js';
import { costPlugin, costSettingsFrom } from '../cost.js';
import { UsageError } from '../errors.js';
import { hashItems } from '../hash.js';
import { readInventory } from '../inventory.js';
import { scanPlugin } from '../plugin.js';
import { storePaths } from '../paths.js';
import { findOverlay, overlayList, readState, writeState } from '../state.js';
import { materializeOverlay } from './materialize.js';

function label(version: string | null, hash: string): string {
  return `${version ?? '-'}#${hash.slice(0, 7)}`;
}

export function syncCommand(ctx: Ctx, args: Args): number {
  const paths = storePaths(ctx.storeDir);
  const state = readState(paths.stateFile);
  const query = args.positionals[1];

  let entries = overlayList(state);
  if (query !== undefined) {
    const found = findOverlay(state, query);
    if (!found) {
      throw new UsageError('err.unknownPlugin', { id: query, available: entries.map((e) => e.origId).join(', ') || '-' });
    }
    entries = [found];
  }
  if (entries.length === 0) {
    ctx.io.out(ctx.t('sync.none'));
    return 0;
  }

  const inventory = readInventory(ctx.configDir, ctx.storeDir, state);
  const settings = costSettingsFrom(inventory.settings.data, args.contextWindow);
  let needsRebuild = false;

  for (const entry of entries) {
    const original = inventory.plugins.find((p) => p.id === entry.origId && !p.overlay);
    if (!original || !fs.existsSync(original.installPath)) {
      ctx.io.out(ctx.t('sync.sourceMissing', { id: entry.origId, path: original?.installPath ?? entry.srcPath }));
      continue; // keep the existing overlay untouched
    }
    const scan = scanPlugin(original.installPath, original.name);
    const hash = hashItems(original.installPath, scan.items);
    const version = scan.version ?? original.version;
    const overlayDir = path.join(paths.pluginsDir, entry.entryName);
    if (hash === entry.srcHash && version === entry.srcVersion && fs.existsSync(overlayDir)) {
      if (!args.quiet) ctx.io.out(ctx.t('sync.upToDate', { id: entry.origId }));
      continue;
    }

    needsRebuild = true;
    const names = [...new Set(scan.items.map((item) => item.name))];
    const newNames = names.filter((name) => !entry.known.includes(name));
    const removed = entry.keep.filter((name) => !names.includes(name));
    const keep = new Set(entry.keep.filter((name) => names.includes(name)));
    if (args.includeNew) for (const name of newNames) keep.add(name);
    if (keep.size === 0) throw new UsageError('err.pickEmpty');

    ctx.io.out(ctx.t('sync.needsRebuild', { id: entry.origId, from: label(entry.srcVersion, entry.srcHash), to: label(version, hash) }));
    if (newNames.length > 0) {
      ctx.io.out(ctx.t(args.includeNew ? 'sync.newIncluded' : 'sync.newItems', { names: newNames.join(', '), id: entry.origId }));
    }
    if (removed.length > 0) ctx.io.out(ctx.t('sync.removedItems', { names: removed.join(', ') }));
    if (args.check || args.dryRun) continue;

    const before = costPlugin(scan, settings.maxDescChars).tokens;
    const result = materializeOverlay(ctx, {
      origId: entry.origId,
      overlayId: entry.overlayId,
      entryName: entry.entryName,
      marketplace: state.marketplace,
      srcRoot: original.installPath,
      scan,
      keep,
      maxDescChars: settings.maxDescChars,
    });
    entry.keep = [...keep];
    entry.known = names;
    entry.srcVersion = version;
    entry.srcHash = hash;
    entry.srcPath = original.installPath;
    writeState(paths.stateFile, state);
    ctx.io.out(ctx.t('sync.rebuilt', { id: entry.origId, to: label(version, hash), before, after: result.afterTokens }));
  }

  if (needsRebuild && (args.dryRun || args.check)) {
    if (args.dryRun) ctx.io.out(ctx.t('sync.dryRun'));
  }
  return args.check && needsRebuild ? 1 : 0;
}
