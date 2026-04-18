import { describe, it, expect } from 'vitest';
import { federalHolidays, computeArbzgWarnings } from '../../js/arbzg.js';

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
