# Quickstart & UAT Guide: Calendar UX Improvements (043)

## Prerequisites

- `npm run dev` running (HTTPS dev server + Redmine CORS proxy)
- Redmine credentials configured in Settings
- At least one Outlook / Teams connection active (for P2/P3 scenarios)
- Planning view accessible (desktop browser width)

---

## Story 1 — Data Refresh (P1, Issue #206)

### Setup

1. Open the app and let the calendar load with existing entries.
2. In a separate browser tab or Redmine UI, create a new time entry for today.

### Manual Refresh

- [x] A **Refresh** button (or icon) is visible in the app toolbar (not in the settings page).
- [x] Clicking Refresh re-fetches Redmine entries and updates the calendar without a page reload (observe: URL stays the same, FullCalendar does not flash to a blank state).
- [x] After a successful refresh, a toast appears showing "Last refreshed at HH:MM".
- [x] The new time entry created in step 2 is now visible on the calendar.
- [x] The calendar's current date range and scroll position are unchanged after the refresh.
- [x] Clicking Refresh a second time while one is in progress does not trigger a second concurrent fetch (button is debounced / second click is ignored).

### Cache Preservation

- [x] After clicking Refresh, hovering over an existing event still shows correct tooltip / issue info (cached data is not wiped).
- [x] Pressing F5 (browser reload) resets all state (expected existing behaviour — not changed by this feature).

### Auto-Refresh

- [x] In Settings, an **Auto-refresh interval** field is present (numeric, minutes; `0` = off).
- [x] Setting interval to `1` minute and waiting causes the calendar to silently update when new data has arrived (no toast if nothing changed).
- [x] Switching to a background tab and switching back resumes polling (check browser console: no `setInterval` fires while tab is hidden, resumes on `visibilitychange`).
- [x] Setting interval to `0` disables auto-refresh (no background fetches).

### Source Failure

- [ ] Simulating a Redmine proxy outage (stop the dev server proxy) and clicking Refresh: a warning toast identifies Redmine as the failed source; any Outlook/Teams data that loaded successfully is still shown.

---

## Story 2 — Closed-Ticket Warning on Teams Events (P2, Issue #225)

### Setup

1. Ensure a Teams meeting is visible in Planning View whose subject contains a Redmine ticket ID (e.g. `#1234`).
2. In Redmine, close that ticket (set status to Closed).

### Validation

- [x] Navigate to Planning View for the day of the Teams meeting.
- [x] The Teams meeting card displays the **same warning icon** shown for invalid/missing ticket IDs (closed-ticket warning; same icon and tooltip as Outlook events with closed tickets).
- [x] An Outlook event referencing the same ticket ID also shows the warning icon — and the console shows only one Redmine API request for ticket `#1234` (cache deduplication).
- [x] A Teams meeting referencing an **open** ticket shows no warning icon.
- [x] A Teams meeting with no ticket ID in the subject shows no warning icon.
- [x] A Teams meeting referencing a **non-existent** ticket still shows the existing invalid-ticket warning (regression check).

---

## Story 3 — Event Source Label in Modal Title (P3, Issue #226)

### Setup

1. Ensure a Teams meeting (or Outlook event) with no Redmine ticket match is visible in Planning View — it should have `planningCategory === 'needs-ticket'`.
2. Click the **Book** action on that event to open the time-entry modal.

### Validation

- [x] The modal's source-event label reads **"Source event from Teams"** (English) or **"Quellereignis aus Teams"** (German) — not the plain "Source event" / "Quellereignis".
- [x] For an unmatched **Outlook** event, the label reads "Source event from Outlook" / "Quellereignis aus Outlook".
- [ ] For an event with no `source` field (e.g., a calendar event without a known origin), the label falls back to the plain "Source event" / "Quellereignis" (no crash, no empty label).
- [x] The modal header area does not overflow or show a scrollbar for source names of typical length ("Teams", "Outlook", "Google").

---

## Story 4 — Planning View Total in Calendar Headline (P4, Issue #227)

### Validation

- [x] Switch to **Planning View** with at least one booked time entry visible.
- [x] The total hours for the day are displayed **inside the Bookings column header** (above the booked events), styled consistently with the day-column totals in Full-Week view (same font size, colour, position pattern).
- [x] The `#week-total` element in the top-right app header area is **not visible** while in Planning View.
- [x] Switch back to the standard calendar view: `#week-total` in the header is restored and shows the correct weekly total (no regression).
- [x] In Planning View with **zero booked entries**, the Bookings column header shows no total (consistent with how day-column totals behave when there are no entries).
- [x] Navigating to a different day in Planning View updates the Bookings column total to reflect the new day's hours.

---

## Regression Checks

- [x] Full-Week view day totals are unchanged (`.day-total` in each column header still updates correctly).
- [x] Outlook closed-ticket warning behaviour is unchanged (Outlook events with closed tickets still show the warning icon — DRY refactor does not remove existing behaviour).
- [x] The booking guard (feature 042) still fires correctly when dragging a Teams or Outlook event to the Bookings column.
- [x] `npm run test:ui` passes with no new failures after all changes.

---

## Docs Update (hard gate before UAT completion)

- [x] `docs/content.en.md` updated to describe: Refresh button, auto-refresh interval setting, Teams closed-ticket warning, source label in modal.
- [x] `docs/content.de.md` updated with German equivalents.
