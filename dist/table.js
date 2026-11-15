/** Render rows as an aligned text table. `align[i]` is 'l' or 'r'. */
export function renderTable(rows, align) {
    const widths = [];
    for (const row of rows)
        row.forEach((cell, i) => (widths[i] = Math.max(widths[i] ?? 0, displayWidth(cell))));
    return rows
        .map((row) => row
        .map((cell, i) => {
        const gap = (widths[i] ?? 0) - displayWidth(cell);
        return align[i] === 'r' ? ' '.repeat(gap) + cell : cell + ' '.repeat(gap);
    })
        .join('  ')
        .trimEnd())
        .join('\n');
}
/** Width in terminal cells: Hangul and other wide characters count as 2. */
export function displayWidth(text) {
    let width = 0;
    for (const ch of text) {
        const code = ch.codePointAt(0) ?? 0;
        const wide = (code >= 0x1100 && code <= 0x115f) ||
            (code >= 0x2e80 && code <= 0xa4cf) ||
            (code >= 0xac00 && code <= 0xd7a3) ||
            (code >= 0xf900 && code <= 0xfaff) ||
            (code >= 0xff00 && code <= 0xff60);
        width += wide ? 2 : 1;
    }
    return width;
}
/** Ten-cell bar for a percentage (clamped to 0-100). */
export function bar(percent) {
    const filled = Math.round(Math.min(Math.max(percent, 0), 100) / 10);
    return '█'.repeat(filled) + '░'.repeat(10 - filled);
}
