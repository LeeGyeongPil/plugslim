import { type SettingsFile } from './settings.js';
import { type State } from './state.js';
export interface InstalledPlugin {
    id: string;
    name: string;
    marketplace: string;
    installPath: string;
    version: string | null;
    scope: string | null;
    /** True for copies made by plugslim (they are not in installed_plugins.json). */
    overlay: boolean;
}
export interface Inventory {
    configDir: string;
    settings: SettingsFile;
    enabled: Record<string, boolean>;
    plugins: InstalledPlugin[];
}
export declare function splitId(id: string): {
    name: string;
    marketplace: string;
};
/** Parse installed_plugins.json. Accepts {"plugins": {id: [records]}} and an array of records. */
export declare function readInstalled(configDir: string): InstalledPlugin[];
/** Installed plugins plus the overlays plugslim has built, with the user-scope enabled flags. */
export declare function readInventory(configDir: string, storeDir: string, state: State): Inventory;
/** Resolve a user-typed id: the exact id, or a plugin name that matches exactly one plugin. */
export declare function resolvePlugin(plugins: InstalledPlugin[], query: string): InstalledPlugin;
