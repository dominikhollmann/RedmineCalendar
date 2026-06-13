# Quickstart: Closed Ticket Booking Gate — UAT Validation Guide

**Feature**: 040-closed-ticket-warning
**Branch**: `040-closed-ticket-warning`
**Prerequisites**: Dev server running (`npm run dev`); Redmine credentials configured; at least one **closed** Redmine ticket accessible to the test user; at least one **open** ticket for regression checks.

---

## Scenario 1 — Modal warning badge on manual ticket selection

- [ ] Open the time-entry modal by clicking an empty calendar slot.
- [ ] In the issue search field, type the ID or subject of a known closed ticket and select it from the autocomplete (or paste the ID directly).
- [ ] Verify a yellow/amber warning badge appears beneath the issue field immediately (within 1 second), without clicking Submit.
- [ ] Clear the issue field and verify the warning badge disappears.
- [ ] Select an open ticket and verify no warning badge appears.

## Scenario 2 — Confirmation dialog on modal submission with closed ticket

- [ ] Open the time-entry modal, select a closed ticket, fill in hours and date, and click Submit.
- [ ] Verify a confirmation dialog appears before any entry is created, asking you to confirm the booking on a closed ticket.
- [ ] Click Cancel in the dialog and verify: (a) no entry is created, (b) the modal remains open with all fields intact.
- [ ] Repeat the same steps, this time click Confirm in the dialog, and verify the entry is created in Redmine.

## Scenario 3 — Warning badge and dialog when editing an entry on a now-closed ticket

- [ ] Open an existing time entry whose ticket has been closed since it was booked (click the calendar event to open the edit modal).
- [ ] Verify the warning badge appears immediately beneath the issue field, before any interaction.
- [ ] Click Submit and verify the confirmation dialog appears.
- [ ] Click Confirm and verify the update is saved to Redmine.

## Scenario 4 — Copy-paste pre-fill shows badge and dialog

- [ ] Copy a time entry whose ticket is now closed (select it on the calendar and use the copy action).
- [ ] Paste it onto a new calendar slot.
- [ ] Verify the modal opens pre-filled and the warning badge appears immediately.
- [ ] Click Submit and verify the confirmation dialog appears.
- [ ] Click Cancel and verify no entry is created and the modal stays open.

## Scenario 5 — AI booking pre-fill shows badge and dialog

- [ ] Open the AI chat panel and ask it to book time on a known closed ticket (e.g. "Book 2 hours on ticket #123 today").
- [ ] Verify the time-entry modal opens pre-filled with the closed ticket and the warning badge appears.
- [ ] Click Submit and verify the confirmation dialog appears.
- [ ] Click Confirm and verify the entry is created in Redmine.

## Scenario 6 — Outlook DnD: planning view badge and confirmation dialog

- [ ] Open the planning view (if available in the test environment with Outlook connected).
- [ ] Verify that Outlook events whose resolved ticket is closed show a ⚠️ badge on the event card in the right-side panel.
- [ ] Hover over the ⚠️ badge and verify a tooltip appears explaining the ticket is closed.
- [ ] Drag a badged Outlook event onto the calendar.
- [ ] Verify the confirmation dialog appears before any entry is created.
- [ ] Click Confirm and verify the entry is created in Redmine (no badge on the resulting calendar booking).
- [ ] Repeat with a non-closed-ticket event and verify no dialog appears and the entry is created directly.

## Scenario 7 — Within-calendar rescheduling gate

- [ ] On the calendar, find an existing time entry whose ticket is closed. Drag it to a different time slot on the same or a different day.
- [ ] Verify the confirmation dialog appears before the reschedule is committed.
- [ ] Click Cancel and verify the entry snaps back to its original position and no Redmine write occurs.
- [ ] Repeat and click Confirm to verify the entry is rescheduled successfully.

## Scenario 8 — Open-ticket bookings are not affected (regression)

- [ ] Create a new time entry on an open ticket via the modal and click Submit — verify no warning badge and no confirmation dialog appear; entry is created directly.
- [ ] Edit an existing entry on an open ticket and submit — verify no badge and no dialog.
- [ ] Drag an existing entry on an open ticket to a new slot — verify no dialog and immediate reschedule.

## Scenario 9 — English and German locale

- [ ] Switch the browser locale to German and repeat Scenario 1 and Scenario 2.
- [ ] Verify the warning badge text and confirmation dialog text appear in German.

## Scenario 10 — Graceful degradation (network failure simulation)

- [ ] (If testable via dev-tools network throttling) Block the `GET /issues/*.json` request that fetches `is_closed`.
- [ ] Attempt to submit a time entry in the modal — verify no confirmation dialog appears and the entry is created without interruption (gate skipped gracefully).
