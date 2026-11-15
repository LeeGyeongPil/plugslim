// plugslim doctor: find settings or files that undo or break a pick.
import fs from 'node:fs';
import path from 'node:path';
import { checkPlugin } from '../check.js';
import { hashItems } from '../hash.js';
import { readInventory } from '../inventory.js';
import { scanPlugin } from '../plugin.js';
import { storePaths } from '../paths.js';
import { enabledMap, readSettings } from '../settings.js';
import { overlayList, readState } from '../state.js';
function label(version, hash) {
    return `${version ?? '-'}#${hash.slice(0, 7)}`;
}
export function doctorCommand(ctx, args) {
    const paths = storePaths(ctx.storeDir);
    const state = readState(paths.stateFile);
    const entries = overlayList(state);
    if (entries.length === 0) {
        ctx.io.out(ctx.t('doctor.noOverlays'));
        return 0;
    }
    const inventory = readInventory(ctx.configDir, ctx.storeDir, state);
    const projectDir = path.resolve(ctx.cwd, args.projectDir ?? '.');
    const projectFile = path.join(projectDir, '.claude', 'settings.json');
    const localFile = path.join(projectDir, '.claude', 'settings.local.json');
    const project = enabledMap(readSettings(projectFile));
    const local = enabledMap(readSettings(localFile));
    const findings = [];
    for (const entry of entries) {
        const base = { id: entry.origId, overlayId: entry.overlayId };
        if (project[entry.origId] === true)
            findings.push({ level: 'error', code: 'PROJECT_OVERRIDE', vars: { ...base, file: projectFile } });
        if (local[entry.origId] === true)
            findings.push({ level: 'error', code: 'LOCAL_OVERRIDE', vars: { ...base, file: localFile } });
        if (inventory.enabled[entry.origId] === true && inventory.enabled[entry.overlayId] === true) {
            findings.push({ level: 'error', code: 'DUPLICATE_NAME', vars: base });
        }
        const overlayDir = path.join(paths.pluginsDir, entry.entryName);
        if (!fs.existsSync(overlayDir)) {
            findings.push({ level: 'error', code: 'OVERLAY_MISSING', vars: { ...base, path: overlayDir } });
        }
        else {
            for (const problem of checkPlugin(overlayDir)) {
                findings.push({ level: 'error', code: problem.code, vars: { ...base, path: problem.path } });
            }
        }
        const original = inventory.plugins.find((p) => p.id === entry.origId && !p.overlay);
        if (!original || !fs.existsSync(original.installPath)) {
            findings.push({ level: 'warn', code: 'SOURCE_MISSING', vars: { ...base, path: original?.installPath ?? entry.srcPath } });
        }
        else {
            const scan = scanPlugin(original.installPath, original.name);
            const hash = hashItems(original.installPath, scan.items);
            const version = scan.version ?? original.version;
            if (hash !== entry.srcHash || version !== entry.srcVersion) {
                findings.push({
                    level: 'warn',
                    code: 'STALE_OVERLAY',
                    vars: { ...base, from: label(entry.srcVersion, entry.srcHash), to: label(version, hash) },
                });
            }
        }
    }
    const errors = findings.filter((f) => f.level === 'error').length;
    if (findings.length === 0) {
        ctx.io.out(ctx.t('doctor.ok'));
        return 0;
    }
    for (const finding of findings) {
        const tag = ctx.t(finding.level === 'error' ? 'doctor.error' : 'doctor.warn');
        ctx.io.out(`${tag} [${finding.code}] ${ctx.t(`doctor.${finding.code}`, finding.vars)}`);
    }
    ctx.io.out(ctx.t('doctor.summary', { errors, warnings: findings.length - errors }));
    return errors > 0 ? 1 : 0;
}
