/** Write JSON atomically (temp file + rename), 2-space indent and a trailing newline. */
export declare function writeJsonAtomic(file: string, value: unknown): void;
/**
 * Read a text file the user owns (settings, installed_plugins.json). A read failure (permissions,
 * a folder in its place) is a UsageError that names the cause, not a "bad JSON" message.
 */
export declare function readTextOrThrow(file: string): string;
export declare function readJsonFile(file: string): unknown;
export declare function isPlainObject(value: unknown): value is Record<string, unknown>;
