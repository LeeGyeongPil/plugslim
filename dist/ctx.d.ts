import { type Lang, type Vars } from './i18n.js';
import type { MessageKey } from './messages/en.js';
/** Where output goes. Each call is one chunk of text WITHOUT a trailing newline. */
export interface IO {
    out: (text: string) => void;
    err: (text: string) => void;
}
export interface Args {
    positionals: string[];
    json: boolean;
    path?: string;
    contextWindow?: number;
    maxTokens?: number;
    keep?: string;
    drop?: string;
    dryRun: boolean;
    yes: boolean;
    includeNew: boolean;
    check: boolean;
    quiet: boolean;
    all: boolean;
    projectDir?: string;
    marketplaceName?: string;
}
export interface Ctx {
    env: NodeJS.ProcessEnv;
    cwd: string;
    lang: Lang;
    io: IO;
    configDir: string;
    storeDir: string;
    now: () => Date;
    t: (key: MessageKey, vars?: Vars) => string;
}
export declare function makeT(lang: Lang): Ctx['t'];
