import { t } from './i18n.js';
import { fetchTimeEntries, resolveIssueSubject, searchIssues } from './redmine-api.js';
import { openForm } from './time-entry-form.js';

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
        start_time: { type: 'string', description: 'Start time in HH:MM format. Required — default to 08:00 if user did not specify.' },
      },
      required: ['issue_id', 'hours', 'date', 'start_time'],
    },
  },
  {
    name: 'edit_time_entry',
    description: 'Open the time entry form for an existing entry so the user can edit it. First query entries to find the right one by date and ticket.',
    input_schema: {
      type: 'object',
      properties: {
        entry_id: { type: 'number', description: 'Time entry ID to edit (from a previous query result)' },
        hours: { type: 'number', description: 'New number of hours (optional)' },
        comment: { type: 'string', description: 'New comment (optional)' },
      },
      required: ['entry_id'],
    },
  },
  {
    name: 'delete_time_entry',
    description: 'Open the time entry form for an existing entry so the user can delete it. The user must confirm deletion.',
    input_schema: {
      type: 'object',
      properties: {
        entry_id: { type: 'number', description: 'Time entry ID to delete (from a previous query result)' },
      },
      required: ['entry_id'],
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
  const entries = await fetchTimeEntries(from, to);
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
    const comment = e.comment || e.comments || '';
    return `- ${dayName} ${date}: #${id} ${subject} — ${hours}h${comment ? ' (' + comment + ')' : ''}`;
  });

  return {
    result: `Found ${filtered.length} entries (${totalHours}h total):\n${lines.join('\n')}`,
  };
}

async function executeCreate({ issue_id, hours, date, comment, start_time, end_time }) {
  if (!start_time) start_time = '08:00';
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

    setTimeout(() => {
      const modal = document.getElementById('lean-time-modal');
      if (modal && modal.classList.contains('hidden')) {
        resolve({ result: 'Form was cancelled — no entry created.' });
      }
    }, 120000);
  });
}

async function executeEdit({ entry_id, hours, comment }) {
  const entries = await fetchTimeEntries('2020-01-01', '2099-12-31');
  const entry = entries.find(e => e.id === entry_id);

  if (!entry) {
    return { result: `No time entry found with ID ${entry_id}.` };
  }

  return new Promise((resolve) => {
    const modified = { ...entry };
    if (hours != null) modified.hours = hours;
    if (comment != null) modified.comment = comment;

    openForm(modified, {}, (savedEntry) => {
      if (_onCalendarRefresh) _onCalendarRefresh();
      resolve({ result: `Time entry ${entry_id} updated.` });
    });

    setTimeout(() => {
      resolve({ result: 'Form was cancelled — no changes made.' });
    }, 120000);
  });
}

async function executeDelete({ entry_id }) {
  const entries = await fetchTimeEntries('2020-01-01', '2099-12-31');
  const entry = entries.find(e => e.id === entry_id);

  if (!entry) {
    return { result: `No time entry found with ID ${entry_id}.` };
  }

  return new Promise((resolve) => {
    openForm(entry, {}, null, () => {
      if (_onCalendarRefresh) _onCalendarRefresh();
      resolve({ result: `Time entry ${entry_id} deleted.` });
    });

    setTimeout(() => {
      resolve({ result: 'Form was cancelled — no deletion.' });
    }, 120000);
  });
}
