// View layer for the time-entry modal — extracted from js/time-entry-form.js
// (feature 035). Owns the modal markup, element-ref lookup, the row / star DOM
// factories, and the three column-list renderers. The form-state machine lives
// in time-entry-form.js and injects its `onSelect` callback so this module never
// imports back from it (keeps the module graph cycle-free).

import { t } from './i18n.js';
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
/** Returns the modal + confirm-overlay markup injected once by ensureModal(). */
export function buildModalHtml() {
  return `
    <div id="${MODAL_ID}" class="lean-overlay hidden" role="dialog" aria-modal="true" aria-label="${t('modal.aria_label')}">
      <div class="lean-card">
        <div id="lean-error" class="lean-error hidden" role="alert"></div>
        <div class="lean-columns">

          <!-- Column 1: Search + ticket/time info (no actions — they live below the grid) -->
          <div class="lean-col lean-col--main">
            <div class="lean-col-heading">${t('modal.search_heading')}</div>
            <div class="lean-search-wrapper">
              <input type="text" id="lean-search" class="lean-search"
                     placeholder="${t('modal.search_placeholder')}"
                     autocomplete="off" spellcheck="false" />
              <div id="lean-search-results" class="lean-list lean-search-results hidden" role="listbox"></div>
            </div>
            <div id="lean-ticket-info" class="lean-ticket-info">
              <button id="lean-ticket-star" class="lean-star lean-ticket-star hidden" aria-label="${t('modal.add_favourite')}">☆</button>
              <div id="lean-ticket-idtitle" class="lean-ticket-idtitle lean-ticket-placeholder">${t('modal.no_ticket')}</div>
              <div id="lean-ticket-proj"    class="lean-ticket-proj"></div>
              <div class="lean-time-grid">
                <label for="lean-info-date"  class="lean-time-label">${t('modal.date_label')}</label>     <input type="date" id="lean-info-date"  class="lean-time-input">
                <label for="lean-info-start" class="lean-time-label">${t('modal.start_label')}</label>    <input type="time" id="lean-info-start" class="lean-time-input">
                <label for="lean-info-end"   class="lean-time-label">${t('modal.end_label')}</label>      <input type="time" id="lean-info-end"   class="lean-time-input">
                <span class="lean-time-label">${t('modal.duration_label')}</span> <span  id="lean-info-dur"   class="lean-time-val">—</span>
              </div>
              <input type="text" id="lean-comment" class="lean-comment" placeholder="${t('modal.comment_placeholder')}" autocomplete="off" />
            </div>
          </div>

          <!-- Column 2: Last used -->
          <div class="lean-col lean-col--secondary">
            <div class="lean-col-heading">${t('modal.last_used_heading')}</div>
            <div id="lean-list-lastused" class="lean-list" role="listbox"></div>
            <div id="lean-lastused-empty" class="lean-col-empty hidden">${t('modal.no_recent')}</div>
          </div>

          <!-- Column 3: Favourites -->
          <div class="lean-col lean-col--secondary">
            <div class="lean-col-heading">${t('modal.favourites_heading')}</div>
            <div id="lean-list-favs" class="lean-list" role="listbox"></div>
            <div id="lean-favs-empty" class="lean-col-empty hidden">${t('modal.no_favourites')}</div>
          </div>

        </div>
        <div class="lean-actions">
          <button id="lean-delete" class="btn-danger"    style="display:none">${t('modal.delete_btn')}</button>
          <button id="lean-cancel" class="btn-secondary">${t('modal.cancel_btn')}</button>
          <button id="lean-save"   class="btn-primary"   disabled>${t('modal.save_btn')}</button>
        </div>
      </div>
    </div>
    <div id="${CONFIRM_ID}" class="confirm-overlay hidden" role="dialog" aria-modal="true">
      <div class="confirm-card">
        <p>${t('modal.delete_confirm')}</p>
        <div class="confirm-actions">
          <button id="lean-confirm-cancel" class="btn-secondary">${t('modal.cancel_btn')}</button>
          <button id="lean-confirm-ok"     class="btn-danger">${t('modal.delete_btn')}</button>
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
    confirm: req(CONFIRM_ID),
    error: req('lean-error'),
    search: req('lean-search'),
    searchResults: req('lean-search-results'),
    ticketInfo: req('lean-ticket-info'),
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
/** Returns a small warning icon with tooltip for a closed ticket. */
export function makeClosedIcon() {
  const icon = document.createElement('span');
  icon.className = 'closed-ticket-icon';
  icon.textContent = '⚠';
  icon.title = t('closedTicket.tooltip');
  icon.setAttribute('aria-label', t('closedTicket.tooltip'));
  return icon;
}

/** Builds an anchor element linking to the Redmine ticket. */
export function buildTicketLink(redmineServerUrl, issue) {
  const a = document.createElement('a');
  a.href = `${redmineServerUrl}/issues/${issue.id}`;
  a.target = '_blank';
  a.rel = 'noopener';
  const text = `#${issue.id} ${issue.subject}`;
  a.textContent = text;
  a.title = text;
  return a;
}

