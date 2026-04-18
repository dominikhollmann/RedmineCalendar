# Quickstart & Acceptance Tests: Entry UX Improvements

## Acceptance Tests

### US1 — Search Tickets by #Number

- [ ] Type `#` followed by a valid ticket number — verify only that ticket appears (ID-only, no subject fallback)
- [ ] Type `#99999` (non-existent) — verify no results shown
- [ ] Type a plain number (without `#`) — verify existing behavior (ID first, then subject fallback)
- [ ] Type text (e.g., `login`) — verify subject search works unchanged

### US2 — Ticket Hyperlink in Calendar Entries

- [ ] Verify ticket ID/title on calendar entries is a clickable link
- [ ] Click the link — verify Redmine ticket opens in a new tab
- [ ] Click the link — verify the calendar entry is NOT selected or opened for editing
- [ ] Hover over the link — verify cursor changes to pointer

### US3 — Optional Comment Field

- [ ] Open time entry form — verify comment field appears below start/end time
- [ ] Type a comment and save — verify comment appears on calendar entry
- [ ] Leave comment empty and save — verify entry saves without issue
- [ ] Press Enter in comment field — verify form does NOT submit
- [ ] Edit existing entry with comment — verify comment is pre-filled
- [ ] Clear comment on existing entry and save — verify comment is removed
