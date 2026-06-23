import { describe, it, expect } from 'vitest';
import { expandToWeekdays, isMultiDay } from '../../js/planning-bulk-drop.js';

describe('expandToWeekdays', () => {
  it('returns Mon–Fri dates for a basic two-week event (10 weekdays)', () => {
    // 2026-06-22 (Mon) to 2026-07-05 (Sun) inclusive = 2 full weeks (14 calendar days)
    const result = expandToWeekdays('2026-06-22', '2026-07-05');
    expect(result).toHaveLength(10);
    expect(result[0]).toBe('2026-06-22'); // Mon
    expect(result[4]).toBe('2026-06-26'); // Fri
    expect(result[5]).toBe('2026-06-29'); // Mon
    expect(result[9]).toBe('2026-07-03'); // Fri
  });

  it('returns empty array for a weekend-only event (Sat–Sun)', () => {
    const result = expandToWeekdays('2026-06-27', '2026-06-28'); // Sat–Sun
    expect(result).toEqual([]);
  });

  it('handles a cross-month event correctly', () => {
    // Thu Jun 25 to Mon Jul 6 = Thu, Fri, Mon, Tue, Wed, Thu, Fri, Mon = 8 weekdays
    const result = expandToWeekdays('2026-06-25', '2026-07-06');
    expect(result).toContain('2026-06-25'); // Thu
    expect(result).toContain('2026-06-26'); // Fri
    expect(result).not.toContain('2026-06-27'); // Sat
    expect(result).not.toContain('2026-06-28'); // Sun
    expect(result).toContain('2026-06-29'); // Mon
    expect(result).toContain('2026-07-03'); // Fri
    expect(result).not.toContain('2026-07-04'); // Sat
    expect(result).not.toContain('2026-07-05'); // Sun
    expect(result).toContain('2026-07-06'); // Mon
    expect(result).toHaveLength(8);
  });

  it('returns a single date for a single weekday', () => {
    const result = expandToWeekdays('2026-06-24', '2026-06-24'); // Wed
    expect(result).toEqual(['2026-06-24']);
  });

  it('returns Mon–Fri when event starts on Saturday', () => {
    // Sat Jun 27 to Fri Jul 3 → Mon Jun 29 to Fri Jul 3 = 5 weekdays
    const result = expandToWeekdays('2026-06-27', '2026-07-03');
    expect(result).not.toContain('2026-06-27'); // Sat
    expect(result).not.toContain('2026-06-28'); // Sun
    expect(result).toContain('2026-06-29'); // Mon
    expect(result).toContain('2026-07-03'); // Fri
    expect(result).toHaveLength(5);
  });

  it('returns Mon–Fri when event starts on Sunday', () => {
    // Sun Jun 28 to Fri Jul 3 → Mon Jun 29 to Fri Jul 3 = 5 weekdays
    const result = expandToWeekdays('2026-06-28', '2026-07-03');
    expect(result).not.toContain('2026-06-28'); // Sun
    expect(result).toContain('2026-06-29'); // Mon
    expect(result).toContain('2026-07-03'); // Fri
    expect(result).toHaveLength(5);
  });

  it('skips weekends in a Thu–Tue span (4 weekdays)', () => {
    // Thu Jun 25 to Tue Jun 30 = Thu, Fri, Mon, Tue = 4 weekdays
    const result = expandToWeekdays('2026-06-25', '2026-06-30');
    expect(result).toEqual(['2026-06-25', '2026-06-26', '2026-06-29', '2026-06-30']);
  });

  it('returns YYYY-MM-DD strings (not Date objects)', () => {
    const result = expandToWeekdays('2026-06-23', '2026-06-23');
    expect(typeof result[0]).toBe('string');
    expect(result[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('isMultiDay', () => {
  it('returns false when end date equals start date (single-day event)', () => {
    const rawEvent = { start: '2026-06-23T00:00:00', end: '2026-06-23T23:59:59' };
    expect(isMultiDay(rawEvent)).toBe(false);
  });

  it('returns true when end date is after start date (multi-day event)', () => {
    const rawEvent = { start: '2026-06-23T00:00:00', end: '2026-07-05T23:59:59' };
    expect(isMultiDay(rawEvent)).toBe(true);
  });

  it('returns true for a two-day event', () => {
    const rawEvent = { start: '2026-06-23T00:00:00', end: '2026-06-24T23:59:59' };
    expect(isMultiDay(rawEvent)).toBe(true);
  });
});
