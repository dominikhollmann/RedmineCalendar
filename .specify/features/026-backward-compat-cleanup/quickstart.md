# Quickstart UAT: Code Cleanup & Simplification

**Feature**: 026 | **Audience**: Developer verifying the cleanup landed without regressions

This script verifies the cleanup achieved its goals (FR-001 through FR-006) and that no user-visible behavior changed (SC-002, SC-003, SC-004).

---

## Prerequisites

- [ ] Branch is `main` and the code-cleanup commits are landed locally.
- [ ] `npm install` already run (no new deps expected).
- [ ] Dev server runs: `npm run dev`. App reachable at https://localhost:3000 with at least a few existing time entries on today's date.

---

## UAT-1 — Test suites pass (FR-005, SC-002)

```bash
npm test                         # 386 unit tests (some deletions justified by R1/R2)
npx playwright test              # 52 Playwright tests
```

- [ ] Unit tests all green. Test count is `386 - <deleted-count>` where the only acceptable deletions are tests covering removed legacy code (per FR-005).
- [ ] Playwright tests all green (52 / 52).

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-2 — Legacy localStorage cleanup is gone (FR-001, SC-003)

```bash
grep -rn "cleanupLegacyKeys\|redmine_calendar_holiday_ticket\|STORAGE_KEY_HOLIDAY_TICKET" js/ tests/
```

- [ ] No matches in `js/`. Any matches in `tests/` are in fixtures or removed-code references in this feature's planning artifacts (acceptable).

```bash
ls tests/unit/settings-cleanup.test.js 2>&1
```

- [ ] File does not exist (was removed in R1).

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-3 — No-start-time fallbacks removed (FR-002, SC-003)

```bash
grep -nE "no-start-time|!entry\.startTime|!hasStart" js/ css/
```

- [ ] No matches in `js/calendar.js`, `js/outlook.js`, `js/time-entry-form.js`, `css/style.css`.

```bash
grep -n "addMinutes(startTime" js/time-entry-form.js
```

- [ ] No remaining call sites — the function may still exist if it has other callers, but the `endTime ??` fallback is gone.

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-4 — Generic backward-compat sweep (FR-004, SC-004)

```bash
grep -rnEi "legacy|migration|backward|compatibility|for now|just in case|// removed|historical" js/ css/ *.html
```

- [ ] Any remaining matches have a clear, current-architecture justification (e.g., comments about external API quirks). No matches reference past versions of this app.

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-5 — Code-simplifier agent findings (FR-003)

Run the simplifier agent (or `/simplify` skill) on the post-R1+R2+R3 codebase and review its report.

- [ ] Each agent finding has a recorded decision: accepted (commit landed) OR rejected (with brief reason in commit message or feature notes).
- [ ] All accepted findings have an atomic commit; tests still pass after each.

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-6 — User-visible behavior unchanged (FR-006, SC-002)

In the running dev server, manually verify:

- [ ] Calendar renders today's entries identically to pre-cleanup (work entries blue, break entries gray with "(0h)" / "(0h 1m)" badge, holiday entries on holidayTicket span 09:00–17:00).
- [ ] Click an empty slot → modal opens with start time prefilled, duration computed; Save → entry appears.
- [ ] Open the chatbot → "Book my time for today" → 4-section proposal renders as before.
- [ ] Settings page loads with no console errors; reload preserves values.
- [ ] No new console warnings/errors compared to a pre-cleanup baseline.

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## UAT-7 — Code-size delta (SC-001)

```bash
git diff --shortstat <pre-cleanup-commit>..HEAD -- js/ css/ '*.html'
```

- [ ] Net delta in production code (`js/`, `css/`, `*.html`) is at least **−100 lines**. Test deletions are tracked separately and don't count toward SC-001.

**Pass**: ☐ &nbsp; &nbsp; **Fail**: ☐

---

## Sign-off

- [ ] All UATs pass.
- [ ] No new console errors during manual verification.
- [ ] Total commits landed for this feature: R1 + R2 + R3 + N (simplifier-agent findings) = 3+N atomic commits on `main`.

**Tested by**: ____________________   **Date**: __________
