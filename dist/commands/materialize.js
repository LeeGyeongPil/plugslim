// Shared by pick and sync: build the overlay in a scratch folder, self-check it, then swap it into the store.
import fs from 'node:fs';
import path from 'node:path';
import { checkPlugin } from '../check.js';
import { costPlugin } from '../cost.js';
import { UsageError } from '../errors.js';
import { buildOverlayTree, upsertMarketplaceEntry } from '../overlay.js';
import { scanPlugin } from '../plugin.js';
import { storePaths } from '../paths.js';
export function materializeOverlay(ctx, options) {
    const paths = storePaths(ctx.storeDir);
    const scratch = path.join(paths.buildDir, options.entryName);
    const target = path.join(paths.pluginsDir, options.entryName);
    const { removedEntries } = buildOverlayTree({
        srcRoot: options.srcRoot,
        destRoot: scratch,
        scan: options.scan,
        keep: options.keep,
        entryName: options.entryName,
    });
    // Self-check: manifest paths exist and every picked item survived the pruning.
    const built = scanPlugin(scratch, options.entryName);
    const problems = checkPlugin(scratch).map((p) => `${p.code} ${p.path}`);
    const present = new Set(built.items.map((item) => item.name));
    for (const name of options.keep)
        if (!present.has(name))
            problems.push(`MISSING_KEEP ${name}`);
    if (problems.length > 0) {
        fs.rmSync(paths.buildDir, { recursive: true, force: true });
        throw new UsageError('err.selfCheck', { id: options.origId, problems: problems.join(', ') });
    }
    fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.renameSync(scratch, target);
    fs.rmSync(paths.buildDir, { recursive: true, force: true });
    upsertMarketplaceEntry(paths.marketplaceFile, options.marketplace, options.entryName, `plugslim overlay of ${options.origId}`);
    const afterTokens = costPlugin(scanPlugin(target, options.entryName), options.maxDescChars).tokens;
    return { afterTokens, removedEntries, overlayRoot: target };
}
