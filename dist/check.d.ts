export interface Problem {
    code: 'BROKEN_PATH' | 'BAD_PATH';
    path: string;
}
export declare function checkPlugin(root: string): Problem[];
