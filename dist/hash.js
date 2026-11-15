import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
function filesUnder(target) {
    const stat = fs.statSync(target);
    if (stat.isFile())
        return [target];
    const out = [];
    for (const name of fs.readdirSync(target).sort())
        out.push(...filesUnder(path.join(target, name)));
    return out;
}
/** Deterministic sha256 over the skill folders and command files (sorted paths + contents). */
export function hashItems(root, items) {
    const hash = crypto.createHash('sha256');
    const sorted = [...items].sort((a, b) => a.rel.localeCompare(b.rel));
    for (const item of sorted) {
        hash.update(`item:${item.kind}:${item.rel}\0`);
        for (const file of filesUnder(path.join(root, item.rel))) {
            hash.update(`file:${path.relative(root, file).split(path.sep).join('/')}\0`);
            hash.update(fs.readFileSync(file));
            hash.update('\0');
        }
    }
    return hash.digest('hex');
}
