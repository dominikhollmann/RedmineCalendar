import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../js/redmine-api.js', () => ({ searchIssues: vi.fn() }));
vi.mock('../../js/config.js', () => ({
  STORAGE_KEY_FAVOURITES: 'redmine_calendar_favourites',
  STORAGE_KEY_LAST_USED: 'redmine_calendar_last_used',
  STORAGE_KEY_FAST_MODE: 'redmine_calendar_fast_mode',
  STORAGE_KEY_BOOKING_MODAL_SIZE: 'redmine_calendar_booking_modal_size',
}));

const { searchIssues } = await import('../../js/redmine-api.js');
const {
  formatDuration,
  timeToMins,
  minsToTime,
  diffMinutes,
  validateTimeInputs,
  capLastUsed,
  getFavourites,
  setFavourites,
  getLastUsed,
  setLastUsed,
  addLastUsed,
  toggleFavourite,
  enrichStaleTickets,
  nav,
  getFastMode,
  searchColumnState,
  getModalSize,
  setModalSize,
  clampModalSize,
  MODAL_MIN_W,
  MODAL_MIN_H,
} = await import('../../js/time-entry-form-utils.js');

// Flush the fire-and-forget inner promise of enrichStaleTickets.
const flushMicrotasks = (n = 5) =>
  Array.from({ length: n }).reduce((p) => p.then(() => Promise.resolve()), Promise.resolve());

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// ── formatDuration ────────────────────────────────────────────────
describe('formatDuration', () => {
  it('formats hours and minutes together', () => {
    expect(formatDuration(1.5)).toBe('1h 30m');
  });

  it('drops the minute part when zero', () => {
    expect(formatDuration(2)).toBe('2h');
  });

  it('renders minutes-only when under an hour', () => {
    expect(formatDuration(0.5)).toBe('30m');
  });

  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0m');
  });

  it('rounds to the nearest minute', () => {
    // 1/60 h = 1 minute exactly
    expect(formatDuration(1 / 60)).toBe('1m');
  });

  it('handles large values', () => {
    expect(formatDuration(10.75)).toBe('10h 45m');
  });
});

// ── timeToMins ───────────────────────────────────────────────────
describe('timeToMins', () => {
  it('converts HH:MM to minutes since midnight', () => {
    expect(timeToMins('09:30')).toBe(570);
  });

  it('handles midnight (00:00)', () => {
    expect(timeToMins('00:00')).toBe(0);
  });

  it('handles end of day (23:59)', () => {
    expect(timeToMins('23:59')).toBe(1439);
  });

  it('handles whole hours', () => {
    expect(timeToMins('12:00')).toBe(720);
  });
});

// ── minsToTime ───────────────────────────────────────────────────
describe('minsToTime', () => {
  it('converts minutes to HH:MM', () => {
    expect(minsToTime(570)).toBe('09:30');
  });

  it('zero minutes returns 00:00', () => {
    expect(minsToTime(0)).toBe('00:00');
  });

  it('wraps at 1440 (one full day = midnight)', () => {
    expect(minsToTime(1440)).toBe('00:00');
  });

  it('wraps negative values correctly (1410 mod 1440 = 1410 → 23:30)', () => {
    expect(minsToTime(-30)).toBe('23:30');
  });

  it('pads single-digit hours and minutes', () => {
    expect(minsToTime(65)).toBe('01:05');
  });
});

// ── diffMinutes ──────────────────────────────────────────────────
describe('diffMinutes', () => {
  it('computes difference between two times on the same day', () => {
    expect(diffMinutes('09:00', '17:30')).toBe(510);
  });

  it('wraps past midnight correctly', () => {
    expect(diffMinutes('23:00', '01:00')).toBe(120);
  });

  it('same start and end returns 0', () => {
    expect(diffMinutes('10:00', '10:00')).toBe(0);
  });
});

