# Data Model: Configurable Working Hours and Calendar View Toggle

## Entities

### WorkingHoursConfig

Represents the user's configured working day boundaries. Stored as JSON in `localStorage` under the key `redmine_calendar_working_hours`.

| Field  | Type   | Constraints                    | Description                          |
|--------|--------|-------------------------------|--------------------------------------|
| start  | string | HH:MM, 24h, 00:00–23:59       | Start of the working day             |
| end    | string | HH:MM, 24h, 01:00–24:00       | End of the working day (exclusive)   |

**Validation rules**:
- `end` must be strictly after `start` when both are on the same day (i.e., end > start as time strings).
- Both fields must match the pattern `^\d{2}:\d{2}$` and represent valid 24-hour times.
- If the key is absent from localStorage, no working hours have been configured (unconfigured state).

**Lifecycle**:
- Written when the user saves the settings form.
- Read on calendar page load and on toggle click.
- Cleared only if the user explicitly removes the values (not in scope for this feature — no delete button required).

---

### ViewModeState

Represents the user's current time-axis display preference. Stored as a plain string in `localStorage` under the key `redmine_calendar_view_mode`.

| Value      | Meaning                                                      |
|------------|--------------------------------------------------------------|
| `"24h"`    | Calendar shows the full 00:00–24:00 range                    |
| `"working"`| Calendar shows only the configured working hours range       |

**Validation rules**:
- If the value is absent or unrecognised, default to `"24h"` (per FR-009 clarification: unconfigured = 24h).
- `"working"` is only a valid active state when a `WorkingHoursConfig` exists in localStorage; if config is missing, treat as `"24h"`.

**Lifecycle**:
- Written on toggle click.
- Read on calendar page load to restore the user's last-used view.
- Automatically demoted to `"24h"` at runtime if `WorkingHoursConfig` is absent (without writing back to localStorage, to avoid overwriting a stale but salvageable preference).

---

## Storage Layout (localStorage)

```
localStorage
├── redmine_calendar_working_hours   →  JSON: { "start": "08:00", "end": "18:00" }
└── redmine_calendar_view_mode       →  string: "24h" | "working"
```

*(The existing `redmine_calendar_config` cookie is unchanged — it stores credentials only.)*
