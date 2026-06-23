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

  it('renders a no-results message for an empty search', () => {
    renderSearchResults([], onSelect);
    expect(document.querySelector('.lean-no-results')).not.toBeNull();
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
});
