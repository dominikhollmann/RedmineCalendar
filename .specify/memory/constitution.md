<!--
  SYNC IMPACT REPORT
  ==================
  Version change: 1.5.1 → 1.5.2 (PATCH — clarification of anti-gaming clause)

  Modified principles:
    - VI. Continuous Quality Gates — new "Code quality over metric score"
      paragraph added. Explicitly prohibits degrading code quality to satisfy
      a metric and mandates surfacing the conflict to the user instead of
      proceeding. This is a clarification of the existing anti-gaming stance,
      not a new obligation; the threshold values and gate mechanism are
      unchanged.

  Added sections: N/A
  Removed sections: N/A

  Templates reviewed: ✅ aligned (clarification only, no structural change)

  Dependent documents:
    - CLAUDE.md "Quality + security pipeline" ✅ updated in the same commit
      to add the matching operational instruction for Claude Code.
    - scripts/sqi.mjs — no change required (gate logic unchanged).

  Deferred TODOs: None.

  --- Previous entry (1.5.0 → 1.5.1) ---
  Version change: 1.5.0 → 1.5.1 (PATCH — quality-gate threshold value raised)

  Modified principles:
    - VI. Continuous Quality Gates — SQI composite GREEN threshold raised
      ≥ 60 → ≥ 80; band boundaries shifted accordingly (50–79 YELLOW,
      10–49 RED, < 10 BLACK). No structural change to the principle — the
      gate, its eight metrics, and the anti-gaming clause are unchanged.

  Dependent documents:
    - CLAUDE.md "Quality + security pipeline" ✅ updated in the same PR
      (feature 035-handover-readiness) to the ≥ 80 band.
    - scripts/sqi.mjs ✅ bandFor() GREEN threshold + process.exit gate raised
      to 80; moduleSize band redesigned (feature 035-handover-readiness).
-->

# RedmineCalendar Constitution

## Core Principles

### I. Redmine API Contract

The application MUST integrate exclusively through Redmine's official REST API.
Direct database access to a Redmine instance is strictly forbidden.
All API interactions MUST use credentials supplied via configuration (environment
variables or config file) — credentials MUST NOT be hard-coded or committed to
version control. API responses MUST be validated before use; the application MUST
handle Redmine API errors (network failures, auth errors, rate limits) gracefully
and surface actionable messages to the user.

**Rationale**: Coupling directly to Redmine's database creates a brittle dependency
on internal schema details and bypasses Redmine's permission model, introducing
both maintenance risk and security risk.

### II. Calendar-First UX

Every feature MUST be evaluated through the lens of calendar usability. The primary
view MUST render Redmine issues and/or time entries as calendar events. Navigation
(day / week / month views) MUST be responsive across desktop screen sizes.
Mobile responsiveness SHOULD be supported; it MAY be deferred to a future version
provided the feature spec explicitly declares "Mobile support out of scope for vN"
in its Assumptions section. Interactions MUST complete perceived rendering within
300 ms on a typical broadband connection; data fetching MUST never block the
calendar from rendering in a loading state.

**Rationale**: The defining value proposition of this tool is replacing Redmine's
tabular issue lists with a temporal, calendar-centric interface. Any change that
degrades calendar usability undermines the product's purpose.

### III. Test-First

TDD is mandatory for all business logic, API client code, and data transformation
layers. The Red-Green-Refactor cycle MUST be strictly enforced:
- Tests MUST be written and reviewed before implementation begins.
- Tests MUST fail before the implementation is written.
- Implementation MUST be the minimum code needed to make tests pass.
- Refactoring MUST keep all tests green.

UI-level integration/end-to-end tests are STRONGLY RECOMMENDED for critical user
journeys (e.g., calendar load, event click-through to Redmine). Unit tests alone
are insufficient for API client modules.

**Exception — removed**: As of feature 009, the project has a CI pipeline (GitHub
Actions) with Vitest (unit) and Playwright (UI) test infrastructure. The previous
exception for "personal single-user tools" no longer applies. All new features
MUST include unit tests for business logic and UI tests for user-facing flows.
Existing features without tests SHOULD have tests added retroactively when modified.

**Rationale**: A Redmine integration has complex edge cases (pagination, auth flows,
date-range queries). Tests written after the fact consistently miss these edges and
give false confidence. The exception is narrow and requires a compensating control
(manual checklist) to prevent silent regressions.

### IV. Simplicity & YAGNI

The codebase MUST start with the simplest architecture that satisfies the current
requirements. Adding layers of abstraction, additional services, or new dependencies
MUST be justified by a concrete, present need — not by speculative future
requirements. Every added dependency MUST be recorded with a rationale. Prefer
standard library or already-approved dependencies over new ones.

Any deviation from simplicity (e.g., caching layer, background workers, plugin
architecture) MUST be documented in the plan's Complexity Tracking table with an
explanation of why the simpler alternative was insufficient.

**Rationale**: Calendar integrations are often over-engineered early. Complexity
that isn't paying its way slows iteration and increases maintenance burden.

### V. Security by Default

All externally supplied data (Redmine API responses, user configuration, URL
parameters) MUST be treated as untrusted and validated/sanitized before use.
Credentials (API keys, tokens) MUST be stored only in environment variables or
encrypted configuration — never in source code, logs, or client-side storage.

**Exception — removed**: As of feature 008, the application uses encrypted
credential storage (AES-GCM via Web Crypto API, non-exportable key in IndexedDB).
The previous cookie exception no longer applies. Credentials MUST be encrypted
at rest in the browser. Plain-text cookies MUST NOT be used for credential storage.

Rendered event content (issue titles, descriptions) MUST be escaped to prevent
XSS. HTTPS MUST be enforced for all Redmine API communication (the CORS proxy
target URL MUST use `https://`).

