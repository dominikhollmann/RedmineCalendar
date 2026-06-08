import { describe, it, expect, vi, beforeEach } from 'vitest';

// calendar-overlays.js (feature 035 split from calendar.js) owns the former
// window._calendar* state and the FullCalendar rendering callbacks. Mock every
// dependency so the module imports cleanly in node.
vi.mock('../../js/arbzg.js', () => ({
  computeArbzgWarnings: vi.fn(() => ({
    daily: {},
    weekly: [],
    restPeriod: {},
    sunday: [],
    holiday: {},
    breaks: {},
  })),
}));
vi.mock('../../js/anomalies.js', () => ({ detectAnomalies: vi.fn(() => new Map()) }));
vi.mock('../../js/anomaly-render.js', () => ({ attachAnomalyBadge: vi.fn() }));
vi.mock('../../js/i18n.js', () => ({
  t: vi.fn((k, v) => (v ? `${k}:${JSON.stringify(v)}` : k)),
  locale: 'en',
}));
const _cfgStoreMock = { getCentralConfigSync: vi.fn(() => ({})) };
vi.mock('../../js/config-store.js', () => _cfgStoreMock);
vi.mock('../../js/redmine-api.js', () => ({ formatProject: vi.fn((id, name) => name ?? '') }));
vi.mock('../../js/calendar-toolbar.js', () => ({ isMobileView: vi.fn(() => false) }));

const {
  attachOverlayHooks,
  getArbzgWarnings,
  getAnomalies,
  getDayTotals,
  computeDailyTotals,
  splitMidnightEntries,
  buildDayWarningLines,
  baseClasses,
  toFcEvent,
} = await import('../../js/calendar-overlays.js');
const { formatDuration } = await import('../../js/time-entry-form-utils.js');

beforeEach(() => {
  _cfgStoreMock.getCentralConfigSync.mockReturnValue({});
});

describe('calendar-overlays — pure helpers', () => {
  it('formatDuration (unified formatter) renders sub-hour as minutes-only — no leading 0h', () => {
    expect(formatDuration(0.75)).toBe('45m');
    expect(formatDuration(0.5)).toBe('30m');
  });

  it('formatDuration renders whole hours and hour+minute combos', () => {
    expect(formatDuration(2)).toBe('2h');
    expect(formatDuration(1.5)).toBe('1h 30m');
  });

  it('computeDailyTotals sums entry hours per day', () => {
    const events = [
      { extendedProps: { timeEntry: { date: '2026-05-07', hours: 2 } } },
      { extendedProps: { timeEntry: { date: '2026-05-07', hours: 1.5 } } },
      { extendedProps: { timeEntry: { date: '2026-05-08', hours: 4 } } },
    ];
    expect(computeDailyTotals(events)).toEqual({ '2026-05-07': 3.5, '2026-05-08': 4 });
  });

  it('splitMidnightEntries splits an entry crossing midnight into two segments', () => {
    const result = splitMidnightEntries([
      { id: 1, date: '2026-05-07', startTime: '23:00', hours: 2 },
    ]);
    expect(result).toHaveLength(2);
    expect(result[1]._isMidnightContinuation).toBe(true);
    expect(result[1].date).toBe('2026-05-08');
    expect(result[1].startTime).toBe('00:00');
  });

  it('splitMidnightEntries leaves same-day entries untouched', () => {
    const same = [{ id: 2, date: '2026-05-07', startTime: '09:00', hours: 2 }];
    expect(splitMidnightEntries(same)).toEqual(same);
  });

  it('buildDayWarningLines returns [] for missing warnings', () => {
    expect(buildDayWarningLines(null, '2026-05-07')).toEqual([]);
  });

  it('buildDayWarningLines emits a line per matching daily warning', () => {
    const warnings = {
      daily: { '2026-05-07': [{ messageKey: 'arbzg.daily', observed: 11, allowed: 10 }] },
      weekly: [],
      restPeriod: {},
      sunday: [],
      holiday: {},
      breaks: {},
    };
    const lines = buildDayWarningLines(warnings, '2026-05-07');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('arbzg.daily');
  });

  it('toFcEvent maps a timed entry to a FullCalendar event', () => {
    const ev = toFcEvent({
      id: 7,
      issueId: 42,
      issueSubject: 'Task',
      date: '2026-05-07',
      startTime: '09:00',
      hours: 1,
    });
    expect(ev.id).toBe('7');
    expect(ev.start).toBe('2026-05-07T09:00');
    expect(ev.end).toBe('2026-05-07T10:00');
    expect(ev.extendedProps.timeEntry.issueId).toBe(42);
  });
});

