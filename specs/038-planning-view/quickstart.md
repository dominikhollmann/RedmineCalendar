# Quickstart & UAT Validation: Planning View

**Branch**: `038-planning-view`  
**Date**: 2026-06-08

---

## Prerequisites

1. Run `npm run dev` and open `https://localhost:3443` (or the configured port).
2. Authenticate with valid Redmine credentials in Settings.
3. In `config.json`, set `azureClientId: "demo"` to use demo Outlook events — no real Microsoft
   account required. The demo day always shows: Daily Standup #2097 (09:00–09:15), Sprint Planning
   #2097 (09:30–10:30), Call with Customer (11:03–11:48), Lunch with Team (12:00–13:00), Code
   Review #1456 (14:00–14:45), and a Bank Holiday all-day event.
4. Use a desktop browser (≥ 768 px viewport). All Planning View tests require a desktop viewport.

---

## Scenario 1 — Side-by-Side View Renders

- [ ] Click the Planning View toggle button (floating button, bottom-right corner of the screen).
- [ ] Verify the classic calendar is hidden and the Planning View appears with two columns: "Bookings" on the left and "Outlook" on the right.
- [ ] Verify the Bookings column shows today's existing Redmine time entries (or an empty-state message if none exist).
- [ ] Verify the Outlook column header shows "Outlook" and renders demo events with coloured classification badges.
- [ ] Verify "Daily Standup #2097" and "Code Review #1456" are styled as bookable events.
- [ ] Verify "Call with Customer" is styled as a needs-ticket event (different colour).
- [ ] Verify "Lunch with Team" is styled as an excluded event and appears visually distinct.
- [ ] Verify the app toolbar (docs, chatbot, settings, feedback) remains visible above the Planning View.

---

## Scenario 2 — Booking a Bookable Event (No Modal)

- [ ] With the Planning View open on a day that has the demo events, drag "Daily Standup #2097" from the Outlook column to the Bookings column at approximately the 09:00 slot.
- [ ] Verify no booking modal opens.
- [ ] Verify a new Redmine time entry appears immediately in the Bookings column, starting at 09:00, ending at 09:15, with issue #2097.
- [ ] Verify a success toast appears with the booking confirmation message.

---

## Scenario 3 — Booking a Needs-Ticket Event (Modal Opens)

- [ ] Drag "Call with Customer" from the Outlook column to the Bookings column.
- [ ] Verify the booking modal opens and displays the event title "Call with Customer" and its time range (11:00–11:45 rounded to quarter-hours).
- [ ] Verify the start and end time fields are pre-filled with the rounded times.
- [ ] Verify the issue field is empty and the submit button is disabled (or shows a validation error) until an issue is selected.
- [ ] Search for and select a valid Redmine issue, then submit the form.
- [ ] Verify the new time entry appears in the Bookings column and the modal closes.

---

## Scenario 4 — Excluded Events Cannot Be Selected or Dragged

- [ ] Verify the "Lunch with Team" event card in the Outlook column has the excluded visual style (e.g., muted colour, distinct icon).
- [ ] Click "Lunch with Team" and verify it does NOT become selected (no selection highlight appears).
- [ ] Shift-click "Lunch with Team" and verify it still cannot be selected.
- [ ] Attempt to drag "Lunch with Team" to the Bookings column and verify no entry is created.

---

## Scenario 5 — Multi-Select and Batch Drag

- [ ] Click "Daily Standup #2097" to select it (it becomes visually highlighted).
- [ ] Shift-click "Code Review #1456" to add it to the selection (both are highlighted).
- [ ] Drag either selected card to the Bookings column.
- [ ] Verify both time entries are created immediately in the Bookings column (both are bookable).
- [ ] Verify a summary message reports "2 created, 0 failed" (or equivalent).
- [ ] Click an empty area of the Outlook column and verify the selection is cleared.

---

## Scenario 6 — Batch with Mixed Classifications

- [ ] Click "Daily Standup #2097" (bookable) to select it.
- [ ] Shift-click "Call with Customer" (needs-ticket) to add it.
- [ ] Drag to the Bookings column.
- [ ] Verify "Daily Standup #2097" is created immediately (no modal).
- [ ] Verify the booking modal opens for "Call with Customer" with its time pre-filled.
- [ ] Complete or cancel the modal and verify the batch outcome report matches what happened.

