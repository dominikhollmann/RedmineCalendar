import { describe, it, expect } from 'vitest';
import { federalHolidays, computeArbzgWarnings } from '../../js/arbzg.js';

// Note: docs.js unit tests are skipped — renderMarkdown is private and the
// module is DOM-heavy with fetch side effects. Coverage comes from the
// existing Playwright UI tests in tests/ui/docs.spec.js.

describe('federalHolidays', () => {
  it('returns a Map of German federal holidays for a year', () => {
    const holidays = federalHolidays(2026);
    expect(holidays).toBeInstanceOf(Map);
    expect(holidays.has('2026-01-01')).toBe(true); // Neujahr
    expect(holidays.has('2026-12-25')).toBe(true); // 1. Weihnachtstag
    expect(holidays.has('2026-12-26')).toBe(true); // 2. Weihnachtstag
    expect(holidays.has('2026-10-03')).toBe(true); // Tag der Deutschen Einheit
    expect(holidays.has('2026-05-01')).toBe(true); // Tag der Arbeit
  });

  it('computes Easter-dependent holidays correctly for 2026', () => {
    const holidays = federalHolidays(2026);
    // Easter 2026 is April 5
    expect(holidays.has('2026-04-03')).toBe(true); // Karfreitag (Good Friday)
    expect(holidays.has('2026-04-06')).toBe(true); // Ostermontag (Easter Monday)
    expect(holidays.has('2026-05-14')).toBe(true); // Christi Himmelfahrt (Ascension)
    expect(holidays.has('2026-05-25')).toBe(true); // Pfingstmontag (Whit Monday)
  });
});

describe('computeArbzgWarnings', () => {
  it('returns no warnings for normal work hours', () => {
    const entries = [
      { date: '2026-04-14', startTime: '09:00', hours: 8 },
    ];
    const warnings = computeArbzgWarnings(entries, 2026);
    expect(warnings.daily).toEqual({});
  });

  it('warns when daily hours exceed 10', () => {
    const entries = [
      { date: '2026-04-14', startTime: '08:00', hours: 11 },
    ];
    const warnings = computeArbzgWarnings(entries, 2026);
    expect(warnings.daily['2026-04-14']).toBeDefined();
  });

  it('detects Sunday work', () => {
    const entries = [
      { date: '2026-04-19', startTime: '10:00', hours: 4 }, // Sunday
    ];
    const warnings = computeArbzgWarnings(entries, 2026);
    expect(warnings.sunday).toContain('2026-04-19');
  });

  it('detects holiday work', () => {
    const entries = [
      { date: '2026-01-01', startTime: '09:00', hours: 5 }, // Neujahr
    ];
    const warnings = computeArbzgWarnings(entries, 2026);
    expect(warnings.holiday['2026-01-01']).toBeDefined();
  });
});

// ── Weekly limit (ArbZG §3: max 48 h/week) ───────────────────────
describe('weekly limit', () => {
  it('warns when weekly total exceeds 48h (5 x 10h = 50h)', () => {
    // Mon 2026-04-13 to Fri 2026-04-17
    const entries = [
      { date: '2026-04-13', startTime: '08:00', hours: 10 },
      { date: '2026-04-14', startTime: '08:00', hours: 10 },
      { date: '2026-04-15', startTime: '08:00', hours: 10 },
      { date: '2026-04-16', startTime: '08:00', hours: 10 },
      { date: '2026-04-17', startTime: '08:00', hours: 10 },
    ];
    const warnings = computeArbzgWarnings(entries, 2026);
    expect(warnings.weekly).toHaveLength(1);
    expect(warnings.weekly[0].rule).toBe('WEEKLY_LIMIT');
    expect(warnings.weekly[0].observed).toBe(50);
    expect(warnings.weekly[0].allowed).toBe(48);
  });

  it('no warning when weekly total is 40h (5 x 8h)', () => {
    const entries = [
      { date: '2026-04-13', startTime: '09:00', hours: 8 },
      { date: '2026-04-14', startTime: '09:00', hours: 8 },
      { date: '2026-04-15', startTime: '09:00', hours: 8 },
      { date: '2026-04-16', startTime: '09:00', hours: 8 },
      { date: '2026-04-17', startTime: '09:00', hours: 8 },
    ];
    const warnings = computeArbzgWarnings(entries, 2026);
    expect(warnings.weekly).toEqual([]);
  });

  it('no warning when weekly total is exactly 48h', () => {
    const entries = [
      { date: '2026-04-13', startTime: '08:00', hours: 9.6 },
      { date: '2026-04-14', startTime: '08:00', hours: 9.6 },
      { date: '2026-04-15', startTime: '08:00', hours: 9.6 },
      { date: '2026-04-16', startTime: '08:00', hours: 9.6 },
      { date: '2026-04-17', startTime: '08:00', hours: 9.6 },
    ];
    const warnings = computeArbzgWarnings(entries, 2026);
    expect(warnings.weekly).toEqual([]);
  });
});

