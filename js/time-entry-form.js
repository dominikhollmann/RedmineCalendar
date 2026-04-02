import { getTimeEntryActivities, searchIssues,
         createTimeEntry, updateTimeEntry,
         deleteTimeEntry }                  from './redmine-api.js';

// ── Modal HTML (injected once) ────────────────────────────────────
const MODAL_ID   = 'time-entry-modal';
const CONFIRM_ID = 'delete-confirm-modal';

function ensureModal() {
  if (document.getElementById(MODAL_ID)) return;

  document.body.insertAdjacentHTML('beforeend', `
    <div id="${MODAL_ID}" class="modal-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="form-title">
      <div class="modal-card">
        <h2 id="form-title">Log Time Entry</h2>
        <div id="form-error" class="inline-error hidden"></div>

        <div class="modal-row">
          <div>
            <label for="f-date">Date</label>
            <input type="date" id="f-date" required />
          </div>
          <div>
            <label for="f-start">Start time</label>
            <input type="time" id="f-start" step="900" />
          </div>
        </div>

        <div class="modal-row">
          <div>
            <label for="f-hours">Hours</label>
            <input type="number" id="f-hours" min="0" max="24" step="0.25" value="0.25" required />
          </div>
          <div>
            <label for="f-minutes">Minutes</label>
            <input type="number" id="f-minutes" min="0" max="45" step="15" value="15" />
          </div>
        </div>

        <label for="f-issue-search">Ticket / Issue</label>
        <div class="search-wrapper">
          <input type="text" id="f-issue-search" placeholder="Search by ID or title…" autocomplete="off" />
          <input type="hidden" id="f-issue-id" />
          <div id="f-search-results" class="search-results hidden"></div>
        </div>
        <div id="f-issue-display" style="font-size:0.82rem;color:#3b82f6;margin-top:0.25rem;min-height:1rem;"></div>

        <label for="f-activity">Activity</label>
        <select id="f-activity" required></select>

        <label for="f-comment">Comment (optional)</label>
        <textarea id="f-comment" rows="2"></textarea>

        <div class="modal-actions">
          <button id="f-delete" class="btn-danger" style="display:none;">Delete</button>
          <button id="f-cancel" class="btn-secondary">Cancel</button>
          <button id="f-save"   class="btn-primary">Save</button>
        </div>
      </div>
    </div>

    <div id="${CONFIRM_ID}" class="confirm-overlay hidden" role="dialog" aria-modal="true">
      <div class="confirm-card">
        <p>Delete this time entry? This cannot be undone.</p>
        <div class="confirm-actions">
          <button id="confirm-cancel" class="btn-secondary">Cancel</button>
          <button id="confirm-ok"     class="btn-danger">Delete</button>
        </div>
      </div>
    </div>
  `);
}

// ── Element refs (lazy) ───────────────────────────────────────────
function els() {
  return {
    modal:        document.getElementById(MODAL_ID),
    confirm:      document.getElementById(CONFIRM_ID),
    title:        document.getElementById('form-title'),
    errorEl:      document.getElementById('form-error'),
    dateInput:    document.getElementById('f-date'),
    startInput:   document.getElementById('f-start'),
    hoursInput:   document.getElementById('f-hours'),
    minsInput:    document.getElementById('f-minutes'),
    issueSearch:  document.getElementById('f-issue-search'),
    issueId:      document.getElementById('f-issue-id'),
    searchRes:    document.getElementById('f-search-results'),
    issueDisplay: document.getElementById('f-issue-display'),
    activity:     document.getElementById('f-activity'),
    comment:      document.getElementById('f-comment'),
    saveBtn:      document.getElementById('f-save'),
    cancelBtn:    document.getElementById('f-cancel'),
    deleteBtn:    document.getElementById('f-delete'),
    confirmCancelBtn: document.getElementById('confirm-cancel'),
    confirmOkBtn:     document.getElementById('confirm-ok'),
  };
}

// ── Activity dropdown ─────────────────────────────────────────────
async function populateActivities(selectedId) {
  const { activity } = els();
  if (activity.options.length > 1) {
    // already populated; just select
    if (selectedId) activity.value = String(selectedId);
    return;
  }
  try {
    const activities = await getTimeEntryActivities();
    activity.innerHTML = '';
    activities.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.name;
      if (a.isDefault && !selectedId) opt.selected = true;
      if (selectedId && a.id === selectedId) opt.selected = true;
      activity.appendChild(opt);
    });
  } catch {
    activity.innerHTML = '<option value="">Failed to load activities</option>';
  }
}

// ── Issue search ──────────────────────────────────────────────────
let _searchTimer = null;

function wireIssueSearch() {
  const { issueSearch, searchRes, issueId, issueDisplay } = els();

  issueSearch.addEventListener('input', () => {
    clearTimeout(_searchTimer);
    const q = issueSearch.value.trim();
    if (q.length < 2) { searchRes.classList.add('hidden'); return; }
    _searchTimer = setTimeout(() => doSearch(q), 300);
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!issueSearch.contains(e.target) && !searchRes.contains(e.target)) {
      searchRes.classList.add('hidden');
    }
  }, { capture: true });
}

