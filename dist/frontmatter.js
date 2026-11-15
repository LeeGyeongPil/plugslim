import YAML from 'yaml';
/**
 * Parse the YAML block at the top of a SKILL.md or command file.
 * Uses a real YAML parser so folded (>) descriptions and quoted "a: b" values come out right.
 * A missing or broken block yields empty data (broken ones also carry an error message).
 */
export function parseFrontmatter(text) {
    const match = /^﻿?---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/.exec(text);
    if (!match)
        return { data: {} };
    const block = match[1] ?? '';
    try {
        const value = YAML.parse(block);
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            return { data: value };
        }
        return { data: {} };
    }
    catch (error) {
        return { data: {}, error: error instanceof Error ? error.message.split('\n')[0] ?? 'YAML error' : 'YAML error' };
    }
}
/** Scalar frontmatter value as trimmed text; anything else counts as empty. */
export function asText(value) {
    if (typeof value === 'string')
        return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean')
        return String(value);
    return '';
}
export function asBool(value) {
    return value === true || (typeof value === 'string' && value.trim().toLowerCase() === 'true');
}
