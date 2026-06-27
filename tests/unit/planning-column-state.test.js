// @vitest-environment jsdom
// T003: Unit tests for adapted createColumnState() in planning-view-column-base.js
// These tests MUST FAIL (RED) before T007 adapts the module.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../js/i18n.js', () => ({ t: vi.fn((k) => k), locale: 'en' }));
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
  addHoursToTime: vi.fn((hhmm) => hhmm),
}));
vi.mock('../../js/calendar-toolbar.js', () => ({
  getEffectiveTimeRange: vi.fn(() => ({ slotMinTime: '06:00:00', slotMaxTime: '22:00:00' })),
}));

// DOMPurify global (jsdom doesn't include it)
global.DOMPurify = { sanitize: vi.fn((s) => s) };

import { createColumnState } from '../../js/planning-view-column-base.js';

// ── FC mock factory ──────────────────────────────────────────────────

function makeFcEventMock(pe, extraClassNames = []) {
  const mock = {
    extendedProps: { planningEvent: pe },
    classNames: [...extraClassNames],
    setProp: vi.fn(function (key, val) {
      this[key] = val;
    }),
  };
  return mock;
}

function makeFcInstanceMock(fcEvents = [], options = {}) {
  const _opts = { slotMinTime: '00:00:00', slotMaxTime: '24:00:00', ...options };
  return {
    getEvents: vi.fn(() => fcEvents),
    getOption: vi.fn((key) => _opts[key]),
    setOption: vi.fn((key, val) => {
      _opts[key] = val;
    }),
    removeAllEvents: vi.fn(),
    addEvent: vi.fn(),
    gotoDate: vi.fn(),
    render: vi.fn(),
    destroy: vi.fn(),
  };
}

