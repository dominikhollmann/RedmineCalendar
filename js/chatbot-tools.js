import { t } from './i18n.js';
import { readWorkingHours } from './settings.js';
import { fetchTimeEntries, resolveIssueSubject, searchIssues, mapTimeEntry } from './redmine-api.js';
import { openForm } from './time-entry-form.js';

const _defaultStart = readWorkingHours()?.start || '09:00';

const TOOL_SCHEMAS_CLAUDE = [
  {
    name: 'query_time_entries',
    description: 'Query the user\'s time entries from Redmine for a date range, optionally filtered by ticket number. Returns a summary of matching entries.',
    input_schema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
        to: { type: 'string', description: 'End date in YYYY-MM-DD format' },
        issue_id: { type: 'number', description: 'Optional: filter by Redmine ticket number' },
      },
      required: ['from', 'to'],
    },
  },
  {
    name: 'create_time_entry',
    description: 'Open the time entry form pre-filled with values so the user can create a new entry. The user must confirm by clicking Save. You MUST provide start_time — if the user didn\'t specify one, default to their working hours start (typically 08:00). Two of three values (start_time, end_time, hours) are sufficient — compute the third.',
    input_schema: {
      type: 'object',
      properties: {
        issue_id: { type: 'number', description: 'Redmine ticket number' },
        hours: { type: 'number', description: 'Number of hours to log' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        comment: { type: 'string', description: 'Optional comment' },
        start_time: { type: 'string', description: 'Start time in HH:MM format. Required — default to the user\'s working hours start if not specified.' },
      },
      required: ['issue_id', 'hours', 'date', 'start_time'],
    },
  },
  {
    name: 'edit_time_entry',
    description: 'Open the time entry form for an existing entry so the user can edit it. You can identify the entry by ID (from a previous query) OR by date + ticket number. If multiple entries match, return them so the user can pick one.',
    input_schema: {
      type: 'object',
      properties: {
        entry_id: { type: 'number', description: 'Time entry ID (if known from a previous query)' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD to find the entry (alternative to entry_id)' },
        issue_id: { type: 'number', description: 'Ticket number to find the entry (used with date)' },
        hours: { type: 'number', description: 'New number of hours (optional)' },
        comment: { type: 'string', description: 'New comment (optional)' },
      },
      required: [],
    },
  },
  {
    name: 'delete_time_entry',
    description: 'Open the time entry form for an existing entry so the user can delete it. You can identify the entry by ID OR by date + ticket number. If multiple entries match, return them so the user can pick one.',
    input_schema: {
      type: 'object',
      properties: {
        entry_id: { type: 'number', description: 'Time entry ID (if known from a previous query)' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD to find the entry (alternative to entry_id)' },
        issue_id: { type: 'number', description: 'Ticket number to find the entry (used with date)' },
      },
      required: [],
    },
  },
];

function toOpenAITools(claudeTools) {
  return claudeTools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}

export function getToolSchemas(provider) {
  if (provider === 'claude') return TOOL_SCHEMAS_CLAUDE;
  return toOpenAITools(TOOL_SCHEMAS_CLAUDE);
}

let _onCalendarRefresh = null;

function highlightAiFields(fields) {
  setTimeout(() => {
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('ai-highlight');
    });
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

export function setCalendarRefreshCallback(cb) {
  _onCalendarRefresh = cb;
}

export async function executeTool(name, input) {
  switch (name) {
    case 'query_time_entries':
      return await executeQuery(input);
    case 'create_time_entry':
      return await executeCreate(input);
    case 'edit_time_entry':
      return await executeEdit(input);
    case 'delete_time_entry':
      return await executeDelete(input);
    default:
      return { result: `Unknown tool: ${name}` };
  }
}

async function executeQuery({ from, to, issue_id }) {
  const rawEntries = await fetchTimeEntries(from, to);
  const entries = rawEntries.map(mapTimeEntry).filter(Boolean);
  let filtered = entries;
  if (issue_id) {
    filtered = entries.filter(e => e.issue?.id === issue_id || e.issueId === issue_id);
  }

  if (filtered.length === 0) {
    return { result: t('chatbot.no_entries_found') };
  }

  const totalHours = filtered.reduce((sum, e) => sum + (e.hours || 0), 0);
  const lines = filtered.map(e => {
    const id = e.issueId ?? e.issue?.id ?? '?';
    const subject = e.issueSubject ?? e.issue?.subject ?? '';
    const date = e.date ?? e.spent_on ?? '';
    const dayName = date ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }) : '';
    const hours = e.hours ?? 0;
    const start = e.startTime ?? '';
    const comment = e.comment || e.comments || '';
    return `- ${dayName} ${date}${start ? ' ' + start : ''}: #${id} ${subject} — ${hours}h${comment ? ' (' + comment + ')' : ''} [ID: ${e.id}]`;
  });

  return {
    result: `Found ${filtered.length} entries (${totalHours}h total):\n${lines.join('\n')}`,
  };
}

async function executeCreate({ issue_id, hours, date, comment, start_time, end_time }) {
  if (!start_time) start_time = _defaultStart;
  if (!start_time && end_time && hours) {
    const [eh, em] = end_time.split(':').map(Number);
    const startMins = eh * 60 + em - Math.round(hours * 60);
    start_time = `${String(Math.floor(startMins / 60) % 24).padStart(2, '0')}:${String(startMins % 60).padStart(2, '0')}`;
  }
  let subject = '';
  try {
    subject = await resolveIssueSubject(issue_id);
  } catch { /* use empty */ }

  return new Promise((resolve) => {
    const prefill = {
      issueId: issue_id,
      issueSubject: subject,
      date,
      hours,
      comment: comment || '',
      startTime: start_time || null,
    };

    openForm(null, prefill, (savedEntry) => {
      if (_onCalendarRefresh) _onCalendarRefresh();
      resolve({ result: `Time entry created: ${hours}h on #${issue_id} for ${date}` });
    });
    highlightAiFields(['lean-info-date', 'lean-info-start', 'lean-info-end', 'lean-search']);

    setTimeout(() => {
      const modal = document.getElementById('lean-time-modal');
      if (modal && modal.classList.contains('hidden')) {
        resolve({ result: 'Form was cancelled — no entry created.' });
      }
    }, 120000);
  });
}

async function executeEdit({ entry_id, date, issue_id, hours, comment }) {
  let entry;
  if (entry_id) {
    const raw = await fetchTimeEntries('2020-01-01', '2099-12-31');
    entry = raw.map(mapTimeEntry).filter(Boolean).find(e => e.id === entry_id);
  } else if (date) {
    const raw = await fetchTimeEntries(date, date);
    const entries = raw.map(mapTimeEntry).filter(Boolean);
    const matches = issue_id ? entries.filter(e => e.issueId === issue_id) : entries;
    if (matches.length === 0) return { result: t('chatbot.no_entries_found') };
    if (matches.length > 1) {
      const lines = matches.map(e => `- ID ${e.id}: #${e.issueId} ${e.issueSubject ?? ''} — ${e.hours}h${e.startTime ? ' at ' + e.startTime : ''}`);
      return { result: `${t('chatbot.multiple_matches')}\n${lines.join('\n')}` };
    }
    entry = matches[0];
  }

  if (!entry) {
    return { result: t('chatbot.no_entries_found') };
  }

  return new Promise((resolve) => {
    const modified = {
      id: entry.id,
      date: entry.date,
      issueId: entry.issueId,
      issueSubject: entry.issueSubject,
      projectName: entry.projectName,
      activityId: entry.activityId,
      hours: hours ?? entry.hours,
      startTime: entry.startTime,
      comment: comment ?? entry.comment ?? '',
    };

    openForm(modified, {}, (savedEntry) => {
      if (_onCalendarRefresh) _onCalendarRefresh();
      resolve({ result: `Time entry ${entry.id} updated.` });
    });
    const editedFields = [];
    if (date && date !== entry.date) editedFields.push('lean-info-date');
    if (hours != null) editedFields.push('lean-info-start', 'lean-info-end');
    if (comment != null) editedFields.push('lean-comment');
    highlightAiFields(editedFields);

    setTimeout(() => {
      resolve({ result: 'Form was cancelled — no changes made.' });
    }, 120000);
  });
}

async function executeDelete({ entry_id, date, issue_id }) {
  let entry;
  if (entry_id) {
    const raw = await fetchTimeEntries('2020-01-01', '2099-12-31');
    entry = raw.map(mapTimeEntry).filter(Boolean).find(e => e.id === entry_id);
  } else if (date) {
    const raw = await fetchTimeEntries(date, date);
    const entries = raw.map(mapTimeEntry).filter(Boolean);
    const matches = issue_id ? entries.filter(e => e.issueId === issue_id) : entries;
    if (matches.length === 0) return { result: t('chatbot.no_entries_found') };
    if (matches.length > 1) {
      const lines = matches.map(e => `- ID ${e.id}: #${e.issueId} ${e.issueSubject ?? ''} — ${e.hours}h${e.startTime ? ' at ' + e.startTime : ''}`);
      return { result: `${t('chatbot.multiple_matches')}\n${lines.join('\n')}` };
    }
    entry = matches[0];
  }

  if (!entry) {
    return { result: t('chatbot.no_entries_found') };
  }

  const entryForModal = {
    id: entry.id,
    date: entry.date,
    issueId: entry.issueId,
    issueSubject: entry.issueSubject,
    projectName: entry.projectName,
    activityId: entry.activityId,
    hours: entry.hours,
    startTime: entry.startTime,
    comment: entry.comment ?? '',
  };

  return new Promise((resolve) => {
    openForm(entryForModal, {}, null, () => {
      if (_onCalendarRefresh) _onCalendarRefresh();

      resolve({ result: `Time entry ${entry.id} deleted.` });
    });
    highlightDeleteButton();

    setTimeout(() => {
      resolve({ result: 'Form was cancelled — no deletion.' });
    }, 120000);
  });
}
