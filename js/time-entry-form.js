import { getTimeEntryActivities, searchIssues,
         createTimeEntry, updateTimeEntry,
         deleteTimeEntry, formatProject }   from './redmine-api.js';
import { t }                               from './i18n.js';
import { getCentralConfigSync }            from './settings.js';
import { STORAGE_KEY_FAVOURITES,
         STORAGE_KEY_LAST_USED }           from './config.js';

// ── Modal IDs ────────────────────────────────────────────────────
const MODAL_ID   = 'lean-time-modal';
const CONFIRM_ID = 'lean-confirm-modal';

// ── Module-level state ────────────────────────────────────────────
let _defaultActivityId   = null;   // cached default; null = not yet fetched
let _selectedIssue       = null;   // { id, subject, projectName } | null
let _highlightedIndex    = -1;     // keyboard-nav index into _visibleRows
let _visibleRows         = [];     // flat list for keyboard navigation
let _searchMode          = false;  // true while search results are showing
let _searchTimer         = null;
let _currentEntry        = null;   // TimeEntry being edited, or null for create
let _currentPrefill      = {};     // { date, startTime, hours }
let _currentOnSave       = null;
let _currentOnDelete     = null;
let _keydownHandler      = null;
let _outsideClickHandler = null;

// ── localStorage helpers ──────────────────────────────────────────
function getFavourites() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_FAVOURITES)) ?? []; }
  catch { return []; }
}
function setFavourites(arr) {
  localStorage.setItem(STORAGE_KEY_FAVOURITES, JSON.stringify(arr));
}
function getLastUsed() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_LAST_USED)) ?? []; }
  catch { return []; }
}
function setLastUsed(arr) {
  localStorage.setItem(STORAGE_KEY_LAST_USED, JSON.stringify(arr));
}
function addLastUsed(ticket) {
  const list = getLastUsed().filter(t => t.id !== ticket.id);
  list.unshift({ id: ticket.id, subject: ticket.subject, projectName: ticket.projectName ?? '' });
  setLastUsed(list.slice(0, 8));
}

// ── Default activity (silent, once) ──────────────────────────────
async function fetchDefaultActivity() {
  if (_defaultActivityId !== null) return;
  try {
    const acts = await getTimeEntryActivities();
    const def  = acts.find(a => a.isDefault) ?? acts[0] ?? null;
    _defaultActivityId = def?.id ?? null;
  } catch { /* silent — Redmine uses its own default when omitted */ }
}

