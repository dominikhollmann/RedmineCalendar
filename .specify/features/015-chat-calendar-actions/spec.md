# Feature Specification: AI Chat Calendar Actions

**Feature Branch**: `015-chat-calendar-actions`  
**Created**: 2026-04-17  
**Status**: Draft  
**Input**: User description: "add capabilities to the AI chat: users can also interact with the calendar via chat. Add/edit/delete entries, ask questions about the time entries (e.g.: When did I last book on Ticket 1234? How much time did I book last month?)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Query Time Entries via Chat (Priority: P1)

A user wants to quickly find information about their time entries without scrolling through the calendar — for example, when they last worked on a specific ticket, how many hours they logged last week, or their total hours for a given month. They type a question in the chatbot and get an accurate answer based on their actual Redmine data.

**Why this priority**: Read-only queries are the safest and most immediately useful capability. They require no confirmation flow, carry no risk of data loss, and deliver value on top of the existing chatbot (feature 014). This alone is a viable MVP.

**Independent Test**: Open the chatbot, ask "How much time did I book last week?", and verify the answer matches the visible calendar totals.

**Acceptance Scenarios**:

1. **Given** a user has time entries in Redmine, **When** they ask "When did I last book on ticket #1234?", **Then** the chatbot returns the correct date and hours from their actual Redmine data.
2. **Given** a user asks "How many hours did I log last month?", **When** the chatbot responds, **Then** the total matches the sum of their Redmine time entries for that period.
3. **Given** a user asks about a ticket they have never worked on, **When** the chatbot responds, **Then** it clearly states no entries were found for that ticket.
4. **Given** a user asks a vague time question (e.g., "How much did I book recently?"), **When** the chatbot responds, **Then** it either interprets "recently" as the current week or asks for clarification.

---

### User Story 2 - Create Time Entries via Chat (Priority: P2)

A user wants to quickly log a time entry by typing in natural language — for example, "Book 2 hours on ticket #5678 for today" — instead of using the form. The chatbot interprets the request, shows what it will create, and asks for confirmation before saving.

**Why this priority**: Creating entries is the most common write operation and the natural next step after read queries. The confirmation step ensures safety. Independently testable once US1 is working.

**Independent Test**: Type "Book 1 hour on ticket #100 for today", confirm the preview, and verify the entry appears on the calendar.

**Acceptance Scenarios**:

1. **Given** a user types "Book 2 hours on ticket #5678 for today", **When** the chatbot processes the request, **Then** it opens the time entry modal pre-filled with ticket #5678, 2 hours, and today's date.
2. **Given** the user clicks Save in the modal, **When** the entry is saved, **Then** the calendar refreshes and the new entry is visible.
3. **Given** the user clicks Cancel in the modal, **When** the modal closes, **Then** no entry is created.
4. **Given** the user provides incomplete information (e.g., no ticket number), **When** the chatbot responds, **Then** it asks for the missing details before proceeding.

---

### User Story 3 - Edit and Delete Time Entries via Chat (Priority: P3)

A user wants to modify or remove an existing time entry by describing the change in natural language — for example, "Change my entry on Monday for ticket #5678 to 3 hours" or "Delete my entry from yesterday on ticket #1234". The chatbot identifies the entry, confirms the action, and applies it.

**Why this priority**: Edit and delete are less frequent than create and carry higher risk (data modification/loss). The confirmation flow is essential. Depends on US1 (querying) to identify which entry to act on.

**Independent Test**: Type "Delete my entry from today on ticket #100", confirm, and verify the entry is removed from the calendar.

**Acceptance Scenarios**:

1. **Given** a user types "Change my Monday entry on ticket #5678 to 3 hours", **When** the chatbot finds the entry, **Then** it opens the time entry modal pre-filled with the entry's current values and the proposed changes (3 hours).
2. **Given** multiple entries match the description, **When** the chatbot responds, **Then** it lists the matches and asks the user to pick one.
3. **Given** the user confirms a deletion, **When** the entry is deleted, **Then** the calendar refreshes and the entry is gone.
4. **Given** no entries match the user's description, **When** the chatbot responds, **Then** it clearly states no matching entry was found.

---

### Edge Cases

- What happens if the user's Redmine session expires mid-conversation — does the chatbot detect the auth failure and prompt re-authentication?
- What happens if the user tries to create an entry for a ticket they don't have permission to log time on?
- How does the chatbot handle ambiguous dates like "last Friday" when the conversation happens on a Monday?
- What if the AI misinterprets the user's intent (e.g., creates instead of edits) — the confirmation step is the safety net.
- What happens if the Redmine API is slow or times out during a write operation?
- How does the chatbot handle entries with start-time tags ([start:HH:MM]) — does it preserve them on edit?

