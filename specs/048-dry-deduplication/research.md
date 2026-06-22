# Phase 0 Research: DRY Deduplication & Baseline Tightening

**Feature**: 048-dry-deduplication | **Date**: 2026-06-22

This document captures the audit methodology and the per-cluster refactor
decisions. No NEEDS CLARIFICATION remained after `/speckit-clarify` (audit scope,
convergence shipping, and baseline policy were all resolved).

## Audit methodology

1. **Tool pass** — `npm run dup:report` → `coverage/jscpd/jscpd-report.json`.
   Measured at plan time: **23 clones / 189 lines / 1.45 % lines / 1.71 % tokens**
   over 60 `js/` files. Every clone is enumerated and dispositioned in the plan's
   Wiederverwendungs-Audit Part A.
2. **Semantic pass** — manual inspection for same-purpose/different-code:
   parallel modules (planning-view-*), repeated guard/fetch/render/util patterns,
   and sub-jscpd-floor identical functions (e.g. the `rerender*Column` pair).
   Captured in Part B.
3. **`scripts/**`survey** — manual same-purpose sweep; gate stays`js/`-scoped
   per the clarification; fixes opportunistic.
4. **Divergence pass** — for each cross-file semantic pair, diff observable
   behaviour; classify intended vs. accidental; escalate ambiguous intent
   (Part C / FR-005a).

---

## Decision 1 — Render orchestrator as a new sibling module

**Decision**: Put the shared planning-column render lifecycle in a **new**
`js/planning-view-column-render.js`, not inside `planning-view-column-base.js`.

**Rationale**: `planning-view-column-base.js` is 446 effective LOC (soft cap 500,
hard cap 600). It already owns a cohesive concern — selection pool + FC card
content + async enrichment + per-column state factory. The render _lifecycle_
(destroy/reset preamble → availability guard → spinner-fetch → build → mount →
return, plus the in-place rerender) is a separate concern and ~60–90 LOC. Adding
it to the base would crowd the cap and mix two responsibilities. A sibling keeps
both modules focused and under the soft cap.

**Alternatives rejected**:

- _Extend `column-base.js`_ — risks the size cap and conflates state with render
  lifecycle.
- _Copy-fix in each `planning-view-_` module\* — the status quo; exactly the drift
  class Constitution VII forbids.

## Decision 2 — `renderPlanningColumn(config)` shape

**Decision**: One async orchestrator parameterised by a config object:

```text
renderPlanningColumn({
  container, date, bookings, col, fcRef,   // fcRef: a {current} box holding the live FC instance
  availabilityGuard,   // async (container,date,bookings) => boolean
  fetchAndBuild,       // async () => items[] | null  (source-specific: fetch+parse+adapt)
  errorKey, retryKey,  // i18n keys for the shared spinner/error path
}) => Promise<PlanningEvent[]>
```

The orchestrator owns the byte-identical parts: instance teardown, container
reset, `col.setRenderedPlanningEvents([])` + `col.clearSelection()`, the guard
short-circuit, `withSpinnerAndError`, `buildPlanningEvents`, `mountReadonlyFcColumn`,
and the return. `rerenderPlanningColumn(col, fcRef, planningEvents)` replaces the
two identical `rerender*Column` bodies.

**Rationale**: The Outlook and Teams render functions differ _only_ in (a) the
availability guard and (b) how raw source data becomes `buildPlanningEvents`
input. Both are injected as callbacks; everything else is shared. The module-level
`_fcInst`/`_currentDate` per-file state becomes a small `fcRef` box passed in, so
the orchestrator can destroy/replace it without globals.

**Alternatives rejected**:

- _Class/inheritance hierarchy_ — heavier than vanilla ES modules need; the
  callback-config approach matches the existing `withSpinnerAndError` style.

## Decision 3 — Shared markdown renderer (`js/markdown.js`)

**Decision**: Extract a single `renderMarkdown(src) => HTMLElement|string`
(sanitised via DOMPurify) consumed by both `chatbot.js` and `docs.js`.