// ── validateTimeInputs ───────────────────────────────────────────
describe('validateTimeInputs', () => {
  it('returns null for a fully valid input set', () => {
    expect(
      validateTimeInputs({
        hasTicket: true,
        date: '2026-05-07',
        startInput: '09:00',
        endInput: '17:00',
      })
    ).toBeNull();
  });

  it('returns ticket_required when no ticket is selected', () => {
    expect(
      validateTimeInputs({
        hasTicket: false,
        date: '2026-05-07',
        startInput: '09:00',
        endInput: '17:00',
      })
    ).toBe('modal.ticket_required');
  });

  it('returns date_required when date is empty', () => {
    expect(
      validateTimeInputs({ hasTicket: true, date: '', startInput: '09:00', endInput: '17:00' })
    ).toBe('modal.date_required');
  });

  it('returns start_required when startInput is null', () => {
    expect(
      validateTimeInputs({
        hasTicket: true,
        date: '2026-05-07',
        startInput: null,
        endInput: '17:00',
      })
    ).toBe('modal.start_required');
  });

  it('returns end_required when endInput is null', () => {
    expect(
      validateTimeInputs({
        hasTicket: true,
        date: '2026-05-07',
        startInput: '09:00',
        endInput: null,
      })
    ).toBe('modal.end_required');
  });

  it('returns end_before_start when end is before start', () => {
    expect(
      validateTimeInputs({
        hasTicket: true,
        date: '2026-05-07',
        startInput: '17:00',
        endInput: '09:00',
      })
    ).toBe('modal.end_before_start');
  });

  it('returns end_before_start when end equals start', () => {
    expect(
      validateTimeInputs({
        hasTicket: true,
        date: '2026-05-07',
        startInput: '09:00',
        endInput: '09:00',
      })
    ).toBe('modal.end_before_start');
  });
});

// ── capLastUsed ──────────────────────────────────────────────────
describe('capLastUsed', () => {
  it('prepends the new ticket to the front', () => {
    const result = capLastUsed([{ id: 1 }], { id: 2 });
    expect(result[0].id).toBe(2);
    expect(result[1].id).toBe(1);
  });

  it('deduplicates — removes the prior entry for the same id', () => {
    const result = capLastUsed([{ id: 1 }, { id: 2 }, { id: 3 }], { id: 2, subject: 'Updated' });
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe(2);
    expect(result[0].subject).toBe('Updated');
    expect(result.filter((e) => e.id === 2)).toHaveLength(1);
  });

  it('trims to the default cap of 20', () => {
    const list = Array.from({ length: 20 }, (_, i) => ({ id: i + 1 }));
    const result = capLastUsed(list, { id: 99 });
    expect(result).toHaveLength(20);
    expect(result[0].id).toBe(99);
    expect(result[result.length - 1].id).toBe(19);
  });

  it('respects a custom cap', () => {
    const result = capLastUsed([{ id: 1 }, { id: 2 }], { id: 3 }, 2);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(3);
    expect(result[1].id).toBe(1);
  });

  it('handles an empty list', () => {
    const result = capLastUsed([], { id: 5, subject: 'Test' });
    expect(result).toEqual([{ id: 5, subject: 'Test' }]);
  });
});

// ── getFavourites / setFavourites ─────────────────────────────────
describe('getFavourites / setFavourites', () => {
  it('returns an empty array when nothing is stored', () => {
    expect(getFavourites()).toEqual([]);
  });

  it('round-trips through localStorage', () => {
    const favs = [{ id: 42, subject: 'My ticket', projectName: 'P', projectIdentifier: 'p' }];
    setFavourites(favs);
    expect(getFavourites()).toEqual(favs);
  });

  it('returns an empty array on corrupt localStorage value', () => {
    localStorage.setItem('redmine_calendar_favourites', '{bad json');
    expect(getFavourites()).toEqual([]);
  });
});

// ── getLastUsed / setLastUsed ─────────────────────────────────────
describe('getLastUsed / setLastUsed', () => {
  it('returns an empty array when nothing is stored', () => {
    expect(getLastUsed()).toEqual([]);
  });

  it('round-trips through localStorage', () => {
    const recents = [{ id: 7, subject: 'Recent', projectName: '', projectIdentifier: null }];
    setLastUsed(recents);
    expect(getLastUsed()).toEqual(recents);
  });

  it('returns an empty array on corrupt localStorage value', () => {
    localStorage.setItem('redmine_calendar_last_used', 'not-json');
    expect(getLastUsed()).toEqual([]);
  });
});

