// @ts-nocheck — DOM-heavy module; runtime checks suffice. Tag pure helpers per-export with /** @type */ when they grow.
// ── Module imports ────────────────────────────────────────────────
import {
  getTimeEntryActivities,
  searchIssues,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  formatProject,
} from './redmine-api.js';
import { t } from './i18n.js';
import { getCentralConfigSync } from './config-store.js';
import { STORAGE_KEY_FAVOURITES, STORAGE_KEY_LAST_USED } from './config.js';

// ── Constants ─────────────────────────────────────────────────────
const MODAL_ID = 'lean-time-modal';
const CONFIRM_ID = 'lean-confirm-modal';
const RECENT_CAP = 8;
const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LEN = 2;

// ── Module-level state ────────────────────────────────────────────
let _defaultActivityId = null; // cached default; null = not yet fetched
let _selectedIssue = null; // { id, subject, projectName } | null
let _highlightedIndex = -1; // keyboard-nav index into _visibleRows
let _visibleRows = []; // flat list for keyboard navigation
let _searchMode = false; // true while search results are showing
let _searchTimer = null;
let _currentEntry = null; // TimeEntry being edited, or null for create
let _currentPrefill = {}; // { date, startTime, hours }
let _currentOnSave = null;
let _currentOnDelete = null;
let _currentOnCancel = null;
let _keydownHandler = null;
let _outsideClickHandler = null;
let _confirmKeydownHandler = null;
const _enrichPromises = new Map();

// ── Pure helpers (time math, formatting, validation) ──────────────

/**
 * Format an hours-decimal value as a human-readable duration ("1h 30m").
 * Values under one hour render as "<m>m"; whole hours drop the minute suffix.
 * @param {number} hours
 * @returns {string}
 */
export function formatDuration(hours) {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

/** Convert "HH:MM" to minutes-since-midnight. */
export function timeToMins(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Convert minutes-since-midnight to "HH:MM" (wraps modulo 1440). */
export function minsToTime(mins) {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Compute the duration in minutes between two HH:MM stamps, wrapping past midnight. */
export function diffMinutes(startHHMM, endHHMM) {
  return (timeToMins(endHHMM) - timeToMins(startHHMM) + 1440) % 1440;
}

/**
 * Pure validator for the save form's time inputs. Returns an i18n key for the
 * first error encountered, or `null` if the inputs are valid.
 * @param {{ hasTicket:boolean, date:string, startInput:string|null, endInput:string|null }} args
 * @returns {string|null}
 */
export function validateTimeInputs({ hasTicket, date, startInput, endInput }) {
  if (!hasTicket) return 'modal.ticket_required';
  if (!date) return 'modal.date_required';
  if (!startInput) return 'modal.start_required';
  if (!endInput) return 'modal.end_required';
  if (endInput <= startInput) return 'modal.end_before_start';
  return null;
}

/**
 * Pure 8-cap dedup helper for the "last used" list. Pushes the new ticket to
 * the front, removes prior entries with the same id, and trims to `cap`.
 * @param {Array<{id:number}>} list
 * @param {{id:number}} ticket
 * @param {number} [cap=RECENT_CAP]
 * @returns {Array<{id:number}>}
 */
export function capLastUsed(list, ticket, cap = RECENT_CAP) {
  const filtered = list.filter((entry) => entry.id !== ticket.id);
  filtered.unshift(ticket);
  return filtered.slice(0, cap);
}

// ── Favourites / last-used (localStorage) ─────────────────────────
function getFavourites() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_FAVOURITES)) ?? [];
  } catch {
    return [];
  }
}
function setFavourites(arr) {
  localStorage.setItem(STORAGE_KEY_FAVOURITES, JSON.stringify(arr));
}
function getLastUsed() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_LAST_USED)) ?? [];
  } catch {
    return [];
  }
}
function setLastUsed(arr) {
  localStorage.setItem(STORAGE_KEY_LAST_USED, JSON.stringify(arr));
}
function addLastUsed(ticket) {
  setLastUsed(
    capLastUsed(getLastUsed(), {
      id: ticket.id,
      subject: ticket.subject,
      projectName: ticket.projectName ?? '',
      projectIdentifier: ticket.projectIdentifier ?? null,
    })
  );
}

