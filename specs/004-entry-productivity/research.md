# Research: Copy and Paste Time Entries (004)

## Decision 1: FullCalendar double-click detection

**Decision**: Implement double-click detection manually inside the existing `eventClick` FullCalendar callback by tracking the last-clicked event ID and timestamp at module level. If the same event is clicked again within 300 ms, treat it as a double-click and open the edit modal; otherwise, treat it as a single-click and select the event.

**Rationale**: FullCalendar v6 has no native `eventDblClick` callback. The timing approach keeps all logic inside the existing FC callback system without adding DOM listeners. 300 ms is the de-facto double-click threshold used by browsers and operating systems.

**Alternatives considered**:
- DOM `dblclick` listener on the calendar container — rejected: requires bubbling inspection to identify which FC event was clicked; more fragile than staying within the FC API.
- Separate click/select + toolbar "Edit" button — rejected: adds unnecessary UI chrome.

---

## Decision 2: Event selection state

**Decision**: Store the selected FullCalendar Event object in a module-level variable `_selectedEvent`. On selection, call `event.setProp('classNames', [...baseClasses, 'fc-event--selected'])` to add a CSS class. On deselect, restore base classes. Only one event can be selected at a time; selecting a new event deselects the previous one.

**Rationale**: `setProp('classNames', …)` is the idiomatic FullCalendar v6 API for mutating event appearance without re-rendering the whole calendar. Keeping state in a module variable (not the DOM) avoids querying the DOM to find the currently selected event.

**Alternatives considered**:
- Store selected event ID and query via `calendar.getEventById()` — functionally equivalent, adds an extra lookup on every operation; rejected.
- Use FullCalendar's built-in `eventSelection` feature — not available in the free FullCalendar v6 build; rejected.

---

## Decision 3: Clipboard state

**Decision**: Store clipboard contents in a module-level object `_clipboard` with fields `{ issueId, issueSubject, projectName, activityId, hours, comment, startTime }`. Purely in-memory; cleared on page reload. Replacing clipboard (copy while clipboard is active) simply overwrites the variable.

**Rationale**: The spec explicitly states clipboard is session-only and in-memory. No persistence mechanism is needed. A plain JS object is the simplest possible implementation.

**Alternatives considered**:
- `navigator.clipboard` (system clipboard) — rejected: requires Clipboard API permissions, serialisation, and introduces cross-app paste risk. Spec explicitly says in-memory only.
- localStorage — rejected: spec says clipboard does not survive page reload.

---

## Decision 4: Keyboard event handling

**Decision**: Add a single `keydown` listener on `document` inside `calendar.js` (module initialisation, not inside FC callbacks). Handles:
- `Ctrl+C` / `Cmd+C`: copy selected event to clipboard (only if `_selectedEvent` is set and is not a midnight-continuation segment)
- `Enter`: open edit modal for selected event (same as double-click)
- `Escape`: deselect current event; clear has no effect on clipboard (clipboard persists until next copy)

**Rationale**: A single document-level listener is simpler than per-element listeners and ensures the shortcut works regardless of focus state within the calendar.

**Alternatives considered**:
- Wiring keyboard handlers inside FC callbacks — rejected: FC callbacks fire on pointer events only; keyboard events must be on `document`.
- Separate keyboard manager module — rejected: YAGNI; one listener in `calendar.js` is sufficient.

---

## Decision 5: Clipboard banner

**Decision**: Add a `<div id="clipboard-banner" class="clipboard-banner hidden">` to `index.html`. JS shows it when clipboard is set (displaying ticket name + "click any slot to paste") and hides it when clipboard is cleared. An `✕` button in the banner clears the clipboard explicitly.

**Rationale**: The spec requires a visual indicator of the clipboard state that persists across week navigation. A banner in the app header area is non-intrusive and survives calendar re-renders (unlike annotations on FC events).

**Alternatives considered**:
- Dashed border on the copied event — rejected: event may scroll out of view or disappear on week navigation; banner is always visible.
- Toast notification — rejected: toasts are transient; clipboard is persistent until cleared.

---

## Decision 6: Paste flow — extending `openForm` prefill

**Decision**: Extend the `prefill` argument of `openForm(entry, prefill, onSave, onDelete)` in `time-entry-form.js` to accept optional fields `{ issueId, issueSubject, projectName, activityId, comment }`. When `prefill.issueId` is set and `entry` is `null`, pre-select the issue in the form (search field filled, save button enabled) without showing the delete button. `activityId` and `comment` are carried through silently to the `createTimeEntry` call, bypassing the default-activity lookup when explicitly provided.

**Rationale**: The existing `openForm` signature is already called identically from `calendar.js` for create and edit. Enriching the prefill keeps the same API surface — `calendar.js` passes a richer prefill when clipboard is active; the form handles it. No new exports or modules required.

**Alternatives considered**:
- Pass a fake entry object (non-null first arg with no `id`) — rejected: triggers edit mode logic (shows delete button, calls `updateTimeEntry` on save).
- Separate `openPasteForm()` export — rejected: YAGNI; duplicates form wiring for one code path.

---

## Decision 7: Files changed

| File | Change type | Reason |
|------|-------------|--------|
| `js/calendar.js` | Modify | eventClick (select/double-click), Ctrl+C/Enter/Escape handler, select callback (paste), deselect on outside click, clipboard banner show/hide |
| `js/time-entry-form.js` | Modify | Extend prefill to accept issueId/activityId/comment for paste pre-fill |
| `index.html` | Modify | Add `#clipboard-banner` element |
| `css/style.css` | Modify | `.fc-event--selected` styles, `.clipboard-banner` styles |

No new files. No new dependencies. No new localStorage keys.
