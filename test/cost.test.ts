// AC-2: frontmatter parsing and the listing-cost formula.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONTEXT_WINDOW,
  budgetTokens,
  costItem,
  costSettingsFrom,
  estimateTokens,
  listingLine,
  percentOf,
} from '../src/cost.js';
import { parseFrontmatter } from '../src/frontmatter.js';
import type { PluginItem } from '../src/plugin.js';
import { makeFixture } from './helpers/fixture.js';

function item(partial: Partial<PluginItem>): PluginItem {
  return { name: 's', kind: 'skill', rel: 'skills/s', description: '', whenToUse: '', modelInvocable: true, ...partial };
}

describe('frontmatter', () => {
  it('reads a folded (>) description as one line', () => {
    const fm = parseFrontmatter('---\nname: x\ndescription: >\n  Draft a changelog\n  from commits.\n---\nBody\n');
    expect(fm.data.description).toBe('Draft a changelog from commits.\n');
    expect(fm.error).toBeUndefined();
  });

  it('reads a quoted value that contains "a: b"', () => {
    const fm = parseFrontmatter('---\nname: x\ndescription: "Use when: the user says go"\n---\n');
    expect(fm.data.description).toBe('Use when: the user says go');
  });

  it('returns empty data without frontmatter and reports broken YAML', () => {
    expect(parseFrontmatter('# just markdown\n').data).toEqual({});
    const broken = parseFrontmatter('---\nname: [unclosed\n---\n');
    expect(broken.data).toEqual({});
    expect(broken.error).toBeTruthy();
  });

  it('handles an empty block and CRLF line endings', () => {
    expect(parseFrontmatter('---\n---\nbody').data).toEqual({});
    expect(parseFrontmatter('---\r\nname: a\r\n---\r\nbody').data).toEqual({ name: 'a' });
  });
});

describe('listing cost', () => {
  it('builds "- plugin:name: description when_to_use"', () => {
    const line = listingLine('gitkit', item({ name: 'changelog', description: 'Draft.', whenToUse: 'When releasing.' }), 1536);
    expect(line).toBe('- gitkit:changelog: Draft. When releasing.');
    expect(listingLine('p', item({ name: 'n' }), 1536)).toBe('- p:n');
  });

  it('estimates tokens as ceil(chars / 4)', () => {
    expect(estimateTokens(114)).toBe(29);
    expect(estimateTokens(116)).toBe(29);
    expect(estimateTokens(4)).toBe(1);
    expect(estimateTokens(0)).toBe(0);
  });

  it('caps the description text at 1536 characters by default', () => {
    const long = item({ description: 'a'.repeat(2000) });
    const cost = costItem('p', long, costSettingsFrom({}).maxDescChars);
    expect(cost.chars).toBe('- p:s: '.length + 1536);
  });

  it('honours skillListingMaxDescChars from settings', () => {
    const settings = costSettingsFrom({ skillListingMaxDescChars: 100 });
    expect(settings.maxDescChars).toBe(100);
    expect(costItem('p', item({ description: 'a'.repeat(2000) }), settings.maxDescChars).chars).toBe('- p:s: '.length + 100);
  });

  it('budget = fraction x context window (default 0.01 x 200000 = 2000)', () => {
    const defaults = costSettingsFrom({});
    expect(defaults.contextWindow).toBe(DEFAULT_CONTEXT_WINDOW);
    expect(budgetTokens(defaults)).toBe(2000);
    expect(budgetTokens(costSettingsFrom({ skillListingBudgetFraction: 0.02 }, 100000))).toBe(2000);
    expect(budgetTokens(costSettingsFrom({}, 1000000))).toBe(10000);
    expect(percentOf(123, 2000)).toBe(6.2);
  });

  it('ignores invalid settings values', () => {
    const settings = costSettingsFrom({ skillListingMaxDescChars: -5, skillListingBudgetFraction: 'big' });
    expect(settings.maxDescChars).toBe(1536);
    expect(settings.budgetFraction).toBe(0.01);
  });

  it('a non-invocable item costs 0', () => {
    expect(costItem('p', item({ description: 'x', modelInvocable: false }), 1536)).toMatchObject({ chars: 0, tokens: 0 });
  });
});

describe('ls reads the real files', () => {
  it('parses folded and quoted descriptions in a plugin on disk and applies settings caps', () => {
    const fx = makeFixture();
    const dir = path.join(fx.root, 'plug');
    fs.mkdirSync(path.join(dir, 'skills', 'folded'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'skills', 'quoted'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'skills', 'long'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'skills', 'folded', 'SKILL.md'), '---\nname: folded\ndescription: >\n  one\n  two\nwhen_to_use: later\n---\n');
    fs.writeFileSync(path.join(dir, 'skills', 'quoted', 'SKILL.md'), '---\nname: quoted\ndescription: "a: b"\n---\n');
    fs.writeFileSync(path.join(dir, 'skills', 'long', 'SKILL.md'), `---\nname: long\ndescription: ${'z'.repeat(3000)}\n---\n`);
    const read = (): Array<{ name: string; chars: number }> =>
      (JSON.parse(fx.plug(['ls', '--path', dir, '--json']).out) as { plugins: Array<{ items: Array<{ name: string; chars: number }> }> })
        .plugins[0]!.items;
    const by = (items: Array<{ name: string; chars: number }>, name: string): number => items.find((i) => i.name === name)!.chars;
    const items = read();
    expect(by(items, 'folded')).toBe('- plug:folded: one two later'.length);
    expect(by(items, 'quoted')).toBe('- plug:quoted: a: b'.length);
    expect(by(items, 'long')).toBe('- plug:long: '.length + 1536);
    fx.writeSettings({ skillListingMaxDescChars: 200 });
    expect(by(read(), 'long')).toBe('- plug:long: '.length + 200);
  });

  it('--context-window changes the budget shown', () => {
    const fx = makeFixture();
    const data = JSON.parse(fx.plug(['ls', '--json', '--context-window', '1000000']).out) as { budgetTokens: number };
    expect(data.budgetTokens).toBe(10000);
  });
});
