# Quickstart: ArbZG Compliance Warnings (010)

Manual acceptance checklist. Execute every item before marking the feature done.
Covers all Functional Requirements (FR-001 to FR-008) and User Story acceptance scenarios.

---

## Setup

- [x] Open the calendar in the browser.
- [x] Navigate to a week where you can add test entries (use a test project if possible).

---

## FR-001 — Daily limit (>10 h triggers badge)

- [x] Log time entries totalling **more than 10 hours** on a single day (e.g. 5 h + 6 h = 11 h on Monday).
- [x] Verify a `⚠` badge appears on **Monday's column header** next to the day total.
- [x] Delete one entry so the day total drops to **≤10 h**.
- [x] Verify the `⚠` badge **disappears** from Monday's header (SC-002, acceptance scenario 5).

---

## FR-002 — Weekly limit (>48 h triggers badge on week total)

- [x] Log entries so the **week total exceeds 48 hours**.
- [x] Verify a `⚠` badge appears on the **week total** in the app header.
- [x] Reduce the total to ≤48 h.
- [x] Verify the week-total badge **disappears**.

---

## FR-003 — Rest period (<11 h gap triggers badge)

- [x] Log an entry on **Monday with a late start time** (e.g., a comment `[start:23:00]`) and 1 h duration (so end ~00:00).
- [x] Log an entry on **Tuesday with an early start time** (e.g., `[start:08:00]`).
- [x] The rest gap is 8 h (< 11 h) → verify a `⚠` badge appears on **Tuesday's column header**.
- [x] Remove the Tuesday entry or adjust times so the gap is ≥11 h.
- [x] Verify the rest-period badge **disappears** from Tuesday.

---

## FR-004 — Tooltip content

- [x] Trigger the **daily limit** badge (>10 h on one day).
- [x] **Hover** the `⚠` badge → tooltip appears with rule name, observed hours, and allowed hours.
- [x] Verify tooltip text includes "10" (allowed) and the observed value.
- [x] **Click** the badge → tooltip still visible (or appears if hover not tested).
- [x] Move the mouse away → tooltip **disappears**.

- [x] Trigger the **weekly limit** badge (>48 h total).
- [x] Hover the week-total badge → tooltip shows weekly rule, observed, and allowed (48).

- [x] Trigger a **rest period** badge.
- [x] Hover → tooltip shows rest period rule, observed gap hours, and "11".

- [x] Trigger a **Sunday** badge (see FR-007 below).
- [x] Hover → tooltip mentions Sunday work and cites ArbZG §9.

- [x] Trigger a **holiday** badge (see FR-007 below).
- [x] Hover → tooltip mentions the holiday name and cites ArbZG §9.

---

## FR-005 — Warnings are informational only

- [x] With a daily-limit badge visible, open the time entry form for that day.
- [x] Verify the form opens normally — no block, no extra warning in the form.
- [x] Save the entry → calendar refreshes normally.

---

## FR-006 — No additional API calls

- [ ] Open DevTools → Network tab.
- [ ] Navigate to a week that triggers warnings.
- [ ] Verify **no extra XHR/fetch requests** are fired beyond the standard week-load calls.

---

## FR-007 — Sunday and public holiday warnings

**Sunday**:
- [x] Navigate to a week that contains a Sunday.
- [x] Log any time entry on the **Sunday** column.
- [x] Verify a `⚠` badge appears on that **Sunday's column header**.
- [x] Hover → tooltip mentions Sunday work (§9 ArbZG).

**Public holiday (Karfreitag or another fixed holiday)**:
- [x] Navigate to a week containing a German federal holiday (e.g. week of Easter or 01-01, 05-01, 10-03, 12-25, 12-26).
- [x] Log any time entry on the **holiday day**.
- [x] Verify a `⚠` badge appears on that **day's column header**.
- [x] Hover → tooltip names the holiday (e.g. "Karfreitag") and cites §9.

---

## FR-008 — Localization

- [x] Switch browser language to **German** (or set `navigator.languages` override in DevTools).
- [x] Reload the calendar and trigger a daily-limit warning.
- [x] Verify the tooltip text is in **German** (e.g. "Tageshöchstarbeitszeit").

- [x] Switch browser language to **English**.
- [x] Reload and trigger the same warning.
- [x] Verify tooltip text is in **English** (e.g. "Daily limit exceeded").

---

## FR-009 — Break check (§4 ArbZG)

- [x] Log entries on one day totalling **more than 6 hours**, all with start times, such that the unbooked gap between first entry start and last entry end is **less than 30 minutes** (e.g. `[start:08:00]` 3 h + `[start:11:10]` 3.5 h = 6.5 h total, gap = 10 min).
- [x] Verify a `⚠` badge appears on that **day's column header**.
- [x] Hover the badge → tooltip mentions insufficient break and shows observed vs. required minutes.

- [x] Log entries totalling **more than 9 hours** where the unbooked gap is **less than 45 minutes**.
- [x] Verify the badge appears and tooltip shows 45 min required.

- [x] Adjust entries so the unbooked gap meets the requirement (≥30 min for >6 h, ≥45 min for >9 h).
- [x] Verify the break badge **disappears**.

- [x] Log entries >6 h on a day **without** any `[start:HH:MM]` tags.
- [x] Verify **no break badge** appears (check skipped without start times).

**Continuous work limit**:
- [x] Log entries on one day with start times where a single uninterrupted stretch exceeds 6 h (e.g. `[start:08:00]` 4 h + `[start:12:00]` 3 h = 7 h continuous, no gap between them).
- [x] Verify a `⚠` badge appears on that day's column header.
- [x] Hover → tooltip mentions uninterrupted working time exceeds 6 h and cites ArbZG §4.

- [x] Add a gap of at least 1 minute between the two entries (e.g. change second to `[start:12:05]`).
- [x] Verify the continuous-work badge **disappears** (a gap now breaks the stretch).

---

## Acceptance Scenario 5 — Warning removed after correction

- [x] Log 11 h on one day → badge appears.
- [x] Edit entries to bring total to 10 h or below.
- [x] Verify badge **disappears** after the calendar refreshes.

---

## Acceptance Scenario 6 — No false rest-period warning without start times

- [ ] Log entries on two consecutive days **without** any `[start:HH:MM]` tag and without Easy Redmine start-time fields.
- [ ] Verify **no rest-period badge** appears regardless of when entries were created.

---

## Regression Checks

- [x] Navigate back and forward through weeks → no JS console errors.
- [x] Copy/paste a time entry (feature 004) with warnings active → no errors, warnings recompute correctly.
- [x] Week total still updates correctly when entries are added/deleted.
- [x] Day totals still display correctly in column headers alongside badges.
- [x] No visible layout breakage in column headers (badge fits without wrapping).
