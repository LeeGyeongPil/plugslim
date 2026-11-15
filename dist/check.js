// Self-check of a plugin folder: every path the manifest names must exist inside the plugin.
import fs from 'node:fs';
import { manifestPaths, readManifest, resolveInside } from './plugin.js';
// Manifest fields whose string values are paths relative to the plugin root.
const PATH_FIELDS = ['skills', 'commands', 'agents', 'hooks', 'mcpServers'];
export function checkPlugin(root) {
    const problems = [];
    const { manifest } = readManifest(root);
    if (!manifest)
        return problems;
    for (const field of PATH_FIELDS) {
        for (const entry of manifestPaths(manifest[field])) {
            const abs = resolveInside(root, entry);
            if (abs === null)
                problems.push({ code: 'BAD_PATH', path: entry });
            else if (!fs.existsSync(abs))
                problems.push({ code: 'BROKEN_PATH', path: entry });
        }
    }
    return problems;
}
