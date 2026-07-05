// View layer for the time-entry modal — extracted from js/time-entry-form.js
// (feature 035) and restructured for feature 055 (Booking Modal Redesign) into
// two always-visible phases on one screen: Phase 1 (Suche / Zuletzt verwendet /
// Favoriten) above Phase 2 (selected ticket + star / date-time-duration /
// comment). Owns the modal markup, element-ref lookup, the row / star DOM
// factories, and the column-list renderers. The form-state machine lives in
// time-entry-form.js and injects its `onSelect` callback so this module never
// imports back from it (keeps the module graph cycle-free).

import { t } from './i18n.js';
import { buildInlineWarningBadge, attachLabelTooltip } from './anomaly-render.js';
import { fetchIssueStatuses, formatProject } from './redmine-api.js';
import {
  nav,
  getFavourites,
  setFavourites,
  getLastUsed,
  setLastUsed,
  toggleFavourite,
  enrichStaleTickets,
} from './time-entry-form-utils.js';

export const MODAL_ID = 'lean-time-modal';
const CONFIRM_ID = 'lean-confirm-modal';

// Callback set by time-entry-form.js on form open so star toggles in any column
// can refresh the ticket-info star without creating a circular import.
/** @type {(() => void)|null} */
let _refreshTicketStar = null;
export function setTicketStarRefresher(fn) {
  _refreshTicketStar = fn;
}

/** @param {string} id */
function req(id) {
  const el = document.getElementById(id);
  /* c8 ignore next — only reachable when modal HTML was not injected correctly */
  if (!el) throw new TypeError(`[time-entry-form-view] Required DOM element missing: #${id}`);
  return el;
}

// ── Modal HTML ────────────────────────────────────────────────────
// Fluent "Search" glyph (Fluent System Icons, 20px grid), token-coloured,
// decorative (aria-hidden) — sits in the search input's left padding.
const SEARCH_ICON_SVG = `
        <svg class="lean-search-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 20 20" fill="none">
          <path d="M13.0192 13.7267C11.8398 14.7228 10.3179 15.3214 8.65692 15.3214C4.95394 15.3214 1.95264 12.3201 1.95264 8.61712C1.95264 4.91414 4.95394 1.91284 8.65692 1.91284C12.3599 1.91284 15.3612 4.91414 15.3612 8.61712C15.3612 10.2803 14.7614 11.8041 13.7628 12.9842L13.9762 13.1977L18.5765 17.7979C18.7913 18.0128 18.7913 18.361 18.5765 18.5758C18.3617 18.7906 18.0134 18.7906 17.7986 18.5758L13.1984 13.9756L13.0192 13.7267ZM8.65692 14.1571C11.7171 14.1571 14.1969 11.6773 14.1969 8.61712C14.1969 5.55693 11.7171 3.07712 8.65692 3.07712C5.59673 3.07712 3.11692 5.55693 3.11692 8.61712C3.11692 11.6773 5.59673 14.1571 8.65692 14.1571Z" fill="currentColor" />
        </svg>`;

/** A Phase-1 list column (Zuletzt verwendet / Favoriten): label + list box + empty msg. */
function listColumn(labelKey, listId, emptyId, emptyKey) {
  return `
          <div class="lean-col">
            <div class="lean-col-label">${t(labelKey)}</div>
            <div class="lean-listbox">
              <div id="${listId}" class="lean-list"></div>
              <div id="${emptyId}" class="lean-col-empty hidden">${t(emptyKey)}</div>
            </div>
          </div>`;
}

/** Phase 1: the "1 · Ticket auswählen" region — Suche + Zuletzt + Favoriten. */
function phase1Html() {
  return `
      <div class="lean-phase lean-phase1">
        <div class="lean-phase-heading">${t('modal.phase1_heading')}</div>
        <div class="lean-grid">
          <div class="lean-col lean-col--search">
            <div class="lean-col-label">${t('modal.search_heading')}</div>
            <div class="lean-search-wrap">${SEARCH_ICON_SVG}
              <input type="text" id="lean-search" class="lean-search"
                     placeholder="${t('modal.search_placeholder')}"
                     aria-label="${t('modal.search_heading')}"
                     autocomplete="off" spellcheck="false" />
            </div>
            <div class="lean-listbox">
              <div id="lean-search-results" class="lean-list"></div>
              <div id="lean-search-empty" class="lean-col-empty">${t('modal.search_empty')}</div>
            </div>
          </div>
          ${listColumn('modal.last_used_heading', 'lean-list-lastused', 'lean-lastused-empty', 'modal.no_recent')}
          ${listColumn('modal.favourites_heading', 'lean-list-favs', 'lean-favs-empty', 'modal.no_favourites')}
        </div>
      </div>`;
}

