// Redmine time-entry tools: query, search, create, edit, delete.
// Each execute* function is called by the dispatcher in chatbot-tools.js.
// The create/edit/delete functions accept an optional onCalendarRefresh
// callback (passed from the module-level singleton in chatbot-tools.js) so
// the calendar re-renders after the user saves or deletes an entry.

/** @typedef {import('./types').TimeEntry} TimeEntry */
import { t } from './i18n.js';
import { readWorkingHours } from './settings.js';
import {
  fetchTimeEntries,
  fetchTimeEntryById,
  resolveIssueSubject,
  enrichEntries,
  searchIssues,
  mapTimeEntry,
  RedmineError,
} from './redmine-api.js';
import { openForm } from './time-entry-form.js';
import {
  isValidDate,
  isValidTime,
  isValidId,
  isValidHours,
  isValidQuery,
} from './chatbot-tools-validators.js';

const _defaultStart = readWorkingHours()?.start || '09:00';

function highlightAiFields(fields) {
  setTimeout(() => {
    fields.forEach((id) => document.getElementById(id)?.classList.add('ai-highlight'));
  }, 100);
}

function highlightDeleteButton() {
  setTimeout(() => {
    const btn = document.getElementById('lean-delete');
    if (btn) {
      btn.classList.add('ai-highlight-delete');
      btn.style.display = '';
    }
  }, 100);
}

export async function executeQuery({ from, to, issue_id }) {
  if (!isValidDate(from) || !isValidDate(to))
    return { result: 'Invalid date — expected YYYY-MM-DD.' };
  if (!isValidId(issue_id)) return { result: 'Invalid issue_id.' };
  const rawEntries = await fetchTimeEntries(from, to);
  const entries = /** @type {TimeEntry[]} */ (
    rawEntries.map(mapTimeEntry).filter((x) => x !== null)
  );
  await enrichEntries(entries);
  let filtered = entries;
  if (issue_id) {
    filtered = entries.filter(
      (e) => /** @type {any} */ (e).issue?.id === issue_id || e.issueId === issue_id
    );
  }

  if (filtered.length === 0) {
    return { result: t('chatbot.no_entries_found') };
  }

  const totalHours = filtered.reduce((sum, e) => sum + (e.hours || 0), 0);
  const lines = filtered.map(formatQueryEntryLine);

  return {
    result: `Found ${filtered.length} entries (${totalHours}h total):\n${lines.join('\n')}`,
  };
}

function formatQueryEntryLine(e) {
  const f = extractEntryFields(e);
  const startSeg = f.start ? ' ' + f.start : '';
  const projSeg = f.projDisplay ? f.projDisplay + ' / ' : '';
  const commentSeg = f.comment ? ' (' + f.comment + ')' : '';
  return `- ${f.dayName} ${f.date}${startSeg}: ${projSeg}#${f.id} ${f.subject} — ${f.hours}h${commentSeg} [ID: ${e.id}]`;
}

function extractEntryFields(e) {
  const date = e.date ?? e.spent_on ?? '';
  const dayName = date
    ? new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long' })
    : '';
  return {
    date,
    dayName,
    id: e.issueId ?? e.issue?.id ?? '?',
    subject: e.issueSubject ?? e.issue?.subject ?? '',
    hours: e.hours ?? 0,
    start: e.startTime ?? '',
    comment: e.comment || e.comments || '',
    projDisplay: formatProjectDisplay(e),
  };
}

function formatProjectDisplay(e) {
  const projId = e.projectIdentifier ?? e.project?.identifier ?? null;
  const projName = e.projectName ?? e.project?.name ?? '';
  return projId ? `${projId} — ${projName}` : projName;
}

export async function executeSearch({ query }) {
  if (!isValidQuery(query)) return { result: 'Invalid search query.' };
  const results = await searchIssues(query);
  if (results.length === 0) return { result: 'No tickets found.' };
  const lines = results.map((r) => {
    const proj = r.projectIdentifier ? `${r.projectIdentifier} — ${r.projectName}` : r.projectName;
    return `- #${r.id} ${r.subject} [${proj}] (${r.status})`;
  });
  return { result: `Found ${results.length} tickets:\n${lines.join('\n')}` };
}

