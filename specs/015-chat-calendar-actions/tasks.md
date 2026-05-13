# Tasks: AI Chat Calendar Actions

## Phase 1: Setup

- [x] T001 Create `js/chatbot-tools.js` — define tool schemas (query_time_entries, create_time_entry, edit_time_entry, delete_time_entry) in Claude and OpenAI format, export `getToolSchemas(provider)` function
- [x] T002 Add i18n keys in `js/i18n.js` for: tool execution messages ("Looking up your entries...", "Opening form...", "No entries found", "Multiple entries match — which one?"), EN + DE

---

## Phase 2: Foundational

- [x] T003 Update `js/chatbot-api.js` `sendClaude()` — add `tools` parameter to the request body, handle `tool_use` content blocks in response (return structured tool call instead of text)
- [x] T004 Update `js/chatbot-api.js` `sendOpenAI()` — add `tools` parameter, handle `tool_calls` in response
- [x] T005 Update `js/chatbot-api.js` `sendMessage()` — new return type: either `{ type: 'text', content }` or `{ type: 'tool_use', name, input, id }`. Callers must handle both.
- [x] T006 Update `js/knowledge.js` `buildSystemPrompt()` — include current date and day of week in the system prompt

**Checkpoint**: API layer supports tool calling; no UI changes yet

---

## Phase 3: User Story 1 — Query Time Entries (P1) 🎯 MVP

- [x] T007 [US1] Add `executeTool()` in `js/chatbot-tools.js` — dispatch tool calls: for `query_time_entries`, call `fetchTimeEntries(from, to)` from redmine-api.js, filter by issue_id if provided, format results as text summary
- [x] T008 [US1] Update `js/chatbot.js` `handleSend()` — after receiving a tool_use response, call `executeTool()`, send the result back to the AI as a tool_result message, then get the AI's final text response and render it
- [x] T009 [US1] Add unit test `tests/unit/chatbot-tools.test.js` — test tool schema generation, test executeTool dispatch for query

**Checkpoint**: User can ask questions about time entries in chat and get accurate answers

---

## Phase 4: User Story 2 — Create Time Entries (P2)

- [x] T010 [US2] Add create handler in `js/chatbot-tools.js` `executeTool()` — for `create_time_entry`, resolve issue subject via `resolveIssueSubject()`, then call the modal opener
- [x] T011 [US2] Update `js/chatbot.js` — import `openForm` from time-entry-form.js, when executeTool returns a `{ type: 'open_modal', prefill }` result, call `openForm(null, prefill, onSave)` to open the modal pre-filled. After save/cancel, send result back to AI.
- [x] T012 [US2] Wire calendar refresh — pass the existing calendar refresh callback as `onSave` to `openForm` so the calendar updates after saving

**Checkpoint**: User can create entries via chat with modal confirmation

---

## Phase 5: User Story 3 — Edit and Delete (P3)

- [x] T013 [US3] Add edit handler in `js/chatbot-tools.js` `executeTool()` — for `edit_time_entry`, fetch the entry by ID, open the modal pre-filled with current values plus proposed changes
- [x] T014 [US3] Add delete handler in `js/chatbot-tools.js` `executeTool()` — for `delete_time_entry`, fetch the entry by ID, open the modal for that entry so user can click Delete
- [x] T015 [US3] Handle ambiguous matches — when the AI calls edit/delete with a query instead of an ID, query entries first, if multiple matches return them to the AI to ask the user to pick one

**Checkpoint**: User can edit and delete entries via chat with modal confirmation

---

## Phase 6: Polish

- [x] T016 [P] Update user documentation `docs/content.en.md` and `docs/content.de.md` — document chat actions (query, create, edit, delete)
- [x] T017 [P] Update UI test `tests/ui/chatbot.spec.js` — add test for chat query returning results
- [x] T018 Run quickstart.md acceptance tests
