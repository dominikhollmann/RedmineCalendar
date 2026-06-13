# Research: Undo for Time-Entry Changes

## 1. Existing write call sites

Every Redmine write in the codebase goes through one of the three functions in `js/redmine-api.js`. All call sites were located by grepping for `createTimeEntry|updateTimeEntry|deleteTimeEntry`:

| File                              | Location                                                | Action type                       |
| --------------------------------- | ------------------------------------------------------- | --------------------------------- |
| `js/time-entry-form.js:284`       | `createTimeEntry(payload)` in `persistTimeEntry()`      | add                               |
| `js/time-entry-form.js:274`       | `updateTimeEntry(id, payload)` in `persistTimeEntry()`  | edit                              |
| `js/time-entry-form.js:~373`      | `deleteTimeEntry(id)` in the delete confirm callback    | delete (single, from form)        |
| `js/entry-commands.js:34`         | `Promise.all(toDelete.map(e => deleteTimeEntry(e.id)))` | bulk delete (keyboard Delete)     |
| `js/calendar.js:316`              | `updateTimeEntry(id, {...})` in `eventDrop`             | move (classic calendar)           |
| `js/calendar.js:352`              | `updateTimeEntry(id, {...})` in `eventResize`           | resize (classic calendar)         |
| `js/planning-view-bookings.js:71` | `updateTimeEntry(id, {...})` in `_onEventDrop`          | move (planning view)              |
| `js/planning-view-bookings.js:89` | `updateTimeEntry(id, {...})` in `_onEventResize`        | resize (planning view)            |
| `js/planning-view.js:221`         | `createTimeEntry({...})` in `_bookOne()`                | add (planning view, Outlook drag) |

**Bulk move**: Feature 028 (bulk-select-move-delete) planned bulk move (+1/−1 day) but it has not yet been shipped. The `entry-commands.js` module handles bulk delete but contains no bulk move code. A stub comment will be left at the appropriate location in `entry-commands.js` so the undo push can be added when bulk move is implemented.

**Copy-paste**: Paste goes through the same `createTimeEntry` path in `time-entry-form.js` as a regular add. To distinguish paste from add (for the toast message), `calendar.js` can pass an `isPaste: true` flag in the form's `onSave` callback before it fires, which `time-entry-form.js` then passes through.

**Decision**: Track paste as action type `'paste'` in the undo stack. Undo of a paste is identical to undo of an add (delete the entry), but the toast message says "Undo: pasted entry removed" instead of "Undo: new entry removed."

## 2. Stack architecture

- Decision: **plain array with a cursor** — `_undoStack[]` and `_redoStack[]` as separate arrays. Pop from the end of `_undoStack` (LIFO). On push, clear `_redoStack`.
- Rationale: simplest correct structure. A cursor-based single array adds no value for this use case and complicates the depth-limit eviction.
- Alternatives considered: linked list (overkill), cursor on single array (harder depth-limit reasoning).
- **Depth limit**: cap at 20. When `_undoStack.length === 20`, shift the oldest entry off the front before pushing.

## 3. Calendar navigation decoupling

- Decision: **custom DOM events** — `undo:navigate`, `undo:preAnimate`, `undo:eventChanged`, `undo:eventDeleted` — dispatched on `document`. Calendar and planning-view modules listen for them independently.
- Rationale: `undo-actions.js` must not import `calendar.js` (would create a cycle: `calendar.js` → `undo-actions.js` → `calendar.js`). Custom events are already used elsewhere in the project (e.g., feedback module). The listener is scoped to whichever view is currently active.
- Alternatives considered: callback registration (requires explicit `registerNavigator()` calls in both calendar and planning-view modules — more boilerplate, no real benefit).

## 4. Stale-ID problem for undo-of-delete

When undo reverses a delete, it calls `createTimeEntry` and Redmine assigns a **new ID**. If the user then presses Ctrl+Z again (undo the undo — i.e., redo), we need to delete by the new ID, not the original.

