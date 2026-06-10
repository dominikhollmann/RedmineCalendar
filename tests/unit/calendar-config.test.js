import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../js/config.js', () => ({
  SLOT_DURATION: '00:15:00',
  SNAP_DURATION: '00:05:00',
}));
vi.mock('../../js/calendar-toolbar.js', () => ({
  getEffectiveTimeRange: vi.fn(() => ({ slotMinTime: '06:00:00', slotMaxTime: '22:00:00' })),
}));
vi.mock('../../js/i18n.js', () => ({ locale: 'en', t: vi.fn((k) => k) }));

import { sharedTimeGridOptions } from '../../js/calendar-config.js';
import { getEffectiveTimeRange } from '../../js/calendar-toolbar.js';

beforeEach(() => {
  vi.clearAllMocks();
  getEffectiveTimeRange.mockReturnValue({ slotMinTime: '06:00:00', slotMaxTime: '22:00:00' });
});

// ── T018: sharedTimeGridOptions ───────────────────────────────────

describe('sharedTimeGridOptions', () => {
  it('includes slotMinTime and slotMaxTime from getEffectiveTimeRange', () => {
    const opts = sharedTimeGridOptions();
    expect(opts.slotMinTime).toBe('06:00:00');
    expect(opts.slotMaxTime).toBe('22:00:00');
    expect(getEffectiveTimeRange).toHaveBeenCalledOnce();
  });

  it('includes SLOT_DURATION and SNAP_DURATION from config', () => {
    const opts = sharedTimeGridOptions();
    expect(opts.slotDuration).toBe('00:15:00');
    expect(opts.snapDuration).toBe('00:05:00');
  });

  it('sets eventResizableFromStart: true', () => {
    expect(sharedTimeGridOptions().eventResizableFromStart).toBe(true);
  });

  it('disables allDaySlot and headerToolbar', () => {
    const opts = sharedTimeGridOptions();
    expect(opts.allDaySlot).toBe(false);
    expect(opts.headerToolbar).toBe(false);
  });

  it('enables selectable and editable', () => {
    const opts = sharedTimeGridOptions();
    expect(opts.selectable).toBe(true);
    expect(opts.editable).toBe(true);
  });

  it('returns a new object on each call (calls getEffectiveTimeRange each time)', () => {
    getEffectiveTimeRange
      .mockReturnValueOnce({ slotMinTime: '07:00:00', slotMaxTime: '20:00:00' })
      .mockReturnValueOnce({ slotMinTime: '08:00:00', slotMaxTime: '21:00:00' });
    const a = sharedTimeGridOptions();
    const b = sharedTimeGridOptions();
    expect(a.slotMinTime).toBe('07:00:00');
    expect(b.slotMinTime).toBe('08:00:00');
  });
});
