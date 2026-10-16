import { describe, expect, it } from 'vitest';
import ar from './locales/ar';
import en from './locales/en';
import type { TranslationTree } from './types';

const PLURAL = /_(zero|one|two|few|many|other)$/;
function keys(tree: TranslationTree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([k, v]) => (typeof v === 'string' ? [`${prefix}${k}`.replace(PLURAL, '')] : keys(v, `${prefix}${k}.`)));
}

describe('translations', () => {
  it('Arabic and English dictionaries define the same keys', () => {
    const a = new Set(keys(ar));
    const e = new Set(keys(en as unknown as TranslationTree));
    expect([...e].filter((k) => !a.has(k))).toEqual([]);
    expect([...a].filter((k) => !e.has(k))).toEqual([]);
  });

  it('keeps the same interpolation variables in both languages', () => {
    const vars = (tree: TranslationTree, out = new Map<string, string>(), prefix = '') => {
      for (const [k, v] of Object.entries(tree)) {
        if (typeof v === 'string') {
          const key = `${prefix}${k}`.replace(PLURAL, '');
          const found = (v.match(/{{\s*(\w+)\s*}}/g) ?? []).map((m) => m.replace(/[{}\s]/g, '')).filter((n) => n !== 'count').sort().join(',');
          if (!out.has(key) || found) out.set(key, found);
        } else vars(v, out, `${prefix}${k}.`);
      }
      return out;
    };
    const a = vars(ar);
    const e = vars(en as unknown as TranslationTree);
    for (const [k, v] of e) expect({ k, v: a.get(k) }).toEqual({ k, v });
  });
});
