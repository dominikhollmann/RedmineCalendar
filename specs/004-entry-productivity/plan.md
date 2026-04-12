# Implementation Plan: Copy and Paste Time Entries

**Branch**: `004-copy-paste-time-entries` | **Date**: 2026-04-12 | **Spec**: [spec.md](spec.md)

## Summary

Add Outlook-style copy-paste for time entries: single-click selects an entry, double-click/Enter opens the edit modal, Ctrl+C copies to an in-memory clipboard, and clicking/dragging any empty calendar slot while the clipboard is active opens the new entry form pre-filled with the copied ticket, activity, hours, comment, and start time. All state is transient (in-memory). Changes touch four existing files; no new files or dependencies are introduced.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla, no transpilation)
**Primary Dependencies**: FullCalendar v6 (CDN) — unchanged; no new dependencies
**Storage**: In-memory only (`_selectedEvent`, `_clipboard` module variables); no new localStorage or cookie keys
**Testing**: Manual acceptance checklist (`quickstart.md`) — see Constitution Check
**Target Platform**: Modern desktop browsers (Chrome, Firefox, Safari)
**Project Type**: Static web application (single-page, no build step)
**Performance Goals**: Selection visual feedback < 50 ms; paste form open < 300 ms (inherited from existing form open path)
**Constraints**: No build step, no bundler, vanilla ES2022 modules; FullCalendar v6 has no native double-click callback
**Scale/Scope**: Single user, local deployment

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Redmine API Contract | ✅ Pass | Paste calls existing `createTimeEntry()` — no new API surface, no DB access, credentials unchanged |
| II. Calendar-First UX | ✅ Pass | All interactions originate from the calendar (click, drag, keyboard shortcut while calendar is focused). Selection and paste are subordinate to the calendar view. 300 ms render goal inherited. Mobile deferred (spec Assumptions). |
| III. Test-First | ⚠️ Exception | Personal single-user tool, no CI pipeline. Manual acceptance checklist (`quickstart.md`, 15 test cases) covers all FRs and acceptance scenarios per constitution exception. |
| IV. Simplicity & YAGNI | ✅ Pass | No new files, no new dependencies, no new storage keys. In-memory clipboard is the simplest possible implementation. |
| V. Security by Default | ✅ Pass | Clipboard holds data already present in the calendar (no new untrusted input path). Pasted entry goes through existing `createTimeEntry()` validation. API key unchanged (SameSite=Strict cookie). |

## Project Structure

### Documentation (this feature)

```text
specs/004-entry-productivity/
├── plan.md          ✅ this file
├── research.md      ✅ generated
├── data-model.md    ✅ generated
├── quickstart.md    ✅ generated
└── tasks.md         ⬜ /speckit.tasks
```

### Source Code

```text
js/
├── calendar.js          ← modified: eventClick (select/double-click), Ctrl+C/Enter/Escape
│                                    handler, select callback (paste), deselect logic,
│                                    clipboard banner show/hide
├── time-entry-form.js   ← modified: extend prefill to accept issueId/activityId/comment
│                                    for paste pre-fill
├── config.js            ← no changes
├── redmine-api.js       ← no changes
└── settings.js          ← no changes

css/
└── style.css            ← modified: .fc-event--selected styles, .clipboard-banner styles

index.html               ← modified: add #clipboard-banner element
```

**Structure Decision**: Existing flat JS module structure. No new files. Four files modified.

## Key Implementation Details

### 1. Double-click detection in `eventClick`

FullCalendar v6 has no native `eventDblClick`. Detect via timing:

```js
let _lastClickId   = null;
let _lastClickTime = 0;

eventClick(info) {
  const entry = info.event.extendedProps?.timeEntry;
  if (!entry || entry._isMidnightContinuation) return;

  const now = Date.now();
  const isDouble = _lastClickId === info.event.id && (now - _lastClickTime) < 300;
  _lastClickId   = info.event.id;
  _lastClickTime = now;

  if (isDouble) {
    openForm(entry, {}, /* onSave */, /* onDelete */);
  } else {
    selectEntry(info.event);
  }
}
```

### 2. Selection state

```js
let _selectedEvent = null;

function selectEntry(fcEvent) {
  if (_selectedEvent && _selectedEvent !== fcEvent) deselectEntry();
  _selectedEvent = fcEvent;
  const base = fcEvent.extendedProps.timeEntry?.startTime ? [] : ['no-start-time'];
  fcEvent.setProp('classNames', [...base, 'fc-event--selected']);
}

function deselectEntry() {
  if (!_selectedEvent) return;
  const base = _selectedEvent.extendedProps.timeEntry?.startTime ? [] : ['no-start-time'];
  _selectedEvent.setProp('classNames', base);
  _selectedEvent = null;
}
```

### 3. Keyboard handler (document-level)

```js
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'c' && _selectedEvent) {
    const entry = _selectedEvent.extendedProps?.timeEntry;
    if (entry && !entry._isMidnightContinuation) { copyToClipboard(entry); e.preventDefault(); }
  }
  if (e.key === 'Enter' && _selectedEvent) {
    const entry = _selectedEvent.extendedProps?.timeEntry;
    if (entry && !entry._isMidnightContinuation) openForm(entry, {}, /* onSave */, /* onDelete */);
  }
  if (e.key === 'Escape') deselectEntry();
});
```

### 4. Paste in `select` callback

```js
select(info) {
  if (_suppressNextSelect) { _suppressNextSelect = false; calendar.unselect(); return; }
  deselectEntry();
  const date  = info.startStr.slice(0, 10);
  const time  = info.startStr.slice(11, 16) || null;
  const hours = (new Date(info.endStr) - new Date(info.startStr)) / 3600000;

  const prefill = _clipboard
    ? { date, startTime: time, hours, ..._clipboard }
    : { date, startTime: time, hours };

  openForm(null, prefill, (newEntry) => {
    calendar.addEvent(toFcEvent(newEntry));
    recomputeDayTotals();
    showToast(t('calendar.entry_saved'));
  });
  calendar.unselect();
}
```

### 5. `openForm` prefill extension (time-entry-form.js)

When `entry` is `null` and `prefill.issueId` is set:
- Pre-fill search field: `#<id> <subject>`
- Set `_selectedIssue` from prefill
- Enable save button
- Keep delete button hidden
- In `doSave()`, use `prefill.activityId ?? _defaultActivityId` and `prefill.comment ?? ''`

### 6. Clipboard banner (index.html + calendar.js)

```html
<div id="clipboard-banner" class="clipboard-banner hidden">
  <span id="clipboard-banner-text"></span>
  <button id="clipboard-banner-clear" aria-label="Clear clipboard">✕</button>
</div>
```

```js
function copyToClipboard(entry) {
  _clipboard = { issueId: entry.issueId, issueSubject: entry.issueSubject,
                 projectName: entry.projectName, activityId: entry.activityId,
                 hours: entry.hours, comment: entry.comment, startTime: entry.startTime };
  document.getElementById('clipboard-banner-text').textContent =
    `📋 #${entry.issueId} ${entry.issueSubject ?? ''} — click any slot to paste`;
  document.getElementById('clipboard-banner').classList.remove('hidden');
}

function clearClipboard() {
  _clipboard = null;
  document.getElementById('clipboard-banner').classList.add('hidden');
}
document.getElementById('clipboard-banner-clear').addEventListener('click', clearClipboard);
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Test-First exception (Constitution III) | No CI pipeline; personal single-user tool | Manual checklist in `quickstart.md` covers all 8 FRs and all 7 acceptance scenarios as required by the exception conditions |
