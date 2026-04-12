# Quickstart & Acceptance Checklist: Copy and Paste Time Entries (004)

**Prerequisites**: App is running (`npm run serve`), CORS proxy running, Redmine API key configured in Settings, at least two days visible on the calendar, at least one existing time entry visible.

---

## T001 — Single-click selects an entry (no modal)

1. Single-click any time entry on the calendar.
- [ ] The entry is visually highlighted (selected style — e.g. distinct border or background).
- [ ] No modal or form opens.
- [ ] All other entries appear unselected.

---

## T002 — Double-click opens the edit modal

1. Single-click a time entry to select it.
2. Double-click the same entry.
- [ ] The edit modal opens for that entry.
- [ ] The ticket, time, and duration fields are pre-filled with the entry's data.

---

## T003 — Enter key opens the edit modal for the selected entry

1. Single-click a time entry to select it.
2. Press Enter.
- [ ] The edit modal opens for that entry (same as double-click).

---

## T004 — Clicking outside an entry deselects it

1. Single-click a time entry to select it.
2. Click on an empty area of the calendar (not on any entry).
- [ ] The entry is deselected (no highlight).

---

## T005 — Escape deselects the selected entry

1. Single-click a time entry to select it.
2. Press Escape.
- [ ] The entry is deselected.

---

## T006 — Ctrl+C copies the selected entry; clipboard banner appears

1. Single-click a time entry to select it.
2. Press Ctrl+C (or Cmd+C on Mac).
- [ ] A clipboard banner appears (e.g. "📋 #42 Ticket Title — click any slot to paste").
- [ ] The banner includes an ✕ button to clear the clipboard.

---

## T007 — Clipboard persists across week navigation

1. Copy an entry (T006).
2. Navigate to the next or previous week using the calendar toolbar.
- [ ] The clipboard banner remains visible.
- [ ] The copied entry details are still shown in the banner.

---

## T008 — Paste: click on empty slot with active clipboard

1. Copy an entry (T006).
2. Click on an empty time slot on a different day.
- [ ] The new entry form opens.
- [ ] The form is pre-filled with the copied ticket (search field shows `#<id> <subject>`).
- [ ] The save button is enabled immediately (no need to search for a ticket).
- [ ] The delete button is not shown (this is a new entry).
3. Click Save.
- [ ] A new time entry is created in Redmine on the target date.
- [ ] The calendar refreshes and the pasted entry appears on the target day.

---

## T009 — Paste: drag on empty slot with active clipboard

1. Copy an entry (T006).
2. Click and drag on an empty time range on a different day.
- [ ] The new entry form opens pre-filled with the copied ticket.
- [ ] The time range reflects the dragged slot.
3. Click Save.
- [ ] A new time entry is created on the target date with the dragged time range.

---

## T010 — Paste carries correct fields

1. Copy an entry that has: a specific ticket, a comment, and a start time.
2. Paste onto a different day slot (T008 or T009).
3. Save.
4. Verify the created entry in Redmine (via the app or Redmine directly).
- [ ] Ticket ID matches the original.
- [ ] Comment matches the original.
- [ ] Activity matches the original.
- [ ] Start time matches the original (from the clipboard, not the slot time, unless overridden by the form).

---

## T011 — Clipboard not active: slot click opens empty form

1. Ensure no clipboard is active (page reload, or clear via ✕ if present).
2. Click on an empty time slot.
- [ ] The new entry form opens empty (no pre-filled ticket).
- [ ] Behaviour is identical to pre-004 (no regression).

---

## T012 — Copy replaces previous clipboard

1. Copy entry A (T006) — banner shows entry A.
2. Single-click a different entry B.
3. Press Ctrl+C.
- [ ] The banner updates to show entry B.
- [ ] Pasting now creates an entry based on B, not A.

---

## T013 — ✕ button clears the clipboard

1. Copy an entry (T006).
2. Click the ✕ button on the clipboard banner.
- [ ] The clipboard banner disappears.
- [ ] Clicking an empty slot now opens the empty form (no paste, no regression).

---

## T014 — Copy to same day (duplicate)

1. Copy an entry.
2. Click an empty slot on the same day as the original entry.
3. Save.
- [ ] A new duplicate entry appears on the same day.

---

## T015 — Midnight-continuation segments cannot be selected or copied

1. Create or identify a time entry that crosses midnight (has a continuation segment shown on the next day).
2. Single-click the continuation segment (the grayed-out portion on the next day).
- [ ] The segment is not selectable / not highlighted.
- [ ] No clipboard action occurs if Ctrl+C is pressed.

---

## Regression checks

- [ ] Drag-to-move an existing entry still works (no regressions from selection state changes).
- [ ] Drag-to-resize an existing entry still works.
- [ ] Creating a new entry via drag on an empty slot (no clipboard) still works.
- [ ] Editing an entry via double-click still saves correctly.
- [ ] Deleting an entry via the edit modal still works.
- [ ] Week totals and day totals update correctly after paste.
