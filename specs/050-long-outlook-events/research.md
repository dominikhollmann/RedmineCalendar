# Research: Long Outlook Event Expansion (050)

## 1. D&D Entry Point

**Decision**: Hook into `_onColumnDrop` in `js/planning-view.js` (the HTML5 drop handler that calls `bookBatch`).

**Rationale**: This is the single consolidation point for both pointer-based and HTML5 drag paths. The `events` array available at this point is the `PlanningEvent[]` from `getSelectedEvents()` / the parsed `planning/events` payload. Each `PlanningEvent` carries `rawEvent` (the original Outlook Graph object with full `start` / `end` date-time strings), so multi-day detection is trivial here.

**Alternatives considered**: Hooking into `bookBatch()` in `planning-view-drop.js` — rejected because `bookBatch` does not have access to raw Graph event dates; the `PlanningEvent` it receives already has start/end reduced to a single planning day.

---

## 2. Multi-Day Detection

**Decision**: An Outlook event is "multi-day" when `rawEvent.end.slice(0,10) > rawEvent.start.slice(0,10)`. Use the event's own `start`/`end` dates (not the current `_planningDay`) to derive the booking range.

**Rationale**: The Graph API returns the full event start/end regardless of which day the planning view is showing. A holiday event shown on a Wednesday still carries its Monday start date, so the user always gets the full set of weekday entries regardless of which day they're looking at when they drop it.

**Alternatives considered**: Using `_planningDay` as the range start — rejected because this produces partial bookings when the user's calendar view is mid-event.

---

## 3. Weekday Expansion Algorithm

**Decision**: A pure function `expandToWeekdays(startDate, endDate)` → `string[]` (YYYY-MM-DD). Iterate with a cursor from `startDate` to `endDate` (inclusive, both treated as UTC date strings); push cursor if `getUTCDay()` is 1–5.

**Rationale**: Pure function is testable without DOM or API; avoids timezone ambiguity by working on date strings.

**DRY**: `weeklyHours / 5` is already the formula in `outlook.js:575` (`const dailyHours = weeklyHours ? weeklyHours / 5 : 8`). Reuse `readWeeklyHours()` from `js/working-hours.js` — no new storage key.

---

## 4. Single Modal Prompt (needs-ticket path)

**Decision**: When a multi-day event has `planningCategory === 'needs-ticket'`, open the form modal once (for the first weekday in the batch). Capture ticket + activity from the resolved entry returned by `openForm`. Reuse those values for all remaining weekday entries via `createTimeEntry()` directly.

**Rationale**: `openForm` in `js/time-entry-form.js` returns the saved entry (including `issueId` and `activityId`) via its `onSaved` callback. We can call `openForm` for day 1, extract the saved data, then fire `createTimeEntry` for days 2…N without re-opening the modal.

**Modal title**: Pass `titleOverride` (already supported by `openForm` via `options.title`) to show "Book N days".

---

## 5. Atomic Undo

**Decision**: Reuse the `undo:batchbegin` / `undo:batchend` coalescing mechanism already shipped in PR #256 (`main`). `ACTION_BULK_ADD`, `undoBulkAdd`, `redoBulkAdd`, and the batch-coalescing listener (`_addBuffer`) all exist in `undo-manager.js` / `undo-actions.js`. No new undo infrastructure is needed.

**Mechanism**: Dispatch `undo:batchbegin` before the first `createTimeEntry` call and `undo:batchend` after the last. Each individual `undo:push { type: 'add' }` is buffered by the existing listener and collapsed on `batchend` into one `{ type: 'bulk-add', entries: [...] }` — identical to how `bookBatch` works.

**Rationale**: This is the exact DRY unification the user flagged. The coalescing layer is the shared abstraction; `planning-bulk-drop.js` is a second consumer of the same pattern.

---

## 6. Toast & i18n

**Decision**: Add three new i18n keys:

