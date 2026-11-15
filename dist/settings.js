// Safe settings.json handling: strict read, backup, minimal edit that keeps key order, atomic write.
import fs from 'node:fs';
import path from 'node:path';
import { UsageError } from './errors.js';
import { isPlainObject, readTextOrThrow, writeJsonAtomic } from './fsutil.js';
/**
 * Read a settings file as strict JSON. A missing file is an empty object.
 * A file that cannot be read (permissions, a folder in its place) and a file that is not valid JSON
 * are different UsageErrors (exit 2), so the message points at the real cause.
 */
export function readSettings(file) {
    if (!fs.existsSync(file))
        return { path: file, exists: false, data: {} };
    const text = readTextOrThrow(file);
    let value;
    try {
        value = JSON.parse(text);
    }
    catch (error) {
        throw new UsageError('err.settingsInvalid', { file, detail: error instanceof Error ? error.message : String(error) });
    }
    if (!isPlainObject(value))
        throw new UsageError('err.settingsInvalid', { file, detail: 'top level is not an object' });
    return { path: file, exists: true, data: value };
}
/** enabledPlugins of a settings object as a plain map (non-boolean values are ignored). */
export function enabledMap(file) {
    const raw = file.data.enabledPlugins;
    if (raw === undefined)
        return {};
    if (!isPlainObject(raw))
        throw new UsageError('err.settingsShape', { file: file.path, key: 'enabledPlugins' });
    const out = {};
    for (const [key, value] of Object.entries(raw))
        if (typeof value === 'boolean')
            out[key] = value;
    return out;
}
function section(data, key, file) {
    const existing = data[key];
    if (existing === undefined) {
        const created = {};
        data[key] = created; // appended at the end, so existing keys keep their order
        return created;
    }
    if (!isPlainObject(existing))
        throw new UsageError('err.settingsShape', { file, key });
    return existing;
}
/** Return a copy of the settings with the original off, the overlay on and the overlay marketplace declared. */
export function applyPick(file, edit) {
    const next = structuredClone(file.data);
    const plugins = section(next, 'enabledPlugins', file.path);
    plugins[edit.origId] = false;
    plugins[edit.overlayId] = true;
    const markets = section(next, 'extraKnownMarketplaces', file.path);
    markets[edit.marketplace] = { source: { source: 'directory', path: edit.marketplacePath } };
    return next;
}
/** Undo exactly the keys applyPick set; unrelated keys (even ones added later) are left alone. */
export function applyRestore(file, edit) {
    const next = structuredClone(file.data);
    const { entry } = edit;
    if (next.enabledPlugins !== undefined) {
        if (!isPlainObject(next.enabledPlugins))
            throw new UsageError('err.settingsShape', { file: file.path, key: 'enabledPlugins' });
        const plugins = next.enabledPlugins;
        const put = (id, value) => {
            if (value === null)
                delete plugins[id];
            else
                plugins[id] = value;
        };
        put(entry.origId, entry.prev.origEnabled);
        put(entry.overlayId, entry.prev.overlayEnabled);
        if (edit.removeEmptyEnabled && Object.keys(plugins).length === 0)
            delete next.enabledPlugins;
    }
    if (edit.marketplacePrev !== null && next.extraKnownMarketplaces !== undefined) {
        if (!isPlainObject(next.extraKnownMarketplaces)) {
            throw new UsageError('err.settingsShape', { file: file.path, key: 'extraKnownMarketplaces' });
        }
        const markets = next.extraKnownMarketplaces;
        if (edit.marketplacePrev.existed)
            markets[edit.marketplace] = edit.marketplacePrev.value;
        else
            delete markets[edit.marketplace];
        if (!edit.marketplacePrev.containerExisted && Object.keys(markets).length === 0)
            delete next.extraKnownMarketplaces;
    }
    return next;
}
const DIFF_SECTIONS = ['enabledPlugins', 'extraKnownMarketplaces'];
/** Human-readable diff of the two sections plugslim edits. Lines start with "-" (old) or "+" (new). */
export function diffSettings(before, after) {
    const lines = [];
    for (const key of DIFF_SECTIONS) {
        const b = isPlainObject(before[key]) ? before[key] : {};
        const a = isPlainObject(after[key]) ? after[key] : {};
        const sectionLines = [];
        const keys = [...Object.keys(b), ...Object.keys(a).filter((k) => !(k in b))];
        for (const k of keys) {
            const hasB = k in b;
            const hasA = k in a;
            if (hasB && hasA && JSON.stringify(b[k]) === JSON.stringify(a[k]))
                continue;
            if (hasB)
                sectionLines.push(`-   ${JSON.stringify(k)}: ${JSON.stringify(b[k])}`);
            if (hasA)
                sectionLines.push(`+   ${JSON.stringify(k)}: ${JSON.stringify(a[k])}`);
        }
        if (sectionLines.length > 0)
            lines.push(`    ${key}:`, ...sectionLines);
    }
    return lines;
}
/** Copy the current settings file into the backups folder. Returns the backup path, or null when there was no file. */
export function backupSettings(file, backupsDir, now) {
    if (!file.exists)
        return null;
    fs.mkdirSync(backupsDir, { recursive: true });
    const stamp = now.toISOString().replace(/[:.]/g, '-');
    let target = path.join(backupsDir, `${stamp}-user-settings.json`);
    for (let n = 1; fs.existsSync(target); n += 1)
        target = path.join(backupsDir, `${stamp}-${n}-user-settings.json`);
    fs.copyFileSync(file.path, target);
    return target;
}
export function writeSettings(file, data) {
    writeJsonAtomic(file, data);
}
