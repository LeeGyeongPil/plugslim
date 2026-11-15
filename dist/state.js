// plugslim's own bookkeeping, kept in <store>/state.json.
import fs from 'node:fs';
import { UsageError } from './errors.js';
import { isPlainObject, readJsonFile, writeJsonAtomic } from './fsutil.js';
export const DEFAULT_MARKETPLACE = 'plugslim';
export function emptyState(marketplace = DEFAULT_MARKETPLACE) {
    return { version: 1, marketplace, marketplacePrev: null, overlays: {} };
}
export function readState(file) {
    if (!fs.existsSync(file))
        return emptyState();
    try {
        const value = readJsonFile(file);
        if (!isPlainObject(value) || !isPlainObject(value.overlays) || typeof value.marketplace !== 'string') {
            throw new Error('unexpected structure');
        }
        return value;
    }
    catch (error) {
        throw new UsageError('err.stateInvalid', { file, detail: error instanceof Error ? error.message : String(error) });
    }
}
export function writeState(file, state) {
    writeJsonAtomic(file, state);
}
export function overlayList(state) {
    return Object.values(state.overlays);
}
/** Find an overlay by original id or overlay id. */
export function findOverlay(state, id) {
    return state.overlays[id] ?? overlayList(state).find((entry) => entry.overlayId === id);
}