async function doSearch(q) {
  const { searchRes, issueId, issueDisplay } = els();
  searchRes.innerHTML = '';
  searchRes.classList.remove('hidden');

  try {
    const results = await searchIssues(q);
    if (!results.length) {
      searchRes.innerHTML = '<div class="search-unavailable">No results found.</div>';
      return;
    }
    results.forEach(issue => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.textContent = `#${issue.id} ${issue.subject} (${issue.projectName})`;
      item.addEventListener('click', () => {
        issueId.value = issue.id;
        issueDisplay.textContent = `#${issue.id} ${issue.subject}`;
        els().issueSearch.value = '';
        searchRes.classList.add('hidden');
      });
      searchRes.appendChild(item);
    });
  } catch {
    searchRes.innerHTML = '<div class="search-unavailable">Search unavailable.</div>';
  }
}

// ── Hours / minutes sync ──────────────────────────────────────────
function setDuration(hours) {
  const { hoursInput, minsInput } = els();
  const totalMins = Math.round(hours * 60);
  hoursInput.value = Math.floor(totalMins / 60);
  minsInput.value  = totalMins % 60;
}

function getDurationHours() {
  const { hoursInput, minsInput } = els();
  return parseFloat(hoursInput.value || 0) + parseFloat(minsInput.value || 0) / 60;
}

// ── Open form ─────────────────────────────────────────────────────
/**
 * Open the time entry form.
 * @param {object|null} entry   Existing TimeEntry to edit, or null to create.
 * @param {object}      prefill { date, startTime, hours } for new entries.
 * @param {function}    onSave  Called with the saved TimeEntry on success.
 * @param {function}    onDelete Called with the deleted entry ID on success.
 */
export function openForm(entry, prefill = {}, onSave, onDelete) {
  ensureModal();
  const e = els();

  const isEdit = !!entry;
  e.title.textContent = isEdit ? 'Edit Time Entry' : 'Log Time Entry';
  e.deleteBtn.style.display = isEdit ? '' : 'none';
  e.deleteBtn.disabled = false;
  e.errorEl.classList.add('hidden');

  // Pre-fill fields
  e.dateInput.value  = entry?.date  ?? prefill.date  ?? new Date().toISOString().slice(0,10);
  e.startInput.value = entry?.startTime ?? prefill.startTime ?? '';
  setDuration(entry?.hours ?? prefill.hours ?? 0.25);

  e.issueId.value = entry?.issueId ? String(entry.issueId) : '';
  e.issueDisplay.textContent = entry?.issueSubject
    ? `#${entry.issueId} ${entry.issueSubject}` : '';
  e.issueSearch.value = '';
  e.comment.value = entry?.comment ?? '';

  populateActivities(entry?.activityId ?? null);
  wireIssueSearch();

  // Show modal
  e.modal.classList.remove('hidden');

  // ── Cancel ──────────────────────────────────────────────────────
  function closeModal() {
    e.modal.classList.add('hidden');
    e.searchRes.classList.add('hidden');
  }
  e.cancelBtn.onclick = closeModal;
  e.modal.addEventListener('click', (ev) => {
    if (ev.target === e.modal) closeModal();
  }, { once: true });

  // ── Save ─────────────────────────────────────────────────────────
  e.saveBtn.onclick = async () => {
    e.errorEl.classList.add('hidden');

    const issueIdVal   = parseInt(e.issueId.value, 10);
    const activityId   = parseInt(e.activity.value, 10);
    const hours        = getDurationHours();
    const date         = e.dateInput.value;
    const startTime    = e.startInput.value || null;
    const comment      = e.comment.value.trim();

    if (!issueIdVal) { showFormError('Please select a ticket.'); return; }
    if (!activityId) { showFormError('Please select an activity.'); return; }
    if (hours <= 0)  { showFormError('Duration must be greater than 0.'); return; }
    if (startTime) {
      const [sh, sm] = startTime.split(':').map(Number);
      if ((sh * 60 + sm) + Math.round(hours * 60) > 24 * 60) {
        showFormError('Entry cannot extend past midnight. Please reduce the duration or start time.');
        return;
      }
    }

    e.saveBtn.disabled = true;
    e.saveBtn.textContent = 'Saving…';

    try {
      let saved;
      if (isEdit) {
        saved = await updateTimeEntry(entry.id, { hours, activityId, comment, startTime, issueId: issueIdVal, spentOn: date });
        // Ensure we carry over subject if API doesn't return it
        if (!saved.issueSubject) saved.issueSubject = entry.issueSubject;
      } else {
        saved = await createTimeEntry({ issueId: issueIdVal, spentOn: date, hours, activityId, comment, startTime });
      }
      closeModal();
      onSave?.(saved);
    } catch (err) {
      showFormError(err.message);
    } finally {
      e.saveBtn.disabled = false;
      e.saveBtn.textContent = 'Save';
    }
  };

  // ── Delete ────────────────────────────────────────────────────────
  e.deleteBtn.onclick = () => {
    e.confirm.classList.remove('hidden');
    e.confirmCancelBtn.onclick = () => e.confirm.classList.add('hidden');
    e.confirmOkBtn.onclick = async () => {
      e.confirm.classList.add('hidden');
      e.deleteBtn.disabled = true;
      try {
        await deleteTimeEntry(entry.id);
        closeModal();
        onDelete?.(entry.id);
      } catch (err) {
        showFormError(err.message);
        e.deleteBtn.disabled = false;
      }
    };
  };

  function showFormError(msg) {
    e.errorEl.textContent = msg;
    e.errorEl.classList.remove('hidden');
  }
}
