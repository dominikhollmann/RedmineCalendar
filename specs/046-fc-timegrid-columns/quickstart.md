# Quickstart / UAT Guide: Feature 046

**Feature**: Real FullCalendar Columns for Planning View + Shared Factory
**Branch**: `046-fc-timegrid-columns`
**Prerequisites**: Redmine credentials configured, Outlook and/or Teams configured (or demo mode), dev server running (`npm run dev`)

## Setup

```bash
git checkout 046-fc-timegrid-columns
npm run dev
# Open https://localhost:3000
```

---

## Scenario 1 — Visual parity: all three planning-view columns are identical

- [x] Open the app, navigate to any day in the Planning View (click a day header in the main calendar).
- [x] Verify all three columns (Bookings, Outlook, Teams) show the **same gridlines**: same dotted minor lines at :15 and :45, same gray band backgrounds on even hours, same half-hour separator weight.
- [x] Toggle dark mode (Settings → Appearance). Verify all three columns apply dark-mode tokens consistently with no visible difference between columns.
- [x] In the browser DevTools, inspect a `.fc-timegrid-slot-lane` element in the Bookings column and in the Outlook column — verify both have the same computed `background-color`.

## Scenario 2 — Scroll synchronisation

- [x] Open the Planning View. Scroll to the middle of the day (e.g. 12:00).
- [x] Verify all three columns scroll together — the same hour label is visible at the same vertical position in all three columns.
- [x] Scroll rapidly up and down. Verify no column lags behind or ends up at a different position.

## Scenario 3 — Outlook event click selects; drag books

- [x] In the Planning View with Outlook connected, verify an Outlook event card appears in the Outlook column.
- [x] Click the Outlook event. Verify the event becomes selected (selection outline visible); verify no booking modal opens on click alone.
- [x] Verify an all-day Outlook event (if any) renders as a timed block spanning the working-hours range, not as an all-day banner.

## Scenario 4 — Teams event click selects; drag books

- [x] In the Planning View with Teams connected (or demo mode: `config.azureClientId: "demo"`), verify a Teams call/meeting card appears in the Teams column.
- [x] Click the Teams event. Verify the event becomes selected (selection outline visible); verify no booking modal opens on click alone. Drag the Teams event to the Bookings column and verify the booking is created correctly.

## Scenario 5 — Event colour states (ticket-detection)

- [x] In the Outlook or Teams column, identify events in different detection states: bookable (green), needs-ticket (orange/red), excluded.
- [x] Verify the same colour tokens are applied as in the Bookings column for equivalent states.
- [x] Verify an Outlook event and a Teams event in the same detection state show identical colours.

## Scenario 6 — Drag to book from Outlook/Teams

- [x] In the Planning View, drag an Outlook event (in "bookable" state) onto the Bookings column.
- [x] Verify the drop overlay highlights the Bookings column during drag.
- [x] Verify the booking modal opens after the drop, pre-filled with the dragged event's time slot.

## Scenario 7 — Multi-select drag (Shift+click)

- [x] Shift-click multiple events across the Outlook and Teams columns.
- [x] Verify all selected events show the selection outline (`.planning-event--selected`).
- [x] Drag the selection to the Bookings column. Verify the booking modal (or batch-book flow) opens for all selected events.

## Scenario 8 — Day navigation

- [x] In the Planning View, click the next-day / previous-day buttons.
- [x] Verify all three columns refresh correctly to show the new day's events.
- [x] Verify the scroll position resets to the top (or to the current-time indicator) after navigation.

## Scenario 9 — Classic calendar unchanged

- [x] Navigate to the main weekly calendar view (close Planning View).
- [x] Verify time entries still render correctly in the week grid.
- [x] Verify drag-to-create, event resize, and double-click to edit still work.
- [x] Verify visual appearance (band colours, event card colours) is identical to before the feature.

## Scenario 10 — No duplicate CSS (developer check)

- [x] In DevTools, inspect a `.fc-timegrid-slot-lane` in the Outlook or Teams column.
- [x] Verify band-background rules come from `calendar.css` (not `planning-view.css`).
- [x] Verify `.fc-event` base rules come from `calendar.css`.
- [x] Verify `.planning-view.css` contains no `.fc-event`, `.planning-event`, `.planning-time-grid`, or `.planning-grid-slot` rules.

## Scenario 11 — SQI and CI gates pass

```bash
# All gates verified green (CI pre-push + PR checks):
npm run lint          # 0 warnings/errors  ✓
npm run typecheck     # 0 type errors  ✓
npm run test          # all unit tests pass  ✓
npm run test:coverage # coverage ≥ 95% on unit-tested modules  ✓
npm run sqi           # composite ≥ 80 (GREEN) — 97.75  ✓
npm run dup:check     # duplication baseline does not increase  ✓
npm run test:ui       # all Playwright UI tests pass  ✓
```
