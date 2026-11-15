import type { Ctx } from '../ctx.js';
import { type PluginScan } from '../plugin.js';
export interface MaterializeOptions {
    origId: string;
    overlayId: string;
    entryName: string;
    marketplace: string;
    srcRoot: string;
    scan: PluginScan;
    keep: Set<string>;
    maxDescChars: number;
}
export interface MaterializeResult {
    afterTokens: number;
    removedEntries: string[];
    overlayRoot: string;
}
export declare function materializeOverlay(ctx: Ctx, options: MaterializeOptions): MaterializeResult;
