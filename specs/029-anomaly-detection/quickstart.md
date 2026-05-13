# Quickstart / UAT: Time Entry Anomaly Detection

**Feature**: 029-anomaly-detection
**Audience**: implementer + tester signing off UAT.
**Phase**: 1 (Design — also used as the script for the Playwright UI test).

---

## Prerequisites

- Logged in with a working Redmine API key.
- `cfg.breakTicket` and `cfg.holidayTicket` configured in `config.json`.
- Two test issues to which the user can book time.
- Desktop AND mobile (`< 768 px`) viewports for the visibility checks.

---

## US1 — Catch typo-style very short entries (P1)

### S1. Indicator on a 0.1h entry (acceptance #1)

1. Create a time entry with duration `0.1h` on any non-break ticket.
2. **Expect**: the entry renders with a small `⚠` badge in its top-right corner. The badge does NOT push aside the existing issue/time/comment text (FR-008, FR-011).

### S2. Reason on hover/click (acceptance #2)

1. Hover the badge from S1.
2. **Expect**: a localized reason appears: `Very short entry — possible typo (0.1h)` (or DE equivalent).
3. On a touch device (or in a Playwright touch viewport), tap the badge.
4. **Expect**: the same tooltip appears and stays visible until tapped again or the entry is closed.

### S3. Edit removes the indicator (acceptance #3, FR-005)

1. Open the entry and change duration to `1.0h`; save.
2. **Expect**: badge disappears within 300 ms, no page reload, no console errors.

### S4. Resize triggers the indicator (acceptance #4)

1. With a 1h entry, drag-resize it down to 0.1h (6 minutes).
2. **Expect**: badge appears within 300 ms of the resize completing, no page reload.

### S5. Independent indicators (acceptance #5)

1. Create three different 0.1h entries on different days.
2. **Expect**: each entry shows its own badge — no aggregation, no shared tooltip.

---

## US2 — Catch overlapping entries (P2)

### S6. Two overlapping entries get badges (acceptance #1)

1. On Monday, create entry A: 14:00–15:00 on TICKET-A.
2. Create entry B: 14:30–15:30 on TICKET-B.
3. **Expect**: both A and B render with the `⚠` badge.

### S7. Tooltip names the overlap (acceptance #2)

1. Hover or click A's badge.
2. **Expect**: tooltip reads `Overlaps with 14:30–15:30 entry on the same day` (or DE equivalent).
3. Hover B's badge.
4. **Expect**: tooltip reads `Overlaps with 14:00–15:00 entry on the same day`.

### S8. Synthetic break block does not trigger overlap (acceptance #3, FR-003, SC-006)

1. With entry A on Monday 14:00–15:00 and a synthetic `cfg.breakTicket` entry at 14:30 (zero-duration block).
2. **Expect**: neither A nor the break block shows an overlap badge. (A may still show a `very-short-entry` badge if its duration is ≤ 0.1h, but that's the other rule.)

### S9. Edit removes overlap (acceptance #4, FR-005)

1. From S6, edit B to start at 16:00.
2. **Expect**: both A's and B's overlap badges disappear within 300 ms, no page reload.

### S10. Back-to-back is NOT overlap (acceptance #5)

1. Create entry A: 14:00–15:00; entry B: 15:00–16:00.
2. **Expect**: neither A nor B shows an overlap badge. Strict intersection only.

---

## Edge cases

### S11. Entry matches multiple rules (Edge case)

1. Create a 0.05h entry that overlaps another entry on the same day.
2. **Expect**: a single `⚠` badge on the entry. Tooltip lists BOTH reasons (one for very-short, one for overlap).

### S12. Multi-day entry split at midnight (Edge case)

1. Create a 23:00–01:00 entry that the renderer splits into two day-blocks.
2. **Expect**: if the underlying entry triggers any rule, both visual halves show the `⚠` badge with the same tooltip text.

### S13. Holiday-ticket entry not flagged (Edge case)

1. Create an 8h entry on `cfg.holidayTicket`.
2. **Expect**: no badge — duration is normal, no overlap unless it actually overlaps something else (FR-003 / Edge case bullet).

### S14. Synthetic break block is never flagged (FR-003)

1. Create a synthetic break block (zero-duration on `cfg.breakTicket`).
2. **Expect**: never any badge, ever. Verified by Playwright in S8.

### S15. Tooltip dismisses with the entry (Edge case)

1. Click an entry's anomaly badge; tooltip opens.
2. Delete the entry from the toolbar (or via the entry-edit form) while the tooltip is open.
3. **Expect**: tooltip and entry both disappear together — no orphan tooltip remains.

---

## Network invariant (SC-003)

### S16. Open dev-tools → Network tab → Filter to XHR/Fetch.

1. Trigger every rule by creating, editing, and deleting entries.
2. **Expect**: anomaly evaluation generates ZERO additional requests beyond the existing CRUD round-trips. The Playwright spec asserts this by counting requests during a controlled scenario.

---

## Mobile (< 768 px)

### S17. Badge visibility on mobile (FR-008)

1. Set viewport to 360 × 640.
2. Repeat S1, S6.
3. **Expect**: badges visible on mobile — small but legible, in the same corner as desktop. Tooltip opens on tap and dismisses on second tap or empty-area tap.

---

## Sign-off criteria

- All 17 scenarios above pass.
- Vitest unit suite for `js/anomalies.js` is green (≥ 20 cases — see tasks.md).
- Playwright spec is green in CI.
- Network panel during anomaly events shows zero new GET/POST/PUT/DELETE traffic (SC-003).
- Existing single-entry interactions unchanged (SC-004 — existing test suites pass).
- No console errors in any scenario.
