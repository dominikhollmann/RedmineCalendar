# Research: ArbZG Compliance Warnings (010)

## Decision 1: Module structure — new `js/arbzg.js` vs inline in `calendar.js`

**Decision**: Create a new `js/arbzg.js` module containing all ArbZG computation logic. Import it in `calendar.js`.

**Rationale**: The compliance rules (thresholds, holiday list, Easter algorithm) are pure functions with no DOM or FullCalendar dependencies. Separating them makes them independently testable and keeps `calendar.js` focused on rendering.

**Alternatives considered**: Inlining in `calendar.js` — rejected because it would significantly grow an already large file and tangle computation with rendering.

---

## Decision 2: German federal holidays — fixed dates vs Easter algorithm

**Decision**: Implement a minimal Easter Sunday algorithm (Meeus/Jones/Butcher) in `js/arbzg.js` to compute the four movable federal holidays per year; hardcode the five fixed-date holidays.

**Fixed holidays (MM-DD)**:
- `01-01` Neujahr
- `05-01` Tag der Arbeit
- `10-03` Tag der Deutschen Einheit
- `12-25` 1. Weihnachtstag
- `12-26` 2. Weihnachtstag

**Movable holidays (days offset from Easter Sunday)**:
- Karfreitag: Easter − 2
- Ostermontag: Easter + 1
- Christi Himmelfahrt: Easter + 39
- Pfingstmontag: Easter + 50

**Easter algorithm (Meeus/Jones/Butcher)**:
```javascript
function easterSunday(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 1-based
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}
```

**Rationale**: The algorithm is ~10 lines and well-established. The alternative (hardcoding holiday dates per year) would require a multi-year lookup table and maintenance.

**Alternatives considered**: External holiday API — rejected (no new network calls per constitution §I/§IV; adds dependency).

---

## Decision 3: Tooltip implementation — CSS-only vs DOM element

**Decision**: Use a lightweight DOM-based tooltip: a single `<div id="arbzg-tooltip">` element appended to `<body>`, positioned absolutely near the warning badge on click/hover, hidden by default.

**Rationale**: The existing codebase has no tooltip library. A single shared tooltip element (show on mouseenter/click, hide on mouseleave/blur) is the simplest approach consistent with the project's no-library philosophy. The `title` attribute was considered but rejected because native browser tooltips appear with a delay and cannot be styled.

**Alternatives considered**:
- Native `title` attribute: zero code, but unstyled, delayed, and inaccessible.
- CSS `::after` pseudo-element on the badge: no JS needed, but cannot hold dynamic text.

---

## Decision 4: Warning badge placement in `dayHeaderContent`

**Decision**: Extend the existing `dayHeaderContent` callback in `calendar.js`. The current layout is a 3-column CSS grid (`day-header-cell`): day label | (center) | day total. Add a warning badge as a fourth element, or append it after the day total span.

The badge is a `<span class="arbzg-badge">⚠</span>` appended to the `.day-header-cell` div. On hover/click it triggers the shared tooltip.

---

## Decision 5: Week-total warning placement

**Decision**: After updating the `#week-total` text content, check for a weekly limit violation and append/update a `<span class="arbzg-badge">⚠</span>` inside the `#week-total` element.

**Rationale**: The week total is already a dedicated `<span id="week-total">` in the header. Adding a badge inside it keeps the warning spatially adjacent to the total.

---

## Decision 6: Global state — `window._calendarArbzgWarnings`

**Decision**: Store computed warnings in `window._calendarArbzgWarnings` (parallel to `window._calendarDayTotals`) so the `dayHeaderContent` callback (which runs inside FullCalendar's render cycle) can access them without a closure.

**Structure**:
```javascript
window._calendarArbzgWarnings = {
  daily: {
    '2026-04-14': [{ rule: 'DAILY_LIMIT', observed: 11.5, allowed: 10, messageKey: 'arbzg.daily_limit' }],
  },
  weekly: [{ rule: 'WEEKLY_LIMIT', observed: 52, allowed: 48, messageKey: 'arbzg.weekly_limit' }],
  restPeriod: {
    '2026-04-15': { rule: 'REST_PERIOD', observed: 9.5, allowed: 11, messageKey: 'arbzg.rest_period' },
  },
  sunday: ['2026-04-19'],
  holiday: { '2026-04-18': 'Karfreitag' },
};
```