describe('calendar-overlays — attachOverlayHooks public surface', () => {
  it('returns the overlay surface: calendarCallbacks + updateOverlays + recompute', () => {
    const hooks = attachOverlayHooks();
    expect(typeof hooks.updateOverlays).toBe('function');
    expect(typeof hooks.recompute).toBe('function');
    expect(hooks.calendarCallbacks).toEqual(
      expect.objectContaining({
        dayHeaderContent: expect.any(Function),
        eventContent: expect.any(Function),
        eventClassNames: expect.any(Function),
        eventDidMount: expect.any(Function),
        eventWillUnmount: expect.any(Function),
      })
    );
  });

  it('exposes the former window._calendar* state via accessor functions', () => {
    expect(getArbzgWarnings()).toEqual(
      expect.objectContaining({ daily: {}, weekly: [], restPeriod: {} })
    );
    expect(getAnomalies()).toBeInstanceOf(Map);
    expect(getDayTotals()).toEqual({});
  });
});

// ── buildDayWarningLines — all warning categories ─────────────────
describe('calendar-overlays — buildDayWarningLines all categories', () => {
  const DATE = '2026-05-07';

  it('returns [] when date has no warnings in any category', () => {
    const empty = { daily: {}, restPeriod: {}, sunday: [], holiday: {}, breaks: {} };
    expect(buildDayWarningLines(empty, DATE)).toEqual([]);
  });

  it('emits a restPeriod line', () => {
    const warnings = {
      daily: {},
      restPeriod: {
        [DATE]: { messageKey: 'arbzg.rest_period', observed: 8, allowed: 11 },
      },
      sunday: [],
      holiday: {},
      breaks: {},
    };
    const lines = buildDayWarningLines(warnings, DATE);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('arbzg.rest_period');
  });

  it('emits a sunday line', () => {
    const warnings = {
      daily: {},
      restPeriod: {},
      sunday: [DATE],
      holiday: {},
      breaks: {},
    };
    const lines = buildDayWarningLines(warnings, DATE);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('arbzg.sunday');
  });

  it('emits a holiday line', () => {
    const warnings = {
      daily: {},
      restPeriod: {},
      sunday: [],
      holiday: { [DATE]: 'Neujahr' },
      breaks: {},
    };
    const lines = buildDayWarningLines(warnings, DATE);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('arbzg.holiday');
    expect(lines[0]).toContain('Neujahr');
  });

  it('emits a BREAK_INSUFFICIENT line', () => {
    const warnings = {
      daily: {},
      restPeriod: {},
      sunday: [],
      holiday: {},
      breaks: {
        [DATE]: [
          { rule: 'BREAK_INSUFFICIENT', messageKey: 'arbzg.break', observed: 15, required: 30 },
        ],
      },
    };
    const lines = buildDayWarningLines(warnings, DATE);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('arbzg.break');
    expect(lines[0]).toContain('15');
    expect(lines[0]).toContain('30');
  });

  it('emits a CONTINUOUS_WORK line', () => {
    const warnings = {
      daily: {},
      restPeriod: {},
      sunday: [],
      holiday: {},
      breaks: {
        [DATE]: [
          {
            rule: 'CONTINUOUS_WORK',
            messageKey: 'arbzg.break_continuous',
            observed: 7,
            allowed: 6,
          },
        ],
      },
    };
    const lines = buildDayWarningLines(warnings, DATE);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('arbzg.break_continuous');
  });

  it('accumulates multiple warning types for the same day', () => {
    const warnings = {
      daily: {
        [DATE]: [{ messageKey: 'arbzg.daily_limit', observed: 11, allowed: 10 }],
      },
      restPeriod: {
        [DATE]: { messageKey: 'arbzg.rest_period', observed: 8, allowed: 11 },
      },
      sunday: [DATE],
      holiday: { [DATE]: 'Karfreitag' },
      breaks: {
        [DATE]: [
          { rule: 'BREAK_INSUFFICIENT', messageKey: 'arbzg.break', observed: 0, required: 30 },
          {
            rule: 'CONTINUOUS_WORK',
            messageKey: 'arbzg.break_continuous',
            observed: 7,
            allowed: 6,
          },
        ],
      },
    };
    const lines = buildDayWarningLines(warnings, DATE);
    // 1 daily + 1 restPeriod + 1 sunday + 1 holiday + 2 breaks = 6
    expect(lines).toHaveLength(6);
  });

  it('ignores warnings for a different date', () => {
    const warnings = {
      daily: { '2026-05-08': [{ messageKey: 'arbzg.daily_limit', observed: 11, allowed: 10 }] },
      restPeriod: { '2026-05-08': { messageKey: 'arbzg.rest_period', observed: 8, allowed: 11 } },
      sunday: ['2026-05-08'],
      holiday: { '2026-05-08': 'Neujahr' },
      breaks: {
        '2026-05-08': [
          { rule: 'BREAK_INSUFFICIENT', messageKey: 'arbzg.break', observed: 0, required: 30 },
        ],
      },
    };
    expect(buildDayWarningLines(warnings, DATE)).toEqual([]);
  });
});

