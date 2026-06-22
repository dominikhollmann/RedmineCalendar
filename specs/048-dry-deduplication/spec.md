# Feature Specification: DRY Deduplication & Baseline Tightening

**Feature Branch**: `048-dry-deduplication`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "GitHub issue #229 — Refactor: DRY-Prinzip auf bestehenden Code anwenden + jscpd-Baseline senken"

## User Scenarios & Testing *(mandatory)*

This is an internal code-health feature. The "user" in these scenarios is the
**maintainer / future contributor** of the codebase; the value delivered is
better, more unified code — lower maintenance cost and fewer drift-induced bugs.

**The goal is to make the code better, not to hit a number.** The lowered
duplication baseline is a *guard that locks in the improvement*, not the
objective; satisfying the numeric gate without genuinely unifying the code would
be a Constitution VI/VII anti-gaming violation and is explicitly out of scope as
a way of "completing" this feature.

**Scope of "duplication" is broad.** It includes not only token-identical clones
(what the automated tool sees) but also **semantic duplication** — two or more
places that serve the *same purpose* with *different code*. The latter is the
more important and more dangerous class.

**Divergent behaviour is treated as a signal, not a constraint.** In many cases
where two same-purpose implementations behave differently, the difference is an
**accidental artifact of having been implemented twice** — not an intended
product difference. These are exactly the cases this feature aims to unify, which
means unification may *intentionally converge* behaviour onto a single correct
path. Where it is unclear whether a behavioural difference is intentional or
accidental, the maintainer **MUST ask the product owner** rather than guess.

### User Story 1 - Documented codebase-wide DRY audit (Priority: P1)

As a maintainer, I want a systematic, written audit of all duplication in the
`js/` codebase so that cleanup decisions are evidence-based rather than guided by
stale assumptions about which modules duplicate which.

**Why this priority**: The issue mandates the audit as the **first step** and
forbids working from known single cases (they may already be fixed; new ones may
exist). The audit is the foundation every later decision depends on, and it is
independently valuable: even with zero refactoring, a prioritized duplication map
is a usable deliverable.

**Independent Test**: Can be fully tested by reviewing the audit artifact in the
feature plan: it enumerates every token-identical clone from the current
`jscpd` report, lists the structural (token-divergent, same-logic) duplications
found by manual inspection, and classifies each as "will fix" or "deliberately
kept" with a reason. Verifiable without writing any production code.

**Acceptance Scenarios**:

1. **Given** the current codebase, **When** the audit is run, **Then** every
   clone reported by `npm run dup:report` is accounted for in the audit with a
   severity and a refactor-effort rating.
2. **Given** the parallel planning-view modules, **When** the audit inspects
   them, **Then** the documented finding states whether the
   availability-guard / fetch / error / render / deselect-listener patterns are
   still duplicated and quantifies the duplicated portion (confirming or
   revising the example finding from the issue).
3. **Given** the completed audit, **When** a reviewer reads it, **Then** each
   duplication is marked "will fix" or "deliberately kept", and every
   "deliberately kept" entry carries a justification suitable for the plan's
   Complexity Tracking table.

---

### User Story 2 - Unify same-purpose code via shared abstractions (Priority: P2)

As a maintainer, I want code that serves the same purpose — whether it is a
token-identical clone or two divergent implementations of the same intent —
replaced by a single shared abstraction, so that a fix applied once is applied
everywhere and parallel implementations can no longer silently diverge.

**Why this priority**: This is the substantive payload of the issue and the
direct mitigation for the drift incident that motivated Constitution VII (a
rounding fix that landed in the Outlook planning view but never reached the
Teams one). It depends on the P1 audit to know *what* to unify, but delivers the
core value. It explicitly targets the dangerous class — same purpose, different
code — not just exact clones.

