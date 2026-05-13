# Quickstart & Acceptance Tests: Entry UX Improvements

## Acceptance Tests

### US1 — Search Tickets by #Number

- [x] Type `#` followed by a valid ticket number — verify only that ticket appears (ID-only, no subject fallback)
- [x] Type `#99999` (non-existent) — verify no results shown
- [x] Type a plain number (without `#`) — verify existing behavior (ID first, then subject fallback)
- [x] Type text (e.g., `login`) — verify subject search works unchanged

### US2 — Ticket Hyperlink in Calendar Entries

- [x] Verify ticket ID/title on calendar entries is a clickable link
- [x] Click the link — verify Redmine ticket opens in a new tab
- [x] Click the link — verify the calendar entry is NOT selected or opened for editing
- [x] Hover over the link — verify cursor changes to pointer

### US3 — Optional Comment Field

- [x] Open time entry form — verify comment field appears below start/end time
- [x] Type a comment and save — verify comment appears on calendar entry
- [x] Leave comment empty and save — verify entry saves without issue
- [x] Press Enter in comment field — verify form submits (consistent with lean UX)
- [x] Edit existing entry with comment — verify comment is pre-filled
- [x] Clear comment on existing entry and save — verify comment is removed
