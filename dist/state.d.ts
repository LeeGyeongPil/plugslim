export declare const DEFAULT_MARKETPLACE = "plugslim";
/** What the user's settings looked like for our keys before the first pick (used by restore). */
export interface PrevSettings {
    origEnabled: boolean | null;
    overlayEnabled: boolean | null;
    enabledPluginsExisted: boolean;
}
export interface OverlayEntry {
    origId: string;
    overlayId: string;
    /** Plugin name = overlay folder name = marketplace entry name. */
    entryName: string;
    keep: string[];
    /** Every skill/command name seen in the original when the overlay was last built. */
    known: string[];
    srcVersion: string | null;
    srcHash: string;
    srcPath: string;
    backup: string | null;
    prev: PrevSettings;
    createdAt: string;
}
export interface MarketplacePrev {
    existed: boolean;
    value?: unknown;
    containerExisted: boolean;
}
export interface State {
    version: 1;
    marketplace: string;
    marketplacePrev: MarketplacePrev | null;
    /** True when the first pick had to create the enabledPlugins object (restore removes it again if empty). */
    enabledPluginsCreated?: boolean;
    overlays: Record<string, OverlayEntry>;
}
export declare function emptyState(marketplace?: string): State;
export declare function readState(file: string): State;
export declare function writeState(file: string, state: State): void;
export declare function overlayList(state: State): OverlayEntry[];
/** Find an overlay by original id or overlay id. */
export declare function findOverlay(state: State, id: string): OverlayEntry | undefined;