export async function executeCreate(
  { issue_id, hours, date, comment, start_time, end_time },
  onCalendarRefresh = null
) {
  if (issue_id == null || !isValidId(issue_id)) return { result: 'Invalid issue_id.' };
  if (!isValidDate(date) || !isValidHours(hours)) return { result: 'Invalid date or hours.' };
  if (!isValidTime(start_time) || !isValidTime(end_time))
    return { result: 'Invalid time — expected HH:MM.' };
  if (!start_time) start_time = _defaultStart;
  let subject = '';
  try {
    subject = await resolveIssueSubject(issue_id);
  } catch {
    /* use empty */
  }

  return new Promise((resolve) => {
    const prefill = {
      issueId: issue_id,
      issueSubject: subject,
      date,
      hours,
      comment: comment || '',
      startTime: start_time || null,
      endTime: end_time || null,
    };

    openForm(
      null,
      prefill,
      (_savedEntry) => {
        if (onCalendarRefresh) onCalendarRefresh();
        resolve({ result: `Time entry created: ${hours}h on #${issue_id} for ${date}` });
      },
      /** @type {any} */ (null),
      () =>
        resolve({
          result: `User cancelled the time-entry form for #${issue_id} on ${date} — treat this as the user choosing to SKIP this meeting. Briefly acknowledge ("Skipping …") and proceed immediately to the next meeting. Do NOT ask whether to retry.`,
        })
    );
    highlightAiFields(['lean-info-date', 'lean-info-start', 'lean-info-end', 'lean-search']);
  });
}

async function findEntry({ entry_id, date, issue_id }) {
  if (entry_id) {
    let raw;
    try {
      raw = await fetchTimeEntryById(entry_id);
    } catch (err) {
      // A 404 is the recoverable "no such entry" case; anything else
      // (auth, server, network) is a real failure and must surface.
      if (err instanceof RedmineError && err.status === 404) return { entry: null };
      throw err;
    }
    return { entry: mapTimeEntry(raw) };
  }
  if (date) {
    const raw = await fetchTimeEntries(date, date);
    const entries = /** @type {TimeEntry[]} */ (raw.map(mapTimeEntry).filter((x) => x !== null));
    const matches = issue_id ? entries.filter((e) => e.issueId === issue_id) : entries;
    if (matches.length === 0) return { error: t('chatbot.no_entries_found') };
    if (matches.length > 1) {
      const lines = matches.map(
        (e) =>
          `- ID ${e.id}: #${e.issueId} ${e.issueSubject ?? ''} — ${e.hours}h${e.startTime ? ' at ' + e.startTime : ''}`
      );
      return { error: `${t('chatbot.multiple_matches')}\n${lines.join('\n')}` };
    }
    return { entry: matches[0] };
  }
  return { entry: null };
}

function entryForModal(entry, overrides = {}) {
  return {
    id: entry.id,
    date: entry.date,
    issueId: entry.issueId,
    issueSubject: entry.issueSubject,
    projectName: entry.projectName,
    activityId: entry.activityId,
    hours: entry.hours,
    startTime: entry.startTime,
    comment: entry.comment ?? '',
    ...overrides,
  };
}

export async function executeEdit(
  { entry_id, date, issue_id, hours, comment },
  onCalendarRefresh = null
) {
  if (!isValidId(entry_id) || !isValidId(issue_id) || !isValidHours(hours))
    return { result: 'Invalid input.' };
  if (date !== undefined && !isValidDate(date))
    return { result: 'Invalid date — expected YYYY-MM-DD.' };
  const { entry, error } = await findEntry({ entry_id, date, issue_id });
  if (error) return { result: error };
  if (!entry) return { result: t('chatbot.no_entries_found') };

  const overrides = {};
  if (hours != null) overrides.hours = hours;
  if (comment != null) overrides.comment = comment;
  const modified = entryForModal(entry, overrides);

  const editedFields = [];
  if (date && date !== entry.date) editedFields.push('lean-info-date');
  if (hours != null) editedFields.push('lean-info-start', 'lean-info-end');
  if (comment != null) editedFields.push('lean-comment');

  return new Promise((resolve) => {
    openForm(
      modified,
      {},
      () => {
        if (onCalendarRefresh) onCalendarRefresh();
        resolve({ result: `Time entry ${entry.id} updated.` });
      },
      /** @type {any} */ (null),
      () =>
        resolve({
          result: `User cancelled the time-entry form for entry ${entry.id} — no changes made.`,
        })
    );
    highlightAiFields(editedFields);
  });
}

export async function executeDelete({ entry_id, date, issue_id }, onCalendarRefresh = null) {
  if (!isValidId(entry_id) || !isValidId(issue_id)) return { result: 'Invalid input.' };
  if (date !== undefined && !isValidDate(date))
    return { result: 'Invalid date — expected YYYY-MM-DD.' };
  const { entry, error } = await findEntry({ entry_id, date, issue_id });
  if (error) return { result: error };
  if (!entry) return { result: t('chatbot.no_entries_found') };

  return new Promise((resolve) => {
    openForm(
      entryForModal(entry),
      {},
      /** @type {any} */ (null),
      () => {
        if (onCalendarRefresh) onCalendarRefresh();
        resolve({ result: `Time entry ${entry.id} deleted.` });
      },
      () =>
        resolve({
          result: `User cancelled the time-entry form for entry ${entry.id} — no deletion performed.`,
        })
    );
    highlightDeleteButton();
  });
}
