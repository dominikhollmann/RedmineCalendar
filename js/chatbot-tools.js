import { t } from './i18n.js';
import { readWorkingHours, readWeeklyHours, getCentralConfigSync } from './settings.js';
import {
  fetchTimeEntries,
  fetchTimeEntryById,
  resolveIssueSubject,
  enrichEntries,
  searchIssues,
  mapTimeEntry,
} from './redmine-api.js';
import { openForm } from './time-entry-form.js';
import { isOutlookConfigured, fetchCalendarEvents, parseCalendarProposals } from './outlook.js';

const _defaultStart = readWorkingHours()?.start || '09:00';

const TOOL_SCHEMAS_CLAUDE = [
  {
    name: 'query_time_entries',
    description:
      "Query the user's time entries from Redmine for a date range, optionally filtered by ticket number. Returns a summary of matching entries.",
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
    description:
      "Open the time entry form pre-filled with values so the user can create a new entry. The user must confirm by clicking Save. You MUST provide start_time — if the user didn't specify one, default to their working hours start (typically 08:00). For break-ticket entries (hours=0) you MUST also provide end_time so the calendar slot reflects the actual event duration.",
    input_schema: {
      type: 'object',
      properties: {
        issue_id: { type: 'number', description: 'Redmine ticket number' },
        hours: { type: 'number', description: 'Number of hours to log (0 for break entries).' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        comment: { type: 'string', description: 'Optional comment' },
        start_time: {
          type: 'string',
          description:
            "Start time in HH:MM format. Required — default to the user's working hours start if not specified.",
        },
        end_time: {
          type: 'string',
          description:
            'End time in HH:MM format. Required for break entries (hours=0) and recommended whenever the calendar event has a known end. If omitted, the form computes end from start+hours.',
        },
      },
      required: ['issue_id', 'hours', 'date', 'start_time'],
    },
  },
  {
    name: 'edit_time_entry',
    description:
      'Open the time entry form for an existing entry so the user can edit it. Use this for ANY modification: changing hours, adding/changing a comment, changing the date, etc. Identify the entry by ID (from a previous query) OR by date + ticket number. If multiple entries match, return them so the user can pick one. Do NOT use query_time_entries when the user wants to modify an entry — use this tool directly.',
    input_schema: {
      type: 'object',
      properties: {
        entry_id: { type: 'number', description: 'Time entry ID (if known from a previous query)' },
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD to find the entry (alternative to entry_id)',
        },
        issue_id: {
          type: 'number',
          description: 'Ticket number to find the entry (used with date)',
        },
        hours: { type: 'number', description: 'New number of hours (optional)' },
        comment: { type: 'string', description: 'New comment (optional)' },
      },
      required: [],
    },
  },
  {
    name: 'search_tickets',
    description:
      'Search for Redmine tickets by any combination of keywords. Each word is matched against ticket subject, project name, and project identifier (AND logic). Use this to find the correct issue_id before creating a time entry when the user references a project name or ticket title.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Search query — space-separated words matched against ticket subject, project name, and project identifier',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'delete_time_entry',
    description:
      'Open the time entry form for an existing entry so the user can delete it. You can identify the entry by ID OR by date + ticket number. If multiple entries match, return them so the user can pick one.',
    input_schema: {
      type: 'object',
      properties: {
        entry_id: { type: 'number', description: 'Time entry ID (if known from a previous query)' },
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD to find the entry (alternative to entry_id)',
        },
        issue_id: {
          type: 'number',
          description: 'Ticket number to find the entry (used with date)',
        },
      },
      required: [],
    },
  },
];

const OUTLOOK_TOOL_SCHEMA = {
  name: 'book_outlook_day',
  description: `Fetch Outlook calendar events for a day and propose Redmine time entries. The tool returns up to four labelled sections in this order:

1. EXCLUDED — events filtered out (overlaps an existing entry, or informational all-day events like birthdays/anniversaries/reminders). You MUST mention each excluded event by name and reason in your summary.
2. AUTO-ROUTED TO BREAK TICKET — non-work events the tool already classified (e.g. lunch, doctor, gym, private appointment). Each line has status=proposed, hours=0, ticket=break ticket. Call create_time_entry for each one silently — do NOT ask the user.
3. BOOKABLE MEETINGS — work meetings with a ticket extracted from the subject (e.g. "Sprint #2097"); bank-holiday all-day events mapped to the configured holiday ticket; vacation/OOO all-day events mapped to the configured vacation ticket. Each has status=proposed. Call create_time_entry for each.
4. NEEDS USER INPUT — meetings without a ticket the tool could not classify (work-sounding but no #ID); all-day events that are sick days (the tool deliberately never auto-routes sick leave); other all-day events that don't match any classifier. Ask the user explicitly which ticket to book on, or whether to skip — never silently put them on a default ticket.

The tool itself does the non-work classification — do NOT second-guess it. Extraction always wins (a "Lunch Sync #1234" goes to #1234, not the break ticket). If the user disagrees with a break routing in conversation, you can reroute via create_time_entry on a different ticket.`,
  input_schema: {
    type: 'object',
    properties: {
      date: {
        type: 'string',
        description: 'Date in YYYY-MM-DD format. Defaults to today if not specified.',
      },
    },
    required: [],
  },
};

