import fs from 'node:fs';
import path from 'node:path';
import { UsageError } from './errors.js';
/** Write JSON atomically (temp file + rename), 2-space indent and a trailing newline. */
export function writeJsonAtomic(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    try {
        fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
        fs.renameSync(tmp, file);
    }
    finally {
        fs.rmSync(tmp, { force: true });
    }
}
/**
 * Read a text file the user owns (settings, installed_plugins.json). A read failure (permissions,
 * a folder in its place) is a UsageError that names the cause, not a "bad JSON" message.
 */
export function readTextOrThrow(file) {
    try {
        return fs.readFileSync(file, 'utf8');
    }
    catch (error) {
        const code = error.code;
        throw new UsageError('err.fileUnreadable', { file, detail: code ?? (error instanceof Error ? error.message : String(error)) });
    }
}
export function readJsonFile(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}
export function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