function toggleFavourite(ticket) {
  const favs = getFavourites();
  const idx = favs.findIndex((f) => f.id === ticket.id);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.unshift({
      id: ticket.id,
      subject: ticket.subject,
      projectName: ticket.projectName ?? '',
      projectIdentifier: ticket.projectIdentifier ?? null,
    });
  }
  setFavourites(favs);
}

// ── Break-ticket helpers ──────────────────────────────────────────

// Feature 025: when the break ticket is selected, hours is forced to 0 at save
// regardless of start/end. Start and end inputs stay editable (so the calendar
// slot reflects the real Outlook event), and the duration readout shows
// "0m (break)" instead of the computed minutes.
export function isBreakTicketSelected() {
  const cfg = getCentralConfigSync();
  const breakTicket =
    Number.isFinite(cfg?.breakTicket) && cfg.breakTicket > 0 ? cfg.breakTicket : null;
  return !!(breakTicket && _selectedIssue && Number(_selectedIssue.id) === Number(breakTicket));
}

// ── Default activity (silent, once) ──────────────────────────────
async function fetchDefaultActivity() {
  if (_defaultActivityId !== null) return;
  try {
    const acts = await getTimeEntryActivities();
    const def = acts.find((a) => a.isDefault) ?? acts[0] ?? null;
    _defaultActivityId = def?.id ?? null;
  } catch {
    /* silent — Redmine uses its own default when omitted */
  }
}

// ── Stale ticket enrichment (shared by last-used + favourites) ────
async function enrichStaleTickets(entries, getter, setter, renderer) {
  const key = getter.name;
  if (_enrichPromises.has(key)) return;
  const stale = entries.filter((entry) => !entry.projectName || !entry.projectIdentifier);
  if (stale.length === 0) return;
  const promise = (async () => {
    let updated = false;
    for (const ticket of stale) {
      try {
        const results = await searchIssues(String(ticket.id));
        const match = results.find((r) => r.id === ticket.id);
        if (match) {
          const list = getter();
          const entry = list.find((e) => e.id === ticket.id);
          if (entry) {
            if (match.projectName) entry.projectName = match.projectName;
            if (match.projectIdentifier) entry.projectIdentifier = match.projectIdentifier;
            setter(list);
            updated = true;
          }
        }
      } catch {
        /* silent */
      }
    }
    _enrichPromises.delete(key);
    if (updated) renderer();
  })();
  _enrichPromises.set(key, promise);
}

// ── Modal HTML (injected once) ────────────────────────────────────
function ensureModal() {
  if (document.getElementById(MODAL_ID)) return;
  document.body.insertAdjacentHTML(
    'beforeend',
    `
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
                  <span class="lean-time-label">${t('modal.date_label')}</span>     <input type="date" id="lean-info-date"  class="lean-time-input">
                  <span class="lean-time-label">${t('modal.start_label')}</span>    <input type="time" id="lean-info-start" class="lean-time-input">
                  <span class="lean-time-label">${t('modal.end_label')}</span>      <input type="time" id="lean-info-end"   class="lean-time-input">
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
  `
  );
  document.getElementById('lean-search').addEventListener('input', onSearchInput);
  document.getElementById('lean-info-start').addEventListener('change', onStartChange);
  document.getElementById('lean-info-end').addEventListener('change', onEndChange);
}

