// @ts-nocheck — dynamic schema dispatch; strict inference of imported schema literals causes false positives.
// Tool registry: schemas exposed to the AI provider + the executeTool dispatcher.
// Actual tool implementations live in chatbot-tools-entries.js (Redmine entry
// operations) and chatbot-tools-outlook.js (Outlook calendar booking).
// Static schema data lives in chatbot-tool-schemas.js (zero-import leaf module).

import { isOutlookConfigured } from './outlook.js';
import {
  executeQuery,
  executeSearch,
  executeCreate,
  executeEdit,
  executeDelete,
} from './chatbot-tools-entries.js';
import { executeBookOutlookDay } from './chatbot-tools-outlook.js';
import { TOOL_SCHEMAS_CLAUDE, OUTLOOK_TOOL_SCHEMA, toOpenAITools } from './chatbot-tool-schemas.js';
import { getCalendarRefreshCallback } from './chatbot-refresh-context.js';
import { hasPlanningAiConsent } from './privacy-store.js';

// Tools that require explicit AI planning consent before execution (FR-008).
const PLANNING_TOOLS = new Set(['book_outlook_day']);

export function getToolSchemas(provider) {
  const tools = isOutlookConfigured()
    ? [...TOOL_SCHEMAS_CLAUDE, OUTLOOK_TOOL_SCHEMA]
    : TOOL_SCHEMAS_CLAUDE;
  if (provider === 'claude') return tools;
  return toOpenAITools(tools);
}

export async function executeTool(name, input) {
  if (PLANNING_TOOLS.has(name) && !hasPlanningAiConsent()) {
    return { requiresConsent: true };
  }
  switch (name) {
    case 'query_time_entries':
      return await executeQuery(input);
    case 'create_time_entry':
      return await executeCreate(input, getCalendarRefreshCallback());
    case 'edit_time_entry':
      return await executeEdit(input, getCalendarRefreshCallback());
    case 'search_tickets':
      return await executeSearch(input);
    case 'delete_time_entry':
      return await executeDelete(input, getCalendarRefreshCallback());
    case 'book_outlook_day':
      return await executeBookOutlookDay(input);
    default:
      return { result: `Unknown tool: ${name}` };
  }
}
