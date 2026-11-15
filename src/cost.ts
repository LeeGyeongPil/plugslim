// Estimate the always-on skill-listing cost.
// One listing line per model-invocable skill/command:  "- <plugin>:<name>: <description> <when_to_use>"
// (the text part is cut at the per-entry cap). Tokens are estimated as ceil(chars / 4).
import type { PluginItem, PluginScan } from './plugin.js';

export const DEFAULT_MAX_DESC_CHARS = 1536;
export const DEFAULT_BUDGET_FRACTION = 0.01;
export const DEFAULT_CONTEXT_WINDOW = 200000;

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

function positive(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

/** Read listing settings from a settings object (skillListingMaxDescChars, skillListingBudgetFraction). */
export function costSettingsFrom(settings: Record<string, unknown>, contextWindow?: number): CostSettings {
  return {
    maxDescChars: Math.floor(positive(settings.skillListingMaxDescChars) ?? DEFAULT_MAX_DESC_CHARS),
    budgetFraction: positive(settings.skillListingBudgetFraction) ?? DEFAULT_BUDGET_FRACTION,
    contextWindow: contextWindow ?? DEFAULT_CONTEXT_WINDOW,
  };
}

export function budgetTokens(settings: CostSettings): number {
  return Math.floor(settings.contextWindow * settings.budgetFraction);
}

export function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

export function percentOf(tokens: number, budget: number): number {
  if (budget <= 0) return 0;
  return Math.round((tokens / budget) * 1000) / 10;
}

/** The text of one listing line. */
export function listingLine(plugin: string, item: Pick<PluginItem, 'name' | 'description' | 'whenToUse'>, cap: number): string {
  const text = [item.description, item.whenToUse].filter((part) => part !== '').join(' ').slice(0, cap);
  return text === '' ? `- ${plugin}:${item.name}` : `- ${plugin}:${item.name}: ${text}`;
}

export function costItem(plugin: string, item: PluginItem, cap: number): CostedItem {
  if (!item.modelInvocable) {
    return { name: item.name, kind: item.kind, chars: 0, tokens: 0, modelInvocable: false };
  }
  const chars = listingLine(plugin, item, cap).length;
  return { name: item.name, kind: item.kind, chars, tokens: estimateTokens(chars), modelInvocable: true };
}

export function costItems(plugin: string, items: PluginItem[], cap: number): PluginCost {
  const costed = items.map((item) => costItem(plugin, item, cap));
  return { items: costed, tokens: costed.reduce((sum, item) => sum + item.tokens, 0) };
}

export function costPlugin(scan: PluginScan, cap: number): PluginCost {
  return costItems(scan.name, scan.items, cap);
}
