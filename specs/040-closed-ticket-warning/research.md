# Research: Closed Ticket Booking Gate

**Feature**: 040-closed-ticket-warning | **Date**: 2026-06-13

## Codebase Findings

### Existing autocomplete behaviour

`searchIssues()` in `redmine-api.js` (line 445) queries `GET /issues.json?status_id=open&subject=~...`. It returns only **open** issues, so the manual autocomplete path normally cannot surface a closed ticket. The `is_closed` boolean is never fetched or stored today; only `status.name` (e.g. "Closed") is available in the raw response but is discarded.

Consequence: the in-modal warning badge is most critical for:
- Edit path (ticket closed after original booking)
- Copy-paste (clipboard captured ticket that is now closed)
- AI pre-fill (AI proposes a closed ticket)
- Outlook DnD (Outlook event carries a ticket ID that is now closed)
- Within-calendar rescheduling (entry on a ticket closed since booking)

Manual autocomplete selection of a closed ticket is effectively blocked by the existing `status_id=open` filter, but the gate should still apply defensively in case that filter is relaxed in future.

### `_selectedIssue` state shape

`time-entry-form.js` stores `{ id, subject, projectName, projectIdentifier }` in module-level `_selectedIssue`. No `is_closed` field exists. The field is populated by `selectAndSave(ticket)` (autocomplete selection) and by `openForm()` pre-fill (edit, copy-paste, AI).

### Submission flow

`doSave()` → `validateTimeInputs()` → `persistTimeEntry()` → `createTimeEntry()` / `updateTimeEntry()`. The gate must be injected between `validateTimeInputs()` and `persistTimeEntry()`, analogous to the existing `openConfirmOverlay()` call in `onDeleteClick()`.

### Existing confirmation dialog

`#lean-confirm-modal` with `openConfirmOverlay(onConfirm)` in `time-entry-form.js`. This is form-scoped and not importable by `calendar.js` or `planning-view.js` without creating an import cycle. A shared module is required.

### Outlook DnD booking path

`planning-view.js` `_bookOne()` calls `createTimeEntry()` for events with a resolved `ticketId`. `planning-view-outlook.js` `_buildCardContent()` already renders a badge when `ticketInfo?.invalid` is true. The batch status fetch during `renderOutlookColumn()` is the right place to also resolve `is_closed` for all visible events.

### Within-calendar rescheduling

`calendar.js` `eventDrop(info)` calls `updateTimeEntry()` directly at line 332 with `entry.issueId` available. No modal is opened. The `is_closed` check must be injected here with an async fetch if status is not already cached.

### AI booking path

`chatbot-tools-entries.js` calls `openForm(null, prefill, onSaveCallback)` — the AI path always goes through the modal. The gate in `doSave()` covers it automatically; no separate AI-path gate is needed.

---

## Decisions

### D-001: How to fetch `is_closed`

**Decision**: Add two new functions to `redmine-api.js`:
- `fetchIssueStatus(issueId: number): Promise<{ is_closed: boolean }>` — single-issue fetch, `GET /issues/${id}.json`, extracts `issue.status.is_closed`
- `fetchIssueStatuses(issueIds: number[]): Promise<Map<number, boolean>>` — batch fetch via `GET /issues.json?issue_id=1,2,3,...`, returns `Map<id → is_closed>`

**Rationale**: Keeps the API client as the single integration point. The batch variant is needed for the planning view (up to ~30 events) to avoid N individual fetches on panel load. The single-issue variant is used for the modal and rescheduling paths (one ticket per action).

**Alternatives considered**:
- Extend `fetchIssueInfo()` to return `is_closed`: rejected — callers don't need status in the existing flow; extending the return type risks silent breakage.
- Parse `status.name === 'Closed'` string: rejected — status names are configurable per Redmine instance; `is_closed` is the canonical boolean.

### D-002: Shared confirmation dialog

**Decision**: New `js/confirm-dialog.js` module exporting `showConfirmDialog({ message, onConfirm, onCancel })`. A single `<div id="confirm-dialog">` element at document root in `index.html`, styled with existing `.confirm-overlay` / `.confirm-card` CSS classes.