**Rationale**: Clones #9/#12/#13 are markdown→HTML rendering duplicated across the
chat panel and the docs panel. One renderer means one sanitisation policy and one
syntax surface. **Security-positive**: feature 035 hardened `chatbot.renderMessage`
sanitisation; the divergence check (Part C #1) confirms whether `docs.js` matches —
if it is weaker, converging on the hardened path is a deliberate, flagged security
fix. Extraction also relieves `chatbot.js` (493 eff-LOC, near the 500 soft cap).

**Alternatives rejected**:

- _Add a markdown dependency_ — violates Simplicity/YAGNI; the existing hand-rolled
  renderer is sufficient and dependency-free.

## Decision 4 — Shared `fetchJson()` transport util (`js/http.js`)

**Decision**: Extract `fetchJson(url, options) => Promise<json>` wrapping fetch +
`res.ok` check + JSON parse + normalised error, consumed by `chatbot-api.js` and
`redmine-api.js` (clone #16).

**Rationale**: Both clients hand-roll the same fetch+error shell. A thin transport
util removes the duplication while **leaving Redmine-specific concerns in
`redmine-api.js`** — the `X-Redmine-API-Key` header, HTTPS-only proxy target, and
domain error mapping stay where they belong (Constitution I/V). The shared util is
transport-only.

**Open sub-decision** (locked in implement): `js/http.js` (new leaf) vs. extending
`config-store.js`. Lean: new `js/http.js` leaf — `config-store.js` is about config
state, not transport; a dedicated leaf is cleaner and easy to unit-test.

## Decision 5 — Shared booking→FC-event mapper

**Decision**: Extract the booking→FullCalendar-event mapping shared by
`calendar.js` and `planning-view-bookings.js` (clones #18/#19) into a single
mapper, **after** the divergence diff (Part C #2).

**Rationale**: Both build FC event objects from Redmine time entries. If the
mapping has silently drifted (rounding, title/comment, class assignment), that is
the FR-005a accidental-divergence case: converge to the correct one, update the
affected assertion, flag it. Home: a small `js/booking-event-map.js` leaf unless
an existing mapper is the obvious host (decided in implement after reading both
sites).

## Decision 6 — `resolveConfigTicket()` leaf

**Decision**: Extract the duplicated `resolveTicket(cfg, field)` (clone #21,
present in `event-classes.js` and `calendar-overlays.js`) into one exported helper
in `config-store.js` — `resolveConfigTicket(field)` reading `getCentralConfigSync()`.

**Rationale**: It is a pure config-reading leaf (`Number.isFinite(id) && id > 0`).
`config-store.js` already owns central-config access, so it is the natural home —
no new module needed (reuse-first, FR-010).

## Decision 7 — Baseline re-seed policy

**Decision**: After cleanup, re-seed `dup-baseline.json` to the freshly measured
`{clones, percentage}` **plus ~1–2 clone headroom**, asserting the seeded value
stays within ≤ 1.5 % / < 20 clones. Use `node scripts/dup-check.mjs --seed` then
nudge the committed count up by the small headroom (or seed and accept the exact
number if it already leaves comfortable margin under 20).

**Rationale**: Per the clarification, zero-headroom is too brittle for unrelated
future work; a small buffer keeps the ratchet meaningful without trip-wiring the
next PR. The headroom must not push the committed figure to or above the ceiling.

## Decision 8 — Self-clone handling (P3)

**Decision**: Each of the ~10 single-file self-clones (#1,#2,#5,#8,#10,#11,#14,
#17,#20,#22,#23) becomes a private helper within its own module. No new modules;
no cross-module coupling.

**Rationale**: These are local copy-paste within one file — the fix is a private
function, the lowest-risk, highest-clarity change. They make up the bulk of the
clone-count reduction toward < 20.

## Decision 9 — Test strategy (behaviour preservation + TDD)

**Decision**: For every _pure_ extraction (markdown render, `fetchJson`, booking
mapper, `resolveConfigTicket`, date/time utils), write a node/jsdom unit test
**before** extracting (Red-Green-Refactor). The full Playwright suite is the
behaviour-preservation gate for the DOM-heavy render orchestrator and the in-file
helpers. New/changed assertions appear **only** where a divergence is deliberately
converged (FR-006), and each such change is flagged in the PR.

**Rationale**: Matches the project's testing-architecture decision rule (pure
logic → Vitest; FC/real-DOM glue → Playwright). The render orchestrator stays on
the Playwright coverage path; its injected pure inputs are unit-tested.

## Risks & mitigations

| Risk                                                       | Mitigation                                                                                                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Module-size cap breach when adding shared modules          | New siblings (render, markdown, http, booking-map) _remove_ LOC from large files (`chatbot.js`, planning-view pair); net effect lowers max module size. |
| A "unification" hides a real intended behaviour difference | Part C divergence pass + FR-005a escalation to product owner before converging.                                                                         |
| Over-abstraction (leaky shared base)                       | Complexity Tracking logs deliberate non-merges (#15, event-class builders); Rule of Two gates new modules.                                              |
| Baseline re-seed without genuine unification (gaming)      | Forbidden by spec out-of-scope clause + Constitution VI/VII; PR review checks each clone's disposition was actually applied.                            |
