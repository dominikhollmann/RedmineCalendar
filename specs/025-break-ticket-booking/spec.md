# Feature Specification: Break-Ticket Booking for Non-Work Calendar Events

**Feature Branch**: `025-break-ticket-booking`
**Created**: 2026-05-03
**Status**: Implemented
**Input**: User description: "Break-ticket booking for non-work calendar events. Currently feature 019 filters out private Outlook events (e.g. doctor appointments). Instead, the AI booking assistant should book them to a configurable 'Break' ticket at 0 hours, so the calendar shows what happened during that time slot without inflating booked hours. The break ticket and the existing holiday ticket are configured in config.json (admin-managed), not in the user-facing settings UI — remove the holiday-ticket field from the settings page as part of this change. Applies to private events and any other non-work calendar entries the user wants represented in the calendar but not counted as work."

## User Scenarios & Testing

### User Story 1 — Non-work events appear on the calendar without inflating hours (Priority: P1)

When the user asks the AI assistant to book the day's Outlook calendar, any event whose subject the assistant classifies as non-work-related (e.g. "Doctor Appointment", "Mittagessen", "Lunch with Mom", "Gym") is now booked against a configured "Break" ticket with a duration of 0 hours, instead of being silently dropped or proposed as work. The slot still shows on the user's Redmine calendar so that, when reviewing the day later, the user can immediately see that the time was spoken-for without having to investigate a gap. Booked work-hours totals are unaffected because the entry is 0h. The Outlook `sensitivity` flag (Private / Confidential) plays no role in this classification.

**Why this priority**: This is the core of the feature. Today, Private-flagged events are silently filtered (users lose context) while non-work events without the Private flag clutter the work-ticket proposals. AI subject-based classification both restores visibility and removes the dependency on a flag many users never set.

**Independent Test**: With a break ticket configured and a day containing a clearly non-work event (e.g. "Doctor Appointment 14:00–15:00", regardless of any sensitivity flag), run the booking flow. Verify (a) the event is included in the proposal summary marked as a 0-hour break, (b) confirming creates a Redmine time entry on the break ticket at 0 hours covering the original time slot, and (c) the day's booked-hours total is unchanged.

**Acceptance Scenarios**:

1. **Given** a calendar event "Doctor Appointment" from 15:00–16:00 (no sensitivity flag) and a configured break ticket, **When** the user runs the booking flow and confirms the event, **Then** a Redmine time entry is created on the break ticket from 15:00–16:00 with 0 hours.
2. **Given** a day with a mix of work meetings and one event the assistant classifies as non-work (e.g. "Lunch with Mom"), **When** the booking summary is shown, **Then** the non-work event appears in the list with a clear "Break (0h)" indicator and the proposed ticket is the configured break ticket.
3. **Given** the booking flow is processing events, **When** the assistant proceeds through the day, **Then** the day's total work hours match the sum of non-break entries only (break entries contribute 0).
4. **Given** an event the user marked Private in Outlook but whose subject is clearly work (e.g. "1:1 with Manager #2097"), **When** the assistant builds the proposal, **Then** the event is proposed as a work entry on ticket 2097 — the Private flag does NOT trigger break-routing.

---

### User Story 2 — User can re-route any event to the break ticket during booking (Priority: P2)

