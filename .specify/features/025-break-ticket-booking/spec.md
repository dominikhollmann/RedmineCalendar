# Feature Specification: Break-Ticket Booking for Non-Work Calendar Events

**Feature Branch**: `025-break-ticket-booking`
**Created**: 2026-05-03
**Status**: Draft
**Input**: User description: "Break-ticket booking for non-work calendar events. Currently feature 019 filters out private Outlook events (e.g. doctor appointments). Instead, the AI booking assistant should book them to a configurable 'Break' ticket at 0 hours, so the calendar shows what happened during that time slot without inflating booked hours. The break ticket and the existing holiday ticket are configured in config.json (admin-managed), not in the user-facing settings UI — remove the holiday-ticket field from the settings page as part of this change. Applies to private events and any other non-work calendar entries the user wants represented in the calendar but not counted as work."

## User Scenarios & Testing

### User Story 1 — Private events appear on the calendar without inflating hours (Priority: P1)

When the user asks the AI assistant to book the day's Outlook calendar, any event marked as Private (e.g. a doctor appointment) is now booked against a configured "Break" ticket with a duration of 0 hours, instead of being silently dropped. The slot still shows on the user's Redmine calendar so that, when reviewing the day later, the user can immediately see that the time was spoken-for without having to investigate a gap. Booked work-hours totals are unaffected because the entry is 0h.

**Why this priority**: This is the core of the feature. Today's behavior of silently filtering private events is the explicit pain point — users lose context about their own day. Fixing it makes the assistant trustworthy for end-of-day calendar review.

**Independent Test**: With a break ticket configured and a private Outlook event in the day, run the booking flow. Verify (a) the event is included in the proposal summary marked as a 0-hour break, (b) confirming creates a Redmine time entry on the break ticket at 0 hours covering the original time slot, and (c) the day's booked-hours total is unchanged.

**Acceptance Scenarios**:

1. **Given** a private Outlook event from 15:00–16:00 and a configured break ticket, **When** the user runs the booking flow and confirms the event, **Then** a Redmine time entry is created on the break ticket from 15:00–16:00 with 0 hours.
2. **Given** several events including one private event, **When** the booking summary is shown, **Then** the private event appears in the list with a clear "Break (0h)" indicator and the proposed ticket is the configured break ticket.
3. **Given** the booking flow is processing events, **When** the assistant proceeds through the day, **Then** the day's total work hours match the sum of non-break entries only (break entries contribute 0).

---

### User Story 2 — User can mark any meeting as a break during booking (Priority: P2)

For events that are not Private but are still non-work (e.g. a lunch with the team, a coffee chat, or a personal block accidentally left in the work calendar), the user can re-route the event to the break ticket during the booking flow instead of accepting the proposed work ticket or skipping. The result is the same as for private events: the slot is preserved on the calendar at 0 hours.

**Why this priority**: Extends the same value to a broader class of events without forcing the user to mark them Private in Outlook first. Lower priority because the manual workaround (skip the event, manually create a 0h entry later) already exists, but the in-flow option is a real ergonomic win.

**Independent Test**: With the break ticket configured, run the booking flow on a day containing a non-private "Lunch with Team" event. Choose the "book as break" option when prompted. Verify a 0h entry is created on the break ticket for that slot.

**Acceptance Scenarios**:

1. **Given** the assistant proposes a non-private event for confirmation, **When** the user chooses "book as break", **Then** the entry is created on the break ticket at 0 hours covering the original slot, and the assistant moves on to the next event.
2. **Given** the user re-routes an event to the break ticket, **When** that event had a ticket extracted from its title (e.g. "Code Review #1456"), **Then** the extracted ticket is discarded and the break ticket is used instead.

---

### User Story 3 — Holiday and break tickets are configured centrally in config.json (Priority: P1)

The break ticket (new) and the holiday ticket (introduced in feature 019) are both administrative settings — they identify company-wide Redmine tickets that every user of the deployment shares. They are configured in `config.json` by the admin, alongside the Redmine URL and AI provider, and are not exposed in the user-facing Settings page. The previously-added holiday ticket input on the Settings page is removed.

**Why this priority**: P1 because it directly affects the feature's UX surface (Settings page changes) and prevents per-user drift from the company-wide answer. Also corrects a small layering mistake from 019 where the holiday ticket — which is a deployment-wide value — was placed in per-user UI.

**Independent Test**: Open the Settings page after this feature is implemented. Verify there is no field for holiday ticket and no field for break ticket. Verify weekly hours (which IS per-user) remains. Edit `config.json` to set both ticket numbers, reload the app, and confirm the booking flow uses both values.

**Acceptance Scenarios**:

1. **Given** the implemented feature, **When** the user opens the Settings page, **Then** no input exists for either the holiday ticket or the break ticket.
2. **Given** `config.json` has `holidayTicket: 999` and `breakTicket: 998`, **When** the booking flow encounters a holiday all-day event, **Then** it books to ticket 999; **When** it encounters a private event, **Then** it books to ticket 998.
3. **Given** a user previously saved a holiday ticket value in their local settings before this feature, **When** they reload the app after the update, **Then** the local value is ignored and `config.json` is the only source of truth (no error, no silent fallback to the local value).

---

### Edge Cases

