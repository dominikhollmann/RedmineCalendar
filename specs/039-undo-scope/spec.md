# Feature Specification: Undo for Time-Entry Changes

**Feature Branch**: `039-undo-scope`

**Created**: 2026-06-12

**Status**: Draft

**Input**: User description: "Undo all actions that change data on Redmine (add, delete, edit, move, bulk-delete, copy-paste overwrite). Out of scope: settings, AI chat. Applies to both the classic calendar view and the planning view. No toast feedback informing the user that undo is available. No delays before saving changes to Redmine."

## Core Principle

**Every write operation the app performs on Redmine can be reversed.**

Whenever the app creates, updates, or deletes a time entry on the server, that change is undoable via Ctrl+Z. There are no exceptions within the time-entry domain. The mental model is simple: if the app wrote something to Redmine, the user can take it back.

The only explicit exclusions are operations that do not touch Redmine data: settings changes and AI chat.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Undo Deleted Entry (Priority: P1)

A user accidentally deletes a time entry by clicking the delete button. By pressing Ctrl+Z the entry is immediately re-created on Redmine and reappears in the calendar with all its original field values.

**Why this priority**: Deletion is the most destructive single-entry action and has no other recovery path. Manual reconstruction requires the user to recall all field values from memory.

**Independent Test**: Delete a single time entry, press Ctrl+Z, verify the entry reappears with all original data (date, hours, activity, issue, comment) intact.

**Acceptance Scenarios**:

1. **Given** a time entry is visible on the calendar, **When** the user deletes it and then presses Ctrl+Z, **Then** the entry reappears on the calendar with all original field values restored.
2. **Given** the undo stack contains a delete action, **When** the entry has already been deleted by another session on the server, **Then** the app shows an error message and the calendar remains unchanged.
3. **Given** the undo stack is empty, **When** the user presses Ctrl+Z, **Then** nothing happens.

---

### User Story 2 — Undo Entry Edit (Priority: P2)

A user modifies a time entry via the form (changes hours, date, activity, issue, or comment) and submits. By pressing Ctrl+Z the entry is immediately reverted to its state before the edit.

**Why this priority**: Edits are the most frequent data-changing operation. An accidental value change (e.g., wrong hours) silently skews time reports.

**Independent Test**: Edit a time entry, change at least one field, submit the form, press Ctrl+Z, verify the entry reverts to its prior field values on the calendar.

**Acceptance Scenarios**:

1. **Given** a time entry has been edited via the form, **When** the user presses Ctrl+Z, **Then** the entry on the calendar reflects the field values from before the edit.
2. **Given** the undo stack has multiple entries from consecutive edits, **When** the user presses Ctrl+Z multiple times, **Then** each keypress reverses the corresponding prior action in last-in-first-out order.

---

### User Story 3 — Undo Drag-and-Drop Move / Resize (Priority: P3)

A user drags a time entry to the wrong date or time slot, or resizes it to the wrong duration. By pressing Ctrl+Z the entry returns to its original date, time, and duration.

**Why this priority**: Drag-and-drop is the primary cause of accidental date/time changes due to the close proximity of calendar slots.

**Independent Test**: Drag a time entry to a different date, press Ctrl+Z, verify the entry returns to the original date and time.

**Acceptance Scenarios**:

1. **Given** a time entry has been dragged to a new date/time slot, **When** the user presses Ctrl+Z, **Then** the entry returns to its original date, time, and duration on the calendar.
2. **Given** a time entry has been resized, **When** the user presses Ctrl+Z, **Then** the entry's duration reverts to its value before the resize.

---

### User Story 4 — Undo Add (New Entry) (Priority: P4)

A user creates a new time entry via the entry form and then realises it was a mistake (wrong date, wrong issue, or entirely unintended). By pressing Ctrl+Z the newly created entry is immediately deleted from Redmine and disappears from the view.

**Why this priority**: Creating an entry is easily undone manually (the user can simply delete it), so this is lower priority than delete or edit. However it completes the full symmetry of the undo system — every data-changing action is reversible.

**Independent Test**: Create a new time entry via the form, press Ctrl+Z, verify the entry disappears from the view.

**Acceptance Scenarios**:

1. **Given** a new time entry has just been created, **When** the user presses Ctrl+Z, **Then** the entry is deleted from Redmine and disappears from the current view.
2. **Given** the newly created entry has been modified by another session server-side before the undo, **When** the user presses Ctrl+Z, **Then** the app shows an error message and the entry remains visible.

---

### User Story 5 — Undo Bulk Operations (Delete / Move) (Priority: P5)

A user bulk-selects multiple time entries and either deletes them all or moves them to a new date in one operation. By pressing Ctrl+Z once, all affected entries are fully restored (re-created for bulk delete, moved back for bulk move) as a single undo step.

**Why this priority**: Bulk operations touch many entries at once; individual manual recovery would be impractical.

**Independent Test**: Bulk-select and delete at least three entries, press Ctrl+Z once, verify all three reappear. Separately, bulk-move at least three entries to a different date, press Ctrl+Z, verify all three return to their original date.

**Acceptance Scenarios**:

1. **Given** multiple entries have been bulk-deleted, **When** the user presses Ctrl+Z, **Then** all entries from that operation are restored in a single step.
2. **Given** multiple entries have been bulk-moved to a new date, **When** the user presses Ctrl+Z, **Then** all entries return to the date they had before the move in a single step.
3. **Given** a bulk-operation undo is in progress and one entry fails to restore server-side, **Then** the app shows an error message for each failed entry and continues processing the remaining entries.

---

### User Story 6 — Undo Copy-Paste Overwrite (Priority: P6)

