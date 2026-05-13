# Implementation Plan: Time Entry Anomaly Detection

**Branch**: `029-anomaly-detection` | **Date**: 2026-05-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/029-anomaly-detection/spec.md`

## Summary

Add a passive, non-blocking anomaly detector that evaluates every visible time entry against two rules — `very-short-entry` (≤ 0.1h) and `overlapping-entries` (same-day time-range intersection, excluding synthetic break-ticket blocks). Each matching entry gets a small badge inside its FullCalendar event element. Hover/click reveals the reason(s). Pure client-side, recomputed at render time and after every CRUD; no new API calls; mobile and desktop both supported.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation, no build step)
**Primary Dependencies**: FullCalendar v6 (CDN, existing); no new deps
**Storage**: none — anomaly tags are transient, recomputed on every render
**Testing**: Vitest (unit — pure rule predicates + aggregator); Playwright (UI — badge appears/disappears, tooltip content, mobile, no-network-fetch invariant)
**Target Platform**: modern desktop + mobile browsers; both visible per FR-008
**Project Type**: static SPA (single project)
**Performance Goals**: anomaly recomputation under 300 ms after CRUD (SC-002); the rule pass is O(n²) within a single day in the worst case (overlap rule is pairwise within day) — at < 50 entries / day this is trivially fast
**Constraints**: zero new Redmine API calls (SC-003, FR-007); single non-stacked indicator per entry even if multiple rules match (Assumption); existing entry rendering must not be visually displaced (FR-008, FR-011)
**Scale/Scope**: ~2 new modules (`js/anomalies.js`, `js/anomaly-render.js`), ~1 modified function in `js/calendar.js` (add `eventDidMount` callback), ~6 i18n keys, ~30 LOC of CSS, ~2 unit-test files, ~1 Playwright spec.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle            | Status  | Notes                                                                                                               |
| --- | -------------------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| I   | Redmine API Contract | ✅ Pass | Zero new API calls. FR-007 / SC-003 explicitly forbid them.                                                         |
| II  | Calendar-First UX    | ✅ Pass | Mobile in scope per spec.md (FR-008). Indicator is unobtrusive (FR-011) and recomputes within 300 ms (SC-002).      |
| III | Test-First           | ✅ Pass | Pure rule predicates + aggregator are Vitest-covered. Visual behaviour covered by Playwright. TDD enforced.         |
| IV  | Simplicity & YAGNI   | ✅ Pass | Two small modules, two rules. The "unfamiliar ticket" rule was explicitly descoped; v1 ships only what's necessary. |
| V   | Security by Default  | ✅ N/A  | Reason strings come from i18n (translated, fixed). No untrusted data rendered.                                      |

No violations. Complexity Tracking section remains empty.

## Project Structure

### Documentation (this feature)

```text
specs/029-anomaly-detection/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/                   # (empty — internal feature, no external interfaces)
└── tasks.md
```

### Source Code (repository root)

```text
js/
├── anomalies.js                 # NEW — pure rule engine: detectAnomalies(entries, { breakTicket, holidayTicket }) → Map<entryId, AnomalyTag>. Two rule functions (veryShortEntry, overlappingEntries) + aggregator.
├── anomaly-render.js            # NEW — DOM glue: given the anomaly map and an FC event element, attach/remove the badge and wire its tooltip.
├── calendar.js                  # MODIFY — call detectAnomalies(...) inside the existing render flow (after each loadWeekEntries / event refresh), and apply badges via the FC eventDidMount hook.
└── i18n.js                      # MODIFY — add EN+DE keys for rule names, reason messages, tooltip aria-label.

css/
└── style.css                    # MODIFY — `.fc-event--anomaly` modifier (badge in corner of event), `.anomaly-tooltip` rules (hover + click). Touch-device tap-to-toggle styles.

tests/
├── unit/
│   ├── anomalies-rules.test.js        # NEW — Vitest: every edge case from spec for both rules
│   └── anomalies-aggregator.test.js   # NEW — Vitest: detectAnomalies returns the expected Map; multi-rule entries are merged into a single tag with both reasons
└── ui/
    └── anomalies.spec.js              # NEW — Playwright: badge appears, tooltip content, edit makes it disappear, mobile visible, network-tab assertion
```

**Structure Decision**: Single-project SPA. The `js/anomalies.js` module is **purely functional** — accepts an entries array, returns a Map. Zero DOM, zero `fetch`, zero `Date.now`. The `js/anomaly-render.js` module is the only file holding DOM glue.

## Phase 0 Output → research.md

Resolves the touch-points needed for design:

1. The right FullCalendar v6 hook for attaching a per-event badge after render (`eventDidMount(info)` is the canonical hook).
2. The existing entry-loading pipeline so we know exactly where to call `detectAnomalies`.
3. How break-ticket entries are identified today (`Number(entry.issueId) === Number(cfg.breakTicket)`, exactly the pattern already in `js/calendar.js:53`).
4. Whether the tooltip should be HTML-`title`, a custom popover, or reuse an existing component (decision: minimal HTML+CSS popover anchored on hover for desktop and click for touch — see research.md §R5).
5. How midnight-split entries are tracked (the `_isMidnightContinuation` marker; both halves carry the same anomaly tag).

## Phase 1 Output → data-model.md, quickstart.md, contracts/

- **data-model.md**: documents the transient `AnomalyTag { ruleIds: string[]; reasons: string[] }` and the `Map<entryId, AnomalyTag>` returned by `detectAnomalies`.
- **quickstart.md**: step-by-step UAT covering both user stories + edge cases.
- **contracts/**: empty directory with a README explaining "no external interfaces — internal calendar overlay".

## Open Questions

(Per user instruction: collected here rather than asked interactively.)

1. **Tooltip primitive**: native `title` vs custom popover. Custom popover preferred (FR-011 — needs to be touch-friendly for mobile). Plan uses a small CSS `.anomaly-tooltip` element with JS toggle on click + CSS `:hover` show. No new dependency.
2. **Badge placement inside the FC event element**: top-right corner, `position: absolute` inside the FC event, no flow displacement (FR-008, FR-011). Pixel placement settled during implementation.
3. **i18n for multi-rule reasons**: when an entry matches both rules, the tooltip lists both reasons. The visible badge stays a single icon. See research.md §R6.
4. **Performance ceiling**: O(n²) within-day overlap is fine at n ≤ 50/day (≤ 1225 comparisons). No optimization needed for v1; sweep-line algorithm only if profiling shows a hotspot.

## Complexity Tracking

_No Constitution violations — no entries._
