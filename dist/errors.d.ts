import { type Vars } from './i18n.js';
import type { MessageKey } from './messages/en.js';
/** An input or usage problem. The CLI prints it in the chosen language and exits with code 2. */
export declare class UsageError extends Error {
    readonly key: MessageKey;
    readonly vars: Vars;
    constructor(key: MessageKey, vars?: Vars);
}
