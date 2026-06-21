# Quickstart / UAT: Modal UX Improvements (047)

## Prerequisites

- Dev server running: `AI_API_KEY=... npm run dev` → open `https://localhost:3000`
- At least one Redmine time entry visible on the calendar (so the booking modal can be opened)
- Redmine credentials configured in Settings

---

## Scenario 1 — View toggle blocked while modal is open (Issue #244)

- [x] Click any calendar slot to open the booking modal.
- [x] Verify the modal backdrop covers the entire viewport including the toolbar area.
- [x] While the modal is open, attempt to click the Calendar/Planning view toggle button in the toolbar.
- [x] Verify that the view does **not** switch (calendar stays on the same view).
- [x] Press Escape to close the modal. Verify the view toggle is clickable again.

---

## Scenario 2 — Star icon on Last Used entries (Issue #241)

- [x] Log at least one time entry so the "Last used" list is non-empty.
- [x] Open the booking modal. Verify a star icon appears on each row in the **Last Used** column.
- [x] Click an unfilled star on a Last Used row. Verify the star fills and the entry now appears in the **Favourites** column.
- [x] Click the now-filled star again. Verify the star unfills and the entry disappears from Favourites.
- [x] Close and reopen the modal. Verify the Favourites column reflects the final state from the previous step.
- [x] Tab to a star icon using the keyboard and press Enter or Space. Verify the toggle activates.

---

## Scenario 3 — Last Used list shows up to 20 entries with scroll (Issue #243)

- [x] Log 21 distinct tickets across multiple time entries (or directly manipulate `localStorage.setItem('redmine_calendar_last_used', JSON.stringify([...20 items...]))` in the browser console for speed).
- [x] Open the booking modal. Verify the **Last Used** column shows 20 entries.
- [x] Verify the list is scrollable and all 20 entries are reachable by scrolling.
- [x] Verify no 21st entry is visible (oldest was evicted).
- [x] Revert the list to 3 entries via the console. Open the modal. Verify no scrollbar appears and the 3 entries display cleanly.

---

## Scenario 4 — Fast Mode OFF keeps modal open after ticket selection (Issue #242)

- [x] Open Settings (`/settings.html`). Verify a "Fast mode" checkbox is present under Calendar display.
- [x] Uncheck "Fast mode". Return to the calendar.
- [x] Open the booking modal and click any Favourite or search result.
- [x] Verify the ticket field is pre-filled but the modal **remains open**.
- [x] Add a comment in the comment field. Click Save (or press Enter). Verify the entry is saved and the modal closes.
- [x] Reopen the modal. Click a Favourite. Verify the modal still stays open (Fast Mode OFF is persisted).
- [x] Go to Settings, re-enable Fast Mode. Open the modal and click a Favourite. Verify the modal closes immediately (original behaviour restored).

---

## Scenario 5 — Accessibility regression (all stories)

- [x] Run `npm run test:ui` and confirm all `@axe-core/playwright` checks pass for the booking modal surface in both light and dark themes.
- [x] Tab through the full modal (including the new star icons and, if Fast Mode is OFF, the visible Save button path). Verify no focus trap, no missing labels.
