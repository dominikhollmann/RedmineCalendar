# Quickstart / UAT Guide: Long Outlook Event Expansion (048)

## Prerequisites

- `npm run dev` running with `azureClientId: "demo"` in `config.json` (demo mode — no real Azure token needed)
- Weekly hours set to **40** in Settings (so each entry = 8 h)
- A Redmine instance available via the configured CORS proxy with at least one open issue

---

## Scenario 1 — Multi-day Outlook event creates weekday entries only (P1 core path)

- [ ] Open the Planning View (click "Planning" in the toolbar)
- [ ] Navigate to a **Monday** — observe the Outlook column shows the demo "Bank Holiday" all-day event
- [ ] In demo mode, edit the demo event templates so one event spans **Monday to the following Friday** (or use a real Outlook account with a 2-week all-day event)
- [ ] Drag the event from the Outlook column and drop it onto the Bookings column
- [ ] Confirm the time-entry modal opens **exactly once** and the modal title contains "5 days"
- [ ] Fill in a ticket number and activity; submit the modal
- [ ] Confirm **5 time entries** appear in the Bookings column (Mon–Fri × 1 week)
- [ ] Confirm each entry has duration = `40 / 5` = **8 h**
- [ ] Confirm the toast message reads **"5 entries booked"** (EN) or **"5 Einträge gebucht"** (DE)

---

## Scenario 2 — Weekend days are skipped (P1 weekend exclusion)

- [ ] Use an Outlook event spanning **Thursday to the following Tuesday** (5 calendar days, 4 weekdays)
- [ ] Drag and drop it onto the Bookings column
- [ ] Confirm the modal title indicates **"4 days"**
- [ ] Confirm exactly **4 entries** are created: Thu, Fri, Mon, Tue (no Sat/Sun entries)
- [ ] Confirm the toast reads **"4 entries booked"**

---

## Scenario 3 — Pre-mapped ticket bypasses modal (P2 silent path)

- [ ] Use a "Holiday" event whose subject triggers `holidayTicket` auto-routing (e.g. `"Urlaub"` or `"Vacation"`)
- [ ] Confirm the Outlook column classifies it as `planningCategory === 'bookable'` (covered badge, no "needs-ticket" indicator)
- [ ] Drag the multi-day event to Bookings
- [ ] Confirm **no modal opens**
- [ ] Confirm N weekday entries are created and the toast shows the count

---

## Scenario 4 — Single undo removes all entries atomically (FR-005)

- [ ] Complete Scenario 1 or 2 (N entries created)
- [ ] Press **Ctrl+Z** once
- [ ] Confirm **all N entries disappear** from the Bookings column in one step
- [ ] Confirm the toast reads **"N entries removed"** (or equivalent undo toast)
- [ ] Press **Ctrl+Y** (redo) once
- [ ] Confirm all N entries reappear

---

## Scenario 5 — Weekend-only event produces informational toast (FR-007)

- [ ] Use a Saturday-only Outlook event (or Sat–Sun span)
- [ ] Drag it to Bookings
- [ ] Confirm **no modal opens**, **no entries are created**
- [ ] Confirm the toast reads **"No weekday entries in this event — nothing booked"**

---

## Scenario 6 — Modal cancel discards the drop (edge case)

- [ ] Drag a multi-day needs-ticket event to Bookings
- [ ] When the modal opens, click **Cancel**
- [ ] Confirm no entries are created in Bookings
- [ ] Confirm nothing is pushed to the undo stack (Ctrl+Z does not affect prior state)

---

## Scenario 7 — Missing weekly hours shows error toast (edge case)

- [ ] In Settings, clear the Weekly Hours field (set to 0 or remove the value)
- [ ] Return to Planning View; drag a multi-day Outlook event to Bookings
- [ ] Confirm an error toast appears: **"Configure weekly hours in Settings first"**
- [ ] Confirm no entries are created

---

## Scenario 8 — Single-day Outlook event passthrough (P3 regression)

- [ ] Use the demo "Daily Standup" event (single-day, timed)
- [ ] Drag it to Bookings
- [ ] Confirm the **existing single-entry flow** runs unchanged (no bulk logic triggered)
- [ ] Confirm the modal opens once and one entry is created on the current planning day

---

## Expected Outcomes Summary

| Scenario | Entries created | Modal shown | Toast |
|----------|----------------|-------------|-------|
| 5-day Mon–Fri drop | 5 | Once | "5 entries booked" |
| Thu–Tue drop | 4 | Once | "4 entries booked" |
| Pre-mapped ticket | N | Never | "{N} entries booked" |
| Undo after N-entry drop | 0 (all removed) | Never | "N entries removed" |
| Weekend-only drop | 0 | Never | "No weekday entries…" |
| Modal cancelled | 0 | Once then cancelled | (none) |
| Missing weekly hours | 0 | Never | "Configure weekly hours…" |
| Single-day event | 1 | Once (existing) | (existing) |
