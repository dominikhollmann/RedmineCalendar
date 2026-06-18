# Research: Calendar UX Improvements (043)

**Status**: Complete — no open unknowns. All decisions resolved via codebase reading.

All findings are recorded as decision log entries R-01 through R-08 in `plan.md`.

## Key Findings

### P1 — Data Refresh

- `calendar.js` exposes `loadWeekEntries(startDate, endDate)` as the fetch entry point; `_lastStart` / `_lastEnd` track the current range. A `refreshCalendarData()` export will call `loadWeekEntries(_lastStart, _lastEnd)`.
- Planning view refreshes via `refreshPlanningView()` already exported from `planning-view-context.js`.
- The `_issueInfoCache` in `redmine-api.js` and the `_cache` in `planning-view-cache.js` are in-memory; they survive an in-app refresh naturally (no action needed to "preserve" them — just don't clear them).
- Page Visibility API: `document.addEventListener('visibilitychange', ...)` with `document.visibilityState === 'visible'` for pause/resume. Standard, browser-native.
- `setInterval` + `clearInterval` for the polling loop. Minimum sane interval: 60 s (hard-coded floor); default 300 s; user-configurable via Settings.

### P2 — Closed-Ticket Warning (Teams DRY)

- `planning-view-outlook.js` `_buildItems()` has the batch closed-status fetch. It uses `fetchIssueInfo(id)` directly, which is functionally equivalent to the existing `fetchIssueStatuses(ids)` helper in `redmine-api.js` (both delegate to the same cache).
- `stampClosedStatus(proposals)` can be implemented using `fetchIssueStatuses`:
  ```js
  export async function stampClosedStatus(proposals) {
    const ids = [...new Set(proposals.map((p) => p.ticketId).filter((id) => id != null))];
    const map = await fetchIssueStatuses(ids);
    for (const p of proposals) {
      if (p.ticketId != null) p.is_closed = map.get(p.ticketId) ?? false;
    }
  }
  ```
- Teams calls (`normaliseCall`) always return `ticketId: null` — they are never bookable and never get a warning. Only meetings (`normaliseMeeting`) can have a `ticketId`.
- `planning-view-column-base.js` line 231 already renders the warning icon when `proposal.is_closed === true` — no rendering change needed; only the data-stamp is missing for Teams.

### P3 — Event Source in Modal Title

- `renderSourceEventInfo` in `time-entry-form-view.js` (line 340) renders the source block. The `sourceEvent` object currently carries `{ subject, startTime, endTime }`.
- Adding `source?: string` to `sourceEvent` is non-breaking; when absent, existing plain key `planning.modal_source_info` is used as the label.
- New i18n pattern: `t('planning.modal_source_info_from', { source })` for the parameterised case.
- The `source` field value (`"Teams"`, `"Outlook"`) is our own code's enum — it never comes from user input, so DOMPurify sanitization is not needed (but `source` is used only as `textContent`, not `innerHTML`, so XSS is impossible regardless).
- `sourceEvent.source` is set in `planning-view.js` `_bookOne` for `planningCategory === 'needs-ticket'`. The calling side knows which column the event came from via the proposal's `source` field, which will be stamped in normalisation.

### P4 — Planning View Total in Column Header

- `#week-total` in `index.html` (line 44) sits in `<header class="app-header">` between the title and the settings link. `updateWeekTotal()` in `calendar-overlays.js` writes to it.
- In planning mode, `#week-total` reflects Redmine bookings for the current week, not the planning day. It is visually near the settings icon — the wrong location per Issue #227.
- Fix: inject a `<span class="day-total" id="planning-bookings-total">` into the Bookings column header element (the first `planning-view-column-header` div). Update it after `loadBookingsForDay` returns by summing `bookings.reduce((s, b) => s + b.hours, 0)`.
- Hide `#week-total` in planning mode: add class `planning-mode` to `<body>` when `setPlanningMode(true)` is called; CSS rule `body.planning-mode #week-total { display: none }` in `planning-view.css`.
- Zero state: if total is 0, show nothing (consistent with `updateWeekTotal` which skips 0).
