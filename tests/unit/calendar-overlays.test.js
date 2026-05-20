import { describe, it, expect, vi } from 'vitest';

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
vi.mock('../../js/config-store.js', () => ({ getCentralConfigSync: vi.fn(() => ({})) }));
vi.mock('../../js/redmine-api.js', () => ({ formatProject: vi.fn((id, name) => name ?? '') }));
vi.mock('../../js/calendar-toolbar.js', () => ({ isMobileView: vi.fn(() => false) }));

const {
  attachOverlayHooks,
  getArbzgWarnings,
  getAnomalies,
  getDayTotals,
  formatHours,
  computeDailyTotals,
  splitMidnightEntries,
  buildDayWarningLines,
  toFcEvent,
} = await import('../../js/calendar-overlays.js');

describe('calendar-overlays — pure helpers', () => {
  it('formatHours renders hours + minutes, dropping a zero minute part', () => {
    expect(formatHours(1.5)).toBe('1h 30m');
    expect(formatHours(2)).toBe('2h');
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
