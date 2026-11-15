// plugslim's own bookkeeping, kept in <store>/state.json.
import fs from 'node:fs';
import { UsageError } from './errors.js';
import { isPlainObject, readJsonFile, writeJsonAtomic } from './fsutil.js';

export const DEFAULT_MARKETPLACE = 'plugslim';

/** What the user's settings looked like for our keys before the first pick (used by restore). */
export interface PrevSettings {
  origEnabled: boolean | null; // null = key was absent
  overlayEnabled: boolean | null;
  enabledPluginsExisted: boolean;
}

export interface OverlayEntry {
  origId: string;
  overlayId: string;
  /** Plugin name = overlay folder name = marketplace entry name. */
  entryName: string;
  keep: string[];
  /** Every skill/command name seen in the original when the overlay was last built. */
  known: string[];
  srcVersion: string | null;
  srcHash: string;
  srcPath: string;
  backup: string | null;
  prev: PrevSettings;
  createdAt: string;
}

export interface MarketplacePrev {
  existed: boolean;
  value?: unknown;
  containerExisted: boolean;
}

export interface State {
  version: 1;
  marketplace: string;
  marketplacePrev: MarketplacePrev | null;
  /** True when the first pick had to create the enabledPlugins object (restore removes it again if empty). */
  enabledPluginsCreated?: boolean;
  overlays: Record<string, OverlayEntry>;
}

export function emptyState(marketplace: string = DEFAULT_MARKETPLACE): State {
  return { version: 1, marketplace, marketplacePrev: null, overlays: {} };
}

export function readState(file: string): State {
  if (!fs.existsSync(file)) return emptyState();
  try {
    const value = readJsonFile(file);
    if (!isPlainObject(value) || !isPlainObject(value.overlays) || typeof value.marketplace !== 'string') {
      throw new Error('unexpected structure');
    }
    return value as unknown as State;
  } catch (error) {
    throw new UsageError('err.stateInvalid', { file, detail: error instanceof Error ? error.message : String(error) });
  }
}

export function writeState(file: string, state: State): void {
  writeJsonAtomic(file, state);
}

export function overlayList(state: State): OverlayEntry[] {
  return Object.values(state.overlays);
}

/** Find an overlay by original id or overlay id. */
export function findOverlay(state: State, id: string): OverlayEntry | undefined {
  return state.overlays[id] ?? overlayList(state).find((entry) => entry.overlayId === id);
}