For events the assistant classified as work (or where the user simply disagrees with the proposed routing — e.g. a coffee chat the AI thought was a real meeting, or a "team lunch" the user wants tracked as work because they're hosting it), the user can re-route the event to the break ticket during the booking flow by changing the ticket in the per-event modal. The result is the same as for AI-classified non-work events: the slot is preserved on the calendar at 0 hours.

**Why this priority**: Provides a manual override for AI mis-classification. Lower priority because the AI classification (User Story 1) handles the majority case; this is the safety-valve for the rest. Without it, the user would need to skip the event and manually create a 0h entry.

**Independent Test**: With the break ticket configured, run the booking flow on a day containing an event the AI classifies as work but the user wants as a break. In the modal for that event, change the ticket to the break ticket. Verify a 0h entry is created on the break ticket for that slot.

**Acceptance Scenarios**:

1. **Given** the assistant proposes an event as work for confirmation, **When** the user changes the ticket in the modal to the configured break ticket and saves, **Then** a time entry is created on the break ticket covering the original slot, and the assistant moves on to the next event.
2. **Given** the user re-routes an event to the break ticket in the modal, **When** that event had a ticket extracted from its title (e.g. "Code Review #1456"), **Then** the extracted ticket is discarded and the break ticket is used instead.
3. **Given** the AI mis-classifies a real-work meeting as non-work (e.g. proposes "Sprint Lunch Sync" as a break), **When** the user changes the ticket in the modal to a work ticket, **Then** the modal re-enables the hours field (per FR-012) and the entry is saved as a work entry.

---

### User Story 3 — Holiday and break tickets are configured centrally in config.json (Priority: P1)

The break ticket (new) and the holiday ticket (introduced in feature 019) are both administrative settings — they identify company-wide Redmine tickets that every user of the deployment shares. They are configured in `config.json` by the admin, alongside the Redmine URL and AI provider, and are not exposed in the user-facing Settings page. The previously-added holiday ticket input on the Settings page is removed.

**Why this priority**: P1 because it directly affects the feature's UX surface (Settings page changes) and prevents per-user drift from the company-wide answer. Also corrects a small layering mistake from 019 where the holiday ticket — which is a deployment-wide value — was placed in per-user UI.

**Independent Test**: Open the Settings page after this feature is implemented. Verify there is no field for holiday ticket and no field for break ticket. Verify weekly hours (which IS per-user) remains. Edit `config.json` to set both ticket numbers, reload the app, and confirm the booking flow uses both values.

**Acceptance Scenarios**:

1. **Given** the implemented feature, **When** the user opens the Settings page, **Then** no input exists for either the holiday ticket or the break ticket.
2. **Given** `config.json` has `holidayTicket: 999` and `breakTicket: 998`, **When** the booking flow encounters a holiday all-day event, **Then** it books to ticket 999; **When** it encounters an event the assistant classifies as non-work (e.g. "Lunch"), **Then** it books to ticket 998.
3. **Given** a user previously saved a holiday ticket value in their local settings before this feature, **When** they reload the app after the update, **Then** the local value is ignored and `config.json` is the only source of truth (no error, no silent fallback to the local value).

---

### Edge Cases

- **Break ticket not configured in `config.json`**: When `breakTicket` is missing, the assistant skips break-routing entirely and informs the user once that break-routing is disabled. Events the AI would have classified as non-work fall through to the standard work-event flow — if a ticket is extracted from the title they are proposed as work, otherwise they appear in the "needs ticket" bucket so the user explicitly decides.
- **Configured break ticket does not exist or is closed in Redmine**: The booking attempt for that entry fails with a clear error, the assistant surfaces it, and the booking flow continues with the next event (the failed event is not silently swallowed).
- **All-day non-work event**: Booked to the break ticket at 0 hours, with `startTime` anchored at the start of the user's configured working hours (`redmine_calendar_working_hours.start`; fallback 09:00 if unset). Duration is 0, so end equals start. It does not consume the holiday-day calculation, even if `holidayTicket` is also configured.
- **Non-work event overlapping an existing Redmine entry**: The same overlap rule from 019 applies — the event is excluded from the proposal so the user is not asked to double-book a time window. (Even at 0 hours, two entries on the same slot is noisy.)
- **Outlook `sensitivity` flag (Private / Confidential)**: IGNORED. Classification is purely subject-based via the AI. A real-work event the user marked Private will still be proposed as work if its subject indicates work; a non-work event marked Public will still be proposed as break if its subject indicates non-work. The existing sensitivity-based filter at `js/outlook.js:118` is removed.
- **Outlook `showAs: 'free'` flag**: Not used as a routing signal. The AI's subject classification is the only auto-routing input. (A `showAs: 'free'` event with a work-sounding subject is still proposed as work; the user can re-route it in the modal.)
- **AI mis-classification**: The user always has the modal-level override (FR-003 / FR-012). Acceptance does not require the AI to be 100% correct — it requires the user to be able to correct it without leaving the flow.
- **Event with ticket number AND non-work subject** (e.g. "Lunch Sync #1234"): Extraction wins. The event is proposed as work on the extracted ticket; AI classification does not run on events that already have an explicit ticket reference. If the user disagrees, they re-route in the modal (FR-003).
- **Existing user-set `holidayTicket` in localStorage** (legacy from 019): Ignored after this feature ships. The localStorage key is removed during settings load to avoid clutter; the `config.json` value is authoritative.

## Clarifications

### Session 2026-05-07

- Q: How is "book as break" surfaced during per-event confirmation? → A: Same flow as any other ticket — the proposal summary lists each event with its proposed ticket number AND title, and confirmation goes through the existing time-entry modal. To re-route any event (including AI-classified work events) to the break ticket, the user changes the ticket selection in the modal (no dedicated "book as break" button or chat command). The proposal summary MUST also show the ticket title for every event, not only break entries, so the user can verify each routing assignment without opening each modal.
- Q: How does the time-entry modal enforce 0 hours for the break ticket? → A: Whenever the break ticket is the selected ticket in the modal — whether prefilled by the assistant, changed during agentic confirmation, or manually picked during ad-hoc time entry — the hours field MUST be auto-set to 0 and disabled. Switching back to a non-break ticket re-enables the field. This invariant applies to the modal regardless of how it was opened.
- Q: What time slot does an all-day non-work event's 0h break entry cover? → A: Anchor `startTime` at the start of the user's configured working hours (`redmine_calendar_working_hours.start`); fallback is 09:00 if working hours are unset (no existing 09:00–17:00 default exists in the codebase — the calendar falls back to a 24-hour view when working hours are missing). Duration is 0, so end equals start. As part of this clarification the holiday booking shape (currently `startTime: null` per `js/outlook.js`) is ALSO changed to anchor at the start of working hours (same 09:00 fallback) with duration = dailyHours, keeping holiday and break-routed all-day events consistent and giving both proper time-anchored entries.
- Q: What signal classifies an event as "non-work" so the assistant auto-routes it to the break ticket? → A: AI-driven classification based on the event subject, with built-in multilingual heuristic defaults baked into the system prompt (no admin-configurable keyword list). The Outlook `sensitivity` flag (Private / Confidential) is COMPLETELY IGNORED — the existing sensitivity-based filter at `js/outlook.js:118` is removed as part of this feature. "Non-work" is a semantic classification of the subject (e.g. "Lunch", "Mittagessen", "Doctor Appointment", "Arzttermin", "Coffee", "Gym", "Personal"), not a privacy classification. The user can override any classification in the modal.
- Q: When an event title contains both a Redmine ticket number AND a non-work-sounding subject, which signal wins? → A: Ticket extraction wins. AI subject classification runs ONLY on events that do NOT already have a ticket number extractable from their title. A title with `#1234` is treated as a deliberate user signal that the event is work, regardless of any non-work-sounding words also in the subject (e.g. "Lunch Sync #1234" → proposed as work on ticket 1234, not as a break).

## Requirements

### Functional Requirements

- **FR-001**: For each Outlook event WITHOUT a Redmine ticket number extractable from its title, the booking assistant MUST classify the event as work-related or non-work-related from its subject using AI reasoning (no admin-configurable keyword list; the multilingual heuristic vocabulary is baked into the system prompt and covers at least common English and German terms such as lunch / Mittagessen, doctor / Arzt, coffee, gym, personal, break). Events WITH an extractable ticket number bypass classification entirely and are proposed as work on that ticket — extraction takes precedence over classification. When `breakTicket` is configured, every event classified as non-work-related MUST be included in the proposal summary instead of being filtered out or proposed as work.
- **FR-002**: For each event classified as non-work-related (FR-001), the assistant MUST propose booking to the configured break ticket with a duration of 0 hours, while preserving the original start/end time slot.
- **FR-003**: The booking assistant MUST allow the user to re-route any event (regardless of classification) to the break ticket via the per-event confirmation modal — by changing the proposed ticket to the break ticket using the modal's standard ticket selector. No dedicated "book as break" UI element is required. Symmetrically, the user MUST be able to override a break-classified event back to a work ticket in the same way.
- **FR-004**: When `breakTicket` is not configured in `config.json`, the assistant MUST skip break-routing entirely and inform the user once that break-routing is disabled. Events the AI would have classified as non-work fall through to the standard 019 flow (extracted-ticket proposal OR needs-ticket bucket); the assistant MUST NOT silently drop them.
- **FR-005**: Both the break ticket (`breakTicket`) and the holiday ticket (`holidayTicket`) MUST be read from `config.json` by the central config loader; they are admin-managed deployment settings, not per-user.
- **FR-006**: The user-facing Settings page MUST NOT contain inputs for the break ticket or the holiday ticket. Existing inputs for per-user values (such as weekly hours) remain.
- **FR-007**: On settings load, any pre-existing `holidayTicket` value stored in per-user localStorage from feature 019 MUST be removed so it cannot shadow `config.json`.
- **FR-008**: Time entries created via the break-routing flow MUST use the original calendar event's title as the entry comment so the user can later identify what occupied the slot. (Privacy is the user's own choice — they brought the event into the booking flow.)
- **FR-009**: A break-routed time entry MUST NOT contribute to any "booked hours today/this week" totals or warnings (since the value is 0 hours, this is a natural consequence; the requirement is to verify totals/warnings remain correct in their presence).
- **FR-010**: The assistant's booking summary MUST visually distinguish entries that will be booked as breaks (e.g. a "Break (0h)" label or similar) so the user can scan the day at a glance and not mistake a non-work event for a normal work meeting.
- **FR-011**: The booking proposal summary MUST display, for every event, the proposed ticket's number AND title — not the number alone — so the user can verify the routing assignment without opening each modal. This applies to all events (work, holiday, and break alike).
- **FR-012**: Whenever the break ticket is the currently selected ticket in the time-entry modal, the modal MUST set hours to 0 and disable the hours input. This invariant applies regardless of how the modal was opened (AI-driven confirmation OR ad-hoc manual time entry) and regardless of how the break ticket came to be selected (prefilled by the assistant OR chosen by the user via the ticket picker). Selecting any non-break ticket re-enables the hours input.
- **FR-013**: All-day calendar events booked through the agentic flow MUST be anchored with an explicit `startTime` equal to the start of the user's configured working hours (`redmine_calendar_working_hours.start`); when working hours are unset, the fallback start is 09:00. This applies to BOTH (a) break entries derived from all-day non-work events (duration 0) AND (b) holiday entries derived from all-day OOO/holiday events (duration = dailyHours). This changes the existing feature-019 holiday booking shape, which currently writes `startTime: null` (`js/outlook.js`); under this feature, holiday entries also receive the working-hours start anchor.
- **FR-014**: The Outlook `sensitivity` flag (Private / Confidential) MUST NOT be used as a routing signal. Events MUST flow through the subject-based non-work classification (FR-001) regardless of their `sensitivity` value. The existing sensitivity-based filter at `js/outlook.js:118` MUST be removed as part of this feature so that Private-flagged events are no longer silently dropped.

