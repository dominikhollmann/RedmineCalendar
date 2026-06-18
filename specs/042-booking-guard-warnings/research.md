# Research: Booking Guard Warnings (042)

## Decision 1 — Dialog pattern

**Decision**: Reuse `showConfirmDialog` from `js/confirm-dialog.js` (same module used by the closed-ticket gate and eventDrop guard).

**Rationale**: Identical modal, button layout, focus trap, and keyboard handling. Spec FR-004 requires visual parity with feature 040; reuse makes that trivially true.

**Alternatives considered**: Custom dialog element — rejected, unnecessary duplication.

---

## Decision 2 — New module `js/booking-guard.js`

**Decision**: Extract all guard logic (deadline computation, condition checks, dialog invocation) into a new pure module `js/booking-guard.js` with no DOM dependencies in its logic layer.

**Rationale**:

- FR-014 requires independent unit tests for future-date detection and deadline calculation. A pure module makes this straightforward with Vitest — no DOM mocking needed for the logic functions.
- The guard must be called from three call sites (`time-entry-form.js`, `calendar.js`, `entry-commands.js`); a shared module avoids duplicating the dialog invocation pattern.
- Keeps each integration site to a ~5-line change.

**Alternatives considered**: Inline the guard in `time-entry-form.js` only — rejected, doesn't cover eventDrop or bulk-delete paths.

---

## Decision 3 — null startTime defaults to 00:00

**Decision**: When `entry.startTime` is null, treat the entry's start datetime as midnight (00:00) on its date for deadline comparisons.

**Rationale**: An entry dated Friday with no explicit clock time is unambiguously within the Friday reported period (midnight ≤ 22:00). Defaulting to 00:00 is the most conservative safe choice — it never silently skips a warning it should have shown.

**Alternatives considered**: Treat null-startTime entries as always-exempt — rejected, they are common and should definitely be guarded.

---

## Decision 4 — Deadline moment computation

**Decision**: The "most recent deadline moment" is computed client-side as the latest past occurrence of `dayOfWeek` at `hour:minute` before `Date.now()`. Computed fresh on each guard invocation (no caching needed — called only on user action).

**Algorithm**:

1. Start from today at `hour:minute:00`.
2. Step back by `(today.getDay() - dayOfWeek + 7) % 7` days.
3. If the result is still ≥ `now` (we haven't passed today's cutoff yet), subtract 7 more days.

**Rationale**: Correct for all days of the week including the cutoff day itself. Simple, no external dependencies.

---

## Decision 5 — Exemption check

**Decision**: Read `holidayTicket` and `vacationTicket` from the already-loaded `CentralConfig` (via `getCentralConfigSync()`). No new config keys needed.

**Rationale**: `CentralConfig` already carries these fields; `getCentralConfigSync()` is synchronous, keeping guard logic simple. Exemption only applies to the future-date warning (not the deadline warning — a vacation entry submitted late still affects the report).

---

## Decision 6 — Bulk delete guard

**Decision**: For bulk delete via `entry-commands.js`, run a single deadline check before the batch: trigger if **any** selected entry has `originalStart ≤ deadline`. Show one dialog covering all affected entries.

**Rationale**: One dialog per entry for a bulk operation is disruptive. A single grouped warning is consistent with the "one confirm for the batch" pattern already used for the delete confirm overlay.

---

## Decision 7 — Guard ordering (create/edit)

**Decision**: Future-date guard runs first; if the user confirms, deadline guard runs next. Both rejections return false without saving.

**Rationale**: Spec FR-010. Future-date is the more common error; resolving it first lets the user fix the date (cancel → change date) before the deadline check fires.

---

## Decision 8 — eventResize deadline check

**Decision**: `eventResize` changes only the duration; the start position doesn't move. Apply the deadline guard as a simple "original start ≤ deadline" check (equivalent to create/delete: a single start position).

**Rationale**: Resizing an entry in the reported period changes the hours on record, which would make a resubmitted report differ.
