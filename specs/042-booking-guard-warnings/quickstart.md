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

- [ ] Set config to simulate a passed deadline (see Config setup above).
- [ ] Reload the page. Open a new-entry form for a date before the simulated deadline, click Save.
- [ ] Verify the deadline warning dialog appears.
- [ ] Confirm → verify the entry saves.

## Scenario 6 — Same-day deadline warning (entry start before cutoff, submitted after)

- [ ] Simulate the deadline as "today at 1 hour ago" (e.g. dayOfWeek = today, hour = current hour - 1).
- [ ] Create a new entry for today at a time before the cutoff (e.g. start time 2 hours ago), click Save.
- [ ] Verify the deadline warning appears.

## Scenario 7 — No deadline warning for post-cutoff entries

- [ ] With deadline simulation active, create an entry for today at a start time after the cutoff.
- [ ] Verify no deadline warning appears.

## Scenario 8 — Deadline warning on delete (single entry)

- [ ] With deadline simulation active, click an existing entry that starts before the deadline.
- [ ] Click the Delete button in the form.
- [ ] Verify the deadline warning appears before the existing delete-confirm overlay.
- [ ] Confirm both dialogs and verify the entry is removed from the calendar.

## Scenario 9 — No deadline warning for delete of post-cutoff entry

- [ ] Click an existing entry that starts after the simulated deadline, delete it.
- [ ] Verify no deadline warning appears (only the normal delete confirmation).

## Scenario 10 — Deadline warning on drag-move (original in reported period)

- [ ] With deadline simulation active, drag an entry from before the cutoff to after it (e.g. to tomorrow).
- [ ] Verify the deadline warning appears before the move is applied.
- [ ] Confirm → verify the entry moves to the new slot.

## Scenario 11 — Deadline warning on drag-move (new position in reported period)

- [ ] Drag an entry from after the cutoff to a slot before the cutoff.
- [ ] Verify the deadline warning appears.

## Scenario 12 — Deadline warning on resize

- [ ] With deadline simulation active, resize (drag the bottom edge) an existing entry whose start is before the cutoff.
- [ ] Verify the deadline warning appears before the resize is applied.

## Scenario 13 — Deadline feature disabled

- [ ] Set `bookingDeadline.enabled: false` in `config.json`, reload.
- [ ] Perform any save/edit/delete of an entry in a past period.
- [ ] Verify no deadline warning appears.

## Scenario 14 — Both warnings fire in sequence (future date + deadline coincidence)

- [ ] Simulate deadline as "next week Friday at 22:00 in the past" (config: any past cutoff that is still before "next week"). This can be tricky to set up; alternatively test with the deadline set to a future week's cutoff (so deadline is recent past) and create an entry for a far-future date that is still after the deadline.
- [ ] Actually, the easiest setup: deadline = yesterday at 10pm. Create an entry for next Monday (future date, and also after the deadline — so only future-date warning applies).
  - Verify only future-date warning fires.
- [ ] Next, create an entry for last Thursday (past deadline, past date — not future, so no future-date warning; but deadline warning fires).
  - Verify only deadline warning fires.
- [ ] Finally, create an entry for next week (past the deadline set next week scenario).

_Note: Both warnings fire simultaneously only when the date is in the future AND before the deadline — an unusual configuration. The spec guarantees future-date fires first; manually confirm sequencing if your config permits both._

## Scenario 15 — i18n: German locale

- [ ] Switch browser language to German (or override locale in devtools).
- [ ] Trigger a future-date warning and a deadline warning.
- [ ] Verify all dialog text renders in German with no untranslated keys.

## Expected: docs updated

- [ ] Open `docs/content.en.md` — verify a section describes both the future-date warning and the deadline warning.
- [ ] Open `docs/content.de.md` — verify the same in German.
