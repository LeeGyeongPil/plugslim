// Language selection and message lookup.
import { en, type MessageKey } from './messages/en.js';
import { ko } from './messages/ko.js';

export type Lang = 'en' | 'ko';
export type Vars = Record<string, string | number>;

export const MESSAGES: Record<Lang, Record<MessageKey, string>> = { en, ko };

function isKorean(value: string | undefined): boolean {
  return typeof value === 'string' && /^ko(?:[_.@-]|$)/i.test(value.trim());
}

/**
 * Pick the output language.
 * Order: --lang option > PLUGSLIM_LANG > LC_ALL > LC_MESSAGES > LANG. Anything that is not Korean is English.
 * The first variable that is set and non-empty decides (like POSIX locale precedence).
 */
export function detectLang(env: NodeJS.ProcessEnv, option?: Lang): Lang {
  if (option) return option;
  for (const key of ['PLUGSLIM_LANG', 'LC_ALL', 'LC_MESSAGES', 'LANG']) {
    const value = env[key];
    if (value !== undefined && value.trim() !== '') return isKorean(value) ? 'ko' : 'en';
  }
  return 'en';
}

export function isLang(value: string): value is Lang {
  return value === 'en' || value === 'ko';
}

export function translate(lang: Lang, key: MessageKey, vars: Vars = {}): string {
  const template = MESSAGES[lang][key] ?? MESSAGES.en[key];
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

export type { MessageKey };
