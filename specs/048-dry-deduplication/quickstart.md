# Quickstart / UAT: DRY Deduplication & Baseline Tightening

**Feature**: 048-dry-deduplication

This is an internal refactor: the primary acceptance is **nothing user-visible
changed** (except any product-owner-approved accidental-divergence convergence)
plus the quality gates tightened. Scenarios are written as UAT checkboxes.

## Prerequisites

```bash
npm ci
npm run dev        # HTTPS dev server + CORS proxies, for the manual UI scenarios
```

## Scenario 1 — Duplication audit & baseline tightened

- [ ] Run `npm run dup:report` and confirm the clone count is **below 20** (down from 23) and line duplication is **≤ 1.5 %**.
- [ ] Open `dup-baseline.json` and confirm `clones < 20` and `percentage ≤ 1.5`, with only a small headroom above the freshly measured number.
- [ ] Run `npm run dup:check` and confirm the ratchet gate **passes** against the cleaned tree.
- [ ] Confirm the gate config (`.jscpd.json`) still scopes to `js/` (scripts/ not gated, per the clarification).

## Scenario 2 — Planning view behaves identically (Outlook + Teams)

- [ ] Open the planning view; the Outlook and Teams columns render their events exactly as before.
- [ ] Trigger an error/retry path (e.g. disabled/disconnected source) and confirm the prompt + retry button behave as before.
- [ ] Change the time-range/slot height and confirm both columns re-render in place without flicker (shared `rerenderPlanningColumn`).
- [ ] Select events across both columns and drag to Bookings; the shared selection pool + deselect-on-background-click still work.

## Scenario 3 — Chat & docs markdown render identically (and safely)

- [ ] Open the chatbot panel; a markdown reply renders the same as before.
- [ ] Open the docs panel; markdown content renders the same as before.
- [ ] Confirm a `<script>`/HTML-injection attempt in markdown content is sanitised in **both** panels (shared `renderMarkdown`, DOMPurify).

## Scenario 4 — Calendar & API unchanged

- [ ] Load the calendar; bookings render as FC events exactly as before (shared booking→event mapper).
- [ ] Create/update a time entry via the chatbot tool path and via the form; both succeed (shared `fetchJson`, Redmine header intact).
- [ ] Confirm break/holiday/vacation tickets still resolve correctly (shared `resolveConfigTicket`).

## Scenario 5 — Quality gates green

- [ ] `npm run lint && npm run format:check && npm run htmlhint && npm run typecheck` all pass.
- [ ] `npm run knowledge:check` passes (every new module routed in `knowledge.topics.json`).
- [ ] `npm run test` (unit) passes, including the new tests for each extracted pure function.
- [ ] `npm run sqi` reports composite **≥ 80** (GREEN).
- [ ] `npm run test:ui` (full Playwright suite) passes — behaviour preserved.

## Scenario 6 — Walkthrough of every non-identical unification

This scenario is **mandatory and explicit**: go through **all** changes where the
two (or more) merged code paths were **not byte-identical** — i.e. every semantic
/ structural unification (audit Parts B & C), not just confirmed bugs. Byte-identical
clones (e.g. the local self-clones) are excluded; this is specifically the
"same purpose, different code / different behaviour" set, reviewed one by one.

- [ ] Produce a review checklist enumerating **each** non-identical unification landed in this PR, with: the before locations, the chosen unified behaviour, and whether the two sides behaved the same before.
- [ ] **Planning-view render orchestration** (`renderOutlook/TeamsColumn` + identical `rerender*`): walk through the merged orchestrator and confirm both columns' observable behaviour matches their pre-refactor behaviour (or that any difference was intended and signed off).
- [ ] **Markdown rendering** (`chatbot.js` vs `docs.js`): walk through the unified `renderMarkdown`; confirm which sanitisation/syntax behaviour was chosen and that the other side's prior behaviour is either preserved or intentionally converged.
- [ ] **Fetch wrapper** (`chatbot-api.js` vs `redmine-api.js`): walk through the unified `fetchJson`; confirm error/parse behaviour for each caller is unchanged or intentionally converged.
- [ ] **Booking→FC-event mapping** (`calendar.js` vs `planning-view-bookings.js`): walk through the unified mapper; confirm rounding, title/comment, and class assignment for each call site.
- [ ] **Config-ticket resolution** (`event-classes.js` vs `calendar-overlays.js`): confirm the unified `resolveConfigTicket` matches both prior copies.
- [ ] **Date/time helpers** (`outlook.js` / `planning-view-teams.js` / `time-entry-form-utils.js`): confirm the unified util matches each prior copy's behaviour.
- [ ] For every item above where the two sides **behaved differently**, confirm the chosen behaviour, the before/after, and the product-owner decision are recorded in the PR description, and that test assertions were updated.
- [ ] Confirm **no** non-identical unification was merged without this review, and no behavioural difference was resolved by guessing rather than an explicit decision.