**Rationale**: `calendar.js` and `planning-view.js` cannot import from `time-entry-form.js` without creating circular dependencies. A thin shared module with no upstream imports breaks the cycle cleanly, consistent with the `notify.js` pattern (showToast extracted from calendar.js in feature 035).

**Alternatives considered**:
- Re-export `openConfirmOverlay` from `time-entry-form.js`: rejected — circular import risk.
- Inline confirmation in each call site: rejected — duplicates HTML/CSS and diverges behaviour.

### D-003: Planning view `is_closed` status fetch timing

**Decision**: Batch-fetch `is_closed` for all resolved ticket IDs during `renderOutlookColumn()`. Cache results in the proposal objects (`proposal.is_closed: boolean`). The `_bookOne()` gate reads from the cached value — no fetch during the drop gesture.

**Rationale**: Eliminates per-drop fetch latency. The planning view already fetches Outlook events and then resolves ticket subjects; appending a single batch status call at the same time adds one network request per panel render, not one per drag. The loading indicator (clarification Q2) is therefore only needed for the calendar rescheduling path where no pre-cache exists.

**Alternatives considered**:
- Fetch `is_closed` on each drop: rejected — adds latency during the gesture, poor UX.
- Never fetch on panel load, always fetch on drop: rejected — means no badge on the Outlook event card.

### D-004: Rescheduling DnD `is_closed` check timing

**Decision**: In `calendar.js` `eventDrop()`, call `fetchIssueStatus(entry.issueId)` and await it before calling `updateTimeEntry()`. Revert the FullCalendar `eventDrop` using `info.revert()` on cancel. Show a brief loading indicator on the dropped event while the fetch is in flight; remove it on resolution.

**Rationale**: No cache exists for existing calendar entries (they were loaded via time entries, not issue status). A single targeted fetch per drop is acceptable — the user has just performed a deliberate drag gesture and expects a brief network round-trip before the save completes.

**Alternatives considered**:
- Pre-fetch `is_closed` for all calendar entries on load: rejected — could add many requests for large calendars; overkill for an edge case.

### D-005: Module size impact

Existing files checked against 500-LOC effective limit:
- `time-entry-form.js`: ~340 effective LOC (research estimate). Addition of ~25 LOC for badge + gate stays well within 500.
- `calendar.js`: was split in feature 035 to ≤500 LOC. Addition of ~15 LOC for the eventDrop gate is safe.
- `planning-view-outlook.js`: ~280 effective LOC. Addition of ~20 LOC for badge + batch fetch stays within limit.
- `planning-view.js`: ~240 effective LOC. Addition of ~15 LOC for `_bookOne()` gate is safe.
- `confirm-dialog.js` (new): ~40 effective LOC — well under limit.
- `redmine-api.js`: ~320 effective LOC. Two new functions add ~35 LOC — safe.

### D-006: i18n keys

New keys required (in `js/i18n/en.js` and `js/i18n/de.js`):

| Key | English | German |
|-----|---------|--------|
| `timeEntry.closedTicketBadge` | ⚠ This ticket is closed. | ⚠ Dieses Ticket ist geschlossen. |
| `timeEntry.closedTicketConfirmTitle` | Closed ticket | Geschlossenes Ticket |
| `timeEntry.closedTicketConfirmBody` | This ticket is closed. Time entries may be rejected by Redmine. Continue anyway? | Dieses Ticket ist geschlossen. Zeitbuchungen könnten von Redmine abgelehnt werden. Trotzdem fortfahren? |
| `planning.closedTicketBadge` | ⚠ Closed ticket | ⚠ Geschlossenes Ticket |

---

## Post-Design Constitution Re-check

All six constitution principles remain satisfied after Phase 1 design:
- API contract: only `GET /issues.json` and `GET /issues/{id}.json` used — both official REST endpoints.
- Calendar-first UX: no change to calendar render performance; badge + dialog are only shown for closed tickets (edge case).
- Test-first: unit tests for `fetchIssueStatus`, `fetchIssueStatuses`, `showConfirmDialog`; Playwright tests for all six booking-path scenarios.
- Simplicity: one new module (`confirm-dialog.js`), two new API functions, no new npm dependency.
- Security: no new credential surface; API responses validated.
- Quality gates: LOC budgets verified per D-005; SQI expected GREEN.