function toOpenAITools(claudeTools) {
  return claudeTools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}

export function getToolSchemas(provider) {
  const tools = isOutlookConfigured()
    ? [...TOOL_SCHEMAS_CLAUDE, OUTLOOK_TOOL_SCHEMA]
    : TOOL_SCHEMAS_CLAUDE;
  if (provider === 'claude') return tools;
  return toOpenAITools(tools);
}

let _onCalendarRefresh = null;

function highlightAiFields(fields) {
  setTimeout(() => {
    fields.forEach((id) => {
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
    case 'search_tickets':
      return await executeSearch(input);
    case 'delete_time_entry':
      return await executeDelete(input);
    case 'book_outlook_day':
      return await executeBookOutlookDay(input);
    default:
      return { result: `Unknown tool: ${name}` };
  }
}

async function executeQuery({ from, to, issue_id }) {
  const rawEntries = await fetchTimeEntries(from, to);
  const entries = rawEntries.map(mapTimeEntry).filter(Boolean);
  await enrichEntries(entries);
  let filtered = entries;
  if (issue_id) {
    filtered = entries.filter((e) => e.issue?.id === issue_id || e.issueId === issue_id);
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
  return {
    date,
    dayName: formatDayName(date),
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

function formatDayName(date) {
  if (!date) return '';
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
}

async function executeSearch({ query }) {
  const results = await searchIssues(query);
  if (results.length === 0) return { result: 'No tickets found.' };
  const lines = results.map((r) => {
    const proj = r.projectIdentifier ? `${r.projectIdentifier} — ${r.projectName}` : r.projectName;
    return `- #${r.id} ${r.subject} [${proj}] (${r.status})`;
  });
  return { result: `Found ${results.length} tickets:\n${lines.join('\n')}` };
}

async function executeCreate({ issue_id, hours, date, comment, start_time, end_time }) {
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
        if (_onCalendarRefresh) _onCalendarRefresh();
        resolve({ result: `Time entry created: ${hours}h on #${issue_id} for ${date}` });
      },
      null,
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
    const raw = await fetchTimeEntryById(entry_id);
    return { entry: raw ? mapTimeEntry(raw) : null };
  }
  if (date) {
    const raw = await fetchTimeEntries(date, date);
    const entries = raw.map(mapTimeEntry).filter(Boolean);
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

async function executeEdit({ entry_id, date, issue_id, hours, comment }) {
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
        if (_onCalendarRefresh) _onCalendarRefresh();
        resolve({ result: `Time entry ${entry.id} updated.` });
      },
      null,
      () =>
        resolve({
          result: `User cancelled the time-entry form for entry ${entry.id} — no changes made.`,
        })
    );
    highlightAiFields(editedFields);
  });
}

async function executeDelete({ entry_id, date, issue_id }) {
  const { entry, error } = await findEntry({ entry_id, date, issue_id });
  if (error) return { result: error };
  if (!entry) return { result: t('chatbot.no_entries_found') };

  return new Promise((resolve) => {
    openForm(
      entryForModal(entry),
      {},
      null,
      () => {
        if (_onCalendarRefresh) _onCalendarRefresh();
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

async function executeBookOutlookDay({ date }) {
  if (!isOutlookConfigured()) return { result: t('outlook.not_configured') };
  const targetDate = date || new Date().toISOString().slice(0, 10);

  let events;
  try {
    events = await fetchCalendarEvents(targetDate);
  } catch (err) {
    return { result: t('outlook.fetch_error', { message: err.message }) };
  }
  if (events.length === 0) return { result: t('outlook.no_events', { date: targetDate }) };

  const existingEntries = await loadExistingEntries(targetDate);
  const cfg = readBookingConfig();
  const { proposals, skippedOverlap, skippedInformational } = parseCalendarProposals(
    events,
    existingEntries,
    cfg.weeklyHours,
    cfg.holidayTicket,
    cfg.vacationTicket,
    cfg.breakTicket,
    cfg.workStart
  );
  const ticketSubjects = await resolveTicketSubjects(proposals);
  const g = groupProposals(proposals);

  const lines = [];
  appendExcludedSection(lines, skippedOverlap, skippedInformational);
  appendBreakSection(lines, g.breakProposals, cfg.breakTicket, ticketSubjects);
  appendBookableSection(lines, g.workProposals, targetDate, ticketSubjects);
  appendNeedsInputSection(lines, g.needsInput);
  if (proposals.length === 0 && skippedOverlap.length === 0 && skippedInformational.length === 0) {
    lines.push(t('outlook.no_events', { date: targetDate }));
  }
  return { result: lines.join('\n') };
}

async function loadExistingEntries(date) {
  const rawEntries = await fetchTimeEntries(date, date);
  return rawEntries.map(mapTimeEntry).filter(Boolean);
}

function readBookingConfig() {
  const centralCfg = getCentralConfigSync() ?? {};
  return {
    weeklyHours: readWeeklyHours() ?? 40,
    holidayTicket: positiveTicketOrNull(centralCfg.holidayTicket),
    vacationTicket: positiveTicketOrNull(centralCfg.vacationTicket),
    breakTicket: positiveTicketOrNull(centralCfg.breakTicket),
    workStart: readWorkingHours()?.start || '09:00',
  };
}

function positiveTicketOrNull(value) {
  return Number.isFinite(value) && value > 0 ? value : null;
}

async function resolveTicketSubjects(proposals) {
  const ids = new Set();
  for (const p of proposals) if (p.ticketId) ids.add(p.ticketId);
  const subjects = {};
  for (const id of ids) {
    try {
      subjects[id] = await resolveIssueSubject(id);
    } catch {
      subjects[id] = '';
    }
  }
  return subjects;
}

function groupProposals(proposals) {
  return {
    breakProposals: proposals.filter((p) => p.category === 'break'),
    workProposals: proposals.filter((p) => p.category !== 'break' && p.status === 'proposed'),
    needsInput: proposals.filter((p) => p.status === 'needs-ticket'),
  };
}

function appendExcludedSection(lines, skippedOverlap, skippedInformational) {
  if (skippedOverlap.length === 0 && skippedInformational.length === 0) return;
  lines.push(t('outlook.excluded_header'));
  for (const subject of skippedOverlap) {
    lines.push(`- ${t('outlook.skipped_overlap_item', { subject })}`);
  }
  for (const subject of skippedInformational) {
    lines.push(`- ${t('outlook.skipped_informational_item', { subject })}`);
  }
  lines.push('');
}

function appendBreakSection(lines, breakProposals, breakTicket, ticketSubjects) {
  if (breakProposals.length === 0) {
    if (!breakTicket) {
      lines.push(t('chatbot.break_routing_disabled'));
      lines.push('');
    }
    return;
  }
  lines.push(
    t('outlook.break_section_header', {
      ticket: breakTicket,
      ticketSubject: ticketSubjects[breakTicket] || '',
    })
  );
  for (const p of breakProposals) {
    lines.push(
      `- ${t('outlook.break_proposal', {
        subject: p.subject,
        ticket: p.ticketId,
        ticketSubject: ticketSubjects[p.ticketId] || '',
        start: p.startTime,
        end: p.endTime,
      })}`
    );
  }
  lines.push('');
}

function appendBookableSection(lines, workProposals, date, ticketSubjects) {
  if (workProposals.length === 0) return;
  lines.push(t('outlook.bookable_header', { date }));
  for (const p of workProposals) {
    lines.push(`- ${formatBookableProposal(p, ticketSubjects)}`);
  }
  lines.push('');
}

function formatBookableProposal(p, ticketSubjects) {
  const ticketSubject = p.ticketId ? ticketSubjects[p.ticketId] || '' : '';
  const base = { subject: p.subject, ticket: p.ticketId, ticketSubject, hours: p.hours };
  if (p.isAllDay && p.category === 'holiday') return t('outlook.holiday_proposal_subject', base);
  if (p.isAllDay && p.category === 'vacation') return t('outlook.vacation_proposal_subject', base);
  return t('outlook.meeting_with_ticket_subject', { ...base, start: p.startTime, end: p.endTime });
}

function appendNeedsInputSection(lines, needsInput) {
  if (needsInput.length === 0) return;
  lines.push(t('outlook.needs_input_header'));
  for (const p of needsInput) {
    if (p.isAllDay) {
      lines.push(`- ${t('outlook.allday_ask', { subject: p.subject })}`);
    } else {
      lines.push(
        `- ${t('outlook.meeting_no_ticket', { subject: p.subject, start: p.startTime, end: p.endTime, hours: p.hours })}`
      );
    }
  }
  lines.push('');
}
