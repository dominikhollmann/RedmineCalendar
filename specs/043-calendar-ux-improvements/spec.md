# Feature Specification: Calendar UX Improvements

**Feature Branch**: `043-calendar-ux-improvements`

**Created**: 2026-06-18

**Status**: Draft

**Input**: Issues 225, 226, 227, 206

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Refresh Calendar Data Without Reloading the Page (Priority: P1)

A user opens the calendar in the morning and leaves it running throughout the day. By afternoon, new Redmine time entries, Outlook events, and Teams calls have been created by colleagues or by the user in other tools. Without closing and reopening the browser tab, the user clicks a **Refresh** button in the toolbar. The calendar fetches fresh data from all active sources, updates the visible events, and shows a brief confirmation toast with the timestamp of the last refresh. The user's current scroll position, date view, and undo stack are preserved.

**Why this priority**: The most impactful item — users who keep the app open throughout the day are working with stale data. This directly affects reliability of the tool as a source of truth for booking decisions.

**Independent Test**: Can be fully tested by opening the app, logging a time entry in Redmine directly, clicking Refresh, and verifying the new entry appears — without any page reload.

**Acceptance Scenarios**:

1. **Given** the calendar is open with data loaded at time T, **When** the user clicks the Refresh button in the toolbar, **Then** all external sources are re-fetched, the calendar re-renders with fresh events, and a toast shows "Last refreshed at HH:MM" without the page reloading.
2. **Given** a refresh is in progress, **When** the refresh completes successfully, **Then** the user's current date range and scroll position are unchanged.
3. **Given** a refresh is in progress, **When** one external source fails to respond, **Then** the calendar shows data from the sources that succeeded, and a warning toast identifies which source failed.
4. **Given** automatic background refresh is enabled (configurable interval), **When** the interval elapses and new data has arrived, **Then** the calendar silently updates and shows a subtle "Updated at HH:MM" indicator; no notification is shown when nothing changed.
5. **Given** automatic background refresh is enabled, **When** the browser tab is hidden, **Then** polling is paused and resumes when the tab becomes visible again.

---

### User Story 2 — Closed-Ticket Warning on Teams Events (Priority: P2)

A user has a recurring Teams meeting linked to a Redmine ticket via the meeting subject. The Redmine ticket is later closed (work completed). When the user views the calendar, they expect to see a visual warning on the Teams event, the same warning currently shown for non-existent ticket IDs, so they know the linked ticket is no longer open and they should pick a different one before booking.

**Why this priority**: Without this warning, users silently log time against closed tickets — a data integrity problem that is hard to audit after the fact.

**Independent Test**: Can be fully tested by creating a Teams event linked to a closed Redmine ticket and confirming the warning indicator appears on the calendar event.

**Acceptance Scenarios**:

1. **Given** a Teams calendar event whose subject contains a Redmine ticket ID that is **open**, **When** the calendar renders, **Then** no warning indicator is shown on that event.
2. **Given** a Teams calendar event whose subject contains a Redmine ticket ID that is **closed**, **When** the calendar renders, **Then** the same warning indicator shown for non-existing ticket IDs is displayed on the event.
3. **Given** a Teams calendar event whose subject contains a Redmine ticket ID that **does not exist**, **When** the calendar renders, **Then** the existing warning indicator is still displayed (regression: existing behavior preserved).
4. **Given** a Teams calendar event with no recognisable ticket ID in the subject, **When** the calendar renders, **Then** no warning indicator is shown.

---

### User Story 3 — Event Source Label in "Source Event" Modal (Priority: P3)

A user clicks on a calendar event that originated from an external source (Teams, Google Calendar, Outlook) but has not yet been matched to a Redmine issue. The time-entry modal opens. The user sees the modal title **"Source event from Teams"** (or the equivalent German: **"Quellereignis aus Teams"**) instead of the plain **"Quellereignis"**. This tells the user at a glance which external calendar the event came from, helping them pick the correct Redmine ticket.

**Why this priority**: A small UX improvement that becomes increasingly valuable as more calendar sources are connected simultaneously; lower risk than the other stories.

**Independent Test**: Can be fully tested by clicking an unmatched Teams event and verifying the modal title includes the source name.

**Acceptance Scenarios**:

1. **Given** an unmatched event from a known source (e.g. Teams), **When** the user opens the time-entry modal for that event, **Then** the modal title reads "Source event from Teams" (en) / "Quellereignis aus Teams" (de).
2. **Given** an unmatched event whose source is unknown or not set, **When** the user opens the time-entry modal, **Then** the modal title falls back to the plain "Source event" / "Quellereignis" (current behaviour preserved).
3. **Given** a source name that is longer than usual, **When** the modal opens, **Then** the title remains within the modal header area without visual overflow or truncation.
4. **Given** the UI language is set to English, **When** the modal opens for a Teams event, **Then** the title reads "Source event from Teams"; with German locale it reads "Quellereignis aus Teams".

---

### User Story 4 — Planning View Total in Calendar Headline (Priority: P3)

A user is in the Planning view. They want a quick glance at their total booked time for the visible period. Currently the total is displayed near the settings icon in the top-right corner, which is easy to miss and inconsistent with the Full-Week view where day totals appear in the column headers. The total is moved to the calendar headline area, matching the visual position and style of the day-column totals on the Full-Week view, giving the user a consistent, prominent summary.

**Why this priority**: A polish/consistency fix; delivers no new capability, only improves discoverability of existing data.

**Independent Test**: Can be fully tested by switching to Planning view and confirming the total appears in the calendar headline area rather than near the settings icon.

**Acceptance Scenarios**:

1. **Given** the user is in Planning view with booked events, **When** the view renders, **Then** the total spent time appears in the calendar headline (column or row header area) rather than near the settings icon.
2. **Given** the user switches from Full-Week view to Planning view, **When** the Planning view renders, **Then** the total is displayed in the same visual style (font size, colour, position pattern) as the day totals in Full-Week view.
3. **Given** no time entries exist in the visible Planning period, **When** the view renders, **Then** the total shows "0h" (or the equivalent zero state) in the headline, consistent with how day totals behave.
4. **Given** the user is in any view other than Planning view, **When** the view renders, **Then** existing totals display behaviour is unchanged (regression: other views not affected).

---

### Edge Cases

- What happens when the Refresh action is triggered while a previous refresh is still in progress? (Second click should be ignored or debounced.)
- How does the closed-ticket check behave when the Redmine API is temporarily unreachable during event rendering? (Warning should not flash briefly if the ticket status is merely unknown due to a network error — only confirmed-closed tickets should show the warning.)
- What if a Teams event subject matches multiple ticket IDs, some open and some closed? (The most conservative approach: warn if any matched ticket is closed.)
- What happens to the source label if the source name contains characters that could cause visual issues in the modal title (very long names, special characters)?
- How does the Planning view total behave on narrow browser widths where the headline area may be constrained?

## Requirements _(mandatory)_

### Functional Requirements

#### Data Refresh (Issue 206)

- **FR-001**: The calendar toolbar MUST include a Refresh button that re-fetches all active external data sources (Redmine, Outlook, Teams) without triggering a browser page reload.
- **FR-002**: On successful refresh, the calendar MUST display a toast notification that includes the time of the last refresh.
- **FR-003**: The refresh operation MUST preserve the user's current calendar date range and scroll position.
- **FR-004**: The refresh operation MUST preserve the undo stack.
- **FR-005**: When one or more external sources fail during refresh, the calendar MUST display the data from sources that succeeded and show a warning identifying which source(s) failed.
- **FR-006**: An automatic background refresh interval MUST be configurable in Settings (per-user) and/or in `config.json` (admin-wide default). Default interval: every 5 minutes. A value of 0 disables automatic refresh.
- **FR-007**: Automatic background refresh MUST be paused when the browser tab is not visible and resume when the tab becomes visible again.
- **FR-008**: Automatic background refresh MUST only show a notification when new data actually arrived; silent fetches that return the same data MUST NOT produce a toast.

#### Closed-Ticket Warning (Issue 225)

- **FR-009**: When rendering a Teams calendar event that contains a recognisable Redmine ticket ID, the calendar MUST check whether that ticket is open or closed.
- **FR-010**: If the referenced ticket is closed, the calendar MUST display the same warning indicator currently shown for non-existing ticket IDs.
- **FR-011**: The closed-ticket check MUST NOT show a warning if the ticket status cannot be determined due to a transient API error (fail-safe: no false warnings).
- **FR-012**: Existing warning behaviour for non-existing ticket IDs MUST be preserved (no regression).

#### Event Source in Modal Title (Issue 226)

- **FR-013**: When the time-entry modal opens for an unmatched external event with a known source, the modal title MUST include the source name using the pattern "Source event from {source}" (en) / "Quellereignis aus {source}" (de).
- **FR-014**: When the source is unknown or not set, the modal title MUST fall back to the current plain "Source event" / "Quellereignis" string.
- **FR-015**: The `en` and `de` i18n translation files MUST be updated with the new parameterised title string.
- **FR-016**: The modal title MUST NOT overflow or truncate the header area for any known source name.

