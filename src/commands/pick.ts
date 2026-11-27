// plugslim pick: build an overlay with only the chosen skills and switch settings to it.
import fs from 'node:fs';
import path from 'node:path';
import type { Args, Ctx } from '../ctx.js';
import { costItems, costPlugin, costSettingsFrom } from '../cost.js';
import { UsageError } from '../errors.js';
import { hashItems } from '../hash.js';
import { readInventory, resolvePlugin } from '../inventory.js';
import { type PluginItem, scanPlugin } from '../plugin.js';
import { storePaths } from '../paths.js';
import { applyPick, backupSettings, diffSettings, writeSettings } from '../settings.js';
import { DEFAULT_MARKETPLACE, type OverlayEntry, overlayList, readState, writeState } from '../state.js';
import { materializeOverlay } from './materialize.js';

// Names Claude Code does not allow for user marketplaces (verified in the docs: 2026-11-15).
export const RESERVED_MARKETPLACES = ['claude-plugins-official', 'inline', 'skills-dir', 'synced'];

function splitList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');
}

/** Turn user-typed names into item names. A token matches an item name or its folder/file name. */
function resolveNames(items: PluginItem[], tokens: string[], pluginName: string): { names: Set<string>; unknown: string[] } {
  const names = new Set<string>();
  const unknown: string[] = [];
  const match = (token: string): PluginItem[] =>
    items.filter((item) => item.name === token || path.basename(item.rel, '.md') === token);
  for (const token of tokens) {
    let hits = match(token);
    // Claude Code shows names as '<plugin>:<skill>'; accept that form when nothing matches exactly.
    const prefix = `${pluginName}:`;
    if (hits.length === 0 && token.startsWith(prefix)) hits = match(token.slice(prefix.length));
    if (hits.length === 0) unknown.push(token);
    for (const hit of hits) names.add(hit.name);
  }
  return { names, unknown };
}

