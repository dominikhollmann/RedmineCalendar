# Storage Contracts: Modal UX Improvements (047)

## New key

```
redmine_calendar_fast_mode
  type:    string | absent
  values:  'false' → fast mode disabled
           absent  → fast mode enabled (default)
  writer:  settings-page.js
  readers: time-entry-form-utils.js (getFastMode)
```

## Changed constant (internal, not a public contract)

```
RECENT_CAP (js/time-entry-form-utils.js)
  old: 8
  new: 20
  effect: redmine_calendar_last_used trimmed to 20 on next write
```

No Redmine REST API contract changes. No new HTML element IDs exported across modules.
