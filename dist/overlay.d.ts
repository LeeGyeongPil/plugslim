import { type PluginScan } from './plugin.js';
export interface BuildOptions {
    srcRoot: string;
    destRoot: string;
    scan: PluginScan;
    /** Names of the skills/commands to keep. */
    keep: Set<string>;
    /** Plugin name for a manifest created from scratch (the original had none). */
    entryName: string;
}
/** Copy the plugin (symlinks resolved, so the copy survives cache cleanup) and prune it. */
export declare function buildOverlayTree(options: BuildOptions): {
    removedEntries: string[];
};
export declare function upsertMarketplaceEntry(file: string, marketplace: string, entryName: string, description: string): void;
/** Remove one entry; returns how many entries remain. */
export declare function removeMarketplaceEntry(file: string, marketplace: string, entryName: string): number;