A user pastes a copied time entry onto an existing entry, overwriting it. By pressing Ctrl+Z the overwritten entry's original values are restored.

**Why this priority**: Copy-paste overwrite permanently replaces an existing entry's data; without undo the original values are lost.

**Independent Test**: Copy a time entry, paste it onto an existing entry, press Ctrl+Z, verify the previously overwritten entry returns to its prior state.

**Acceptance Scenarios**:

1. **Given** a time entry has been overwritten by a paste operation, **When** the user presses Ctrl+Z, **Then** the entry reverts to the state it had before the paste.

---

### User Story 7 — Redo (Priority: P7)

After undoing one or more actions, a user presses Ctrl+Shift+Z (or Ctrl+Y) to reapply the action that was most recently undone.

**Why this priority**: Redo is the natural complement to undo; without it an accidental Ctrl+Z forces the user to manually redo the action.

**Independent Test**: Perform an edit, press Ctrl+Z to undo it, press Ctrl+Shift+Z to redo it, verify the edit is reapplied on the calendar and in Redmine.

**Acceptance Scenarios**:

1. **Given** an action has been undone, **When** the user presses Ctrl+Shift+Z or Ctrl+Y, **Then** the previously undone action is reapplied on the calendar and persisted to Redmine.
2. **Given** the redo stack is empty, **When** the user presses Ctrl+Shift+Z, **Then** nothing happens.
3. **Given** the user undoes an action and then performs a new data-changing action, **When** the user presses Ctrl+Shift+Z, **Then** nothing happens (the new action clears the redo stack).

---

### Edge Cases

- What happens when the undo stack reaches its depth limit? → The oldest entry is silently dropped; the user can still undo the most recent actions up to the limit.
- What happens if Ctrl+Z is pressed while a form input or textarea is focused? → The shortcut is ignored; the browser's native text-field undo is unaffected.
- What happens if undo fails server-side (e.g., entry no longer exists or network error)? → An error message is shown; the local calendar state is not changed.
- What happens on page reload? → The undo and redo stacks are cleared; history does not persist across sessions.
- What if a new data-changing action is performed after undoing? → The redo stack is cleared before the new action is pushed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST undo the most recent data-changing action when the user presses Ctrl+Z (Cmd+Z on macOS), provided no text input or textarea is focused.
- **FR-002**: The app MUST redo the most recently undone action when the user presses Ctrl+Shift+Z or Ctrl+Y, provided no text input or textarea is focused.
- **FR-003**: Every write operation the app performs on Redmine MUST be undoable. This includes, but is not limited to: add (create new entry), single-entry delete, bulk delete, bulk move, drag-and-drop move or resize, form-submitted edit, and copy-paste overwrite.
- **FR-004**: The undo/redo system MUST operate across both the classic calendar view and the planning view; actions performed in either view are placed on the same shared undo stack within a browser tab session.
- **FR-005**: Settings changes and AI chat actions MUST NOT be placed on the undo stack.
- **FR-006**: The undo and redo history MUST be held in memory only and MUST reset on page reload.
- **FR-007**: The undo stack depth MUST be capped at approximately 20 entries; when the limit is reached the oldest entry is silently discarded.
- **FR-008**: Every data-changing action MUST be committed to the server immediately — no delay or confirmation window is introduced before the server call.
- **FR-009**: When an undo or redo operation fails server-side, the app MUST display an error message and leave the calendar in its current state.
- **FR-010**: A bulk-delete MUST be recorded as a single undo step, restoring all deleted entries in one Ctrl+Z press.
- **FR-011**: Performing a new data-changing action after undoing MUST clear the redo stack.
- **FR-012**: The app MUST NOT display any notification informing the user that undo is available (no "Ctrl+Z to undo" messages after any action).

### Key Entities

- **Undo Stack**: An ordered, in-memory list of reversible action snapshots capped at ~20 entries, containing enough data to reconstruct the prior Redmine server state for each action (full entry payload for deletes; before-and-after field snapshots for edits, moves, and paste-overwrites).
- **Redo Stack**: A complementary in-memory list of undone action snapshots that can be reapplied; cleared whenever a new action is pushed onto the undo stack.
- **Reversible Action**: A snapshot capturing the action type (add / delete / edit / move / resize / bulk-delete / bulk-move / paste-overwrite) and all field values needed to invert the action on the Redmine server.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After any in-scope data-changing action, a single Ctrl+Z fully restores the prior state on the calendar without any additional user steps.
- **SC-002**: The undo history retains at least the 20 most recent data-changing actions within a single page session.
- **SC-003**: Pressing Ctrl+Z while a form text field is focused has no effect on the undo stack or the calendar.
- **SC-004**: Undo and redo operations complete and the calendar reflects the result within 2 seconds under normal network conditions.
- **SC-005**: When a server-side conflict prevents undo, the user receives an informative error message within 2 seconds and no silent data corruption occurs.
- **SC-006**: No action of any kind causes a "Ctrl+Z to undo" or equivalent notification to appear.

## Assumptions

- Mobile support is out of scope for this feature; keyboard shortcuts are desktop-only.
- The undo stack is per browser tab; two open tabs share the same Redmine session but have independent undo histories.
- Undo of a bulk-delete attempts to restore all entries; partial failure (some succeed, some fail) surfaces individual error messages for the failed entries only.
- The feature integrates with the existing bulk-delete (feature 028) and copy-paste (feature 004) implementations, which are already shipped.
- The undo stack is shared between the classic calendar view and the planning view (feature 038) within the same browser tab session; navigating between views does not reset the stack.
- No new Redmine API capabilities are required; existing create, update, and delete endpoints are sufficient to implement undo and redo for all action types including add.
