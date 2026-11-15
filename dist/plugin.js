// Scan a plugin folder for the components that show up in the always-on skill listing.
import fs from 'node:fs';
import path from 'node:path';
import { asBool, asText, parseFrontmatter } from './frontmatter.js';
import { isInside } from './paths.js';
export function manifestFile(root) {
    return path.join(root, '.claude-plugin', 'plugin.json');
}
/** Read `.claude-plugin/plugin.json`. Missing or unreadable manifests give null (the plugin still loads without one). */
export function readManifest(root) {
    const file = manifestFile(root);
    if (!fs.existsSync(file))
        return { manifest: null };
    const rel = toRel(root, file);
    try {
        const value = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (value !== null && typeof value === 'object' && !Array.isArray(value))
            return { manifest: value };
        return { manifest: null, warning: { code: 'MANIFEST_INVALID', file: rel, detail: 'top level is not an object' } };
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        return { manifest: null, warning: { code: 'MANIFEST_INVALID', file: rel, detail } };
    }
}
/** A manifest path field may be a string or an array of strings; anything else is ignored. */
export function manifestPaths(value) {
    if (typeof value === 'string')
        return [value];
    if (Array.isArray(value))
        return value.filter((entry) => typeof entry === 'string');
    return [];
}
function toRel(root, abs) {
    return path.relative(root, abs).split(path.sep).join('/');
}
/** Resolve a manifest path inside the plugin root; null when it is unsafe (absolute, backslash, escaping). */
export function resolveInside(root, entry) {
    if (entry.includes('\\') || path.isAbsolute(entry))
        return null;
    const abs = path.resolve(root, entry);
    return isInside(root, abs) ? abs : null;
}
function isDir(p) {
    try {
        return fs.statSync(p).isDirectory();
    }
    catch {
        return false;
    }
}
function isFile(p) {
    try {
        return fs.statSync(p).isFile();
    }
    catch {
        return false;
    }
}
function subdirs(dir) {
    return fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() || (entry.isSymbolicLink() && isDir(path.join(dir, entry.name))))
        .map((entry) => entry.name)
        .sort();
}
function skillItem(root, dir, warnings) {
    const file = path.join(dir, 'SKILL.md');
    if (!isFile(file))
        return null;
    const { data, error } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
    if (error)
        warnings.push({ code: 'FRONTMATTER', file: toRel(root, file), detail: error });
    return {
        name: asText(data.name) || path.basename(dir),
        kind: 'skill',
        rel: toRel(root, dir),
        description: asText(data.description),
        whenToUse: asText(data.when_to_use),
        modelInvocable: !asBool(data['disable-model-invocation']),
    };
}
function commandItem(root, file, warnings) {
    const { data, error } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
    if (error)
        warnings.push({ code: 'FRONTMATTER', file: toRel(root, file), detail: error });
    return {
        name: path.basename(file, '.md'),
        kind: 'command',
        rel: toRel(root, file),
        description: asText(data.description),
        whenToUse: asText(data.when_to_use),
        modelInvocable: !asBool(data['disable-model-invocation']),
    };
}
/**
 * Collect skills and commands the way Claude Code loads them:
 * - skills: the default `skills/` folder PLUS every manifest `skills` path (additive);
 * - commands: manifest `commands` paths REPLACE the default `commands/` folder when present.
 * Paths that leave the plugin root are skipped with a warning.
 */
export function scanPlugin(root, fallbackName) {
    const warnings = [];
    const { manifest, warning } = readManifest(root);
    if (warning)
        warnings.push(warning);
    const name = typeof manifest?.name === 'string' && manifest.name !== '' ? manifest.name : fallbackName;
    const version = typeof manifest?.version === 'string' ? manifest.version : null;
    const items = [];
    const seen = new Set();
    const add = (item) => {
        if (item && !seen.has(item.rel)) {
            seen.add(item.rel);
            items.push(item);
        }
    };
    const skillPaths = ['skills', ...manifestPaths(manifest?.skills)];
    for (const entry of skillPaths) {
        const abs = resolveInside(root, entry);
        if (abs === null) {
            warnings.push({ code: 'UNSAFE_PATH', field: 'skills', path: entry });
            continue;
        }
        if (!isDir(abs))
            continue;
        if (isFile(path.join(abs, 'SKILL.md'))) {
            add(skillItem(root, abs, warnings));
            continue;
        }
        for (const sub of subdirs(abs))
            add(skillItem(root, path.join(abs, sub), warnings));
    }
    const commandPaths = manifest?.commands !== undefined ? manifestPaths(manifest.commands) : ['commands'];
    for (const entry of commandPaths) {
        const abs = resolveInside(root, entry);
        if (abs === null) {
            warnings.push({ code: 'UNSAFE_PATH', field: 'commands', path: entry });
            continue;
        }
        if (isFile(abs) && abs.endsWith('.md')) {
            add(commandItem(root, abs, warnings));
        }
        else if (isDir(abs)) {
            const files = fs
                .readdirSync(abs)
                .filter((f) => f.endsWith('.md') && isFile(path.join(abs, f)))
                .sort();
            for (const f of files)
                add(commandItem(root, path.join(abs, f), warnings));
        }
    }
    return { root, name, version, manifest, items, warnings };
}
/** True when the folder looks like a plugin (has components or a manifest). */
export function looksLikePlugin(root) {
    return isDir(path.join(root, 'skills')) || isDir(path.join(root, 'commands')) || fs.existsSync(manifestFile(root));
}
