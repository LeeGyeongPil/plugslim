// Scan a plugin folder for the components that show up in the always-on skill listing.
import fs from 'node:fs';
import path from 'node:path';
import { asBool, asText, parseFrontmatter } from './frontmatter.js';
import { isInside } from './paths.js';

export type ItemKind = 'skill' | 'command';

export interface PluginItem {
  name: string;
  kind: ItemKind;
  /** Path of the removable unit (skill folder or command file) relative to the plugin root, with "/" separators. */
  rel: string;
  description: string;
  whenToUse: string;
  modelInvocable: boolean;
}

export type Manifest = Record<string, unknown>;

/**
 * A problem found while scanning; the plugin is still counted. `ls` turns it into a translated sentence,
 * and `ls --json` prints these fields plus that sentence as `message`.
 * - MANIFEST_INVALID: plugin.json could not be read (`file`, `detail`); scanned as if there were no manifest.
 * - UNSAFE_PATH: a manifest `skills`/`commands` path (`field`, `path`) leaves the plugin folder; skipped.
 * - FRONTMATTER: a SKILL.md or command file has broken YAML frontmatter (`file`, `detail`); counted without description.
 * - SOURCE_MISSING: the plugin folder itself is gone (`path`).
 */
export interface ScanWarning {
  code: 'MANIFEST_INVALID' | 'UNSAFE_PATH' | 'FRONTMATTER' | 'SOURCE_MISSING';
  file?: string;
  path?: string;
  field?: string;
  detail?: string;
}

export interface PluginScan {
  root: string;
  name: string;
  version: string | null;
  manifest: Manifest | null;
  items: PluginItem[];
  warnings: ScanWarning[];
}

export function manifestFile(root: string): string {
  return path.join(root, '.claude-plugin', 'plugin.json');
}

/** Read `.claude-plugin/plugin.json`. Missing or unreadable manifests give null (the plugin still loads without one). */
export function readManifest(root: string): { manifest: Manifest | null; warning?: ScanWarning } {
  const file = manifestFile(root);
  if (!fs.existsSync(file)) return { manifest: null };
  const rel = toRel(root, file);
  try {
    const value: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) return { manifest: value as Manifest };
    return { manifest: null, warning: { code: 'MANIFEST_INVALID', file: rel, detail: 'top level is not an object' } };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { manifest: null, warning: { code: 'MANIFEST_INVALID', file: rel, detail } };
  }
}

/** A manifest path field may be a string or an array of strings; anything else is ignored. */
export function manifestPaths(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string');
  return [];
}

function toRel(root: string, abs: string): string {
  return path.relative(root, abs).split(path.sep).join('/');
}

/** Resolve a manifest path inside the plugin root; null when it is unsafe (absolute, backslash, escaping). */
export function resolveInside(root: string, entry: string): string | null {
  if (entry.includes('\\') || path.isAbsolute(entry)) return null;
  const abs = path.resolve(root, entry);
  return isInside(root, abs) ? abs : null;
}

function isDir(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isFile(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function subdirs(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() || (entry.isSymbolicLink() && isDir(path.join(dir, entry.name))))
    .map((entry) => entry.name)
    .sort();
}

function skillItem(root: string, dir: string, warnings: ScanWarning[]): PluginItem | null {
  const file = path.join(dir, 'SKILL.md');
  if (!isFile(file)) return null;
  const { data, error } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
  if (error) warnings.push({ code: 'FRONTMATTER', file: toRel(root, file), detail: error });
  return {
    name: asText(data.name) || path.basename(dir),
    kind: 'skill',
    rel: toRel(root, dir),
    description: asText(data.description),
    whenToUse: asText(data.when_to_use),
    modelInvocable: !asBool(data['disable-model-invocation']),
  };
}

function commandItem(root: string, file: string, warnings: ScanWarning[]): PluginItem {
  const { data, error } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
  if (error) warnings.push({ code: 'FRONTMATTER', file: toRel(root, file), detail: error });
  return {
    name: path.basename(file, '.md'),
    kind: 'command',
    rel: toRel(root, file),
    description: asText(data.description),
    whenToUse: asText(data.when_to_use),
    modelInvocable: !asBool(data['disable-model-invocation']),
  };
}

/**
 * Collect skills and commands the way Claude Code loads them:
 * - skills: the default `skills/` folder PLUS every manifest `skills` path (additive);
 * - commands: manifest `commands` paths REPLACE the default `commands/` folder when present.
 * Paths that leave the plugin root are skipped with a warning.
 */
export function scanPlugin(root: string, fallbackName: string): PluginScan {
  const warnings: ScanWarning[] = [];
  const { manifest, warning } = readManifest(root);
  if (warning) warnings.push(warning);
  const name = typeof manifest?.name === 'string' && manifest.name !== '' ? manifest.name : fallbackName;
  const version = typeof manifest?.version === 'string' ? manifest.version : null;
  const items: PluginItem[] = [];
  const seen = new Set<string>();
  const add = (item: PluginItem | null): void => {
    if (item && !seen.has(item.rel)) {
      seen.add(item.rel);
      items.push(item);
    }
  };

  const skillPaths = ['skills', ...manifestPaths(manifest?.skills)];
  for (const entry of skillPaths) {
    const abs = resolveInside(root, entry);
    if (abs === null) {
      warnings.push({ code: 'UNSAFE_PATH', field: 'skills', path: entry });
      continue;
    }
    if (!isDir(abs)) continue;
    if (isFile(path.join(abs, 'SKILL.md'))) {
      add(skillItem(root, abs, warnings));
      continue;
    }
    for (const sub of subdirs(abs)) add(skillItem(root, path.join(abs, sub), warnings));
  }

  const commandPaths = manifest?.commands !== undefined ? manifestPaths(manifest.commands) : ['commands'];
  for (const entry of commandPaths) {
    const abs = resolveInside(root, entry);
    if (abs === null) {
      warnings.push({ code: 'UNSAFE_PATH', field: 'commands', path: entry });
      continue;
    }
    if (isFile(abs) && abs.endsWith('.md')) {
      add(commandItem(root, abs, warnings));
    } else if (isDir(abs)) {
      const files = fs
        .readdirSync(abs)
        .filter((f) => f.endsWith('.md') && isFile(path.join(abs, f)))
        .sort();
      for (const f of files) add(commandItem(root, path.join(abs, f), warnings));
    }
  }

  return { root, name, version, manifest, items, warnings };
}

/** True when the folder looks like a plugin (has components or a manifest). */
export function looksLikePlugin(root: string): boolean {
  return isDir(path.join(root, 'skills')) || isDir(path.join(root, 'commands')) || fs.existsSync(manifestFile(root));
}
