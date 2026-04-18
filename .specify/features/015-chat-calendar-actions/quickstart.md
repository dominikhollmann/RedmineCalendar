# Quickstart & Acceptance Tests: AI Chat Calendar Actions

## Acceptance Tests

### US1 — Query Time Entries via Chat

- [ ] Ask "How much time did I book last week?" — verify accurate total
- [ ] Ask "When did I last book on ticket #X?" — verify correct date and hours
- [ ] Ask about a ticket never worked on — verify "no entries found" response
- [ ] Ask a vague question (e.g., "How much did I book recently?") — verify reasonable response

### US2 — Create Time Entries via Chat

- [ ] Type "Book 2 hours on ticket #X for today" — verify modal opens pre-filled
- [ ] Confirm via modal Save — verify entry appears on calendar
- [ ] Cancel via modal — verify no entry created
- [ ] Provide incomplete info (no ticket) — verify AI asks for details

### US3 — Edit and Delete via Chat

- [ ] Type "Change my entry on Monday for ticket #X to 3 hours" — verify modal opens with entry and proposed change
- [ ] Type "Delete my entry from today on ticket #X" — verify modal opens for that entry
- [ ] Describe an entry that doesn't exist — verify "no matching entry" response
- [ ] Describe ambiguously (multiple matches) — verify AI asks to pick one