- **Break ticket not configured in `config.json`**: When `breakTicket` is missing, private events fall back to the prior behavior (filtered out of the proposal) and the assistant tells the user once that break-routing is unavailable so they understand why private events are absent.
- **Configured break ticket does not exist or is closed in Redmine**: The booking attempt for that entry fails with a clear error, the assistant surfaces it, and the booking flow continues with the next event (the failed event is not silently swallowed).
- **All-day private event**: Booked to the break ticket at 0 hours covering the full working-day window (or the all-day flag if the time-entry form supports it). It does not consume the holiday-day calculation, even if `holidayTicket` is also configured.
- **Private event overlapping an existing Redmine entry**: The same overlap rule from 019 applies — the event is excluded from the proposal so the user is not asked to double-book a time window. (Even at 0 hours, two entries on the same slot is noisy.)
- **`showAs: 'free'` events** (Outlook "Free" status, e.g. a non-blocking lunch): Treated the same as any other non-private event — the user can choose to book-as-break manually, but they are not auto-routed.
- **Existing user-set `holidayTicket` in localStorage** (legacy from 019): Ignored after this feature ships. The localStorage key is removed during settings load to avoid clutter; the `config.json` value is authoritative.

## Requirements

### Functional Requirements

- **FR-001**: The booking assistant MUST include private Outlook events in the proposal summary when a break ticket is configured, instead of filtering them out.
- **FR-002**: For each private event included via FR-001, the assistant MUST propose booking to the configured break ticket with a duration of 0 hours, while preserving the original start/end time slot.
- **FR-003**: The booking assistant MUST allow the user, during per-event confirmation, to re-route any non-private event to the break ticket at 0 hours via an explicit "book as break" option in the confirmation interaction.
- **FR-004**: When `breakTicket` is not configured in `config.json`, the assistant MUST fall back to the prior behavior (filter private events out of proposals) and inform the user once that break-routing is disabled because no break ticket is configured.
- **FR-005**: Both the break ticket (`breakTicket`) and the holiday ticket (`holidayTicket`) MUST be read from `config.json` by the central config loader; they are admin-managed deployment settings, not per-user.
- **FR-006**: The user-facing Settings page MUST NOT contain inputs for the break ticket or the holiday ticket. Existing inputs for per-user values (such as weekly hours) remain.
- **FR-007**: On settings load, any pre-existing `holidayTicket` value stored in per-user localStorage from feature 019 MUST be removed so it cannot shadow `config.json`.
- **FR-008**: Time entries created via the break-routing flow MUST use the original calendar event's title as the entry comment so the user can later identify what occupied the slot. (Privacy is the user's own choice — they brought the event into the booking flow.)
- **FR-009**: A break-routed time entry MUST NOT contribute to any "booked hours today/this week" totals or warnings (since the value is 0 hours, this is a natural consequence; the requirement is to verify totals/warnings remain correct in their presence).
- **FR-010**: The assistant's booking summary MUST visually distinguish entries that will be booked as breaks (e.g. a "Break (0h)" label or similar) so the user can scan the day at a glance and not mistake a private event for a normal work meeting.

### Key Entities

- **Break Ticket**: A Redmine issue identified by a numeric ID configured in `config.json` under `breakTicket`. Used as the destination ticket for any time entry that represents a non-work block the user nonetheless wants visible on their calendar. Always booked at 0 hours.
- **Holiday Ticket**: An existing entity from feature 019, relocated by this feature. A Redmine issue identified by a numeric ID configured in `config.json` under `holidayTicket`. Used for full-day vacation/holiday entries derived from all-day calendar events.
- **Calendar Event Routing Decision**: For each calendar event in the booking flow, the proposal carries one of three routings: (1) work ticket (extracted or asked), (2) holiday ticket (full-day work hours, all-day holiday event), (3) break ticket (0 hours, private or user-routed). This is a transient runtime concept, not stored.

## Success Criteria

### Measurable Outcomes

- **SC-001**: After the feature ships, 100% of private Outlook events encountered during a booking session are visible in the user's Redmine calendar (either as 0h break entries or, if no break ticket is configured, with a one-time explanatory message — never silently dropped).
- **SC-002**: For a booking session that includes both work and break events, the day's total **booked work hours** equals the sum of non-break entries only — break entries contribute exactly 0 hours.
- **SC-003**: A user can re-route a non-private event to the break ticket during booking without leaving the chat flow (no separate UI navigation, no manual time-entry creation afterward).
- **SC-004**: A user reviewing yesterday's calendar can identify what happened in any blocked time slot ≥15 minutes long, because either a work entry, a holiday entry, or a break entry covers it.
- **SC-005**: The Settings page contains zero inputs for ticket numbers (break or holiday) after the change.

## Assumptions

- The break ticket exists in Redmine and is open for time logging. Verifying its existence at app startup is a nice-to-have but not required for v1; a clear runtime error on first use is acceptable.
- Time entries with 0 hours are accepted by the Redmine instance. (Standard Redmine accepts this; if a deployment customizes validation to reject 0-hour entries, this feature is non-functional for that deployment — explicitly out of scope.)
- The original event title may contain personal information (e.g. "Doctor Appointment"). Storing it as the time-entry comment is acceptable because the user explicitly chose to bring private events into the booking flow by enabling the break ticket; per-user privacy filtering is out of scope for this feature.
- "Non-work" classification is user-driven (manual route-to-break) plus an implicit rule for `sensitivity: 'private'`. No heuristic detection of free-time keywords ("lunch", "break") is attempted in this feature.
- Removing the holiday-ticket field from the Settings page is a one-way change. Users who relied on per-user holiday ticket values (a feature-019 capability) are migrated to the deployment-wide value; if they need a per-user override, that is a future feature, not this one.
- The break ticket and holiday ticket settings live alongside other admin-managed values in `config.json` (`redmineUrl`, `aiProvider`, etc.) and follow the same loading path used by feature 008 (multi-user deployment).