function makePlanningEvent(overrides = {}) {
  return {
    id: 'pe-1',
    planningCategory: 'bookable',
    isCovered: false,
    proposal: {
      subject: 'Test',
      ticketId: 42,
      startTime: '09:00',
      endTime: '10:00',
      isAllDay: false,
    },
    displayStartTime: '09:00',
    displayEndTime: '10:00',
    ticketInfo: null,
    selected: false,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('createColumnState — FC-aware interface', () => {
  let col;

  beforeEach(() => {
    vi.clearAllMocks();
    // Each test gets a fresh column state; the shared selection pool is reset
    // by module re-import isolation (vitest isolates per describe-run).
    col = createColumnState();
  });

  it('exports setActiveFcInstance as a function', () => {
    expect(typeof col.setActiveFcInstance).toBe('function');
  });

  it('exports handleFcEventClick as a function', () => {
    expect(typeof col.handleFcEventClick).toBe('function');
  });

  it('exports handleFcEventDidMount as a function', () => {
    expect(typeof col.handleFcEventDidMount).toBe('function');
  });

  it('exports setRenderedPlanningEvents as a function', () => {
    expect(typeof col.setRenderedPlanningEvents).toBe('function');
  });

  describe('setActiveFcInstance + syncSelectionClasses', () => {
    it('syncSelectionClasses calls setProp on each FC event to update classNames', () => {
      const pe = makePlanningEvent({ id: 'pe-a', planningCategory: 'bookable' });
      const fcEvent = makeFcEventMock(pe);
      const fcInst = makeFcInstanceMock([fcEvent]);

      col.setActiveFcInstance(fcInst);
      col.setRenderedPlanningEvents([pe]);

      // Add to selection pool manually via handleFcEventClick
      col.handleFcEventClick(fcEvent, { shiftKey: false });

      expect(fcEvent.setProp).toHaveBeenCalledWith(
        'classNames',
        expect.arrayContaining(['planning-event--selected'])
      );
    });

    it('syncSelectionClasses removes selected class when event is deselected', () => {
      const pe = makePlanningEvent({ id: 'pe-b', planningCategory: 'bookable' });
      const fcEvent = makeFcEventMock(pe);
      const fcInst = makeFcInstanceMock([fcEvent]);

      col.setActiveFcInstance(fcInst);
      col.setRenderedPlanningEvents([pe]);

      col.handleFcEventClick(fcEvent, { shiftKey: false });
      col.clearSelection();

      const lastCall = fcEvent.setProp.mock.calls[fcEvent.setProp.mock.calls.length - 1];
      expect(lastCall[1]).not.toContain('planning-event--selected');
    });
  });

  describe('updateFcEventsInPlace — slot-range sync (issue #278)', () => {
    it('updates slotMinTime/slotMaxTime to the effective range even with no events', () => {
      // Regression: the working-hours toggle must resize an available-but-empty
      // Outlook/Teams column. getEffectiveTimeRange is mocked to 06:00–22:00.
      const fcInst = makeFcInstanceMock([], {
        slotMinTime: '00:00:00',
        slotMaxTime: '24:00:00',
      });
      col.setActiveFcInstance(fcInst);

      col.updateFcEventsInPlace([]);

      expect(fcInst.setOption).toHaveBeenCalledWith('slotMinTime', '06:00:00');
      expect(fcInst.setOption).toHaveBeenCalledWith('slotMaxTime', '22:00:00');
    });

    it('does not re-set the slot range when it already matches the effective range', () => {
      const fcInst = makeFcInstanceMock([], {
        slotMinTime: '06:00:00',
        slotMaxTime: '22:00:00',
      });
      col.setActiveFcInstance(fcInst);

      col.updateFcEventsInPlace([]);

      expect(fcInst.setOption).not.toHaveBeenCalledWith('slotMinTime', expect.anything());
      expect(fcInst.setOption).not.toHaveBeenCalledWith('slotMaxTime', expect.anything());
    });

    it('is a no-op when no FC instance is active (disabled / not-signed-in column)', () => {
      // No setActiveFcInstance call — mirrors a column showing a text prompt.
      expect(() => col.updateFcEventsInPlace([])).not.toThrow();
    });
  });

  describe('handleFcEventClick', () => {
    it('adds event id to shared selection on plain click', () => {
      const pe = makePlanningEvent({ id: 'pe-click-1' });
      const fcEvent = makeFcEventMock(pe);
      const fcInst = makeFcInstanceMock([fcEvent]);
      col.setActiveFcInstance(fcInst);
      col.setRenderedPlanningEvents([pe]);

      col.handleFcEventClick(fcEvent, { shiftKey: false });

      expect(col.getSelectedEventIds().has('pe-click-1')).toBe(true);
    });

    it('shift-click adds to selection without clearing existing', () => {
      const pe1 = makePlanningEvent({ id: 'pe-shift-1' });
      const pe2 = makePlanningEvent({ id: 'pe-shift-2' });
      const fcEv1 = makeFcEventMock(pe1);
      const fcEv2 = makeFcEventMock(pe2);
      const fcInst = makeFcInstanceMock([fcEv1, fcEv2]);
      col.setActiveFcInstance(fcInst);
      col.setRenderedPlanningEvents([pe1, pe2]);

      col.handleFcEventClick(fcEv1, { shiftKey: false });
      col.handleFcEventClick(fcEv2, { shiftKey: true });

      const ids = col.getSelectedEventIds();
      expect(ids.has('pe-shift-1')).toBe(true);
      expect(ids.has('pe-shift-2')).toBe(true);
    });

    it('does not select excluded events', () => {
      const pe = makePlanningEvent({ id: 'pe-excl', planningCategory: 'excluded' });
      const fcEvent = makeFcEventMock(pe);
      const fcInst = makeFcInstanceMock([fcEvent]);
      col.setActiveFcInstance(fcInst);
      col.setRenderedPlanningEvents([pe]);

      col.handleFcEventClick(fcEvent, { shiftKey: false });

      expect(col.getSelectedEventIds().has('pe-excl')).toBe(false);
    });

    it('calls syncSelectionClasses after click', () => {
      const pe = makePlanningEvent({ id: 'pe-sync-check' });
      const fcEvent = makeFcEventMock(pe);
      const fcInst = makeFcInstanceMock([fcEvent]);
      col.setActiveFcInstance(fcInst);
      col.setRenderedPlanningEvents([pe]);

      col.handleFcEventClick(fcEvent, { shiftKey: false });

      expect(fcInst.getEvents).toHaveBeenCalled();
      expect(fcEvent.setProp).toHaveBeenCalled();
    });
  });

  describe('handleFcEventDidMount', () => {
    it('sets draggable on non-excluded event elements', () => {
      const pe = makePlanningEvent({ planningCategory: 'bookable' });
      const el = document.createElement('div');
      col.handleFcEventDidMount({ el, event: { extendedProps: { planningEvent: pe } } });
      expect(el.getAttribute('draggable')).toBe('true');
    });

    it('sets data-planning-id on non-excluded event elements', () => {
      const pe = makePlanningEvent({ id: 'pe-mount-1', planningCategory: 'bookable' });
      const el = document.createElement('div');
      col.handleFcEventDidMount({ el, event: { extendedProps: { planningEvent: pe } } });
      expect(el.dataset.planningId).toBe('pe-mount-1');
    });

    it('does not set draggable on excluded events', () => {
      const pe = makePlanningEvent({ planningCategory: 'excluded' });
      const el = document.createElement('div');
      col.handleFcEventDidMount({ el, event: { extendedProps: { planningEvent: pe } } });
      expect(el.getAttribute('draggable')).toBeNull();
    });

    it('attaches dragstart listener for non-excluded events', () => {
      const pe = makePlanningEvent({ planningCategory: 'bookable' });
      const el = document.createElement('div');
      const addEventListenerSpy = vi.spyOn(el, 'addEventListener');
      col.handleFcEventDidMount({ el, event: { extendedProps: { planningEvent: pe } } });
      expect(addEventListenerSpy).toHaveBeenCalledWith('dragstart', expect.any(Function));
    });
  });
});
