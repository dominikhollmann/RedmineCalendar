# Quickstart: Booking Guard Warnings (042)

## Prerequisites

- Dev server running: `npm run dev`
- A Redmine instance with at least one regular ticket and one vacation/holiday ticket configured in `config.json` (`holidayTicket` / `vacationTicket`).

## Config setup

Add to `config.json` for deadline-warning tests:

```json
"bookingDeadline": {
  "enabled": true,
  "dayOfWeek": 5,
  "hour": 22,
  "minute": 0
}
```

To simulate "past the deadline": either wait until Friday 22:00 or temporarily set `dayOfWeek` to yesterday's day-of-week and `hour` to a past hour (e.g. `dayOfWeek: <today's weekday>`, `hour: <current hour - 1>`).

---

## Scenario 1 — Future-date warning (create)

- [x] Open the calendar. Click a time slot on tomorrow's column to open the new-entry form.
- [x] Select a regular ticket, fill in hours, click Save.
- [x] Verify a warning dialog appears before the entry is saved.
- [x] Click "Continue anyway" and verify the entry is saved and appears on the calendar.

## Scenario 2 — No warning for today

- [x] Click a time slot on today's column, fill in a regular ticket and hours, click Save.
- [x] Verify no warning dialog appears and the entry saves immediately.

## Scenario 3 — Vacation/holiday ticket exempt from future-date warning

- [x] Click a slot on tomorrow's column, select the vacation or holiday ticket, click Save.
- [x] Verify no future-date warning appears. Entry saves directly.

## Scenario 4 — Cancel future-date warning keeps form open

- [x] Open the form for a future date, click Save to trigger the warning.
- [x] Click "Cancel" in the dialog.
- [x] Verify the dialog closes, the form is still open, and all field values are intact.

## Scenario 5 — Deadline warning on create (past cutoff)

- [x] Set config to simulate a passed deadline (see Config setup above).
- [x] Reload the page. Open a new-entry form for a date before the simulated deadline, click Save.
- [x] Verify the deadline warning dialog appears.
- [x] Confirm → verify the entry saves.

## Scenario 6 — Same-day deadline warning (entry start before cutoff, submitted after)

- [x] Simulate the deadline as "today at 1 hour ago" (e.g. dayOfWeek = today, hour = current hour - 1).
- [x] Create a new entry for today at a time before the cutoff (e.g. start time 2 hours ago), click Save.
- [x] Verify the deadline warning appears.

## Scenario 7 — No deadline warning for post-cutoff entries

- [x] With deadline simulation active, create an entry for today at a start time after the cutoff.
- [x] Verify no deadline warning appears.

## Scenario 8 — Deadline warning on delete (single entry)

- [x] With deadline simulation active, click an existing entry that starts before the deadline.
- [x] Click the Delete button in the form.
- [x] Verify the deadline warning appears before the existing delete-confirm overlay.
- [x] Confirm both dialogs and verify the entry is removed from the calendar.

## Scenario 9 — No deadline warning for delete of post-cutoff entry

- [x] Click an existing entry that starts after the simulated deadline, delete it.
- [x] Verify no deadline warning appears (only the normal delete confirmation).

## Scenario 10 — Deadline warning on drag-move (original in reported period)

- [x] With deadline simulation active, drag an entry from before the cutoff to after it (e.g. to tomorrow).
- [x] Verify the deadline warning appears before the move is applied.
- [x] Confirm → verify the entry moves to the new slot.

## Scenario 11 — Deadline warning on drag-move (new position in reported period)

- [x] Drag an entry from after the cutoff to a slot before the cutoff.
- [x] Verify the deadline warning appears.

## Scenario 12 — Deadline warning on resize

- [x] With deadline simulation active, resize (drag the bottom edge) an existing entry whose start is before the cutoff.
- [x] Verify the deadline warning appears before the resize is applied.

## Scenario 13 — Deadline feature disabled

- [x] Set `bookingDeadline.enabled: false` in `config.json`, reload.
- [x] Perform any save/edit/delete of an entry in a past period.
- [x] Verify no deadline warning appears.

## Scenario 14 — Both warnings fire in sequence (future date + deadline coincidence)

- [x] Simulate deadline = past cutoff. Create an entry for a far-future date (after the deadline). Verify only the future-date warning appears.
- [x] Create an entry for a past date (before the deadline). Verify only the deadline warning appears.
- [x] Confirmed: the practical "two warnings in sequence" case is closed-ticket → future-date (or closed-ticket → deadline), which fires naturally in normal use.

_Note: Both future-date + deadline warnings fire in sequence only when the date is in the future AND before the deadline — an unusual configuration. The spec guarantees future-date fires first._

## Scenario 15 — i18n: German locale

- [x] Switch browser language to German (or override locale in devtools).
- [x] Trigger a future-date warning and a deadline warning.
- [x] Verify all dialog text renders in German with no untranslated keys.

## Expected: docs updated

- [x] Open `docs/content.en.md` — verify a section describes both the future-date warning and the deadline warning.
- [x] Open `docs/content.de.md` — verify the same in German.
