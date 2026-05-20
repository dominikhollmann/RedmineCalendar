// @ts-nocheck — DOM-heavy module; runtime checks suffice.
// View layer for the time-entry modal — extracted from js/time-entry-form.js
// (feature 035). Owns the modal markup, element-ref lookup, the row / star DOM
// factories, and the three column-list renderers. The form-state machine lives
// in time-entry-form.js and injects its `onSelect` callback so this module never
// imports back from it (keeps the module graph cycle-free).

import { t } from './i18n.js';
import { formatProject } from './redmine-api.js';
import {
  nav,
  getFavourites,
  setFavourites,
  getLastUsed,
  setLastUsed,
  toggleFavourite,
  enrichStaleTickets,
} from './time-entry-form-utils.js';

const MODAL_ID = 'lean-time-modal';
const CONFIRM_ID = 'lean-confirm-modal';

// ── Modal HTML ────────────────────────────────────────────────────
/** Returns the modal + confirm-overlay markup injected once by ensureModal(). */
export function buildModalHtml() {
  return `
    <div id="${MODAL_ID}" class="lean-overlay hidden" role="dialog" aria-modal="true" aria-label="${t('modal.aria_label')}">
      <div class="lean-card">
        <div id="lean-error" class="lean-error hidden" role="alert"></div>
        <div class="lean-columns">

          <!-- Column 1: Search + ticket/time info + actions -->
          <div class="lean-col lean-col--main">
            <div class="lean-col-heading">${t('modal.search_heading')}</div>
            <input type="text" id="lean-search" class="lean-search"
                   placeholder="${t('modal.search_placeholder')}"
                   autocomplete="off" spellcheck="false" />
            <div id="lean-search-results" class="lean-list lean-search-results hidden" role="listbox"></div>
            <div class="lean-col-bottom">
              <div id="lean-ticket-info" class="lean-ticket-info">
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
              <div class="lean-actions">
                <button id="lean-delete" class="btn-danger"    style="display:none">${t('modal.delete_btn')}</button>
                <button id="lean-cancel" class="btn-secondary">${t('modal.cancel_btn')}</button>
                <button id="lean-save"   class="btn-primary"   disabled>${t('modal.save_btn')}</button>
              </div>
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
/** Collects the modal's element references into a flat object. */
export function $e() {
  return {
    modal: document.getElementById(MODAL_ID),
    confirm: document.getElementById(CONFIRM_ID),
    error: document.getElementById('lean-error'),
    search: document.getElementById('lean-search'),
    searchResults: document.getElementById('lean-search-results'),
    ticketInfo: document.getElementById('lean-ticket-info'),
    ticketIdTitle: document.getElementById('lean-ticket-idtitle'),
    ticketProj: document.getElementById('lean-ticket-proj'),
    infoDate: document.getElementById('lean-info-date'),
    infoStart: document.getElementById('lean-info-start'),
    infoEnd: document.getElementById('lean-info-end'),
    infoDur: document.getElementById('lean-info-dur'),
    listLastUsed: document.getElementById('lean-list-lastused'),
    lastUsedEmpty: document.getElementById('lean-lastused-empty'),
    listFavs: document.getElementById('lean-list-favs'),
    favsEmpty: document.getElementById('lean-favs-empty'),
    saveBtn: document.getElementById('lean-save'),
    cancelBtn: document.getElementById('lean-cancel'),
    deleteBtn: document.getElementById('lean-delete'),
    confirmCancelBtn: document.getElementById('lean-confirm-cancel'),
    confirmOkBtn: document.getElementById('lean-confirm-ok'),
  };
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
export function renderLastUsed(onSelect) {
  const e = $e();
  const entries = getLastUsed();
  e.listLastUsed.innerHTML = '';
  if (entries.length === 0) {
    e.lastUsedEmpty.classList.remove('hidden');
    return;
  }
  e.lastUsedEmpty.classList.add('hidden');
  entries.forEach((ticket) => e.listLastUsed.appendChild(makeRow(ticket, onSelect)));
  enrichStaleTickets(entries, getLastUsed, setLastUsed, () => renderLastUsed(onSelect));
}

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
    });
    row.appendChild(star);
    e.listFavs.appendChild(row);
  });
  enrichStaleTickets(favs, getFavourites, setFavourites, () => renderFavs(onSelect));
}

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
    });
    row.appendChild(star);
    e.searchResults.appendChild(row);
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
    const id = parseInt(r.dataset.id, 10);
    const lu = getLastUsed().find((entry) => entry.id === id);
    if (lu) nav.visibleRows.push(lu);
  });
  e.listFavs.querySelectorAll('.lean-row').forEach((r) => {
    const id = parseInt(r.dataset.id, 10);
    const fv = getFavourites().find((entry) => entry.id === id);
    if (fv) nav.visibleRows.push(fv);
  });
}
