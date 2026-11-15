import { translate } from './i18n.js';
export function makeT(lang) {
    return (key, vars) => translate(lang, key, vars);
}