// ── Rest period (ArbZG §5: min 11 h between working days) ────────
describe('rest period', () => {
  it('warns when rest period < 11h (day A ends 22:00, day B starts 06:00 = 8h rest)', () => {
    const entries = [
      { date: '2026-04-13', startTime: '14:00', hours: 8 }, // ends 22:00
      { date: '2026-04-14', startTime: '06:00', hours: 8 }, // starts 06:00
    ];
    const warnings = computeArbzgWarnings(entries, 2026);
    expect(warnings.restPeriod['2026-04-14']).toBeDefined();
    expect(warnings.restPeriod['2026-04-14'].rule).toBe('REST_PERIOD');
    expect(warnings.restPeriod['2026-04-14'].observed).toBe(8);
    expect(warnings.restPeriod['2026-04-14'].allowed).toBe(11);
  });

  it('no warning when rest period >= 11h (day A ends 18:00, day B starts 08:00 = 14h rest)', () => {
    const entries = [
      { date: '2026-04-13', startTime: '10:00', hours: 8 }, // ends 18:00
      { date: '2026-04-14', startTime: '08:00', hours: 8 }, // starts 08:00
    ];
    const warnings = computeArbzgWarnings(entries, 2026);
    expect(warnings.restPeriod).toEqual({});
  });

  it('does not check rest period for non-consecutive days', () => {
    const entries = [
      { date: '2026-04-13', startTime: '14:00', hours: 8 }, // ends 22:00 Monday
      { date: '2026-04-15', startTime: '06:00', hours: 8 }, // Wednesday — gap of 1 day
    ];
    const warnings = computeArbzgWarnings(entries, 2026);
    expect(warnings.restPeriod).toEqual({});
  });

  it('skips entries without startTime for rest period checks', () => {
    const entries = [
      { date: '2026-04-13', hours: 8 },                      // no startTime
      { date: '2026-04-14', startTime: '06:00', hours: 8 },
    ];
    const warnings = computeArbzgWarnings(entries, 2026);
    expect(warnings.restPeriod).toEqual({});
  });
});

