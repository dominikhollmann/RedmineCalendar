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

- [ ] Open the app, navigate to any day in the Planning View (click a day header in the main calendar).
- [ ] Verify all three columns (Bookings, Outlook, Teams) show the **same gridlines**: same dotted minor lines at :15 and :45, same gray band backgrounds on even hours, same half-hour separator weight.
- [ ] Toggle dark mode (Settings → Appearance). Verify all three columns apply dark-mode tokens consistently with no visible difference between columns.
- [ ] In the browser DevTools, inspect a `.fc-timegrid-slot-lane` element in the Bookings column and in the Outlook column — verify both have the same computed `background-color`.

## Scenario 2 — Scroll synchronisation

- [ ] Open the Planning View. Scroll to the middle of the day (e.g. 12:00).
- [ ] Verify all three columns scroll together — the same hour label is visible at the same vertical position in all three columns.
- [ ] Scroll rapidly up and down. Verify no column lags behind or ends up at a different position.

## Scenario 3 — Outlook event click opens booking modal

- [ ] In the Planning View with Outlook connected, verify an Outlook event card appears in the Outlook column.
- [ ] Click the Outlook event. Verify the booking/time-entry modal opens with the correct start and end time pre-filled.
- [ ] Verify an all-day Outlook event (if any) renders as a timed block spanning the working-hours range, not as an all-day banner.

## Scenario 4 — Teams event click opens booking modal

- [ ] In the Planning View with Teams connected (or demo mode: `config.azureClientId: "demo"`), verify a Teams call/meeting card appears in the Teams column.
- [ ] Click the Teams event. Verify the booking modal opens with the call duration pre-filled.

## Scenario 5 — Event colour states (ticket-detection)

- [ ] In the Outlook or Teams column, identify events in different detection states: bookable (green), needs-ticket (orange/red), excluded.
- [ ] Verify the same colour tokens are applied as in the Bookings column for equivalent states.
- [ ] Verify an Outlook event and a Teams event in the same detection state show identical colours.

## Scenario 6 — Drag to book from Outlook/Teams

- [ ] In the Planning View, drag an Outlook event (in "bookable" state) onto the Bookings column.
- [ ] Verify the drop overlay highlights the Bookings column during drag.
- [ ] Verify the booking modal opens after the drop, pre-filled with the dragged event's time slot.

## Scenario 7 — Multi-select drag (Shift+click)

- [ ] Shift-click multiple events across the Outlook and Teams columns.
- [ ] Verify all selected events show the selection outline (`.planning-event--selected`).
- [ ] Drag the selection to the Bookings column. Verify the booking modal (or batch-book flow) opens for all selected events.

## Scenario 8 — Day navigation

- [ ] In the Planning View, click the next-day / previous-day buttons.
- [ ] Verify all three columns refresh correctly to show the new day's events.
- [ ] Verify the scroll position resets to the top (or to the current-time indicator) after navigation.

## Scenario 9 — Classic calendar unchanged

- [ ] Navigate to the main weekly calendar view (close Planning View).
- [ ] Verify time entries still render correctly in the week grid.
- [ ] Verify drag-to-create, event resize, and double-click to edit still work.
- [ ] Verify visual appearance (band colours, event card colours) is identical to before the feature.

## Scenario 10 — No duplicate CSS (developer check)

- [ ] In DevTools, inspect a `.fc-timegrid-slot-lane` in the Outlook or Teams column.
- [ ] Verify band-background rules come from `calendar.css` (not `planning-view.css`).
- [ ] Verify `.fc-event` base rules come from `calendar.css`.
- [ ] Verify `.planning-view.css` contains no `.fc-event`, `.planning-event`, `.planning-time-grid`, or `.planning-grid-slot` rules.

## Scenario 11 — SQI and CI gates pass

```bash
npm run lint          # 0 warnings/errors
npm run typecheck     # 0 type errors
npm run test          # all unit tests pass
npm run test:coverage # coverage ≥ 95% on unit-tested modules
npm run sqi           # composite ≥ 80 (GREEN)
npm run dup:check     # duplication baseline does not increase
npm run test:ui       # all Playwright UI tests pass
```