export function pickCommand(ctx: Ctx, args: Args): number {
  const paths = storePaths(ctx.storeDir);
  const state = readState(paths.stateFile);
  const inventory = readInventory(ctx.configDir, ctx.storeDir, state); // reads settings.json strictly before anything is written
  const installedIds = inventory.plugins.filter((p) => !p.overlay).map((p) => p.id).join(', ') || '-';

  const query = args.positionals[1];
  if (query === undefined) throw new UsageError('err.pickNeedsId', { available: installedIds });
  if (args.keep !== undefined && args.drop !== undefined) throw new UsageError('err.pickBothSelections');
  if (args.keep === undefined && args.drop === undefined) throw new UsageError('err.pickNeedsSelection');

  const hasOverlays = overlayList(state).length > 0;
  const marketplace = args.marketplaceName ?? (hasOverlays ? state.marketplace : DEFAULT_MARKETPLACE);
  if (RESERVED_MARKETPLACES.includes(marketplace)) throw new UsageError('err.reservedMarketplace', { name: marketplace });
  if (hasOverlays && marketplace !== state.marketplace) throw new UsageError('err.marketplaceLocked', { name: state.marketplace });

  const plugin = resolvePlugin(inventory.plugins, query);
  if (plugin.overlay) {
    const origin = overlayList(state).find((entry) => entry.overlayId === plugin.id)?.origId ?? '-';
    throw new UsageError('err.alreadyOverlay', { id: plugin.id, origin });
  }
  if (!fs.existsSync(plugin.installPath)) throw new UsageError('err.sourceMissing', { id: plugin.id, path: plugin.installPath });

  const scan = scanPlugin(plugin.installPath, plugin.name);
  const allNames = [...new Set(scan.items.map((item) => item.name))];
  const requested = resolveNames(scan.items, splitList(args.keep ?? args.drop), scan.name);
  if (requested.unknown.length > 0) {
    throw new UsageError('err.unknownItems', { names: requested.unknown.join(', '), available: allNames.join(', ') });
  }
  const keep = args.keep !== undefined ? requested.names : new Set(allNames.filter((name) => !requested.names.has(name)));
  if (keep.size === 0) throw new UsageError('err.pickEmpty');

  const entryName = plugin.name;
  const overlayId = `${entryName}@${marketplace}`;
  const existing = state.overlays[plugin.id];
  const clash = overlayList(state).find((entry) => entry.entryName === entryName && entry.origId !== plugin.id);
  if (clash) throw new UsageError('err.entryConflict', { name: entryName, origin: clash.origId });

  const settings = costSettingsFrom(inventory.settings.data, args.contextWindow);
  const before = costPlugin(scan, settings.maxDescChars).tokens;
  const keptItems = scan.items.filter((item) => keep.has(item.name));
  const droppedNames = allNames.filter((name) => !keep.has(name));
  const plannedAfter = costItems(scan.name, keptItems, settings.maxDescChars).tokens;

  const edit = { origId: plugin.id, overlayId, marketplace, marketplacePath: paths.marketplaceDir };
  const nextSettings = applyPick(inventory.settings, edit);
  const overlayDir = path.join(paths.pluginsDir, entryName);

  ctx.io.out(ctx.t('pick.header', { id: plugin.id, before, after: plannedAfter, count: keep.size, total: allNames.length }));
  ctx.io.out(ctx.t('pick.kept', { names: [...keep].join(', ') }));
  if (droppedNames.length > 0) ctx.io.out(ctx.t('pick.dropped', { names: droppedNames.join(', ') }));
  ctx.io.out(ctx.t('pick.filesHeader', { path: overlayDir }));
  const diff = diffSettings(inventory.settings.data, nextSettings);
  if (diff.length > 0) {
    ctx.io.out(ctx.t('pick.settingsHeader', { file: inventory.settings.path }));
    ctx.io.out(diff.join('\n'));
  } else {
    ctx.io.out(ctx.t('pick.noSettingsChange'));
  }
  // On a re-pick the original is off because plugslim turned it off; judge by the first pick's record.
  const wasEnabled = existing ? existing.prev.origEnabled === true : inventory.enabled[plugin.id] === true;
  if (!wasEnabled) ctx.io.out(ctx.t('pick.wasDisabled', { id: plugin.id }));

  if (args.dryRun) {
    ctx.io.out(ctx.t('pick.dryRunDone'));
    return 0;
  }

  const result = materializeOverlay(ctx, {
    origId: plugin.id,
    overlayId,
    entryName,
    marketplace,
    srcRoot: plugin.installPath,
    scan,
    keep,
    maxDescChars: settings.maxDescChars,
  });
  if (result.removedEntries.length > 0) ctx.io.out(ctx.t('pick.warnManifest', { paths: result.removedEntries.join(', ') }));

  const backup = backupSettings(inventory.settings, paths.backupsDir, ctx.now());
  writeSettings(inventory.settings.path, nextSettings);

  const raw = inventory.settings.data;
  const markets = raw.extraKnownMarketplaces;
  const marketsObject = markets !== null && typeof markets === 'object' && !Array.isArray(markets) ? (markets as Record<string, unknown>) : undefined;
  const entry: OverlayEntry = {
    origId: plugin.id,
    overlayId,
    entryName,
    keep: [...keep],
    known: allNames,
    srcVersion: scan.version ?? plugin.version,
    srcHash: hashItems(plugin.installPath, scan.items),
    srcPath: plugin.installPath,
    backup,
    // Keep the very first "before" picture when the same plugin is picked again.
    prev: existing?.prev ?? {
      origEnabled: inventory.enabled[plugin.id] ?? null,
      overlayEnabled: inventory.enabled[overlayId] ?? null,
      enabledPluginsExisted: raw.enabledPlugins !== undefined,
    },
    createdAt: ctx.now().toISOString(),
  };
  if (!hasOverlays) state.enabledPluginsCreated = raw.enabledPlugins === undefined;
  state.marketplace = marketplace;
  state.marketplacePrev ??= {
    existed: marketsObject !== undefined && marketplace in marketsObject,
    value: marketsObject?.[marketplace],
    containerExisted: markets !== undefined,
  };
  state.overlays[plugin.id] = entry;
  writeState(paths.stateFile, state);

  ctx.io.out(ctx.t('pick.done', { id: plugin.id, overlayId, before, after: result.afterTokens }));
  if (backup) ctx.io.out(ctx.t('pick.backup', { path: backup }));
  ctx.io.out(ctx.t('pick.reload', { id: plugin.id }));
  return 0;
}