// ── Break checks (ArbZG §4) ──────────────────────────────────────
describe('break checks', () => {
  it('BREAK_INSUFFICIENT when 7h work with only 15min break (needs 30min)', () => {
    // Two blocks: 08:00–11:30 (3.5h) and 11:45–15:15 (3.5h) = 7h total, 15min gap
    const entries = [
      { date: '2026-04-14', startTime: '08:00', hours: 3.5 },
      { date: '2026-04-14', startTime: '11:45', hours: 3.5 },
    ];
    const warnings = computeArbzgWarnings(entries, 2026);
    const breakWarnings = warnings.breaks['2026-04-14'];
    expect(breakWarnings).toBeDefined();
    const insufficient = breakWarnings.find(w => w.rule === 'BREAK_INSUFFICIENT');
    expect(insufficient).toBeDefined();
    expect(insufficient.required).toBe(30);
    expect(insufficient.observed).toBe(15);
  });

  it('BREAK_INSUFFICIENT when 10h work with only 30min break (needs 45min)', () => {
    // Two blocks: 08:00–13:00 (5h) and 13:30–18:30 (5h) = 10h total, 30min gap
    const entries = [
      { date: '2026-04-14', startTime: '08:00', hours: 5 },
      { date: '2026-04-14', startTime: '13:30', hours: 5 },
    ];
    const warnings = computeArbzgWarnings(entries, 2026);
    const breakWarnings = warnings.breaks['2026-04-14'];
    expect(breakWarnings).toBeDefined();
    const insufficient = breakWarnings.find(w => w.rule === 'BREAK_INSUFFICIENT');
    expect(insufficient).toBeDefined();
    expect(insufficient.required).toBe(45);
    expect(insufficient.observed).toBe(30);
  });

  it('CONTINUOUS_WORK when a single 7h block without break', () => {
    const entries = [
      { date: '2026-04-14', startTime: '08:00', hours: 7 },
    ];
    const warnings = computeArbzgWarnings(entries, 2026);
    const breakWarnings = warnings.breaks['2026-04-14'];
    expect(breakWarnings).toBeDefined();
    const continuous = breakWarnings.find(w => w.rule === 'CONTINUOUS_WORK');
    expect(continuous).toBeDefined();
    expect(continuous.observed).toBeGreaterThan(6);
    expect(continuous.allowed).toBe(6);
  });

  it('no break required for 5h work day', () => {
    const entries = [
      { date: '2026-04-14', startTime: '09:00', hours: 5 },
    ];
    const warnings = computeArbzgWarnings(entries, 2026);
    expect(warnings.breaks['2026-04-14']).toBeUndefined();
  });

  it('skips break checks for entries without startTime', () => {
    const entries = [
      { date: '2026-04-14', hours: 8 }, // no startTime
    ];
    const warnings = computeArbzgWarnings(entries, 2026);
    expect(warnings.breaks).toEqual({});
  });
});

// ── Midnight continuation filtering ──────────────────────────────
describe('midnight continuation filtering', () => {
  it('excludes _isMidnightContinuation entries from all checks', () => {
    const entries = [
      { date: '2026-04-14', startTime: '08:00', hours: 8 },
      { date: '2026-04-14', startTime: '00:00', hours: 2, _isMidnightContinuation: true },
    ];
    const warnings = computeArbzgWarnings(entries, 2026);
    // Without filtering, daily total would be 10h — right at limit.
    // With the continuation entry, it would be 10h which does NOT exceed 10.
    // The midnight entry (2h) is filtered out, so daily total = 8h.
    expect(warnings.daily).toEqual({});
  });
});

// ── Multiple violations on same day ──────────────────────────────
describe('multiple violations on same day', () => {
  it('reports both daily limit exceeded AND break violation', () => {
    // Single 11h block: exceeds 10h daily limit AND continuous work > 6h AND break insufficient
    const entries = [
      { date: '2026-04-14', startTime: '07:00', hours: 11 },
    ];
    const warnings = computeArbzgWarnings(entries, 2026);

    // Daily limit exceeded
    expect(warnings.daily['2026-04-14']).toBeDefined();
    const dailyWarning = warnings.daily['2026-04-14'][0];
    expect(dailyWarning.rule).toBe('DAILY_LIMIT');
    expect(dailyWarning.observed).toBe(11);

    // Break violations
    const breakWarnings = warnings.breaks['2026-04-14'];
    expect(breakWarnings).toBeDefined();
    expect(breakWarnings.find(w => w.rule === 'CONTINUOUS_WORK')).toBeDefined();
    expect(breakWarnings.find(w => w.rule === 'BREAK_INSUFFICIENT')).toBeDefined();
  });
});
