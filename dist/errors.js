import { translate } from './i18n.js';
/** An input or usage problem. The CLI prints it in the chosen language and exits with code 2. */
export class UsageError extends Error {
    key;
    vars;
    constructor(key, vars = {}) {
        super(translate('en', key, vars));
        this.name = 'UsageError';
        this.key = key;
        this.vars = vars;
    }
}