/** Phase 2: the "2 · Details der Buchung" region — selected ticket / date-time / comment. */
function phase2Html() {
  return `
      <div class="lean-phase lean-phase2">
        <div class="lean-phase-heading">${t('modal.phase2_heading')}</div>
        <div class="lean-grid">
          <div class="lean-col lean-col--selected">
            <div class="lean-col-label">${t('modal.selected_ticket_label')}</div>
            <div class="lean-selected-row">
              <div class="lean-ticket-textblock">
                <div id="lean-ticket-idtitle" class="lean-ticket-idtitle lean-ticket-placeholder">${t('modal.no_ticket')}</div>
                <div id="lean-ticket-proj" class="lean-ticket-proj"></div>
              </div>
              <button id="lean-ticket-star" type="button" class="lean-star lean-ticket-star hidden" aria-label="${t('modal.add_favourite')}" aria-pressed="false">☆</button>
            </div>
          </div>
          <div class="lean-col lean-col--datetime">
            <label class="lean-field lean-field--full">
              <span class="lean-field-label">${t('modal.date_label')}</span>
              <input type="date" id="lean-info-date" class="lean-time-input">
            </label>
            <div class="lean-field-row">
              <label class="lean-field">
                <span class="lean-field-label">${t('modal.start_label')}</span>
                <input type="time" id="lean-info-start" class="lean-time-input">
              </label>
              <label class="lean-field">
                <span class="lean-field-label">${t('modal.end_label')}</span>
                <input type="time" id="lean-info-end" class="lean-time-input">
              </label>
              <div class="lean-field">
                <span class="lean-field-label">${t('modal.duration_label')}</span>
                <span id="lean-info-dur" class="lean-time-val">—</span>
              </div>
            </div>
          </div>
          <label class="lean-col lean-col--comment">
            <span class="lean-col-label">${t('modal.comment_label')}</span>
            <textarea id="lean-comment" class="lean-comment" autocomplete="off"></textarea>
          </label>
        </div>
      </div>`;
}

/** Returns the modal + confirm-overlay markup injected once by ensureModal(). */
export function buildModalHtml() {
  return `
    <div id="${MODAL_ID}" class="lean-overlay hidden" role="dialog" aria-modal="true" aria-label="${t('modal.aria_label')}">
      <div class="lean-card">
        <div class="lean-header">
          <div class="lean-title">${t('modal.title_add')}</div>
          <button id="lean-close" type="button" class="lean-close" aria-label="${t('modal.close_aria')}">✕</button>
        </div>
        <div id="lean-error" class="lean-error hidden" role="alert"></div>
        <div class="lean-scroll">
          ${phase1Html()}
          ${phase2Html()}
        </div>
        <div class="lean-actions">
          <button id="lean-delete" type="button" class="btn-danger" style="display:none">${t('modal.delete_btn')}</button>
          <button id="lean-cancel" type="button" class="btn-secondary">${t('modal.cancel_btn')}</button>
          <button id="lean-save"   type="button" class="btn-primary" disabled>${t('modal.save_btn')}</button>
        </div>
      </div>
    </div>
    <div id="${CONFIRM_ID}" class="confirm-overlay hidden" role="dialog" aria-modal="true">
      <div class="confirm-card">
        <p>${t('modal.delete_confirm')}</p>
        <div class="confirm-actions">
          <button id="lean-confirm-cancel" type="button" class="btn-secondary">${t('modal.cancel_btn')}</button>
          <button id="lean-confirm-ok"     type="button" class="btn-danger">${t('modal.delete_btn')}</button>
        </div>
      </div>
    </div>
  `;
}