// ── Time helpers ──────────────────────────────────────────────────
function formatDuration(hours) {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}
function addMinutes(startTime, hours) {
  const [h, m] = startTime.split(':').map(Number);
  const end    = h * 60 + m + Math.round(hours * 60);
  return `${String(Math.floor(end / 60) % 24).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
}

// ── Modal HTML (injected once) ────────────────────────────────────
function ensureModal() {
  if (document.getElementById(MODAL_ID)) return;
  document.body.insertAdjacentHTML('beforeend', `
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
  `);
  document.getElementById('lean-search').addEventListener('input', onSearchInput);
  document.getElementById('lean-info-start').addEventListener('change', onStartChange);
  document.getElementById('lean-info-end').addEventListener('change', onEndChange);
}

// ── Element refs ──────────────────────────────────────────────────
function $e() {
  return {
    modal:            document.getElementById(MODAL_ID),
    confirm:          document.getElementById(CONFIRM_ID),
    error:            document.getElementById('lean-error'),
    search:           document.getElementById('lean-search'),
    searchResults:    document.getElementById('lean-search-results'),
    ticketInfo:       document.getElementById('lean-ticket-info'),
    ticketIdTitle:    document.getElementById('lean-ticket-idtitle'),
    ticketProj:       document.getElementById('lean-ticket-proj'),
    infoDate:         document.getElementById('lean-info-date'),
    infoStart:        document.getElementById('lean-info-start'),
    infoEnd:          document.getElementById('lean-info-end'),
    infoDur:          document.getElementById('lean-info-dur'),
    listLastUsed:     document.getElementById('lean-list-lastused'),
    lastUsedEmpty:    document.getElementById('lean-lastused-empty'),
    listFavs:         document.getElementById('lean-list-favs'),
    favsEmpty:        document.getElementById('lean-favs-empty'),
    saveBtn:          document.getElementById('lean-save'),
    cancelBtn:        document.getElementById('lean-cancel'),
    deleteBtn:        document.getElementById('lean-delete'),
    confirmCancelBtn: document.getElementById('lean-confirm-cancel'),
    confirmOkBtn:     document.getElementById('lean-confirm-ok'),
  };
}

// ── Error helpers ─────────────────────────────────────────────────
function showError(msg) {
  const el = $e().error;
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideError() {
  $e().error.classList.add('hidden');
}

// ── Ticket info panel ─────────────────────────────────────────────
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
      a.textContent = `#${_selectedIssue.id} ${_selectedIssue.subject}`;
      e.ticketIdTitle.appendChild(a);
    } else {
      e.ticketIdTitle.textContent = `#${_selectedIssue.id} ${_selectedIssue.subject}`;
    }
    e.ticketIdTitle.classList.remove('lean-ticket-placeholder');
    e.ticketProj.textContent = _selectedIssue.projectName ?? '';
  } else {
    e.ticketIdTitle.textContent = t('modal.no_ticket');
    e.ticketIdTitle.classList.add('lean-ticket-placeholder');
    e.ticketProj.textContent = '';
  }
}

// Initialise time inputs once on form open — never called on ticket selection
function initTimeInputs() {
  const e         = $e();
  const date      = _currentEntry?.date      ?? _currentPrefill.date      ?? new Date().toISOString().slice(0, 10);
  e.infoDate.value = date;
  const hours     = _currentEntry?.hours     ?? _currentPrefill.hours     ?? 0.25;
  const startTime = _currentEntry?.startTime ?? _currentPrefill.startTime ?? null;

  if (startTime) {
    e.infoStart.value = startTime;
    e.infoEnd.value   = addMinutes(startTime, hours);
  } else {
    e.infoStart.value = '';
    e.infoEnd.value   = '';
  }
  e.infoDur.textContent = formatDuration(hours);
}

// ── Column renderers ──────────────────────────────────────────────
let _enrichingLastUsed = false;

function renderLastUsed() {
  const e       = $e();
  const entries = getLastUsed();
  e.listLastUsed.innerHTML = '';
  if (entries.length === 0) {
    e.lastUsedEmpty.classList.remove('hidden');
    return;
  }
  e.lastUsedEmpty.classList.add('hidden');
  entries.forEach(ticket => e.listLastUsed.appendChild(makeRow(ticket)));
  if (!_enrichingLastUsed) enrichStaleLastUsed(entries);
}

async function enrichStaleLastUsed(entries) {
  const stale = entries.filter(t => !t.projectName);
  if (stale.length === 0) return;
  _enrichingLastUsed = true;
  let updated = false;
  for (const ticket of stale) {
    try {
      const results = await searchIssues(String(ticket.id));
      const match = results.find(r => r.id === ticket.id);
      if (match?.projectName) {
        const list = getLastUsed();
        const entry = list.find(t => t.id === ticket.id);
        if (entry) {
          entry.projectName = match.projectName;
          setLastUsed(list);
          updated = true;
        }
      }
    } catch { /* silent */ }
  }
  _enrichingLastUsed = false;
  if (updated) renderLastUsed();
}

let _enrichingFavs = false;

