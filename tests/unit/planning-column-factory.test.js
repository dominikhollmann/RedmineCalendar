// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (must precede module import) ───────────────────────────────
vi.mock('../../js/config.js', () => ({
  SLOT_DURATION: '00:15:00',
  SNAP_DURATION: '00:05:00',
}));
vi.mock('../../js/calendar-toolbar.js', () => ({
  getEffectiveTimeRange: vi.fn(() => ({ slotMinTime: '06:00:00', slotMaxTime: '22:00:00' })),
}));
vi.mock('../../js/i18n.js', () => ({ locale: 'en', t: vi.fn((k) => k) }));

// ── FullCalendar global mock ─────────────────────────────────────────
let _capturedOptions = null;
const _calMock = {
  render: vi.fn(),
  gotoDate: vi.fn(),
  removeAllEvents: vi.fn(),
  addEvent: vi.fn(),
  destroy: vi.fn(),
};

global.FullCalendar = {
  Calendar: class MockCalendar {
    constructor(_el, opts) {
      _capturedOptions = opts;
      return _calMock;
    }
  },
};

import { createTimegridColumn } from '../../js/calendar-config.js';

beforeEach(() => {
  vi.clearAllMocks();
  _capturedOptions = null;
});

// ── T001: createTimegridColumn factory ───────────────────────────────

describe('createTimegridColumn', () => {
  it('exists as a named export', () => {
    expect(typeof createTimegridColumn).toBe('function');
  });

  it('mode: readonly sets editable: false and selectable: false', () => {
    const el = document.createElement('div');
    createTimegridColumn(el, { date: '2026-06-19', mode: 'readonly' });
    expect(_capturedOptions.editable).toBe(false);
    expect(_capturedOptions.selectable).toBe(false);
  });

  it('mode: interactive inherits editable: true and selectable: true from shared options', () => {
    const el = document.createElement('div');
    createTimegridColumn(el, { date: '2026-06-19', mode: 'interactive' });
    expect(_capturedOptions.editable).toBe(true);
    expect(_capturedOptions.selectable).toBe(true);
  });

  it('calls render() after construction', () => {
    const el = document.createElement('div');
    createTimegridColumn(el, { date: '2026-06-19' });
    expect(_calMock.render).toHaveBeenCalledOnce();
  });

  it('merges callbacks last so they override defaults', () => {
    const el = document.createElement('div');
    const onEventClick = vi.fn();
    createTimegridColumn(el, { date: '2026-06-19', callbacks: { eventClick: onEventClick } });
    expect(_capturedOptions.eventClick).toBe(onEventClick);
  });

  it('sets initialView from view option (default timeGridDay)', () => {
    const el = document.createElement('div');
    createTimegridColumn(el, { date: '2026-06-19' });
    expect(_capturedOptions.initialView).toBe('timeGridDay');
  });

  it('sets initialView to timeGridWeek when specified', () => {
    const el = document.createElement('div');
    createTimegridColumn(el, { date: '2026-06-19', view: 'timeGridWeek' });
    expect(_capturedOptions.initialView).toBe('timeGridWeek');
  });

  it('returns an instance with cal, setDate, setEvents, destroy', () => {
    const el = document.createElement('div');
    const inst = createTimegridColumn(el, { date: '2026-06-19' });
    expect(inst).toHaveProperty('cal');
    expect(typeof inst.setDate).toBe('function');
    expect(typeof inst.setEvents).toBe('function');
    expect(typeof inst.destroy).toBe('function');
  });

  it('setDate calls gotoDate on the FC instance', () => {
    const el = document.createElement('div');
    const inst = createTimegridColumn(el, { date: '2026-06-19' });
    inst.setDate('2026-06-20');
    expect(_calMock.gotoDate).toHaveBeenCalledWith('2026-06-20');
  });

  it('setEvents calls removeAllEvents then addEvent for each event', () => {
    const el = document.createElement('div');
    const inst = createTimegridColumn(el, { date: '2026-06-19' });
    const events = [
      { id: 'e1', title: 'A' },
      { id: 'e2', title: 'B' },
    ];
    inst.setEvents(events);
    expect(_calMock.removeAllEvents).toHaveBeenCalledOnce();
    expect(_calMock.addEvent).toHaveBeenCalledTimes(2);
    expect(_calMock.addEvent).toHaveBeenNthCalledWith(1, events[0]);
    expect(_calMock.addEvent).toHaveBeenNthCalledWith(2, events[1]);
  });

  it('setEvents with empty array clears all events', () => {
    const el = document.createElement('div');
    const inst = createTimegridColumn(el, { date: '2026-06-19' });
    inst.setEvents([]);
    expect(_calMock.removeAllEvents).toHaveBeenCalledOnce();
    expect(_calMock.addEvent).not.toHaveBeenCalled();
  });

  it('destroy calls cal.destroy()', () => {
    const el = document.createElement('div');
    const inst = createTimegridColumn(el, { date: '2026-06-19' });
    inst.destroy();
    expect(_calMock.destroy).toHaveBeenCalledOnce();
  });
});
