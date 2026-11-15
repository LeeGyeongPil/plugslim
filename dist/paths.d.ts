export declare function homeDir(env: NodeJS.ProcessEnv): string;
/** Claude Code config dir: --config-dir > CLAUDE_CONFIG_DIR > ~/.claude. Always absolute. */
export declare function resolveConfigDir(option: string | undefined, env: NodeJS.ProcessEnv, cwd: string): string;
/** plugslim store dir: --store-dir > PLUGSLIM_HOME > ~/.plugslim. Always absolute. */
export declare function resolveStoreDir(option: string | undefined, env: NodeJS.ProcessEnv, cwd: string): string;
/** True when `candidate` is `root` itself or lies inside it (after resolving `..`). */
export declare function isInside(root: string, candidate: string): boolean;
export interface StorePaths {
    store: string;
    marketplaceDir: string;
    marketplaceFile: string;
    pluginsDir: string;
    stateFile: string;
    backupsDir: string;
    buildDir: string;
}
export declare function storePaths(store: string): StorePaths;