- Decision: after a successful `createTimeEntry` during undo, **mutate the action snapshot's `entry.id`** with the newly returned ID before pushing it onto the redo stack. The redo stack always holds the latest valid ID.
- Rationale: simple in-place mutation; the action object is already in memory; no new data structures needed.
- Alternatives considered: store original + current ID (extra complexity for no benefit), clone the action (wastes memory).

## 5. Keyboard interception

The existing `entry-commands.js` keydown handler guards using `if (!_context) return` where `_context` is the callbacks object passed by `activate()`. This is insufficient for undo: undo should fire even when no entry is selected (so `_context` might still have a value, but to be safe, undo is registered separately).

- Decision: `undo-actions.js` registers its own `document.addEventListener('keydown', ...)` at module load time. The handler applies a three-step guard before acting:
  1. Is `document.activeElement` an `<input>`, `<textarea>`, or `[contenteditable]` element? → `return` (browser-native text-field undo is unaffected).
  2. Is the time-entry modal visible? (i.e. `!document.getElementById('entry-modal').classList.contains('hidden')`) → `return` (app-level undo is suppressed entirely while the form is open, regardless of which element has focus inside it — avoids accidentally undoing the last calendar action mid-form).
  3. Is the AI chat panel open? (i.e. `!document.getElementById('chatbot-panel').classList.contains('hidden')`) → `return` (app-level undo is suppressed while the chat is open; the chat input's own undo works natively via guard step 1).

  If none of the guards match, Ctrl+Z fires undo and Ctrl+Shift+Z / Ctrl+Y fires redo.

- Rationale: `activeElement` alone is insufficient — when a modal button (e.g. Submit) has focus, `activeElement` is a `<button>`, not a text field, so the check passes and the calendar undo fires unexpectedly behind the open form. Checking modal/panel visibility is simpler and more robust than attempting to enumerate every focusable element within those surfaces.
- The Settings page (`settings.html`) is a separate HTML document; the undo module is not loaded there, so no guard is needed.

## 6. UX — add-undo animation

For undo of an add (where the entry must visually disappear), the flow is:

1. Navigate to the date → `undo:navigate` event
2. Dispatch `undo:preAnimate` with `{ entryId, animationType: 'fade-delete' }`
3. 500 ms delay (in `undo-actions.js` using `setTimeout`)
4. Call `deleteTimeEntry(entry.id)` on Redmine
5. Dispatch `undo:eventDeleted` with `{ entryId }`
6. Show success toast

Calendar and planning-view listen for `undo:preAnimate` and apply `.fc-event--undo-add-fade` CSS class (red tint → fade, 450 ms animation). They listen for `undo:eventDeleted` to call `fcEvent.remove()`.

For all other undo types, the changed entry is highlighted after the API call resolves:

- Dispatch `undo:eventChanged` with `{ entryId, updatedEntry }` → calendar/planning-view updates the FC event's `extendedProps.timeEntry` and applies `.fc-event--undo-highlight` (yellow flash, 600 ms).

## 7. Paste tracking

`calendar.js` currently sets `_clipboard` before calling `openForm`. When the `onSave` callback fires (with the saved entry), the caller knows `_clipboard !== null` at that moment → the undo push should record type `'paste'` instead of `'add'`.

Implementation: the `doSave()` path in `time-entry-form.js` fires `cb?.(saved)` with the saved entry. `calendar.js` wraps the callback to check if `_clipboard` is non-null when setting up the form, and records accordingly. The undo-manager action type is set in `calendar.js`, not inside `time-entry-form.js`.

## 8. Module size estimate

| Module                            | Estimated effective LOC |
| --------------------------------- | ----------------------- |
| `js/undo-manager.js`              | ~70                     |
| `js/undo-actions.js`              | ~140                    |
| `tests/unit/undo-manager.test.js` | ~80                     |
| `tests/ui/undo.spec.js`           | ~120                    |

All well within the 500-LOC hard gate and 60-LOC-per-function ESLint rule.
