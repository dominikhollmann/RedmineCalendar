import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../js/calendar-overlays.js', () => ({
  baseClasses: vi.fn((ev) => {
    const entry = ev?.extendedProps?.timeEntry;
    return entry?.isBreak ? ['fc-event--break'] : [];
  }),
}));

// entry-selection is a singleton — import once and reset between tests via deselectAll()
import {
  selectEntry,
  deselectAll,
  getSelected,
  getAnchor,
  hasSelected,
} from '../../js/entry-selection.js';

function makeEvent(id, { isBreak = false } = {}) {
  const ev = {
    id,
    classNames: [],
    extendedProps: { timeEntry: { id: parseInt(id) || id, isBreak } },
    setProp: vi.fn((prop, val) => {
      if (prop === 'classNames') ev.classNames = [...val];
    }),
  };
  return ev;
}

beforeEach(() => {
  deselectAll();
  vi.clearAllMocks();
});

// ── T010: single select ───────────────────────────────────────────

describe('entry-selection: single select', () => {
  it('selects event and adds fc-event--selected', () => {
    const ev = makeEvent('1');
    selectEntry(ev);
    expect(ev.setProp).toHaveBeenCalledWith(
      'classNames',
      expect.arrayContaining(['fc-event--selected'])
    );
    expect(hasSelected()).toBe(true);
    expect(getSelected()).toHaveLength(1);
    expect(getAnchor()).toBe(ev);
  });

  it('replacing selection deselects previous event', () => {
    const ev1 = makeEvent('1');
    const ev2 = makeEvent('2');
    selectEntry(ev1);
    selectEntry(ev2);
    const lastCall1 = ev1.setProp.mock.calls.at(-1);
    expect(lastCall1[1]).not.toContain('fc-event--selected');
    expect(getSelected()).toHaveLength(1);
    expect(getSelected()[0]).toBe(ev2);
    expect(getAnchor()).toBe(ev2);
  });

  it('preserves break class when selecting a break event', () => {
    const ev = makeEvent('br', { isBreak: true });
    selectEntry(ev);
    const classNames = ev.setProp.mock.calls.at(-1)[1];
    expect(classNames).toContain('fc-event--break');
    expect(classNames).toContain('fc-event--selected');
  });
});

// ── T011: multi select (shift+click) ─────────────────────────────

describe('entry-selection: multi select', () => {
  it('shift+click adds event to existing selection', () => {
    const ev1 = makeEvent('1');
    const ev2 = makeEvent('2');
    selectEntry(ev1);
    selectEntry(ev2, true);
    expect(getSelected()).toHaveLength(2);
    expect(getAnchor()).toBe(ev1); // anchor stays on first click
  });

  it('shift+click on already-selected event deselects it', () => {
    const ev = makeEvent('1');
    selectEntry(ev);
    selectEntry(ev, true);
    expect(hasSelected()).toBe(false);
    expect(getAnchor()).toBeNull();
  });

  it('shift+click deselects the anchor if it is toggled off', () => {
    const ev = makeEvent('a');
    selectEntry(ev);
    expect(getAnchor()).toBe(ev);
    selectEntry(ev, true);
    expect(getAnchor()).toBeNull();
  });

  it('shift+click keeps anchor when a different event is toggled off', () => {
    const ev1 = makeEvent('1');
    const ev2 = makeEvent('2');
    selectEntry(ev1);
    selectEntry(ev2, true);
    selectEntry(ev2, true); // deselect ev2
    expect(getAnchor()).toBe(ev1);
    expect(getSelected()).toHaveLength(1);
  });
});

// ── T012: deselectAll ─────────────────────────────────────────────

describe('entry-selection: deselectAll', () => {
  it('clears all events and resets CSS', () => {
    const ev1 = makeEvent('1');
    const ev2 = makeEvent('2');
    selectEntry(ev1);
    selectEntry(ev2, true);
    deselectAll();
    expect(hasSelected()).toBe(false);
    expect(getSelected()).toHaveLength(0);
    expect(getAnchor()).toBeNull();
    const last1 = ev1.setProp.mock.calls.at(-1);
    const last2 = ev2.setProp.mock.calls.at(-1);
    expect(last1[1]).not.toContain('fc-event--selected');
    expect(last2[1]).not.toContain('fc-event--selected');
  });

  it('is a no-op when nothing is selected', () => {
    expect(() => deselectAll()).not.toThrow();
    expect(hasSelected()).toBe(false);
  });
});
