# Research: Calendar View Options and Week Totals

**Feature**: `002-calendar-view-totals` | **Date**: 2026-04-01

## Decision 1: Day-column switching mechanism

- **Decision**: Use FullCalendar v6's `hiddenDays` option with `calendar.setOption('hiddenDays', [0, 6])` for workweek (hide Sun=0, Sat=6) and `calendar.setOption('hiddenDays', [])` for full-week.
- **Rationale**: `hiddenDays` is the canonical FullCalendar mechanism for hiding specific weekday columns without changing the view type. `setOption()` applies it dynamically without re-rendering or a page reload. This avoids switching between different FullCalendar view types (`timeGridWeek` vs `timeGrid5Day`), which would require re-fetching events.
- **Alternatives considered**:
  - Switching to a custom `timeGrid5Day` view: requires registering a custom view, more complex, triggers full re-render and re-fetch.
  - Changing `visibleRange`: designed for date ranges, not day-of-week filtering — produces unexpected results for week navigation.

## Decision 2: Week total placement

- **Decision**: Display the weekly total in a `#week-total` span in the existing `.app-header` (right side, before the settings icon).
- **Rationale**: SC-003 requires the total to always be visible without scrolling. The app header is sticky (`position: sticky; top: 0`) and always in view. Adding it to the FullCalendar toolbar would couple the display to FullCalendar's re-render cycle and make styling harder. The app header is simpler and already the correct place for at-a-glance status.
- **Alternatives considered**:
  - FullCalendar `headerToolbar.left`: would require a `customButton` with non-interactive content — semantically wrong and styling is constrained by FC's button chrome.
  - A fixed overlay element: unnecessary complexity when the header already works.

## Decision 3: Storage approach

- **Decision**: `localStorage.getItem/setItem('redmine_calendar_day_range')` storing the string `'workweek'` or `'full-week'`. Default (absent key) = `'workweek'`.
- **Rationale**: Consistent with feature 005's storage approach for view mode. localStorage is synchronous, no serialization overhead needed for a single string value.
- **Alternatives considered**: Cookie storage — rejected (cookies are reserved for credentials per the project constitution).

## Decision 4: Switch CSS reuse

- **Decision**: Reuse the existing `.wh-switch-track` / `.wh-switch-thumb` CSS classes from feature 005. The "Full week" button will use the same structure as the "Working hours" button.
- **Rationale**: Visual consistency across both switches; zero additional CSS for the switch itself. Only the label text and `customButton` name differ.
- **Alternatives considered**: None — reuse is explicitly mandated in spec Assumptions.

## Decision 5: Week total computation

- **Decision**: Sum `ev.extendedProps.timeEntry.hours` for all current events after each load/add/edit/delete, updating `#week-total` in place.
- **Rationale**: The existing `computeDailyTotals()` function already iterates all events — the week total is just a further aggregation. No new data fetching needed.
- **Alternatives considered**: Server-side aggregation via Redmine API — rejected (adds API calls, violates YAGNI, slower).