// ── Element refs ──────────────────────────────────────────────────
/**
 * Collects the modal's element references into a flat object.
 * Throws `TypeError` if any required element is absent (indicates a broken DOM injection).
 */
export function $e() {
  return {
    modal: req(MODAL_ID),
    card: req(MODAL_ID).querySelector('.lean-card'),
    confirm: req(CONFIRM_ID),
    error: req('lean-error'),
    closeBtn: req('lean-close'),
    search: req('lean-search'),
    searchResults: req('lean-search-results'),
    searchEmpty: req('lean-search-empty'),
    ticketStar: req('lean-ticket-star'),
    ticketIdTitle: req('lean-ticket-idtitle'),
    ticketProj: req('lean-ticket-proj'),
    infoDate: req('lean-info-date'),
    infoStart: req('lean-info-start'),
    infoEnd: req('lean-info-end'),
    infoDur: req('lean-info-dur'),
    listLastUsed: req('lean-list-lastused'),
    lastUsedEmpty: req('lean-lastused-empty'),
    listFavs: req('lean-list-favs'),
    favsEmpty: req('lean-favs-empty'),
    saveBtn: req('lean-save'),
    cancelBtn: req('lean-cancel'),
    deleteBtn: req('lean-delete'),
    confirmCancelBtn: req('lean-confirm-cancel'),
    confirmOkBtn: req('lean-confirm-ok'),
  };
}

// ── Closed-ticket icon ────────────────────────────────────────────
let _closedIconSeq = 0;

/**
 * Session cache of fetched closed-ticket status (ticket id → is_closed). Lets
 * the closed warning icon survive list re-renders (e.g. toggling a favourite,
 * which rebuilds the rows) without refetching — makeRow consults it directly.
 * @type {Map<number, boolean>}
 */
const _closedStatusCache = new Map();

/**
 * Returns the closed-ticket warning indicator for the modal. Reuses the shared
 * calendar/planning warning badge (SVG + dark tooltip) for visual consistency,
 * wrapped in an inline `.closed-ticket-icon` span so it sits next to the title
 * rather than in a corner. The wrapper class is kept for existing selectors and
 * the dedup check in enrichClosedStatusOnLists.
 */
export function makeClosedIcon() {
  const reason = t('closedTicket.tooltip');
  const wrap = document.createElement('span');
  wrap.className = 'closed-ticket-icon';
  // Only the badge is placed inline; its tooltip is portaled to <body> on show.
  const { badge } = buildInlineWarningBadge(`closed-ticket-tip-${++_closedIconSeq}`, reason);
  wrap.appendChild(badge);
  return wrap;
}

/** Builds an anchor element linking to the Redmine ticket. */
export function buildTicketLink(redmineServerUrl, issue) {
  const a = document.createElement('a');
  a.href = `${redmineServerUrl}/issues/${issue.id}`;
  a.target = '_blank';
  a.rel = 'noopener';
  const text = `#${issue.id} ${issue.subject}`;
  a.textContent = text;
  attachLabelTooltip(a, text);
  return a;
}

// ── Row + star factories ──────────────────────────────────────────
/**
 * Builds a ticket row: a `.lean-row-wrap` flex container holding a real
 * selecting `<button>` (keyboard-focusable, activates onSelect) and — appended
 * by the caller — a sibling favourite-star `<button>`. Row and star are siblings
 * (never button-in-button) so both are valid focusable controls (FR-006).
 * Clicking the row button invokes the injected `onSelect`.
 */
export function makeRow(ticket, onSelect) {
  const wrap = document.createElement('div');
  wrap.className = 'lean-row-wrap';

  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'lean-row';
  row.setAttribute('data-id', String(ticket.id));

  const titleLine = document.createElement('span');
  titleLine.className = 'lean-row-title';

  const idSpan = document.createElement('span');
  idSpan.className = 'lean-row-id';
  idSpan.textContent = `#${ticket.id}`;

  const subjSpan = document.createElement('span');
  subjSpan.className = 'lean-row-subject';
  subjSpan.textContent = ticket.subject;

  const projSpan = document.createElement('span');
  projSpan.className = 'lean-row-project';
  const projText = formatProject(ticket.projectIdentifier, ticket.projectName);
  projSpan.textContent = projText;

  titleLine.append(idSpan, ' ', subjSpan);
  if (ticket.is_closed === true || _closedStatusCache.get(ticket.id) === true) {
    titleLine.appendChild(makeClosedIcon());
  }
  row.append(titleLine, projSpan);
  // Full "#id subject — project" as a native tooltip (FR-005).
  row.title = `#${ticket.id} ${ticket.subject} — ${projText}`;

  row.addEventListener('click', () => onSelect(ticket));
  wrap.append(row);
  return wrap;
}

