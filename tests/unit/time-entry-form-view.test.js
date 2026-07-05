/** @vitest-environment jsdom */
// Focused jsdom coverage for the column-list renderers + ticket-info star in
// time-entry-form-view.js — the favourite-toggle and closed-status paths that
// were previously exercised only through the Playwright suite.
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../js/i18n.js', () => ({ t: (k) => k, locale: 'en', formatDate: (d) => d }));

vi.mock('../../js/redmine-api.js', () => ({
  formatProject: (id, name) => (id ? `${id} — ${name ?? ''}` : (name ?? '')),
  fetchIssueStatuses: vi.fn(async () => new Map()),
  searchIssues: vi.fn(async () => []),
}));

// Keep the real localStorage-backed favourites/last-used helpers; only stub the
// async stale-ticket enrichment so renders stay synchronous.
vi.mock('../../js/time-entry-form-utils.js', async (orig) => {
  const actual = await orig();
  return { ...actual, enrichStaleTickets: vi.fn() };
});

import {
  buildModalHtml,
  makeRow,
  makeStar,
  markSelectedRow,
  renderLastUsed,
  renderFavs,
  renderSearchResults,
  updateTicketStar,
  setTicketStarRefresher,
  enrichClosedStatusOnLists,
  renderBulkDayNotice,
} from '../../js/time-entry-form-view.js';
import { getFavourites, nav } from '../../js/time-entry-form-utils.js';
import { STORAGE_KEY_FAVOURITES, STORAGE_KEY_LAST_USED } from '../../js/config.js';
import { fetchIssueStatuses } from '../../js/redmine-api.js';

const onSelect = vi.fn();
const TICK = { id: 42, subject: 'Closed thing', projectName: 'Proj', projectIdentifier: 'p' };

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = buildModalHtml();
  setTicketStarRefresher(null);
  onSelect.mockClear();
});

describe('column-list renderers', () => {
  it('shows the empty-state message when there are no Last Used / Favourites', () => {
    renderLastUsed(onSelect);
    renderFavs(onSelect);
    expect(document.getElementById('lean-lastused-empty').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('lean-favs-empty').classList.contains('hidden')).toBe(false);
  });

  it('toggling a Last Used star adds the ticket to favourites and re-renders', () => {
    localStorage.setItem(STORAGE_KEY_LAST_USED, JSON.stringify([TICK]));
    renderLastUsed(onSelect);
    const star = document.querySelector('#lean-list-lastused .lean-star');
    expect(star).not.toBeNull();
    expect(getFavourites()).toHaveLength(0);
    star.click();
    expect(getFavourites().map((f) => f.id)).toContain(42);
    expect(document.querySelector('#lean-list-favs .lean-row')).not.toBeNull();
  });

  it('toggling a Favourites star removes it', () => {
    localStorage.setItem(STORAGE_KEY_FAVOURITES, JSON.stringify([TICK]));
    renderFavs(onSelect);
    document.querySelector('#lean-list-favs .lean-star').click();
    expect(getFavourites()).toHaveLength(0);
  });

  it('toggling a search-result star updates favourites', () => {
    nav.visibleRows = [TICK];
    renderSearchResults([TICK], onSelect);
    document.querySelector('#lean-search-results .lean-star').click();
    expect(getFavourites().map((f) => f.id)).toContain(42);
  });

  it('renders a distinct "no matches" message for an empty search', () => {
    renderSearchResults([], onSelect);
    const empty = document.getElementById('lean-search-empty');
    expect(empty.classList.contains('hidden')).toBe(false);
    expect(empty.textContent).toBe('modal.search_no_match');
  });

  it('invokes the ticket-star refresher when a star toggle occurs', () => {
    const refresh = vi.fn();
    setTicketStarRefresher(refresh);
    localStorage.setItem(STORAGE_KEY_LAST_USED, JSON.stringify([TICK]));
    renderLastUsed(onSelect);
    document.querySelector('#lean-list-lastused .lean-star').click();
    expect(refresh).toHaveBeenCalled();
  });
});

