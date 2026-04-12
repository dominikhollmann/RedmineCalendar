# Data Model: Copy and Paste Time Entries (004)

All state for this feature is transient (in-memory, module-level in `calendar.js`). No new persistent storage keys are introduced.

---

## Entity 1: SelectedEvent

**Description**: The currently selected FullCalendar event (at most one at a time). Selecting an event does not open any form; it only updates visual state.

**Storage**: Module-level variable in `js/calendar.js`

```js
let _selectedEvent = null; // FullCalendar Event object | null
```

**State transitions**:

```
null ──[single-click event]──▶ Event selected
                                   │
              ┌────────────────────┤
              ▼                    ▼
        [single-click         [click outside /
         different event]      Escape / double-click
              │                 opens modal]
              ▼                    ▼
       previous deselected        null
       new event selected
```

**Visual indicator**: CSS class `fc-event--selected` applied via `event.setProp('classNames', [...])`.

**Constraints**:
- Midnight-continuation segments (`_isMidnightContinuation: true`) cannot be selected.
- Selecting a new event automatically deselects the previous one.

---

## Entity 2: Clipboard

**Description**: In-memory snapshot of a copied time entry. Holds all fields needed to recreate the entry on a different date.

**Storage**: Module-level variable in `js/calendar.js`

```js
let _clipboard = null;
// When set:
// {
//   issueId:      number,
//   issueSubject: string,
//   projectName:  string,
//   activityId:   number | null,
//   hours:        number,
//   comment:      string,
//   startTime:    string | null,  // 'HH:MM' or null
// }
```

**Lifecycle**:
- Set: `Ctrl+C` / `Cmd+C` with a selected event → clipboard is populated (overwrites any previous clipboard)
- Used: clicking/dragging an empty calendar slot → form opens pre-filled with clipboard data
- Cleared: explicit `✕` on the clipboard banner; page reload (in-memory only)
- Not cleared by: week navigation, window resize, form cancel, paste (clipboard persists for multiple pastes)

**Constraints**:
- Midnight-continuation segments cannot be copied.
- `startTime` is always carried verbatim from the source entry; the target slot's time range overrides the form's time inputs.

---

## openForm Prefill Extension

The `openForm(entry, prefill, onSave, onDelete)` signature in `js/time-entry-form.js` is extended. The `prefill` object gains optional clipboard fields:

```js
// Existing fields (unchanged):
prefill.date       // string 'YYYY-MM-DD'
prefill.startTime  // string 'HH:MM' | null
prefill.hours      // number

// New fields (present only when pasting from clipboard):
prefill.issueId      // number  — pre-selects issue in form
prefill.issueSubject // string  — displayed in search field
prefill.projectName  // string  — displayed below ticket title
prefill.activityId   // number | null — used silently in createTimeEntry
prefill.comment      // string  — used silently in createTimeEntry
```

When `prefill.issueId` is set and `entry` is `null`:
- Search field is pre-filled with `#<id> <subject>`
- Save button is enabled immediately
- Delete button is hidden (this is a create, not edit)
- `activityId` and `comment` bypass the default-activity lookup and empty-comment default respectively
