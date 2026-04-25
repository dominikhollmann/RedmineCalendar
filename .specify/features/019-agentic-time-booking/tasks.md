# Tasks: Agentic AI Time-Booking — Phase 1: Outlook Calendar

**Feature**: 019-agentic-time-booking
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, research.md, quickstart.md
**Generated**: 2026-04-25

---

## Phase 1: Setup

**Goal**: Add MSAL.js dependency and extend config.json schema for Azure AD

- [ ] T001 Add MSAL.js v2 CDN script tag to index.html (before module scripts, similar to FullCalendar CDN pattern)
- [ ] T002 Add `azureClientId` field to config.json.example with documentation comment
- [ ] T003 Add `WEEKLY_HOURS_KEY` and `HOLIDAY_TICKET_KEY` constants to js/config.js
- [ ] T004 Add all Outlook/booking i18n keys to js/i18n.js (English and German: booking flow messages, settings labels, error messages, summary text)

**Checkpoint**: MSAL.js loads without errors, config constants available

---

## Phase 2: Foundational — Outlook Module + Settings

**Goal**: MSAL.js authentication and Graph API calendar fetch working; settings page extended

- [ ] T005 Create js/outlook.js — MSAL.js initialization: read `azureClientId` from config.json via `getCentralConfigSync()`, create `PublicClientApplication` instance, export `isOutlookConfigured()` check
- [ ] T006 Implement `acquireToken()` in js/outlook.js — try `acquireTokenSilent()` first, fall back to `acquireTokenPopup()` on `InteractionRequiredAuthError`; scope: `Calendars.Read`
- [ ] T007 Implement `fetchCalendarEvents(date)` in js/outlook.js — call Graph API `GET /me/calendarView?startDateTime=...&endDateTime=...`, parse response into normalized `OutlookEvent` objects (subject, start, end, isAllDay, sensitivity, showAs)
- [ ] T008 Implement `parseCalendarProposals(events, existingEntries)` in js/outlook.js — extract ticket numbers via `/#(\d+)/g`, round times to quarter hours, detect overlaps with existing Redmine entries, categorize all-day events, filter private events, return array of `CalendarProposal` objects
- [ ] T009 [P] Add `readWeeklyHours()`, `writeWeeklyHours()`, `readHolidayTicket()`, `writeHolidayTicket()` functions to js/settings.js using localStorage keys from js/config.js
- [ ] T010 [P] Add weekly hours input field and holiday ticket input field to settings.html — include form validation (weekly hours: 1-60, holiday ticket: positive integer or empty), save on form submit alongside existing settings
- [ ] T011 Write unit tests for js/outlook.js in tests/unit/outlook.test.js: ticket extraction (single, multiple, none, edge cases), quarter-hour rounding, overlap detection, all-day event categorization, private event filtering (with unit test)

**Checkpoint**: Can authenticate with Graph API and fetch calendar events; settings page has new fields

---

## Phase 3: User Story 1 — Outlook Calendar Booking (Priority: P1)

**Goal**: Users can say "Book my time for today" and the AI walks them through booking Outlook meetings

**Independent Test**: Create meetings in Outlook with "#1234" in the title, ask the AI to book time, verify it proposes entries with correct tickets and times

- [ ] T012 [US1] Add `book_outlook_day` tool schema to `TOOL_SCHEMAS_CLAUDE` array in js/chatbot-tools.js — input: `date` (string, YYYY-MM-DD, defaults to today); description instructs LLM to present summary then walk through one-by-one
- [ ] T013 [US1] Implement `executeBookOutlookDay({ date })` in js/chatbot-tools.js — call `fetchCalendarEvents(date)`, call `fetchTimeEntries(date, date)` for overlap check, call `parseCalendarProposals()`, format result as structured summary text for the LLM (meeting title, proposed ticket, start/end, status)
- [ ] T014 [US1] Handle all-day holiday events in `executeBookOutlookDay()` — read holiday ticket and weekly hours from settings, propose booking daily hours (weekly/5) to holiday ticket; for non-holiday all-day events, include in summary with "needs user decision" status
- [ ] T015 [US1] Handle "Outlook not configured" gracefully in `executeBookOutlookDay()` — if `isOutlookConfigured()` returns false, return a message explaining that the admin needs to configure `azureClientId` in config.json
- [ ] T016 [US1] Update system prompt in js/knowledge.js — add instructions for the booking flow: present summary first, then use `create_time_entry` for each confirmed meeting; add "outlook" and "book my time" to TOPIC_MAP keywords
- [ ] T017 [US1] Register `book_outlook_day` in `executeTool()` switch statement in js/chatbot-tools.js; conditionally include tool in schema only when `isOutlookConfigured()` is true
- [ ] T018 [US1] Update tests/unit/chatbot-tools.test.js — add mock for outlook module, test tool schema includes `book_outlook_day` when configured and excludes when not, test `executeBookOutlookDay` returns formatted summary
- [ ] T019 [US1] Write UI test in tests/ui/outlook-booking.spec.js — test the booking flow: mock Graph API response, verify summary appears in chat, verify create_time_entry modal opens with correct prefill

**Checkpoint**: Full booking flow works end-to-end — user asks "Book my time", sees summary, confirms each meeting

---

## Phase 4: Polish & Cross-Cutting Concerns

**Goal**: Documentation, edge cases, final validation

- [ ] T020 [P] Update user documentation in docs/content.en.md and docs/content.de.md — add section on Outlook calendar integration: how it works, admin setup (Azure AD app registration), user flow, settings (weekly hours, holiday ticket)
- [ ] T021 [P] Update config.json.example with `azureClientId` field and inline documentation
- [ ] T022 Run quickstart.md UAT scenarios (T1–T16) and verify all pass

**Checkpoint**: Feature complete, documented, all tests passing

---

## Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational)
Phase 2 → Phase 3 (User Story 1)
Phase 3 → Phase 4 (Polish)

Within Phase 2:
  T005 → T006 → T007 → T008 (sequential: MSAL init → auth → fetch → parse)
  T009, T010 (parallel with T005-T008: settings are independent)
  T011 (after T008: tests need the functions to exist)

Within Phase 3:
  T012 → T013 → T014, T015 (schema first, then handler, then edge cases)
  T016 (parallel with T012-T015: system prompt is independent)
  T017 (after T012+T013: needs both schema and handler)
  T018, T019 (after T017: tests need the tool registered)
```

## Parallel Execution Opportunities

**Phase 2**: T009+T010 (settings) can run in parallel with T005-T008 (outlook module)
**Phase 3**: T016 (system prompt) can run in parallel with T012-T015 (tool implementation)
**Phase 4**: T020+T021 (docs) can run in parallel

## Implementation Strategy

**MVP**: Phases 1-3 deliver the complete booking flow. Phase 4 is polish.

**Incremental delivery**:
1. After Phase 2: Outlook auth + calendar fetch working (testable independently)
2. After Phase 3: Full AI-guided booking flow (user-facing value)
3. After Phase 4: Documented, tested, ready for UAT

**STOP and VALIDATE after each phase before proceeding.**
