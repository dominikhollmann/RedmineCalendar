---

description: "Task list for feature 029 — Time Entry Anomaly Detection"
---

# Tasks: Time Entry Anomaly Detection

**Input**: Design documents from `.specify/features/029-anomaly-detection/`
**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/ (empty by design) · quickstart.md ✅

**Tests**: Every implementation task includes unit and/or UI tests. TDD per Constitution Principle III: tests are written first, fail first, then implementation makes them pass.

**Organization**: tasks are grouped by user story. Two stories: US1 (P1, very-short-entry rule) and US2 (P2, overlapping-entries rule). Both share the same anomaly-rendering pipeline (foundational).

## Format: `[ID] [P?] [Story?] Description with file path`

## Path Conventions

Single-project static SPA. New code in `js/`; tests in `tests/unit/` and `tests/ui/`. Styles in `css/style.css`. i18n in `js/i18n.js`.

---

## Phase 1: Setup

- [ ] T001 [P] Create empty stub `js/anomalies.js` exporting `detectAnomalies`, `veryShortEntry`, `overlappingEntries` — placeholders that throw `'not implemented'`.
- [ ] T002 [P] Create empty stub `js/anomaly-render.js` exporting `attachAnomalyBadge(eventEl, tag, t)`.
- [ ] T003 [P] Create empty test files: `tests/unit/anomalies-rules.test.js`, `tests/unit/anomalies-aggregator.test.js`, `tests/ui/anomalies.spec.js`.

**Checkpoint**: discovery surfaces (Vitest + Playwright) see all the new files.

---

## Phase 2: Foundational

**Purpose**: shared anomaly-rendering pipeline that both rules use.

