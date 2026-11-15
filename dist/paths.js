import os from 'node:os';
import path from 'node:path';
function nonEmpty(value) {
    return value !== undefined && value.trim() !== '' ? value : undefined;
}
export function homeDir(env) {
    return nonEmpty(env.HOME) ?? os.homedir();
}
function expand(value, env) {
    if (value === '~')
        return homeDir(env);
    if (value.startsWith('~/'))
        return path.join(homeDir(env), value.slice(2));
    return value;
}
/** Claude Code config dir: --config-dir > CLAUDE_CONFIG_DIR > ~/.claude. Always absolute. */
export function resolveConfigDir(option, env, cwd) {
    const value = nonEmpty(option) ?? nonEmpty(env.CLAUDE_CONFIG_DIR) ?? path.join(homeDir(env), '.claude');
    return path.resolve(cwd, expand(value, env));
}
/** plugslim store dir: --store-dir > PLUGSLIM_HOME > ~/.plugslim. Always absolute. */
export function resolveStoreDir(option, env, cwd) {
    const value = nonEmpty(option) ?? nonEmpty(env.PLUGSLIM_HOME) ?? path.join(homeDir(env), '.plugslim');
    return path.resolve(cwd, expand(value, env));
}
/** True when `candidate` is `root` itself or lies inside it (after resolving `..`). */
export function isInside(root, candidate) {
    const rel = path.relative(root, candidate);
    return rel === '' || (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel));
}
export function storePaths(store) {
    const marketplaceDir = path.join(store, 'marketplace');
    return {
        store,
        marketplaceDir,
        marketplaceFile: path.join(marketplaceDir, '.claude-plugin', 'marketplace.json'),
        pluginsDir: path.join(marketplaceDir, 'plugins'),
        stateFile: path.join(store, 'state.json'),
        backupsDir: path.join(store, 'backups'),
        buildDir: path.join(store, '.build'),
    };
}
