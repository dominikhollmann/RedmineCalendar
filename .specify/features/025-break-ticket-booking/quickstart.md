# Quickstart UAT: Break-Ticket Booking

**Feature**: 025 | **Audience**: User performing acceptance testing after implementation

This script walks through the user-facing acceptance scenarios in spec.md. Each section ends with a pass/fail checkbox.

---

## Prerequisites

- [ ] `config.json` updated by admin to include `breakTicket: <ID>` and `holidayTicket: <ID>` (numeric Redmine issue IDs that exist and are open).
- [ ] Dev server running: `npm run dev`. App reachable at https://localhost:3000. Cert accepted at https://localhost:8010 and https://localhost:8011.
- [ ] User logged in to Outlook (MSAL flow from feature 019) so the booking flow has live calendar data.
- [ ] At least one Redmine time entry already exists for today (any ticket, any time slot) so totals are non-trivial.

---

## UAT-1 — Settings page surface (User Story 3)

1. Open https://localhost:3000/settings.html.
2. Verify the page contains:
   - [ ] Redmine server URL field
   - [ ] Auth method (API key OR username/password)
   - [ ] Working hours start + end
   - [ ] Weekly hours
   - [ ] **NO** field labelled "Holiday ticket"
   - [ ] **NO** field labelled "Break ticket"
3. Save settings (whatever values are present). Reload the page — values persist.

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-2 — Legacy localStorage cleanup (FR-007)

1. Open browser DevTools → Application → localStorage on https://localhost:3000.
2. Manually create a key `redmine_calendar_holiday_ticket` with value `12345`.
3. Reload any page (calendar OR settings).
4. Re-check localStorage:
   - [ ] The key `redmine_calendar_holiday_ticket` is GONE.
   - [ ] No console error.

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-3 — AI classifies a non-work event (User Story 1, AS-1)

Setup: an Outlook calendar event today titled "Doctor Appointment" from 14:00–15:00, no `sensitivity` flag (i.e. NOT marked Private).

1. Open the calendar, click the chatbot, type "Book my time for today" (or equivalent).
2. AI replies with a proposal summary listing today's events.
3. Verify in the summary:
   - [ ] "Doctor Appointment" is listed.
   - [ ] Its proposed ticket shows the break ticket's number AND title (FR-011).
   - [ ] It carries a "Break (0h)" indicator (FR-010).
4. Confirm the entry through the modal:
   - [ ] The modal's hours field is `0` and disabled (FR-012).
   - [ ] Click Save → success.
5. Open the calendar:
   - [ ] A 0-hour break entry appears at 14:00 with the synthetic 15-minute display block.
   - [ ] The day's "booked work hours" total is unchanged compared to before.

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-4 — Sensitivity flag is ignored (User Story 1, AS-4)

Setup: an Outlook event today titled "1:1 with Manager #2097" from 11:00–11:30, marked **Private** in Outlook's sensitivity dropdown. (Use a real ticket #2097 in your Redmine — replace with an existing ID.)

1. Run "Book my time for today".
2. Verify in the summary:
   - [ ] The event appears (was filtered today by 019; now visible).
   - [ ] Proposed ticket is **2097** (the extracted ticket from the title), NOT the break ticket.
   - [ ] Hours are computed from the event slot (0.5h), not 0.
3. Confirm the entry → modal opens with ticket 2097, hours editable.

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-5 — User overrides classification (User Story 2, AS-3)

Setup: an Outlook event today titled "Sprint Lunch Sync" from 12:00–13:00 — a real-work meeting the AI may mis-classify as non-work.

1. Run "Book my time for today".
2. If the AI classified it as break (Break (0h) indicator visible):
   - [ ] In the modal, change the ticket to a work ticket of your choice.
   - [ ] Hours field re-enables (FR-012).
   - [ ] Hours auto-fills from the event's slot (1h) OR you set it manually.
   - [ ] Save → entry created on the work ticket with the correct hours.
3. If the AI classified it as work:
   - This UAT is informational only — try a clearer "Coffee with Bob" subject and repeat.

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-6 — Ticket extraction precedence (Q5)

Setup: an Outlook event titled "Lunch Sync #1234" — non-work-sounding subject WITH a ticket number.

1. Run "Book my time for today".
2. Verify:
   - [ ] Proposed ticket is **1234** (extraction wins).
   - [ ] Hours are NOT 0 — they're computed from the event slot.
   - [ ] The "Break (0h)" indicator does NOT appear.

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-7 — Manual ad-hoc break entry (FR-012, manual path)

1. Click an empty 30-minute slot on tomorrow at 10:00.
2. The time-entry modal opens with hours auto-computed from the slot (e.g. 0.5h).
3. In the ticket picker, search for the break ticket and select it.
4. Verify:
   - [ ] Hours field updates to `0` AND becomes disabled (FR-012).
   - [ ] Hours field has the visual "locked" treatment (greyed out).
5. Change the ticket back to a work ticket of your choice.
6. Verify:
   - [ ] Hours field re-enables.
   - [ ] Previous hours value (0.5h) is restored OR re-derived from the slot.
7. Set ticket back to break ticket, click Save.
8. Verify:
   - [ ] Calendar shows a 0h break block at 10:00 tomorrow.
   - [ ] Day total unchanged.

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-8 — Holiday booking gets workStart anchor (FR-013)

Setup: an Outlook all-day event titled "Bank Holiday" today (use a future date if today is mid-week and you don't want a real Redmine entry).

1. Run "Book my time for today" (or your test date).
2. AI proposes the holiday on the configured `holidayTicket` at dailyHours.
3. Confirm in the modal:
   - [ ] Start time field is `09:00` (your working-hours start, OR fallback if unset).
   - [ ] Hours field is dailyHours (e.g. 8 if weekly hours = 40).
4. Save → entry appears on the calendar in the time grid (NOT just in the all-day row), starting at 09:00.

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-9 — `breakTicket` unset (FR-004)

1. Edit `config.json` to remove the `breakTicket` field. Restart the dev server.
2. Run "Book my time for today" on a day with a clearly non-work event (e.g. Lunch).
3. Verify:
   - [ ] AI emits a one-time "break-routing disabled" notice in the chat.
   - [ ] The non-work event is NOT silently dropped — it appears in the proposal.
   - [ ] The AI either asks for a ticket OR (if the title has `#1234`) proposes the extracted ticket.
4. Re-add `breakTicket` to `config.json` and restart for subsequent UATs.

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-10 — Calendar review value (SC-004)

After running UAT-3, UAT-7, UAT-8, look at yesterday's (or today's) calendar.

1. For every blocked time slot ≥15 minutes, identify what occupied it. Each slot should be covered by exactly one of:
   - [ ] A work time entry (hours > 0)
   - [ ] A holiday entry (hours = dailyHours)
   - [ ] A break entry (hours = 0, displayed with the synthetic 15-minute block + "Break (0h)" treatment)
2. There should be NO unexplained gaps that correspond to events you booked through this flow.

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## Sign-off

- [ ] All UATs pass.
- [ ] No unexpected console errors during the flow.
- [ ] Performance: each booking action (modal open, ticket switch, save) feels under ~300 ms (Constitution II).

**Tested by**: ____________________   **Date**: __________