#### Planning View Total Position (Issue 227)

- **FR-017**: In Planning view, the total spent time for the visible period MUST be displayed in the calendar headline area, consistent in position and style with the day-column totals in Full-Week view.
- **FR-018**: The total MUST be removed from its current position near the settings icon in Planning view.
- **FR-019**: The relocation MUST NOT affect total display behaviour in any other view (Full-Week, Day, Month).

### Key Entities

- **RefreshState**: Tracks last-refresh timestamp, which sources were fetched, and whether a refresh is currently in progress.
- **TicketStatus**: The open/closed status of a Redmine ticket, resolved at event-render time and cached for the duration of the session to avoid redundant API calls.
- **CalendarEvent**: An event on the calendar; carries a `source` field (e.g., `"Teams"`, `"Outlook"`, `"Google"`, `"Redmine"`) used for the modal title and for routing refresh logic.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: After clicking Refresh, all calendar sources are re-fetched and the view is updated within 5 seconds on a typical broadband connection, without a page reload.
- **SC-002**: 100% of Teams events linked to closed Redmine tickets display the warning indicator; 0% of events linked to open tickets receive a false warning.
- **SC-003**: The source name appears in the modal title for 100% of unmatched events that carry a known source field; plain fallback appears for all others.
- **SC-004**: The Planning view total is visible in the calendar headline area in 100% of Planning view renders; the settings area contains no total display.
- **SC-005**: No regression in existing functionality: day totals in Full-Week view, existing ticket-not-found warnings, and existing modal titles for non-source events are unchanged.
- **SC-006**: Automatic background refresh, when configured, runs at the specified interval and produces no visible UI disruption when no new data is found.

## Assumptions

- The Redmine API supports filtering time entries and ticket status by `updated_on` or equivalent for incremental refresh; full-reload fallback is always available.
- Ticket status (open/closed) is determined by the `status.is_closed` field returned by the Redmine ticket detail endpoint, which is accessible with the existing API key permissions.
- The `source` field is already present on calendar event objects for Teams, Outlook, and Google events (established in prior features 041, etc.); this feature reads but does not redefine it.
- The Planning view total is currently rendered as a DOM element near the settings icon; relocating it is a CSS/JS change, not an API change.
- Mobile support for the Refresh button is in scope for layout but full mobile testing is deferred to a dedicated mobile feature.
- The automatic refresh interval setting uses the same admin `config.json` + user Settings pattern established by earlier features; no new storage mechanism is introduced.
- Incremental refresh (fetching only data changed since `lastRefreshAt`) is the preferred approach where supported, but a full re-fetch is acceptable as the fallback and for the initial implementation.

---

## Quality Gate Checklist

_Dieser Abschnitt wird via Preset-Composition an jede Spec angehängt (nicht im spec-template.md selbst). Änderungen: `.specify/preset-sources/redminecalendar/templates/spec-quality-gate-appendix.md`_

### Vor dem Weitergang zu `/speckit-plan`

- [ ] Alle `[NEEDS CLARIFICATION]`-Marker aufgelöst (oder via `/speckit-clarify` bearbeitet)
- [ ] User Stories haben P1/P2/P3-Priorität und sind **unabhängig testbar**
- [ ] Acceptance Scenarios im Given/When/Then-Format vorhanden
- [ ] Kein direkter Datenbankzugriff — ausschließlich Redmine REST API (**Constitution I**)
- [ ] Keine Hardcoded Credentials — alle API-Keys über `config.json` oder verschlüsseltes localStorage (**Constitution V**)
- [ ] Neue Abhängigkeiten begründet (YAGNI — **Constitution IV**)
- [ ] Feature ist user-facing? → `docs/content.en.md` + `docs/content.de.md` müssen aktualisiert werden (wird bei UAT als Hardgate erzwungen — besser jetzt schon einplanen)

### Spec Kit Workflow Reminder

```bash
# Einzelne Phasen manuell:
# /speckit-specify → /speckit-clarify → /speckit-plan → /speckit-tasks → /speckit-implement → /speckit-uat-run

# Oder als vollständige Pipeline mit Gates:
specify workflow run speckit --input spec="<feature-beschreibung>"
specify workflow resume <run_id>   # nach jedem Gate
```

- [ ] Neue `js/*.js`-Module geplant? → `js/knowledge.topics.json` muss aktualisiert werden (CI-Gate: `npm run knowledge:check`)
