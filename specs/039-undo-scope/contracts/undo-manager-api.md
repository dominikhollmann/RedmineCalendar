# Contract: js/undo-manager.js

Pure-logic module. No DOM, no Redmine API, no imports from other project modules.

## Exports

### Constants

```js
export const UNDO_STACK_MAX = 20;

export const ACTION_ADD          = 'add';
export const ACTION_PASTE        = 'paste';
export const ACTION_DELETE       = 'delete';
export const ACTION_EDIT         = 'edit';
export const ACTION_MOVE         = 'move';
export const ACTION_RESIZE       = 'resize';
export const ACTION_BULK_DELETE  = 'bulk-delete';
export const ACTION_BULK_MOVE    = 'bulk-move';   // reserved — no call site yet
```

### Singleton manager

```js
// Module-level singleton (not a factory — one stack per tab, shared across all views).
export const undoManager = {
  push(action: UndoableAction): void,
  undo(): UndoableAction | null,
  redo(): UndoableAction | null,
  canUndo(): boolean,
  canRedo(): boolean,
  clear(): void,          // used in tests only
};
```

`push()` behaviour:
1. Clears the redo stack.
2. If `undoStack.length === UNDO_STACK_MAX`, removes the oldest entry (index 0) before pushing.
3. Appends `action` to the end of `undoStack`.

`undo()` behaviour:
1. Returns `null` if `undoStack` is empty.
2. Pops the last entry from `undoStack`.
3. Pushes it to `redoStack`.
4. Returns the popped action.

`redo()` behaviour:
1. Returns `null` if `redoStack` is empty.
2. Pops the last entry from `redoStack`.
3. Pushes it to `undoStack` (no cap check — redo re-adds an entry that was already counted).
4. Returns the popped action.

## i18n keys (new — added to js/i18n/en.js and js/i18n/de.js)

```js
// Success toasts (undo direction)
'undo.add_removed':          'Undo: new entry removed',
'undo.paste_removed':        'Undo: pasted entry removed',
'undo.delete_restored':      'Undo: entry restored',
'undo.edit_reversed':        'Undo: edit reversed',
'undo.move_reversed':        'Undo: move reversed',
'undo.resize_reversed':      'Undo: resize reversed',
'undo.bulk_delete_restored': 'Undo: {{count}} entries restored',
'undo.bulk_move_reversed':   'Undo: {{count}} entries moved back',
'undo.failed':               'Undo failed: {{message}}',

// Success toasts (redo direction)
'redo.add_reapplied':        'Redo: entry re-created',
'redo.paste_reapplied':      'Redo: paste re-applied',
'redo.delete_reapplied':     'Redo: entry deleted again',
'redo.edit_reapplied':       'Redo: edit re-applied',
'redo.move_reapplied':       'Redo: move re-applied',
'redo.resize_reapplied':     'Redo: resize re-applied',
'redo.bulk_delete_reapplied':'Redo: {{count}} entries deleted again',
'redo.bulk_move_reapplied':  'Redo: {{count}} entries moved again',
'redo.failed':               'Redo failed: {{message}}',
```
