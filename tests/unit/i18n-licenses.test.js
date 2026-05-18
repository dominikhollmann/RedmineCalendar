import { describe, it, expect } from 'vitest';
import en from '../../js/i18n/en.js';
import de from '../../js/i18n/de.js';

// Feature 034 / US1 — T008: assert the `licenses.*` chrome key set is
// identical in both locales. Catches regression if anyone removes / renames a
// key in only one file.

const requiredKeys = [
  'licenses.link',
  'licenses.title',
  'licenses.intro',
  'licenses.col.name',
  'licenses.col.version',
  'licenses.col.license',
  'licenses.col.homepage',
  'licenses.back',
  'licenses.copyright',
  'licenses.error',
];

describe('i18n parity — licenses.* keys (T008)', () => {
  for (const key of requiredKeys) {
    it(`en has "${key}"`, () => {
      expect(typeof en[key]).toBe('string');
      expect(en[key].length).toBeGreaterThan(0);
    });
    it(`de has "${key}"`, () => {
      expect(typeof de[key]).toBe('string');
      expect(de[key].length).toBeGreaterThan(0);
    });
  }

  it('en and de share the exact same licenses.* key set (no orphans)', () => {
    const enKeys = Object.keys(en)
      .filter((k) => k.startsWith('licenses.'))
      .sort();
    const deKeys = Object.keys(de)
      .filter((k) => k.startsWith('licenses.'))
      .sort();
    expect(enKeys).toEqual(deKeys);
  });

  it('en and de differ in at least one rendered string (translation actually translated)', () => {
    const enLink = en['licenses.link'];
    const deLink = de['licenses.link'];
    expect(enLink).not.toBe(deLink);
  });
});