#### Added during UAT (2026-05-08)

- **FR-015**: Non-work classification MUST run inside the booking tool itself, not the AI prompt. The tool returns the day's events grouped into four sections — EXCLUDED, AUTO-ROUTED TO BREAK TICKET, BOOKABLE MEETINGS, NEEDS USER INPUT — so the proposal structure is deterministic and the AI's role is to relay the sections and call `create_time_entry` for each `status: proposed` row.
- **FR-016**: All-day classification MUST distinguish bank holidays, vacation/OOO, overtime compensation, and sick leave. Bank holidays route to `holidayTicket` at daily hours; vacation/OOO routes to a new `vacationTicket` at daily hours; overtime compensation routes to `breakTicket` at 0 hours (full-day visual block); sick-leave events MUST never auto-route — they always land in NEEDS USER INPUT so the user picks the company's sick-leave ticket explicitly.
- **FR-017**: Bank-holiday detection MUST combine three signals: a hard-coded keyword list (DE+EN generic terms), a hard-coded list of common public-holiday names (Christi Himmelfahrt, Karfreitag, Weihnachten, Christmas Day, Thanksgiving, Boxing Day, etc.), and an Outlook metadata fallback — any all-day event with `showAs === 'oof'` and no other classifier match is routed to `holidayTicket`.
- **FR-018**: Pure-information all-day events (birthdays, anniversaries, reminders) MUST be excluded from the proposal entirely (EXCLUDED section) — never booked. The classifier covers DE+EN terms (birthday/Geburtstag, anniversary/Jubiläum, reminder/Erinnerung).
- **FR-019**: Break entries MUST preserve the original Outlook event's end-time (not collapse end to start). The time-entry modal's hours field is implicitly locked to 0 when the break ticket is selected, but the End time input remains editable so the calendar block reflects the real event duration. The duration readout shows `0m (break)` instead of computed minutes.
- **FR-020**: When the deployment's Redmine instance rejects `hours: 0` entries (admin-configured `redmineAcceptsZeroHours: false` in `config.json`), break entries MUST be persisted as `hours: 0.01` placeholder values that survive the standard quarter-hour rounding. The UI MUST continue to treat these entries as breaks (gray styling, "0m (break)" duration label) regardless of the placeholder value.
- **FR-021**: Time entries with `hours: 0` (or the `0.01` placeholder per FR-020) MUST survive serialization round-trips: `mapTimeEntry` and `fetchTimeEntries` MUST NOT filter them out. The calendar event renderer MUST detect break entries by `issueId === breakTicket` rather than by hours value, and MUST use the stored `endTime` for the visual block when present.

