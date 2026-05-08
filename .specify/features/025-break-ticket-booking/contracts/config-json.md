# Contract: `config.json` admin schema

**Feature**: 025 | **Consumer**: `js/settings.js` (`loadCentralConfig`) | **Producer**: deployment admin

> **Updated during UAT (2026-05-08)**: Two more admin fields were added — `vacationTicket` (numeric, FR-016) and `redmineAcceptsZeroHours` (boolean, FR-020). The "one-time" notice in FR-004 was changed to fire on every call when `breakTicket` is unset (the once-per-session gating was unreliable). See spec.md FR-015 through FR-021.

## Schema (relevant fields, post-025)

```jsonc
{
  // ── existing (unchanged) ──
  "redmineUrl":         "https://localhost:8010",
  "redmineServerUrl":   "https://your-redmine.example.com",
  "aiProvider":         "anthropic",
  "aiModel":            "claude-haiku-4-5-20251001",
  "aiApiKey":           "sk-ant-...",
  "aiProxyUrl":         "https://localhost:8011",
  "azureClientId":      "<azure-app-client-id>",

  // ── 025 changes ──
  "holidayTicket":      999,   // OPTIONAL. Numeric Redmine issue ID for BANK/PUBLIC HOLIDAYS only.
                               // (Was per-user localStorage in 019; semantics narrowed in UAT.)
  "vacationTicket":     997,   // OPTIONAL (added in UAT, FR-016). Numeric Redmine issue ID for
                               // personal vacation / OOO. When unset, vacation events fall
                               // through to NEEDS USER INPUT.
  "breakTicket":        998,   // OPTIONAL. Numeric Redmine issue ID for non-work events
                               // (lunch, doctor, gym, …) and overtime-compensation blocks.
                               // When unset, break-routing disabled and notice fires (FR-004).
  "redmineAcceptsZeroHours": false  // BOOLEAN (added in UAT, FR-020). Mirror the Redmine
                                    // "Accept 0h timelogs" admin setting. When false, break
                                    // entries are saved as 0.01h placeholder; UI still treats
                                    // them as 0.
}
```

## Validation rules (consumer-side)

- `breakTicket`, if present: positive integer. If non-positive or non-numeric, treat as unset and log a warning.
- `holidayTicket`, if present: positive integer. Same fallback.
- Missing both is valid (feature degrades to 019 behavior + the "break-routing disabled" notice).
- The two MAY be equal (admin choice — no enforced uniqueness).

## Backwards compatibility

- Pre-025 `config.json` files (no `breakTicket`, no `holidayTicket`) MUST continue to work — `holidayTicket` falls back to per-user localStorage **only during the cleanup window** (see `STORAGE_KEY_HOLIDAY_TICKET` cleanup), after which it's purely from `config.json`. Recommended: admins add `holidayTicket` to `config.json` before deploying 025; otherwise users lose holiday auto-routing until the admin updates the file.
- Pre-025 user localStorage with `redmine_calendar_holiday_ticket` is removed on app init by 025 (FR-007). The user-facing impact is none if the admin set `holidayTicket` in config.json; otherwise the user loses holiday auto-routing for that deployment.

## Failure modes

| Scenario | Consumer behavior |
|----------|-------------------|
| `config.json` missing | Existing 019 behavior — error screen, user redirected to setup. Unchanged. |
| `config.json` malformed JSON | Existing 019 behavior — error screen. Unchanged. |
| `breakTicket` present but `null` / `0` / negative / non-numeric | Treated as unset; FR-004 fallback engages. Console warning. |
| `breakTicket` valid but ticket doesn't exist or is closed in Redmine | First booking attempt fails with the standard Redmine error path; assistant surfaces error and continues with next event. Per Edge Cases bullet. |

## Test fixtures (Vitest + Playwright)

- `config.fixtures.full.json` — both fields present, both valid.
- `config.fixtures.no-break.json` — `holidayTicket` only, `breakTicket` missing → tests FR-004 fallback.
- `config.fixtures.no-tickets.json` — neither present → tests legacy-only behavior.
- `config.fixtures.invalid-break.json` — `breakTicket: "abc"` → tests validation warning.
