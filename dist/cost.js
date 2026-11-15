export const DEFAULT_MAX_DESC_CHARS = 1536;
export const DEFAULT_BUDGET_FRACTION = 0.01;
export const DEFAULT_CONTEXT_WINDOW = 200000;
function positive(value) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}
/** Read listing settings from a settings object (skillListingMaxDescChars, skillListingBudgetFraction). */
export function costSettingsFrom(settings, contextWindow) {
    return {
        maxDescChars: Math.floor(positive(settings.skillListingMaxDescChars) ?? DEFAULT_MAX_DESC_CHARS),
        budgetFraction: positive(settings.skillListingBudgetFraction) ?? DEFAULT_BUDGET_FRACTION,
        contextWindow: contextWindow ?? DEFAULT_CONTEXT_WINDOW,
    };
}
export function budgetTokens(settings) {
    return Math.floor(settings.contextWindow * settings.budgetFraction);
}
export function estimateTokens(chars) {
    return Math.ceil(chars / 4);
}
export function percentOf(tokens, budget) {
    if (budget <= 0)
        return 0;
    return Math.round((tokens / budget) * 1000) / 10;
}
/** The text of one listing line. */
export function listingLine(plugin, item, cap) {
    const text = [item.description, item.whenToUse].filter((part) => part !== '').join(' ').slice(0, cap);
    return text === '' ? `- ${plugin}:${item.name}` : `- ${plugin}:${item.name}: ${text}`;
}
export function costItem(plugin, item, cap) {
    if (!item.modelInvocable) {
        return { name: item.name, kind: item.kind, chars: 0, tokens: 0, modelInvocable: false };
    }
    const chars = listingLine(plugin, item, cap).length;
    return { name: item.name, kind: item.kind, chars, tokens: estimateTokens(chars), modelInvocable: true };
}
export function costItems(plugin, items, cap) {
    const costed = items.map((item) => costItem(plugin, item, cap));
    return { items: costed, tokens: costed.reduce((sum, item) => sum + item.tokens, 0) };
}
export function costPlugin(scan, cap) {
    return costItems(scan.name, scan.items, cap);
}
