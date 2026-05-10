# Data Model: Weekly Hours Target Tracking

**Feature**: 027-weekly-target-tracking
**Date**: 2026-05-10
**Phase**: 1 (Design & Contracts)

This feature introduces **no persistent data**. The only new entity is a derived value computed at render time from already-loaded inputs.

---

## Persistent storage

| Key | Source | Read by this feature? | Written by this feature? |
|---|---|---|---|
| `redmine_calendar_weekly_hours` | existing `localStorage` (per-user) | ✅ via `readWeeklyHours()` | ❌ |
| `cfg.holidayTicket` | existing `config.json` (admin) | ✅ | ❌ |
| `cfg.breakTicket` | existing `config.json` (admin) | ✅ | ❌ |

No new keys, no schema changes.

---

## Derived value: `WeekProgress`

Computed once per render of the visible week, inside the pure function `computeWeekProgress()` (in `js/week-target.js`).

### Inputs

| Param | Type | Notes |
|---|---|---|
| `entries` | `Array<TimeEntry>` | The visible week's already-loaded time entries. `TimeEntry` is the existing shape used by `js/calendar.js` (must include `hours`, `issueId`, `spent_on`/start date, and the `_isMidnightContinuation` marker that `splitMidnightEntries` adds). |
| `weekStart` | `Date` | Local-timezone Monday 00:00 of the visible week. |
| `weekEnd` | `Date` | Local-timezone Sunday 23:59:59.999 of the visible week. |
| `today` | `Date` | Local-timezone "today at 00:00". Injected for testability. |
| `weeklyHours` | `number \| null` | The user's target. `null` / `0` / `NaN` → indicator hidden (caller responsibility). |
| `holidayTicket` | `number \| null` | Admin-configured Redmine issue ID for holiday/OOO. `null` is valid (feature degrades gracefully — see Open Question 1 in plan.md). |
| `breakTicket` | `number \| null` | Admin-configured Redmine issue ID for break-time blocks. Always excluded from booked hours. |

### Output shape

```ts
type WeekProgress = {
  booked: number;            // hours, sum of all non-break entries in the week
  target: number;            // weeklyHours (echoed)
  remaining: number;         // max(0, target - booked)
  remainingWorkdays: number; // count of Mon–Fri days where: in [today, weekEnd] AND no booked entry AND not a holiday day; 0 for past weeks
  isPastWeek: boolean;       // weekEnd < today
  state: 'under' | 'met' | 'over';  // under: booked < target; met: booked === target; over: booked > target
};
```

### Computation rules (mirrors FR-001 … FR-005)

- **`booked`**: sum of `entry.hours` for every entry where `entry.issueId !== breakTicket` and `!entry._isMidnightContinuation`. Saturday/Sunday entries are included (per spec edge case).
- **`remaining`**: `Math.max(0, target - booked)`.
- **`remainingWorkdays`**: iterate Mon–Fri of the visible week; count days where the day's local-midnight start is `>= today` AND no entry has its `spent_on` (or local-midnight start) on that day. A day with any holiday-ticket entry counts as **filled** (not remaining).
- **`isPastWeek`**: `weekEnd < today`.
- **`state`**: derived only from booked vs target; does not factor in remaining workdays.

### Validation / invariants

- `booked >= 0` always.
- `remaining >= 0` always.
- `remainingWorkdays` is in `[0, 5]`.
- If `isPastWeek` is `true`, callers SHOULD suppress the "remaining workdays" UI element (FR-004); the field is still computed (and will be `0`) so that test assertions are simpler.
- The function is **pure** — no `Date.now()`, no DOM access, no `localStorage`. All time references come from `today`, `weekStart`, `weekEnd` parameters.

---

## State transitions

There are no state transitions to model — `WeekProgress` is recomputed from scratch on each render. The "transitions" between `under` / `met` / `over` happen as a function of `booked` crossing `target`, and they update naturally on the next render trigger (any entry CRUD).

---

## i18n keys

See research.md §R6 — six keys added to `js/i18n.js` (EN + DE). No data-model implications.
