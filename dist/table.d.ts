/** Render rows as an aligned text table. `align[i]` is 'l' or 'r'. */
export declare function renderTable(rows: string[][], align: Array<'l' | 'r'>): string;
/** Width in terminal cells: Hangul and other wide characters count as 2. */
export declare function displayWidth(text: string): number;
/** Ten-cell bar for a percentage (clamped to 0-100). */
export declare function bar(percent: number): string;
