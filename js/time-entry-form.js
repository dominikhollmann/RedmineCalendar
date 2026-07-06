// @ts-nocheck — DOM-heavy module; runtime checks suffice. Tag pure helpers per-export with /** @type */ when they grow.
// ── Module imports ────────────────────────────────────────────────
import {
  getTimeEntryActivities,
  searchIssues,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  formatProject,
  fetchIssueStatus,
} from './redmine-api.js';
import { showConfirmDialog } from './confirm-dialog.js';
import { t } from './i18n.js';
import { getCentralConfigSync } from './config-store.js';
import { guardSave, runDeleteGuard } from './booking-guard.js';
import { attachLabelTooltip } from './anomaly-render.js';
import {
  nav,
  formatDuration,
  timeToMins,
  minsToTime,
  diffMinutes,
  validateTimeInputs,
  addLastUsed,
  breakHoursForRedmine,
  issueFromSource,
  getFastMode,
} from './time-entry-form-utils.js';
import {
  MODAL_ID,
  buildModalHtml,
  $e,
  makeClosedIcon,
  buildTicketLink,
  renderLastUsed,
  renderFavs,
  renderSearchResults,
  showSearchEmpty,
  markSelectedRow,
  applyHighlight,
  buildEmptyStateVisibleRows,
  renderSourceEventInfo,
  renderBulkDayNotice,
  enrichClosedStatusOnLists,
  updateTicketStar,
  setTicketStarRefresher,
} from './time-entry-form-view.js';
import { mountResize, teardownResize } from './time-entry-form-resize.js';

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
let _currentEntry = null,
  _currentPrefill = {}; // entry=TimeEntry|null, prefill={date,startTime,hours}
let _currentOnSave = null,
  _currentOnDelete = null,
  _currentOnCancel = null;
let _keydownHandler = null,
  _confirmKeydownHandler = null;

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
      e.ticketIdTitle.appendChild(buildTicketLink(cfg.redmineServerUrl, _selectedIssue));
    } else {
      e.ticketIdTitle.textContent = `#${_selectedIssue.id} ${_selectedIssue.subject}`;
    }
    if (_selectedIssue.is_closed === true) e.ticketIdTitle.appendChild(makeClosedIcon());
    attachLabelTooltip(e.ticketIdTitle, `#${_selectedIssue.id} ${_selectedIssue.subject}`);
    e.ticketIdTitle.classList.remove('lean-ticket-placeholder');
    const projText = formatProject(_selectedIssue.projectIdentifier, _selectedIssue.projectName);
    e.ticketProj.textContent = projText;
    attachLabelTooltip(e.ticketProj, projText);
  } else {
    e.ticketIdTitle.textContent = t('modal.no_ticket');
    e.ticketIdTitle.classList.add('lean-ticket-placeholder');
    e.ticketProj.textContent = '';
  }
  updateTicketStar(_selectedIssue ?? null, selectAndSave);
  markSelectedRow(_selectedIssue?.id ?? null);
  applyHoursLock();
}