/** Builds a favourite-toggle star button (sibling of the row button). */
export function makeStar(ticket, isOn, onToggle) {
  const star = document.createElement('button');
  star.type = 'button';
  star.className = 'lean-star' + (isOn ? ' lean-star--on' : '');
  const starLabel = isOn ? t('modal.remove_favourite') : t('modal.add_favourite');
  star.textContent = isOn ? '★' : '☆';
  star.setAttribute('aria-label', starLabel);
  star.setAttribute('aria-pressed', String(isOn));
  attachLabelTooltip(star, starLabel);
  star.addEventListener('click', (ev) => {
    ev.stopPropagation();
    onToggle();
  });
  return star;
}

/** Toggles the `.lean-row--selected` accent on every list row matching `id`. */
export function markSelectedRow(id) {
  document.querySelectorAll(`#${MODAL_ID} .lean-row[data-id]`).forEach((row) => {
    const el = /** @type {HTMLElement} */ (row);
    el.classList.toggle('lean-row--selected', id != null && el.dataset.id === String(id));
  });
}

// ── Column-list renderers ─────────────────────────────────────────
/**
 * Appends the shared row + star pair to a list container.
 * @param {HTMLElement} list
 */
function appendRow(list, ticket, isFav, onSelect, onToggle) {
  const wrap = makeRow(ticket, onSelect);
  wrap.appendChild(makeStar(ticket, isFav, onToggle));
  list.appendChild(wrap);
}

/** @param {import('./types.d.ts').TicketSelectCallback} onSelect */
export function renderLastUsed(onSelect) {
  const e = $e();
  const entries = getLastUsed();
  e.listLastUsed.innerHTML = '';
  if (entries.length === 0) {
    e.lastUsedEmpty.classList.remove('hidden');
    return;
  }
  e.lastUsedEmpty.classList.add('hidden');
  const favIds = new Set(getFavourites().map((f) => f.id));
  entries.forEach((ticket) => {
    appendRow(
      /** @type {HTMLElement} */ (e.listLastUsed),
      ticket,
      favIds.has(ticket.id),
      onSelect,
      () => {
        toggleFavourite(ticket);
        renderLastUsed(onSelect);
        renderFavs(onSelect);
        if (_refreshTicketStar) _refreshTicketStar();
      }
    );
  });
  enrichStaleTickets(entries, getLastUsed, setLastUsed, () => renderLastUsed(onSelect));
}

/** @param {import('./types.d.ts').TicketSelectCallback} onSelect */
export function renderFavs(onSelect) {
  const e = $e();
  const favs = getFavourites();
  e.listFavs.innerHTML = '';
  if (favs.length === 0) {
    e.favsEmpty.classList.remove('hidden');
    return;
  }
  e.favsEmpty.classList.add('hidden');
  favs.forEach((ticket) => {
    appendRow(/** @type {HTMLElement} */ (e.listFavs), ticket, true, onSelect, () => {
      toggleFavourite(ticket);
      renderFavs(onSelect);
      renderLastUsed(onSelect);
      if (_refreshTicketStar) _refreshTicketStar();
    });
  });
  enrichStaleTickets(favs, getFavourites, setFavourites, () => renderFavs(onSelect));
}

/** Shows the Suche column's "type to search" pre-query empty state. */
export function showSearchEmpty() {
  const e = $e();
  e.searchResults.innerHTML = '';
  nav.visibleRows = [];
  e.searchEmpty.textContent = t('modal.search_empty');
  e.searchEmpty.classList.remove('hidden');
}

/**
 * Renders search results inline inside the Suche column list box. Zero results
 * shows the distinct "no matches" message (not the "type to search" state).
 * @param {import('./types.d.ts').IssueResult[]} results
 * @param {import('./types.d.ts').TicketSelectCallback} onSelect
 */