### Key Entities

- **Break Ticket**: A Redmine issue identified by a numeric ID configured in `config.json` under `breakTicket`. Used as the destination ticket for non-work timed events, overtime-compensation blocks, and any entry the user routes there manually. Booked at 0 hours (or `0.01` placeholder per FR-020).
- **Holiday Ticket**: A Redmine issue identified by a numeric ID configured in `config.json` under `holidayTicket`. Used for **bank/public holidays only** — full-day entries derived from named or showAs='oof' all-day events.
- **Vacation Ticket** (added during UAT): A Redmine issue identified by a numeric ID configured in `config.json` under `vacationTicket`. Used for personal vacation / OOO all-day events. Distinct from holidayTicket so reporting can separate public holidays from personal absences.
- **Calendar Event Routing Decision**: For each calendar event in the booking flow, the proposal carries one of: (1) work ticket (extracted from title or asked), (2) holiday ticket (bank holiday), (3) vacation ticket (personal vacation/OOO), (4) break ticket (non-work, overtime comp; 0 hours), (5) excluded (overlap or informational), (6) needs-input (sick leave or unrecognized). Outlook `sensitivity` does NOT influence routing; `showAs === 'oof'` is consulted only as a bank-holiday fallback (FR-017).

## Success Criteria

### Measurable Outcomes

