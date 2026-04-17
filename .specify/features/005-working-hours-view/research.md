# Research: Configurable Working Hours and Calendar View Toggle

## Decision 1: Storage for working hours preference

**Decision**: `localStorage` (not a cookie)

**Rationale**: Working hours (start/end time) are a non-sensitive UI preference — not credentials. `localStorage` is simpler to read/write (no serialization dance, no expiry date, no `SameSite` configuration) and is appropriate for persistent UI state. The existing `cookie` mechanism in the project is reserved for credentials (`redmine_calendar_config`). Mixing non-credentials into that cookie would couple unrelated concerns.

**Alternatives considered**:
- Cookie: overkill for non-credentials; expiry management unnecessary for a preference that should persist indefinitely.
- In-memory only: doesn't survive reload (FR-002 requires reload persistence).
- Redmine custom field: requires API write, adds complexity, violates YAGNI.

---

## Decision 2: Dynamic slotMinTime / slotMaxTime in FullCalendar v6

**Decision**: Use `calendar.setOption('slotMinTime', value)` and `calendar.setOption('slotMaxTime', value)` to toggle the visible time range at runtime.

**Rationale**: FullCalendar v6 supports live mutation of `slotMinTime` and `slotMaxTime` via `setOption()` without requiring a full calendar re-init. This means the toggle can be a simple button that calls two `setOption()` calls and toggles a localStorage flag — no teardown/rebuild of the calendar instance required. Verified against FullCalendar v6 docs.

**Alternatives considered**:
- Destroy and re-create the calendar instance on toggle: works but flickers and loses scroll position.
- CSS `display:none` on out-of-range slot rows: fragile, FullCalendar doesn't expose stable slot-row classes.

---

## Decision 3: Toggle UI placement

**Decision**: Add a custom button to FullCalendar's `headerToolbar.right` slot.

**Rationale**: FullCalendar v6 supports `customButtons` in the toolbar config. This keeps the toggle visually co-located with other calendar controls (prev/next/today) and doesn't require injecting a separate DOM element outside the calendar container. The button label switches between "Working hours" and "24h" to reflect the current state.

**Alternatives considered**:
- Inject a standalone `<button>` above/below the calendar: requires manual positioning and CSS alignment.
- Radio buttons in a separate settings area: too far from the calendar, poor discoverability.

---

## Decision 4: Toggle disabled state when no working hours configured

**Decision**: When no working hours are saved in localStorage, the toggle button is rendered but visually disabled (greyed out) with a tooltip explaining that working hours must be configured first.

**Rationale**: Hiding the button entirely when unconfigured would prevent the user from discovering the feature. Disabling with a clear tooltip is the standard pattern for features that require a prerequisite configuration step. FullCalendar's `customButtons` can have a `click` handler that checks the state and shows a message instead of toggling.

**Alternatives considered**:
- Hide button entirely: reduces discoverability; user doesn't know the feature exists.
- Allow toggle even when unconfigured: leads to a confusing "working hours" state that is identical to 24h (since there's no configured range to collapse to).

---

## Decision 5: Storage key names

**Decision**:
- `redmine_calendar_working_hours` → `{ start: "HH:MM", end: "HH:MM" }` (JSON in localStorage)
- `redmine_calendar_view_mode` → `"24h"` or `"working"` (string in localStorage)

**Rationale**: Prefixing with `redmine_calendar_` namespaces the keys consistently with the existing cookie (`redmine_calendar_config`) and avoids collisions with other apps sharing the same localStorage origin. Storing as simple JSON/string keeps parsing trivial.
