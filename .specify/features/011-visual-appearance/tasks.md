# Tasks: Visual Appearance Improvements (011)

**Input**: Design documents from `/specs/011-visual-appearance/`
**Branch**: `011-visual-appearance`

All changes are confined to `css/style.css`. No JavaScript, API, or data model changes are needed.

---

## Phase 1: Setup

No new files or dependencies — skipped.

---

## Phase 2: Foundational

No blocking prerequisites — all three user stories are independent CSS edits to `css/style.css` and can be done in any order.

---

## Phase 3: User Story 1 — Event Card Hierarchy Swap (Priority: P1) 🎯 MVP

**Goal**: Make the ticket ID and subject the visually dominant text in each event card; demote the time line to the muted style currently used by the project name.

**Independent Test**: Open the calendar with entries visible. The ticket line is bold/prominent; the time line is small and muted (matching the project name style).

- [x] T001 [US1] In `css/style.css`, update `.ev-time` to remove `font-weight: 600` and apply `font-size: 0.7rem; opacity: 0.75`, and update `.ev-issue` to add `font-weight: 600` — swapping their visual prominence (current styles: `.ev-time { font-size: 0.75rem; font-weight: 600; ... }` / `.ev-issue { font-size: 0.75rem; ... }`)

**Checkpoint**: Event cards show ticket ID/subject in bold as the dominant line; time range is small and muted; project name is unchanged.

---

## Phase 4: User Story 2 — Increased Row Height (Priority: P2)

**Goal**: Taller time slot rows so event cards have more vertical breathing room.

**Independent Test**: Each time slot row is visibly taller; a 30-minute event card shows all three lines without clipping.

- [x] T002 [US2] In `css/style.css`, change `.fc .fc-timegrid-slot { height: 20px !important; }` to `height: 24px !important`

**Checkpoint**: Calendar rows are visibly taller; full work day still fits within a reasonable scroll on a 1080p screen.

---

## Phase 5: User Story 3 — Hourly Banding (Priority: P3)

**Goal**: Alternating background shading changes every full hour instead of every 30 minutes.

**Independent Test**: Looking at the calendar grid, shaded bands span full 60-minute blocks across all day columns.

- [x] T003 [US3] In `css/style.css`, replace the existing 30-minute banding selectors (matching `data-time$=":00:00"` and `data-time$=":15:00"`) with hourly selectors matching `data-time^="00:"`, `data-time^="02:"`, `data-time^="04:"`, `data-time^="06:"`, `data-time^="08:"`, `data-time^="10:"`, `data-time^="12:"`, `data-time^="14:"`, `data-time^="16:"`, `data-time^="18:"`, `data-time^="20:"`, `data-time^="22:"` — for both `.fc-timegrid-slot-lane` and `.fc-timegrid-slot-label` selectors — keeping the same `background: rgba(0, 0, 0, 0.018)` value

**Checkpoint**: Calendar grid shows alternating shading that spans full 60-minute blocks. If hourly banding looks worse during UAT, revert to the original selectors.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T004 Run all acceptance scenarios in `specs/011-visual-appearance/quickstart.md` (T001–T009) and mark each checkbox; evaluate hourly banding and record the keep/revert decision in the quickstart regression note

---

## Dependencies & Execution Order

### Phase Dependencies

- T001, T002, T003 are all independent edits to different rules in `css/style.css` — no inter-task dependencies
- T004 (UAT) depends on T001, T002, T003

### Parallel Opportunities

T001, T002, and T003 could logically run in parallel (different CSS rules), but since they all edit the same file they should be applied sequentially to avoid conflicts.

---

## Implementation Strategy

### MVP (User Story 1 only)

1. T001 — swap ev-time / ev-issue prominence
2. **Validate**: open the calendar, confirm ticket is the dominant text
3. Continue with T002, T003 if satisfied

### Full delivery order

1. T001 — hierarchy swap (US1, highest impact)
2. T002 — row height (US2)
3. T003 — hourly banding (US3, subjective — can be reverted during UAT)
4. T004 — run quickstart.md

**Commit after each task** using message format `T00N: <description>`.
