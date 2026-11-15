// plugslim ls: estimated always-on skill-listing cost per plugin.
import fs from 'node:fs';
import path from 'node:path';
import type { Args, Ctx } from '../ctx.js';
import { type CostSettings, type CostedItem, budgetTokens, costPlugin, costSettingsFrom, percentOf } from '../cost.js';
import { UsageError } from '../errors.js';
import { type InstalledPlugin, readInventory, resolvePlugin } from '../inventory.js';
import { type ScanWarning, looksLikePlugin, scanPlugin } from '../plugin.js';
import { readSettings } from '../settings.js';
import { readState } from '../state.js';
import { storePaths } from '../paths.js';
import { bar, renderTable } from '../table.js';

export interface LsPlugin {
  id: string;
  name: string;
  version: string | null;
  /** null for a plain folder given with --path (not an installed plugin, so it has no enabled state). */
  enabled: boolean | null;
  overlay: boolean;
  path: string;
  tokens: number;
  budgetPercent: number;
  items: CostedItem[];
  warnings: ScanWarning[];
}

export function positiveNumber(option: string, value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new UsageError('err.badNumber', { option, value });
  return n;
}

/** Cost one plugin folder. A missing folder yields a warning instead of an error. */
export function describePlugin(
  plugin: Pick<InstalledPlugin, 'id' | 'name' | 'version' | 'overlay' | 'installPath'>,
  enabled: boolean | null,
  settings: CostSettings,
): LsPlugin {
  const base = {
    id: plugin.id,
    name: plugin.name,
    enabled,
    overlay: plugin.overlay,
    path: plugin.installPath,
  };
  const budget = budgetTokens(settings);
  if (!fs.existsSync(plugin.installPath)) {
    return {
      ...base,
      version: plugin.version,
      tokens: 0,
      budgetPercent: 0,
      items: [],
      warnings: [{ code: 'SOURCE_MISSING', path: plugin.installPath }],
    };
  }
  const scan = scanPlugin(plugin.installPath, plugin.name);
  const cost = costPlugin(scan, settings.maxDescChars);
  return {
    ...base,
    version: scan.version ?? plugin.version,
    tokens: cost.tokens,
    budgetPercent: percentOf(cost.tokens, budget),
    items: cost.items,
    warnings: scan.warnings,
  };
}

/** The translated sentence for a scan warning (the same text in the table and in `--json` as `message`). */
function warningText(ctx: Ctx, w: ScanWarning): string {
  const vars = { file: w.file ?? '', path: w.path ?? '', field: w.field ?? '', detail: w.detail ?? '' };
  switch (w.code) {
    case 'SOURCE_MISSING':
      return ctx.t('ls.warn.sourceMissing', vars);
    case 'FRONTMATTER':
      return ctx.t('ls.warn.frontmatter', vars);
    case 'MANIFEST_INVALID':
      return ctx.t('ls.warn.manifestInvalid', vars);
    case 'UNSAFE_PATH':
      return ctx.t('ls.warn.unsafePath', vars);
  }
}

