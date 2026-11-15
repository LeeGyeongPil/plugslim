// Build an overlay: a real copy of the plugin with the unpicked skills/commands removed,
// plus the local-directory marketplace file that lets Claude Code load it in place.
import fs from 'node:fs';
import path from 'node:path';
import { isPlainObject, readJsonFile, writeJsonAtomic } from './fsutil.js';
import { type PluginScan, manifestFile, manifestPaths, readManifest, resolveInside } from './plugin.js';

export interface BuildOptions {
  srcRoot: string;
  destRoot: string;
  scan: PluginScan;
  /** Names of the skills/commands to keep. */
  keep: Set<string>;
  /** Plugin name for a manifest created from scratch (the original had none). */
  entryName: string;
}

function isDir(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function hasSkill(dir: string): boolean {
  if (fs.existsSync(path.join(dir, 'SKILL.md'))) return true;
  return fs.readdirSync(dir).some((name) => fs.existsSync(path.join(dir, name, 'SKILL.md')));
}

function hasMarkdown(dir: string): boolean {
  return fs.readdirSync(dir).some((name) => name.endsWith('.md'));
}

function skillsEntryAlive(root: string, entry: string): boolean {
  const abs = resolveInside(root, entry);
  return abs !== null && isDir(abs) && hasSkill(abs);
}

function commandsEntryAlive(root: string, entry: string): boolean {
  const abs = resolveInside(root, entry);
  if (abs === null || !fs.existsSync(abs)) return false;
  return isDir(abs) ? hasMarkdown(abs) : abs.endsWith('.md');
}

/**
 * Drop manifest `skills` / `commands` entries that no longer point at anything after pruning.
 * Without this Claude Code rejects the plugin with "Path not found".
 * Returns the removed entries. A manifest-less plugin gets a minimal manifest so the name is kept.
 */
function fixManifest(root: string, entryName: string): string[] {
  const { manifest } = readManifest(root);
  if (manifest === null) {
    if (!fs.existsSync(manifestFile(root))) writeJsonAtomic(manifestFile(root), { name: entryName });
    return [];
  }
  const removed: string[] = [];
  let changed = false;

  if (manifest.skills !== undefined) {
    const entries = manifestPaths(manifest.skills);
    const alive = entries.filter((entry) => skillsEntryAlive(root, entry));
    if (alive.length !== entries.length) {
      removed.push(...entries.filter((entry) => !alive.includes(entry)));
      // skills paths are additive, so an empty list can simply be dropped
      if (alive.length === 0) delete manifest.skills;
      else manifest.skills = alive;
      changed = true;
    }
  }

  if (manifest.commands !== undefined) {
    const entries = manifestPaths(manifest.commands);
    const alive = entries.filter((entry) => commandsEntryAlive(root, entry));
    if (alive.length !== entries.length) {
      removed.push(...entries.filter((entry) => !alive.includes(entry)));
      // commands paths REPLACE the default commands/ folder: keep the key (empty) instead of re-enabling the folder
      manifest.commands = alive;
      changed = true;
    }
  }

  if (changed) writeJsonAtomic(manifestFile(root), manifest);
  return removed;
}

/** Copy the plugin (symlinks resolved, so the copy survives cache cleanup) and prune it. */
export function buildOverlayTree(options: BuildOptions): { removedEntries: string[] } {
  const { srcRoot, destRoot, scan, keep, entryName } = options;
  fs.rmSync(destRoot, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destRoot), { recursive: true });
  fs.cpSync(srcRoot, destRoot, {
    recursive: true,
    dereference: true,
    filter: (source) => !['.git', '.orphaned_at'].includes(path.basename(source)),
  });
  for (const item of scan.items) {
    if (!keep.has(item.name)) fs.rmSync(path.join(destRoot, item.rel), { recursive: true, force: true });
  }
  return { removedEntries: fixManifest(destRoot, entryName) };
}

interface MarketplaceFile {
  name: string;
  owner: { name: string };
  metadata: { description: string };
  plugins: Array<{ name: string; source: string; description?: string }>;
}

function readMarketplace(file: string, name: string): MarketplaceFile {
  if (fs.existsSync(file)) {
    try {
      const value = readJsonFile(file);
      if (isPlainObject(value) && Array.isArray(value.plugins)) {
        return { ...(value as unknown as MarketplaceFile), name };
      }
    } catch {
      // fall through: a broken marketplace file is rewritten from state
    }
  }
  return {
    name,
    owner: { name: 'plugslim' },
    metadata: { description: 'Slimmed copies of plugins made by plugslim' },
    plugins: [],
  };
}

export function upsertMarketplaceEntry(file: string, marketplace: string, entryName: string, description: string): void {
  const data = readMarketplace(file, marketplace);
  const entry = { name: entryName, source: `./plugins/${entryName}`, description };
  const index = data.plugins.findIndex((p) => p.name === entryName);
  if (index >= 0) data.plugins[index] = entry;
  else data.plugins.push(entry);
  writeJsonAtomic(file, data);
}

/** Remove one entry; returns how many entries remain. */
export function removeMarketplaceEntry(file: string, marketplace: string, entryName: string): number {
  if (!fs.existsSync(file)) return 0;
  const data = readMarketplace(file, marketplace);
  data.plugins = data.plugins.filter((p) => p.name !== entryName);
  writeJsonAtomic(file, data);
  return data.plugins.length;
}
