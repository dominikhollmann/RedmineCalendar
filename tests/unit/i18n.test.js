import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
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

describe('validation error keys exist', () => {
  it('has comment_placeholder key', () => {
    expect(t('modal.comment_placeholder')).not.toBe('modal.comment_placeholder');
  });

  it('has chatbot tool keys', () => {
    expect(t('chatbot.no_entries_found')).not.toBe('chatbot.no_entries_found');
    expect(t('chatbot.multiple_matches')).not.toBe('chatbot.multiple_matches');
    expect(t('chatbot.retry_btn')).not.toBe('chatbot.retry_btn');
  });

  it('has version label', () => {
    expect(t('version.label')).toBe('Version');
  });
});

describe('feature 025 — break-ticket booking keys exist', () => {
  const keys = [
    'modal.duration_break',
    'chatbot.break_routing_disabled',
    'outlook.meeting_with_ticket_subject',
    'outlook.holiday_proposal_subject',
    'outlook.break_section_header',
    'outlook.break_proposal',
    'outlook.bookable_header',
    'outlook.needs_input_header',
  ];
  for (const key of keys) {
    it(`has ${key}`, () => {
      const v = t(key);
      expect(v).not.toBe(key);
      expect(v.length).toBeGreaterThan(0);
    });
  }
});

describe('formatDate()', () => {
  it('formats YYYY-MM-DD as-is for en locale', () => {
    expect(formatDate('2026-04-18')).toBe('2026-04-18');
  });

  it('returns input on invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });

  it('returns input via catch when input is not a string (split throws)', () => {
    expect(formatDate(null)).toBe(null);
    expect(formatDate(undefined)).toBe(undefined);
  });
});

// The module-level `locale` const is bound at import time from navigator.languages.
// To exercise the `de` branch in formatDate, reset modules + override navigator + re-import.
// Wrapped in beforeAll/afterAll so the pollution stays scoped to this describe block.
describe('formatDate() — de locale (via module re-import)', () => {
  let formatDateDe;
  const originalNavigator = globalThis.navigator;

  beforeAll(async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { languages: ['de-DE', 'en'], language: 'de-DE' },
      configurable: true,
      writable: true,
    });
    vi.resetModules();
    const mod = await import('../../js/i18n.js');
    formatDateDe = mod.formatDate;
    expect(mod.locale).toBe('de');
  });

  afterAll(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
    vi.resetModules();
  });

  it('formats YYYY-MM-DD as DD.MM.YYYY for de locale', () => {
    expect(formatDateDe('2026-04-18')).toBe('18.04.2026');
  });

  it('still returns input via catch on invalid input under de locale', () => {
    expect(formatDateDe(null)).toBe(null);
  });

  // Feature 033 / US4: i18n.js sets document.documentElement.lang at import.
  it('sets <html lang> to the detected locale at import (de)', async () => {
    expect(document.documentElement.lang).toBe('de');
  });
});

// ── Locale detection fallback chain ──────────────────────────────────────────
describe('i18n: locale detection fallback chain', () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
    vi.resetModules();
  });

  it('uses navigator.language when navigator.languages is empty (??-chain right side)', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { languages: [], language: 'de-DE' },
      configurable: true,
      writable: true,
    });
    vi.resetModules();
    const mod = await import('../../js/i18n.js');
    expect(mod.locale).toBe('de');
  });

  it('falls back to "en" when both navigator.languages[0] and navigator.language are absent', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { languages: undefined, language: undefined },
      configurable: true,
      writable: true,
    });
    vi.resetModules();
    const mod = await import('../../js/i18n.js');
    expect(mod.locale).toBe('en');
  });
});

describe('i18n: <html lang> sync (feature 033 / US4)', () => {
  it('sets <html lang> on import — en path', async () => {
    const originalNav = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      value: { languages: ['en-US', 'en'], language: 'en-US' },
      configurable: true,
      writable: true,
    });
    document.documentElement.lang = '';
    vi.resetModules();
    const mod = await import('../../js/i18n.js');
    expect(mod.locale).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNav,
      configurable: true,
      writable: true,
    });
    vi.resetModules();
  });
});
