# Quickstart & Acceptance Checklist: Visual Appearance Improvements (011)

**Prerequisites**: App is running (`npm run serve`), CORS proxy running, Redmine API key configured in Settings, at least two time entries visible on the calendar.

---

## T001 — Ticket ID and subject is the most prominent text in each event card

1. Open the calendar with at least two time entries visible.
- [x] The ticket ID and subject line appears bolder / more prominent than the time range line.
- [x] The time range line (start – end, hours) appears smaller or lighter than the ticket line.
- [x] The project name remains the least prominent line (unchanged).

---

## T002 — Time range adopts the style of the project name

1. Compare the time range line to the project name line.
- [x] The time range text appears visually similar in size and weight to the project name (small, muted).

---

## T003 — Row height is visibly increased

1. Scroll through the calendar.
- [x] Each time slot row is visibly taller than the default.
- [x] A 30-minute event card has enough vertical space to show all three lines (ticket, time, project) without clipping.

---

## T004 — Full work day fits without excessive scrolling

1. Navigate to a typical work day view.
- [x] The full 8-hour work day is visible or reachable with a small amount of scrolling (no more than 2 scroll lengths on a 1080p screen).

---

## T005 — Hourly banding alternates every full hour

1. Look at the calendar time grid background.
- [x] Alternating shaded bands span full 60-minute blocks, not 30-minute blocks.
- [x] The shading pattern is consistent across all day columns.

---

## T006 — Drag-to-move still works

1. Drag an existing time entry to a different time slot.
- [x] The entry moves correctly; no visual glitches.

---

## T007 — Drag-to-resize still works

1. Drag the bottom edge of a time entry to resize it.
- [x] The entry resizes correctly.

---

## T008 — Click-to-select and double-click-to-edit still work

1. Single-click a time entry → it is highlighted (selected).
2. Double-click a time entry → the edit modal opens.
- [x] Both interactions work as expected.

---

## T009 — New entry creation via drag still works

1. Click and drag on an empty time slot.
- [x] The new entry form opens pre-filled with the dragged time range.

---

## Regression: hourly banding — revert decision

If hourly banding looks worse than the previous 30-minute banding during UAT, it may be reverted without affecting the other improvements. Document the decision here:

- [x] Hourly banding is kept (looks better or neutral).
- [x] Hourly banding is reverted to 30-minute banding (looks worse — reverted).
