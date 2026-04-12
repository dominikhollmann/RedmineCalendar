# Tasks: ArbZG Compliance Warnings (010)

**Input**: Design documents from `/specs/010-arbzg-compliance/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Single user story (US1) covering all ArbZG checks. Foundational phase
creates the module skeleton and wires up i18n/CSS/HTML; US1 implements every check
function and integrates them into the calendar rendering pipeline.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different code sections, no incomplete dependencies)
- **[US1]**: User Story 1 — ArbZG Compliance Warnings

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the static HTML, CSS, and i18n scaffolding that all check functions will use.

- [x] T001 Add `<div id="arbzg-tooltip" role="tooltip"></div>` before `</body>` in `index.html`
- [x] T002 [P] Add `.arbzg-badge` and `#arbzg-tooltip` CSS rules to `css/style.css` (badge: inline-block, margin-left 4px, font-size 0.85rem, color #e67e22; tooltip: position fixed, z-index 9999, dark background, max-width 320px, display none / display block when .visible)
- [x] T003 [P] Add all `arbzg.*` translation keys to `js/i18n.js` for both `en` and `de`: `arbzg.daily_limit`, `arbzg.weekly_limit`, `arbzg.rest_period`, `arbzg.sunday`, `arbzg.holiday`, `arbzg.break`, `arbzg.break_continuous` (see i18n strings in plan.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create `js/arbzg.js` with the full module skeleton so all check functions can be
implemented independently in Phase 3.

**⚠️ CRITICAL**: Phase 3 tasks cannot start until T004 is complete.

- [x] T004 Create `js/arbzg.js` as an ES module with: exported stubs for `federalHolidays(year)` and `computeArbzgWarnings(entries, year)`; unexported stubs for `easterSunday(year)`, `checkDailyLimit(dayTotals)`, `checkWeeklyLimit(dayTotals)`, `checkRestPeriod(entries)`, `checkSundayWork(entries)`, `checkHolidayWork(entries, year)`, `checkBreaks(entries)`. Each stub returns the correct empty shape (empty Map/array/object as appropriate). Add `export` to the file so `calendar.js` can import it.

**Checkpoint**: `js/arbzg.js` exists and exports `computeArbzgWarnings` returning a valid empty warnings object — calendar.js can now import it safely.

---

## Phase 3: User Story 1 — ArbZG Compliance Warnings (Priority: P1) 🎯 MVP

**Goal**: All six ArbZG checks computed from current-week entries and warnings rendered as
`⚠` badges on day column headers and the week total, with tooltip explanations.

**Independent Test**: Log >10 h on one day → `⚠` badge appears on that day's header with a tooltip showing rule and values. Remove the excess → badge disappears.

### Implementation

- [x] T005 [P] [US1] Implement `easterSunday(year)` (Meeus/Jones/Butcher algorithm) and `federalHolidays(year)` returning a `Map<'YYYY-MM-DD', holidayName>` for the 9 German federal holidays in `js/arbzg.js`
- [x] T006 [P] [US1] Implement `checkDailyLimit(dayTotals)` in `js/arbzg.js`: iterate `window._calendarDayTotals` entries; for each date where total > 10, add `{ rule: 'DAILY_LIMIT', observed, allowed: 10, messageKey: 'arbzg.daily_limit' }` to the daily map
- [x] T007 [P] [US1] Implement `checkWeeklyLimit(dayTotals)` in `js/arbzg.js`: sum all values in `window._calendarDayTotals`; if sum > 48 return `[{ rule: 'WEEKLY_LIMIT', observed: sum, allowed: 48, messageKey: 'arbzg.weekly_limit' }]`, else `[]`
- [x] T008 [P] [US1] Implement `checkRestPeriod(entries)` in `js/arbzg.js`: for each pair of consecutive calendar days where both have at least one entry with `startTime`, compute the gap between the last entry end of day N and the first entry start of day N+1; if gap < 11 h add `{ rule: 'REST_PERIOD', observed: gapHours, allowed: 11, messageKey: 'arbzg.rest_period' }` keyed by day N+1
- [x] T009 [P] [US1] Implement `checkSundayWork(entries)` in `js/arbzg.js`: return array of unique `'YYYY-MM-DD'` strings where the day-of-week is Sunday (use `new Date(dateStr).getDay() === 0`)
- [x] T010 [P] [US1] Implement `checkHolidayWork(entries, year)` in `js/arbzg.js`: call `federalHolidays(year)`, return object keyed by entry dates that are in the holiday map with the holiday name as value
- [x] T011 [P] [US1] Implement `checkBreaks(entries)` in `js/arbzg.js` covering two sub-checks per day (only for days where all entries have `startTime`):
  - **Break duration**: `break_min = (lastEnd − firstStart) − sum(hours × 60)`; required = hours > 9 ? 45 : hours > 6 ? 30 : 0; add `BREAK_INSUFFICIENT` if break_min < required
  - **Continuous work**: sort entries by startTime, merge overlapping/adjacent spans (entryEnd >= nextStart), find longest merged span; if > 6 h add `CONTINUOUS_WORK` with observed hours and allowed 6
  - Return object keyed by `'YYYY-MM-DD'`, values are arrays of warning objects
- [x] T012 [US1] Implement `computeArbzgWarnings(entries, year)` in `js/arbzg.js`: call all six check functions and assemble the `_calendarArbzgWarnings` shape: `{ daily, weekly, restPeriod, sunday, holiday, breaks }` (depends on T005–T011)
- [x] T013 [US1] Import `computeArbzgWarnings` from `./arbzg.js` at the top of `js/calendar.js` and call it inside `updateDayTotals()` after `window._calendarDayTotals` is populated: `window._calendarArbzgWarnings = computeArbzgWarnings(entries, year)` where `entries` are extracted from `calendar.getEvents().map(ev => ev.extendedProps)` and `year` is the current calendar year (depends on T012)
- [x] T014 [US1] Extend the `dayHeaderContent` callback in `js/calendar.js`: after the existing day-total span, check `window._calendarArbzgWarnings` for the current date (daily, restPeriod, sunday, holiday, breaks); if any warning exists for that date, append a `<span class="arbzg-badge">⚠</span>` to the `.day-header-cell` div and wire `mouseenter` → `showArbzgTooltip(event, dateStr)` and `mouseleave` → `hideArbzgTooltip()` (depends on T013)
- [x] T015 [US1] Add week-total badge rendering in `js/calendar.js`: after updating `#week-total` text in `updateDayTotals()`, if `window._calendarArbzgWarnings.weekly.length > 0` append/update a `.arbzg-badge` span inside `#week-total` wired to `showArbzgWeekTooltip`; if no weekly violation remove any existing badge (depends on T013)
- [x] T016 [US1] Implement `showArbzgTooltip(event, dateStr)`, `showArbzgWeekTooltip(event)`, and `hideArbzgTooltip()` in `js/calendar.js`: populate `#arbzg-tooltip` with translated text using `t(messageKey, { observed, allowed })` for each applicable warning on the date (daily, restPeriod, breaks) plus plain text for sunday/holiday; position tooltip near the mouse using `event.clientX/Y`; add/remove `.visible` class; `hideArbzgTooltip` removes `.visible` (depends on T014, T015)

**Checkpoint**: All ArbZG checks fire, badges appear on day headers and week total, tooltips show rule + values, badges disappear when violations are resolved.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [ ] T017 Verify no JS console errors when navigating weeks with and without warnings in the browser (`npm run serve`)
- [ ] T018 Run the full `quickstart.md` acceptance checklist manually

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion
- **User Story 1 (Phase 3)**: T005–T011 depend only on T004; can all run in parallel after T004. T012 depends on T005–T011. T013 depends on T012. T014–T015 depend on T013. T016 depends on T014–T015.
- **Polish (Phase 4)**: Depends on all Phase 3 tasks complete

### Parallel Opportunities

```
Phase 1: T001 | T002 | T003  (all parallel, different files)

Phase 2: T004  (sequential — creates the module skeleton)

Phase 3, wave 1: T005 | T006 | T007 | T008 | T009 | T010 | T011  (all parallel, separate functions)
Phase 3, wave 2: T012  (after wave 1)
Phase 3, wave 3: T013  (after T012)
Phase 3, wave 4: T014 | T015  (parallel, different UI areas)
Phase 3, wave 5: T016  (after T014 + T015)
```

---

## Implementation Strategy

### MVP First

1. Phase 1: Setup (T001–T003)
2. Phase 2: Foundational (T004)
3. Phase 3, wave 1–2: implement all check functions (T005–T012)
4. Phase 3, wave 3–5: integrate into calendar.js and wire tooltips (T013–T016)
5. **Validate**: daily limit badge visible for >10 h day, disappears when corrected
6. Phase 4: polish and full quickstart run

---

## Notes

- `js/arbzg.js` must be a proper ES module (`export function …`) — `calendar.js` imports it with `import { computeArbzgWarnings } from './arbzg.js'`
- `window._calendarArbzgWarnings` must be initialized to the empty shape before `dayHeaderContent` first runs to avoid null checks; initialise it at module level in `calendar.js`
- `startTime` for an entry is available as `entry.startTime` (string `'HH:MM'` or null/undefined) — already stored in `extendedProps` by the existing mapping
- Entry end time for a given entry: `startTime` + `hours`; compute in minutes to avoid float drift
- Tooltip positioning: clamp to viewport to avoid overflow off-screen
