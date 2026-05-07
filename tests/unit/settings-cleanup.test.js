import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../js/i18n.js', () => ({
  t: vi.fn((key) => key),
  locale: 'en',
}));

import { cleanupLegacyKeys } from '../../js/settings.js';
import { STORAGE_KEY_HOLIDAY_TICKET } from '../../js/config.js';

describe('settings.cleanupLegacyKeys (FR-007)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes the legacy holiday-ticket key on app init', () => {
    localStorage.setItem(STORAGE_KEY_HOLIDAY_TICKET, '12345');
    cleanupLegacyKeys();
    expect(localStorage.getItem(STORAGE_KEY_HOLIDAY_TICKET)).toBeNull();
  });

  it('is a no-op when the key is absent (no error)', () => {
    expect(() => cleanupLegacyKeys()).not.toThrow();
    expect(localStorage.getItem(STORAGE_KEY_HOLIDAY_TICKET)).toBeNull();
  });

  it('does not affect other keys', () => {
    localStorage.setItem('redmine_calendar_working_hours', '{"start":"08:00","end":"16:00"}');
    localStorage.setItem(STORAGE_KEY_HOLIDAY_TICKET, '999');
    cleanupLegacyKeys();
    expect(localStorage.getItem('redmine_calendar_working_hours')).toBe('{"start":"08:00","end":"16:00"}');
    expect(localStorage.getItem(STORAGE_KEY_HOLIDAY_TICKET)).toBeNull();
  });
});
