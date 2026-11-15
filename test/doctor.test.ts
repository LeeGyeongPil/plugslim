// AC-8: doctor finds settings and files that undo or break a pick.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { makeFixture, upgradeToV110, type Fixture } from './helpers/fixture.js';

const ID = 'gitkit@sample-market';

function projectWith(fx: Fixture, file: string, enabled: Record<string, boolean>): string {
  const project = path.join(fx.root, 'project');
  fs.mkdirSync(path.join(project, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(project, '.claude', file), JSON.stringify({ enabledPlugins: enabled }));
  return project;
}

describe('doctor', () => {
  it('exits 0 on a healthy state', () => {
    const fx = makeFixture();
    fx.plug(['pick', ID, '--keep', 'commit,status']);
    const r = fx.plug(['doctor', '--project-dir', fx.root]);
    expect(r.code).toBe(0);
    expect(r.out).toContain('No problems found');
  });

  it('exits 0 when no overlay exists', () => {
    const fx = makeFixture();
    const r = fx.plug(['doctor']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('No overlays registered');
  });

  it('detects PROJECT_OVERRIDE', () => {
    const fx = makeFixture();
    fx.plug(['pick', ID, '--keep', 'commit']);
    const project = projectWith(fx, 'settings.json', { [ID]: true });
    const r = fx.plug(['doctor', '--project-dir', project]);
    expect(r.code).toBe(1);
    expect(r.out).toContain('PROJECT_OVERRIDE');
    expect(r.out).toContain('settings.local.json');
  });

  it('detects LOCAL_OVERRIDE', () => {
    const fx = makeFixture();
    fx.plug(['pick', ID, '--keep', 'commit']);
    const project = projectWith(fx, 'settings.local.json', { [ID]: true });
    const r = fx.plug(['doctor', '--project-dir', project]);
    expect(r.code).toBe(1);
    expect(r.out).toContain('LOCAL_OVERRIDE');
  });

  it('detects DUPLICATE_NAME when original and overlay are both enabled', () => {
    const fx = makeFixture();
    fx.plug(['pick', ID, '--keep', 'commit']);
    const settings = fx.readSettings();
    settings.enabledPlugins = { [ID]: true, 'gitkit@plugslim': true };
    fx.writeSettings(settings);
    const r = fx.plug(['doctor', '--project-dir', fx.root]);
    expect(r.code).toBe(1);
    expect(r.out).toContain('DUPLICATE_NAME');
  });

  it('detects BROKEN_PATH when an overlay manifest path is missing', () => {
    const fx = makeFixture();
    fx.plug(['pick', ID, '--keep', 'commit,changelog']);
    fs.rmSync(path.join(fx.store, 'marketplace', 'plugins', 'gitkit', 'extra-skills'), { recursive: true });
    const r = fx.plug(['doctor', '--project-dir', fx.root]);
    expect(r.code).toBe(1);
    expect(r.out).toContain('BROKEN_PATH');
    expect(r.out).toContain('./extra-skills/');
  });

  it('detects a missing overlay folder', () => {
    const fx = makeFixture();
    fx.plug(['pick', ID, '--keep', 'commit']);
    fs.rmSync(path.join(fx.store, 'marketplace', 'plugins', 'gitkit'), { recursive: true });
    const r = fx.plug(['doctor', '--project-dir', fx.root]);
    expect(r.code).toBe(1);
    expect(r.out).toContain('OVERLAY_MISSING');
  });

  it('warns (exit 0) about a STALE_OVERLAY and a missing source', () => {
    const fx = makeFixture();
    fx.plug(['pick', ID, '--keep', 'commit']);
    upgradeToV110(fx);
    const stale = fx.plug(['doctor', '--project-dir', fx.root]);
    expect(stale.code).toBe(0);
    expect(stale.out).toContain('STALE_OVERLAY');
    expect(stale.out).toContain('1.0.0');
    expect(stale.out).toContain('1.1.0');
    fs.rmSync(path.join(fx.config, 'plugins', 'cache'), { recursive: true });
    const gone = fx.plug(['doctor', '--project-dir', fx.root]);
    expect(gone.code).toBe(0);
    expect(gone.out).toContain('SOURCE_MISSING');
  });
});
