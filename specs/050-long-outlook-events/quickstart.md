# Quickstart / UAT Guide: Long Outlook Event Expansion (050)

## Prerequisites

- `npm run dev` running with `azureClientId: "demo"` in `config.json` (demo mode — no real Azure token needed)
- Weekly hours set to **40** in Settings (so each entry = 8 h)
- A Redmine instance available via the configured CORS proxy with at least one open issue

---

## Scenario 1 — Multi-day Outlook event creates weekday entries only (P1 core path)

- [x] Open the Planning View (click "Planning" in the toolbar)
- [x] Navigate to the demo **"Workshop"** event (the day after the 10-day "Company Holiday" ends) — the Outlook column shows it as a date range, e.g. `08.07.2026–11.07.2026 (4d)`
- [x] Drag the event from the Outlook column and drop it onto the Bookings column
- [x] Confirm the time-entry modal opens **exactly once**, with the source-event card showing the date range and the notice **"N Tage werden gebucht (Mo–Fr) ab folgendem Datum"** above a locked (non-editable) date
- [x] Fill in a ticket number and activity; submit the modal
- [x] Confirm one entry per **weekday** in the span appears in the Bookings column (weekends excluded)
- [x] Confirm each entry has duration = weekly hours ÷ 5 (e.g. `40 / 5` = **8 h**)
- [x] Confirm the toast message reads **"N entries booked"** (EN) or **"N Einträge gebucht"** (DE)

---

## Scenario 2 — Weekend days are skipped (P1 weekend exclusion)

- [x] Use a multi-day Outlook event that crosses a weekend (the demo **Workshop** spans a Saturday; the **Company Holiday** spans a full weekend)
- [x] Drag and drop it onto the Bookings column
- [x] Confirm the notice indicates the **weekday count** (e.g. "3 Tage" for the 4-day Workshop — Sat excluded)
- [x] Confirm only **weekday entries** are created (no Sat/Sun entries)
- [x] Confirm the toast reads **"N entries booked"** matching that weekday count

---

## Scenario 3 — Pre-mapped ticket bypasses modal (P2 silent path)

- [x] Use the demo **"Company Holiday"** event (its all-day `oof` subject auto-routes to `holidayTicket`)
- [x] Confirm the Outlook column classifies it as `planningCategory === 'bookable'` (bookable styling, no "needs-ticket" indicator)
- [x] Drag the multi-day event to Bookings
- [x] Confirm **no modal opens**
- [x] Confirm N weekday entries are created and the toast shows the count

---

## Scenario 4 — Single undo removes all entries atomically (FR-005)

- [x] Complete Scenario 1 or 2 (N entries created)
- [x] Press **Ctrl+Z** once
- [x] Confirm **all N entries disappear** from the Bookings column in one step
- [x] Confirm the toast reads **"N entries removed"** (or equivalent undo toast)
- [x] Press **Ctrl+Y** (redo) once
- [x] Confirm all N entries reappear

---

## Scenario 5 — Weekend-only event produces informational toast (FR-007)

- [ ] Use a Saturday-only Outlook event (or Sat–Sun span)
- [ ] Drag it to Bookings
- [ ] Confirm **no modal opens**, **no entries are created**
- [ ] Confirm the toast reads **"No weekday entries in this event — nothing booked"**

---

## Scenario 6 — Modal cancel discards the drop (edge case)

- [x] Drag a multi-day needs-ticket event (the demo **Workshop**) to Bookings
- [x] When the modal opens, click **Cancel**
- [x] Confirm no entries are created in Bookings
- [x] Confirm nothing is pushed to the undo stack (Ctrl+Z does not affect prior state)

---

## Scenario 7 — Weekly hours is mandatory in Settings + defaults to 40 (edge case)

- [ ] In Settings, clear the Weekly Hours field (or set it to 0) and click Save
- [ ] Confirm an inline error appears under the field (e.g. "Please enter your weekly hours (greater than 0).") and the settings are **not** saved
- [ ] Enter a valid value (e.g. 40) and confirm Save succeeds
- [ ] Separately, with no weekly hours ever stored, drag a multi-day Outlook event to Bookings and confirm it books using the **40h default** (8 h/day) — **no** error toast appears

---

## Scenario 8 — Single-day Outlook event passthrough (P3 regression)

- [ ] Use the demo "Daily Standup" event (single-day, timed)
- [ ] Drag it to Bookings
- [ ] Confirm the **existing single-entry flow** runs unchanged (no bulk logic triggered)
- [ ] Confirm the modal opens once and one entry is created on the current planning day

---

## Expected Outcomes Summary

| Scenario                | Entries created | Modal shown         | Toast                 |
| ----------------------- | --------------- | ------------------- | --------------------- |
| 5-day Mon–Fri drop      | 5               | Once                | "5 entries booked"    |
| Thu–Tue drop            | 4               | Once                | "4 entries booked"    |
| Pre-mapped ticket       | N               | Never               | "{N} entries booked"  |
| Undo after N-entry drop | 0 (all removed) | Never               | "N entries removed"   |
| Weekend-only drop       | 0               | Never               | "No weekday entries…" |
| Modal cancelled         | 0               | Once then cancelled | (none)                |
| Missing weekly hours    | N (uses 40h)    | Per path            | "N entries booked"    |
| Single-day event        | 1               | Once (existing)     | (existing)            |