describe('makeRow / makeStar (accessible controls)', () => {
  it('builds the row as a real <button> with the full text as a title tooltip', () => {
    const wrap = makeRow(TICK, onSelect);
    const row = wrap.querySelector('.lean-row');
    expect(row.tagName).toBe('BUTTON');
    expect(row.type).toBe('button');
    expect(row.dataset.id).toBe('42');
    expect(row.title).toBe('#42 Closed thing — p — Proj');
    expect(row.querySelector('.lean-row-subject').textContent).toBe('Closed thing');
    row.click();
    expect(onSelect).toHaveBeenCalledWith(TICK);
  });

  it('builds the star as a sibling <button> (never nested in the row) with aria-pressed', () => {
    const wrap = makeRow(TICK, onSelect);
    const star = makeStar(TICK, true, vi.fn());
    wrap.appendChild(star);
    const row = wrap.querySelector('.lean-row');
    // Row and star are siblings — no button inside a button.
    expect(row.querySelector('button')).toBeNull();
    expect(star.tagName).toBe('BUTTON');
    expect(star.getAttribute('aria-pressed')).toBe('true');
    expect(star.parentElement).toBe(wrap);
  });

  it('markSelectedRow accents only the matching row across the lists', () => {
    localStorage.setItem(STORAGE_KEY_LAST_USED, JSON.stringify([TICK, { ...TICK, id: 7 }]));
    renderLastUsed(onSelect);
    markSelectedRow(42);
    const rows = [...document.querySelectorAll('#lean-list-lastused .lean-row')];
    const selected = rows.filter((r) => r.classList.contains('lean-row--selected'));
    expect(selected).toHaveLength(1);
    expect(selected[0].dataset.id).toBe('42');
    markSelectedRow(null);
    expect(document.querySelectorAll('.lean-row--selected')).toHaveLength(0);
  });
});

describe('updateTicketStar', () => {
  it('shows the star and toggles the favourite on click', () => {
    updateTicketStar(TICK, onSelect);
    const star = document.getElementById('lean-ticket-star');
    expect(star.classList.contains('hidden')).toBe(false);
    star.click();
    expect(getFavourites().map((f) => f.id)).toContain(42);
  });

  it('hides the star when no ticket is selected', () => {
    updateTicketStar(null, onSelect);
    expect(document.getElementById('lean-ticket-star').classList.contains('hidden')).toBe(true);
  });

  it('is a no-op when the star element is absent', () => {
    document.getElementById('lean-ticket-star').remove();
    expect(() => updateTicketStar(TICK, onSelect)).not.toThrow();
  });
});

describe('enrichClosedStatusOnLists', () => {
  it('appends the closed icon and caches status so a re-render keeps it', async () => {
    localStorage.setItem(STORAGE_KEY_LAST_USED, JSON.stringify([TICK]));
    renderLastUsed(onSelect);
    fetchIssueStatuses.mockResolvedValueOnce(new Map([[42, true]]));
    await enrichClosedStatusOnLists();
    expect(document.querySelector('#lean-list-lastused .closed-ticket-icon')).not.toBeNull();

    // Re-render rebuilds the rows; the cached status keeps the icon (makeRow path).
    renderLastUsed(onSelect);
    expect(document.querySelector('#lean-list-lastused .closed-ticket-icon')).not.toBeNull();
  });

  it('returns early when there are no rows to check', async () => {
    await expect(enrichClosedStatusOnLists()).resolves.toBeUndefined();
  });
});

describe('renderBulkDayNotice', () => {
  it('renders a banner paragraph when bulkDayCount > 1', () => {
    renderBulkDayNotice(document.querySelector('#lean-time-modal'), 5);
    const p = document.querySelector('.bulk-day-notice');
    expect(p).not.toBeNull();
    expect(p.textContent).toBe('outlook.bulk_day_notice');
  });

  it('does not render a banner when bulkDayCount is undefined', () => {
    renderBulkDayNotice(document.querySelector('#lean-time-modal'), undefined);
    expect(document.querySelector('.bulk-day-notice')).toBeNull();
  });

  it('does not render a banner when bulkDayCount is 1', () => {
    renderBulkDayNotice(document.querySelector('#lean-time-modal'), 1);
    expect(document.querySelector('.bulk-day-notice')).toBeNull();
  });

  it('removes existing banners before rendering a new one', () => {
    const modalEl = document.querySelector('#lean-time-modal');
    renderBulkDayNotice(modalEl, 3);
    renderBulkDayNotice(modalEl, 7);
    expect(document.querySelectorAll('.bulk-day-notice')).toHaveLength(1);
  });

  it('renders the banner at the top of the date/time column', () => {
    const modalEl = document.querySelector('#lean-time-modal');
    renderBulkDayNotice(modalEl, 4);
    const p = document.querySelector('.bulk-day-notice');
    const col = document.querySelector('.lean-col--datetime');
    // Banner is prepended as the first child of the date/time column, above the date field.
    expect(p.parentElement).toBe(col);
    expect(col.firstElementChild).toBe(p);
  });

  it('locks (disables) the date input for bulk bookings and unlocks otherwise', () => {
    const modalEl = document.querySelector('#lean-time-modal');
    const dateInput = document.querySelector('#lean-info-date');
    renderBulkDayNotice(modalEl, 4);
    expect(dateInput.disabled).toBe(true);
    renderBulkDayNotice(modalEl, 1);
    expect(dateInput.disabled).toBe(false);
    renderBulkDayNotice(modalEl, undefined);
    expect(dateInput.disabled).toBe(false);
  });
});
