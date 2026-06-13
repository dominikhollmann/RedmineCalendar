# Data Model: Closed Ticket Booking Gate

**Feature**: 040-closed-ticket-warning | **Date**: 2026-06-13

## Type Extensions

### `IssueResult` (extended)

Existing type in `js/types.d.ts`. Add optional `is_closed` field populated by `fetchIssueStatus()` / `fetchIssueStatuses()`:

```
IssueResult {
  id:                number
  subject:           string
  projectId:         number
  projectName:       string
  projectIdentifier: string
  status:            string        // status.name (existing)
  is_closed?:        boolean       // NEW — populated on demand; undefined = not yet checked
}
```

### `SelectedIssue` (extended in `time-entry-form.js`)

The in-memory `_selectedIssue` object gains `is_closed`:

```
SelectedIssue {
  id:                number
  subject:           string
  projectName:       string
  projectIdentifier: string
  is_closed?:        boolean       // NEW — undefined until status is fetched
}
```

`is_closed` is set asynchronously after `selectAndSave()` or during `openForm()` pre-fill. The warning badge renders immediately when `is_closed === true`.

### `ConfirmDialogOptions`

Interface for the shared `showConfirmDialog()` call:

```
ConfirmDialogOptions {
  title:         string              // Dialog heading (i18n-resolved by caller)
  message:       string              // Body text (i18n-resolved by caller)
  confirmLabel?: string              // Default: t('confirm')
  cancelLabel?:  string              // Default: t('cancel')
  onConfirm:     () => void
  onCancel?:     () => void
}
```

### `IssueStatusMap`

Return type of `fetchIssueStatuses()`:

```
IssueStatusMap = Map<number, boolean>
// key: issueId, value: is_closed
```

### `PlanningProposal` (extended in planning-view-outlook.js)

The existing proposal object gains `is_closed` populated during `renderOutlookColumn()`:

```
PlanningProposal {
  ...existing fields...
  ticketId:    number | null
  is_closed?:  boolean       // NEW — set by batch fetch; undefined if ticketId is null
}
```

---

## State Transitions

### Modal warning badge

```
issue field empty          → badge: hidden
issue field set, is_closed = undefined  → badge: hidden (fetch in flight)
issue field set, is_closed = false      → badge: hidden
issue field set, is_closed = true       → badge: visible (amber)
issue field cleared                     → badge: hidden; _selectedIssue.is_closed = undefined
```

### Confirmation dialog (all paths)

```
booking attempted, is_closed = false/undefined → dialog: skipped → API write proceeds
booking attempted, is_closed = true            → dialog: shown
  user confirms                                → dialog: closed → API write proceeds
  user cancels (modal path)                    → dialog: closed → modal stays open, no write
  user cancels (DnD/rescheduling path)         → dialog: closed → drop reverted, no write
```

### Planning view Outlook event badge

```
Outlook event loads, ticketId = null         → badge: hidden
Outlook event loads, ticketId set, fetch pending → badge: hidden (batch fetch in flight)
batch fetch resolves, is_closed = false      → badge: hidden
batch fetch resolves, is_closed = true       → badge: ⚠️ visible on event card
```

---

## No New Persistence

`is_closed` is never written to `localStorage`, `IndexedDB`, or `config.json`. It is:
- Fetched at runtime per booking action (modal, rescheduling DnD)
- Fetched in batch during planning view panel render and cached in-memory in proposal objects
- Discarded when the modal closes or the planning view re-renders
