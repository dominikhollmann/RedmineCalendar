# UAT Quickstart: Undo for Time-Entry Changes

## Prerequisites

- Dev server running (`npm run dev`)
- At least 3 existing time entries visible in the current week
- Classic calendar view active

---

## Scenario 1 — Undo single delete (US1)

- [x] Note a time entry's date, hours, and issue. Delete it via the delete button in the form. Verify it disappears from the calendar.
- [x] Press Ctrl+Z. Verify the calendar navigates to the deleted entry's date (if not already there) and the entry reappears with all original field values.
- [ ] Verify a brief flash highlight appears on the restored entry.
- [ ] Verify a success toast appears (e.g. "Undo: entry restored") and auto-dismisses.
- [ ] Verify no "Ctrl+Z to undo" or similar notification appeared after the original delete.

---

## Scenario 2 — Undo form edit (US2)

- [ ] Double-click a time entry to open the edit form. Change the hours field. Save.
- [ ] Press Ctrl+Z. Verify the entry's hours revert to the original value on the calendar.
- [ ] Verify the flash highlight appears on the reverted entry.
- [ ] Verify a success toast appears ("Undo: edit reversed").

---

## Scenario 3 — Undo drag-and-drop move (US3)

- [ ] Drag a time entry to a different date in the same week. Confirm it appears on the new date.
- [ ] Press Ctrl+Z. Verify the entry moves back to the original date.
- [ ] Verify the flash highlight appears at the original position.
- [ ] Verify a success toast appears ("Undo: move reversed").

---

## Scenario 4 — Undo add / new entry (US4)

- [ ] Create a new time entry via the form. Note its date and confirm it appears on the calendar.
- [ ] Press Ctrl+Z. Verify the calendar navigates to that date (if not already there).
- [ ] Verify the entry is briefly red-tinted / faded before disappearing (the short delay + animation).
- [ ] Verify the entry disappears from the calendar.
- [ ] Verify a success toast appears ("Undo: new entry removed").

---

## Scenario 5 — Undo bulk delete (US5)

- [ ] Shift-click to select at least 3 entries. Press the Delete key and confirm the bulk delete dialog. Verify all 3 disappear.
- [ ] Press Ctrl+Z once. Verify all 3 entries reappear in a single step.
- [ ] Verify a success toast mentions the count ("Undo: 3 entries restored").

---

## Scenario 6 — Undo copy-paste (US6)

- [ ] Copy a time entry (Ctrl+C on a selected entry). Paste it on a new date slot. Verify a new entry appears.
- [ ] Press Ctrl+Z. Verify the pasted entry is removed.
- [ ] Verify a success toast appears ("Undo: pasted entry removed").

---

## Scenario 7 — Redo (US7)

- [ ] Perform an edit. Press Ctrl+Z to undo it. Verify the revert. Then press Ctrl+Shift+Z.
- [ ] Verify the edit is reapplied on the calendar.
- [ ] Verify a success toast appears ("Redo: edit re-applied").
- [ ] Perform another new action after undoing. Press Ctrl+Shift+Z. Verify nothing happens (redo stack was cleared).

---

## Scenario 8 — Keyboard guard: no undo while typing (SC-003)

- [ ] Open the time entry form. While a text input (e.g. the comment field) is focused, press Ctrl+Z.
- [ ] Verify the browser's native text-field undo fires (if there is typed text to undo) — but the app's undo stack is NOT consumed (the calendar is unchanged after closing the form).

---

## Scenario 9 — Weekend navigation (FR-014)

- [ ] Set the calendar to Mon–Fri mode (workweek). Create or confirm an entry exists on a Saturday (use full-week mode to create it, then switch back to Mon–Fri).
- [ ] With Mon–Fri active, delete the Saturday entry and press Ctrl+Z.
- [ ] Verify the calendar automatically switches to full-week view and navigates to the Saturday date.
- [ ] Verify the entry is restored. Verify the calendar stays in full-week mode (does not switch back).

---

## Scenario 10 — Planning view undo (FR-004)

- [ ] Switch to the Planning View. Drag an Outlook event onto a time slot to create a new booking.
- [ ] Press Ctrl+Z. Verify the created entry disappears from the Planning View.
- [ ] Switch back to the Classic Calendar on the same date. Verify the entry is absent there too.

---

## Scenario 11 — Stack depth limit (FR-007)

- [ ] Perform 22 consecutive data-changing actions (deletes are easiest — delete 22 entries one by one).
- [ ] Press Ctrl+Z 20 times. Verify all 20 reversals succeed.
- [ ] Press Ctrl+Z a 21st and 22nd time. Verify nothing happens (stack is empty; the two oldest actions were silently evicted).
