# Phase 1 Data Model: DRY Deduplication & Baseline Tightening

**Feature**: 048-dry-deduplication | **Date**: 2026-06-22

This feature is a refactor; it introduces no runtime persistent entities. The
"data model" here is (1) the process artifacts the audit produces and (2) the
concrete inventory of shared abstractions to create.

## Process entities

### DRY Audit Record

The documented inventory of duplications. **Source of truth**: the plan's
Wiederverwendungs-Audit section (Parts A/B/C).

| Field               | Type     | Notes                                                                   |
| ------------------- | -------- | ----------------------------------------------------------------------- |
| `id`                | string   | jscpd clone number, or `S#`/`D#` for semantic/divergence findings       |
| `locations`         | string[] | `file:startLine-endLine` for each copy                                  |
| `kind`              | enum     | `token-identical` \| `structural` \| `semantic`                         |
| `lines`             | number   | duplicated line count (token clones)                                    |
| `severity`          | enum     | derived from lines × call-site risk                                     |
| `effort`            | enum     | `low` (local helper) \| `medium` (shared leaf) \| `high` (orchestrator) |
| `disposition`       | enum     | `will-fix` \| `deliberately-kept`                                       |
| `targetAbstraction` | string   | the module/function that absorbs it                                     |
| `justification`     | string   | required when `deliberately-kept`                                       |

### Duplication Baseline (`dup-baseline.json`)

| Field        | Type   | Validation                                       |
| ------------ | ------ | ------------------------------------------------ |
| `clones`     | number | post-cleanup measured + small headroom; **< 20** |
| `percentage` | number | post-cleanup line %; **≤ 1.5**                   |

State transition: `{29, 2.16}` (current committed) → measured-after-cleanup +
headroom (target single-digit clones, well under 1.5 %). Re-seeded via
`scripts/dup-check.mjs --seed`, then headroom applied; gate scope stays `js/`.

### Shared Abstraction

A single module/function that holds logic formerly copied across call sites.
Inventory below.

## Shared-abstraction inventory

| Abstraction                                  | Home (new/extend)                          | Consumers                                            | Replaces clones                                | Purity                             |
| -------------------------------------------- | ------------------------------------------ | ---------------------------------------------------- | ---------------------------------------------- | ---------------------------------- |
| `renderPlanningColumn(config)`               | NEW `planning-view-column-render.js`       | `planning-view-outlook.js`, `planning-view-teams.js` | #3, #4 + identical `rerender*` + closing block | DOM glue → Playwright              |
| `rerenderPlanningColumn(col, fcRef, events)` | same                                       | same                                                 | byte-identical `rerender*Column`               | DOM glue → Playwright              |
| `renderMarkdown(src)`                        | NEW `markdown.js`                          | `chatbot.js`, `docs.js`                              | #9, #12, #13                                   | pure-ish → jsdom unit              |
| `fetchJson(url, options)`                    | NEW `http.js`                              | `chatbot-api.js`, `redmine-api.js`                   | #16                                            | pure transport → unit (mock fetch) |
| booking→FC-event mapper                      | NEW `booking-event-map.js` (or extend)     | `calendar.js`, `planning-view-bookings.js`           | #18, #19                                       | pure → node unit                   |
| `resolveConfigTicket(field)`                 | EXTEND `config-store.js`                   | `event-classes.js`, `calendar-overlays.js`           | #21                                            | pure → node unit                   |
| shared date util (`todayYMD`/offset)         | `planning-view-dates.js` or date leaf      | `outlook.js`, `planning-view-teams.js`               | #6                                             | pure → node unit                   |
| shared time util                             | `time-entry-form-utils.js` or `outlook.js` | `outlook.js`, `time-entry-form-utils.js`             | #7                                             | pure → node unit                   |
| ~10 local private helpers                    | in-file                                    | single module each                                   | #1,2,5,8,10,11,14,17,20,22,23                  | varies                             |

## Validation rules (invariants the refactor must hold)

- **VR-1**: Every `will-fix` clone in Part A has exactly one surviving
  implementation after the change (no residual independent copy).
- **VR-2**: Every new `js/*.js` module appears in `js/knowledge.topics.json` (or
  the `knowledge-check` ignore set). `npm run knowledge:check` green.
- **VR-3**: No module exceeds 600 effective LOC; none of the new shared modules
  exceeds 500. (`tests/unit/module-size.test.js` green.)
- **VR-4**: `renderMarkdown` output is DOMPurify-sanitised for every input
  (security invariant — no weakening vs. current `chatbot` path).
- **VR-5**: `fetchJson` preserves the `X-Redmine-API-Key` header path and HTTPS
  enforcement for Redmine calls (transport-only; domain rules stay in
  `redmine-api.js`).
- **VR-6**: `dup-baseline.json` after re-seed satisfies `clones < 20` and
  `percentage ≤ 1.5`, and was produced from genuinely unified code (not a manual
  number bump).
- **VR-7**: Intended behaviour unchanged (Playwright + unit suites green); any
  converged accidental divergence has updated assertions + a PR call-out +
  product-owner sign-off.
