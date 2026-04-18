# Research: AI Chat Calendar Actions

## R1: Tool Calling Implementation

**Decision**: Use the Claude Messages API `tools` parameter for tool/function calling. For OpenAI-compatible providers, use the `tools` parameter in the chat completions API.

**Rationale**: Both Claude and OpenAI support tool calling natively. The AI model decides when to call a function and provides structured parameters. The application defines tool schemas (JSON Schema format), validates the returned parameters, and executes the action.

**Alternatives considered**:
- **Structured text parsing**: Fragile, error-prone, requires complex regex/JSON extraction from free text.
- **Hybrid approach**: Adds complexity without benefit since both supported providers have native tool calling.

**Implementation approach**:
1. Define tool schemas: `query_time_entries`, `create_time_entry`, `edit_time_entry`, `delete_time_entry`
2. Send tools array with each API request
3. When the AI returns a `tool_use` block (Claude) or `tool_calls` (OpenAI), extract the function name and parameters
4. Execute the function via existing `js/redmine-api.js` methods
5. For create/edit/delete: open the time entry modal pre-filled with extracted values instead of executing directly
6. Send the tool result back to the AI so it can formulate a user-facing response

## R2: Tool Schemas

**Decision**: Four tools matching the spec requirements.

### query_time_entries
```json
{
  "name": "query_time_entries",
  "description": "Query the user's time entries from Redmine for a date range",
  "parameters": {
    "from": "YYYY-MM-DD start date",
    "to": "YYYY-MM-DD end date",
    "issue_id": "(optional) filter by ticket number"
  }
}
```

### create_time_entry
```json
{
  "name": "create_time_entry",
  "description": "Open the time entry form pre-filled with values to create a new entry",
  "parameters": {
    "issue_id": "Redmine ticket number",
    "hours": "number of hours",
    "date": "YYYY-MM-DD",
    "comment": "(optional) comment text",
    "start_time": "(optional) HH:MM start time"
  }
}
```

### edit_time_entry
```json
{
  "name": "edit_time_entry",
  "description": "Open the time entry form for an existing entry to edit it",
  "parameters": {
    "entry_id": "time entry ID to edit",
    "hours": "(optional) new hours",
    "comment": "(optional) new comment"
  }
}
```

### delete_time_entry
```json
{
  "name": "delete_time_entry",
  "description": "Open the time entry form for an existing entry so the user can delete it",
  "parameters": {
    "entry_id": "time entry ID to delete"
  }
}
```

## R3: Calendar Refresh After Modal Actions

**Decision**: Use the existing modal `onSave`/`onDelete` callbacks from `openForm()`. These already refresh the calendar when an entry is created/edited/deleted via the modal.

**Rationale**: Since write operations go through the existing modal, the calendar refresh happens automatically via the same code path as manual UI interactions. No new refresh mechanism needed.

## R4: Date Context in System Prompt

**Decision**: Include the current date and day of week in the AI system prompt so it can resolve relative date references ("today", "last Monday", "this month").

**Rationale**: The AI model needs temporal context to interpret natural language date references. Including it in the system prompt is simpler than a dedicated date-resolution tool.
