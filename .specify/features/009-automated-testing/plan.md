# Implementation Plan: Automated Testing & CI/CD Pipeline

**Branch**: `009-automated-testing` | **Date**: 2026-04-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `.specify/features/009-automated-testing/spec.md`

## Summary

Add unit tests (Vitest) and UI tests (Playwright) covering all business logic and user-facing features. Set up GitHub Actions CI to run tests on every push and CD to deploy to GitHub Pages on merge to main. All tests are self-contained with fixture config.json and stubbed API responses.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation)
**Primary Dependencies**: Vitest (unit tests), Playwright (UI tests), GitHub Actions (CI/CD)
**Storage**: N/A (test fixtures only)
**Testing**: Vitest for unit tests, Playwright for UI/E2E tests
**Target Platform**: Node.js 20+ (test runner), modern browsers (Playwright)
**Project Type**: Static web application (SPA) — testing infrastructure
**Performance Goals**: Unit tests < 30 seconds, full suite < 5 minutes in CI
**Constraints**: No build step, ES modules only, no live Redmine connection in tests
**Scale/Scope**: ~10 unit test files, ~10 UI test files, 2 GitHub Actions workflows

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Redmine API Contract | PASS | All API calls stubbed in tests. No live Redmine connection. |
| II. Calendar-First UX | PASS | UI tests validate calendar rendering and interactions. |
| III. Test-First | PASS | This feature IS the test infrastructure. Tests written for all existing modules. |
| IV. Simplicity & YAGNI | PASS | Vitest and Playwright are minimal, standard choices. No custom test framework. |
| V. Security by Default | PASS | No credentials in test fixtures. CI secrets stored in GitHub Actions. |

## Project Structure

### Documentation (this feature)

```text
.specify/features/009-automated-testing/
├── plan.md
├── research.md
├── quickstart.md
└── tasks.md
```

### Source Code (repository root)

```text
tests/
├── unit/
│   ├── config.test.js
│   ├── crypto.test.js
│   ├── settings.test.js
│   ├── redmine-api.test.js
│   ├── time-entry-form.test.js
│   ├── i18n.test.js
│   └── arbzg.test.js
├── ui/
│   ├── settings.spec.js
│   ├── calendar.spec.js
│   ├── time-entry.spec.js
│   ├── copy-paste.spec.js
│   ├── working-hours.spec.js
│   ├── workweek.spec.js
│   ├── favourites.spec.js
│   ├── arbzg.spec.js
│   ├── chatbot.spec.js
│   └── docs.spec.js
├── fixtures/
│   ├── config.json
│   └── api-responses/
│       ├── time-entries.json
│       ├── activities.json
│       ├── issues.json
│       └── current-user.json
├── vitest.config.js
└── playwright.config.js
.github/
└── workflows/
    ├── ci.yml
    └── deploy.yml
```

**Structure Decision**: Tests in a top-level `tests/` directory. Unit tests use Vitest, UI tests use Playwright. Fixtures shared between both. CI/CD in `.github/workflows/`.

## Complexity Tracking

No violations — all tools are standard, minimal, and justified by the spec.
