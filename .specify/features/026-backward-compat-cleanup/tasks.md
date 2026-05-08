---

description: "Task list for feature 026 — Code Cleanup & Simplification"
---

# Tasks: Code Cleanup & Simplification

**Input**: Design documents from `/.specify/features/026-backward-compat-cleanup/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: This feature is subtractive — every removal task includes "run the test suite and verify it passes" as part of completion. Test deletions are explicit when they exclusively cover removed legacy behavior (per FR-005). No new test files are required.

**Organization**: Tasks are grouped by user story so each removal slice can be done independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, US3, or US4 — maps to spec.md user stories
- Include exact file paths in descriptions

## Path Conventions

Single project layout under repo root: `js/`, `css/`, `tests/unit/`, `tests/ui/`. All paths absolute or relative to `/home/dominik/RedmineCalendar/`.

---

## Phase 1: Setup

**Purpose**: Capture pre-cleanup baseline so the SC-001 line-count delta can be measured at the end.

- [ ] T001 Tag the pre-cleanup commit so SC-001 has a fixed reference point: `git tag -a feature-026-baseline -m "baseline before cleanup"`. The tag stays local-only — no push.
- [ ] T002 Confirm baseline test counts: run `npm test` (expect 386 unit tests passing) and `npx playwright test` (expect 52 passing). Record the exact counts in this file's Notes section at the end.

---

## Phase 2: Foundational

*(No foundational/blocking work. The four user-story slices are independent and can land in any order. Each slice has its own self-contained completion check.)*

**Checkpoint**: Foundation ready — all four cleanup stories can begin in parallel or any order.

---

## Phase 3: User Story 1 — Remove legacy localStorage migration shims (Priority: P1) 🎯 MVP

**Goal**: Eliminate `cleanupLegacyKeys()` and the deprecated `STORAGE_KEY_HOLIDAY_TICKET` export so the boot path no longer scrubs for keys that cannot exist.

**Independent Test**: After completion, `grep -rn "cleanupLegacyKeys\|STORAGE_KEY_HOLIDAY_TICKET\|redmine_calendar_holiday_ticket" js/` returns no production-code matches; `tests/unit/settings-cleanup.test.js` no longer exists; `npm test` passes.

- [ ] T003 [P] [US1] Verify no other consumers of `STORAGE_KEY_HOLIDAY_TICKET` remain: run `grep -rn "STORAGE_KEY_HOLIDAY_TICKET\|redmine_calendar_holiday_ticket" /home/dominik/RedmineCalendar/js/`. The only hits should be in `js/config.js` (the export itself) and `js/settings.js` (`cleanupLegacyKeys` body + the comment at line 44).
- [ ] T004 [US1] In `/home/dominik/RedmineCalendar/js/settings.js`: remove the `cleanupLegacyKeys()` function definition (line 80–~95), remove its invocation from `loadCentralConfig` (line 76), and remove the FR-007 comment block at line 44 referring to "legacy localStorage key".
- [ ] T005 [US1] In `/home/dominik/RedmineCalendar/js/config.js`: remove the `export const STORAGE_KEY_HOLIDAY_TICKET = 'redmine_calendar_holiday_ticket';` line.
- [ ] T006 [US1] Delete `/home/dominik/RedmineCalendar/tests/unit/settings-cleanup.test.js` entirely (it covers only the removed migration logic).
- [ ] T007 [US1] Run `npm test` from repo root. Expected count: 386 − 3 = 383 passing tests (3 cases removed via T006). All other tests still green.
- [ ] T008 [US1] Commit US1 atomically: `git add js/settings.js js/config.js tests/unit/settings-cleanup.test.js && git commit -m "refactor(026): remove cleanupLegacyKeys() and STORAGE_KEY_HOLIDAY_TICKET (US1)"`.

**Checkpoint**: US1 done. Settings load path is shorter; obsolete localStorage shim is gone.

---

## Phase 4: User Story 2 — Drop fallbacks for time entries missing start/end times (Priority: P2)

**Goal**: Remove all conditional paths that handle `entry.startTime == null` or `entry.endTime == null`. Tighten the data model so every TimeEntry is assumed to have both fields.

**Independent Test**: After completion, `grep -nE "no-start-time|!entry\.startTime|!hasStart" js/ css/` returns no production-code hits; the calendar renders all fixture entries without console errors; `npm test` and `npx playwright test` both pass.

- [ ] T009 [P] [US2] In `/home/dominik/RedmineCalendar/js/calendar.js`: remove `if (!entry.startTime) classes.push('no-start-time');` from `baseClasses` (around line 55).
- [ ] T010 [P] [US2] In `/home/dominik/RedmineCalendar/js/calendar.js`: remove the `if (!entry.startTime) { result.push(entry); continue; }` early-out in the midnight-split helper (around line 185). Entries without startTime cannot exist after this feature; the function simplifies to handling only proper-time entries.
- [ ] T011 [US2] In `/home/dominik/RedmineCalendar/js/calendar.js` `toFcEvent` (around lines 216–250): replace `const hasStart = !!entry.startTime;` and the downstream `[h, m] = hasStart ? entry.startTime.split(':').map(Number) : [0, 0];` with the unconditional split. Remove the `if (!hasStart) classNames.push('no-start-time');` line. Remove the `hasStart` local entirely.
- [ ] T012 [P] [US2] In `/home/dominik/RedmineCalendar/js/calendar.js` (lines ~376 and ~388 — totals/arbzg passes): remove the `if (!entry.startTime) continue;` skips. Verify the surrounding loops compile cleanly with the guard removed.
- [ ] T013 [P] [US2] In `/home/dominik/RedmineCalendar/js/outlook.js` (line 309, overlap detection inside `parseCalendarProposals`): remove `if (!entry.startTime) return false;` from the existingEntries `.some(...)` callback.
- [ ] T014 [P] [US2] In `/home/dominik/RedmineCalendar/js/time-entry-form.js` `initTimeInputs` (around line 244): change `e.infoEnd.value = endTime ?? addMinutes(startTime, hours);` to `e.infoEnd.value = endTime;` (no fallback). Verify `addMinutes` still has at least one caller; if not, remove the function definition (around line 66) too.
- [ ] T015 [P] [US2] In `/home/dominik/RedmineCalendar/css/style.css` (line 160): remove the `.fc-event.no-start-time { ... }` rule entirely.
- [ ] T016 [US2] In `/home/dominik/RedmineCalendar/tests/unit/calendar-render.test.js`: remove the test case `'does NOT add fc-event--break for entries without startTime'` (currently the last case in the file). Adjust other tests if any of their fixtures use `startTime: null`.
- [ ] T017 [US2] Run `npm test` and `npx playwright test`. Both must pass. Expected unit test count: 383 − 1 = 382 (one test removed in T016).
- [ ] T018 [US2] Manually open the calendar (https://localhost:3000) with a few fixture entries and verify rendering still looks identical: work entries blue, break entries gray, holidays span the day, events open/edit/save normally.
- [ ] T019 [US2] Commit US2 atomically: `git add js/calendar.js js/outlook.js js/time-entry-form.js css/style.css tests/unit/calendar-render.test.js && git commit -m "refactor(026): drop null-startTime / null-endTime fallback paths (US2)"`.

**Checkpoint**: US2 done. Calendar render and modal init are simpler; data model invariant tightened to "TimeEntry always has startTime + endTime".

---

## Phase 5: User Story 4 — Sweep for additional dead code or "just in case" branches (Priority: P3)

**Goal**: Grep for residual backward-compat / migration / "just in case" markers and remove anything whose only purpose is supporting hypothetical pre-deployment users.

**Independent Test**: After completion, `grep -rnEi "legacy|migration|backward|compatibility|for now|just in case|// removed|historical" js/ css/ *.html` returns only matches that are clearly justified by current architecture (e.g. handling Outlook API quirks). No remaining matches reference past versions of *this* app.

- [ ] T020 [US4] Run the sweep grep: `grep -rnEi "legacy|migration|backward|compatibility|for now|just in case|// removed|historical" /home/dominik/RedmineCalendar/js/ /home/dominik/RedmineCalendar/css/ /home/dominik/RedmineCalendar/*.html`. Record each hit.
- [ ] T021 [US4] In `/home/dominik/RedmineCalendar/css/style.css`: remove the `.input--locked` CSS rule (around line 912, currently with comment `Input locked state — used historically; kept for any consumers still adding it`). Verify no production code adds `'input--locked'` class: `grep -rn "input--locked" /home/dominik/RedmineCalendar/js/` should return zero hits.
- [ ] T022 [US4] For each remaining grep hit from T020 not already covered by US1/US2/T021: evaluate independently. If the comment exists only because of "users upgrading from earlier version", remove the code; if it justifies handling current external behavior (Outlook API edge cases, etc.), leave it. Document the verdict for each hit in this task's commit message.
- [ ] T023 [US4] Re-run the sweep grep from T020. The only matches that remain MUST have a clear current-architecture justification.
- [ ] T024 [US4] Run `npm test` and `npx playwright test`. Both must pass.
- [ ] T025 [US4] Commit US4 atomically: `git add css/style.css [other files touched] && git commit -m "refactor(026): remove backward-compat markers — .input--locked CSS, [other items] (US4)"`.

**Checkpoint**: US4 done. The codebase no longer carries backward-compat residue from the pre-deployment era.

---

## Phase 6: User Story 3 — Run code-simplifier agent and apply non-controversial findings (Priority: P3)

**Goal**: Use the `code-simplifier` agent (or `/simplify` skill) to surface refactor candidates the previous slices didn't address, and apply non-controversial ones as separate commits.

**Independent Test**: The agent has been invoked, its findings are documented (one per row in the table below), each is marked accepted/rejected with a reason, and any accepted refactor has its own atomic commit with passing tests.

**Why last**: US1, US2, and US4 already remove the largest chunks of dead code. Running the simplifier afterwards lets it operate on the cleaner post-cleanup codebase, surfacing only genuine simplification opportunities rather than redundant flags about already-known cruft.

- [ ] T026 [US3] Invoke the `code-simplifier` agent (via the `Agent` tool with subagent_type matching, or by running the `/simplify` skill). Scope: review changed code from features 025+026 plus any clearly improvable areas in `js/calendar.js`, `js/chatbot-tools.js`, `js/outlook.js`, `js/time-entry-form.js`. Capture the agent's findings.
- [ ] T027 [US3] Build a findings table inside this `tasks.md` file (append to the Notes section at the end). Columns: `# | finding | proposed change | verdict (accept/reject) | reason`. One row per finding.
- [ ] T028 [US3] For each accepted finding: implement the change in a separate commit, run the test suite, verify it passes. Commit message format: `refactor(026): <one-line summary> — simplifier finding #N`.
- [ ] T029 [US3] If any finding was rejected, document the reason in the table (typically: "would change behavior", "duplication is intentional for clarity", "premature abstraction").
- [ ] T030 [US3] After all accepted findings land, run the full test suite once more. All tests must pass.

**Checkpoint**: US3 done. The codebase has been independently reviewed by the simplifier agent and any low-risk refactors are applied.

---

## Phase 7: Polish & Sign-off

**Purpose**: Verify cumulative success criteria and update tracking artifacts.

- [ ] T031 Run the full UAT script in `/home/dominik/RedmineCalendar/.specify/features/026-backward-compat-cleanup/quickstart.md` (UAT-1 through UAT-7). Record pass/fail for each section in the file.
- [ ] T032 Verify SC-001: run `git diff --shortstat feature-026-baseline..HEAD -- js/ css/ '*.html'`. The net delta in production code must be at least −100 lines. Record the exact number in the quickstart's UAT-7 section.
- [ ] T033 Verify SC-002: final unit + Playwright test counts are stable (382 unit if T016 is the only new test deletion; 52 Playwright). Document any deviations.
- [ ] T034 Update `BACKLOG.md`: move feature 026 from "New" to "Done" (top of "Done" section), set UAT column to `[✅](.specify/features/026-backward-compat-cleanup/quickstart.md)` and Status to `**done**`.
- [ ] T035 Optionally delete the local `feature-026-baseline` tag created in T001 once SC-001 is verified: `git tag -d feature-026-baseline`.

---

## Dependencies

| Phase | Blocks |
|-------|--------|
| Phase 1 (T001–T002) | All later phases — captures baseline. |
| Phase 2 | None (no foundational work). |
| US1 (T003–T008) | None — independent. |
| US2 (T009–T019) | None — independent. May share a final commit with US1 if both land in the same session, but conceptually separate. |
| US4 (T020–T025) | Best done after US1+US2 so the sweep operates on the already-cleaner codebase, but technically independent. |
| US3 (T026–T030) | Best done last (per Phase 6's "Why last" note). The agent's findings are most useful on the post-cleanup state. |
| Phase 7 | Requires US1, US2, US3, US4 all complete. |

## Parallel Execution Opportunities

Within US2, tasks T009/T010/T012/T013/T014/T015 touch different files and can be done in parallel by separate workers (or in any order by a single worker). T011 conflicts with T009/T010/T012 (same file `js/calendar.js`), so it must serialize against them. T016 (test file) is independent of all production-code edits.

Within US1, T003 (verification grep) is the only parallelizable task — the rest are serial against `js/settings.js`.

## Implementation Strategy

**MVP scope**: Just US1 (Phase 3, T001–T008). Removes the most visible chunk of dead code and unblocks the data-model tightening in US2.

**Incremental delivery**: Land US1 → US2 → US4 → US3 as four atomic commits (or commit groups for US3). Each commit can ship to `main` independently; rollback is trivial via `git revert <hash>`.

**No-merge-required**: All work happens on `main` per project policy; no feature branch merge step.

## Notes

(Filled in during execution.)

- Pre-cleanup baseline tag: `feature-026-baseline` at commit `<hash>` (filled in T001).
- Pre-cleanup test counts: unit `<count>` / Playwright `<count>` (filled in T002).
- Simplifier-agent findings table: (filled in T027).
