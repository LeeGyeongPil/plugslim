import type { Args, Ctx } from '../ctx.js';
import { type CostSettings, type CostedItem } from '../cost.js';
import { type InstalledPlugin } from '../inventory.js';
import { type ScanWarning } from '../plugin.js';
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
export declare function positiveNumber(option: string, value: string | undefined): number | undefined;
/** Cost one plugin folder. A missing folder yields a warning instead of an error. */
export declare function describePlugin(plugin: Pick<InstalledPlugin, 'id' | 'name' | 'version' | 'overlay' | 'installPath'>, enabled: boolean | null, settings: CostSettings): LsPlugin;
export declare function lsCommand(ctx: Ctx, args: Args): number;
