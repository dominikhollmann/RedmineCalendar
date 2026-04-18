import { describe, it, expect } from 'vitest';
import { t, formatDate } from '../../js/i18n.js';

describe('t() translation', () => {
  it('returns English translation for known key', () => {
    expect(t('modal.save_btn')).toBe('Save');
  });

  it('substitutes {{placeholder}} variables', () => {
    const result = t('error.unexpected', { status: '500' });
    expect(result).toContain('500');
  });

  it('returns key itself for unknown keys', () => {
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('preserves unreplaced placeholders', () => {
    const result = t('error.unexpected');
    expect(result).toContain('{{status}}');
  });
});

describe('formatDate()', () => {
  it('formats YYYY-MM-DD as-is for en locale', () => {
    expect(formatDate('2026-04-18')).toBe('2026-04-18');
  });

  it('returns input on invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});
