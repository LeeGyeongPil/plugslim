// What is installed and what is enabled, read from the Claude Code config dir (read-only).
import fs from 'node:fs';
import path from 'node:path';
import { UsageError } from './errors.js';
import { isPlainObject, readTextOrThrow } from './fsutil.js';
import { type SettingsFile, enabledMap, readSettings } from './settings.js';
import { type State, overlayList } from './state.js';
import { storePaths } from './paths.js';

export interface InstalledPlugin {
  id: string;
  name: string;
  marketplace: string;
  installPath: string;
  version: string | null;
  scope: string | null;
  /** True for copies made by plugslim (they are not in installed_plugins.json). */
  overlay: boolean;
}

export interface Inventory {
  configDir: string;
  settings: SettingsFile;
  enabled: Record<string, boolean>;
  plugins: InstalledPlugin[];
}

export function splitId(id: string): { name: string; marketplace: string } {
  const at = id.lastIndexOf('@');
  if (at <= 0) return { name: id, marketplace: '' };
  return { name: id.slice(0, at), marketplace: id.slice(at + 1) };
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function fromRecord(id: string, record: unknown, configDir: string, file: string): InstalledPlugin {
  if (!isPlainObject(record) || str(record.installPath) === null) {
    throw new UsageError('err.installedFormat', { file });
  }
  const { name, marketplace } = splitId(id);
  return {
    id,
    name,
    marketplace,
    // Real files hold absolute paths; a relative path (used by the practice fixture) is relative to the config dir.
    installPath: path.resolve(configDir, record.installPath as string),
    version: str(record.version),
    scope: str(record.scope),
    overlay: false,
  };
}

/** Parse installed_plugins.json. Accepts {"plugins": {id: [records]}} and an array of records. */
export function readInstalled(configDir: string): InstalledPlugin[] {
  const file = path.join(configDir, 'plugins', 'installed_plugins.json');
  if (!fs.existsSync(file)) return [];
  const text = readTextOrThrow(file); // unreadable file: its own message, not "unsupported format"
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new UsageError('err.installedFormat', { file });
  }
  const out: InstalledPlugin[] = [];
  if (Array.isArray(value)) {
    for (const record of value) {
      if (!isPlainObject(record)) throw new UsageError('err.installedFormat', { file });
      const id =
        str(record.id) ??
        str(record.plugin) ??
        (str(record.name) !== null && str(record.marketplace) !== null ? `${str(record.name)}@${str(record.marketplace)}` : null);
      if (id === null) throw new UsageError('err.installedFormat', { file });
      out.push(fromRecord(id, record, configDir, file));
    }
    return out;
  }
  if (isPlainObject(value) && isPlainObject(value.plugins)) {
    for (const [id, entry] of Object.entries(value.plugins)) {
      const records = Array.isArray(entry) ? entry : [entry];
      const preferred = records.find((r) => isPlainObject(r) && r.scope === 'user') ?? records[0];
      out.push(fromRecord(id, preferred, configDir, file));
    }
    return out;
  }
  throw new UsageError('err.installedFormat', { file });
}

/** Installed plugins plus the overlays plugslim has built, with the user-scope enabled flags. */
export function readInventory(configDir: string, storeDir: string, state: State): Inventory {
  const settings = readSettings(path.join(configDir, 'settings.json'));
  const plugins = readInstalled(configDir);
  const paths = storePaths(storeDir);
  for (const entry of overlayList(state)) {
    if (plugins.some((p) => p.id === entry.overlayId)) continue;
    plugins.push({
      id: entry.overlayId,
      name: entry.entryName,
      marketplace: state.marketplace,
      installPath: path.join(paths.pluginsDir, entry.entryName),
      version: entry.srcVersion,
      scope: 'user',
      overlay: true,
    });
  }
  return { configDir, settings, enabled: enabledMap(settings), plugins };
}

/** Resolve a user-typed id: the exact id, or a plugin name that matches exactly one plugin. */
export function resolvePlugin(plugins: InstalledPlugin[], query: string): InstalledPlugin {
  const exact = plugins.find((p) => p.id === query);
  if (exact) return exact;
  const byName = plugins.filter((p) => p.name === query);
  if (byName.length === 1 && byName[0]) return byName[0];
  const available = plugins.map((p) => p.id).join(', ');
  if (byName.length > 1) throw new UsageError('err.ambiguousPlugin', { id: query, available });
  throw new UsageError('err.unknownPlugin', { id: query, available: available || '-' });
}
