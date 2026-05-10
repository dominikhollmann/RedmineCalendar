# Implementation Plan: Bulk Multi-Select for Move and Delete

**Branch**: `028-bulk-select-move-delete` | **Date**: 2026-05-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `.specify/features/028-bulk-select-move-delete/spec.md`

## Summary

Add a transient client-side multi-selection model to the calendar with shift-click to add/remove entries from the selection. While the selection is non-empty, surface a contextual toolbar with three desktop-only actions: shift +1 day, shift −1 day, bulk delete. The toolbar dispatches one batch of per-entry Redmine writes, reports per-entry outcomes (3-of-5-style banner), and keeps failures selected for retry. Mobile (`< 768 px`) is explicitly out of scope per the spec — no toolbar, no shift-click selection.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation, no build step)
**Primary Dependencies**: FullCalendar v6 (CDN, existing); existing `js/redmine-api.js` (`updateTimeEntry`, `deleteTimeEntry`); no new deps
**Storage**: in-memory `Set<entryId>` only — no localStorage, no IndexedDB
**Testing**: Vitest (unit — selection model, day-delta math, batch-result aggregation); Playwright (UI — shift-click, toolbar, confirmation, partial-failure flow, mobile gating)
**Target Platform**: modern desktop browsers (Chrome/Firefox/Safari current); mobile gated off
**Project Type**: static SPA (single project)
**Performance Goals**: bulk-move of 5 entries completes within 3 s on a healthy connection (best-effort; bounded by Redmine round-trips); UI response within 100 ms after click. SC-001 / SC-002 timing budgets honored.
**Constraints**: must NOT regress single-entry drag/click/resize/delete (SC-005); mobile must look unchanged from today (SC-006)
**Scale/Scope**: ~3 new modules (`js/selection.js`, `js/bulk-actions.js`, `js/bulk-toolbar.js`), ~3 modified callsites in `js/calendar.js` (`eventClick`, `datesSet`, an empty-click handler), ~10 i18n keys, ~50 LOC of CSS, ~3 unit-test files, ~1 Playwright spec.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|---|---|---|
| I | Redmine API Contract | ✅ Pass | Reuses `updateTimeEntry` / `deleteTimeEntry`. No new endpoints. Per-entry errors surfaced (FR-010). |
| II | Calendar-First UX | ✅ Pass with documented escape | Mobile (`< 768 px`) is **explicitly deferred** in spec.md Assumptions per Principle II's escape clause. Desktop UX is purely additive (selection state + contextual toolbar). |
| III | Test-First | ✅ Pass | Selection model + day-delta math + batch aggregation are pure-function unit tests. UI flows (shift-click, toolbar, confirmation, partial-failure, mobile gating) covered by Playwright. TDD enforced. |
| IV | Simplicity & YAGNI | ✅ Pass | Three small new modules; no new dependencies; in-memory state only. No bulk-edit-attributes (out of scope per spec); no multi-day jumps in v1 (out of scope per spec). |
| V | Security by Default | ✅ N/A | No new credentials, no new untrusted input. Confirmation dialog uses translated strings (no innerHTML of user data). |

No violations. Complexity Tracking section remains empty.

## Project Structure

### Documentation (this feature)

```text
.specify/features/028-bulk-select-move-delete/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/                   # (empty — internal feature, no external interfaces)
└── tasks.md
```

### Source Code (repository root)

```text
js/
├── selection.js                 # NEW — pure selection model: addToSelection, removeFromSelection, toggleInSelection, clearSelection, isSelected, getSelection, onChange. In-memory Set<entryId>.
├── bulk-actions.js              # NEW — pure batching helpers: shiftEntriesByDays(entries, delta), aggregateBatchResults(results); plus a thin orchestrator runBulkMove(selection, delta, redmineApi) and runBulkDelete(selection, redmineApi). Returns BatchResult { succeeded:[], failed:[{id, error}] }.
├── bulk-toolbar.js              # NEW — DOM render of the contextual `.bulk-toolbar` element; shows when selection non-empty; hidden on `< 768 px` via CSS only (no JS branching by viewport).
├── calendar.js                  # MODIFY — eventClick: detect shift-key for multi-select; clear-on-empty-click via dateClick handler; clear-on-datesSet (week nav). Single-entry drag path unchanged.
└── i18n.js                      # MODIFY — add bulk-action labels, confirmation copy, success/partial/failure messages (EN + DE).

css/
└── style.css                    # MODIFY — `.fc-event--selected` modifier (visible outline + brightness), `.bulk-toolbar` rules, `.bulk-toolbar` hidden under `@media (max-width: 767px)`.

tests/
├── unit/
│   ├── selection.test.js        # NEW — Vitest: add/remove/toggle/clear, observer fires on change, dedup
│   ├── bulk-actions.test.js     # NEW — Vitest: shiftEntriesByDays preserves time-of-day across DST boundaries, aggregateBatchResults groups successes/failures correctly
│   └── bulk-orchestrator.test.js # NEW — Vitest: runBulkMove / runBulkDelete with mocked redmineApi (success, partial failure, all failure, network drop mid-batch)
└── ui/
    └── bulk-actions.spec.js     # NEW — Playwright: shift-click selection visible, toolbar appears, +1 day moves all, delete shows confirmation with count, cancel preserves, partial failure reported, mobile (< 768 px) shows nothing
```