- **SC-001**: After the feature ships, 100% of events the AI classifies as non-work-related during a booking session are visible in the user's Redmine calendar (either as 0h break entries or, if no break ticket is configured, surfaced via the standard 019 flow with the one-time "break-routing disabled" notice — never silently dropped). Additionally, 100% of events that today are filtered by the sensitivity-based rule are now reachable through the proposal.
- **SC-002**: For a booking session that includes both work and break events, the day's total **booked work hours** equals the sum of non-break entries only — break entries contribute exactly 0 hours.
- **SC-003**: A user can re-route any event to the break ticket (or back to a work ticket from a break classification) during booking without leaving the chat flow — no separate UI navigation, no manual time-entry creation afterward.
- **SC-004**: A user reviewing yesterday's calendar can identify what happened in any blocked time slot ≥15 minutes long, because either a work entry, a holiday entry, or a break entry covers it.
- **SC-005**: The Settings page contains zero inputs for ticket numbers (break or holiday) after the change.

## Assumptions

- The break ticket exists in Redmine and is open for time logging. Verifying its existence at app startup is a nice-to-have but not required for v1; a clear runtime error on first use is acceptable.
- Time entries with 0 hours are accepted by the Redmine instance. (Standard Redmine accepts this; if a deployment customizes validation to reject 0-hour entries, this feature is non-functional for that deployment — explicitly out of scope.)
- The original event title may contain personal information (e.g. "Doctor Appointment"). Storing it as the time-entry comment is acceptable because the user explicitly chose to bring non-work events into the booking flow by enabling the break ticket; per-user privacy filtering is out of scope for this feature.
- "Non-work" classification is performed by the AI assistant from the event subject, using built-in multilingual heuristic defaults baked into the system prompt (covering at least common English and German terms — lunch / Mittagessen, doctor / Arzt, coffee, gym, personal, break, etc.). The keyword list is NOT admin-configurable; tuning it requires a code change to the system prompt. Mis-classifications are corrected by the user via the modal-level override (FR-003 / FR-012). The Outlook `sensitivity` and `showAs` flags are not consulted.
- AI classification is non-deterministic. Acceptance tests for the classification step itself are written against a mocked AI response so the test suite stays stable; the live behavior is validated by UAT, not unit tests.
- Removing the holiday-ticket field from the Settings page is a one-way change. Users who relied on per-user holiday ticket values (a feature-019 capability) are migrated to the deployment-wide value; if they need a per-user override, that is a future feature, not this one.
- The break ticket and holiday ticket settings live alongside other admin-managed values in `config.json` (`redmineUrl`, `aiProvider`, etc.) and follow the same loading path used by feature 008 (multi-user deployment).
