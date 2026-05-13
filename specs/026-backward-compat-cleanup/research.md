# Phase 0 Research: Code Cleanup & Simplification

**Feature**: 026 | **Date**: 2026-05-08

This phase enumerates the concrete removal targets so the implementation phase has no ambiguity. Each entry below is a _Decision: remove X / Rationale / Alternatives considered_ triple per the plan template.

---

## R1 — Legacy localStorage cleanup (FR-001)

**Decision**: Remove `cleanupLegacyKeys()` from `js/settings.js`, its invocation from `loadCentralConfig`, the comment block describing FR-007 from feature 025, the export `STORAGE_KEY_HOLIDAY_TICKET` from `js/config.js` (it has no remaining consumers after `cleanupLegacyKeys()` is gone), and the dedicated test file `tests/unit/settings-cleanup.test.js`.

**Concrete grep hits to remove** (verified 2026-05-08):

```
js/settings.js:44   // The legacy localStorage key is cleaned up by `cleanupLegacyKeys()` (FR-007).
js/settings.js:76   cleanupLegacyKeys();
js/settings.js:80   // FR-007: legacy per-user holiday-ticket localStorage from feature 019 is removed
js/settings.js:83   export function cleanupLegacyKeys() { ... }
js/config.js:17     export const STORAGE_KEY_HOLIDAY_TICKET = 'redmine_calendar_holiday_ticket';
tests/unit/settings-cleanup.test.js  (entire file)
```

**Rationale**: The migration path exists for users upgrading from feature 019 → 025. The app has never been deployed; no such users exist. The code adds boot-path overhead and noise.

**Alternatives considered**:

- _Keep it as a defensive safety net_: rejected per Constitution IV (YAGNI) and the explicit project decision recorded in BACKLOG.md feature 026 description.
- _Make it idempotent and silent_: rejected — silence isn't the issue, the issue is the existence of code that handles a state nothing produces.

---

## R2 — Time entries without start/end times (FR-002)

**Decision**: Drop all conditional paths that handle `entry.startTime == null` or `entry.endTime == null`. After this change, the data model invariant is **every TimeEntry has both `startTime` and `endTime` populated** (mapped from `easy_time_from` / `easy_time_to` in `mapTimeEntry`, which already requires both for valid entries from feature 025).

**Concrete grep hits to remove** (verified 2026-05-08):

```
js/calendar.js:55           if (!entry.startTime) classes.push('no-start-time');
js/calendar.js:185          if (!entry.startTime) { result.push(entry); continue; }
js/calendar.js:216          const hasStart = !!entry.startTime;        (and downstream uses)
js/calendar.js:250          if (!hasStart) classNames.push('no-start-time');
js/calendar.js:376          if (!entry.startTime) continue;
js/calendar.js:388          if (!entry.startTime) continue;
js/outlook.js:309           if (!entry.startTime) return false;
js/time-entry-form.js:244   e.infoEnd.value = endTime ?? addMinutes(startTime, hours);
                            (the `?? addMinutes(...)` fallback — the `addMinutes` import is also dead afterwards)
css/style.css:160           .fc-event.no-start-time { ... }            (entire rule)
```

**Test impact**: `tests/unit/calendar-render.test.js` has tests asserting the `'no-start-time'` className path; those assertions are removed (the test cases for `entry.startTime: null` are deleted). Any Playwright fixture entries without a `startTime` are updated to include one.

**Rationale**: Feature 018 made start time mandatory at creation; feature 025 made `mapTimeEntry` populate `endTime` from `easy_time_to` and added a fallback in `createTimeEntry` / `updateTimeEntry` to ensure the saved entry always carries `endTime`. There is no creation path that produces a `null` start or end. The fallback branches exist only for hypothetical pre-feature-018 entries that don't exist in any developer's Redmine.

**Alternatives considered**:

- _Tighten `mapTimeEntry` to filter out null-time entries instead of removing render fallbacks_: rejected — the entries don't exist; filtering would just be another defensive layer of the same kind.
- _Leave `entry.startTime` checks as guards but remove the className/CSS path_: rejected — half-measures keep the cognitive overhead. Going all-in clarifies the data model.

---

## R3 — Generic backward-compat sweep (FR-004)

**Decision**: Run a final sweep of grep keywords (`legacy|migration|backward|compatibility|for now|just in case|// removed|historical`) across `js/`, `css/`, and root-level `*.html` files. Remove any hits whose only justification is backward compatibility for this app's own past versions.

**Initial sweep results** (verified 2026-05-08, post-R1+R2 hits will already be gone):

```
js/settings.js  (covered by R1)
css/style.css:912   /* Input locked state — used historically; kept for any consumers still adding it */
```

The `.input--locked` CSS rule was retained during feature 025's modal redesign as a defensive net for any code path that might still add the class. **Decision**: remove the rule too — a fresh grep confirms no production code calls `classList.add('input--locked')` after the feature-025 redesign. Test mocks don't count.

**Rationale**: Same as R1 — defensive layers without consumers.

**Alternatives considered**: None applicable.

---

## R4 — Code-simplifier agent run (FR-003)

**Decision**: After R1, R2, R3 land and tests pass, invoke the `code-simplifier` agent (or the equivalent `/simplify` skill) on the post-cleanup codebase. The agent reports refactor candidates; each candidate is evaluated independently.

**Acceptance rule** (per the spec's edge case): pure refactors (rename, inline, deduplicate, simplify control flow) are accepted when they reduce code size or complexity without changing behavior. Semantic changes are rejected even if they look like simplifications.

**Output**: a list of accepted findings, each landed as a separate atomic commit. The list is recorded in this feature's `tasks.md` (generated by `/speckit.tasks`) at the time the agent is run, since findings are not knowable in advance.

**Rationale**: The agent is most useful after R1+R2 land — the cleanup itself may surface new simplification opportunities that wouldn't be obvious in the current codebase.

**Alternatives considered**:

- _Run the agent before R1+R2_: rejected — its findings would overlap with R1/R2 and create churn.
- _Skip the agent run_: rejected — explicitly part of the user's feature request.

---

## Summary of removal scope

| Slice                          | File(s)                                                                                                           | Lines (approx)    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ----------------- |
| R1 — localStorage migration    | `js/settings.js`, `js/config.js`, `tests/unit/settings-cleanup.test.js`                                           | ~50               |
| R2 — null start/end fallbacks  | `js/calendar.js`, `js/time-entry-form.js`, `js/outlook.js`, `css/style.css`, `tests/unit/calendar-render.test.js` | ~40               |
| R3 — backward-compat sweep     | `css/style.css`                                                                                                   | ~6                |
| R4 — simplifier-agent findings | TBD                                                                                                               | TBD               |
| **Total**                      |                                                                                                                   | **≥100 (SC-001)** |

All slices are independent; R1, R2, R3 may be done in any order. R4 runs last.