---

## Scenario 7 — Toggle Back Restores Calendar to Correct Week

- [ ] Open the Planning View for today (the toggle button click).
- [ ] Navigate to a day in a different week using the "next day" button several times.
- [ ] Click the toggle button to return to the classic calendar.
- [ ] Verify the classic calendar shows the week containing the last Planning Day you visited (not the original week).
- [ ] Verify the classic calendar's view type (week/day) is restored to what it was before entering the Planning View.

---

## Scenario 8 — Day-Column Header Double-Click

- [ ] Return to the classic calendar week view.
- [ ] Double-click the column header of a specific day (e.g., Wednesday's header).
- [ ] Verify the Planning View opens scoped to that specific day (the date displayed matches the day you double-clicked, not today).

---

## Scenario 9 — Day Navigation and Mo–Fr Toggle

- [ ] Enable the Mo–Fr ("Only show Mo–Fr") toggle in the classic calendar toolbar, then open the Planning View.
- [ ] Navigate to a Friday using the "next day" button.
- [ ] Press "next day" and verify the view jumps to the following Monday (Saturday and Sunday are skipped).
- [ ] Press "previous day" and verify the view jumps back to Friday (skipping the weekend).
- [ ] Navigate to a weekend day by pressing "Today" when it is actually a weekend — verify the Planning View shows the current date even though Mo–Fr is active.

---

## Scenario 10 — Mobile: Feature Entirely Hidden

- [ ] Resize the browser to a mobile viewport (< 768 px wide) using browser developer tools.
- [ ] Verify the Planning View toggle button (FAB) is not visible anywhere on the page.
- [ ] Verify the classic calendar renders normally on the mobile viewport with no Planning View artifacts.

---

## Scenario 11 — Greyout of Already-Covered Events

- [ ] Ensure at least one Redmine time entry exists for today that exactly covers the time range of a demo Outlook event (e.g., create a 09:00–09:15 entry for any issue to cover "Daily Standup #2097").
- [ ] Open the Planning View for today.
- [ ] Verify the "Daily Standup #2097" event card appears in a greyed-out style.
- [ ] Verify other events (not fully covered by bookings) are NOT greyed out.
- [ ] Verify the greyed-out event can still be dragged and re-booked (the greyout is informational only).

---

## Scenario 12 — Feedback Button in Toolbar

- [ ] Open the app with `feedbackEmail` configured in `config.json`.
- [ ] Verify the feedback button appears in the app header toolbar (not as a floating button at the bottom-right).
- [ ] Verify the bottom-right corner shows only the Planning View toggle FAB (no overlapping buttons).
- [ ] Click the feedback button and verify the feedback dialog opens normally.

---

## Scenario 13 — Settings: Disable Outlook Source

- [ ] Open Settings and locate the "Planning View Sources" section.
- [ ] Toggle the Outlook source to disabled and save.
- [ ] Open the Planning View.
- [ ] Verify no Outlook column appears (the Planning View shows only the Bookings column, or an appropriate single-column layout).
- [ ] Re-enable Outlook in Settings and verify the Outlook column reappears in the Planning View.

---

## Scenario 14 — Outlook Not Connected

- [ ] Remove or clear the MSAL/Outlook session (or set `azureClientId` to a value other than `'demo'` with no active sign-in).
- [ ] Open the Planning View.
- [ ] Verify the Outlook column shows a prompt to connect Outlook (not an error page or blank column).
- [ ] Verify the Bookings column still loads and functions independently.

---

## Scenario 15 — Working Hours Toggle Applies to Planning View

- [ ] Configure working hours in Settings (e.g., 09:00–18:00) and enable the "Only show working hours" toggle in the calendar toolbar.
- [ ] Open the Planning View.
- [ ] Verify the Bookings column's time grid starts at 09:00 and ends at 18:00 (matching the working hours range).
- [ ] Verify the Outlook events outside the working hours range are not shown (or shown in the all-day row).
