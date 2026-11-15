import { type MessageKey } from './messages/en.js';
export type Lang = 'en' | 'ko';
export type Vars = Record<string, string | number>;
export declare const MESSAGES: Record<Lang, Record<MessageKey, string>>;
/**
 * Pick the output language.
 * Order: --lang option > PLUGSLIM_LANG > LC_ALL > LC_MESSAGES > LANG. Anything that is not Korean is English.
 * The first variable that is set and non-empty decides (like POSIX locale precedence).
 */
export declare function detectLang(env: NodeJS.ProcessEnv, option?: Lang): Lang;
export declare function isLang(value: string): value is Lang;
export declare function translate(lang: Lang, key: MessageKey, vars?: Vars): string;
export type { MessageKey };
