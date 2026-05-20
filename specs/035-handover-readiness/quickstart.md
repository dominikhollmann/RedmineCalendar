# Quickstart / UAT Walkthrough: Pre-Handover Cleanup and Quality-Bar Tightening

**Feature**: 035-handover-readiness
**Date**: 2026-05-19
**Purpose**: Step-by-step verification that the feature's success criteria (SC-001 through SC-010 in [`spec.md`](spec.md)) are met. This document is consumed by `/speckit-uat-run` to record per-item pass/fail/skip results on the PR.

## Pre-flight (run once at the start of the UAT session)

```bash
# Ensure you're on the feature branch with a clean working tree
git checkout 035-handover-readiness
git status                                  # expect: working tree clean

# Install deps in case @types/node was added since last install
npm install
```

---

## UAT-001 — Visible cruft is gone (verifies SC-001, SC-002, SC-009)

Run the audit grep that produced the spec:

```bash
# Should return zero matches
grep -rEn 'TODO|FIXME|HACK|XXX|KLUDGE|WORKAROUND' \
  js/ scripts/ css/ *.html .github/workflows/ \
  --include='*.{js,mjs,css,html,yml,json}' 2>/dev/null

# Should return zero matches
grep -n 'enrichLicensesFromNodeModules' scripts/oss-generate.mjs

# Should return zero matches
grep -n "deploy.yml: oss:drift" .github/workflows/release.yml

# Should return zero matches
grep -n "scope === 'excluded'" scripts/oss-check-licenses.mjs
```

**Pass criterion**: every command above returns no output (exit code 1, "no matches found").

---

## UAT-002 — CI pipeline matches CLAUDE.md (verifies FR-003, SC-009)

```bash
# Confirm npm audit is in ci.yml (per FR-003 preferred resolution)
grep -n 'npm audit --audit-level=high' .github/workflows/ci.yml

# Confirm CLAUDE.md's pipeline order matches
grep -A2 'Quality + security pipeline' CLAUDE.md | head -6
```

**Pass criterion**: `npm audit --audit-level=high` appears in `ci.yml`, AND the CLAUDE.md text lists the same step order as the workflow file. If FR-003's alternative resolution was chosen (CLAUDE.md updated instead), confirm CLAUDE.md no longer claims `npm audit` runs in `ci.yml`.

---

## UAT-003 — CI gate duplication is justified (verifies FR-005)

```bash
# Should find the in-file justification comment (per Decision 8 in research.md)
grep -B1 -A3 'post-merge\|backstop\|defense-in-depth\|defence-in-depth' .github/workflows/deploy.yml
```

**Pass criterion**: a comment block in `deploy.yml` explains why the SBoM/license/coverage/SQI/UI gates are re-run post-merge. (Alternative pass: the duplicates were trimmed per FR-005 option (b), in which case `deploy.yml` no longer contains those steps.)

---

## UAT-004 — `calendar.js` is below 500 LOC; siblings exist (verifies SC-003, FR-006)

```bash
wc -l js/calendar.js js/calendar-toolbar.js js/calendar-overlays.js | sort -n
```

**Pass criterion**: all three files report < 500 LOC. The two sibling modules exist.

---

## UAT-005 — No `window._calendar*` globals (verifies SC-004, FR-007)

```bash
grep -rn 'window\._calendar' js/
```

**Pass criterion**: zero matches.

---

## UAT-006 — `fetchTimeEntryById` throws (verifies FR-008, contracts/redmine-api-error-surface.md)

```bash
# Source check: function body should not contain a try/catch that returns null
grep -A8 'export async function fetchTimeEntryById' js/redmine-api.js

# Single caller adapted
grep -B2 -A6 'fetchTimeEntryById' js/chatbot-tools.js

# Unit tests assert the new contract
npm test -- redmine-api
```

**Pass criterion**: source no longer has the silent `return null` branches; the chatbot-tools caller wraps in try/catch and translates 404 only; unit tests pass with assertions updated.

---

## UAT-007 — `renderMessage` sanitizes internally (verifies FR-009)

```bash
# The function body should contain a DOMPurify.sanitize call before any innerHTML assignment
awk '/function renderMessage/,/^}/' js/chatbot.js | grep -n 'DOMPurify.sanitize'
```

**Pass criterion**: at least one match — sanitization happens inside `renderMessage`, not only at the caller.

---

## UAT-008 — `@ts-ignore` removed from `js/knowledge.js` (verifies FR-010, SC-008)

```bash
# Should return zero
grep -c 'ts-ignore' js/knowledge.js

# typecheck still passes
npm run typecheck
```

**Pass criterion**: zero `@ts-ignore` directives in `js/knowledge.js`; `tsc --noEmit` exits 0.

---

## UAT-009 — Coverage artifacts are fresh and ≥ 95% (verifies FR-011)

