# Implementation Plan: Multi-Day Planning Event Expansion (050)

**Branch**: `claude/long-outlook-events-ey1jkt` | **Date**: 2026-06-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/050-long-outlook-events/spec.md`

## Summary

When the user drags a multi-day planning event (holiday, illness, training, client travel) from any source column (Outlook, Teams, or other) onto the Bookings column in the Planning View, the app must expand it into one Redmine time entry per Mon–Fri within the event's date range (skipping Sat/Sun), ask for ticket info exactly once via the existing modal, book all N entries, push a single `bulk-add` undo step, and display a toast with the count of entries created.

**Approach**: A new `js/planning-bulk-drop.js` module intercepts multi-day planning events in the existing shared drop handler (`planning-view.js::_onColumnDrop`). It uses `rawEvent.start` / `rawEvent.end` to detect multi-day events, expands weekdays with a pure helper, reuses `readWeeklyHours()` for daily duration (`weeklyHours / 5`), calls `openForm` once for the needs-ticket path, and uses the existing `undo:batchbegin`/`undo:batchend` coalescing. The module is source-agnostic — it does not import from or depend on any planning-source-specific module (`planning-view-outlook.js`, `planning-view-teams.js`, etc.).

---

## Technical Context

**Language/Version**: JavaScript ES2022, vanilla ES modules, no transpilation

**Primary Dependencies**: FullCalendar v6 (CDN, existing), MSAL.js v2 (CDN, existing — Outlook Graph already integrated); no new runtime dependencies

**Storage**: Reads `redmine_calendar_weekly_hours` from `localStorage` via existing `readWeeklyHours()` (no new keys); Redmine REST API for entry creation/deletion

**Testing**: Vitest (node environment, pure-logic unit tests), Playwright (UI tests for full D&D flow in demo mode)

**Target Platform**: Desktop browsers (Chrome, Firefox, Safari); mobile out of scope per spec Assumptions

**Project Type**: Static SPA (no build step, no bundler)

**Performance Goals**: Calendar render unaffected (< 300 ms per Constitution II); N API calls run sequentially (predictable ordering for undo); up to ~22 entries (max 2 business weeks — well within practical limits)

**Constraints**: ESLint `max-lines-per-function: 60` on `js/**`; `max-lines: 600` on new module; SQI composite ≥ 80 post-merge; dup:check ratchet must not increase

---

## Constitution Check

| Principle | Assessment | Status |
|-----------|-----------|--------|
| **I — Redmine API Contract** | All time entries created/deleted exclusively via `createTimeEntry` / `deleteTimeEntry` in `js/redmine-api.js`. No direct DB access. API key from encrypted credentials per existing pattern. | ✅ PASS |
| **II — Calendar-First UX** | Drop → immediate async processing; Bookings column refreshed via existing `refreshBookings()` callback. Toast is non-blocking. Calendar render path unchanged. | ✅ PASS |
| **III — Test-First TDD** | `expandToWeekdays()` pure function tested in Vitest before implementation; UI test written in Playwright before wiring `_onColumnDrop`. | ✅ PASS |
| **IV — Simplicity / YAGNI** | No new dependencies. New module `planning-bulk-drop.js` is the minimum addition — inline logic in `planning-view.js` would violate the 60-LOC-per-function gate. Modal title notice added as an inline `<p>` (simplest option vs. adding a prop to the modal API). | ✅ PASS |
| **V — Security by Default** | `rawEvent.subject` is already sanitized at the display layer for all source columns; `createTimeEntry` receives typed fields (no template injection). No new credential handling. | ✅ PASS |
| **VI — Continuous Quality Gates** | New module stays under 300 LOC; two helper functions exported for unit coverage (≥ 95% lines). SQI impact: +1 module (lowers ACD by < 0.05); no new cycles introduced. Dup:check: no copy-paste of existing `bookBatch` — new module delegates to existing primitives. | ✅ PASS |
| **VII — Reuse Before Reimplementation** | `createTimeEntry`, `openForm`, `showToast`, `readWeeklyHours`, `runDropGuards`, `undoManager` — all reused. `ACTION_BULK_ADD` constant added to existing undo-manager (Rule of Two: `undoBulkDelete` exists; second consumer warrants extraction — both handled in existing `undo-actions.js`). | ✅ PASS |

---

## Wiederverwendungs-Audit

**Berührte Module**:
- `js/planning-view.js` — extended: `_onColumnDrop` calls new multi-day check + routes to `bookLongPlanningEvent`
- `js/time-entry-form.js` / `js/time-entry-form-view.js` — minor extension: `prefill.bulkDayCount` renders a banner inside the modal (existing prefill object pattern)
- `js/i18n/en.js` + `js/i18n/de.js` — extended: 5 new keys (4 toast/guard keys in T004 + `outlook.bulk_day_notice` modal banner key in T005)
- `js/knowledge.topics.json` — extended: new module registered
- `js/undo-manager.js` / `js/undo-actions.js` — **not extended** (already contain `ACTION_BULK_ADD`, `undoBulkAdd`/`redoBulkAdd`, and `undo:batchbegin`/`undo:batchend` coalescing from PR #256)

**Wiederverwendet vs. Neu**:
| Symbol | Module | Reuse or New |
|--------|--------|--------------|
| `createTimeEntry` | `redmine-api.js` | Reused |
| `openForm` | `time-entry-form.js` | Reused |
| `showToast` | `notify.js` | Reused |
| `readWeeklyHours` | `working-hours.js` | Reused |
| `runDropGuards` | `booking-guard.js` | Reused |
| `undoManager.push` | `undo-manager.js` | Reused |
| `ACTION_BULK_ADD` | `undo-manager.js` | Reused — shipped in PR #256 |
| `undoBulkAdd / redoBulkAdd` | `undo-actions.js` | Reused — shipped in PR #256 |
| `undo:batchbegin/batchend` | `undo-actions.js` | Reused — coalescing listener shipped in PR #256 |
| `expandToWeekdays` | `planning-bulk-drop.js` | New pure function — no existing weekday-expansion utility |
| `bookLongPlanningEvent` | `planning-bulk-drop.js` | New orchestrator — multi-day flow has no existing parallel |

**Parallel-Capability**: The new `planning-bulk-drop.js` is the only multi-day booking orchestrator. It is not a second copy of `planning-view-drop.js::bookBatch` — the two serve distinct contracts (single-day batch vs. multi-day single-event expansion). No common base abstraction is warranted at this stage (Rule of Two: only one multi-day orchestrator exists).

---

## Project Structure

### Documentation (this feature)

```text
specs/050-long-outlook-events/
├── plan.md              ← this file
├── research.md          ← Phase 0 findings
├── data-model.md        ← entity shapes and relationships
├── quickstart.md        ← UAT validation guide
└── tasks.md             ← Phase 2 (generated by /speckit-tasks)
```

### Source Code Changes

```text
js/
├── planning-bulk-drop.js           ← NEW: multi-day expansion + orchestration
├── planning-view.js               ← EXTENDED: _onColumnDrop multi-day routing
├── time-entry-form-view.js        ← EXTENDED: bulkDayCount banner in modal
├── i18n/en.js                     ← EXTENDED: 5 new i18n keys
└── i18n/de.js                     ← EXTENDED: 5 new i18n keys (German)

tests/
├── unit/planning-bulk-drop.test.js ← NEW: Vitest node tests for pure functions
└── ui/planning-bulk-drop.spec.js   ← NEW: Playwright E2E for full D&D flow
```

---

## Phased Implementation

### Phase 1 — Pure logic (no DOM)

**T001**: Write unit tests for `expandToWeekdays(startDate, endDate)` in `tests/unit/planning-bulk-drop.test.js` (TDD — tests first, then implementation).

**T002**: Implement `expandToWeekdays(startDate, endDate)` in `js/planning-bulk-drop.js` — pure function, string in / string array out.

**T003**: Add 4 i18n keys to `js/i18n/en.js` and `js/i18n/de.js`.

### Phase 2 — Modal context notice

**T004**: Extend `openForm` / `time-entry-form-view.js` to accept `prefill.bulkDayCount` (number): renders a `<p class="bulk-day-notice">` banner inside the form (e.g. "10 days will be booked") when set; no-op otherwise.

### Phase 3 — Orchestration + wiring

**T005**: Implement `bookLongPlanningEvent(planningEvent, planningDay, refreshFn)` in `js/planning-bulk-drop.js` (`weeklyHours` is read internally via `readWeeklyHours()`):
1. `dates = expandToWeekdays(rawEvent.start.slice(0,10), rawEvent.end.slice(0,10))`
2. If `dates.length === 0` → `showToast(t('outlook.bulk_none_weekdays'))`; return.
3. If `planningCategory === 'needs-ticket'` → `openForm` with `bulkDayCount: dates.length`; capture saved first entry.
4. Dispatch `undo:batchbegin`; book remaining dates via `createTimeEntry` (sequential; call `runDropGuards` per day for the `bookable`/`break` path, skip for `needs-ticket` path where the guard runs inside `openForm`); dispatch `undo:batchend` — the existing coalescing listener collapses all `undo:push { type:'add' }` events into one `{ type: 'bulk-add', entries: [...] }` step.
5. `showToast(t('outlook.bulk_booked', { n: actualCount }))`.
6. Call `refreshFn()`.

**T006**: In `js/planning-view.js::_onColumnDrop`, after resolving `events`, check each event: if `isMultiDay(rawEvent)` → call `bookLongPlanningEvent`; else fall through to existing `bookBatch`.

**T007**: Guard: if `readWeeklyHours()` returns null when multi-day event dropped → `showToast(t('outlook.bulk_weekly_hours_missing'))`; return without booking.

### Phase 4 — Tests + knowledge routing

**T008**: Write Playwright test in `tests/ui/planning-bulk-drop.spec.js`:
- Demo mode, drag a multi-day all-day event → confirm 5 entries, 1 modal, toast "5 entries booked", Ctrl+Z removes all.

**T009**: Update `js/knowledge.topics.json` to register `planning-bulk-drop.js`.

**T010**: Run `npm run test:coverage`, `npm run lint`, `npm run sqi` — verify all gates pass.

---

## Complexity Tracking

No constitution violations requiring justification. No new dependencies. New module is the minimum structure to stay within the ESLint `max-lines-per-function: 60` constraint while keeping `planning-view.js` clean.
