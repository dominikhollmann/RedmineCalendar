# Implementation Plan: DRY Deduplication & Baseline Tightening

**Branch**: `claude/speckit-specify-issue-229-k2y42n` | **Date**: 2026-06-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/048-dry-deduplication/spec.md`

## Summary

Run a codebase-wide DRY audit over `js/` (and a manual semantic survey of
`scripts/**`), then unify the duplications worth unifying — token-identical
clones **and** semantic same-purpose/different-code pairs — behind single shared
abstractions. The headline target is the residual planning-view render
orchestration (Constitution VII's motivating case) plus four cross-file semantic
clusters (markdown rendering, fetch wrapper, booking→event mapping, config-ticket
resolution). Lower the committed `dup-baseline.json` to the post-cleanup level
**plus a small headroom**, keeping the enforced gate scoped to `js/`. Quality —
not the number — is the objective; where two same-purpose implementations diverge
in behaviour, treat it as a likely accidental artifact and converge to one correct
path, asking the product owner per case when intent is unclear.

**Audit baseline measured at plan time** (`npm run dup:report`, fresh):
**23 clones · 189 duplicated lines · 1.45 % lines (1.71 % tokens)** across 60
files — already well below the issue's stated 2.41 % / 30-clone starting point
(features 036 CSS-refactor and 046 FC-column factory cleaned much of it). The gap
to target is now the **clone count** (23 → < 20, ideally single digits) and the
**semantic** duplication the tool cannot see.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) — unchanged

**Primary Dependencies**: FullCalendar v6 (CDN), MSAL.js v2 (CDN), DOMPurify (CDN) — all existing; **no new runtime or dev dependencies**

**Storage**: N/A — refactor only. `dup-baseline.json` (committed gate baseline) is re-seeded; no app storage keys touched.

**Testing**: Vitest (node + jsdom unit) + Playwright (UI regression net). New unit tests for every extracted pure function, written before extraction (Red-Green-Refactor).

**Target Platform**: Static SPA in evergreen browsers — unchanged

**Project Type**: Single-project static front end (`js/**`, `css/**`, `scripts/**`)

**Performance Goals**: No regression — calendar/planning render < 300 ms (Constitution II); refactor is behaviour-preserving for intended behaviour.

**Constraints**: Hard module-size cap 600 effective LOC (`tests/unit/module-size.test.js`); soft 500 (SQI). `max-lines-per-function: 60` on `js/**`. SQI composite ≥ 80. Per-file unit coverage ≥ 95 % where the module is on the coverage list.

**Scale/Scope**: 60 `js/` source files, 13 055 lines; 23 token-clones to triage + a manual semantic pass over `js/**` and `scripts/**`.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle                               | Assessment                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I — Redmine API Contract**            | ✓ No API surface change. The shared `fetchJson` helper extracted from `chatbot-api.js`/`redmine-api.js` is a thin transport wrapper; the `X-Redmine-API-Key` header, HTTPS enforcement, and error-surfacing all stay intact — same behaviour, one implementation. No direct DB access introduced.                                                                                                             |
| **II — Calendar-First UX**              | ✓ Behaviour-preserving for intended behaviour. The booking→FC-event mapper and planning-view render orchestrator are extractions of existing logic; the Playwright suite is the regression net. Any accidental-divergence convergence (FR-005a) is the only intended visible change and is product-owner-approved per case. < 300 ms render unaffected.                                                       |
| **III — Test-First TDD**                | ✓ Each extracted pure function (markdown render, booking mapper, `resolveConfigTicket`, date/time utils, render-config orchestrator inputs) gets a unit test written **before** the extraction lands. Existing Playwright planning-view / chatbot / calendar specs are the behaviour-preservation gate; new assertions are added when a divergence is deliberately converged.                                 |
| **IV — Simplicity / YAGNI**             | ✓ Net complexity _down_: ~10 self-clones become local helpers, 6 cross-file clusters collapse to shared utilities. New modules are justified by ≥ 2 real consumers (Rule of Two). Module-size watch: `planning-view-column-base.js` is 446 eff-LOC — render orchestration goes into a **new** sibling `planning-view-column-render.js` rather than bloating the base toward the 600 cap. No new dependencies. |
| **V — Security by Default**             | ✓ Sanitisation is _preserved or strengthened_, never weakened. The shared markdown renderer must keep DOMPurify sanitisation; the divergence audit explicitly checks whether `chatbot.js` and `docs.js` currently sanitise identically (a known risk class — feature 035 hardened chatbot `renderMessage`). XSS-escaping in card content (`buildPlanningEvents`/`buildCardContent`) is untouched.             |
| **VI — Continuous Quality Gates**       | ✓ SQI must stay ≥ 80; `dup:check` baseline lowered to measured + small headroom. The baseline is re-seeded **only as a consequence of genuine unification** — moving the number without unifying is an anti-gaming violation (the feature's own out-of-scope clause). `knowledge:check` updated for new modules.                                                                                              |
| **VII — Reuse Before Reimplementation** | ✓ This feature _is_ the Constitution VII follow-through. The full reuse audit (every clone + disposition) is the Wiederverwendungs-Audit section below. Parallel-capability cases (Outlook/Teams render path) derive from a single shared orchestrator; deliberate exceptions are logged in Complexity Tracking.                                                                                              |

**Initial Constitution Check: PASS** — no violations. One watch-item (module size of `planning-view-column-base.js`) resolved by the new-sibling decision (research Decision 1).

## Project Structure

### Documentation (this feature)

```text
specs/048-dry-deduplication/
├── plan.md              # This file
├── research.md          # Phase 0 — audit methodology + refactor decisions
├── data-model.md        # Phase 1 — audit-record / baseline / shared-abstraction model
├── quickstart.md        # Phase 1 — UAT validation guide (behaviour-preserving + gates)
├── contracts/           # Phase 1 — interface contracts for the new shared abstractions
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (affected files)

```text
js/
├── planning-view-column-render.js   # NEW: renderPlanningColumn(config) + rerenderPlanningColumn() orchestrator
├── planning-view-outlook.js         # MODIFY: delegate render preamble/closing + rerender to orchestrator
├── planning-view-teams.js           # MODIFY: same
├── markdown.js                      # NEW: shared sanitised markdown→HTML renderer
├── chatbot.js                       # MODIFY: consume markdown.js; extract local message-render helper (#10,#11)
├── docs.js                          # MODIFY: consume markdown.js
├── http.js                          # NEW: shared fetchJson() transport wrapper (or extend config-store)
├── chatbot-api.js                   # MODIFY: consume fetchJson()
├── redmine-api.js                   # MODIFY: consume fetchJson(); host shared resolveConfigTicket via config-store
├── config-store.js                  # EXTEND: resolveConfigTicket(field) (was duplicated resolveTicket #21)
├── event-classes.js                 # MODIFY: consume resolveConfigTicket
├── calendar-overlays.js             # MODIFY: consume resolveConfigTicket; extract local helper (#22)
├── calendar.js                      # MODIFY: consume shared booking→event mapper; extract local helper (#17)
├── planning-view-bookings.js        # MODIFY: consume shared booking→event mapper (#18,#19)
├── booking-event-map.js             # NEW (or extend existing): shared booking→FC-event mapper
├── planning-view-dates.js           # MODIFY: extract local helper (#5); host shared date util (#6) if it fits
├── outlook.js                       # MODIFY: consume shared date/time utils (#6,#7)
├── time-entry-form-utils.js         # MODIFY: extract local helper (#2); consume shared time util (#7)
├── undo-actions.js                  # MODIFY: extract local helper (#1)
├── feedback.js                      # MODIFY: extract local DOM-builder helper (#8)
├── chatbot-tools-entries.js         # MODIFY: extract local helper (#14)
├── calendar-toolbar.js              # MODIFY: extract local helper (#20)
├── anomaly-render.js                # MODIFY: extract local helper (#23)
├── chatbot-tool-schemas.js          # REVIEW: #15 likely deliberately-kept (declarative schema data)
└── knowledge.topics.json            # UPDATE: route every new module (markdown, http, render orchestrator, booking-map)

scripts/                             # SURVEY only (semantic dup); fixes opportunistic; gate stays js/-scoped

tests/
├── unit/                            # NEW unit tests per extracted pure function (TDD)
└── ui/                              # EXISTING Playwright specs = behaviour-preservation regression net

dup-baseline.json                    # RE-SEED: measured post-cleanup count/% + small headroom (≤ 1.5% / < 20)
```

**Structure Decision**: Single-project front end. New shared modules are created
only where ≥ 2 real consumers exist (Rule of Two); local self-clones are folded
into private helpers in their own file. The exact module homes (e.g. `http.js`
vs. extending `config-store.js`; a new `booking-event-map.js` vs. extending an
existing mapper) are finalised per-cluster in research.md and locked by the
Phase-1 contracts.

## Wiederverwendungs-Audit (Constitution VII)

This **is** the DRY audit mandated by spec FR-001…FR-004. It has three parts:
(A) the full token-clone inventory with dispositions, (B) the semantic /
structural findings the tool cannot see, (C) the behaviour-divergence
investigation list.

### Part A — Token-clone inventory (jscpd, 23 clones)

| #   | Lines | Location A ↔ B                                                    | Kind                  | Disposition                    | Target abstraction                                 |
| --- | ----- | ----------------------------------------------------------------- | --------------------- | ------------------------------ | -------------------------------------------------- |
| 3   | 10    | `planning-view-outlook` ↔ `planning-view-teams` (state block)     | cross-file structural | **will fix (P1)**              | `planning-view-column-render.js` column controller |
| 4   | 11    | `planning-view-outlook` ↔ `planning-view-teams` (render preamble) | cross-file structural | **will fix (P1)**              | `renderPlanningColumn(config)` orchestrator        |
| 9   | 8     | `chatbot` ↔ `docs` (panel/render)                                 | cross-file semantic   | **will fix (P2)**              | `markdown.js` (+ panel toggle helper)              |
| 12  | 12    | `chatbot` ↔ `docs` (markdown render)                              | cross-file semantic   | **will fix (P2)**              | `markdown.js`                                      |
| 13  | 13    | `chatbot` ↔ `docs` (markdown render)                              | cross-file semantic   | **will fix (P2)**              | `markdown.js`                                      |
| 16  | 12    | `chatbot-api` ↔ `redmine-api` (fetch wrapper)                     | cross-file semantic   | **will fix (P2)**              | `fetchJson()` transport util                       |
| 18  | 11    | `calendar` ↔ `planning-view-bookings` (booking→event)             | cross-file semantic   | **will fix (P2)**              | shared booking→FC-event mapper                     |
| 19  | 10    | `calendar` ↔ `planning-view-bookings` (booking→event)             | cross-file semantic   | **will fix (P2)**              | shared booking→FC-event mapper                     |
| 21  | 7     | `calendar-overlays` ↔ `event-classes` (`resolveTicket`)           | cross-file structural | **will fix (P2)**              | `resolveConfigTicket()` in `config-store`          |
| 6   | 6     | `outlook` ↔ `planning-view-teams` (date helper)                   | cross-file structural | **will fix (P3)**              | shared date util                                   |
| 7   | 6     | `outlook` ↔ `time-entry-form-utils` (time helper)                 | cross-file structural | **will fix (P3)**              | shared time util                                   |
| 1   | 6     | `undo-actions` self                                               | local self-clone      | **will fix (P3)**              | local private helper                               |
| 2   | 6     | `time-entry-form-utils` self                                      | local self-clone      | **will fix (P3)**              | local private helper                               |
| 5   | 6     | `planning-view-dates` self                                        | local self-clone      | **will fix (P3)**              | local private helper                               |
| 8   | 11    | `feedback` self                                                   | local self-clone      | **will fix (P3)**              | local DOM-builder helper                           |
| 10  | 6     | `chatbot` self                                                    | local self-clone      | **will fix (P3)**              | local private helper                               |
| 11  | 7     | `chatbot` self                                                    | local self-clone      | **will fix (P3)**              | local private helper                               |
| 14  | 8     | `chatbot-tools-entries` self                                      | local self-clone      | **will fix (P3)**              | local private helper                               |
| 17  | 10    | `calendar` self                                                   | local self-clone      | **will fix (P3)**              | local event-map helper                             |
| 20  | 10    | `calendar-toolbar` self                                           | local self-clone      | **will fix (P3)**              | local private helper                               |
| 22  | 8     | `calendar-overlays` self                                          | local self-clone      | **will fix (P3)**              | local private helper                               |
| 23  | 14    | `anomaly-render` self                                             | local self-clone      | **will fix (P3)**              | local private helper                               |
| 15  | 14    | `chatbot-tool-schemas` self (create vs update schema)             | declarative data      | **deliberately kept (review)** | see Complexity Tracking                            |

### Part B — Semantic findings (jscpd-invisible, manual)

- **Planning-view render orchestration**: beyond clones #3/#4, the
  `rerenderOutlookColumn` and `rerenderTeamsColumn` functions are **byte-identical**
  (3-line bodies, below jscpd's 50-token / 5-line floor) and the render _closing_
  block (`setRenderedPlanningEvents` → `mountReadonlyFcColumn` → return) is
  structurally identical. The new orchestrator absorbs all of it. This is the exact
  Outlook/Teams drift class that motivated Constitution VII.
- **Event class-name computation** appears in `column-base._computeFcClassNames`
  (planning events) and in calendar overlay/`event-classes` paths (time-entry
  events). These operate on **different domains** (planningEvent vs. timeEntry) —
  _not_ unified; only the shared `resolveConfigTicket` leaf (#21) is extracted.
  Logged as a deliberate non-merge to avoid a leaky abstraction.
- **`scripts/**`survey** (per clarification, gate stays`js/`): inspect
`sqi.mjs`, `coverage-merge.mjs`, `dup-check.mjs`, `oss-generate.mjs` for
  same-purpose helpers (effective-LOC counting, JSON read/write, glob walking).
  Findings documented here at implement time; fixes are opportunistic and do not
  block the feature.

### Part C — Behaviour-divergence investigations (ask product owner if intent unclear)

Per FR-005a, each pair below is checked for _accidental_ divergence before
unifying; ambiguous intent is escalated, not guessed:

1. **Markdown rendering — `chatbot.js` vs `docs.js`**: do they sanitise
   identically and support the same syntax subset? If `docs.js` is less strict,
   converging on the hardened renderer is a security fix (call out in PR).
2. **Booking→FC-event mapping — `calendar.js` vs `planning-view-bookings.js`**:
   compare rounding, title/comment composition, and class assignment for silent
   drift.
3. **Date/time helpers — `outlook.js` / `planning-view-teams.js` /
   `time-entry-form-utils.js`**: confirm rounding and formatting agree before
   collapsing to one util.

### Part D — Audit corrections & divergence decisions (US1 implement-time, 2026-06-22)

The Part-C diffs **corrected three speculative abstraction guesses** in Parts A/B —
this is exactly the audit's purpose (the plan's pre-read names were tentative). The
findings below supersede the "Target abstraction" column for #9/#12/#13, #16, and
#18/#19, and record the two product-owner divergence decisions.

| Clones                                           | Plan guessed                | **Actual code**                                                                                                       | Real abstraction                                                                                                       | Divergence → decision                                                                                                                                                                          |
| ------------------------------------------------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #9, #12, #13 (`chatbot` ↔ `docs`)                | markdown renderer           | **panel controller** — `closeChatPanel`/`closeDocsPanel`, resize-handle drag, Escape handler                          | NEW `panel-controller.js` (open/close/resize/Escape), parameterised by panel/handle selectors + optional width-CSS-var | chatbot sets `--chatbot-panel-w` (main layout shifts); docs is pure overlay → **CONVERGE: both shift** (docs panel also gets the width var). Visible change to docs panel; flagged + asserted. |
| #16 (`chatbot-api` ↔ `redmine-api`)              | generic `fetchJson` wrapper | **`httpsOrigin(url)`** byte-identical helper + retry-status constants (`Set([429,503])`, count 2, base 1000 ms)       | extract `httpsOrigin()` (+ shared retry-status constants) to a small leaf                                              | **same** — `httpsOrigin` identical; the retry **error mapping** legitimately differs (AI vs `RedmineError`) → keep per-client, no fake `fetchJson`.                                            |
| #18, #19 (`calendar` ↔ `planning-view-bookings`) | booking→FC-event mapper     | **undo event-listener handlers** — `undo:preAnimate` + `undo:eventChanged` (find FC event, re-`toFcEvent`, highlight) | NEW undo-listener factory parameterised by calendar accessor + active-guard + `onAfterChange` hook                     | calendar's `undo:eventChanged` calls `recomputeDayTotals()`; planning-bookings copy doesn't → **CONVERGE: planning-bookings also recomputes** (accidental-drift fix). Flagged + asserted.      |

**Markdown is NOT duplicated** (dropped from scope): `docs.js` has its own
`renderMarkdown` for **trusted, first-party** bundled docs (`docs/content.*.md`),
while `chatbot.js` renders **untrusted AI/user** output through DOMPurify. Different
trust domains, different code, not a token-clone — unifying them would be wrong, not
DRY. No `markdown.js` is created.

**#17** (`calendar` self-clone, was "local event-map helper") is the
**create-form prefill block** (`openForm(null, prefill, async (newEntry) => {…})`)
duplicated between the paste-on-empty-slot and the drag-select handlers → extract a
local `openCreateForm(prefill, wasPaste)` helper.

**#6 / #7 confirmed same** (no divergence): `_todayStr`/`_offsetDate` are identical
across `outlook.js` and `planning-view-teams.js`; `timeToMins` is identical across
`outlook.js` (private), `time-entry-form-utils.js` (exported), **and**
`column-base.toMins` — unify all three on the exported `timeToMins`.

**`scripts/**`survey result** (T004; gate stays`js/`-scoped, fixes opportunistic):
`readJson(p) = JSON.parse(readFileSync(p,'utf8'))`is byte-identical across`scripts/oss-check-licenses.mjs`, `scripts/oss-generate.mjs`, and
`scripts/oss-drift-check.mjs`→ opportunistically extract a tiny shared`scripts/lib/json.mjs`. `effectiveLoc()`is already centralised in`scripts/sqi.mjs`(no action). Other inline`JSON.parse(readFileSync…)` sites are single-use (not worth
extracting). Not gated; done only if low-risk during US2.

### Part D-bis — Divergence decisions REVISED at implement-time (2026-06-22)

Reading the actual code during implementation corrected **both** divergence
framings from the original Part-D questions (the initial scans were inaccurate;
flagged honestly rather than coded around):

- **Panel `--chatbot-panel-w` (clones #9/#12/#13)** — the variable is **dead**:
  `chatbot.js` writes it in 3 places but **no CSS `var(...)` or JS ever reads it**;
  both panels are `transform: translateX` overlays. There was no real "chatbot
  shifts / docs overlays" difference. **Decision (revised, product-owner-approved):
  remove the dead var** and unify both panels as identical overlays via
  `js/panel-controller.js`. Zero visible change; dead-code removal. (Original
  "make both shift" would have been a _new feature_, not a dedup.)
- **Undo `recomputeDayTotals` (clones #18/#19)** — `recomputeDayTotals()` recomputes
  the **main calendar's** day-totals/ArbZG/anomaly header overlays; it is
  calendar.js-internal and the planning bookings column has **no such header**. The
  two undo-handler sets are **mutually exclusive** (calendar skips while planning
  view is active). So the bookings omission is **correct, not a drift bug**.
  **Decision (revised): keep the behavioural difference; unify only the listener
  _structure_** via `registerUndoListeners()` in `js/calendar-overlays.js` (placed
  there — not a new module — to avoid raising ACD coupling; both consumers already
  import it). `recomputeDayTotals` is injected by the calendar, omitted by the
  bookings column. The genuine drift it prevents: the calendar had gained recompute
  calls the copy never received.

## Complexity Tracking

| Item                                                                  | Decision                                              | Why a shared abstraction is insufficient / deferred                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clone #15 — `chatbot-tool-schemas` create vs update time-entry schema | **Deliberately kept** (pending implement-time review) | The two blocks are declarative JSON-schema literals for two distinct tool contracts. A parameterised builder would trade readable, greppable schema definitions for indirection with no fix-once maintenance benefit (the fields legitimately differ). If a low-risk shared field-set emerges during implement, extract that subset only.                                                                                                                                                                                                                                                                                                                             |
| Event class-name computation (planning vs. time-entry)                | **Not unified**                                       | `column-base._computeFcClassNames` and the calendar/`event-classes` path serve different domain objects (planningEvent vs. timeEntry) with different class vocabularies. Only the shared `resolveConfigTicket` leaf is extracted; merging the full builders would be a leaky abstraction (Constitution IV/VII).                                                                                                                                                                                                                                                                                                                                                       |
| `scripts/**` duplication                                              | **Out of enforced-gate scope**                        | Per the clarification, the `dup:check` gate + baseline stay `js/`-scoped; `scripts/**` is surveyed and fixed opportunistically, not gated. Expanding the gate is a separate future change.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ACD rose 7.65 → 7.99 from the DRY extractions                         | **Accepted trade; SQI band re-anchored 16 → 20**      | This feature's three shared-module extractions (`http.js`, `panel-controller.js`, `planning-view-column-render.js`) each remove duplication (jscpd ↓) but add a dependency edge to every caller (ACD ↑). Net: ACD 7.65 → 7.99, dropping the SQI ACD sub-score 83.5 → 80.2 — right on the floor. The project explicitly prioritises DRY over ACD, so the owner widened the SQI `acd` band lower cut-off 16 → 20 (ACD 20 → score 0; ACD 6 → 100) to give headroom for future shared-module extraction instead of penalising it. Deliberate, documented policy change (metric was already passing), not a silent re-tune. New sub-score 86; floor (80) now at ACD ≈ 8.8. |

No Constitution violations require justification — the refactor _reduces_
duplication. It mildly raises ACD coupling (an inherent DRY ↔ coupling
trade-off, documented in the table above with the deliberate SQI-band
re-anchoring); the table records that and the deliberate non-merges so neither is
mistaken for undocumented duplication or a silently-gamed metric (anti-gaming).

---

## Phase 0: Research

_See [research.md](research.md) for full findings. Key decisions summarised here._

- **Decision 1 — Render orchestrator lives in a new sibling**
  `planning-view-column-render.js`, not in `planning-view-column-base.js` (446
  eff-LOC, approaching the cap). Keeps selection/enrichment state separate from
  render lifecycle and avoids module-size pressure.
- **Decision 2 — `renderPlanningColumn(config)` shape**: a single async
  orchestrator taking `{ container, date, bookings, col, fcRef, availabilityGuard,
fetchAndBuild, errorKey, retryKey }`, owning the preamble (destroy/reset),
  guard, spinner-fetch, `buildPlanningEvents`, mount, and return.
  `rerenderPlanningColumn` replaces both identical `rerender*Column` bodies.
- **Decision 3 — Shared markdown renderer (`markdown.js`)** keeps DOMPurify
  sanitisation and is consumed by both `chatbot.js` and `docs.js`; converge on the
  stricter sanitiser (security-positive). Extracting it also relieves `chatbot.js`
  (493 eff-LOC, near the 500 soft cap).
- **Decision 4 — `fetchJson()` transport util** (`http.js`) wraps fetch +
  JSON-parse + error normalisation, consumed by `chatbot-api.js` and
  `redmine-api.js`; Redmine header/HTTPS rules stay in `redmine-api.js`.
- **Decision 5 — Shared booking→FC-event mapper** consumed by `calendar.js` and
  `planning-view-bookings.js` after the divergence check.
- **Decision 6 — Baseline policy**: re-seed `dup-baseline.json` to the measured
  post-cleanup count/% **+ ~1–2 clone headroom**, within ≤ 1.5 % / < 20.
- **Decision 7 — TDD order**: unit-test each pure extraction first; run the
  Playwright suite as the behaviour-preservation gate; add/adjust assertions only
  for product-owner-approved convergences.

## Phase 1: Design & Contracts

_See [data-model.md](data-model.md), [contracts/](contracts/), and
[quickstart.md](quickstart.md)._

- **data-model.md** — the audit-record / duplication-baseline / shared-abstraction
  model and the concrete inventory of abstractions to create.
- **contracts/** — interface contracts (signatures + invariants) for
  `renderPlanningColumn`, `rerenderPlanningColumn`, `renderMarkdown`, `fetchJson`,
  the booking→event mapper, and `resolveConfigTicket`.
- **quickstart.md** — UAT validation guide: prove behaviour-preserving (existing
  suites green), the baseline lowered + enforced, and SQI ≥ 80.

**Post-Design Constitution Re-check: PASS** — the design adds no dependencies,
keeps every new/extended module under the size caps, preserves all sanitisation,
and unifies parallel capabilities behind single bases. No new violations.

---

## Process Reminder

_Dieser Abschnitt entspricht dem Preset-Appendix (`.specify/preset-sources/redminecalendar/templates/plan-process-appendix.md`)._

### Constitution Check Pflicht-Gates

Alle sieben Prinzipien sind im Constitution-Check oben adressiert (Tabelle).
Schwerpunkt dieses Features: **VII (Reuse)** — der vollständige Audit liegt im
Wiederverwendungs-Audit-Abschnitt.

### SQI-Gate Reminder

```bash
npm run sqi        # Composite ≥ 80 (hard gate)
npm run lint       # max-lines-per-function 60 (js/**)
npm run typecheck  # JSDoc + tsc --noEmit
npm run dup:check  # Baseline-Ratchet (nach Re-Seed auf neuen Tiefststand + Headroom)
npm run knowledge:check  # Neue Module müssen in knowledge.topics.json geroutet sein
```

### UI-Test-Iteration (Playwright)

```bash
npm run test:ui             # Baseline-Fehlerliste
npm run test:ui:failed      # schnelle Iteration
npm run test:ui             # volle Bestätigung vor letztem Commit
```

Code-Commits (`.js`) laufen durch die `ci:local`-Pipeline (~1 min) im Pre-Push-Hook.

## Implementation Outcome (US2 + US3 complete)

**Duplication: 23 clones / 1.45 % lines → 9 clones / 0.95 % (0.51 % tokens)**;
`dup-baseline.json` re-seeded to **11 clones / 0.7 %** (measured 9 + small headroom
per the Q3 decision), well inside the ≤ 1.5 % / < 20 ceiling. SQI **97.00 GREEN**,
0 cycles, ACD 80; all per-PR gates green; full unit suite unchanged from the
pre-existing baseline (0 new failures).

**Shared abstractions created / extended:**

- `js/planning-view-column-render.js` (NEW) — `renderPlanningColumn` /
  `rerenderPlanningColumn` orchestrator (clones #3/#4 + the byte-identical
  `rerender*Column`).
- `js/panel-controller.js` (NEW) — `hidePanelAfterClose` / `wireEscapeToClose` /
  `installPanelResizer`; removed the dead `--chatbot-panel-w` var (#9/#12/#13).
- `js/http.js` (NEW) — `httpsOrigin` + retry constants + `fetchWithRetry` (#16 + the
  retry-loop clone).
- `js/calendar-overlays.js` (EXTEND) — `registerUndoListeners` factory (#18/#19;
  placed here, not a new module, to hold ACD ≤ gate) + `resolveConfigTicket` (#21,
  in `config-store.js`).
- `js/outlook.js` — exported `todayYmd` / `offsetYmd` demo-date helpers (#6).
- In-file private helpers: `_submitNewEntry` (calendar), `_makeKvTable` reuse
  (feedback), `_computeOverflow` (toolbar), `_recreateEntry` (undo-actions),
  `_ticketRef` (time-entry-form-utils), `_skipWeekend` (planning-view-dates),
  `_wireBadgeToggle` (anomaly-render).

**Deliberately kept (documented, not gamed):**

- #2 planning-view-outlook/teams **module-state instantiation boilerplate**
  (`createColumnState()` + per-module re-exports + `_fcRef`) — ES modules cannot
  dynamically re-export, so a factory would not remove the per-module export
  surface; the cost outweighs the benefit (Constitution IV).
- #7 `chatbot-tool-schemas` create-vs-update declarative JSON schema literals (per
  the original Complexity Tracking entry).
- #3 `timeToMins` (outlook ↔ time-entry-form-utils): a 6-line primitive whose only
  cross-module unification would add an `outlook → time-entry-form-utils` edge with
  ACD already at the 80 gate — not worth the coupling for the size.
- A handful of residual ≤ 8-line intra-file fragments whose extraction would create
  whack-a-mole byproducts or hurt readability.

**Behaviour:** preserved. The two original "divergence" framings were corrected at
implement-time (Part D-bis): the panel width var was dead (removed, no visible
change) and the undo recompute omission was correct (kept). No behaviour-changing
convergence shipped; the full Playwright suite runs in CI as the behaviour gate.

### UAT addendum (2026-06-22)

Rebased onto `main` (dependency bumps, incl. **jscpd 4.2.5 → 5.0.11**). jscpd 5.x
re-measures the tree: **1 clone / 0.08 %** (the intentionally-kept
`calendar-toolbar` overflow-indicator block). `dup-baseline.json` re-seeded
**11/0.70 % → 3/0.20 %** (measured 1 + small headroom). Final SQI **97.90 GREEN**,
0 cycles.

Three changes landed during UAT (each committed on-branch, behaviour verified by
the full 203-test Playwright suite + 1654 unit tests):

- **Bug fix — batch booking undo:** dragging N planning events pushed N `add`
  undo actions; one Ctrl+Z now reverses the whole batch via a buffered
  `ACTION_BULK_ADD` (new). A behavioural convergence — recorded in the Scenario 6
  walkthrough below.
- **Bug fix — planning-view total lag:** resize recomputed totals from the FC
  event's stale `timeEntry.hours`; now refreshes the attached entry before
  recompute (mirrors `calendar.js`). No clones added.
- **Two further dedups** surfaced by jscpd 5.x: `confirmClosedTicket()` extracted
  to `confirm-dialog.js` (calendar drag-drop ↔ planning batch booking — true
  cross-module clone) and `_resolveEntryArg()` for the chatbot
  `executeEdit`/`executeDelete` guard prologue. The bulk undo/redo bodies share a
  new `_bulkApply` helper.

**ACD ↔ DRY trade + band re-anchor:** the feature's shared-module extractions
raised ACD 7.65 → 7.99 (old SQI sub-score 83.5 → 80.2, on the floor). Per owner
decision the SQI `acd` band lower cut-off was widened **16 → 20** (ACD 20 → 0;
ACD 6 → 100) to give headroom for future DRY extraction — the project prioritises
DRY over ACD coupling. New sub-score **86**; floor (80) now at ACD ≈ 8.8. See the
Complexity Tracking row. This supersedes the earlier note that line 364's
`registerUndoListeners` placement was driven by holding "ACD ≤ the 80 gate".