export function renderSearchResults(results, onSelect) {
  const e = $e();
  e.searchResults.innerHTML = '';
  nav.visibleRows = [];

  if (results.length === 0) {
    e.searchEmpty.textContent = t('modal.search_no_match');
    e.searchEmpty.classList.remove('hidden');
    nav.highlightedIndex = -1;
    return;
  }

  e.searchEmpty.classList.add('hidden');
  const favIds = new Set(getFavourites().map((f) => f.id));
  results.forEach((ticket) => {
    nav.visibleRows.push(ticket);
    appendRow(
      /** @type {HTMLElement} */ (e.searchResults),
      ticket,
      favIds.has(ticket.id),
      onSelect,
      () => {
        toggleFavourite(ticket);
        renderSearchResults([...nav.visibleRows], onSelect);
        renderFavs(onSelect);
        renderLastUsed(onSelect);
        if (_refreshTicketStar) _refreshTicketStar();
      }
    );
  });

  nav.highlightedIndex = 0;
  applyHighlight();
}

// ── Keyboard-navigation highlight ─────────────────────────────────
export function applyHighlight() {
  const e = $e();
  // Collect all navigable rows in order (search OR last-used + favs)
  const allRows = nav.searchMode
    ? [...e.searchResults.querySelectorAll('.lean-row')]
    : [
        ...e.listLastUsed.querySelectorAll('.lean-row'),
        ...e.listFavs.querySelectorAll('.lean-row'),
      ];

  allRows.forEach((r, i) => {
    r.classList.toggle('lean-row--highlighted', i === nav.highlightedIndex);
    if (i === nav.highlightedIndex) r.scrollIntoView({ block: 'nearest' });
  });
}

export function buildEmptyStateVisibleRows() {
  const e = $e();
  nav.visibleRows = [];
  e.listLastUsed.querySelectorAll('.lean-row').forEach((r) => {
    /* c8 ignore next — dataset.id is always set by makeRow(); '' fallback is unreachable in tests */
    const id = parseInt(/** @type {HTMLElement} */ (r).dataset.id ?? '', 10);
    const lu = getLastUsed().find((entry) => entry.id === id);
    if (lu) nav.visibleRows.push(lu);
  });
  e.listFavs.querySelectorAll('.lean-row').forEach((r) => {
    /* c8 ignore next — dataset.id is always set by makeRow(); '' fallback is unreachable in tests */
    const id = parseInt(/** @type {HTMLElement} */ (r).dataset.id ?? '', 10);
    const fv = getFavourites().find((entry) => entry.id === id);
    if (fv) nav.visibleRows.push(fv);
  });
}

/**
 * Batch-fetch closed status for all rows in the last-used + favourites lists
 * and insert the warning icon next to any closed ticket's title. Fire-and-forget.
 */
export async function enrichClosedStatusOnLists() {
  const e = $e();
  const ids = [];
  [e.listLastUsed, e.listFavs].forEach((list) => {
    list.querySelectorAll('.lean-row[data-id]').forEach((row) => {
      const id = parseInt(/** @type {HTMLElement} */ (row).dataset.id ?? '', 10);
      if (id) ids.push(id);
    });
  });
  if (!ids.length) return;
  const closedMap = await fetchIssueStatuses([...new Set(ids)]);
  if (!closedMap.size) return;
  // Cache so re-renders (favourite toggles) keep the icon via makeRow.
  closedMap.forEach((isClosed, id) => _closedStatusCache.set(id, isClosed));
  [e.listLastUsed, e.listFavs].forEach((list) => {
    list.querySelectorAll('.lean-row[data-id]').forEach((row) => {
      const id = parseInt(/** @type {HTMLElement} */ (row).dataset.id ?? '', 10);
      if (closedMap.get(id) !== true) return;
      const titleLine = row.querySelector('.lean-row-title');
      if (titleLine && !titleLine.querySelector('.closed-ticket-icon')) {
        titleLine.appendChild(makeClosedIcon());
      }
    });
  });
}

