# Quickstart / UAT: Bulk Multi-Select for Move and Delete

**Feature**: 028-bulk-select-move-delete
**Audience**: implementer + tester signing off UAT.
**Phase**: 1 (Design — also used as the script for the Playwright UI test).

This document walks every acceptance scenario and edge case from spec.md. Each step is independently verifiable.

---

## Prerequisites

- Logged in with a working Redmine API key.
- Three test issues to which the user can book time.
- A working dev server (or hosted instance) and the CORS proxy.
- Desktop viewport (≥ 768 px) for US1/US2; mobile viewport (`< 768 px`) for the gating check.

---

## US1 — Bulk Move (P1)

### S1. Shift-click to select multiple entries (FR-001, FR-002)

1. Navigate to a week with three entries on Monday.
2. Click the first entry **without** shift held → it opens the edit form (existing behaviour, SC-005). Close the form.
3. Shift-click the first entry → entry shows the `.fc-event--selected` outline; toolbar appears.
4. Shift-click the second and third entries → all three entries show the outline; toolbar shows `3 selected`.
5. Shift-click one of them again → that entry deselects; toolbar shows `2 selected`.
6. Click an empty area of the calendar (e.g., a free time slot) → all entries deselect, toolbar disappears (FR-007).

### S2. Bulk move +1 day (FR-004, US1 acceptance #2)

1. Re-select the three Monday entries via shift-click (`3 selected`).
2. Click the toolbar's `+1 day` button.
3. **Expect**: all three entries move to Tuesday at the **same start time-of-day** and the same duration. Calendar refreshes; banner shows `3 of 3 succeeded`.

### S3. Bulk move −1 day (US1 acceptance #3)

1. With the three Tuesday entries from S2, shift-click them and click `−1 day`.
2. **Expect**: all three move back to Monday with original times.

### S4. Empty-area click clears selection (US1 acceptance #4, FR-007)

1. Shift-click two entries.
2. Click an empty time slot.
3. **Expect**: outlines removed, toolbar hidden.

### S5. Week navigation clears selection (US1 acceptance #5, FR-008)

1. Shift-click two entries on the current week.
2. Click `Next week` (or press the right-arrow nav button).
3. **Expect**: navigating to next week shows entries without outlines and no toolbar; navigating back shows the previously-selected entries with NO outline (selection is gone, not just hidden).

### S6. Partial failure on bulk move (FR-010, SC-004, US1 acceptance #6)

**Setup**: stub Redmine to reject one of three update requests with a 422 (in Playwright via route interception; manually only if you have a known-locked period in the test instance).

1. Shift-click three entries; click `+1 day`.
2. **Expect**: banner reads `2 of 3 succeeded · 1 failed`. Two entries moved; one entry stayed put. The failed entry remains selected; the two successful entries are no longer in the selection. Re-clicking `+1 day` retries only the failed entry.

### S7. Single drag is unaffected (FR-009, US1 acceptance #7)

1. Have two entries selected on Monday.
2. Drag a non-selected Wednesday entry to Thursday (no shift held during drag).
3. **Expect**: only the Wednesday entry moves. The two Monday entries stay put and stay selected.

---

## US2 — Bulk Delete (P2)

### S8. Confirmation dialog states the count (US2 acceptance #1, FR-005)

1. Shift-click 5 entries.
2. Click toolbar `Delete`.
3. **Expect**: a confirmation dialog appears with localized text including the number `5` (e.g., `Delete 5 entries? This will delete 5 time entries from Redmine.`).

### S9. Confirm deletes all (US2 acceptance #2, FR-006)

1. From S8, click `Delete` (confirm).
2. **Expect**: all 5 entries removed from Redmine and from the calendar; toolbar hidden; banner reads `5 of 5 succeeded`.

### S10. Cancel preserves entries and selection (US2 acceptance #3, FR-006)

1. Shift-click 3 entries; click `Delete`; in the dialog, click `Cancel`.
2. **Expect**: dialog dismissed; all 3 entries still on the calendar; selection still shows `3 selected`.

### S11. Partial-failure on delete (US2 acceptance #4, SC-004)

**Setup**: stub Redmine to reject one of three deletes (404 or 403).
1. Shift-click 3 entries; click `Delete` → confirm.
2. **Expect**: banner reads `2 of 3 succeeded · 1 failed`. Two entries gone; one still on calendar and still selected.

### S12. Single-entry confirmation flow (US2 acceptance #5, Assumption)

1. Shift-click exactly 1 entry; click `Delete`.
2. **Expect**: same confirmation dialog with count `1` (no special-case bypass).

---

## Edge cases

### S13. Shift off-screen (Edge case)

1. Shift-click the last entry of the week (Friday, say); click `+1 day`.
2. **Expect**: move succeeds; that entry now lives on Saturday (or next-Monday, depending on view); if Saturday is hidden by workweek mode, the entry is no longer in the visible selection.

### S14. Empty selection action (Edge case)

1. Inspect the DOM — when the selection is empty, the toolbar should not exist or have `display: none`. There should be no way to invoke a bulk action with 0 entries.

### S15. Two entries collide after shift (Edge case)

1. Shift Mon-09:00 entry by +1 day onto Tue-09:00, where another entry already exists.
2. **Expect**: both moves succeed; the calendar renders the overlap visually. (Anomaly-detection from feature 029, when landed, would flag this — orthogonal.)

### S16. In-flight protection (FR-011)

1. Begin a bulk-move on 5 entries with throttled network.
2. Quickly click `Delete` while the move is still in flight.
3. **Expect**: toolbar shows the in-progress state (e.g., disabled buttons or a `Working…` label); no second batch is dispatched until the first completes.

### S17. Network drop mid-batch (Edge case)

1. Start a bulk-move on 5 entries, then disable the network after 2 succeed.
2. **Expect**: banner reads `2 of 5 succeeded · 3 failed: network error`. The 2 already-moved entries remain moved; the 3 failures stay selected.

### S18. Mobile gating (FR-012, SC-006)

1. Shrink the viewport to 360 × 640.
2. Shift-click an entry (using a desktop browser with shift held — simulating an edge case).
3. **Expect**: NO `.fc-event--selected` outline visible; NO `.bulk-toolbar` visible. The existing single-entry click flow opens the edit form. (CSS gate, not a JS gate — so the JS may have selected internally; only the visual surface is gated. This is an intentional simplification documented in research.md §R7.)

---

## Sign-off criteria

- All 18 scenarios above pass manually on desktop.
- S18 verified at 360 × 640.
- Vitest unit suites for `selection.js`, `bulk-actions.js`, and the orchestrator are all green.
- Playwright spec for this feature is green in CI.
- The pre-feature Playwright suites continue to pass without modification (SC-005).
- No console errors in any scenario.
