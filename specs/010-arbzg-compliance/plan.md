# Implementation Plan: ArbZG Compliance Warnings

**Branch**: `010-arbzg-compliance` | **Date**: 2026-04-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-arbzg-compliance/spec.md`

## Summary

Add informational ArbZG compliance warning badges to the calendar UI. When the user's
logged time entries violate German working hours law (§3 daily >10 h, §3 weekly >48 h,
§5 rest gap <11 h, §9 Sunday / public-holiday work), a `⚠` badge appears on the
affected day column header or on the week total. Clicking/hovering the badge shows a
tooltip explaining the violated rule and the observed vs. allowed value. All checks
run purely against data already in the current week view — no additional API calls.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla, no transpilation)
**Primary Dependencies**: FullCalendar v6 (CDN) — already present; no new dependencies
**Storage**: N/A (computed at render time from `window._calendarDayTotals` and time-entry events)
**Testing**: Manual acceptance checklist (`quickstart.md`) — Constitution §III exception applies (personal single-user tool, no CI)
**Target Platform**: Desktop browser (Chrome/Firefox/Safari); mobile out of scope
**Project Type**: Web application feature addition
**Performance Goals**: Warnings computed and displayed within 1 s of week load (SC-001)
**Constraints**: No new network calls (FR-006); no new runtime dependencies; advisory only, must not block any action (FR-005)
**Scale/Scope**: Single-user, single-week view; up to ~20 time entries per week

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Redmine API Contract | ✅ PASS | No new API calls. All computation is derived from data already fetched for the current view. |
| II. Calendar-First UX | ✅ PASS | Warnings are surfaced directly on the calendar day headers and week total — the primary UI surface. |
| III. Test-First | ✅ PASS (exception) | Personal single-user tool with no CI. Deviation documented below; compensating control is `quickstart.md` covering all FRs. |
| IV. Simplicity & YAGNI | ✅ PASS | One new module (`js/arbzg.js`), CSS additions, and targeted extensions to existing callbacks. No new abstractions or libraries. |
| V. Security by Default | ✅ PASS | No new external data consumed. Tooltip content is constructed from computed numeric values, not from Redmine API strings, so no new XSS surface. |

### Constitution §III Deviation

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| No automated tests | Personal single-user tool, no CI pipeline, single contributor | Setting up a Jest/Vitest harness for a vanilla-JS CDN project adds significant tooling overhead with no CI enforcement; all acceptance scenarios are covered by `quickstart.md` |

## Project Structure

### Documentation (this feature)

```text
specs/010-arbzg-compliance/
├── plan.md              # This file
├── research.md          # Phase 0 output (decisions on module, algorithm, tooltip, badges)
├── data-model.md        # Phase 1 output (Compliance Warning entity)
├── quickstart.md        # Phase 1 output (manual acceptance checklist)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code changes

```text
js/
├── arbzg.js             # NEW — pure computation: easterSunday(), federalHolidays(),
│                        #   checkDailyLimit(), checkWeeklyLimit(),
│                        #   checkRestPeriod(), checkSundayWork(), checkHolidayWork(),
│                        #   computeArbzgWarnings() → returns _calendarArbzgWarnings shape
├── i18n.js              # MODIFIED — add arbzg.* translation keys (en + de)
└── calendar.js          # MODIFIED — call computeArbzgWarnings() in updateDayTotals(),
                         #   render badges in dayHeaderContent / week-total area,
                         #   wire tooltip show/hide on badge mouseenter/click

css/
└── style.css            # MODIFIED — .arbzg-badge, #arbzg-tooltip styles

index.html               # MODIFIED — add <div id="arbzg-tooltip"> to <body>
```

## Module Design: `js/arbzg.js`

### Public API

```javascript
// Returns { month, day } for each of the 9 German federal holidays in the given year
export function federalHolidays(year): Map<string, string>  // key: 'YYYY-MM-DD', value: holiday name

// Computes the full _calendarArbzgWarnings object from the current week's entries
// entries: array of { date, hours, startTime? } (same shape used by calendar.js)
// year: calendar year for holiday computation
export function computeArbzgWarnings(entries, year): ArbzgWarnings

// Break check formulas (internal): for each day with start times available:
//
//   1. Break duration:
//      break_minutes = (last_entry_end_minutes - first_entry_start_minutes) - sum(hours * 60)
//      required = total_hours > 9 ? 45 : total_hours > 6 ? 30 : 0
//      warn BREAK_INSUFFICIENT if break_minutes < required
//
//   2. Continuous work limit:
//      sort entries by startTime; merge overlapping/adjacent entries into spans
//      longest_span_hours = max span duration across all merged spans
//      warn CONTINUOUS_WORK if longest_span_hours > 6
```

### Internal helpers (not exported)

```javascript
function easterSunday(year): Date
function checkDailyLimit(dayTotals): daily warnings map
function checkWeeklyLimit(dayTotals): weekly warnings array
function checkRestPeriod(entries): restPeriod warnings map
function checkSundayWork(entries): sunday dates array
function checkHolidayWork(entries, year): holiday map
function checkBreaks(entries): break warnings map
// keyed by 'YYYY-MM-DD'; each value is an array — may contain BREAK_INSUFFICIENT and/or CONTINUOUS_WORK
// only computed for days where startTime is present on all entries
```

### `ArbzgWarnings` shape (from research.md Decision 6)