**Rationale**: Calendar tools often display user-controlled content (issue titles)
in a browser context. Without escaping, a malicious issue title becomes a stored
XSS vector. Credential leakage through logs or commits is a common and severe
incident class.

### VI. Continuous Quality Gates

Every change MUST pass the automated quality pipeline before merge. CI runs the
following steps in order and fails on the first failure:

1. `npm audit --audit-level=high` — no high or critical advisories.
2. `npm run lint && format:check && htmlhint && typecheck` — no new lint,
   formatting, HTML, or type errors. Pre-existing warnings are tolerated only
   if explicitly enumerated in the relevant docs; new warnings are not.
3. `npm run test:coverage` — all unit tests pass; per-file line coverage MUST
   be ≥ 95%.
4. `npm run sqi:json` — the Software Quality Index composite MUST be in the
   GREEN band (≥ 80).
5. `npm run test:ui` — all Playwright UI tests pass.

CodeQL MUST run on every push and pull request (and on a weekly schedule).
Dependabot MUST remain enabled for weekly dependency and GitHub-Actions bump PRs.

The Software Quality Index (`scripts/sqi.mjs`) is a single 0–100 composite of
eight metrics: module dependency cycles, Lakos Average Component Dependency,
line coverage, module size, function length, cyclomatic complexity, compiler
warnings, and vulnerable dependencies. Bands: **≥ 80 GREEN** (mergeable),
**50–79 YELLOW** (significant problems — fix before merge), **10–49 RED** (stop
feature work; remediate first), **< 10 BLACK** (rewrite warranted). Weights and
band anchor points are tunable constants in `scripts/sqi.mjs`; changing them is a
deliberate, code-reviewed act — not a silent knob.

A drop into YELLOW or below MUST block the merge. Re-tuning the bands to recover
GREEN without addressing the underlying metric is a constitution violation — it
dilutes the gate rather than meeting it (the same anti-gaming stance as
Principle IV).

**Code quality over metric score**: SQI metrics exist to *reflect* code quality,
not to be satisfied at the expense of it. When CI fails on an SQI target, the
expected response is to pursue a genuine structural fix — extract a module, break
a dependency cycle, add tests, simplify logic. If no quality-preserving fix is
available (i.e. every candidate fix would degrade readability, correctness,
maintainability, or coupling), the correct action is to **stop and surface the
conflict to the user** rather than making the code worse to satisfy a number.
Degrading code quality to meet a metric is the same anti-gaming violation as
re-tuning the bands.

**Rationale**: Feature 009 introduced both the CI pipeline and the SQI dashboard,
but neither was previously codified as binding. Without a constitution-level gate,
quality erosion accumulates silently between reviews. A single composite score,
backed by per-metric strict gates (coverage thresholds, lint cleanliness, audit),
gives reviewers one "is the project healthy?" number while still enforcing the
hard limits individually.

## Technology Constraints

The technology stack is not yet locked. Decisions MUST be captured in each
feature's `plan.md` under **Technical Context** before implementation begins.

Constraints that apply regardless of stack choice:

- The Redmine REST API endpoint and API key MUST be configurable at runtime (not
  build time).
- The front end MUST function without requiring a separate back-end server if
  technically feasible (e.g., a static SPA calling Redmine directly, subject to
  CORS configuration), OR document the server requirement explicitly in the
  project README.
- Date/time handling MUST be timezone-aware throughout. All dates stored or
  compared internally MUST be in UTC; display conversion to user-local time is
  the UI layer's responsibility.
- The application targets **Easy Redmine** and uses Easy Redmine-specific fields
  (`easy_time_from`, `easy_time_to`) for time entry start/end times. Standard
  (vanilla) Redmine is not supported. The Redmine REST API endpoint and API key
  MUST remain configurable at runtime.

## Development Workflow

- **Branching**: All work MUST happen on feature branches named
  `###-short-description` (sequential numbering per `init-options.json`).
  Direct commits to `main` are forbidden except for initial project scaffolding.
- **Specification before code**: A feature's `spec.md` MUST exist and be reviewed
  before a `plan.md` is created; a `plan.md` MUST exist before tasks are
  generated; tasks MUST exist before implementation starts.
- **Constitution Check gate**: Every `plan.md` MUST include a Constitution Check
  section that explicitly verifies compliance with all six Core Principles before
  implementation begins.
- **Code review**: All PRs MUST be reviewed for constitution compliance before
  merging. Reviewers MUST confirm: API contract respected, tests written first,
  security requirements met, no unjustified complexity added.
- **Commits**: Commit after each completed task or logical unit of work. Commit
  messages MUST reference the task ID (e.g., `T012: implement Redmine API client`).

## Governance

This constitution supersedes all other development practices and informal
agreements. When a conflict arises between this document and any other guideline,
this document takes precedence.

**Amendment procedure**:
1. Propose the change as a PR modifying this file with a rationale.
2. Increment the version per semantic versioning rules (see below).
3. Update the Sync Impact Report comment at the top of this file.
4. Propagate any required changes to templates and dependent documents.
5. PR must be approved before the amendment is in effect.

**Versioning policy**:
- MAJOR: Removal or redefinition of a Core Principle, or a change that
  invalidates previously compliant work.
- MINOR: New principle, new mandatory section, or materially expanded guidance.
- PATCH: Clarifications, wording fixes, or non-semantic refinements.

**Compliance review**: At the start of each feature's plan phase, the Constitution
Check gate in `plan.md` serves as the compliance checkpoint. Non-compliant plans
MUST NOT proceed to implementation.

**Version**: 1.5.2 | **Ratified**: 2026-03-31 | **Last Amended**: 2026-06-13
