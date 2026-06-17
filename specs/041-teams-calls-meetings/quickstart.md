# Quickstart Validation: Teams Calls & Meetings Column (Feature 041)

## Prerequisites

1. App running via `npm run dev` (HTTPS + CORS proxy).
2. `config.json` has a valid `azureClientId` with the following Graph scopes:
   - `Calendars.Read` (existing)
   - `OnlineMeetingArtifact.Read.All` (NEW — required for actual meeting times, Track A)
   - `CallRecords.Read.All` (OPTIONAL — admin consent required, Track B — ad-hoc calls only)
3. User signed into Microsoft via Settings (MSAL popup flow).
4. The Microsoft 365 test account has:
   - At least one Teams meeting that ended in the last 7 days
   - At least one ad-hoc Teams call (for Track B scenarios, if admin consent is available)
5. Redmine is reachable and API key is configured in Settings.

---

## Validation Scenarios

### Scenario 1 — Teams Column Appears and Shows Actual Times

- [x] Open Settings → Planning View Sources → confirm Teams toggle is OFF by default.
- [x] Enable the Teams toggle and save.
- [x] Open the Planning View for a day with at least one Teams meeting.
- [x] Confirm a "Teams" column header is visible alongside Bookings and Outlook.
- [x] Confirm the meeting card shows minute-precise **actual** start and end times (e.g.
      "10:05–11:23"), not the scheduled times (e.g. "10:00–11:00").
- [x] Cross-check against the Teams desktop app call history — times must match.

### Scenario 2 — Direct Call Display (Track B — requires admin consent)

- [x] On a day with a direct Teams call (≥ 1 minute), open the Planning View.
- [x] Confirm the call appears in the Teams column with participant names as the card title
      (no own name shown — FR-006).
- [x] Confirm minute-precise actual times are displayed.
- [ ] If a call < 1 minute is present, confirm it does NOT appear (excluded, FR-009).

### Scenario 3 — Drag-to-Book: Meeting with Issue Reference (no modal)

- [x] In the Teams column, find a meeting whose title contains "#" + a valid issue number
      (e.g. "Sprint Review #42").
- [x] Drag the card to the Bookings column.
- [x] Confirm a Redmine time entry is created immediately — no modal opens (FR-011).
- [x] Confirm the entry uses quarter-hour-rounded actual times (not the raw minute-precise
      times).

### Scenario 4 — Drag-to-Book: Direct Call (modal opens, no comment pre-fill)

- [x] In the Teams column, drag a direct call to the Bookings column.
- [x] Confirm the booking modal opens with rounded actual times pre-filled.
- [x] Confirm the highlighted source-event box shows participant names (FR-012).
- [x] Confirm the comment field is **empty** — participant names NOT copied there (FR-012
      personal-information minimisation).
- [x] Assign a Redmine issue and submit — confirm time entry created.

### Scenario 5 — Drag-to-Book: Meeting without Issue Reference (modal opens, comment pre-filled)

- [x] In the Teams column, drag a meeting with no issue reference in its title.
- [x] Confirm the booking modal opens with rounded actual times.
- [x] Confirm the meeting title appears in the highlighted source-event box (FR-012).
- [x] Confirm the meeting title is **also** pre-filled into the comment field (FR-012).
- [x] Assign an issue and submit — confirm time entry created.

### Scenario 6 — Coverage Greying: Teams Events

- [x] Book a Redmine time entry covering 10:00–11:00 for the selected day.
- [x] In the Teams column, a meeting that ran 10:05–10:55 (rounds to 10:00–11:00) should
      appear greyed out (FR-013).
- [x] A meeting that ran 10:05–11:10 (rounds to 10:00–11:15) should NOT be greyed out
      (not fully covered).

### Scenario 7 — Coverage Greying: Outlook Consistency (FR-013)

- [x] With the same 10:00–11:00 booking active:
- [x] An Outlook event at scheduled 10:00–10:55 should display as "10:00–10:55" (raw times)
      AND be greyed out (rounded 10:00–11:00 is fully covered).
- [x] An Outlook event at scheduled 10:00–11:05 should display as "10:00–11:05" (raw times)
      AND NOT be greyed out (rounded 10:00–11:15 exceeds the booking).

### Scenario 8 — Memoisation Cache: No Duplicate Redmine Calls (SC-004)

- [x] Ensure the same meeting title with the same issue reference appears in both the Outlook
      and Teams columns (same meeting shown in both).
- [x] Open browser DevTools → Network tab → filter to Redmine host, GET requests.
- [x] Open the Planning View for that day.
- [x] Confirm only ONE Redmine API request is made for that issue number, not two.

### Scenario 9 — Failure Isolation (FR-014)

- [x] Sign out of Microsoft (MSAL sign-out in Settings).
- [x] Open the Planning View.
- [x] Confirm the Teams column shows a reconnect prompt.
- [x] Confirm the Outlook column and Bookings column continue to function normally.
- [x] Click the reconnect button — confirm the MSAL login popup appears.

### Scenario 10 — Column Toggle Persists (FR-003)

- [x] Enable Teams column in Settings → save → close the tab → reopen.
- [x] Confirm the Teams column is still visible (localStorage persists).
- [x] Disable the Teams column in Settings → confirm it disappears without a page reload,
      within 2 seconds of saving (SC-005).

### Scenario 11 — Cross-Column Multi-Select

- [x] Shift-click two events in the Outlook column — both show selected state.
- [x] Shift-click one event in the Teams column — all three events are selected (shared pool).
- [x] Plain-click another event — only that event is selected; all others are cleared (unified pool).
- [x] Select events from both columns via shift-click; drag to Bookings — confirm all selected
      events are processed, not just the dragged column's selection.

### Scenario 12 — Teams Permissions Unavailable State (FR-015)

N/A — requires a real M365 tenant where `CallRecords.Read.All` has NOT been admin-consented.
Not reproducible in demo mode. Covered by code-path review only.

---

## Post-Validation Quality Gates

- [ ] `npm run test:ui` — all Playwright tests pass (no regressions in other features).
- [ ] `npm run sqi` — composite ≥ 80 (GREEN).
- [ ] `npm run test:coverage` — `planning-view-cache.js` and `planning-view-teams.js` each
      at ≥ 95% line coverage.
- [ ] `npm run lint && npm run typecheck` — zero new warnings.
- [ ] `npm run format:check` — no formatting violations.