// ── addLastUsed ──────────────────────────────────────────────────
describe('addLastUsed', () => {
  it('prepends and persists the entry', () => {
    addLastUsed({ id: 1, subject: 'A', projectName: 'P', projectIdentifier: 'p' });
    addLastUsed({ id: 2, subject: 'B', projectName: 'P', projectIdentifier: 'p' });
    const list = getLastUsed();
    expect(list[0].id).toBe(2);
    expect(list[1].id).toBe(1);
  });

  it('defaults projectName and projectIdentifier when absent', () => {
    addLastUsed({ id: 99, subject: 'No project' });
    const list = getLastUsed();
    expect(list[0].projectName).toBe('');
    expect(list[0].projectIdentifier).toBeNull();
  });
});

// ── toggleFavourite ──────────────────────────────────────────────
describe('toggleFavourite', () => {
  it('adds a ticket when not already in favourites', () => {
    toggleFavourite({ id: 10, subject: 'New', projectName: 'P', projectIdentifier: 'p' });
    const favs = getFavourites();
    expect(favs).toHaveLength(1);
    expect(favs[0].id).toBe(10);
  });

  it('removes a ticket that is already in favourites', () => {
    setFavourites([{ id: 10, subject: 'Existing', projectName: '', projectIdentifier: null }]);
    toggleFavourite({ id: 10, subject: 'Existing' });
    expect(getFavourites()).toHaveLength(0);
  });

  it('prepends the new favourite to the front', () => {
    setFavourites([{ id: 1, subject: 'Old', projectName: '', projectIdentifier: null }]);
    toggleFavourite({ id: 2, subject: 'New', projectName: 'P', projectIdentifier: 'p' });
    const favs = getFavourites();
    expect(favs[0].id).toBe(2);
    expect(favs[1].id).toBe(1);
  });

  it('defaults projectName and projectIdentifier when absent', () => {
    toggleFavourite({ id: 55, subject: 'X' });
    expect(getFavourites()[0].projectName).toBe('');
    expect(getFavourites()[0].projectIdentifier).toBeNull();
  });
});

// ── nav shared state ─────────────────────────────────────────────
describe('nav shared state', () => {
  it('exposes the expected default shape', () => {
    expect(Array.isArray(nav.visibleRows)).toBe(true);
    expect(nav.highlightedIndex).toBe(-1);
    expect(nav.searchMode).toBe(false);
  });

  it('is mutable by reference (shared state pattern)', () => {
    const prev = nav.highlightedIndex;
    nav.highlightedIndex = 3;
    expect(nav.highlightedIndex).toBe(3);
    nav.highlightedIndex = prev;
  });
});

// ── enrichStaleTickets ───────────────────────────────────────────
describe('enrichStaleTickets', () => {
  it('does nothing when all entries already have project info', async () => {
    const entries = [{ id: 1, projectName: 'P', projectIdentifier: 'p' }];
    const renderer = vi.fn();
    function enrich_noop() {
      return entries;
    }
    await enrichStaleTickets(entries, enrich_noop, vi.fn(), renderer);
    await flushMicrotasks();
    expect(searchIssues).not.toHaveBeenCalled();
    expect(renderer).not.toHaveBeenCalled();
  });

  it('backfills missing project info and calls renderer when a match is found', async () => {
    const staleEntry = { id: 5, projectName: '', projectIdentifier: null };
    const storedList = [{ id: 5, projectName: '', projectIdentifier: null }];
    searchIssues.mockResolvedValueOnce([
      { id: 5, projectName: 'Found Project', projectIdentifier: 'found' },
    ]);
    function enrich_backfill() {
      return storedList;
    }
    const setter = vi.fn((list) => storedList.splice(0, storedList.length, ...list));
    const renderer = vi.fn();
    await enrichStaleTickets([staleEntry], enrich_backfill, setter, renderer);
    await flushMicrotasks();
    expect(searchIssues).toHaveBeenCalledWith('5');
    expect(setter).toHaveBeenCalled();
    expect(renderer).toHaveBeenCalled();
  });

  it('does not call renderer when search returns no match', async () => {
    const staleEntry = { id: 99, projectName: '', projectIdentifier: null };
    searchIssues.mockResolvedValueOnce([]);
    function enrich_nomatch() {
      return [staleEntry];
    }
    const renderer = vi.fn();
    await enrichStaleTickets([staleEntry], enrich_nomatch, vi.fn(), renderer);
    await flushMicrotasks();
    expect(renderer).not.toHaveBeenCalled();
  });

  it('silently swallows searchIssues errors', async () => {
    const staleEntry = { id: 77, projectName: '', projectIdentifier: null };
    searchIssues.mockRejectedValueOnce(new Error('network'));
    function enrich_error() {
      return [staleEntry];
    }
    const renderer = vi.fn();
    await expect(
      enrichStaleTickets([staleEntry], enrich_error, vi.fn(), renderer)
    ).resolves.toBeUndefined();
    await flushMicrotasks();
    expect(renderer).not.toHaveBeenCalled();
  });

  it('deduplicates concurrent calls with the same getter name', async () => {
    searchIssues.mockResolvedValue([]);
    const stale = [{ id: 88, projectName: '', projectIdentifier: null }];
    function enrich_dedup() {
      return stale;
    }
    enrichStaleTickets(stale, enrich_dedup, vi.fn(), vi.fn());
    enrichStaleTickets(stale, enrich_dedup, vi.fn(), vi.fn()); // blocked by in-flight guard
    expect(searchIssues).toHaveBeenCalledTimes(1);
    await flushMicrotasks();
  });
});