- [ ] T004 [US1] Add the six EN+DE i18n keys from research.md §R6 to `js/i18n.js`. (Tagged US1 since it's the smaller-scope story; US2 reuses them.)

---

## Phase 3: User Story 1 — Very Short Entries (Priority: P1) 🎯 MVP

**Goal**: an entry with duration ≤ 0.1h gets a `⚠` badge with the localized "very short" reason.

**Independent Test**: create a 0.1h entry → badge appears; edit to 1h → badge disappears. quickstart.md S1–S5.

### TDD: pure rule predicate

- [ ] T005 [US1] In `tests/unit/anomalies-rules.test.js` write Vitest cases for `veryShortEntry(entry)`:
  - hours = 0.1 → returns reason string.
  - hours = 0.05 → returns reason string.
  - hours = 0.11 → returns null.
  - hours = 1.0 → returns null.
  - hours = 0 → returns null (zero-duration is the break-ticket pattern; pure helper does not exclude break-ticket — that is the aggregator's job).
  - hours = NaN → returns null (defensive — should not crash).
  - The reason string includes the entry's hours value.
- [ ] T006 [US1] Run `npx vitest run tests/unit/anomalies-rules.test.js` — Red.
- [ ] T007 [US1] Implement `veryShortEntry(entry, t)` in `js/anomalies.js`. One-line predicate.
- [ ] T008 [US1] Run vitest — Green.

### TDD: aggregator with break-ticket exclusion

- [ ] T009 [US1] In `tests/unit/anomalies-aggregator.test.js` write Vitest cases for `detectAnomalies(entries, { breakTicket, holidayTicket })` covering ONLY the very-short rule (overlap rule cases come in US2):
  - 1 entry with hours 0.1 → Map size = 1, ruleIds = ['very-short-entry'], reasons.length = 1.
  - 1 entry with hours 1.0 → Map size = 0.
  - 1 break-ticket entry with hours 0 → Map size = 0 (break excluded, FR-003/SC-006).
  - 1 holiday-ticket entry with hours 8 → Map size = 0 (normal duration, no flag).
  - Mix: 1 short + 1 normal + 1 break → Map size = 1 (only the short one).
  - Map is keyed by entry.id (string).
- [ ] T010 [US1] Run vitest — Red.
- [ ] T011 [US1] Implement `detectAnomalies` in `js/anomalies.js` with the very-short rule wired in. Skip overlap rule for now (US2 will add it).
- [ ] T012 [US1] Run vitest — Green.

### Implementation: rendering glue

- [ ] T013 [US1] Implement `attachAnomalyBadge(eventEl, tag, t)` in `js/anomaly-render.js`: appends `<span class="fc-event__anomaly-badge" tabindex="0" role="button" aria-describedby="anomaly-tooltip-{id}">⚠</span>` and a sibling `<div class="anomaly-tooltip" role="tooltip" hidden>{reasons joined by line breaks}</div>`. Wire click handler to toggle `hidden`. Fire on focus too for keyboard users.
- [ ] T014 [US1] In `js/calendar.js`'s `loadWeekEntries()` (after `enrichEntries(mapped)`, before `splitMidnightEntries(mapped)`), call `detectAnomalies(mapped, { breakTicket, holidayTicket })` and store on `window._calendarAnomalies` (mirroring the `_calendarDayTotals` pattern at `js/calendar.js:329`).
- [ ] T015 [US1] Add an `eventDidMount(info)` callback to the FC config: looks up `info.event.id` (or `extendedProps.timeEntry.id`) in `window._calendarAnomalies`; if found, calls `attachAnomalyBadge(info.el, tag, t)`.

### Styling

- [ ] T016 [US1] In `css/style.css` add `.fc-event__anomaly-badge` (small absolute-positioned badge in top-right of an FC event; ~12 px square; subtle warning colour; `pointer-events: auto`) and `.anomaly-tooltip` (small popover; `position: absolute`; shown on `:hover`/`:focus-within` of the badge or when its `hidden` attr is removed).

### UI tests

- [ ] T017 [US1] In `tests/ui/anomalies.spec.js` add Playwright tests covering quickstart S1–S5 + S15 (tooltip dismisses with entry) + S16 (network invariant — assert zero new requests during anomaly evaluation; use `page.on('request')` to count).
- [ ] T018 [US1] Run `npx playwright test tests/ui/anomalies.spec.js` — Red, then iterate T013–T016 until Green.

**Checkpoint US1**: very-short rule works end-to-end. quickstart S1–S5, S15, S16 pass.

---

## Phase 4: User Story 2 — Overlapping Entries (Priority: P2)

**Goal**: two entries whose time ranges intersect on the same day BOTH get the `⚠` badge with a reason naming the other entry. Strict intersection (back-to-back is OK). Break-ticket entries are excluded.

**Independent Test**: 14:00–15:00 on TICKET-A + 14:30–15:30 on TICKET-B → both badged. Move B to 16:00 → both badges disappear. quickstart.md S6–S10, S11 (multi-rule), S13/S14 (holiday/break exclusions).

### TDD: pure rule predicate

- [ ] T019 [US2] Extend `tests/unit/anomalies-rules.test.js` with cases for `overlappingEntries(dayGroup)`:
  - Two entries 14:00–15:00 and 14:30–15:30 → both flagged.
  - Two entries 14:00–15:00 and 15:00–16:00 (back-to-back) → neither flagged (FR-003 strict intersection).
  - Three-way overlap: A 14:00–16:00, B 14:30–15:30, C 15:00–17:00 → A pairs with both B and C; B pairs with A and C; C pairs with A and B. Each entry's reason mentions the FIRST overlapping partner found (or all — implementer's choice; document the choice).
  - Reason text references the OTHER entry's HH:MM start–end.
  - Single-entry day → empty result.
  - Different-day entries don't overlap (the helper only sees a single day's group).
- [ ] T020 [US2] Run vitest — Red.
- [ ] T021 [US2] Implement `overlappingEntries(dayGroup, t)` in `js/anomalies.js`. Pairwise scan. Return `Map<entryId, reasonString[]>`.
- [ ] T022 [US2] Run vitest — Green.

### TDD: aggregator with overlap rule + multi-rule merge

