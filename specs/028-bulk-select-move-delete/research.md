# Research: Bulk Multi-Select for Move and Delete

**Feature**: 028-bulk-select-move-delete
**Date**: 2026-05-10
**Phase**: 0 (Outline & Research)

This feature is layered on top of existing FullCalendar v6 callbacks and the existing Redmine API client. The "research" is a survey of the codebase to confirm we don't need any new dependencies and to lock down the integration points.

---

## R1 — How shift-click is detected in FullCalendar v6

**Decision**: extend the existing `eventClick(info)` callback at `js/calendar.js:803`. Read `info.jsEvent.shiftKey`. If true → toggle the entry in the selection. If false AND the selection is non-empty → clear the selection AND fall through to the existing single-click behaviour (open the edit form). If false AND the selection is empty → unchanged from today.

**Rationale**:

- FullCalendar v6's `eventClick(info)` exposes the underlying `MouseEvent` as `info.jsEvent`, which carries `shiftKey`, `metaKey`, and `ctrlKey`. This is the standard pattern in their docs.
- Using a single callback keeps single-entry behaviour (today's path) totally unchanged in the no-shift, empty-selection case (SC-005).

**Alternatives considered**:

- **Custom click handler bound to `.fc-event`**: rejected — bypasses FullCalendar's internal event lifecycle; risks double-handling.
- **Cmd-click instead of shift-click**: rejected — spec explicitly says shift-click; and Cmd-click is reserved by browsers for "open in new tab" on links inside events (rare but possible).

---

## R2 — Where week navigation fires

**Decision**: clear the selection inside the existing `datesSet(info)` callback at `js/calendar.js:642`.

**Rationale**:

- `datesSet` fires after every view-range change (prev / next / today / view switch). FR-008 requires the selection to clear on week navigation; this callback covers all cases.
- A single line `clearSelection()` inside `datesSet` is the smallest possible change.

**Alternatives considered**:

- **Listen on the FC toolbar buttons individually**: rejected — duplicates FC's existing dispatch; would miss programmatic `calendar.changeView()` calls.

---

## R3 — How to clear selection on empty-area click

**Decision** (Plan A): add a `dateClick(info)` handler that calls `clearSelection()`. FC fires `dateClick` only for clicks on empty cells (not on events), so it is the right primitive.

**Rationale**:

- Smallest, most idiomatic FC integration.
- No risk of clobbering existing event clicks since `dateClick` only fires for empty cells.

**Fallback** (Plan B): if `dateClick` does not cover all empty regions (e.g., clicks on the all-day row chrome or scrollable padding), add a capture-phase listener on `#calendar` that ignores clicks bubbling from `.fc-event`. Implementation switches to Plan B only if Plan A leaves a gap during UAT.

**Alternatives considered**:

- **Esc key as the clear gesture**: rejected as the _primary_ mechanism (FR-007 requires empty-area click). Esc may be added as a _secondary_ convenience; deferred to Polish.

---

## R4 — Redmine API surface for batches

**Decision**: reuse `updateTimeEntry(id, {spentOn,...})` from `js/redmine-api.js:352` for moves; reuse `deleteTimeEntry(id)` from `js/redmine-api.js:377` for deletes. Issue them concurrently with `Promise.allSettled(...)` so partial failures don't block the rest of the batch (FR-010).

**Rationale**:

- Both functions already exist and are battle-tested.
- `Promise.allSettled` produces exactly the per-entry success/failure shape needed for the partial-failure report (FR-010, SC-004).
- Concurrency is bounded by `selection.size` — no rate-limiting concern at the scale of "5–10 entries selected".

**Alternatives considered**:

- **A new `bulkUpdate` Redmine endpoint**: rejected — Redmine REST API has no bulk write endpoint for time entries; would have to be invented and would not improve user-visible latency.
- **Sequential `for…of await`**: rejected — slower and offers no failure-isolation benefit over `allSettled`.

---

## R5 — Day-delta math (time-of-day preservation)

**Decision**: implement `shiftEntriesByDays(entries, delta)` as a pure function in `js/bulk-actions.js`. For each entry, take its existing `spentOn` (date) and `startTime` (HH:MM) / `endTime`, increment the date by `delta` calendar days using local-timezone semantics, and return a new entry payload with the new `spentOn` and the unchanged `startTime`/`endTime`/`hours`. Do NOT touch the time fields — Easy Redmine's `easy_time_from` / `easy_time_to` are local-clock fields, so preserving them across a date shift is correct.

**Rationale**:

- The constitution mandates UTC for storage and local-time for display; Easy Redmine's time fields are stored as local clock times associated with `spent_on` (per Constitution §"Technology Constraints"). A date shift is a date-field shift, period.
- DST boundaries are handled correctly by date arithmetic on `Date.setDate(date.getDate() + delta)`: the local clock time on the destination day is whatever it would naturally be in that local timezone.
- A unit test will pin a DST-transition scenario (e.g., shifting an 02:30 entry across the spring-forward boundary) to lock this in.

**Alternatives considered**:

- **Add `delta` minutes to the entry's UTC start**: rejected — would shift the local-clock time across DST transitions, which is exactly the wrong outcome for a "schedule rebook" operation.
- **Use a date library (date-fns / Luxon)**: rejected — adding a dependency for one date-math operation violates Principle IV (Simplicity). Plain `Date` arithmetic is sufficient.

---

## R6 — Partial-failure notification

**Decision**: reuse the existing `showError(...)` helper used elsewhere in `js/calendar.js`. The bulk-action orchestrator computes a localized summary string ("3 of 5 moved · 2 failed: …") and passes it to `showError`. Failed entry IDs remain in the selection (FR-010).

**Rationale**:

- Reusing the existing notification path keeps visual consistency and avoids inventing a new component.
- The summary is built from translated strings via `t('bulk.partialResult', { ok, fail, total })`.

**Alternatives considered**:

- **A new `Notification` toast component**: rejected as out-of-scope; would be a separate visual-redesign concern (feature 031 territory).

---

## R7 — Mobile gating

**Decision**: gate via CSS only (`@media (max-width: 767px)` hides `.bulk-toolbar` and disables the `.fc-event--selected` outline). Shift-click on touch devices is a non-issue (no shift key on a virtual keyboard), so the JS path can stay device-agnostic. SC-006 verified by Playwright at viewport 360 × 640.

**Rationale**:

- Smallest possible footprint; no `window.matchMedia` JS branching to keep in sync with the CSS breakpoint.
- A user on a touch device with a Bluetooth keyboard could theoretically still trigger shift-click; the toolbar would still be hidden by CSS, so the only visible effect is a highlighted entry that has no action surface. Documented as a known minor edge case in quickstart.md.

**Alternatives considered**:

- **JS-side `if (matchMedia.matches)` gate**: rejected — duplicates the CSS breakpoint and risks drift.

---

## R8 — i18n keys

**Decision**: add the following keys to `js/i18n.js` in EN+DE:

| Key                       | EN                                                                           | DE                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `bulk.selectionCount`     | `{count} selected`                                                           | `{count} ausgewählt`                                                                       |
| `bulk.shiftLater`         | `+1 day`                                                                     | `+1 Tag`                                                                                   |
| `bulk.shiftEarlier`       | `−1 day`                                                                     | `−1 Tag`                                                                                   |
| `bulk.delete`             | `Delete`                                                                     | `Löschen`                                                                                  |
| `bulk.confirmDeleteTitle` | `Delete entries?`                                                            | `Einträge löschen?`                                                                        |
| `bulk.confirmDeleteBody`  | `This will delete {count} time entries from Redmine. This cannot be undone.` | `Dies löscht {count} Zeiteinträge aus Redmine. Dies kann nicht rückgängig gemacht werden.` |
| `bulk.confirm`            | `Delete`                                                                     | `Löschen`                                                                                  |
| `bulk.cancel`             | `Cancel`                                                                     | `Abbrechen`                                                                                |
| `bulk.partialResult`      | `{ok} of {total} succeeded · {fail} failed`                                  | `{ok} von {total} erfolgreich · {fail} fehlgeschlagen`                                     |
| `bulk.allSucceeded`       | `All {total} entries updated`                                                | `Alle {total} Einträge aktualisiert`                                                       |
| `bulk.allFailed`          | `All {total} entries failed`                                                 | `Alle {total} Einträge fehlgeschlagen`                                                     |
| `bulk.inProgress`         | `Working…`                                                                   | `Wird ausgeführt…`                                                                         |

---

## Outcome

All Phase 0 unknowns resolved. Ready for Phase 1 design (data-model, quickstart).