## Clarifications

### Session 2026-04-18

- Q: How does the AI interact with the Redmine API — tool calling or text parsing? → A: Tool/function calling. The AI invokes structured functions (e.g., `create_time_entry({ticket: 5678, hours: 2, date: "2026-04-18"})`).
- Q: How should write operation confirmation work? → A: For create/edit, the AI opens the time entry modal pre-filled with the values; user confirms via the normal Save button. For delete, the AI opens the modal for the entry; user clicks Delete. For batch operations (future), use text-based confirmation in chat.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The chatbot MUST be able to query the user's time entries from Redmine and answer questions about them (e.g., totals, last entry on a ticket, entries in a date range).
- **FR-002**: The chatbot MUST be able to create new time entries in Redmine based on natural language instructions from the user.
- **FR-003**: The chatbot MUST be able to edit existing time entries (change hours, date, ticket, or activity) based on natural language instructions.
- **FR-004**: The chatbot MUST be able to delete existing time entries based on natural language instructions.
- **FR-005**: For create and edit operations, the chatbot MUST open the time entry modal pre-filled with the extracted values. The user confirms by clicking Save in the modal. For delete, the chatbot MUST open the modal for the identified entry so the user can click Delete. Future batch operations would use text-based confirmation in chat.
- **FR-006**: After any write operation, the calendar view MUST refresh to reflect the change immediately.
- **FR-007**: The chatbot MUST handle ambiguous requests by asking for clarification rather than guessing (e.g., multiple matching entries, missing ticket number, vague date references).
- **FR-008**: The chatbot MUST report clear, user-friendly error messages for Redmine API failures (permission denied, ticket not found, network error).
- **FR-009**: The chatbot MUST NOT allow write operations without a valid Redmine connection — if the connection is lost, write commands MUST fail gracefully with an explanation.
- **FR-010**: The chatbot MUST preserve existing start-time tags (`[start:HH:MM]`) when editing entries, unless the user explicitly changes the start time.
- **FR-011**: When creating entries, the chatbot MUST always provide a start time — defaulting to the user's configured working hours start (or 09:00 if not configured).
- **FR-012**: Query results MUST include start times and entry IDs so the AI can disambiguate entries on the same day.
- **FR-013**: If the AI API rate limit prevents formatting a response, the chatbot MUST display the raw tool result with a brief explanation instead of showing an error.
- **FR-014**: Error messages in chat MUST include a Retry button to re-send the failed request.

### Key Entities

- **Chat Action**: A user intent extracted from a chat message — one of: query, create, edit, delete. The chatbot determines the action type from natural language.
- **Action Preview**: A structured summary of the intended write operation shown to the user before execution, including all fields that will be created or changed.
- **Time Entry Query**: A read-only request for information about time entries, parameterised by date range, ticket number, or other filters extracted from the user's question.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a time entry via chat in under 30 seconds (from typing the request to seeing it on the calendar).
- **SC-002**: 90% of time entry queries return accurate results matching the actual Redmine data.
- **SC-003**: Zero unintended write operations occur — every create/edit/delete requires explicit confirmation.
- **SC-004**: The chatbot correctly identifies the intended action (query vs. create vs. edit vs. delete) in 90% of natural language requests on the first attempt.
- **SC-005**: After a write operation, the calendar reflects the change within 2 seconds.

## Assumptions

- This feature builds on the AI chatbot from feature 014 — the chatbot panel, AI API client, and conversation infrastructure already exist.
- The chatbot uses the existing Redmine API client (`js/redmine-api.js`) for all data operations — no new API endpoints are needed.
- The AI model uses tool/function calling to invoke structured functions (query, create, edit, delete) with typed parameters. The application code defines the tool schemas, validates parameters, and executes the actions via the Redmine API.
- Write operations go through the same code paths as the existing UI (time entry form logic) to ensure consistency with validation rules, start-time tags, and activity defaults.
- Date references like "today", "yesterday", "last Monday", "last month" are resolved by the AI model relative to the current date, which is included in the system prompt.
- The chatbot accesses only the current user's time entries — no cross-user queries.
- This feature does not add batch operations (e.g., "delete all entries from last week") — each write operation affects exactly one entry.