// ── getFastMode ───────────────────────────────────────────────────
describe('getFastMode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns true when the key is absent (default on)', () => {
    expect(getFastMode()).toBe(true);
  });

  it("returns false when the key is set to 'false'", () => {
    localStorage.setItem('redmine_calendar_fast_mode', 'false');
    expect(getFastMode()).toBe(false);
  });

  it("returns true when the key is set to 'true'", () => {
    localStorage.setItem('redmine_calendar_fast_mode', 'true');
    expect(getFastMode()).toBe(true);
  });
});

// ── searchColumnState (Suche column render decision) ──────────────
describe('searchColumnState', () => {
  it("returns 'empty' for an empty or whitespace query", () => {
    expect(searchColumnState('', 2, [])).toBe('empty');
    expect(searchColumnState('   ', 2, [{ id: 1 }])).toBe('empty');
  });

  it("returns 'empty' when the query is shorter than the minimum", () => {
    expect(searchColumnState('a', 2, [{ id: 1 }])).toBe('empty');
  });

  it("returns 'no-match' for a long-enough query with zero results", () => {
    expect(searchColumnState('abc', 2, [])).toBe('no-match');
  });

  it("returns 'results' for a long-enough query with results", () => {
    expect(searchColumnState('abc', 2, [{ id: 1 }])).toBe('results');
  });
});

// ── Booking-modal size persistence ────────────────────────────────
describe('clampModalSize', () => {
  const viewport = { w: 1920, h: 1080 };

  it('floors a below-minimum size at MODAL_MIN_W × MODAL_MIN_H', () => {
    expect(clampModalSize({ w: 100, h: 100 }, viewport)).toEqual({
      w: MODAL_MIN_W,
      h: MODAL_MIN_H,
    });
  });

  it('caps an oversized request at 95% of the viewport', () => {
    expect(clampModalSize({ w: 9000, h: 9000 }, viewport)).toEqual({
      w: Math.round(1920 * 0.95),
      h: Math.round(1080 * 0.95),
    });
  });

  it('leaves an in-bounds size unchanged', () => {
    expect(clampModalSize({ w: 1040, h: 660 }, viewport)).toEqual({ w: 1040, h: 660 });
  });

  it('stays usable (at the floor) even on a tiny viewport', () => {
    const s = clampModalSize({ w: 1040, h: 660 }, { w: 500, h: 400 });
    expect(s.w).toBe(MODAL_MIN_W);
    expect(s.h).toBe(MODAL_MIN_H);
  });
});

describe('getModalSize / setModalSize', () => {
  it('round-trips a size through localStorage', () => {
    setModalSize({ w: 1180, h: 720 });
    expect(getModalSize()).toEqual({ w: 1180, h: 720 });
  });

  it('returns null when unset', () => {
    expect(getModalSize()).toBeNull();
  });

  it('returns null on corrupt JSON', () => {
    localStorage.setItem('redmine_calendar_booking_modal_size', '{not json');
    expect(getModalSize()).toBeNull();
  });

  it('returns null when the stored value lacks numeric w/h', () => {
    localStorage.setItem('redmine_calendar_booking_modal_size', JSON.stringify({ w: 'x' }));
    expect(getModalSize()).toBeNull();
  });
});
