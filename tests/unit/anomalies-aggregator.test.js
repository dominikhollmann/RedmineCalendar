import { describe, it, expect } from 'vitest';
import { detectAnomalies } from '../../js/anomalies.js';

const t = (key, vars = {}) => `${key}|${JSON.stringify(vars)}`;
const cfg = { breakTicket: 99, holidayTicket: 42 };

describe('detectAnomalies — very-short rule only', () => {
  it('flags a single 0.1h entry', () => {
    const out = detectAnomalies(
      [{ id: '1', issueId: 5, date: '2026-05-04', startTime: '09:00', hours: 0.1 }],
      cfg,
      t
    );
    expect(out.size).toBe(1);
    expect(out.get('1').ruleIds).toEqual(['very-short-entry']);
    expect(out.get('1').reasons).toHaveLength(1);
  });

  it('does NOT flag a normal 1.0h entry', () => {
    const out = detectAnomalies(
      [{ id: '1', issueId: 5, date: '2026-05-04', startTime: '09:00', hours: 1.0 }],
      cfg,
      t
    );
    expect(out.size).toBe(0);
  });

  it('excludes break-ticket entries entirely (FR-003 / SC-006)', () => {
    const out = detectAnomalies(
      [{ id: '1', issueId: 99, date: '2026-05-04', startTime: '09:00', hours: 0 }],
      cfg,
      t
    );
    expect(out.size).toBe(0);
  });

  it('does not flag normal-duration holiday entries', () => {
    const out = detectAnomalies(
      [{ id: '1', issueId: 42, date: '2026-05-04', startTime: '09:00', hours: 8 }],
      cfg,
      t
    );
    expect(out.size).toBe(0);
  });

  it('mix: short + normal + break → only the short one', () => {
    const out = detectAnomalies(
      [
        { id: '1', issueId: 5, date: '2026-05-04', startTime: '09:00', hours: 0.1 },
        { id: '2', issueId: 5, date: '2026-05-04', startTime: '10:00', hours: 1.0 },
        { id: '3', issueId: 99, date: '2026-05-04', startTime: '12:00', hours: 0 },
      ],
      cfg,
      t
    );
    expect(out.size).toBe(1);
    expect(out.has('1')).toBe(true);
  });

  it('Map keys are strings (entry id)', () => {
    const out = detectAnomalies(
      [{ id: 7, issueId: 5, date: '2026-05-04', startTime: '09:00', hours: 0.1 }],
      cfg,
      t
    );
    expect([...out.keys()]).toEqual(['7']);
  });
});

describe('detectAnomalies — overlap rule', () => {
  it('flags two overlapping entries (both ids)', () => {
    const out = detectAnomalies(
      [
        { id: 'A', issueId: 5, date: '2026-05-04', startTime: '14:00', hours: 1 },
        { id: 'B', issueId: 6, date: '2026-05-04', startTime: '14:30', hours: 1 },
      ],
      cfg,
      t
    );
    expect(out.size).toBe(2);
    expect(out.get('A').ruleIds).toEqual(['overlapping-entries']);
    expect(out.get('B').ruleIds).toEqual(['overlapping-entries']);
  });

  it('merges multi-rule matches into ONE Map entry with both ruleIds + reasons', () => {
    const out = detectAnomalies(
      [
        { id: 'A', issueId: 5, date: '2026-05-04', startTime: '14:00', hours: 0.05 },
        { id: 'B', issueId: 6, date: '2026-05-04', startTime: '14:00', hours: 1 },
      ],
      cfg,
      t
    );
    // A is both very-short AND overlapping with B
    const tag = out.get('A');
    expect(tag.ruleIds).toContain('very-short-entry');
    expect(tag.ruleIds).toContain('overlapping-entries');
    expect(tag.reasons).toHaveLength(2);
  });

  it('does NOT pair entries on different days (overlap is per-day)', () => {
    const out = detectAnomalies(
      [
        { id: 'A', issueId: 5, date: '2026-05-04', startTime: '14:00', hours: 1 },
        { id: 'B', issueId: 6, date: '2026-05-05', startTime: '14:30', hours: 1 },
      ],
      cfg,
      t
    );
    expect(out.size).toBe(0);
  });

  it('break-ticket entry overlapping a normal entry: NEITHER flagged (FR-003)', () => {
    const out = detectAnomalies(
      [
        { id: 'A', issueId: 5, date: '2026-05-04', startTime: '14:00', hours: 1 },
        { id: 'B', issueId: 99, date: '2026-05-04', startTime: '14:30', hours: 0 },
      ],
      cfg,
      t
    );
    expect(out.size).toBe(0);
  });

  it('holiday-ticket 8h entry overlapping a normal 1h entry: BOTH flagged', () => {
    const out = detectAnomalies(
      [
        { id: 'H', issueId: 42, date: '2026-05-04', startTime: '08:00', hours: 8 },
        { id: 'X', issueId: 5, date: '2026-05-04', startTime: '10:00', hours: 1 },
      ],
      cfg,
      t
    );
    expect(out.size).toBe(2);
    expect(out.get('H').ruleIds).toEqual(['overlapping-entries']);
    expect(out.get('X').ruleIds).toEqual(['overlapping-entries']);
  });

  it('back-to-back entries on the same day are NOT flagged', () => {
    const out = detectAnomalies(
      [
        { id: 'A', issueId: 5, date: '2026-05-04', startTime: '14:00', hours: 1 },
        { id: 'B', issueId: 6, date: '2026-05-04', startTime: '15:00', hours: 1 },
      ],
      cfg,
      t
    );
    expect(out.size).toBe(0);
  });
});

describe('detectAnomalies — defensive / edge inputs', () => {
  it('empty list returns an empty Map', () => {
    expect(detectAnomalies([], cfg, t).size).toBe(0);
  });

  it('null entries returns an empty Map', () => {
    expect(detectAnomalies(null, cfg, t).size).toBe(0);
  });

  it('entries without ids are skipped', () => {
    const out = detectAnomalies(
      [{ id: null, issueId: 5, date: '2026-05-04', startTime: '09:00', hours: 0.1 }],
      cfg,
      t
    );
    expect(out.size).toBe(0);
  });

  it('missing breakTicket config: rule still applies, nothing is excluded', () => {
    const out = detectAnomalies(
      [{ id: '1', issueId: 99, date: '2026-05-04', startTime: '09:00', hours: 0.1 }],
      {},
      t
    );
    expect(out.size).toBe(1);
  });
});