/**
 * Syncs the Phase-2 selected-ticket star with the current favourite state.
 * Called by `updateTicketInfo()` in time-entry-form.js whenever the selected
 * ticket changes or a favourite toggle occurs.
 * @param {import('./types.d.ts').IssueResult|null} ticket
 * @param {import('./types.d.ts').TicketSelectCallback} onSelect
 */
export function updateTicketStar(ticket, onSelect) {
  const btn = document.getElementById('lean-ticket-star');
  if (!btn) return;
  if (!ticket) {
    btn.classList.add('hidden');
    return;
  }
  const isFav = getFavourites().some((f) => f.id === ticket.id);
  const starLabel = isFav ? t('modal.remove_favourite') : t('modal.add_favourite');
  btn.textContent = isFav ? '★' : '☆';
  btn.classList.toggle('lean-star--on', isFav);
  btn.setAttribute('aria-label', starLabel);
  btn.setAttribute('aria-pressed', String(isFav));
  btn.classList.remove('hidden');
  // Replace node to drop any previous click listener without keeping a ref.
  const fresh = /** @type {HTMLButtonElement} */ (btn.cloneNode(true));
  btn.replaceWith(fresh);
  // Same custom favourite tooltip as the list-row stars (makeStar) — cloneNode
  // does not carry over the previous node's tooltip listeners, so re-attach here.
  attachLabelTooltip(fresh, starLabel);
  fresh.addEventListener('click', (ev) => {
    ev.stopPropagation();
    toggleFavourite(ticket);
    renderFavs(onSelect);
    renderLastUsed(onSelect);
    updateTicketStar(ticket, onSelect);
  });
}

/** @param {HTMLElement} modalEl  @param {number|undefined} bulkDayCount */
export function renderBulkDayNotice(modalEl, bulkDayCount) {
  modalEl.querySelectorAll('.bulk-day-notice').forEach((el) => el.remove());
  const isBulk = !!bulkDayCount && bulkDayCount > 1;
  // A multi-day booking always starts on the prefilled date and fans out Mon–Fri;
  // letting the user change the date breaks the expansion, so lock it. `disabled`
  // (not `readonly`) is used because date inputs ignore `readonly` for the picker;
  // the form reads the value via JS, so disabling does not affect submission.
  const dateInput = /** @type {HTMLInputElement|null} */ (modalEl.querySelector('#lean-info-date'));
  if (dateInput) dateInput.disabled = isBulk;
  if (!isBulk) return;
  const p = document.createElement('p');
  p.className = 'bulk-day-notice';
  p.textContent = t('outlook.bulk_day_notice', { n: bulkDayCount });
  // At the top of the date/time column, above the date field it qualifies.
  const col = modalEl.querySelector('.lean-col--datetime');
  if (col) col.prepend(p);
}

/**
 * @typedef {{ subject:string, when:string, source?:string }} SourceEventInfo
 *   `when` is the same `start–end (duration)` string shown on the planning card
 *   (built by `buildSourceEventInfo` via `formatEventDurationLine`).
 */

/** @param {HTMLElement} modalEl  @param {SourceEventInfo|undefined} sourceEvent */
export function renderSourceEventInfo(modalEl, sourceEvent) {
  modalEl.querySelectorAll('.modal-source-event').forEach((el) => el.remove());
  if (!sourceEvent) return;
  const div = document.createElement('div');
  div.className = 'modal-source-event';
  const label = document.createElement('div');
  label.className = 'modal-source-event__label';
  /* c8 ignore next 3 */
  label.textContent = sourceEvent.source
    ? t('planning.modal_source_info_from', { source: sourceEvent.source })
    : t('planning.modal_source_info');
  const subjectEl = document.createElement('div');
  subjectEl.className = 'modal-source-event__subject';
  subjectEl.textContent = DOMPurify.sanitize(sourceEvent.subject, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  div.appendChild(label);
  div.appendChild(subjectEl);
  // Duration on its own line so a long subject doesn't crowd it.
  if (sourceEvent.when) {
    const whenEl = document.createElement('div');
    whenEl.className = 'modal-source-event__when';
    whenEl.textContent = sourceEvent.when;
    div.appendChild(whenEl);
  }
  // Contextual to the whole booking — pin it at the top of the scroll region.
  const scroll = modalEl.querySelector('.lean-scroll');
  if (scroll) scroll.prepend(div);
}