// ── toFcEvent — additional entry types ───────────────────────────
describe('calendar-overlays — toFcEvent additional paths', () => {
  it('renders an untimed entry as allDay with the issue subject as title', () => {
    const ev = toFcEvent({ id: 3, issueId: 10, issueSubject: 'No time', date: '2026-05-07' });
    expect(ev.allDay).toBe(true);
    expect(ev.start).toBe('2026-05-07');
    expect(ev.title).toBe('No time');
    expect(ev.id).toBe('3');
  });

  it('untimed entry with no id has id=undefined', () => {
    const ev = toFcEvent({ issueId: 5, issueSubject: 'X', date: '2026-05-07' });
    expect(ev.id).toBeUndefined();
    expect(ev.allDay).toBe(true);
  });

  it('break ticket entry uses endTime when provided', () => {
    _cfgStoreMock.getCentralConfigSync.mockReturnValue({ breakTicket: 5 });
    const ev = toFcEvent({
      id: 9,
      issueId: 5,
      issueSubject: 'Break',
      date: '2026-05-07',
      startTime: '12:00',
      endTime: '12:30',
      hours: 0.01,
    });
    expect(ev.start).toBe('2026-05-07T12:00');
    expect(ev.end).toBe('2026-05-07T12:30');
    expect(ev.classNames).toContain('fc-event--break');
  });

  it('break ticket entry without endTime falls back to 15-minute block', () => {
    _cfgStoreMock.getCentralConfigSync.mockReturnValue({ breakTicket: 5 });
    const ev = toFcEvent({
      id: 10,
      issueId: 5,
      issueSubject: 'Break',
      date: '2026-05-07',
      startTime: '12:00',
      hours: 0.01,
    });
    expect(ev.start).toBe('2026-05-07T12:00');
    expect(ev.end).toBe('2026-05-07T12:15');
  });

  it('timed entry crossing midnight uses next-day date for end', () => {
    const ev = toFcEvent({
      id: 11,
      issueId: 99,
      issueSubject: 'Late',
      date: '2026-05-07',
      startTime: '23:00',
      hours: 2,
    });
    expect(ev.start).toBe('2026-05-07T23:00');
    expect(ev.end).toBe('2026-05-08T01:00');
  });
});

// ── baseClasses ──────────────────────────────────────────────────
describe('calendar-overlays — baseClasses', () => {
  it('returns [] when the event has no timeEntry in extendedProps', () => {
    expect(baseClasses({ extendedProps: {} })).toEqual([]);
    expect(baseClasses({})).toEqual([]);
  });

  it('returns [fc-event--break] when issueId matches the configured breakTicket', () => {
    _cfgStoreMock.getCentralConfigSync.mockReturnValue({ breakTicket: 7 });
    const fcEvent = { extendedProps: { timeEntry: { issueId: 7 } } };
    expect(baseClasses(fcEvent)).toEqual(['fc-event--break']);
  });

  it('returns [] when issueId does not match the breakTicket', () => {
    _cfgStoreMock.getCentralConfigSync.mockReturnValue({ breakTicket: 7 });
    const fcEvent = { extendedProps: { timeEntry: { issueId: 99 } } };
    expect(baseClasses(fcEvent)).toEqual([]);
  });

  it('returns [] when no breakTicket is configured', () => {
    const fcEvent = { extendedProps: { timeEntry: { issueId: 7 } } };
    expect(baseClasses(fcEvent)).toEqual([]);
  });
});

// ── splitMidnightEntries — additional edge cases ──────────────────
describe('calendar-overlays — splitMidnightEntries edge cases', () => {
  it('passes through entries without startTime unchanged', () => {
    const untimed = [{ id: 1, date: '2026-05-07', hours: 2 }];
    expect(splitMidnightEntries(untimed)).toEqual(untimed);
  });

  it('handles a mix of crossing and non-crossing entries', () => {
    const entries = [
      { id: 1, date: '2026-05-07', startTime: '09:00', hours: 2 },
      { id: 2, date: '2026-05-07', startTime: '23:00', hours: 2 },
    ];
    const result = splitMidnightEntries(entries);
    expect(result).toHaveLength(3); // id=1 unchanged + 2 segments for id=2
    expect(result[0].id).toBe(1);
    expect(result[1]._isMidnightContinuation).toBeUndefined();
    expect(result[2]._isMidnightContinuation).toBe(true);
  });

  it('entry ending exactly at midnight is not split', () => {
    // 22:00 + 2h = 24:00 = exactly midnight boundary, not crossing
    const result = splitMidnightEntries([
      { id: 3, date: '2026-05-07', startTime: '22:00', hours: 2 },
    ]);
    expect(result).toHaveLength(1);
  });
});

// ── computeDailyTotals — edge cases ──────────────────────────────
describe('calendar-overlays — computeDailyTotals edge cases', () => {
  it('skips events without extendedProps.timeEntry.date', () => {
    const events = [{ extendedProps: {} }, { extendedProps: { timeEntry: { hours: 3 } } }];
    expect(computeDailyTotals(events)).toEqual({});
  });

  it('handles events with zero hours', () => {
    const events = [{ extendedProps: { timeEntry: { date: '2026-05-07', hours: 0 } } }];
    expect(computeDailyTotals(events)).toEqual({ '2026-05-07': 0 });
  });
});
