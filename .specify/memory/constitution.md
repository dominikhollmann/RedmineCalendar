<!--
  SYNC IMPACT REPORT
  ==================
  Version change: (none) → 1.0.0 (initial ratification)

  Modified principles: N/A (initial adoption)

  Added sections:
    - Core Principles (5 principles)
    - Technology Constraints
    - Development Workflow
    - Governance

  Removed sections: N/A

  Templates reviewed:
    - .specify/templates/plan-template.md       ✅ aligned (Constitution Check gate preserved)
    - .specify/templates/spec-template.md       ✅ aligned (no constitution-specific refs)
    - .specify/templates/tasks-template.md      ✅ aligned (phase structure compatible)
    - .specify/templates/agent-file-template.md ✅ aligned (generic, no conflicts)
    - .specify/templates/checklist-template.md  ✅ aligned (generic, no conflicts)

  Deferred TODOs:
    - None. All placeholders resolved at initial ratification.
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
(day / week / month views) MUST be responsive across desktop and common mobile
screen sizes. Interactions MUST complete perceived rendering within 300 ms on a
typical broadband connection; data fetching MUST never block the calendar from
rendering in a loading state.

**Rationale**: The defining value proposition of this tool is replacing Redmine's
tabular issue lists with a temporal, calendar-centric interface. Any change that
degrades calendar usability undermines the product's purpose.

### III. Test-First (NON-NEGOTIABLE)

TDD is mandatory for all business logic, API client code, and data transformation
layers. The Red-Green-Refactor cycle MUST be strictly enforced:
- Tests MUST be written and reviewed before implementation begins.
- Tests MUST fail before the implementation is written.
- Implementation MUST be the minimum code needed to make tests pass.
- Refactoring MUST keep all tests green.

UI-level integration/end-to-end tests are STRONGLY RECOMMENDED for critical user
journeys (e.g., calendar load, event click-through to Redmine). Unit tests alone
are insufficient for API client modules.

**Rationale**: A Redmine integration has complex edge cases (pagination, auth flows,
date-range queries). Tests written after the fact consistently miss these edges and
give false confidence.

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
Rendered event content (issue titles, descriptions) MUST be escaped to prevent
XSS. HTTPS MUST be enforced for all Redmine API communication.

**Rationale**: Calendar tools often display user-controlled content (issue titles)
in a browser context. Without escaping, a malicious issue title becomes a stored
XSS vector. Credential leakage through logs or commits is a common and severe
incident class.

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
- No dependency on Redmine plugins is permitted; the application MUST work with a
  vanilla Redmine installation (version 5.x and above).

## Development Workflow

- **Branching**: All work MUST happen on feature branches named
  `###-short-description` (sequential numbering per `init-options.json`).
  Direct commits to `main` are forbidden except for initial project scaffolding.
- **Specification before code**: A feature's `spec.md` MUST exist and be reviewed
  before a `plan.md` is created; a `plan.md` MUST exist before tasks are
  generated; tasks MUST exist before implementation starts.
- **Constitution Check gate**: Every `plan.md` MUST include a Constitution Check
  section that explicitly verifies compliance with all five Core Principles before
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

**Version**: 1.0.0 | **Ratified**: 2026-03-31 | **Last Amended**: 2026-03-31