export function applyHoursLock() {
  const infoDur = document.getElementById('lean-info-dur');
  if (!infoDur) return;
  const infoStart = document.getElementById('lean-info-start');
  const infoEnd = document.getElementById('lean-info-end');
  if (isBreakTicketSelected()) {
    infoDur.textContent = t('modal.duration_break');
    infoDur.classList.add('info-dur--break');
  } else {
    infoDur.classList.remove('info-dur--break');
    if (infoStart?.value && infoEnd?.value) {
      infoDur.textContent = formatDuration(diffMinutes(infoStart.value, infoEnd.value) / 60);
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
    showSearchEmpty();
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
async function selectAndSave(ticket) {
  _selectedIssue = {
    id: ticket.id,
    subject: ticket.subject,
    projectName: ticket.projectName ?? '',
    projectIdentifier: ticket.projectIdentifier ?? null,
  };
  $e().saveBtn.disabled = false;
  // Phase 2 is always visible: selection populates it in place. The Suche column
  // keeps its current results (no floating dropdown to dismiss); the selected
  // row is accented across all three columns via markSelectedRow().
  updateTicketInfo();
  const status = await fetchIssueStatus(ticket.id);
  if (_selectedIssue?.id === ticket.id) {
    _selectedIssue.is_closed = status?.is_closed ?? false;
    updateTicketInfo();
  }
  if (getFastMode()) doSave();
}

// ── Time input change handlers ────────────────────────────────────
/** Renders the duration label from a start/end pair, honoring break tickets. */
function setDurationText(start, end) {
  $e().infoDur.textContent = isBreakTicketSelected()
    ? t('modal.duration_break')
    : formatDuration(diffMinutes(start, end) / 60);
}

function onStartChange() {
  const e = $e();
  const start = e.infoStart.value;
  if (!start) return;
  if (!e.infoEnd.value) {
    const hours = _currentEntry?.hours ?? _currentPrefill.hours ?? 0.25;
    e.infoEnd.value = minsToTime(timeToMins(start) + Math.round(hours * 60));
  }
  setDurationText(start, e.infoEnd.value);
}

function onEndChange() {
  const e = $e();
  if (!e.infoStart.value || !e.infoEnd.value) return;
  setDurationText(e.infoStart.value, e.infoEnd.value);
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
  if (isBreakTicketSelected()) return breakHoursForRedmine();
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
    const before = {
      issueId: _currentEntry.issueId,
      spentOn: _currentEntry.date ?? _currentEntry.spentOn,
      hours: _currentEntry.hours,
      activityId: _currentEntry.activityId,
      comment: _currentEntry.comment,
      startTime: _currentEntry.startTime,
      endTime: _currentEntry.endTime,
    };
    const entryId = _currentEntry.id;
    let saved = await updateTimeEntry(entryId, payload);
    if (!saved?.issueSubject) {
      saved = {
        ...saved,
        issueSubject: _selectedIssue.subject,
        projectName: _selectedIssue.projectName,
      };
    }
    document.dispatchEvent(
      new CustomEvent('undo:push', {
        detail: { type: 'edit', id: entryId, before, after: { ...payload } },
      })
    );
    return saved;
  }
  const saved = await createTimeEntry(payload);
  document.dispatchEvent(
    new CustomEvent('undo:push', { detail: { type: 'add', entry: { ...payload, ...saved } } })
  );
  return saved;
}

async function doSave() {
  const inputs = collectSaveInputs();
  const errorKey = validateTimeInputs({ ...inputs, hasTicket: !!_selectedIssue });
  if (errorKey) {
    showError(t(errorKey));
    return;
  }

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

  if (_selectedIssue?.is_closed === true) {
    setSaveButtonBusy(false);
    showConfirmDialog({
      title: t('timeEntry.closedTicketConfirmTitle'),
      message: t('timeEntry.closedTicketConfirmBody'),
      onConfirm: () => _executeSave(payload),
      onCancel: () => {},
    });
    return;
  }

  const cfg = getCentralConfigSync();
  const guardsOk = await guardSave(payload, _currentEntry, _selectedIssue?.id ?? null, cfg);
  if (!guardsOk) return setSaveButtonBusy(false);

  await _executeSave(payload);
}

async function _executeSave(payload) {
  setSaveButtonBusy(true);
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
  // Restore the form's keydown handler only if the main modal is still open
  /* c8 ignore next 5 */
  if (_keydownHandler) {
    const modal = document.getElementById('lean-time-modal');
    if (modal && !modal.classList.contains('hidden')) {
      document.addEventListener('keydown', _keydownHandler);
    }
  }
}

async function onDeleteClick() {
  const cfg = getCentralConfigSync();
  const ok = await runDeleteGuard(_currentEntry.date, _currentEntry.startTime, cfg);
  if (!ok) return;
  openConfirmOverlay(async () => {
    const e = $e();
    e.deleteBtn.disabled = true;
    try {
      /* c8 ignore next */
      const snapshot = { ..._currentEntry, spentOn: _currentEntry.date ?? _currentEntry.spentOn };
      await deleteTimeEntry(snapshot.id);
      document.dispatchEvent(
        new CustomEvent('undo:push', { detail: { type: 'delete', entry: snapshot } })
      );
      const cb = _currentOnDelete;
      _currentOnCancel = null;
      closeModal();
      cb?.(snapshot.id);
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
  teardownResize();
  clearTimeout(_searchTimer);
  /* c8 ignore next 3 */
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

function populateFromEntry(e) {
  _selectedIssue = issueFromSource(_currentEntry) ?? issueFromSource(_currentPrefill);
  // The selected ticket shows in the always-visible Phase 2 (updateTicketInfo),
  // not in the Suche box — leave the search field empty so it stays a filter.
  if (_selectedIssue) e.saveBtn.disabled = false;
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
  e.searchResults.innerHTML = '';
}

function setupFormListeners(e) {
  e.cancelBtn.onclick = closeModal;
  e.closeBtn.onclick = closeModal;
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
  setTicketStarRefresher(() => updateTicketStar(_selectedIssue ?? null, selectAndSave));
  updateTicketInfo();
  const commentInput = document.getElementById('lean-comment');
  if (commentInput) commentInput.value = _currentEntry?.comment ?? _currentPrefill?.comment ?? '';
  showSearchEmpty();
  renderLastUsed(selectAndSave);
  renderFavs(selectAndSave);
  enrichClosedStatusOnLists().catch(() => {});
  buildEmptyStateVisibleRows();

  renderSourceEventInfo(e.modal, _currentPrefill?.sourceEvent);
  renderBulkDayNotice(e.modal, _currentPrefill?.bulkDayCount);
  setupFormListeners(e);
  e.modal.classList.remove('hidden');
  // Restore the user's last modal size (FR-010), then watch for further resizes.
  mountResize(e.card);
  requestAnimationFrame(() => {
    e.search.focus();
    if (_currentEntry) e.search.select();
  });
  // Phase-1 list heights are handled in CSS: each column's list box flexes to
  // fill the grid row height and scrolls internally; Phase 1 grows to absorb
  // free vertical space while Phase 2 stays content-sized. No JS measuring.
  fetchDefaultActivity();

  const prefillIssueId = entry?.issueId ?? prefill?.issueId ?? null;
  if (prefillIssueId && _selectedIssue) {
    fetchIssueStatus(prefillIssueId).then((status) => {
      /* c8 ignore next 4 */
      if (_selectedIssue?.id === prefillIssueId) {
        _selectedIssue.is_closed = status?.is_closed ?? false;
        updateTicketInfo();
      }
    });
  }
}
