# Quickstart: ArbZG Compliance Warnings (010)

Manual acceptance checklist. Execute every item before marking the feature done.
Covers all Functional Requirements (FR-001 to FR-008) and User Story acceptance scenarios.

---

## Setup

- [ ] Open the calendar in the browser.
- [ ] Navigate to a week where you can add test entries (use a test project if possible).

---

## FR-001 — Daily limit (>10 h triggers badge)

- [ ] Log time entries totalling **more than 10 hours** on a single day (e.g. 5 h + 6 h = 11 h on Monday).
- [ ] Verify a `⚠` badge appears on **Monday's column header** next to the day total.
- [ ] Delete one entry so the day total drops to **≤10 h**.
- [ ] Verify the `⚠` badge **disappears** from Monday's header (SC-002, acceptance scenario 5).

---

## FR-002 — Weekly limit (>48 h triggers badge on week total)

- [ ] Log entries so the **week total exceeds 48 hours**.
- [ ] Verify a `⚠` badge appears on the **week total** in the app header.
- [ ] Reduce the total to ≤48 h.
- [ ] Verify the week-total badge **disappears**.

---

## FR-003 — Rest period (<11 h gap triggers badge)

- [ ] Log an entry on **Monday with a late start time** (e.g., a comment `[start:23:00]`) and 1 h duration (so end ~00:00).
- [ ] Log an entry on **Tuesday with an early start time** (e.g., `[start:08:00]`).
- [ ] The rest gap is 8 h (< 11 h) → verify a `⚠` badge appears on **Tuesday's column header**.
- [ ] Remove the Tuesday entry or adjust times so the gap is ≥11 h.
- [ ] Verify the rest-period badge **disappears** from Tuesday.

---

## FR-004 — Tooltip content

- [ ] Trigger the **daily limit** badge (>10 h on one day).
- [ ] **Hover** the `⚠` badge → tooltip appears with rule name, observed hours, and allowed hours.
- [ ] Verify tooltip text includes "10" (allowed) and the observed value.
- [ ] **Click** the badge → tooltip still visible (or appears if hover not tested).
- [ ] Move the mouse away → tooltip **disappears**.

- [ ] Trigger the **weekly limit** badge (>48 h total).
- [ ] Hover the week-total badge → tooltip shows weekly rule, observed, and allowed (48).

- [ ] Trigger a **rest period** badge.
- [ ] Hover → tooltip shows rest period rule, observed gap hours, and "11".

- [ ] Trigger a **Sunday** badge (see FR-007 below).
- [ ] Hover → tooltip mentions Sunday work and cites ArbZG §9.

- [ ] Trigger a **holiday** badge (see FR-007 below).
- [ ] Hover → tooltip mentions the holiday name and cites ArbZG §9.

---

## FR-005 — Warnings are informational only

- [ ] With a daily-limit badge visible, open the time entry form for that day.
- [ ] Verify the form opens normally — no block, no extra warning in the form.
- [ ] Save the entry → calendar refreshes normally.

---

## FR-006 — No additional API calls

- [ ] Open DevTools → Network tab.
- [ ] Navigate to a week that triggers warnings.
- [ ] Verify **no extra XHR/fetch requests** are fired beyond the standard week-load calls.

---

## FR-007 — Sunday and public holiday warnings

**Sunday**:
- [ ] Navigate to a week that contains a Sunday.
- [ ] Log any time entry on the **Sunday** column.
- [ ] Verify a `⚠` badge appears on that **Sunday's column header**.
- [ ] Hover → tooltip mentions Sunday work (§9 ArbZG).

**Public holiday (Karfreitag or another fixed holiday)**:
- [ ] Navigate to a week containing a German federal holiday (e.g. week of Easter or 01-01, 05-01, 10-03, 12-25, 12-26).
- [ ] Log any time entry on the **holiday day**.
- [ ] Verify a `⚠` badge appears on that **day's column header**.
- [ ] Hover → tooltip names the holiday (e.g. "Karfreitag") and cites §9.

---

## FR-008 — Localization

- [ ] Switch browser language to **German** (or set `navigator.languages` override in DevTools).
- [ ] Reload the calendar and trigger a daily-limit warning.
- [ ] Verify the tooltip text is in **German** (e.g. "Tageshöchstarbeitszeit").

- [ ] Switch browser language to **English**.
- [ ] Reload and trigger the same warning.
- [ ] Verify tooltip text is in **English** (e.g. "Daily limit exceeded").

---

## Acceptance Scenario 5 — Warning removed after correction

- [ ] Log 11 h on one day → badge appears.
- [ ] Edit entries to bring total to 10 h or below.
- [ ] Verify badge **disappears** after the calendar refreshes.

---

## Acceptance Scenario 6 — No false rest-period warning without start times

- [ ] Log entries on two consecutive days **without** any `[start:HH:MM]` tag and without Easy Redmine start-time fields.
- [ ] Verify **no rest-period badge** appears regardless of when entries were created.

---

## Regression Checks

- [ ] Navigate back and forward through weeks → no JS console errors.
- [ ] Copy/paste a time entry (feature 004) with warnings active → no errors, warnings recompute correctly.
- [ ] Week total still updates correctly when entries are added/deleted.
- [ ] Day totals still display correctly in column headers alongside badges.
- [ ] No visible layout breakage in column headers (badge fits without wrapping).