// ── Element refs ──────────────────────────────────────────────────
function $e() {
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

// ── Form rendering: error banner ──────────────────────────────────
function showError(msg) {
  const el = $e().error;
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideError() {
  $e().error.classList.add('hidden');
}

// ── Form rendering: ticket info panel + hours lock ────────────────
function updateTicketInfo() {
  const e = $e();
  if (_selectedIssue) {
    const cfg = getCentralConfigSync();
    e.ticketIdTitle.textContent = '';
    if (cfg?.redmineServerUrl) {
      const a = document.createElement('a');
      a.href = `${cfg.redmineServerUrl}/issues/${_selectedIssue.id}`;
      a.target = '_blank';
      a.rel = 'noopener';
      const ticketText = `#${_selectedIssue.id} ${_selectedIssue.subject}`;
      a.textContent = ticketText;
      a.title = ticketText;
      e.ticketIdTitle.appendChild(a);
    } else {
      e.ticketIdTitle.textContent = `#${_selectedIssue.id} ${_selectedIssue.subject}`;
    }
    e.ticketIdTitle.title = `#${_selectedIssue.id} ${_selectedIssue.subject}`;
    e.ticketIdTitle.classList.remove('lean-ticket-placeholder');
    const projText = formatProject(_selectedIssue.projectIdentifier, _selectedIssue.projectName);
    e.ticketProj.textContent = projText;
    e.ticketProj.title = projText;
  } else {
    e.ticketIdTitle.textContent = t('modal.no_ticket');
    e.ticketIdTitle.classList.add('lean-ticket-placeholder');
    e.ticketProj.textContent = '';
  }
  applyHoursLock();
}

export function applyHoursLock() {
  const e = $e();
  if (!e.infoDur) return;
  if (isBreakTicketSelected()) {
    e.infoDur.textContent = t('modal.duration_break');
    e.infoDur.classList.add('info-dur--break');
  } else {
    e.infoDur.classList.remove('info-dur--break');
    if (e.infoStart.value && e.infoEnd.value) {
      e.infoDur.textContent = formatDuration(diffMinutes(e.infoStart.value, e.infoEnd.value) / 60);
    }
  }
}

// Initialise time inputs once on form open — never called on ticket selection
function initTimeInputs() {
  const e = $e();
  const date = _currentEntry?.date ?? _currentPrefill.date ?? new Date().toISOString().slice(0, 10);
  e.infoDate.value = date;
  const hours = _currentEntry?.hours ?? _currentPrefill.hours ?? 0.25;
  const startTime = _currentEntry?.startTime ?? _currentPrefill.startTime ?? null;
  const endTime = _currentEntry?.endTime ?? _currentPrefill.endTime ?? null;

  if (startTime) {
    e.infoStart.value = startTime;
    e.infoEnd.value = endTime ?? '';
  } else {
    e.infoStart.value = '';
    e.infoEnd.value = '';
  }
  e.infoDur.textContent = formatDuration(hours);
}

// ── Form rendering: column lists ──────────────────────────────────
function renderLastUsed() {
  const e = $e();
  const entries = getLastUsed();
  e.listLastUsed.innerHTML = '';
  if (entries.length === 0) {
    e.lastUsedEmpty.classList.remove('hidden');
    return;
  }
  e.lastUsedEmpty.classList.add('hidden');
  entries.forEach((ticket) => e.listLastUsed.appendChild(makeRow(ticket)));
  enrichStaleTickets(entries, getLastUsed, setLastUsed, renderLastUsed);
}

function renderFavs() {
  const e = $e();
  const favs = getFavourites();
  e.listFavs.innerHTML = '';
  if (favs.length === 0) {
    e.favsEmpty.classList.remove('hidden');
    return;
  }
  e.favsEmpty.classList.add('hidden');
  favs.forEach((ticket) => {
    const row = makeRow(ticket);
    const star = makeStar(ticket, true, () => {
      toggleFavourite(ticket);
      renderFavs();
    });
    row.appendChild(star);
    e.listFavs.appendChild(row);
  });
  enrichStaleTickets(favs, getFavourites, setFavourites, renderFavs);
}

function renderSearchResults(results) {
  const e = $e();
  e.searchResults.innerHTML = '';
  e.searchResults.classList.remove('hidden');
  _visibleRows = [];

  if (results.length === 0) {
    const msg = document.createElement('div');
    msg.className = 'lean-no-results';
    msg.textContent = t('modal.no_results');
    e.searchResults.appendChild(msg);
    _highlightedIndex = -1;
    return;
  }

  const favIds = new Set(getFavourites().map((f) => f.id));
  results.forEach((ticket) => {
    _visibleRows.push(ticket);
    const isFav = favIds.has(ticket.id);
    const row = makeRow(ticket);
    const star = makeStar(ticket, isFav, () => {
      toggleFavourite(ticket);
      renderSearchResults([..._visibleRows]);
      renderFavs();
    });
    row.appendChild(star);
    e.searchResults.appendChild(row);
  });

  _highlightedIndex = 0;
  applyHighlight();
}

// ── Form rendering: row + star factories ──────────────────────────
function makeRow(ticket) {
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

  row.addEventListener('click', () => selectAndSave(ticket));
  return row;
}

function makeStar(ticket, isOn, onToggle) {
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

// ── Search (debounced) ────────────────────────────────────────────
function onSearchInput() {
  const q = $e().search.value.trim();

  _selectedIssue = null;
  $e().saveBtn.disabled = true;
  updateTicketInfo();
  clearTimeout(_searchTimer);

  if (q.length < MIN_QUERY_LEN) {
    _searchMode = false;
    $e().searchResults.classList.add('hidden');
    $e().searchResults.innerHTML = '';
    buildEmptyStateVisibleRows();
    _highlightedIndex = -1;
    applyHighlight();
    return;
  }

  _searchMode = true;
  _searchTimer = setTimeout(async () => {
    hideError();
    try {
      const results = await searchIssues(q);
      renderSearchResults(results);
    } catch {
      showError(t('modal.search_error'));
      renderSearchResults([]);
    }
  }, SEARCH_DEBOUNCE_MS);
}

// ── Selection (click or keyboard Enter) ───────────────────────────
function selectAndSave(ticket) {
  _selectedIssue = {
    id: ticket.id,
    subject: ticket.subject,
    projectName: ticket.projectName ?? '',
    projectIdentifier: ticket.projectIdentifier ?? null,
  };
  $e().search.value = `#${ticket.id} ${ticket.subject}`;
  $e().saveBtn.disabled = false;
  updateTicketInfo();
  doSave();
}

// ── Time input change handlers ────────────────────────────────────
function onStartChange() {
  const e = $e();
  const start = e.infoStart.value;
  const end = e.infoEnd.value;
  if (!start) return;
  if (end) {
    if (isBreakTicketSelected()) {
      e.infoDur.textContent = t('modal.duration_break');
      return;
    }
    e.infoDur.textContent = formatDuration(diffMinutes(start, end) / 60);
  } else {
    const hours = _currentEntry?.hours ?? _currentPrefill.hours ?? 0.25;
    e.infoEnd.value = minsToTime(timeToMins(start) + Math.round(hours * 60));
    e.infoDur.textContent = isBreakTicketSelected()
      ? t('modal.duration_break')
      : formatDuration(hours);
  }
}

function onEndChange() {
  const e = $e();
  const start = e.infoStart.value;
  const end = e.infoEnd.value;
  if (!start || !end) return;
  if (isBreakTicketSelected()) {
    e.infoDur.textContent = t('modal.duration_break');
    return;
  }
  e.infoDur.textContent = formatDuration(diffMinutes(start, end) / 60);
}

// ── Save ──────────────────────────────────────────────────────────
function collectSaveInputs() {
  const e = $e();
  return {
    date: e.infoDate.value || _currentEntry?.date || _currentPrefill.date || '',
    startInput: e.infoStart.value || null,
    endInput: e.infoEnd.value || null,
  };
}

function computeSaveHours(startInput, endInput) {
  if (isBreakTicketSelected()) {
    // Redmine optionally rejects hours=0 (server-side "Accept 0h timelogs" setting).
    // The admin mirrors that setting via config.json's redmineAcceptsZeroHours; when
    // the server rejects 0, we send the smallest positive sub-quarter value (0.01h)
    // instead. The UI still treats break entries as 0 hours.
    return getCentralConfigSync()?.redmineAcceptsZeroHours ? 0 : 0.01;
  }
  return diffMinutes(startInput, endInput) / 60;
}

function setSaveButtonBusy(busy) {
  const e = $e();
  e.saveBtn.disabled = busy;
  e.cancelBtn.disabled = busy;
  e.saveBtn.textContent = busy ? t('modal.saving') : t('modal.save_btn');
}

async function persistTimeEntry(payload) {
  if (_currentEntry) {
    let saved = await updateTimeEntry(_currentEntry.id, payload);
    if (!saved?.issueSubject) {
      saved = {
        ...saved,
        issueSubject: _selectedIssue.subject,
        projectName: _selectedIssue.projectName,
      };
    }
    return saved;
  }
  return createTimeEntry(payload);
}

async function doSave() {
  const inputs = collectSaveInputs();
  const errorKey = validateTimeInputs({ ...inputs, hasTicket: !!_selectedIssue });
  if (errorKey) {
    showError(t(errorKey));
    return;
  }

  setSaveButtonBusy(true);
  hideError();

  const { date, startInput, endInput } = inputs;
  const payload = {
    issueId: _selectedIssue.id,
    spentOn: date,
    hours: computeSaveHours(startInput, endInput),
    activityId: _currentPrefill.activityId ?? _defaultActivityId ?? undefined,
    comment: document.getElementById('lean-comment')?.value ?? '',
    startTime: startInput,
    endTime: endInput,
  };

  try {
    const saved = await persistTimeEntry(payload);
    addLastUsed(_selectedIssue);
    const cb = _currentOnSave;
    _currentOnCancel = null;
    closeModal();
    cb?.(saved);
  } catch (err) {
    showError(err.message ?? t('modal.save_failed'));
    setSaveButtonBusy(false);
  }
}

// ── Delete + confirm overlay ──────────────────────────────────────
function openConfirmOverlay(onConfirm, onCancel) {
  const e = $e();

  // Suspend the form's keydown handler so Enter doesn't reach doSave()
  if (_keydownHandler) {
    document.removeEventListener('keydown', _keydownHandler);
  }

  // Only intercept Escape; Enter/Space are handled natively by the focused button
  _confirmKeydownHandler = (ev) => {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      closeConfirmOverlay();
      onCancel?.();
    }
  };
  document.addEventListener('keydown', _confirmKeydownHandler);

  e.confirm.classList.remove('hidden');
  e.confirmCancelBtn.onclick = () => {
    closeConfirmOverlay();
    onCancel?.();
  };
  e.confirmOkBtn.onclick = () => {
    closeConfirmOverlay();
    onConfirm();
  };

  // Focus the OK button — user already expressed intent to delete, Enter confirms
  requestAnimationFrame(() => e.confirmOkBtn.focus());
}

function closeConfirmOverlay() {
  const e = $e();
  e.confirm.classList.add('hidden');
  if (_confirmKeydownHandler) {
    document.removeEventListener('keydown', _confirmKeydownHandler);
    _confirmKeydownHandler = null;
  }
  // Restore the form's keydown handler if the main modal is still open
  if (_keydownHandler) {
    document.addEventListener('keydown', _keydownHandler);
  }
}

function onDeleteClick() {
  openConfirmOverlay(async () => {
    const e = $e();
    e.deleteBtn.disabled = true;
    try {
      await deleteTimeEntry(_currentEntry.id);
      const deletedId = _currentEntry.id;
      const cb = _currentOnDelete;
      _currentOnCancel = null;
      closeModal();
      cb?.(deletedId);
    } catch (err) {
      showError(err.message ?? t('modal.delete_failed'));
      e.deleteBtn.disabled = false;
    }
  });
}

// ── Keyboard navigation ───────────────────────────────────────────
function applyHighlight() {
  const e = $e();
  // Collect all navigable rows in order (search OR last-used + favs)
  const allRows = _searchMode
    ? [...e.searchResults.querySelectorAll('.lean-row')]
    : [
        ...e.listLastUsed.querySelectorAll('.lean-row'),
        ...e.listFavs.querySelectorAll('.lean-row'),
      ];

  allRows.forEach((r, i) => {
    r.classList.toggle('lean-row--highlighted', i === _highlightedIndex);
    if (i === _highlightedIndex) r.scrollIntoView({ block: 'nearest' });
  });
}

function buildEmptyStateVisibleRows() {
  const e = $e();
  _visibleRows = [];
  e.listLastUsed.querySelectorAll('.lean-row').forEach((r) => {
    const id = parseInt(r.dataset.id, 10);
    const lu = getLastUsed().find((entry) => entry.id === id);
    if (lu) _visibleRows.push(lu);
  });
  e.listFavs.querySelectorAll('.lean-row').forEach((r) => {
    const id = parseInt(r.dataset.id, 10);
    const fv = getFavourites().find((entry) => entry.id === id);
    if (fv) _visibleRows.push(fv);
  });
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    closeModal();
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (_visibleRows.length === 0) return;
    _highlightedIndex = (_highlightedIndex + 1) % _visibleRows.length;
    applyHighlight();
    return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (_visibleRows.length === 0) return;
    _highlightedIndex = (_highlightedIndex - 1 + _visibleRows.length) % _visibleRows.length;
    applyHighlight();
    return;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    if (_selectedIssue) {
      doSave();
    } else if (_highlightedIndex >= 0 && _highlightedIndex < _visibleRows.length) {
      selectAndSave(_visibleRows[_highlightedIndex]);
    }
    return;
  }
}

// ── Modal lifecycle (open / close / reset) ────────────────────────
function closeModal() {
  const e = $e();
  e.modal.classList.add('hidden');
  closeConfirmOverlay();
  clearTimeout(_searchTimer);
  if (_keydownHandler) {
    document.removeEventListener('keydown', _keydownHandler);
    _keydownHandler = null;
  }
  if (_outsideClickHandler) {
    document.removeEventListener('click', _outsideClickHandler, true);
    _outsideClickHandler = null;
  }
  const cancelCb = _currentOnCancel;
  _currentOnCancel = null;
  cancelCb?.();
}

function resetFormState(entry, prefill, onSave, onDelete, onCancel) {
  if (_keydownHandler) {
    document.removeEventListener('keydown', _keydownHandler);
    _keydownHandler = null;
  }
  if (_outsideClickHandler) {
    document.removeEventListener('click', _outsideClickHandler, true);
    _outsideClickHandler = null;
  }

  _currentEntry = entry ?? null;
  _currentPrefill = prefill ?? {};
  _currentOnSave = onSave;
  _currentOnDelete = onDelete;
  _currentOnCancel = onCancel;
  _selectedIssue = null;
  _highlightedIndex = -1;
  _visibleRows = [];
  _searchMode = false;
  clearTimeout(_searchTimer);
}

function issueFromSource(source) {
  if (!source?.issueId) return null;
  return {
    id: source.issueId,
    subject: source.issueSubject ?? t('entry.fallback_subject', { id: source.issueId }),
    projectName: source.projectName ?? '',
    projectIdentifier: source.projectIdentifier ?? null,
  };
}

function populateFromEntry(e) {
  _selectedIssue = issueFromSource(_currentEntry) ?? issueFromSource(_currentPrefill);
  if (_selectedIssue) {
    e.search.value = `#${_selectedIssue.id} ${_selectedIssue.subject}`;
    e.saveBtn.disabled = false;
  }
}

function resetFormUI(e) {
  e.modal.querySelectorAll('.ai-highlight, .ai-highlight-delete').forEach((el) => {
    el.classList.remove('ai-highlight', 'ai-highlight-delete');
  });
  e.error.classList.add('hidden');
  e.search.value = '';
  e.saveBtn.disabled = false;
  e.saveBtn.textContent = t('modal.save_btn');
  e.cancelBtn.disabled = false;
  e.deleteBtn.style.display = _currentEntry ? '' : 'none';
  e.deleteBtn.disabled = false;
  e.searchResults.classList.add('hidden');
  e.searchResults.innerHTML = '';
}

function setupFormListeners(e) {
  e.cancelBtn.onclick = closeModal;
  e.saveBtn.onclick = doSave;
  e.deleteBtn.onclick = onDeleteClick;

  _keydownHandler = onKeydown;
  document.addEventListener('keydown', _keydownHandler);

  _outsideClickHandler = () => {};
  setTimeout(() => {
    if (_outsideClickHandler === null) return;
    _outsideClickHandler = (ev) => {
      if (
        !e.modal.querySelector('.lean-card').contains(ev.target) &&
        !e.confirm.contains(ev.target)
      )
        closeModal();
    };
    document.addEventListener('click', _outsideClickHandler, true);
  }, 0);
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Show the modal's confirm-delete overlay without opening the full form.
 * @param {function} onConfirm  Called when the user clicks the red Delete button.
 */
export function showDeleteConfirm(onConfirm) {
  ensureModal();
  openConfirmOverlay(onConfirm);
}

/**
 * Open the lean time entry form.
 * @param {object|null} entry    Existing TimeEntry to edit, or null to create.
 * @param {object}      prefill  { date, startTime, hours } for new entries.
 * @param {function}    onSave   Called with the saved TimeEntry on success.
 * @param {function}    onDelete Called with the deleted entry id on success.
 * @param {function}    onCancel Called when the modal is dismissed without saving.
 */
export function openForm(entry, prefill = {}, onSave, onDelete, onCancel) {
  ensureModal();
  resetFormState(entry, prefill, onSave, onDelete, onCancel);

  const e = $e();
  resetFormUI(e);
  populateFromEntry(e);

  // initTimeInputs first so the start/end values are populated before
  // updateTicketInfo() invokes applyHoursLock (FR-012); the lock relies on
  // reading the start input to mirror it into the end input for break tickets.
  initTimeInputs();
  updateTicketInfo();
  const commentInput = document.getElementById('lean-comment');
  if (commentInput) commentInput.value = _currentEntry?.comment ?? _currentPrefill?.comment ?? '';
  renderLastUsed();
  renderFavs();
  buildEmptyStateVisibleRows();

  setupFormListeners(e);
  e.modal.classList.remove('hidden');
  requestAnimationFrame(() => {
    e.search.focus();
    if (_currentEntry) e.search.select();
  });
  fetchDefaultActivity();
}
