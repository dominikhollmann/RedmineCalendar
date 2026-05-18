# Phase 1 — Data Model: Small UX & Accessibility Fixes

This feature introduces **no new persisted entities and no new storage keys**. It uses two pre-existing fields in admin-managed `config.json` and produces one new in-repo documentation artefact.

## Existing fields consumed (read-only)

### `holidayTicket` (in `config.json`, admin-managed)

- **Type**: `number` (positive integer = a Redmine ticket ID) or absent / `null` / `0` / non-numeric.
- **Source**: admin server-side configuration. Already exists; already loaded by `js/chatbot-tools.js` (lines 415, 443) and `js/calendar.js` (lines 392–393, 496–497).
- **Used by this feature**: Story 2 input filter inside `computeArbzgWarnings`. An entry whose `issueId` equals this value is dropped from the rule-engine input before any of the six warning categories run.
- **Validation**: treat as exempt only when `Number.isFinite(Number(v)) && Number(v) > 0`. Any other value behaves as "not configured" per FR-008.

### `vacationTicket` (in `config.json`, admin-managed)

- **Type**: same as `holidayTicket`.
- **Source**: admin server-side configuration. Already exists; already loaded by `js/chatbot-tools.js` (lines 416, 444).
- **Used by this feature**: same input filter as `holidayTicket`. Both filters apply in sequence; an entry matching either ticket is exempt.
- **Validation**: identical positive-integer rule.

**Important**: feature 026 (backward-compat cleanup) removed a per-user `redmine_calendar_holiday_ticket` localStorage key. This feature does NOT reintroduce per-user holiday/vacation ticket overrides. The admin's `config.json` is the single source of truth.

## In-memory shape passed to `computeArbzgWarnings`

The signature changes from `(entries, year)` to `(entries, year, cfg)` where `cfg` is:

```js
/**
 * @typedef {Object} ArbzgCfg
 * @property {number|null} [holidayTicket]
 * @property {number|null} [vacationTicket]
 */
```

Both fields are optional. The function MUST behave identically to today when `cfg` is `undefined`, `null`, `{}`, or has neither field set as a positive integer (no exemption — FR-008). This shape mirrors what `detectAnomalies` already accepts in `js/anomalies.js`, so call sites in `js/calendar.js` can re-use the existing config-build code path.

## New artefact: `a11y-audit.md`

Produced during the implement phase (story 4); committed to the feature directory. **Not a runtime entity** — pure documentation.

### Top-level structure

```text
a11y-audit.md
├── Header (date, axe-core version, browser, theme set)
├── Summary table (per-surface counts: findings, fixed, deferred, N/A)
└── Per-surface sections (7 in total)
    └── Finding rows
```

### Per-finding row schema

| Column         | Type                                                           | Required | Notes                                                                                                      |
| -------------- | -------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `#`            | `number`                                                       | yes      | Surface-local sequence number, starts at 1 per surface                                                     |
| WCAG criterion | `string`                                                       | yes      | e.g. `1.3.1 Info and Relationships`, `2.1.2 No Keyboard Trap`                                              |
| Severity       | `'A'` \| `'AA'`                                                | yes      | Per WCAG Conformance Level                                                                                 |
| Finding        | `string`                                                       | yes      | One-sentence description of what fails; cite the element if specific                                       |
| Triage         | `'Fixed'` \| `'Deferred:<owner>:#<issue>'` \| `'N/A:<reason>'` | yes      | "Fixed" is the default per Clarification C2; "Deferred" requires owner + linked follow-up issue per FR-014 |
| Notes          | `string`                                                       | no       | Free-form (e.g., axe rule ID `image-alt`, manual finding source, before/after contrast ratios)             |

### The seven surfaces (in order)

1. Calendar — desktop view
2. Calendar — mobile day-view
3. Time-entry modal (open state)
4. Settings page
5. Chatbot panel (open state)
6. In-app docs panel (open state)
7. Voice-input UI

Each section has its own finding-row table. Both light-theme and dark-theme findings are merged into the same per-surface table (with a "Notes" column entry distinguishing the theme when only one theme exhibits the issue), to avoid 14 tiny tables.

### Invariants

- **I-1**: Every finding in the `Deferred` triage state MUST link to an explicit follow-up GitHub issue or a named owner. A Deferred row with neither is a constitutional violation of FR-014 and MUST be caught in code review.
- **I-2**: After remediation, `Fixed` is the default; `Deferred` and `N/A` are exceptions. A surface where Fixed = 0 and Findings > 0 means the remediation budget escape valve was used wholesale — that's a planning-time decision, not an implementation-time one, and the feature spec's Clarification C2 must be amended first.
- **I-3**: Findings reported by axe in CI MUST be a subset (≤) of the findings recorded in this document at the moment of merge. CI fails on any axe-reported A or AA violation per FR-015a; the document is the human-readable companion.

## What is intentionally NOT in this model

- **No new localStorage keys.** Story 4 introduces no per-user a11y preferences.
- **No new IndexedDB entries.** No new credential or key-storage scope.
- **No schema migration.** All consumed fields already exist in `config.json`.
- **No backward-compat shim.** Per CLAUDE.md system guidance, removed code (the `admin.*` i18n keys, `renderAdminInfo`, `.admin-info` CSS) is deleted outright; no re-exports, no deprecation warnings.