function renderFavs() {
  const e    = $e();
  const favs = getFavourites();
  e.listFavs.innerHTML = '';
  if (favs.length === 0) {
    e.favsEmpty.classList.remove('hidden');
    return;
  }
  e.favsEmpty.classList.add('hidden');
  favs.forEach(ticket => {
    const row  = makeRow(ticket);
    const star = makeStar(ticket, true, () => { toggleFavourite(ticket); renderFavs(); });
    row.appendChild(star);
    e.listFavs.appendChild(row);
  });
  if (!_enrichingFavs) enrichStaleFavs(favs);
}

async function enrichStaleFavs(entries) {
  const stale = entries.filter(t => !t.projectName);
  if (stale.length === 0) return;
  _enrichingFavs = true;
  let updated = false;
  for (const ticket of stale) {
    try {
      const results = await searchIssues(String(ticket.id));
      const match = results.find(r => r.id === ticket.id);
      if (match?.projectName) {
        const list = getFavourites();
        const entry = list.find(t => t.id === ticket.id);
        if (entry) {
          entry.projectName = match.projectName;
          setFavourites(list);
          updated = true;
        }
      }
    } catch { /* silent */ }
  }
  _enrichingFavs = false;
  if (updated) renderFavs();
}

function renderSearchResults(results) {
  const e = $e();
  e.searchResults.innerHTML = '';
  e.searchResults.classList.remove('hidden');
  _visibleRows = [];

  if (results.length === 0) {
    const msg = document.createElement('div');
    msg.className   = 'lean-no-results';
    msg.textContent = t('modal.no_results');
    e.searchResults.appendChild(msg);
    _highlightedIndex = -1;
    return;
  }

  const favIds = new Set(getFavourites().map(f => f.id));
  results.forEach(ticket => {
    _visibleRows.push(ticket);
    const isFav = favIds.has(ticket.id);
    const row   = makeRow(ticket);
    const star  = makeStar(ticket, isFav, () => {
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

// ── Row + star factories ──────────────────────────────────────────
function makeRow(ticket) {
  const row = document.createElement('div');
  row.className = 'lean-row';
  row.setAttribute('role', 'option');
  row.setAttribute('data-id', String(ticket.id));

  const label     = document.createElement('span');
  label.className = 'lean-row-label';

  const titleLine = document.createElement('span');
  titleLine.className = 'lean-row-title';

  const idSpan   = document.createElement('span');
  idSpan.className   = 'lean-row-id';
  idSpan.textContent = `#${ticket.id}`;

  const subjSpan = document.createElement('span');
  subjSpan.className   = 'lean-row-subject';
  subjSpan.textContent = ticket.subject;

  const projSpan = document.createElement('span');
  projSpan.className   = 'lean-row-project';
  projSpan.textContent = formatProject(ticket.projectIdentifier, ticket.projectName);
  if (ticket.projectIdentifier && ticket.projectIdentifier.length > 20) {
    projSpan.title = `${ticket.projectIdentifier} \u2014 ${ticket.projectName}`;
  }

  titleLine.append(idSpan, ' ', subjSpan);
  label.append(titleLine, projSpan);
  row.append(label);

  row.addEventListener('click', () => selectAndSave(ticket));
  return row;
}

function makeStar(ticket, isOn, onToggle) {
  const star = document.createElement('button');
  star.className   = 'lean-star' + (isOn ? ' lean-star--on' : '');
  star.title       = isOn ? t('modal.remove_favourite') : t('modal.add_favourite');
  star.textContent = isOn ? '★' : '☆';
  star.setAttribute('aria-label', star.title);
  star.addEventListener('click', (ev) => { ev.stopPropagation(); onToggle(); });
  return star;
}

// ── Keyboard-nav highlight ────────────────────────────────────────
function applyHighlight() {
  const e = $e();
  // Collect all navigable rows in order (search OR last-used + favs)
  const allRows = _searchMode
    ? [...e.searchResults.querySelectorAll('.lean-row')]
    : [...e.listLastUsed.querySelectorAll('.lean-row'), ...e.listFavs.querySelectorAll('.lean-row')];

  allRows.forEach((r, i) => {
    r.classList.toggle('lean-row--highlighted', i === _highlightedIndex);
    if (i === _highlightedIndex) r.scrollIntoView({ block: 'nearest' });
  });
}

function buildEmptyStateVisibleRows() {
  const e = $e();
  _visibleRows = [];
  e.listLastUsed.querySelectorAll('.lean-row').forEach(r => {
    const id = parseInt(r.dataset.id, 10);
    const lu = getLastUsed().find(t => t.id === id);
    if (lu) _visibleRows.push(lu);
  });
  e.listFavs.querySelectorAll('.lean-row').forEach(r => {
    const id = parseInt(r.dataset.id, 10);
    const fv = getFavourites().find(t => t.id === id);
    if (fv) _visibleRows.push(fv);
  });
}

// ── Selection + immediate save ────────────────────────────────────
function selectAndSave(ticket) {
  _selectedIssue = { id: ticket.id, subject: ticket.subject, projectName: ticket.projectName ?? '', projectIdentifier: ticket.projectIdentifier ?? null };
  $e().search.value    = `#${ticket.id} ${ticket.subject}`;
  $e().saveBtn.disabled = false;
  updateTicketInfo();
  doSave();
}

// ── Favourites toggle ─────────────────────────────────────────────
function toggleFavourite(ticket) {
  const favs = getFavourites();
  const idx  = favs.findIndex(f => f.id === ticket.id);
  if (idx >= 0) { favs.splice(idx, 1); } else { favs.unshift({ id: ticket.id, subject: ticket.subject, projectName: ticket.projectName ?? '', projectIdentifier: ticket.projectIdentifier ?? null }); }
  setFavourites(favs);
}

// ── Search input handler ──────────────────────────────────────────
function onSearchInput() {
  const q = $e().search.value.trim();

  _selectedIssue = null;
  $e().saveBtn.disabled = true;
  updateTicketInfo();
  clearTimeout(_searchTimer);

  if (q.length < 2) {
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
  }, 300);
}

// ── Keyboard handler ──────────────────────────────────────────────
function onKeydown(e) {
  if (e.key === 'Escape')    { closeModal(); return; }
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

// ── Time input helpers ────────────────────────────────────────────
function timeToMins(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function minsToTime(mins) {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
function onStartChange() {
  const e = $e();
  const start = e.infoStart.value;
  const end   = e.infoEnd.value;
  if (!start) return;
  if (end) {
    // keep end fixed, update duration display
    const mins = ((timeToMins(end) - timeToMins(start)) + 1440) % 1440;
    e.infoDur.textContent = formatDuration(mins / 60);
  } else {
    // no end set — push end forward by current duration
    const hours = _currentEntry?.hours ?? _currentPrefill.hours ?? 0.25;
    e.infoEnd.value = minsToTime(timeToMins(start) + Math.round(hours * 60));
    e.infoDur.textContent = formatDuration(hours);
  }
}
function onEndChange() {
  const e = $e();
  const start = e.infoStart.value;
  const end   = e.infoEnd.value;
  if (!start || !end) return;
  const mins = ((timeToMins(end) - timeToMins(start)) + 1440) % 1440;
  e.infoDur.textContent = formatDuration(mins / 60);
}

// ── Save ──────────────────────────────────────────────────────────
async function doSave() {
  if (!_selectedIssue) { showError(t('modal.ticket_required')); return; }

  const e = $e();

  // Mandatory field validation (before changing button state)
  const date       = $e().infoDate.value || _currentEntry?.date || _currentPrefill.date || '';
  const startInput = $e().infoStart.value || null;
  const endInput   = $e().infoEnd.value   || null;

  if (!date) { showError(t('modal.date_required')); return; }
  if (!startInput) { showError(t('modal.start_required')); return; }
  if (!endInput) { showError(t('modal.end_required')); return; }

  e.saveBtn.disabled    = true;
  e.cancelBtn.disabled  = true;
  e.saveBtn.textContent = t('modal.saving');
  hideError();

  const issueId    = _selectedIssue.id;
  const activityId = _currentPrefill.activityId ?? _defaultActivityId ?? undefined;

  if (startInput && endInput && endInput <= startInput) {
    showError(t('modal.end_before_start'));
    e.saveBtn.disabled    = false;
    e.cancelBtn.disabled  = false;
    e.saveBtn.textContent = t('modal.save_btn');
    return;
  }

  const startTime  = startInput ?? _currentEntry?.startTime ?? _currentPrefill.startTime ?? null;
  const hours = (startInput && endInput)
    ? (((timeToMins(endInput) - timeToMins(startInput)) + 1440) % 1440) / 60
    : (_currentEntry?.hours ?? _currentPrefill.hours ?? 0.25);

  const comment = document.getElementById('lean-comment')?.value ?? '';

  try {
    let saved;
    if (_currentEntry) {
      saved = await updateTimeEntry(_currentEntry.id, { issueId, spentOn: date, hours, activityId, comment, startTime });
      if (!saved?.issueSubject) saved = { ...saved, issueSubject: _selectedIssue.subject, projectName: _selectedIssue.projectName };
    } else {
      saved = await createTimeEntry({ issueId, spentOn: date, hours, activityId, comment, startTime });
    }
    addLastUsed(_selectedIssue);
    const cb = _currentOnSave;
    closeModal();
    cb?.(saved);
  } catch (err) {
    showError(err.message ?? t('modal.save_failed'));
    e.saveBtn.disabled    = false;
    e.cancelBtn.disabled  = false;
    e.saveBtn.textContent = t('modal.save_btn');
  }
}

// ── Confirm overlay (shared by modal Delete button + keyboard Delete) ────
let _confirmKeydownHandler = null;

function openConfirmOverlay(onConfirm, onCancel) {
  const e = $e();

  // Suspend the form's keydown handler so Enter doesn't reach doSave()
  if (_keydownHandler) {
    document.removeEventListener('keydown', _keydownHandler);
  }

  // Only intercept Escape; Enter/Space are handled natively by the focused button
  _confirmKeydownHandler = (ev) => {
    if (ev.key === 'Escape') { ev.preventDefault(); closeConfirmOverlay(); onCancel?.(); }
  };
  document.addEventListener('keydown', _confirmKeydownHandler);

  e.confirm.classList.remove('hidden');
  e.confirmCancelBtn.onclick = () => { closeConfirmOverlay(); onCancel?.(); };
  e.confirmOkBtn.onclick     = () => { closeConfirmOverlay(); onConfirm(); };

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

// ── Delete ────────────────────────────────────────────────────────
function onDeleteClick() {
  openConfirmOverlay(async () => {
    const e = $e();
    e.deleteBtn.disabled = true;
    try {
      await deleteTimeEntry(_currentEntry.id);
      const deletedId = _currentEntry.id;
      const cb = _currentOnDelete;
      closeModal();
      cb?.(deletedId);
    } catch (err) {
      showError(err.message ?? t('modal.delete_failed'));
      e.deleteBtn.disabled = false;
    }
  });
}

// ── Modal open / close ────────────────────────────────────────────
function closeModal() {
  const e = $e();
  e.modal.classList.add('hidden');
  closeConfirmOverlay();
  clearTimeout(_searchTimer);
  if (_keydownHandler)      { document.removeEventListener('keydown', _keydownHandler); _keydownHandler = null; }
  if (_outsideClickHandler) { document.removeEventListener('click', _outsideClickHandler, true); _outsideClickHandler = null; }
}

// ── Standalone delete confirm (keyboard shortcut path) ───────────
/**
 * Show the modal's confirm-delete overlay without opening the full form.
 * @param {function} onConfirm  Called when the user clicks the red Delete button.
 */
export function showDeleteConfirm(onConfirm) {
  ensureModal();
  openConfirmOverlay(onConfirm);
}

// ── openForm export ───────────────────────────────────────────────
/**
 * Open the lean time entry form.
 * @param {object|null} entry    Existing TimeEntry to edit, or null to create.
 * @param {object}      prefill  { date, startTime, hours } for new entries.
 * @param {function}    onSave   Called with the saved TimeEntry on success.
 * @param {function}    onDelete Called with the deleted entry id on success.
 */
export function openForm(entry, prefill = {}, onSave, onDelete) {
  ensureModal();

  if (_keydownHandler)      { document.removeEventListener('keydown', _keydownHandler); _keydownHandler = null; }
  if (_outsideClickHandler) { document.removeEventListener('click', _outsideClickHandler, true); _outsideClickHandler = null; }

  _currentEntry    = entry ?? null;
  _currentPrefill  = prefill ?? {};
  _currentOnSave   = onSave;
  _currentOnDelete = onDelete;
  _selectedIssue    = null;
  _highlightedIndex = -1;
  _visibleRows      = [];
  _searchMode       = false;
  clearTimeout(_searchTimer);

  const e = $e();
  e.modal.querySelectorAll('.ai-highlight, .ai-highlight-delete').forEach(el => {
    el.classList.remove('ai-highlight', 'ai-highlight-delete');
  });
  e.error.classList.add('hidden');
  e.search.value        = '';
  e.saveBtn.disabled    = false;
  e.saveBtn.textContent = t('modal.save_btn');
  e.cancelBtn.disabled  = false;
  e.deleteBtn.style.display = _currentEntry ? '' : 'none';
  e.deleteBtn.disabled  = false;
  e.searchResults.classList.add('hidden');
  e.searchResults.innerHTML = '';

  // Edit mode: pre-load existing ticket
  if (_currentEntry?.issueId) {
    _selectedIssue = {
      id:          _currentEntry.issueId,
      subject:     _currentEntry.issueSubject ?? `Issue #${_currentEntry.issueId}`,
      projectName: _currentEntry.projectName  ?? '',
    };
    e.search.value     = `#${_selectedIssue.id} ${_selectedIssue.subject}`;
    e.saveBtn.disabled = false;
  } else if (!_currentEntry && _currentPrefill.issueId) {
    // Paste mode: pre-select issue from clipboard prefill
    _selectedIssue = {
      id:          _currentPrefill.issueId,
      subject:     _currentPrefill.issueSubject ?? `Issue #${_currentPrefill.issueId}`,
      projectName: _currentPrefill.projectName  ?? '',
    };
    e.search.value     = `#${_selectedIssue.id} ${_selectedIssue.subject}`;
    e.saveBtn.disabled = false;
  }

  // Populate columns and ticket info panel
  updateTicketInfo();
  initTimeInputs();
  const commentInput = document.getElementById('lean-comment');
  if (commentInput) commentInput.value = _currentEntry?.comment ?? _currentPrefill?.comment ?? '';
  renderLastUsed();
  renderFavs();
  buildEmptyStateVisibleRows();

  e.cancelBtn.onclick = closeModal;
  e.saveBtn.onclick   = doSave;
  e.deleteBtn.onclick = onDeleteClick;

  _keydownHandler = onKeydown;
  document.addEventListener('keydown', _keydownHandler);

  _outsideClickHandler = () => {};
  setTimeout(() => {
    if (_outsideClickHandler === null) return;
    _outsideClickHandler = (ev) => {
      if (!e.modal.querySelector('.lean-card').contains(ev.target) && !e.confirm.contains(ev.target)) closeModal();
    };
    document.addEventListener('click', _outsideClickHandler, true);
  }, 0);

  e.modal.classList.remove('hidden');
  requestAnimationFrame(() => { e.search.focus(); if (_currentEntry) e.search.select(); });
  fetchDefaultActivity();
}
