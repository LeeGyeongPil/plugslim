export type ItemKind = 'skill' | 'command';
export interface PluginItem {
    name: string;
    kind: ItemKind;
    /** Path of the removable unit (skill folder or command file) relative to the plugin root, with "/" separators. */
    rel: string;
    description: string;
    whenToUse: string;
    modelInvocable: boolean;
}
export type Manifest = Record<string, unknown>;
/**
 * A problem found while scanning; the plugin is still counted. `ls` turns it into a translated sentence,
 * and `ls --json` prints these fields plus that sentence as `message`.
 * - MANIFEST_INVALID: plugin.json could not be read (`file`, `detail`); scanned as if there were no manifest.
 * - UNSAFE_PATH: a manifest `skills`/`commands` path (`field`, `path`) leaves the plugin folder; skipped.
 * - FRONTMATTER: a SKILL.md or command file has broken YAML frontmatter (`file`, `detail`); counted without description.
 * - SOURCE_MISSING: the plugin folder itself is gone (`path`).
 */
export interface ScanWarning {
    code: 'MANIFEST_INVALID' | 'UNSAFE_PATH' | 'FRONTMATTER' | 'SOURCE_MISSING';
    file?: string;
    path?: string;
    field?: string;
    detail?: string;
}
export interface PluginScan {
    root: string;
    name: string;
    version: string | null;
    manifest: Manifest | null;
    items: PluginItem[];
    warnings: ScanWarning[];
}
export declare function manifestFile(root: string): string;
/** Read `.claude-plugin/plugin.json`. Missing or unreadable manifests give null (the plugin still loads without one). */
export declare function readManifest(root: string): {
    manifest: Manifest | null;
    warning?: ScanWarning;
};
/** A manifest path field may be a string or an array of strings; anything else is ignored. */
export declare function manifestPaths(value: unknown): string[];
/** Resolve a manifest path inside the plugin root; null when it is unsafe (absolute, backslash, escaping). */
export declare function resolveInside(root: string, entry: string): string | null;
/**
 * Collect skills and commands the way Claude Code loads them:
 * - skills: the default `skills/` folder PLUS every manifest `skills` path (additive);
 * - commands: manifest `commands` paths REPLACE the default `commands/` folder when present.
 * Paths that leave the plugin root are skipped with a warning.
 */
export declare function scanPlugin(root: string, fallbackName: string): PluginScan;
/** True when the folder looks like a plugin (has components or a manifest). */
export declare function looksLikePlugin(root: string): boolean;
