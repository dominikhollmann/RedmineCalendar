# Data Model: Undo for Time-Entry Changes

## Storage

**In-memory only.** No localStorage, no IndexedDB, no cookies. Both stacks are plain arrays held in `js/undo-manager.js` module scope. They reset on page reload.

---

## UndoableAction

The discriminated union stored in the undo and redo stacks.

```
UndoableAction =
  | AddAction
  | PasteAction
  | DeleteAction
  | EditAction
  | MoveAction
  | ResizeAction
  | BulkDeleteAction
  | BulkMoveAction   ← ready for when bulk move ships
```

### AddAction / PasteAction

Produced by: `time-entry-form.js` (new entry saved via form), `planning-view.js` (Outlook-drag booking).

```
{
  type: 'add' | 'paste'
  entry: TimeEntry          // full entry as returned by createTimeEntry — including the new server-assigned ID
}
```

Undo inversion: `deleteTimeEntry(entry.id)`
Redo inversion: `createTimeEntry(entry)` → update `entry.id` with the new ID from the response

### DeleteAction

Produced by: `time-entry-form.js` (delete button in form), `entry-commands.js` (keyboard Delete, single entry).

```
{
  type: 'delete'
  entry: TimeEntry          // full entry snapshot captured before the delete call
}
```

Undo inversion: `createTimeEntry(entry)` → update `entry.id` with the new ID
Redo inversion: `deleteTimeEntry(entry.id)`

### EditAction

Produced by: `time-entry-form.js` when `_currentEntry` is set (update path).

```
{
  type: 'edit'
  id:     number            // Redmine entry ID
  before: EntryFields       // full field snapshot before the edit
  after:  EntryFields       // full field snapshot as submitted
}
```

Undo inversion: `updateTimeEntry(id, before)`
Redo inversion: `updateTimeEntry(id, after)`

### MoveAction

Produced by: `calendar.js` (`eventDrop`), `planning-view-bookings.js` (`_onEventDrop`).

```
{
  type: 'move'
  id:     number
  entry:  TimeEntry         // full entry snapshot (for calendar update after undo)
  before: PositionFields    // { spentOn, startTime, endTime, hours }
  after:  PositionFields
}
```

Undo inversion: `updateTimeEntry(id, before)`
Redo inversion: `updateTimeEntry(id, after)`

### ResizeAction

Produced by: `calendar.js` (`eventResize`), `planning-view-bookings.js` (`_onEventResize`).

```
{
  type: 'resize'
  id:     number
  entry:  TimeEntry
  before: PositionFields
  after:  PositionFields
}
```

Undo inversion: `updateTimeEntry(id, before)`
Redo inversion: `updateTimeEntry(id, after)`

### BulkDeleteAction

Produced by: `entry-commands.js` (keyboard Delete with multi-selection).

```
{
  type: 'bulk-delete'
  entries: TimeEntry[]      // full snapshots of all deleted entries
}
```

Undo inversion: `Promise.all(entries.map(e => createTimeEntry(e)))` — update each `e.id` on success
Redo inversion: `Promise.all(entries.map(e => deleteTimeEntry(e.id)))`
Single undo step: yes — one Ctrl+Z restores all entries.

### BulkMoveAction (reserved — bulk move not yet shipped)

```
{
  type: 'bulk-move'
  moves: Array<{ id: number; entry: TimeEntry; before: PositionFields; after: PositionFields }>
}
```

Stub is defined in `undo-manager.js`; no call site instruments it yet. A `// TODO(undo): push bulk-move action here` comment in `entry-commands.js` marks where instrumentation should be added when bulk move ships.

---

## EntryFields

Fields captured for edit before/after snapshots.

```
{
  issueId:    number | null
  spentOn:    string          // YYYY-MM-DD
  hours:      number
  activityId: number | null
  comment:    string
  startTime:  string | null   // HH:MM
  endTime:    string | null   // HH:MM
}
```

## PositionFields

Subset of EntryFields relevant to move/resize.

```
{
  spentOn:   string           // YYYY-MM-DD
  startTime: string | null
  endTime:   string | null
  hours:     number
}
```

---

## UndoManager (interface)

Exported from `js/undo-manager.js` as a singleton object.

| Function | Signature | Description |
|---|---|---|
| `push(action)` | `(UndoableAction) → void` | Push action; clear redo stack; evict oldest if cap reached |
| `undo()` | `() → UndoableAction \| null` | Pop from undo stack, push to redo; null if empty |
| `redo()` | `() → UndoableAction \| null` | Pop from redo stack, push to undo; null if empty |
| `canUndo()` | `() → boolean` | True when undo stack is non-empty |
| `canRedo()` | `() → boolean` | True when redo stack is non-empty |
| `clear()` | `() → void` | Empty both stacks (for testing) |

Stack depth cap: `UNDO_STACK_MAX = 20` (exported constant for tests).

---

## Custom DOM events (undo:*)

Dispatched on `document` by `undo-actions.js`. Listeners in `calendar.js` and `planning-view-bookings.js` / `planning-view.js` respond independently based on which view is active.

| Event name | `detail` shape | Purpose |
|---|---|---|
| `undo:navigate` | `{ date: string }` | Navigate current view to YYYY-MM-DD; switch to full-week if weekend |
| `undo:preAnimate` | `{ entryId: string, animationType: 'fade-delete' \| 'highlight' }` | Apply CSS animation class to FC event before API call |
| `undo:eventChanged` | `{ entryId: string, updatedEntry: TimeEntry }` | Update FC event extendedProps + apply highlight after API success |
| `undo:eventDeleted` | `{ entryId: string }` | Remove FC event after successful undo-of-add delete |
| `undo:eventAdded` | `{ entry: TimeEntry }` | Add a newly re-created entry to the FC calendar (undo-of-delete) |