```javascript
{
  daily:      { 'YYYY-MM-DD': [{ rule, observed, allowed, messageKey }] },
  weekly:     [{ rule, observed, allowed, messageKey }],   // empty array if OK
  restPeriod: { 'YYYY-MM-DD': { rule, observed, allowed, messageKey } },
  sunday:     ['YYYY-MM-DD'],
  holiday:    { 'YYYY-MM-DD': 'Holiday Name' },
  // Array per day — may contain BREAK_INSUFFICIENT and/or CONTINUOUS_WORK
  breaks: {
    'YYYY-MM-DD': [
      { rule: 'BREAK_INSUFFICIENT', observed: 20, required: 30, messageKey: 'arbzg.break' },
      { rule: 'CONTINUOUS_WORK',    observed: 7.5, allowed: 6,  messageKey: 'arbzg.break_continuous' },
    ],
  },
}
```

## Integration Points in `calendar.js`

### `updateDayTotals()` (line ~216)

After computing `window._calendarDayTotals`:

```javascript
import { computeArbzgWarnings } from './arbzg.js';
// ...
const entries = calendar.getEvents().map(ev => ev.extendedProps);
window._calendarArbzgWarnings = computeArbzgWarnings(entries, currentYear);
calendar.render(); // triggers dayHeaderContent re-run
```

### `dayHeaderContent` callback (line ~509)

After the existing day-total span, append a badge if warnings exist for that date:

```javascript
const warnings = window._calendarArbzgWarnings;
const dateStr = formatDate(arg.date); // 'YYYY-MM-DD'
const hasWarning = warnings.daily[dateStr]?.length
  || warnings.restPeriod[dateStr]
  || warnings.sunday.includes(dateStr)
  || warnings.holiday[dateStr];

if (hasWarning) {
  const badge = document.createElement('span');
  badge.className = 'arbzg-badge';
  badge.textContent = '⚠';
  badge.addEventListener('mouseenter', (e) => showArbzgTooltip(e, dateStr));
  badge.addEventListener('mouseleave', hideArbzgTooltip);
  cell.appendChild(badge);
}
```

### Week-total area (line ~211)

```javascript
const weekSpan = document.getElementById('week-total');
if (weekSpan && warnings.weekly.length) {
  let badge = weekSpan.querySelector('.arbzg-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'arbzg-badge';
    badge.textContent = '⚠';
    badge.addEventListener('mouseenter', showArbzgWeekTooltip);
    badge.addEventListener('mouseleave', hideArbzgTooltip);
    weekSpan.appendChild(badge);
  }
} else {
  weekSpan?.querySelector('.arbzg-badge')?.remove();
}
```

### Tooltip functions (new, in `calendar.js`)

```javascript
function showArbzgTooltip(event, dateStr) { /* populate #arbzg-tooltip and position */ }
function showArbzgWeekTooltip(event) { /* populate #arbzg-tooltip with weekly warnings */ }
function hideArbzgTooltip() { /* hide #arbzg-tooltip */ }
```

## i18n Keys to Add (`js/i18n.js`)

```javascript
// English
'arbzg.daily_limit':   'Daily limit exceeded: {observed}h worked, max {allowed}h (ArbZG §3)',
'arbzg.weekly_limit':  'Weekly limit exceeded: {observed}h worked, max {allowed}h (ArbZG §3)',
'arbzg.rest_period':   'Rest period too short: {observed}h rest, min {allowed}h (ArbZG §5)',
'arbzg.sunday':        'Work on Sunday (ArbZG §9)',
'arbzg.holiday':       'Work on public holiday: {name} (ArbZG §9)',
'arbzg.break':              'Break too short: {observed} min taken, {required} min required (ArbZG §4)',
'arbzg.break_continuous':   'Uninterrupted work too long: {observed}h without a break, max {allowed}h (ArbZG §4)',

// German
'arbzg.daily_limit':        'Tageshöchstarbeitszeit überschritten: {observed}h gearbeitet, max. {allowed}h (ArbZG §3)',
'arbzg.weekly_limit':       'Wochenhöchstarbeitszeit überschritten: {observed}h gearbeitet, max. {allowed}h (ArbZG §3)',
'arbzg.rest_period':        'Ruhezeit zu kurz: {observed}h Ruhe, min. {allowed}h (ArbZG §5)',
'arbzg.sunday':             'Arbeit an Sonntag (ArbZG §9)',
'arbzg.holiday':            'Arbeit an Feiertag: {name} (ArbZG §9)',
'arbzg.break':              'Pause zu kurz: {observed} Min. genommen, {required} Min. vorgeschrieben (ArbZG §4)',
'arbzg.break_continuous':   'Ununterbrochene Arbeitszeit zu lang: {observed}h ohne Pause, max. {allowed}h (ArbZG §4)',
```

## CSS Additions (`css/style.css`)

```css
/* Warning badge on day headers and week total */
.arbzg-badge {
  display: inline-block;
  margin-left: 4px;
  font-size: 0.85rem;
  cursor: pointer;
  color: #e67e22;
  vertical-align: middle;
}

/* Shared tooltip */
#arbzg-tooltip {
  position: fixed;
  z-index: 9999;
  background: #333;
  color: #fff;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 0.82rem;
  max-width: 320px;
  white-space: pre-line;
  pointer-events: none;
  display: none;
}
#arbzg-tooltip.visible { display: block; }
```

## HTML Addition (`index.html`)

Add before `</body>`:

```html
<div id="arbzg-tooltip" role="tooltip"></div>
```
