// plugslim restore: put the settings keys back and delete the overlay.
import fs from 'node:fs';
import path from 'node:path';
import type { Args, Ctx } from '../ctx.js';
import { UsageError } from '../errors.js';
import { removeMarketplaceEntry } from '../overlay.js';
import { storePaths } from '../paths.js';
import { type SettingsFile, applyRestore, backupSettings, readSettings, writeSettings } from '../settings.js';
import { DEFAULT_MARKETPLACE, type OverlayEntry, findOverlay, overlayList, readState, writeState } from '../state.js';

export function restoreCommand(ctx: Ctx, args: Args): number {
  const paths = storePaths(ctx.storeDir);
  const state = readState(paths.stateFile);
  const entries = overlayList(state);
  const query = args.positionals[1];

  if (query === undefined && !args.all) {
    if (entries.length === 0) {
      ctx.io.out(ctx.t('restore.nothing'));
      return 0;
    }
    throw new UsageError('err.restoreNeedsId', { available: entries.map((e) => e.origId).join(', ') });
  }

  let targets: OverlayEntry[];
  if (args.all) {
    targets = entries;
  } else {
    const found = findOverlay(state, query ?? '');
    targets = found ? [found] : [];
  }
  if (targets.length === 0) {
    ctx.io.out(query === undefined ? ctx.t('restore.nothing') : ctx.t('restore.nothingFor', { id: query }));
    return 0;
  }

  // Read strictly first: a broken settings.json stops us before anything is written.
  const original = readSettings(path.join(ctx.configDir, 'settings.json'));
  let current: SettingsFile = original;
  let remaining = entries.length;
  // The first pick records whether enabledPlugins existed; later picks always see it as present.
  const createdByUs = state.enabledPluginsCreated === true || entries.some((e) => !e.prev.enabledPluginsExisted);
  for (const entry of targets) {
    remaining -= 1;
    const last = remaining === 0;
    current = {
      ...original,
      data: applyRestore(current, { entry, marketplace: state.marketplace, marketplacePrev: last ? state.marketplacePrev : null, removeEmptyEnabled: last && createdByUs }),
    };
  }

  backupSettings(original, paths.backupsDir, ctx.now());
  if (original.exists) writeSettings(original.path, current.data);

  for (const entry of targets) {
    fs.rmSync(path.join(paths.pluginsDir, entry.entryName), { recursive: true, force: true });
    removeMarketplaceEntry(paths.marketplaceFile, state.marketplace, entry.entryName);
    delete state.overlays[entry.origId];
  }
  if (overlayList(state).length === 0) {
    fs.rmSync(paths.marketplaceDir, { recursive: true, force: true });
    state.marketplacePrev = null;
    delete state.enabledPluginsCreated;
    state.marketplace = DEFAULT_MARKETPLACE;
  }
  writeState(paths.stateFile, state);

  for (const entry of targets) ctx.io.out(ctx.t('restore.done', { id: entry.origId, overlayId: entry.overlayId }));
  ctx.io.out(ctx.t('restore.reload'));
  return 0;
}