**Structure Decision**: Single-project SPA, three small new modules. Pure-logic modules (`selection.js`, `bulk-actions.js`) have zero DOM/Redmine dependencies → trivially unit-testable. `bulk-toolbar.js` is the only file holding DOM glue.

## Phase 0 Output → research.md

Resolves the touch-points needed for design:
1. Where shift-click is detected in FullCalendar v6 (`eventClick(info)` at `js/calendar.js:803`; `info.jsEvent.shiftKey` is the standard signal).
2. Where week navigation fires (`datesSet(info)` at `js/calendar.js:642`).
3. How an empty-area click can clear selection (FullCalendar's `dateClick` already fires for empty cells; preferred over a capture-phase listener).
4. The existing Redmine API contract: `updateTimeEntry(id, {spentOn,…})` and `deleteTimeEntry(id)` already exist (`js/redmine-api.js:352`, `:377`); both are reused unchanged.
5. The existing notification surface (`showError` and any toast helper) — bulk reports use the same path.

## Phase 1 Output → data-model.md, quickstart.md, contracts/

- **data-model.md**: documents `Selection` (transient `Set<entryId>`) and `BatchResult { succeeded, failed }`. No persistent storage.
- **quickstart.md**: step-by-step UAT covering both user stories + all edge cases.
- **contracts/**: empty directory with a README explaining "no external interfaces — internal calendar interaction".

## Post-clarification design correction (added 2026-05-10)

The original plan was written assuming **single-click opens the edit form**. Code inspection of `js/calendar.js:803–836` and a user clarification both confirmed that is **wrong**. The current behaviour, in place since feature 004, is:

- **Single click** on an entry → `selectEntry(info.event)` — sets the singleton `_selectedEvent` (used by copy-paste, Enter-to-edit, Delete-to-delete keyboard shortcuts).
- **Double click** (or single tap on mobile) → `openForm(...)` — the edit modal.
- **Empty cell click** → `deselectEntry()` — clears the singleton.
- Clicking a different entry replaces the singleton (`if (_selectedEvent && _selectedEvent !== fcEvent) deselectEntry()` then `_selectedEvent = fcEvent`).

This feature must therefore **integrate with — not replace** that machinery:

- The new `Selection` model in `js/selection.js` is a **generalisation** of `_selectedEvent` from a singleton to a `Set<entryId>`. The existing `selectEntry` / `deselectEntry` helpers either delegate to the new module or get re-implemented in terms of it. Either way, the existing single-click and copy-paste flows continue to operate identically when `selection.size === 1`.
- **Plain single-click** semantics stay as-is: replace the selection with the clicked entry (singleton). This preserves the copy-paste flow.
- **Shift-click** semantics: **add or remove** the clicked entry from the existing selection. Does **not** clear other selected entries. This is the only new gesture this feature introduces.
- **Double-click** (and mobile tap): unchanged — opens the edit form. With a multi-selection active, double-click on any entry opens THAT entry's form; the multi-selection clears as part of opening the form (consistent with the existing single-entry edit flow's call to `deselectEntry()` at `js/calendar.js:813`).
- **Empty-cell click**: existing `deselectEntry()` extended to clear the full multi-selection.
- **Keyboard shortcuts integration**:
  - `Ctrl+C`, `Enter` → fire only when `selection.size === 1`. Behaviour unchanged.
  - `Delete` → if `selection.size === 1`: existing single-delete flow (already has its own confirm in the form). If `selection.size > 1`: route to the bulk-delete confirm flow from US2 (FR-005's confirmation dialog).

The toolbar (`js/bulk-toolbar.js`) appears only when `selection.size >= 2` — when only one entry is selected, the existing per-entry interactions are sufficient and the toolbar would be visual noise.

This correction supersedes the original Open Questions Q3 and Q4.

## Open Questions

(Per user instruction: collected here rather than asked interactively.)

1. **Empty-click clearing mechanism**: Two reasonable options — (a) FullCalendar's `dateClick` handler (already fires for empty time slots), or (b) a capture-phase listener on `#calendar` that ignores clicks bubbling from `.fc-event`. Plan A (dateClick) is simpler and is the default. Resolved during implementation if Plan A misses any cases (e.g., clicks on the all-day row chrome).
2. **Notification style for partial-failure report**: Reuse the existing `showError` / toast helper used in `js/calendar.js`. The exact path is determined during implementation by reading the existing call sites; no new notification component is introduced.
3. ~~Shift-click on an already-selected entry~~ → **resolved by the post-clarification correction above**: shift-click toggles add/remove from the multi-selection.
4. ~~Single-click without shift on a selected entry~~ → **resolved by the post-clarification correction above**: single-click is already select/deselect (singleton replacement); double-click opens the form.

## Complexity Tracking

*No Constitution violations — no entries.*