| Key                                 | EN                                                    | DE                                                                |
| ----------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------- |
| `outlook.bulk_booked`               | `"{n} entries booked"`                                | `"{n} Einträge gebucht"`                                          |
| `outlook.bulk_none_weekdays`        | `"No weekday entries in this event — nothing booked"` | `"Keine Werktage in diesem Ereignis — nichts gebucht"`            |
| `outlook.bulk_weekly_hours_missing` | `"Configure weekly hours in Settings first"`          | `"Bitte zuerst Wochenstunden in den Einstellungen konfigurieren"` |
| `outlook.bulk_partial`              | `"{n} of {total} entries booked — {failed} failed"`   | `"{n} von {total} Einträgen gebucht — {failed} fehlgeschlagen"`   |

**Rationale**: Follows the `planning.batch_*` key pattern already in `en.js`/`de.js`.

---

## 7. New Module: `js/planning-bulk-drop.js`

**Decision**: Extract the multi-day orchestration into a dedicated `js/planning-bulk-drop.js` module. `planning-view.js` calls it from the shared `_onColumnDrop` handler; `planning-view-drop.js` remains unchanged for the single-event path. The module is intentionally source-agnostic — it does not import from `planning-view-outlook.js`, `planning-view-teams.js`, or any other source-specific module.

**Rationale**: (1) Constitution VII (Reuse Before Reimplementation) — the `bookBatch` pattern in `planning-view-drop.js` handles single-event flows; adding multi-day logic inline would bloat that module past the 60-line-per-function ESLint gate. (2) DRY / source-agnostic requirement — placing the logic in the shared `_onColumnDrop` layer means Outlook, Teams, and any future source column all benefit from one implementation. Duplicating the expansion logic in each source-specific module would violate Constitution VII and create the same drift problem the 2026 Outlook/Teams incident caused.

**Reuse audit**:

- `createTimeEntry` from `js/redmine-api.js` — reused
- `openForm` from `js/time-entry-form.js` — reused
- `showToast` from `js/notify.js` — reused
- `readWeeklyHours` from `js/working-hours.js` — reused
- `ACTION_BULK_ADD` / `undo:batchbegin` / `undo:batchend` from `js/undo-manager.js` + `js/undo-actions.js` — reused (already shipped in PR #256; no extension needed)
- `runDropGuards` from `js/booking-guard.js` — reused per-day

No duplicate of `bookBatch` — the new module handles a fundamentally different flow (cross-day, single-modal). The existing `bookBatch` remains the canonical single-day batch handler.

---

## 8. Knowledge Routing

`js/knowledge.topics.json` must be updated: add `js/planning-bulk-drop.js` to the `"planning"` and `"time-entries"` topics (or add a new `"bulk-booking"` topic). It should NOT be listed exclusively under `"outlook"` since it is source-agnostic.

---

## 9. Test Strategy

| Layer               | Scope                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Node unit (Vitest)  | `expandToWeekdays(start, end)` — date math, edge cases (weekend-only, single day, cross-month)                                 |
| jsdom unit (Vitest) | N/A — no DOM-only logic without FullCalendar                                                                                   |
| Playwright (UI)     | Full D&D of a multi-day Outlook event in demo mode: 10 entries created, 1 modal, toast "10 entries booked", Ctrl+Z removes all |

---

## 10. Files Changed Summary

| File                                    | Change                                                            |
| --------------------------------------- | ----------------------------------------------------------------- |
| `js/planning-bulk-drop.js`              | **NEW** — multi-day orchestration                                 |
| `js/undo-manager.js`                    | add `ACTION_BULK_ADD` constant                                    |
| `js/undo-actions.js`                    | handle `bulk-add` in performUndo/performRedo                      |
| `js/planning-view.js`                   | route long events to `bookLongPlanningEvent()` in `_onColumnDrop` |
| `js/i18n/en.js`                         | 4 new keys under `outlook.*`                                      |
| `js/i18n/de.js`                         | 4 new keys under `outlook.*`                                      |
| `js/knowledge.topics.json`              | register `planning-bulk-drop.js`                                  |
| `tests/unit/planning-bulk-drop.test.js` | **NEW** — pure-logic Vitest tests                                 |
| `tests/ui/planning-bulk-drop.spec.js`   | **NEW** — Playwright E2E test                                     |