// ── Row + star factories ──────────────────────────────────────────
/** Builds a ticket row; clicking it invokes the injected `onSelect`. */
export function makeRow(ticket, onSelect) {
  const row = document.createElement('div');
  row.className = 'lean-row';
  row.setAttribute('role', 'option');
  row.setAttribute('data-id', String(ticket.id));

  const label = document.createElement('span');
  label.className = 'lean-row-label';

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
  projSpan.title = projText;

  titleLine.append(idSpan, ' ', subjSpan);
  if (ticket.is_closed === true) titleLine.appendChild(makeClosedIcon());
  titleLine.title = `#${ticket.id} ${ticket.subject}`;
  label.append(titleLine, projSpan);
  row.append(label);

  row.addEventListener('click', () => onSelect(ticket));
  return row;
}

/** Builds a favourite-toggle star button. */
export function makeStar(ticket, isOn, onToggle) {
  const star = document.createElement('button');
  star.className = 'lean-star' + (isOn ? ' lean-star--on' : '');
  star.title = isOn ? t('modal.remove_favourite') : t('modal.add_favourite');
  star.textContent = isOn ? '★' : '☆';
  star.setAttribute('aria-label', star.title);
  star.addEventListener('click', (ev) => {
    ev.stopPropagation();
    onToggle();
  });
  return star;
}

// ── Column-list renderers ─────────────────────────────────────────
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
    const row = makeRow(ticket, onSelect);
    const isFav = favIds.has(ticket.id);
    const star = makeStar(ticket, isFav, () => {
      toggleFavourite(ticket);
      renderLastUsed(onSelect);
      renderFavs(onSelect);
      if (_refreshTicketStar) _refreshTicketStar();
    });
    row.appendChild(star);
    /** @type {HTMLElement} */ (e.listLastUsed).appendChild(row);
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
    const row = makeRow(ticket, onSelect);
    const star = makeStar(ticket, true, () => {
      toggleFavourite(ticket);
      renderFavs(onSelect);
      renderLastUsed(onSelect);
      if (_refreshTicketStar) _refreshTicketStar();
    });
    row.appendChild(star);
    /** @type {HTMLElement} */ (e.listFavs).appendChild(row);
  });
  enrichStaleTickets(favs, getFavourites, setFavourites, () => renderFavs(onSelect));
}

/**
 * @param {import('./types.d.ts').IssueResult[]} results
 * @param {import('./types.d.ts').TicketSelectCallback} onSelect
 */
export function renderSearchResults(results, onSelect) {
  const e = $e();
  e.searchResults.innerHTML = '';
  e.searchResults.classList.remove('hidden');
  nav.visibleRows = [];

  if (results.length === 0) {
    const msg = document.createElement('div');
    msg.className = 'lean-no-results';
    msg.textContent = t('modal.no_results');
    e.searchResults.appendChild(msg);
    nav.highlightedIndex = -1;
    return;
  }

  const favIds = new Set(getFavourites().map((f) => f.id));
  results.forEach((ticket) => {
    nav.visibleRows.push(ticket);
    const isFav = favIds.has(ticket.id);
    const row = makeRow(ticket, onSelect);
    const star = makeStar(ticket, isFav, () => {
      toggleFavourite(ticket);
      renderSearchResults([...nav.visibleRows], onSelect);
      renderFavs(onSelect);
      renderLastUsed(onSelect);
      if (_refreshTicketStar) _refreshTicketStar();
    });
    row.appendChild(star);
    /** @type {HTMLElement} */ (e.searchResults).appendChild(row);
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
 * Syncs the ticket-info-panel star with the current favourite state.
 * Called by `updateTicketInfo()` in time-entry-form.js whenever the
 * selected ticket changes or a favourite toggle occurs.
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
  btn.textContent = isFav ? '★' : '☆';
  btn.classList.toggle('lean-star--on', isFav);
  btn.setAttribute('aria-label', isFav ? t('modal.remove_favourite') : t('modal.add_favourite'));
  btn.classList.remove('hidden');
  // Replace node to drop any previous click listener without keeping a ref.
  const fresh = /** @type {HTMLButtonElement} */ (btn.cloneNode(true));
  btn.replaceWith(fresh);
  fresh.addEventListener('click', (ev) => {
    ev.stopPropagation();
    toggleFavourite(ticket);
    renderFavs(onSelect);
    renderLastUsed(onSelect);
    updateTicketStar(ticket, onSelect);
  });
}

/** @param {HTMLElement} modalEl  @param {{ subject:string, startTime:string, endTime:string, source?: string }|undefined} sourceEvent */
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
  const info = document.createElement('div');
  info.textContent = `${DOMPurify.sanitize(sourceEvent.subject, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })} · ${sourceEvent.startTime}–${sourceEvent.endTime}`;
  div.appendChild(label);
  div.appendChild(info);
  const search = modalEl.querySelector('#lean-search');
  if (search) search.before(div);
}
