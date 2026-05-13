# Tasks: Copy and Paste Time Entries (004)

**Input**: Design documents from `/specs/004-entry-productivity/`
**Branch**: `004-copy-paste-time-entries`

---

## Phase 1: Setup

No new files or dependencies — skipped.

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: Extend `openForm` to accept clipboard prefill fields. This is required before the paste flow in `calendar.js` can be wired up.

**⚠️ CRITICAL**: Phase 3 paste task (T009) depends on this being complete.

- [x] T001 Extend `openForm(entry, prefill, onSave, onDelete)` in `js/time-entry-form.js`: when `entry` is `null` and `prefill.issueId` is set, pre-populate `_selectedIssue` from `prefill`, fill the search field with `#<id> <subject>`, enable the save button, and keep the delete button hidden; in `doSave()` use `prefill.activityId ?? _defaultActivityId` and `prefill.comment ?? ''` instead of the current hardcoded defaults

**Checkpoint**: `openForm(null, { date, startTime, hours, issueId: 42, issueSubject: 'Fix bug', projectName: 'Proj', activityId: 9, comment: 'hello' }, onSave)` opens the form with ticket pre-selected and save button enabled.

---

## Phase 3: User Story 1 — Copy and Paste Time Entries (Priority: P1) 🎯 MVP

**Goal**: Single-click selects an entry; double-click/Enter opens the edit modal; Ctrl+C copies to an in-memory clipboard with a persistent banner; clicking/dragging any empty slot with an active clipboard opens a pre-filled new entry form.

**Independent Test**: Copy an existing entry (click → Ctrl+C), navigate to another day, click an empty slot — form opens pre-filled with the original ticket; save — new entry appears on the target day.

### HTML & CSS (parallelisable)

- [x] T002 [P] [US1] Add clipboard banner markup to `index.html` just before the closing `</body>`: `<div id="clipboard-banner" class="clipboard-banner hidden"><span id="clipboard-banner-text"></span><button id="clipboard-banner-clear" aria-label="Clear clipboard">✕</button></div>`
- [x] T003 [P] [US1] Add styles to `css/style.css`: `.fc-event--selected` (distinct border/background to indicate selection, e.g. solid 2px white outline + brightness increase); `.clipboard-banner` (fixed or sticky bar below the app header, flex row, pill/card style with icon, text, and ✕ button); `.clipboard-banner.hidden { display: none; }`

### State variables (parallelisable with T002, T003)

- [x] T004 [P] [US1] Add four module-level state variables near the top of `js/calendar.js` (after existing `let` declarations): `let _selectedEvent = null;`, `let _lastClickId = null;`, `let _lastClickTime = 0;`, `let _clipboard = null;`

### Selection logic

- [x] T005 [US1] Add `selectEntry(fcEvent)` and `deselectEntry()` functions to `js/calendar.js` (after state variables, before FullCalendar init): `selectEntry` deselects any current `_selectedEvent`, sets `_selectedEvent = fcEvent`, and calls `fcEvent.setProp('classNames', [...baseClasses, 'fc-event--selected'])` where `baseClasses` is `fcEvent.extendedProps.timeEntry?.startTime ? [] : ['no-start-time']`; `deselectEntry` restores `_selectedEvent`'s base classNames and sets `_selectedEvent = null` — depends on T004

- [x] T006 [US1] Modify the `eventClick` callback in `js/calendar.js` (currently at line 565) to implement single-click select + double-click open: track `_lastClickId` / `_lastClickTime`; if same event clicked within 300 ms treat as double-click and call `openForm(entry, …)` (existing logic); otherwise call `selectEntry(info.event)` — depends on T005

### Clipboard logic

- [x] T007 [US1] Add `copyToClipboard(entry)` and `clearClipboard()` functions to `js/calendar.js`: `copyToClipboard` populates `_clipboard` with `{ issueId, issueSubject, projectName, activityId, hours, comment, startTime }` from the entry, sets `#clipboard-banner-text` content to `📋 #<id> <subject> — click any slot to paste`, and removes `hidden` from `#clipboard-banner`; `clearClipboard` sets `_clipboard = null` and adds `hidden` to `#clipboard-banner` — depends on T002, T004

- [x] T008 [US1] Wire the `#clipboard-banner-clear` button click listener in `js/calendar.js` (after `calendar.render()`): `document.getElementById('clipboard-banner-clear').addEventListener('click', clearClipboard)` — depends on T007

### Keyboard handler

- [x] T009 [US1] Add a `document.addEventListener('keydown', …)` handler in `js/calendar.js` (after `calendar.render()`): on `Ctrl+C` / `Cmd+C` with `_selectedEvent` set and entry not `_isMidnightContinuation`, call `copyToClipboard(entry)` and `e.preventDefault()`; on `Enter` with `_selectedEvent` set, open the edit modal (same as double-click); on `Escape`, call `deselectEntry()` — depends on T005, T007

### Paste flow

- [x] T010 [US1] Modify the `select` callback in `js/calendar.js` (currently at line 546): at the top call `deselectEntry()`; build `prefill` as `{ date, startTime: time, hours, ..._clipboard }` when `_clipboard` is set, otherwise `{ date, startTime: time, hours }`; pass `prefill` to `openForm` (no change to `onSave` callback) — depends on T001, T007

**Checkpoint**: All 15 quickstart.md acceptance scenarios pass.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T011 Run all acceptance scenarios in `specs/004-entry-productivity/quickstart.md` (T001–T015) and mark each checkbox; verify no regressions in drag-to-move, drag-to-resize, new entry creation, edit, and delete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately
- **Phase 3 HTML/CSS/state (T002, T003, T004)**: No dependencies — parallelisable with Phase 2
- **T005** (selectEntry/deselectEntry): depends on T004
- **T006** (eventClick): depends on T005
- **T007** (copyToClipboard/clearClipboard): depends on T002, T004
- **T008** (banner clear button): depends on T007
- **T009** (keydown handler): depends on T005, T007
- **T010** (paste in select): depends on T001, T007
- **T011** (polish/QA): depends on all above

### Parallel Opportunities

```
Immediately:  T001, T002, T003, T004   (all different files / independent)
After T004:   T005
After T005:   T006, T007 (T007 also needs T002 — start after both T002+T004)
After T006, T007: T008, T009
After T001, T007: T010
After all: T011
```

---

## Implementation Strategy

### MVP (only one user story — complete in order)

1. T001 — extend `openForm` prefill (foundational, unblocks paste)
2. T002, T003, T004 — parallel: banner HTML, CSS, state vars
3. T005 — selectEntry / deselectEntry
4. T006 — eventClick (select + double-click)
5. T007 — copyToClipboard / clearClipboard
6. T008 — wire banner clear button
7. T009 — keydown handler
8. T010 — paste in select callback
9. T011 — quickstart.md acceptance run

**Commit after each task** using message format `T00N: <description>`.