- [ ] T023 [US2] Extend `tests/unit/anomalies-aggregator.test.js` with cases:
  - Two overlapping entries → both in the Map, ruleIds = ['overlapping-entries'].
  - One entry that is BOTH 0.05h AND overlaps another → Map entry has `ruleIds = ['very-short-entry', 'overlapping-entries']` and `reasons.length === 2`.
  - Two entries on different days → no flags (overlap is per-day).
  - Break-ticket entry overlapping a normal entry → neither flagged (FR-003: break excluded from BOTH sides).
  - Holiday-ticket 8h entry overlapping a normal 1h entry → both flagged (holiday participates normally).
- [ ] T024 [US2] Run vitest — Red.
- [ ] T025 [US2] Wire `overlappingEntries` into `detectAnomalies`: group by `spentOn` after filtering break entries; merge per-entry reasons with the very-short rule's results; produce the unified Map.
- [ ] T026 [US2] Run vitest — Green.

### UI tests

- [ ] T027 [US2] Extend `tests/ui/anomalies.spec.js` with Playwright cases for quickstart S6–S10, S11 (multi-rule), S12 (midnight split — rare; document if hard to reproduce in test), S13 (holiday not flagged), S14 (break never flagged), S17 (mobile).
- [ ] T028 [US2] Run `npx playwright test tests/ui/anomalies.spec.js` — Red, then verify Green (no production-code changes likely needed since the rule engine already supports it; only re-render glue changes are if midnight-split needs special handling).
- [ ] T029 [US2] If S12 (midnight-split) reveals that `eventDidMount` is called once per visual half (which it is), confirm both halves correctly look up `extendedProps.timeEntry.id` and both get badged. Add a unit test for the lookup if needed.

**Checkpoint US2**: overlap rule works; both rules compose; quickstart S6–S14, S17 pass.

---

## Phase 5: Polish & Cross-Cutting

- [ ] T030 [P] Run full Vitest suite (`npx vitest`) — no regressions.
- [ ] T031 [P] Run full Playwright suite — no regressions, especially in entry CRUD specs (SC-004).
- [ ] T032 [P] Manually walk every quickstart scenario S1–S17; check the dev-tools console for errors (must be zero).
- [ ] T033 [P] Verify SC-002 timing: from `mouseup` on a saved entry change to badge appearance/disappearance < 300 ms.
- [ ] T034 [P] Verify SC-003 network invariant by capturing a HAR for a CRUD-heavy session and asserting no requests beyond Redmine CRUD endpoints.
- [ ] T035 Update BACKLOG.md row for 029: `plan ✅`, `tasks ✅`, status `tasks done — ready for implement`.

---

## Dependencies

- Setup [P]: T001/T002/T003 fully parallel.
- T004 (i18n) is independent and `[P]`.
- US1 chain: T005→T006→T007→T008 (pure helper) → T009→T010→T011→T012 (aggregator) → T013/T014/T015 (rendering glue) → T016 (CSS) → T017→T018 (Playwright).
- US2 chain: T019→T020→T021→T022 (overlap helper) → T023→T024→T025→T026 (aggregator merge) → T027→T028→T029 (Playwright). Depends on US1's foundational rendering glue.
- Polish (T030–T035) runs after both stories are green.

## Parallel Execution Opportunities

- **Setup [P]**: T001, T002, T003.
- **i18n [P]**: T004 can run any time during T005–T028.
- **Polish [P]**: T030, T031, T032, T033, T034.

## Implementation Strategy

- **MVP scope** = US1 (very-short-entry rule). Ship US1 first; the rendering pipeline is reusable for US2.
- **Incremental commits**: (a) i18n + scaffolds, (b) US1 pure helper + aggregator, (c) US1 rendering + CSS, (d) US1 Playwright, (e) US2 pure helper, (f) US2 aggregator merge, (g) US2 Playwright, (h) polish.

## Format Validation

All 35 tasks above use the canonical `- [ ] Tnnn [P?] [Story?] description with file path` checklist format. Setup/Foundational/Polish tasks have no story label; Phase-3 tasks carry `[US1]`; Phase-4 tasks carry `[US2]`.

## Open Questions Carry-Over

The 4 open questions in plan.md remain at most cosmetic — none affect spec compliance. Tooltip primitive resolved to CSS+JS popover (no fallback needed). Performance ceiling addressed by v1 entry-count assumptions; optimization deferred.
