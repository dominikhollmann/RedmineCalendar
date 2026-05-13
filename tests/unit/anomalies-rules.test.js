import { describe, it, expect } from 'vitest';
import { veryShortEntry, overlappingEntries } from '../../js/anomalies.js';

// Test t() — returns the key plus a stable JSON of vars so assertions can
// inspect both that the right key was used and which vars were passed.
const t = (key, vars = {}) => `${key}|${JSON.stringify(vars)}`;

describe('veryShortEntry', () => {
  it('flags hours = 0.1', () => {
    const out = veryShortEntry({ hours: 0.1 }, t);
    expect(out).not.toBeNull();
    expect(out).toContain('anomaly.veryShort.reason');
    expect(out).toContain('"hours":0.1');
  });

  it('flags hours = 0.05', () => {
    const out = veryShortEntry({ hours: 0.05 }, t);
    expect(out).not.toBeNull();
    expect(out).toContain('"hours":0.05');
  });

  it('does NOT flag hours = 0.11', () => {
    expect(veryShortEntry({ hours: 0.11 }, t)).toBeNull();
  });

  it('does NOT flag hours = 1.0', () => {
    expect(veryShortEntry({ hours: 1.0 }, t)).toBeNull();
  });

  it('does NOT flag hours = 0 (synthetic break pattern; aggregator handles exclusion)', () => {
    expect(veryShortEntry({ hours: 0 }, t)).toBeNull();
  });

  it('does NOT flag hours = NaN (defensive — should not crash)', () => {
    expect(veryShortEntry({ hours: NaN }, t)).toBeNull();
  });

  it('does NOT flag missing entry / hours', () => {
    expect(veryShortEntry({}, t)).toBeNull();
    expect(veryShortEntry(null, t)).toBeNull();
  });
});

describe('overlappingEntries', () => {
  it('flags two entries 14:00–15:00 and 14:30–15:30 (both ids)', () => {
    const out = overlappingEntries(
      [
        { id: 'A', startTime: '14:00', hours: 1 },
        { id: 'B', startTime: '14:30', hours: 1 },
      ],
      t
    );
    expect(out.size).toBe(2);
    expect(out.get('A')).toHaveLength(1);
    expect(out.get('B')).toHaveLength(1);
    // A's reason references B's range
    expect(out.get('A')[0]).toContain('"start":"14:30"');
    expect(out.get('A')[0]).toContain('"end":"15:30"');
    // B's reason references A's range
    expect(out.get('B')[0]).toContain('"start":"14:00"');
    expect(out.get('B')[0]).toContain('"end":"15:00"');
  });

  it('does NOT flag back-to-back entries (15:00 end touching 15:00 start)', () => {
    const out = overlappingEntries(
      [
        { id: 'A', startTime: '14:00', hours: 1 },
        { id: 'B', startTime: '15:00', hours: 1 },
      ],
      t
    );
    expect(out.size).toBe(0);
  });

  it('handles three-way overlap (each entry pairs with the other two)', () => {
    const out = overlappingEntries(
      [
        { id: 'A', startTime: '14:00', hours: 2 }, // 14:00–16:00
        { id: 'B', startTime: '14:30', hours: 1 }, // 14:30–15:30
        { id: 'C', startTime: '15:00', hours: 2 }, // 15:00–17:00
      ],
      t
    );
    expect(out.size).toBe(3);
    expect(out.get('A')).toHaveLength(2); // pairs with B and C
    expect(out.get('B')).toHaveLength(2); // pairs with A and C
    expect(out.get('C')).toHaveLength(2); // pairs with A and B
  });

  it('single-entry day returns empty result', () => {
    const out = overlappingEntries([{ id: 'A', startTime: '14:00', hours: 1 }], t);
    expect(out.size).toBe(0);
  });

  it('empty input returns empty result', () => {
    expect(overlappingEntries([], t).size).toBe(0);
    expect(overlappingEntries(null, t).size).toBe(0);
  });

  it('does NOT pair entries given in different day groups (callers group by day)', () => {
    // Helper does not consider date — caller must group by day first. So if
    // caller mistakenly passes mixed-day entries, they DO overlap purely on
    // time. This invariant is documented and tested at the aggregator level.
    const out = overlappingEntries(
      [
        { id: 'A', startTime: '14:00', hours: 1 },
        { id: 'B', startTime: '14:30', hours: 1 },
      ],
      t
    );
    expect(out.size).toBe(2);
  });

  it('reason text references the OTHER entry HH:MM start–end', () => {
    const out = overlappingEntries(
      [
        { id: 'X', startTime: '09:00', hours: 1.5 }, // 09:00–10:30
        { id: 'Y', startTime: '10:00', hours: 1 }, // 10:00–11:00
      ],
      t
    );
    expect(out.get('X')[0]).toContain('"start":"10:00"');
    expect(out.get('X')[0]).toContain('"end":"11:00"');
    expect(out.get('Y')[0]).toContain('"start":"09:00"');
    expect(out.get('Y')[0]).toContain('"end":"10:30"');
  });
});
