import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ARENAS } from '../../src/config/arenas';
import { CAMPAIGN } from '../../src/config/campaign';
import { CHASSIS } from '../../src/config/chassis';
import { PARTS } from '../../src/config/upgrades';
import { dictionaries, flattenKeys, hasKey, setLang, t } from '../../src/i18n';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(p) ? [p] : [];
  });
}

describe('i18n', () => {
  it('Norwegian and English have exactly the same keys', () => {
    const no = flattenKeys(dictionaries.no).sort();
    const en = flattenKeys(dictionaries.en).sort();
    expect(no).toEqual(en);
    expect(no.length).toBeGreaterThan(300);
  });

  it('every static key used in the code exists', () => {
    const missing: string[] = [];
    for (const f of files('src')) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g))
        if (!hasKey(m[1]!, 'en')) missing.push(`${f}: ${m[1]}`);
    }
    expect(missing).toEqual([]);
  });

  it('all content name/description keys exist', () => {
    const keys = [
      ...PARTS.flatMap((p) => [p.nameKey, p.descKey]),
      ...Object.values(CHASSIS).map((c) => c.nameKey),
      ...Object.values(ARENAS).flatMap((a) => [a.nameKey, a.descKey, ...a.houseRobots.map((h) => h.nameKey)]),
      ...CAMPAIGN.flatMap((l) => [l.nameKey, l.introKey, l.outroKey].filter((k): k is string => !!k)),
    ];
    for (const k of keys) {
      expect(hasKey(k, 'no'), k).toBe(true);
      expect(hasKey(k, 'en'), k).toBe(true);
    }
  });

  it('interpolates parameters and falls back to the key', () => {
    setLang('en');
    expect(t('menu.record', { wins: 3, matches: 5 })).toBe('3 wins in 5 matches');
    setLang('no');
    expect(t('menu.record', { wins: 3, matches: 5 })).toBe('3 seire på 5 kamper');
    expect(t('does.not.exist')).toBe('does.not.exist');
  });
});
