// @vitest-environment jsdom
// Duration-line rendering for planning cards: all-day events show a date / date
// range + inclusive day count (feature 050), timed events keep the HH:MM line.

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../js/i18n.js', () => ({
  t: vi.fn((k) => k),
  locale: 'en',
  // Mirror the real en-locale formatter (YYYY-MM-DD) so span composition is testable.
  formatDate: vi.fn((d) => d),
}));
vi.mock('../../js/redmine-api.js', () => ({
  formatProject: vi.fn(() => ''),
  fetchIssueInfo: vi.fn(async () => null),
  fetchIssueStatuses: vi.fn(async () => new Map()),
  stampClosedStatus: vi.fn(async () => {}),
}));
vi.mock('../../js/time-entry-form-utils.js', () => ({
  formatDuration: vi.fn((h) => `${h}h`),
  diffMinutes: vi.fn(() => 60),
}));
vi.mock('../../js/planning-view-layout.js', () => ({
  computeLayout: vi.fn(() => []),
  setCardPosition: vi.fn(),
}));
vi.mock('../../js/outlook.js', () => ({
  roundToQuarter: vi.fn((hhmm) => hhmm),
}));

global.DOMPurify = { sanitize: vi.fn((s) => s) };

import {
  formatAllDaySpan,
  buildCardContent,
  formatEventDurationLine,
  buildSourceEventInfo,
} from '../../js/planning-view-column-base.js';

describe('formatAllDaySpan', () => {
  it('shows a single date with (1d) when start and end fall on the same day', () => {
    expect(formatAllDaySpan('2026-06-26T00:00:00', '2026-06-26T23:59:59')).toBe('2026-06-26 (1d)');
  });

  it('shows a date range with the inclusive day count for a multi-day span', () => {
    expect(formatAllDaySpan('2026-06-28T00:00:00', '2026-07-07T23:59:59')).toBe(
      '2026-06-28–2026-07-07 (10d)'
    );
  });

  it('accepts bare date strings (no time component)', () => {
    expect(formatAllDaySpan('2026-06-28', '2026-06-29')).toBe('2026-06-28–2026-06-29 (2d)');
  });
});

describe('buildSourceEventInfo — reuses the planning-card duration line', () => {
  it('uses the all-day date-range line for a multi-day event', () => {
    const pe = {
      proposal: { subject: 'Company Holiday', isAllDay: false, source: 'Outlook' },
      displayStartTime: '00:00',
      displayEndTime: '23:59',
      rawEvent: { isAllDay: true, start: '2026-06-28T00:00:00', end: '2026-07-07T23:59:59' },
    };
    expect(formatEventDurationLine(pe)).toBe('2026-06-28–2026-07-07 (10d)');
    expect(buildSourceEventInfo(pe)).toEqual({
      subject: 'Company Holiday',
      when: '2026-06-28–2026-07-07 (10d)',
      source: 'Outlook',
    });
  });

  it('uses the original (un-rounded) HH:MM–HH:MM (duration) line for a timed event', () => {
    const pe = {
      proposal: {
        subject: 'Daily Standup',
        isAllDay: false,
        startTime: '11:00', // rounded — must NOT be used
        endTime: '11:45',
        source: 'Outlook',
      },
      displayStartTime: '11:03', // original times
      displayEndTime: '11:48',
      rawEvent: { isAllDay: false, start: '2026-06-26T11:03:00', end: '2026-06-26T11:48:00' },
    };
    // diffMinutes is mocked to 60 → 1h via the formatDuration mock.
    expect(buildSourceEventInfo(pe)).toEqual({
      subject: 'Daily Standup',
      when: '11:03–11:48 (1h)',
      source: 'Outlook',
    });
  });
});

describe('buildCardContent — all-day duration line', () => {
  function allDayEvent(start, end) {
    return {
      id: 'x',
      proposal: {
        subject: 'Company Holiday',
        isAllDay: false,
        startTime: '09:00',
        endTime: '17:00',
      },
      ticketInfo: null,
      displayStartTime: '00:00',
      displayEndTime: '23:59',
      rawEvent: { isAllDay: true, start, end },
    };
  }

  it('renders the date span instead of the 00:00–23:59 time line for multi-day all-day events', () => {
    const els = buildCardContent(allDayEvent('2026-06-28T00:00:00', '2026-07-07T23:59:59'), true);
    const timeEl = els.find((el) => el.className === 'ev-time');
    expect(timeEl).toBeDefined();
    expect(timeEl.textContent).toBe('2026-06-28–2026-07-07 (10d)');
  });

  it('renders a single date with (1d) for a single-day all-day event', () => {
    const els = buildCardContent(allDayEvent('2026-06-26T00:00:00', '2026-06-26T23:59:59'), true);
    const timeEl = els.find((el) => el.className === 'ev-time');
    expect(timeEl.textContent).toBe('2026-06-26 (1d)');
  });

  it('keeps the HH:MM time line for timed events', () => {
    const pe = {
      id: 'y',
      proposal: { subject: 'Standup', isAllDay: false, startTime: '09:00', endTime: '10:00' },
      ticketInfo: null,
      displayStartTime: '09:00',
      displayEndTime: '10:00',
      rawEvent: { isAllDay: false, start: '2026-06-26T09:00:00', end: '2026-06-26T10:00:00' },
    };
    const els = buildCardContent(pe, true);
    const timeEl = els.find((el) => el.className === 'ev-time');
    expect(timeEl.textContent).toBe('09:00–10:00 (1h)');
  });
});
