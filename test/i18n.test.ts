// AC-9: English and Korean output, language detection, identical message tables.
import { describe, expect, it } from 'vitest';
import { MESSAGES, detectLang, translate } from '../src/i18n.js';
import { makeFixture } from './helpers/fixture.js';

describe('message tables', () => {
  const enKeys = Object.keys(MESSAGES.en).sort();
  const koKeys = Object.keys(MESSAGES.ko).sort();

  it('en and ko have the same keys', () => {
    expect(koKeys).toEqual(enKeys);
  });

  it('every key uses the same {placeholders} in both languages and has text', () => {
    const holders = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();
    for (const key of enKeys) {
      const en = MESSAGES.en[key as keyof typeof MESSAGES.en];
      const ko = MESSAGES.ko[key as keyof typeof MESSAGES.ko];
      expect(en.trim(), key).not.toBe('');
      expect(ko.trim(), key).not.toBe('');
      expect(holders(ko), key).toEqual(holders(en));
    }
  });

  it('translate fills placeholders and leaves unknown ones visible', () => {
    expect(translate('en', 'version.text', { version: '1.2.3' })).toBe('plugslim 1.2.3');
    expect(translate('ko', 'ls.noPlugins', {})).toContain('{dir}');
  });
});

describe('language detection', () => {
  it('--lang wins over everything', () => {
    expect(detectLang({ PLUGSLIM_LANG: 'ko', LANG: 'ko_KR.UTF-8' }, 'en')).toBe('en');
    expect(detectLang({ LANG: 'en_US.UTF-8' }, 'ko')).toBe('ko');
  });

  it('PLUGSLIM_LANG=ko and LANG=ko_KR.UTF-8 are detected as Korean', () => {
    expect(detectLang({ PLUGSLIM_LANG: 'ko' })).toBe('ko');
    expect(detectLang({ LANG: 'ko_KR.UTF-8' })).toBe('ko');
    expect(detectLang({ LC_MESSAGES: 'ko_KR.eucKR' })).toBe('ko');
  });

  it('follows the order PLUGSLIM_LANG > LC_ALL > LC_MESSAGES > LANG', () => {
    expect(detectLang({ PLUGSLIM_LANG: 'en', LANG: 'ko_KR.UTF-8' })).toBe('en');
    expect(detectLang({ LC_ALL: 'en_US.UTF-8', LANG: 'ko_KR.UTF-8' })).toBe('en');
    expect(detectLang({ LC_ALL: '', LANG: 'ko_KR.UTF-8' })).toBe('ko');
    expect(detectLang({ LC_MESSAGES: 'ko_KR.UTF-8', LANG: 'en_US.UTF-8' })).toBe('ko');
  });

  it('anything else falls back to English', () => {
    expect(detectLang({})).toBe('en');
    expect(detectLang({ LANG: 'fr_FR.UTF-8' })).toBe('en');
    expect(detectLang({ LANG: 'C' })).toBe('en');
    expect(detectLang({ PLUGSLIM_LANG: 'kor' })).toBe('en');
    expect(detectLang({ LANG: 'korean_xx' })).toBe('en');
  });
});

describe('CLI output language', () => {
  it('--lang en / --lang ko print the help in each language', () => {
    const fx = makeFixture();
    const en = fx.raw(['--help', '--lang', 'en']);
    const ko = fx.raw(['--help', '--lang', 'ko']);
    expect(en.out).toContain('Usage:');
    expect(en.out).not.toContain('사용법');
    expect(ko.out).toContain('사용법:');
    expect(ko.out).not.toContain('Usage:');
    expect(fx.raw(['help', '--lang=ko']).out).toContain('사용법:');
  });

  it('--lang en / --lang ko print ls output in each language', () => {
    const fx = makeFixture();
    const en = fx.plug(['ls', '--lang', 'en']);
    const ko = fx.plug(['ls', '--lang', 'ko']);
    expect(en.out).toContain('PLUGIN');
    expect(en.out).toContain('Total (enabled)');
    expect(ko.out).toContain('플러그인');
    expect(ko.out).toContain('합계(켜진 것)');
    expect(ko.out).not.toContain('PLUGIN');
  });

  it('PLUGSLIM_LANG=ko and LANG=ko_KR.UTF-8 switch the output; others stay English', () => {
    const fx = makeFixture();
    expect(fx.plug(['ls'], { PLUGSLIM_LANG: 'ko' }).out).toContain('플러그인');
    expect(fx.plug(['ls'], { LANG: 'ko_KR.UTF-8' }).out).toContain('플러그인');
    expect(fx.plug(['ls'], { LANG: 'fr_FR.UTF-8' }).out).toContain('PLUGIN');
    expect(fx.plug(['ls', '--lang', 'en'], { PLUGSLIM_LANG: 'ko' }).out).toContain('PLUGIN');
  });

  it('error messages follow the language too', () => {
    const fx = makeFixture();
    const ko = fx.plug(['pick', 'nope@x', '--keep', 'a', '--lang', 'ko']);
    expect(ko.code).toBe(2);
    expect(ko.err).toContain('설치되어 있지 않습니다');
    const en = fx.plug(['pick', 'nope@x', '--keep', 'a', '--lang', 'en']);
    expect(en.err).toContain('is not installed');
  });

  it('doctor, sync and restore print Korean when asked', () => {
    const fx = makeFixture();
    fx.plug(['pick', 'gitkit@sample-market', '--keep', 'commit']);
    expect(fx.plug(['doctor', '--lang', 'ko', '--project-dir', fx.root]).out).toContain('문제가 없습니다');
    expect(fx.plug(['sync', '--lang', 'ko']).out).toContain('최신 상태');
    expect(fx.plug(['restore', 'gitkit@sample-market', '--lang', 'ko']).out).toContain('되돌렸습니다');
  });

  it('rejects an unsupported --lang, unknown options and unknown commands with exit 2', () => {
    const fx = makeFixture();
    const bad = fx.raw(['ls', '--lang', 'fr']);
    expect(bad.code).toBe(2);
    expect(bad.err).toContain('--lang');
    const opt = fx.raw(['ls', '--bogus'], { PLUGSLIM_LANG: 'ko' });
    expect(opt.code).toBe(2);
    expect(opt.err).toContain('인자가 올바르지 않습니다');
    const cmd = fx.raw(['frobnicate']);
    expect(cmd.code).toBe(2);
    expect(cmd.err).toContain('Unknown command "frobnicate"');
  });

  it('prints the version and help with no command', () => {
    const fx = makeFixture();
    expect(fx.raw(['--version']).out).toMatch(/^plugslim \d+\.\d+\.\d+/);
    expect(fx.raw([]).out).toContain('Usage:');
  });
});
