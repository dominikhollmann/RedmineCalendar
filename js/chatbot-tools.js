// Tool registry: schemas exposed to the AI provider + the executeTool dispatcher.
// Actual tool implementations live in chatbot-tools-entries.js (Redmine entry
// operations) and chatbot-tools-outlook.js (Outlook calendar booking).

import { isOutlookConfigured } from './outlook.js';
import {
  executeQuery,
  executeSearch,
  executeCreate,
  executeEdit,
  executeDelete,
} from './chatbot-tools-entries.js';
import { executeBookOutlookDay } from './chatbot-tools-outlook.js';

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

export function setCalendarRefreshCallback(cb) {
  _onCalendarRefresh = cb;
}

export async function executeTool(name, input) {
  switch (name) {
    case 'query_time_entries':
      return await executeQuery(input);
    case 'create_time_entry':
      return await executeCreate(input, _onCalendarRefresh);
    case 'edit_time_entry':
      return await executeEdit(input, _onCalendarRefresh);
    case 'search_tickets':
      return await executeSearch(input);
    case 'delete_time_entry':
      return await executeDelete(input, _onCalendarRefresh);
    case 'book_outlook_day':
      return await executeBookOutlookDay(input);
    default:
      return { result: `Unknown tool: ${name}` };
  }
}
