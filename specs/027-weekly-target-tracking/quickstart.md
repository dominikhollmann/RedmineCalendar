# Quickstart / UAT: Weekly Hours Target Tracking

**Feature**: 027-weekly-target-tracking
**Audience**: implementer running through the feature manually + tester signing off UAT.
**Phase**: 1 (Design — also used as the script for the Playwright UI test).

This document walks every acceptance scenario and edge case from spec.md. Each step is independently verifiable.

---

## Prerequisites

- Logged in with a working Redmine API key.
- `js/i18n.js` includes the six keys listed in research.md §R6 (EN+DE).
- `cfg.holidayTicket` and `cfg.breakTicket` configured in `config.json`.
- A test Redmine account with at least one workweek of bookable history, plus a known holiday-ticket and break-ticket issue.

---

## Smoke checks (US1, P1)

### S1. Indicator appears with target configured

1. Open Settings, set **Weekly hours** to `40`, save.
2. Navigate to a week with `8h` booked Mon and `8h` booked Tue (no other bookings).
3. **Expect** in the calendar header, immediately to the right of the week total:
   - `16 / 40h` (booked-vs-target).
   - `24h left` (remaining hours).
   - `3d` (remaining workdays — Wed, Thu, Fri assuming today is ≤ Wed).
4. The indicator visually matches the existing week-total font scale and colour family.

### S2. Met target — non-negative tone

1. Add bookings until the week totals exactly `40h`.
2. **Expect** `40 / 40h ✓` rendered with the success modifier (e.g., a green check or success-tone colour). No `Xh left` segment is shown.
3. No warning text ("over budget", etc.) anywhere.

### S3. Over target — calm tone

1. Add a `5h` entry on Friday so the week totals `45h`.
2. **Expect** `45 / 40h` rendered with the over-target modifier (subdued colour or a small `+5h` badge — implementer's choice within the spec). No scolding text.

### S4. Indicator hidden when target unset

1. In Settings, clear **Weekly hours** (delete the value), save.
2. **Expect** the calendar header looks identical to today's pre-feature behaviour: only `… h` week total, no target indicator. (Playwright screenshot diff against a baseline captured before this feature.)

---

## CRUD reactivity (FR-007, SC-002)

### S5. Add → indicator updates without reload

1. With **Weekly hours** = `40` and a partially filled week (say 16 / 40), add a `4h` entry.
2. **Expect** within 300 ms: indicator reads `20 / 40h`, `20h left`, with `remainingWorkdays` decremented if the day was previously empty.
3. No full page reload (verify by checking the network tab — only the entry POST + a refresh fetch).

### S6. Edit hours → indicator updates

1. Edit an existing `4h` entry to `6h`.
2. **Expect** booked total bumps by `+2h`, remaining decreases by `2h`. Workday count unchanged (day was already filled).

### S7. Delete entry → indicator updates

1. Delete the only entry on a workday.
2. **Expect** booked decreases by that entry's hours; **remainingWorkdays** increments by 1 if that day is `>= today`.

### S8. Move (drag) → indicator updates

1. Drag a 4h entry from Wednesday to Thursday.
2. **Expect** booked total unchanged; `remainingWorkdays` unchanged (one day went from filled→unfilled, the other from unfilled→filled). Day-totals update naturally.

### S9. Resize → indicator updates

1. Resize a 4h entry to 6h.
2. **Expect** same effect as S6.

---

## Past / future week handling

### S10. Past week — workday count suppressed (FR-004)

1. Navigate to last week (or any past week).
2. **Expect** booked-vs-target shown (e.g., `38 / 40h`). The `Xd` remaining-workdays segment is **not** rendered.

### S11. Future week — all workdays remaining

1. Navigate to a week after this one.
2. **Expect** `0 / 40h`, `40h left`, `5d` (assuming `weeklyHours = 40`).

---

## Edge cases

### S12. Workweek toggle does not change workday count

1. Toggle the calendar to "workweek" view (Mon–Fri only).
2. **Expect** `Xd` is the same as in full-week view (Sat/Sun are never in the count).
3. Add an `8h` entry on Saturday in full-week view.
4. **Expect** booked includes the `8h` (now `24 / 40h` if previously 16); workday count unchanged.

### S13. Holiday-ticket entry on a workday → counts as filled

1. Book `cfg.holidayTicket` on Wednesday with any duration (typical: 8h).
2. **Expect** Wednesday is **not** counted in `remainingWorkdays`. Booked includes the holiday hours (this is the existing behaviour of holiday-ticket entries — feature 027 does not change it).

### S14. Break-ticket entry contributes 0 to booked

1. Book `cfg.breakTicket` on Wednesday (synthetic zero-duration block, per feature 025).
2. **Expect** booked unchanged. `remainingWorkdays` unchanged (a break entry alone does not "fill" a day for target purposes).

### S15. Past day with 0h booked — not counted as remaining

1. Today is Wed; Mon and Tue have `0h` booked (worked 0 hours those days).
2. **Expect** `remainingWorkdays` includes only Wed/Thu/Fri (3 days). Past empty days are gone.

### S16. Mobile compact header (< 768 px)

1. Open dev-tools, set viewport to 360 × 640.
2. **Expect** indicator fits in the `.app-header` row without overflow or wrapping breaks.
3. Indicator content order (left-to-right): week total · `booked/target` · `Xh left` · `Yd`.

---

## Sign-off criteria

- All 16 scenarios above pass manually.
- Vitest unit suite for `computeWeekProgress` is green (24+ cases — see tasks.md).
- Playwright spec for this feature is green in CI.
- Visual diff against the pre-feature baseline shows no regression on the `weeklyHours unset` path (S4).
- No console errors thrown across any scenario.
