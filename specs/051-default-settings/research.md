# Research: Sensible First-Launch Defaults

**Feature**: 051-default-settings | **Date**: 2026-06-25

## Phase 0 Findings

### Decision 1 — Where to apply defaults

**Decision**: Apply defaults at **read-time** in the existing getter functions (`readWorkingHours`, `readWeeklyHours`) and at the two `localStorage.getItem(...)` call sites in `planning-view.js` and `settings-page.js`. Do NOT write defaults to localStorage on first load.

**Rationale**: Writing on first load would be indistinguishable from an explicit user choice — returning users who clear storage would then see their "explicit" values overwritten by defaults on next open. Read-time defaulting is idempotent and does not pollute storage.

**Alternatives considered**: (a) Write all defaults to localStorage on first open — rejected (violates US2 and spec Assumption bullet 3). (b) Add a separate `getDefaultWorkingHours()` abstraction layer — rejected (YAGNI; two callers only).

---

### Decision 2 — Handling corrupt stored values

**Decision**: `readWorkingHours()` returns the **factory default** `{start:'08:00', end:'18:00'}` when the stored value is absent **or** corrupt (malformed JSON, missing `start`/`end` fields, stored literal `"null"`). `readWeeklyHours()` returns **null** when the stored value is present but invalid (non-numeric, zero, negative).

**Rationale**: FR-006 states the default applies "when the key is absent". However, a corrupt entry was almost certainly written by a bug (not an intentional user choice), so treating it the same as absent is safer for UX. `readWeeklyHours` is simpler — non-numeric stored values are an edge case with no defined "factory intent", so `null` is the safer signal to callers.

**Alternatives considered**: Returning `null` for corrupt working-hours entries — rejected because the only callers of `readWorkingHours()` already handle `null` as "no hours configured", which would suppress the default.

---

### Decision 3 — Consistent default across all consumers

**Decision**: After `readWorkingHours()` returns `{start:'08:00', end:'18:00'}` instead of `null`, the chain in `calendar-toolbar.js` `getEffectiveTimeRange()` writes `'working'` to `viewMode` localStorage and returns the 08:00–18:00 slot range automatically — **no change needed in `calendar-toolbar.js`**.

**Rationale**: `getEffectiveTimeRange()` already has the branch `if (viewMode === null && wh !== null)` → sets viewMode to 'working' and returns `wh`. Once `wh` is non-null by default, this branch fires on first load for free.

---

### Decision 4 — Chatbot consumer (FR-006)

**Decision**: `chatbot-tools-outlook.js` line 60 has `workStart: readWorkingHours()?.start || '09:00'` — with the new default, `readWorkingHours()` returns `{start:'08:00', end:'18:00'}`, so the `|| '09:00'` fallback becomes dead code (never reached). **No change to `chatbot-tools-outlook.js` needed**, but the `|| '09:00'` literal should be noted as now unreachable.

**Rationale**: The `||` fallback was there to guard against `null` returns. The new default makes that guard redundant, but removing it would require touching a file outside the tight scope of this feature. Leave as-is per YAGNI.

---

### Decision 5 — FR-008 Teams default

**Decision**: Change `=== '1'` to `!== '0'` in both `planning-view.js` and `settings-page.js`. This makes absent key → Teams ON (was: absent key → Teams OFF).

**Rationale**: The spec Clarification Q3 explicitly mandates "unconditional default on — same policy as Outlook". The `!== '0'` idiom is already used for the Outlook source check in `planning-view.js` and is consistent with the project's existing pattern for ON-by-default preferences.

---

### Decision 6 — FR-001 Active-view default

**Decision**: Change `=== 'planning'` to `!== 'calendar'` in `planning-view.js`. This makes absent key → Planning View (was: absent key → Calendar View).

**Rationale**: The Planning View should be the landing page for first-time users per US1 AC1. Absent key means "never chose", which should map to the default — Planning View. If the user switches to Calendar View, `'calendar'` is written to storage; subsequent loads respect that stored value.

---

### Files requiring changes

| File                  | Change                                                                            | FR     |
| --------------------- | --------------------------------------------------------------------------------- | ------ |
| `js/working-hours.js` | `readWorkingHours()`: return `{start:'08:00',end:'18:00'}` when absent or corrupt | FR-006 |
| `js/working-hours.js` | `readWeeklyHours()`: return `40` when key absent                                  | FR-007 |
| `js/planning-view.js` | Active-view check: `!== 'calendar'`                                               | FR-001 |
| `js/planning-view.js` | Teams check: `!== '0'`                                                            | FR-008 |
| `js/settings-page.js` | `whCheckbox`: `!== '24h'`                                                         | FR-010 |
| `js/settings-page.js` | `wwCheckbox`: `!== 'full-week'`                                                   | FR-010 |
| `js/settings-page.js` | `teamsSourceCb`: `!== '0'`                                                        | FR-010 |

### Files requiring test updates

| File                                 | Change                                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| `tests/unit/settings.test.js`        | `readWorkingHours returns null when not set` → expect default `{start:'08:00',end:'18:00'}` |
| `tests/unit/settings-extras.test.js` | `readWeeklyHours returns null when not set` → expect `40`                                   |
| `tests/unit/settings-extras.test.js` | `readWorkingHours` corrupt-value tests → expect default (not `null`)                        |

### Files confirmed unchanged

| File | Reason |
| ------------------------------- | --------------------------------------------------------------------------------------- | --- | ---------------------------------------------------------------- |
| `js/calendar-toolbar.js` | Already handles `null`→default chain via existing `viewMode===null && wh!==null` branch |
| `js/arbzg.js` | Uses fixed statutory limits; does not call `readWorkingHours()` |
| `js/config.js` | Storage key constants only; no logic |
| `js/chatbot-tools-outlook.js` | `                                                                                       |     | '09:00'` fallback becomes dead code but no change needed (YAGNI) |
| `js/settings-page.js` dark-mode | Already `=== 'dark'` → absent key = `false` → light mode default CORRECT |
| `js/settings-page.js` fast-mode | Already `!== 'false'` → absent key = `true` → fast mode default CORRECT |
