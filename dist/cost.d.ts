import type { PluginItem, PluginScan } from './plugin.js';
export declare const DEFAULT_MAX_DESC_CHARS = 1536;
export declare const DEFAULT_BUDGET_FRACTION = 0.01;
export declare const DEFAULT_CONTEXT_WINDOW = 200000;
export interface CostSettings {
    maxDescChars: number;
    budgetFraction: number;
    contextWindow: number;
}
export interface CostedItem {
    name: string;
    kind: 'skill' | 'command';
    chars: number;
    tokens: number;
    modelInvocable: boolean;
}
export interface PluginCost {
    items: CostedItem[];
    tokens: number;
}
/** Read listing settings from a settings object (skillListingMaxDescChars, skillListingBudgetFraction). */
export declare function costSettingsFrom(settings: Record<string, unknown>, contextWindow?: number): CostSettings;
export declare function budgetTokens(settings: CostSettings): number;
export declare function estimateTokens(chars: number): number;
export declare function percentOf(tokens: number, budget: number): number;
/** The text of one listing line. */
export declare function listingLine(plugin: string, item: Pick<PluginItem, 'name' | 'description' | 'whenToUse'>, cap: number): string;
export declare function costItem(plugin: string, item: PluginItem, cap: number): CostedItem;
export declare function costItems(plugin: string, items: PluginItem[], cap: number): PluginCost;
export declare function costPlugin(scan: PluginScan, cap: number): PluginCost;