export function lsCommand(ctx: Ctx, args: Args): number {
  const contextWindow = args.contextWindow;
  const maxTokens = args.maxTokens;
  const query = args.positionals[1];
  const paths = storePaths(ctx.storeDir);

  let plugins: LsPlugin[];
  let settings: CostSettings;
  let detail = false;

  if (args.path !== undefined) {
    const root = path.resolve(ctx.cwd, args.path);
    if (!fs.existsSync(root) || !looksLikePlugin(root)) throw new UsageError('err.pathNotPlugin', { path: root });
    // --path is the plugin-author / CI mode: the user's own settings only tune the budget numbers,
    // so a broken or unreadable settings.json falls back to the defaults (with a note) instead of failing.
    let userSettings: Record<string, unknown> = {};
    try {
      userSettings = readSettings(path.join(ctx.configDir, 'settings.json')).data;
    } catch (error) {
      if (!(error instanceof UsageError)) throw error;
      ctx.io.err(ctx.t('ls.warn.settingsIgnored', { file: String(error.vars.file ?? ''), detail: String(error.vars.detail ?? '') }));
    }
    settings = costSettingsFrom(userSettings, contextWindow);
    const scan = scanPlugin(root, path.basename(root));
    plugins = [describePlugin({ id: scan.name, name: scan.name, version: scan.version, overlay: false, installPath: root }, null, settings)];
    detail = true;
  } else {
    const state = readState(paths.stateFile);
    const inventory = readInventory(ctx.configDir, ctx.storeDir, state);
    settings = costSettingsFrom(inventory.settings.data, contextWindow);
    const selected = query === undefined ? inventory.plugins : [resolvePlugin(inventory.plugins, query)];
    detail = query !== undefined;
    plugins = selected
      .map((p) => describePlugin(p, inventory.enabled[p.id] === true, settings))
      .sort((a, b) => b.tokens - a.tokens || a.id.localeCompare(b.id));
  }

  const budget = budgetTokens(settings);
  // Only enabled plugins are in the context; a single inspected plugin counts on its own.
  const counted = detail ? plugins : plugins.filter((p) => p.enabled === true);
  const totalTokens = counted.reduce((sum, p) => sum + p.tokens, 0);
  const budgetPercent = percentOf(totalTokens, budget);

  if (args.json) {
    ctx.io.out(
      JSON.stringify(
        {
          estimated: true,
          contextWindow: settings.contextWindow,
          budgetFraction: settings.budgetFraction,
          budgetTokens: budget,
          maxDescChars: settings.maxDescChars,
          totalTokens,
          budgetPercent,
          // warnings[] are objects: { code, file?, path?, field?, detail?, message }.
          plugins: plugins.map((p) => ({ ...p, warnings: p.warnings.map((w) => ({ ...w, message: warningText(ctx, w) })) })),
        },
        null,
        2,
      ),
    );
  } else {
    ctx.io.out(
      ctx.t('ls.estimateNote', {
        fraction: Math.round(settings.budgetFraction * 1000) / 10,
        window: settings.contextWindow,
        budget,
        cap: settings.maxDescChars,
      }),
    );
    if (plugins.length === 0) {
      ctx.io.out(ctx.t('ls.noPlugins', { dir: ctx.configDir }));
    } else if (detail) {
      for (const plugin of plugins) ctx.io.out(renderDetail(ctx, plugin));
    } else {
      ctx.io.out(renderOverview(ctx, plugins));
    }
    for (const plugin of plugins) for (const w of plugin.warnings) ctx.io.out(`${plugin.id}: ${warningText(ctx, w)}`);
    if (plugins.length > 0) {
      const key = detail ? 'ls.totalPath' : 'ls.total';
      ctx.io.out(ctx.t(key, { tokens: totalTokens, budget, percent: budgetPercent }));
    }
  }

  if (maxTokens !== undefined && totalTokens > maxTokens) {
    ctx.io.err(ctx.t('ls.overCap', { tokens: totalTokens, max: maxTokens }));
    return 1;
  }
  return 0;
}

function statusLabel(ctx: Ctx, p: LsPlugin): string {
  if (p.enabled === null) return ctx.t('ls.status.path');
  if (!p.enabled) return ctx.t('ls.status.disabled');
  return p.overlay ? `${ctx.t('ls.status.enabled')} (${ctx.t('ls.status.overlay')})` : ctx.t('ls.status.enabled');
}

function renderOverview(ctx: Ctx, plugins: LsPlugin[]): string {
  const rows = [[ctx.t('ls.col.plugin'), ctx.t('ls.col.items'), ctx.t('ls.col.tokens'), ctx.t('ls.col.budget'), '', ctx.t('ls.col.status')]];
  for (const p of plugins) {
    rows.push([p.id, String(p.items.length), String(p.tokens), `${p.budgetPercent}%`, bar(p.budgetPercent), statusLabel(ctx, p)]);
  }
  return renderTable(rows, ['l', 'r', 'r', 'r', 'l', 'l']);
}

function renderDetail(ctx: Ctx, p: LsPlugin): string {
  const head = `${p.id}${p.version ? `  v${p.version}` : ''}  [${statusLabel(ctx, p)}]  ${p.tokens} tok (${p.budgetPercent}%)`;
  const rows = [[ctx.t('ls.col.kind'), ctx.t('ls.col.name'), ctx.t('ls.col.chars'), ctx.t('ls.col.tokens'), '']];
  for (const item of p.items) {
    rows.push([
      ctx.t(item.kind === 'skill' ? 'ls.kind.skill' : 'ls.kind.command'),
      item.name,
      String(item.chars),
      String(item.tokens),
      item.modelInvocable ? '' : ctx.t('ls.noListing'),
    ]);
  }
  return `${head}\n${renderTable(rows, ['l', 'l', 'r', 'r', 'l'])}`;
}
