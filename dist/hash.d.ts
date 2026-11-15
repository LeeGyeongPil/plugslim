import type { PluginItem } from './plugin.js';
/** Deterministic sha256 over the skill folders and command files (sorted paths + contents). */
export declare function hashItems(root: string, items: PluginItem[]): string;
