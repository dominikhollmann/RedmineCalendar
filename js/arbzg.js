// ── ArbZG Compliance Checks ───────────────────────────────────────
// Pure computation module — no DOM, no FullCalendar dependencies.
// Called from calendar.js after each week load or entry change.
//
// Public API:
//   federalHolidays(year)          → Map<'YYYY-MM-DD', holidayName>
//   computeArbzgWarnings(entries, year) → ArbzgWarnings

// ── Helpers ───────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }
function dateKey(y, m, d) { return `${y}-${pad(m)}-${pad(d)}`; }

// ── Easter Sunday (Meeus/Jones/Butcher algorithm) ─────────────────
function easterSunday(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// ── Federal holidays ──────────────────────────────────────────────
// Returns Map<'YYYY-MM-DD', name> for the 9 German federal holidays.
export function federalHolidays(year) {
  const map = new Map();

  // Fixed holidays
  map.set(dateKey(year, 1,  1),  'Neujahr');
  map.set(dateKey(year, 5,  1),  'Tag der Arbeit');
  map.set(dateKey(year, 10, 3),  'Tag der Deutschen Einheit');
  map.set(dateKey(year, 12, 25), '1. Weihnachtstag');
  map.set(dateKey(year, 12, 26), '2. Weihnachtstag');

  // Movable holidays relative to Easter Sunday
  const easter = easterSunday(year);
  const easterMs = easter.getTime();
  const DAY = 86400000;
  const movable = (offset, name) => {
    const d = new Date(easterMs + offset * DAY);
    map.set(dateKey(d.getFullYear(), d.getMonth() + 1, d.getDate()), name);
  };
  movable(-2,  'Karfreitag');
  movable(+1,  'Ostermontag');
  movable(+39, 'Christi Himmelfahrt');
  movable(+50, 'Pfingstmontag');

  return map;
}

// ── Daily limit check (ArbZG §3: max 10 h/day) ───────────────────
function checkDailyLimit(dayTotals) {
  const result = {};
  for (const [date, hours] of Object.entries(dayTotals)) {
    if (hours > 10) {
      result[date] = [{
        rule: 'DAILY_LIMIT',
        observed: Math.round(hours * 100) / 100,
        allowed: 10,
        messageKey: 'arbzg.daily_limit',
      }];
    }
  }
  return result;
}

// ── Weekly limit check (ArbZG §3: max 48 h/week) ─────────────────
function checkWeeklyLimit(dayTotals) {
  const total = Object.values(dayTotals).reduce((s, h) => s + h, 0);
  const observed = Math.round(total * 100) / 100;
  if (observed > 48) {
    return [{ rule: 'WEEKLY_LIMIT', observed, allowed: 48, messageKey: 'arbzg.weekly_limit' }];
  }
  return [];
}

// ── Rest period check (ArbZG §5: min 11 h between working days) ──
// Only runs for days where at least one entry has startTime.
function checkRestPeriod(entries) {
  const result = {};

  // Group by date; only include days with ≥1 entry with startTime
  const byDate = {};
  for (const e of entries) {
    if (!e.date || !e.startTime) continue;
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  }

  const dates = Object.keys(byDate).sort();
  for (let i = 0; i < dates.length - 1; i++) {
    const dateA = dates[i];
    const dateB = dates[i + 1];

    // Only check truly consecutive calendar days
    const diffDays = Math.round(
      (new Date(dateB + 'T00:00:00') - new Date(dateA + 'T00:00:00')) / 86400000
    );
    if (diffDays !== 1) continue;

    // Last entry end (in minutes since midnight) on day A
    let latestEndMin = 0;
    for (const e of byDate[dateA]) {
      const [h, m] = e.startTime.split(':').map(Number);
      const endMin = h * 60 + m + Math.round((e.hours ?? 0) * 60);
      if (endMin > latestEndMin) latestEndMin = endMin;
    }

    // First entry start (in minutes since midnight) on day B
    let earliestStartMin = Infinity;
    for (const e of byDate[dateB]) {
      const [h, m] = e.startTime.split(':').map(Number);
      const startMin = h * 60 + m;
      if (startMin < earliestStartMin) earliestStartMin = startMin;
    }

    // Rest gap: remaining minutes on day A + start of day B
    const restMin = (24 * 60 - latestEndMin) + earliestStartMin;
    const restHours = Math.round(restMin / 60 * 100) / 100;

    if (restHours < 11) {
      result[dateB] = {
        rule: 'REST_PERIOD',
        observed: restHours,
        allowed: 11,
        messageKey: 'arbzg.rest_period',
      };
    }
  }
  return result;
}

// ── Sunday work check (ArbZG §9) ─────────────────────────────────
function checkSundayWork(entries) {
  const sundays = new Set();
  for (const e of entries) {
    if (!e.date) continue;
    if (new Date(e.date + 'T00:00:00').getDay() === 0) sundays.add(e.date);
  }
  return [...sundays];
}

// ── Public holiday work check (ArbZG §9) ─────────────────────────
function checkHolidayWork(entries, year) {
  const holidays = federalHolidays(year);
  const result = {};
  for (const e of entries) {
    if (!e.date) continue;
    if (holidays.has(e.date) && !result[e.date]) {
      result[e.date] = holidays.get(e.date);
    }
  }
  return result;
}

// ── Break checks (ArbZG §4) ───────────────────────────────────────
// Two sub-checks per day — only when every entry on that day has startTime:
//   BREAK_INSUFFICIENT : total unbooked time within working span < required (30/45 min)
//   CONTINUOUS_WORK    : longest uninterrupted stretch > 6 h
function checkBreaks(entries) {
  const result = {};

  // Group by date; flag days where any entry lacks startTime
  const byDate = {};
  for (const e of entries) {
    if (!e.date) continue;
    if (!byDate[e.date]) byDate[e.date] = { list: [], allHaveStart: true };
    byDate[e.date].list.push(e);
    if (!e.startTime) byDate[e.date].allHaveStart = false;
  }

  for (const [date, { list, allHaveStart }] of Object.entries(byDate)) {
    if (!allHaveStart || list.length === 0) continue;

    const totalHours = list.reduce((s, e) => s + (e.hours ?? 0), 0);
    const required   = totalHours > 9 ? 45 : totalHours > 6 ? 30 : 0;

    // Build [startMin, endMin] spans, sorted by start
    const spans = list.map(e => {
      const [h, m] = e.startTime.split(':').map(Number);
      const startMin = h * 60 + m;
      const endMin   = startMin + Math.round((e.hours ?? 0) * 60);
      return [startMin, endMin];
    }).sort((a, b) => a[0] - b[0]);

    const warnings = [];

    // Sub-check 1: Break duration
    if (required > 0) {
      const firstStart = spans[0][0];
      const lastEnd    = spans[spans.length - 1][1];
      const breakMin   = (lastEnd - firstStart) - Math.round(totalHours * 60);
      if (breakMin < required) {
        warnings.push({
          rule: 'BREAK_INSUFFICIENT',
          observed: Math.max(0, breakMin),
          required,
          messageKey: 'arbzg.break',
        });
      }
    }

    // Sub-check 2: Continuous work > 6 h
    // Merge overlapping/adjacent spans
    const merged = [];
    for (const [s, e] of spans) {
      if (merged.length === 0 || s > merged[merged.length - 1][1]) {
        merged.push([s, e]);
      } else {
        merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
      }
    }
    const longestMin   = Math.max(...merged.map(([s, e]) => e - s));
    const longestHours = Math.round(longestMin / 60 * 100) / 100;
    if (longestHours > 6) {
      warnings.push({
        rule: 'CONTINUOUS_WORK',
        observed: longestHours,
        allowed: 6,
        messageKey: 'arbzg.break_continuous',
      });
    }

    if (warnings.length > 0) result[date] = warnings;
  }
  return result;
}

// ── Main export ───────────────────────────────────────────────────
// entries : array of timeEntry objects (extendedProps.timeEntry from FullCalendar events)
//           shape: { date, hours, startTime?, _isMidnightContinuation? }
// year    : calendar year for holiday computation
// Returns the _calendarArbzgWarnings shape used by calendar.js rendering.
export function computeArbzgWarnings(entries, year) {
  // Build day totals (skip midnight-continuation phantom events)
  const filtered = entries.filter(e => !e._isMidnightContinuation);

  const dayTotals = {};
  for (const e of filtered) {
    if (e.date) dayTotals[e.date] = (dayTotals[e.date] ?? 0) + (e.hours ?? 0);
  }

  return {
    daily:      checkDailyLimit(dayTotals),
    weekly:     checkWeeklyLimit(dayTotals),
    restPeriod: checkRestPeriod(filtered),
    sunday:     checkSundayWork(filtered),
    holiday:    checkHolidayWork(filtered, year),
    breaks:     checkBreaks(filtered),
  };
}
