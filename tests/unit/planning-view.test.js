import { describe, it, expect, vi } from 'vitest';

vi.mock('../../js/i18n.js', () => ({ t: vi.fn((k) => k), locale: 'en' }));
vi.mock('../../js/config.js', () => ({
  STORAGE_KEY_DAY_RANGE: 'redmine_calendar_day_range',
  STORAGE_KEY_PLANNING_SOURCE_OUTLOOK: 'redmine_calendar_planning_source_outlook',
}));
vi.mock('../../js/notify.js', () => ({ showToast: vi.fn() }));
vi.mock('../../js/planning-view-bookings.js', () => ({
  initBookingsCalendar: vi.fn(() => ({})),
  loadBookingsForDay: vi.fn(async () => []),
  destroyBookingsCalendar: vi.fn(),
}));
vi.mock('../../js/planning-view-outlook.js', () => ({
  renderOutlookColumn: vi.fn(async () => []),
  clearSelection: vi.fn(),
  getSelectedEventIds: vi.fn(() => new Set()),
  getSelectedEvents: vi.fn(() => []),
}));
vi.mock('../../js/calendar-toolbar.js', () => ({
  isMobileView: vi.fn(() => false),
  getEffectiveTimeRange: vi.fn(() => ({ slotMinTime: '09:00', slotMaxTime: '17:00' })),
}));
vi.mock('../../js/time-entry-form.js', () => ({ openForm: vi.fn() }));
vi.mock('../../js/redmine-api.js', () => ({ createTimeEntry: vi.fn(async () => null) }));

import { prevDay, nextDay, toToday } from '../../js/planning-view.js';

// ── T009: day-navigation helpers ──────────────────────────────────

describe('prevDay', () => {
  it('skips Saturday and Sunday going back from Monday (Mo-Fr active)', () => {
    expect(prevDay('2026-06-08', true)).toBe('2026-06-05');
  });

  it('does not return Saturday or Sunday when Mo-Fr active', () => {
    const result = prevDay('2026-06-08', true);
    const d = new Date(result + 'T00:00:00Z');
    expect(d.getUTCDay()).not.toBe(6);
    expect(d.getUTCDay()).not.toBe(0);
  });

  it('does not skip weekends when Mo-Fr inactive', () => {
    expect(prevDay('2026-06-07', false)).toBe('2026-06-06');
  });

  it('goes back one day when Mo-Fr inactive and previous day is weekday', () => {
    expect(prevDay('2026-06-10', false)).toBe('2026-06-09');
  });
});

describe('nextDay', () => {
  it('skips Saturday and Sunday going forward from Friday (Mo-Fr active)', () => {
    expect(nextDay('2026-06-05', true)).toBe('2026-06-08');
  });

  it('does not return Saturday or Sunday when Mo-Fr active', () => {
    const result = nextDay('2026-06-05', true);
    const d = new Date(result + 'T00:00:00Z');
    expect(d.getUTCDay()).not.toBe(6);
    expect(d.getUTCDay()).not.toBe(0);
  });

  it('does not skip weekends when Mo-Fr inactive', () => {
    expect(nextDay('2026-06-05', false)).toBe('2026-06-06');
  });

  it('goes forward one day when Mo-Fr inactive and next day is weekday', () => {
    expect(nextDay('2026-06-08', false)).toBe('2026-06-09');
  });
});

describe('toToday', () => {
  it('returns today as YYYY-MM-DD', () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    expect(toToday()).toBe(todayStr);
  });
});