```bash
npm run test:coverage:all

# Check the figure
node -e "const d = require('./coverage/unified-summary.json'); console.log('lines:', d.total.lines.pct);"
```

**Pass criterion**: `unified-summary.json` exists with `mtime` from this UAT session, and `total.lines.pct >= 95`. If the figure differs from CLAUDE.md, CLAUDE.md is updated in the same PR.

---

## UAT-010 — ESLint config tightenings landed (verifies FR-013, FR-014)

```bash
# max-lines-per-function tightened on js/**
grep -B1 -A2 'max-lines-per-function' eslint.config.js

# scripts/** has max-lines and complexity
grep -A20 "files: \['scripts" eslint.config.js | grep -E 'max-lines|complexity'

# No bare eslint-disable comments (FR-019)
grep -rn 'eslint-disable' js/ scripts/ | grep -vE 'eslint-disable-next-line.*—'
```

**Pass criterion**: `max-lines-per-function` shows `{ max: 60 }`; the `scripts/**` override includes both `max-lines` and `complexity`; any `eslint-disable*` directive in `js/` or `scripts/` is followed by a justifying em-dash comment per FR-019.

---

## UAT-011 — SQI composite ≥ 80 and gate fires below 80 (verifies SC-005, SC-006, FR-015, FR-016, FR-017)

```bash
# Composite should be ≥ 80 on this branch
npm run sqi

# Inspect the JSON for the exact composite
npm run sqi:json && node -e "const d = require('./coverage/sqi.json'); console.log('composite:', d.composite, 'band:', d.band);"

# Confirm bandFor() boundary is 80 (not 60)
grep -n '60\|80' scripts/sqi.mjs | grep -i 'band\|GREEN'
```

**Pass criterion**: `npm run sqi` exits 0, composite ≥ 80, band reported as GREEN. `bandFor` in `scripts/sqi.mjs` shows 80 as the GREEN threshold.

**Regression-check sub-test (SC-006)**: On a throwaway local branch, append a 100-line function with `complexity` > 20 to a pure-logic module (e.g., `js/arbzg.js`). Re-run `npm run sqi`. Composite should drop below 80 and exit code should be 1. Revert the change.

---

## UAT-012 — Constitution + CLAUDE.md updated (verifies FR-018, Plan Constitution Check)

```bash
# Constitution Principle VI now states ≥ 80 GREEN
grep -n '80' .specify/memory/constitution.md | head

# Sync Impact Report at top of constitution.md notes the threshold change
head -40 .specify/memory/constitution.md | grep -i 'sync impact\|threshold\|≥ 80'

# CLAUDE.md "Quality + security pipeline" paragraph reflects the new threshold
grep -A3 'Software Quality Index' CLAUDE.md | head -8
```

**Pass criterion**: constitution.md text reflects the ≥ 80 threshold; Sync Impact Report at top is updated; version line shows `1.5.1`; CLAUDE.md's pipeline paragraph is in sync.

---

## UAT-013 — SBoM regenerated for the new devDep (verifies CLAUDE.md policy, plan note)

```bash
# Drift check passes after the @types/node addition
npm run oss:drift

# License gate passes
npm run oss:licenses
```

**Pass criterion**: both commands exit 0. The committed `sbom.json` + `attributions.json` reflect the `@types/node` addition.

---

## UAT-014 — Senior re-audit returns "ready for handover" (verifies SC-010)

This is the qualitative final check.

```bash
# Re-run the original audit grep set
grep -rEn 'TODO|FIXME|HACK|XXX|KLUDGE|WORKAROUND' js/ scripts/ css/ *.html .github/workflows/ 2>/dev/null
# Expected: empty

# Module size — every js/ file under the 500-LOC `max-lines` threshold (FR-006).
# This is the project's standard measure (skips blank lines + comments), not raw
# `wc -l`; see SC-003. SQI's moduleSize metric reflects the same gate.
npm run lint 2>&1 | grep -c 'max-lines ' || true
# Expected: 0

# Full test suite green
npm run test:coverage && npm run test:ui

# Full SQI green
npm run sqi
```

**Pass criterion**: all four commands succeed; every `js/` file passes the 500-LOC `max-lines` threshold (zero `max-lines` warnings; SQI `moduleSize` = 100); SQI composite ≥ 80; no audit-grep hits.

---

## Failure handling

If any UAT step fails:

1. Mark the corresponding success-criterion item as failed in the PR's UAT walkthrough.
2. Open a follow-up task to address the gap _before_ requesting review.
3. Do NOT bypass with `--no-verify`, `|| true`, or `continue-on-error: true` — those are explicitly forbidden by FR-016 and the constitution.

## Completion

When all 14 UAT items pass, the PR is flipped from draft to ready-for-review by `/speckit-uat-run`, and the handover-readiness claim is supported by the recorded walkthrough.