**Independent Test**: Can be tested by confirming that the duplications marked
"will fix" in the audit no longer exist as independent copies — the shared logic
lives in a single module consumed by all call sites — and that the unit and
Playwright suites pass (green where behaviour was intended to be preserved;
updated where an accidental divergence was deliberately converged with the
product owner's confirmation).

**Acceptance Scenarios**:

1. **Given** a duplication marked "will fix" in the audit, **When** the refactor
   is complete, **Then** the shared logic exists in exactly one place and each
   former copy delegates to it.
2. **Given** two same-purpose implementations that behave differently, **When**
   the audit cannot determine whether the difference is intended, **Then** the
   maintainer asks the product owner and records the answer before unifying.
3. **Given** an accidental behavioural divergence confirmed as a bug, **When** the
   implementations are unified, **Then** all call sites converge on the single
   correct behaviour and the affected tests are updated to assert it.
4. **Given** the refactored codebase, **When** the full UI and unit suites run,
   **Then** behaviour intended to be preserved is unchanged and all suites pass.
5. **Given** the refactored codebase, **When** a new shared module is introduced
   or an existing one is split, **Then** `npm run knowledge:check` passes
   (the module is routed in `js/knowledge.topics.json` or explicitly ignored).
6. **Given** the refactored codebase, **When** `npm run sqi:json` runs, **Then**
   the composite score is in the GREEN band (≥ 80).

---

### User Story 3 - Tighten the jscpd ratchet baseline (Priority: P3)

As a maintainer, I want the committed duplication baseline lowered to reflect the
post-cleanup reality so that future copy-paste is caught at the tighter bound
instead of being allowed to regress back toward the old, deliberately-loose
ceiling.

**Why this priority**: Without re-seeding, the cleanup gains are not locked in —
the ratchet would still permit regression up to the old 2.41 % / 30-clone
ceiling. It depends on P2 being substantially complete, so it is the final slice.

**Independent Test**: Can be tested by inspecting the committed baseline file
after re-seeding and running the gate against the cleaned tree: the baseline
records the new, lower clone count/percentage and the `dup:check` gate passes at
that tighter bound.

**Acceptance Scenarios**:

1. **Given** the cleaned codebase, **When** the baseline is re-seeded, **Then**
   the committed baseline records a duplication ratio at or below the target
   ceiling (≤ 1.5 % and < 20 clones).
2. **Given** the re-seeded baseline, **When** `npm run dup:check` runs on the
   cleaned tree, **Then** the gate passes.
3. **Given** the re-seeded baseline, **When** a hypothetical new token-identical
   clone is introduced, **Then** `npm run dup:check` fails — confirming the
   ratchet now guards at the tighter bound.

---

### Edge Cases

- **Refactor reduces clones below target but a single module would balloon in
  size**: extraction must not push any module past the hard 600-effective-LOC
  module-size limit; if a shared base would exceed it, split the abstraction
  rather than create one oversized file.
- **A duplication looks token-identical to jscpd but the two copies are
  intentionally independent** (e.g. distinct domain meaning that will diverge):
  it stays as a "deliberately kept" entry with justification rather than being
  force-merged into a leaky abstraction.
- **Cleanup lowers the clone count but the manual structural duplication remains**
  (jscpd-invisible): the audit must still record and address structural and
  semantic (same-purpose, different-code) cases, not just satisfy the numeric gate.
- **Two same-purpose implementations behave differently and it is unclear whether
  the difference is intended**: the maintainer must ask the product owner before
  unifying; the answer (intended → keep & document, or accidental → converge) is
  recorded in the audit.
- **Unifying an accidental divergence changes a previously-shipped behaviour**: the
  convergence is a deliberate bug-fix; the affected tests are updated to assert the
  corrected behaviour and the change is called out (not silently absorbed into a
  "no behaviour change" refactor).
- **The shared abstraction would couple two modules that should stay
  independent**: per Constitution VII / IV, prefer a documented deliberate
  duplication over an abstraction that increases coupling; record the decision.
- **No-op outcome**: if the audit finds the codebase already below target with no
  worthwhile refactors, the feature still delivers the documented audit and a
  re-seeded baseline at the current (already-low) level.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The feature MUST produce a written DRY audit covering the entire
  `js/` codebase, derived from a fresh `dup:report` run, in which every reported
  token-identical clone is enumerated with a severity and refactor-effort rating.
- **FR-002**: The audit MUST additionally cover structural and **semantic**
  duplication found by manual inspection — code that serves the **same purpose**
  with **different code** (token-divergent), at minimum parallel modules of the
  same capability and repeated guard / fetch / render / utility patterns — not
  only what the automated tool detects. Semantic, same-purpose duplication is the
  primary target, not an afterthought.
- **FR-003**: The audit MUST verify (confirm or revise) the parallel
  planning-view duplication described in the issue against the current code and
  state the actual duplicated portion.
- **FR-004**: Each duplication in the audit MUST be classified as either
  "will fix" or "deliberately kept"; every "deliberately kept" entry MUST carry a
  justification suitable for the plan's Complexity Tracking table.
- **FR-005**: Every duplication marked "will fix" MUST be replaced by a single
  shared abstraction (shared base module or extracted utility) that all former
  copies consume; no "will fix" duplication may remain as independent copies.
- **FR-005a**: Where two or more same-purpose implementations behave differently,
  the audit MUST determine whether the difference is **intended** (a real product
  difference → keep, documented as deliberate) or **accidental** (an artifact of
  duplicate implementation → converge onto one correct behaviour). When the intent
  is ambiguous, the maintainer MUST ask the product owner and record the decision
  before unifying — guessing is not permitted.
- **FR-006**: Refactoring MUST preserve all *intended* end-user behaviour. Where
  an accidental divergence is converged into a single correct behaviour (per
  FR-005a), that is a deliberate, called-out change, not a regression: the
  affected tests MUST be updated to assert the corrected behaviour. Absent such a
  documented convergence, the full Playwright UI suite MUST pass unchanged.
- **FR-007**: All existing automated quality gates MUST remain green after the
  change — lint, format, htmlhint, typecheck, unit coverage (per-file ≥ 95 %
  where applicable), `knowledge:check`, and `sqi:json` (composite ≥ 80).
- **FR-008**: The committed duplication baseline MUST be re-seeded to the
  post-cleanup level *as a consequence of genuine unification*, recording a
  duplication ratio of **≤ 1.5 % and < 20 clones** (tightened further if the
  audit result allows). The baseline is a guard that locks in real improvement —
  re-seeding without having actually unified the code (or any change whose only
  purpose is to move the number) is explicitly forbidden (Constitution VI/VII
  anti-gaming).
- **FR-009**: The `dup:check` ratchet gate MUST pass against the cleaned tree at
  the new baseline and MUST fail if a new token-identical clone is introduced.
- **FR-010**: Reuse MUST come before new abstraction surface — where an existing
  shared base (e.g. `js/planning-view-column-base.js`) is the natural home for
  extracted logic, it MUST be extended rather than a parallel base created.
- **FR-011**: Any new or renamed/split `js/*.js` module produced by the refactor
  MUST be reflected in `js/knowledge.topics.json` (or the knowledge-check ignore
  set) so the `knowledge:check` gate stays green.
- **FR-012**: User-facing documentation (`docs/content.*.md`) MAY be skipped only
  because this change is purely internal; if any cleanup incidentally changes
  user-visible behaviour, the documentation MUST be updated accordingly.

### Key Entities *(include if feature involves data)*

- **DRY Audit Record**: The documented inventory of duplications — for each
  entry: location(s), kind (token-identical vs. structural), severity, refactor
  effort, disposition ("will fix" / "deliberately kept"), and justification where
  kept. Lives in the feature's planning artifacts.
- **Duplication Baseline**: The committed record (`dup-baseline.json`) of the
  allowed clone count / percentage that the ratchet gate compares against; the
  feature lowers it to the post-cleanup level.
- **Shared Abstraction**: A single module (new or extended existing base) that
  holds logic formerly copied across multiple call sites; the unit of cleanup.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every same-purpose duplication identified in the audit and marked
  "will fix" — token-identical *and* semantic (same purpose, different code) — is
  unified to a single shared implementation; this genuine unification is the
  primary outcome.
- **SC-002**: Code duplication in `js/` is reduced to **≤ 1.5 %** and **< 20
  clones** as reported by the duplication tool, down from the starting 2.41 % /
  30 clones — as a measurable *consequence* of SC-001, not pursued for its own
  sake.
- **SC-003**: 100 % of the clones in the starting duplication report are
  accounted for in the audit (each with a disposition).
- **SC-004**: Every behavioural divergence between same-purpose implementations is
  resolved with intent established (intended → kept & documented; accidental →
  converged) and no ambiguous case unified without the product owner's decision.
- **SC-005**: After cleanup the unit and UI suites pass at 100 %; intended
  behaviour is unchanged, and any deliberately-converged accidental divergence is
  reflected by updated assertions rather than a silent change.
- **SC-006**: The Software Quality Index composite remains in the GREEN band
  (≥ 80) after the change.
- **SC-007**: A subsequently-introduced token-identical clone is rejected by the
  automated duplication gate, confirming the tightened baseline is enforced.
- **SC-008**: The number of independently-maintained copies of any single
  "will fix" pattern drops to one (a fix applied once now reaches every call
  site), eliminating the divergence class that motivated the reuse principle.

## Assumptions

- The audit and its disposition decisions are recorded in the feature's planning
  artifacts (the plan's Wiederverwendungs-Audit / Complexity Tracking sections),
  consistent with Constitution VII Part B; this spec does not prescribe a
  separate standalone document.
- The starting point is the baseline described in the issue (2.41 % / 30 clones);
  the actual current figure is whatever a fresh `dup:report` yields at
  implementation time, and the audit works from that fresh number.
- "Behaviour-preserving" applies to *intended* behaviour, judged by the existing
  Playwright UI suite plus the unit suite. The one expected exception is the
  deliberate convergence of an accidental divergence between same-purpose
  implementations (FR-005a/FR-006), which is a confirmed bug-fix with updated
  assertions — not a silent change.
- The product owner is available to resolve ambiguous intent questions during
  implementation; the maintainer will ask (rather than guess) whenever it is
  unclear whether a behavioural difference between same-purpose implementations is
  intended or accidental.
- Mobile support is unaffected — this is an internal refactor with no UX surface
  change, in or out of scope.
- The target ceiling (≤ 1.5 % / < 20 clones) is a maximum, not a quota: if the
  audit supports a tighter baseline, the lower figure is preferred.
- Deliberate, justified duplication is acceptable where a shared abstraction
  would harm clarity or increase coupling (Constitution IV & VII), provided it is
  documented — the goal is not a zero-duplication absolute.
