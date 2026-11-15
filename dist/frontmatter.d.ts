export interface Frontmatter {
    data: Record<string, unknown>;
    error?: string;
}
/**
 * Parse the YAML block at the top of a SKILL.md or command file.
 * Uses a real YAML parser so folded (>) descriptions and quoted "a: b" values come out right.
 * A missing or broken block yields empty data (broken ones also carry an error message).
 */
export declare function parseFrontmatter(text: string): Frontmatter;
/** Scalar frontmatter value as trimmed text; anything else counts as empty. */
export declare function asText(value: unknown): string;
export declare function asBool(value: unknown): boolean;
