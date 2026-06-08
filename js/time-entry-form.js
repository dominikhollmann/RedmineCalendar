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
import {
  nav,
  formatDuration,
  timeToMins,
  minsToTime,
  diffMinutes,
  validateTimeInputs,
  addLastUsed,
} from './time-entry-form-utils.js';
import {
  MODAL_ID,
  buildModalHtml,
  $e,
  renderLastUsed,
  renderFavs,
  renderSearchResults,
  applyHighlight,
  buildEmptyStateVisibleRows,
} from './time-entry-form-view.js';

// Re-export the pure helpers so existing consumers/tests importing them from
// './time-entry-form.js' keep working after the feature-035 utils extraction.
export {
  formatDuration,
  timeToMins,
  minsToTime,
  diffMinutes,
  validateTimeInputs,
  capLastUsed,
} from './time-entry-form-utils.js';

// ── Constants ─────────────────────────────────────────────────────
const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LEN = 2;

// ── Module-level state ────────────────────────────────────────────
let _defaultActivityId = null; // cached default; null = not yet fetched
let _selectedIssue = null; // { id, subject, projectName } | null
let _searchTimer = null;
let _currentEntry = null; // TimeEntry being edited, or null for create
let _currentPrefill = {}; // { date, startTime, hours }
let _currentOnSave = null;
let _currentOnDelete = null;
let _currentOnCancel = null;
let _keydownHandler = null;
let _confirmKeydownHandler = null;

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

// ── Modal HTML (injected once) ────────────────────────────────────
function ensureModal() {
  if (document.getElementById(MODAL_ID)) return;
  document.body.insertAdjacentHTML('beforeend', buildModalHtml());
  document.getElementById('lean-search').addEventListener('input', onSearchInput);
  document.getElementById('lean-info-start').addEventListener('change', onStartChange);
  document.getElementById('lean-info-end').addEventListener('change', onEndChange);
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

// ── Search (debounced) ────────────────────────────────────────────
function onSearchInput() {
  const q = $e().search.value.trim();

  _selectedIssue = null;
  $e().saveBtn.disabled = true;
  updateTicketInfo();
  clearTimeout(_searchTimer);

  if (q.length < MIN_QUERY_LEN) {
    nav.searchMode = false;
    $e().searchResults.classList.add('hidden');
    $e().searchResults.innerHTML = '';
    buildEmptyStateVisibleRows();
    nav.highlightedIndex = -1;
    applyHighlight();
    return;
  }

  nav.searchMode = true;
  _searchTimer = setTimeout(async () => {
    hideError();
    try {
      const results = await searchIssues(q);
      renderSearchResults(results, selectAndSave);
    } catch {
      showError(t('modal.search_error'));
      renderSearchResults([], selectAndSave);
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
    // Downstream: roundHours() in redmine-api.js preserves sub-0.25 values so this
    // sentinel is never rounded up to 0.25.
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
function onKeydown(e) {
  if (e.key === 'Escape') {
    closeModal();
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (nav.visibleRows.length === 0) return;
    nav.highlightedIndex = (nav.highlightedIndex + 1) % nav.visibleRows.length;
    applyHighlight();
    return;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (nav.visibleRows.length === 0) return;
    nav.highlightedIndex =
      (nav.highlightedIndex - 1 + nav.visibleRows.length) % nav.visibleRows.length;
    applyHighlight();
    return;
  }
  if (e.key === 'Enter') {
    e.preventDefault();
    if (_selectedIssue) {
      doSave();
    } else if (nav.highlightedIndex >= 0 && nav.highlightedIndex < nav.visibleRows.length) {
      selectAndSave(nav.visibleRows[nav.highlightedIndex]);
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
  const cancelCb = _currentOnCancel;
  _currentOnCancel = null;
  cancelCb?.();
}

function resetFormState(entry, prefill, onSave, onDelete, onCancel) {
  if (_keydownHandler) {
    document.removeEventListener('keydown', _keydownHandler);
    _keydownHandler = null;
  }

  _currentEntry = entry ?? null;
  _currentPrefill = prefill ?? {};
  _currentOnSave = onSave;
  _currentOnDelete = onDelete;
  _currentOnCancel = onCancel;
  _selectedIssue = null;
  nav.highlightedIndex = -1;
  nav.visibleRows = [];
  nav.searchMode = false;
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
 * @param {import('./types.d.ts').TimeEntry|null} entry  Existing entry to edit, or null to create.
 * @param {object}   prefill   { date, startTime, hours, activityId?, comment? } for new entries.
 * @param {import('./types.d.ts').TimeEntryFormCallbacks['onSave']}   onSave
 * @param {import('./types.d.ts').TimeEntryFormCallbacks['onDelete']} onDelete
 * @param {import('./types.d.ts').TimeEntryFormCallbacks['onCancel']} [onCancel]
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
  renderLastUsed(selectAndSave);
  renderFavs(selectAndSave);
  buildEmptyStateVisibleRows();

  setupFormListeners(e);
  e.modal.classList.remove('hidden');
  requestAnimationFrame(() => {
    e.search.focus();
    if (_currentEntry) e.search.select();
  });
  fetchDefaultActivity();
}
