import type { MarketplacePrev, OverlayEntry } from './state.js';
export type Json = Record<string, unknown>;
export interface SettingsFile {
    path: string;
    exists: boolean;
    data: Json;
}
/**
 * Read a settings file as strict JSON. A missing file is an empty object.
 * A file that cannot be read (permissions, a folder in its place) and a file that is not valid JSON
 * are different UsageErrors (exit 2), so the message points at the real cause.
 */
export declare function readSettings(file: string): SettingsFile;
/** enabledPlugins of a settings object as a plain map (non-boolean values are ignored). */
export declare function enabledMap(file: SettingsFile): Record<string, boolean>;
export interface PickEdit {
    origId: string;
    overlayId: string;
    marketplace: string;
    marketplacePath: string;
}
/** Return a copy of the settings with the original off, the overlay on and the overlay marketplace declared. */
export declare function applyPick(file: SettingsFile, edit: PickEdit): Json;
export interface RestoreEdit {
    entry: OverlayEntry;
    marketplace: string;
    /** Set when this is the last overlay: also put the marketplace declaration back. */
    marketplacePrev: MarketplacePrev | null;
    /** Set when this is the last overlay and plugslim created the enabledPlugins container: drop it if empty. */
    removeEmptyEnabled: boolean;
}
/** Undo exactly the keys applyPick set; unrelated keys (even ones added later) are left alone. */
export declare function applyRestore(file: SettingsFile, edit: RestoreEdit): Json;
/** Human-readable diff of the two sections plugslim edits. Lines start with "-" (old) or "+" (new). */
export declare function diffSettings(before: Json, after: Json): string[];
/** Copy the current settings file into the backups folder. Returns the backup path, or null when there was no file. */
export declare function backupSettings(file: SettingsFile, backupsDir: string, now: Date): string | null;
export declare function writeSettings(file: string, data: Json): void;
