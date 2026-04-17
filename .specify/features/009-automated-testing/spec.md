# Feature Specification: Automated Testing & CI/CD Pipeline

**Feature Branch**: `009-automated-testing`  
**Created**: 2026-04-12  
**Updated**: 2026-04-17  
**Status**: Draft  
**Input**: User description: "QA - Include Unit Tests and automated UI tests" + "add to feature 009 that this also setups a CI/CD pipeline"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Runs Unit Tests (Priority: P1)

A developer makes a change to a JavaScript module and runs the unit test suite in under 5 seconds to verify that core business logic — time entry calculations, API request formatting, settings parsing — still works correctly.

**Why this priority**: Unit tests are the foundation. They run fast, catch logic regressions instantly, and require no browser. Everything else depends on having this layer in place first.

**Independent Test**: Can be fully tested by running the unit test command and seeing pass/fail output for all covered modules without a browser or server.

**Acceptance Scenarios**:

1. **Given** a developer has modified a JavaScript module, **When** they run the unit test command, **Then** the test suite completes and reports pass/fail for each test case.
2. **Given** a test covers a function that calculates time entry duration, **When** the function returns an incorrect value, **Then** the relevant test fails with a clear description of what was expected vs. what was received.
3. **Given** all unit tests pass, **When** the developer introduces a deliberate bug in a covered module, **Then** at least one unit test fails.

---

### User Story 2 - Developer Runs Automated UI Tests (Priority: P2)

A developer runs the UI test suite to verify that key user interactions — opening the time entry form, submitting an entry, navigating the calendar — work correctly in a real browser without manual clicking.

**Why this priority**: UI tests catch integration issues that unit tests miss (rendering, event handling, DOM interactions). They take longer to run but protect the most critical user journeys.

**Independent Test**: Can be fully tested by running the UI test command and seeing each interaction scenario execute in a browser and report pass/fail.

**Acceptance Scenarios**:

1. **Given** a developer runs the UI test command, **When** the tests execute, **Then** a browser opens (or runs headlessly), exercises the defined scenarios, and reports results.
2. **Given** a UI test covers the time entry form submission flow, **When** the form submission logic is broken, **Then** the relevant UI test fails with a description of which step failed.
3. **Given** all UI tests pass on a clean build, **When** a developer introduces a regression in the calendar rendering, **Then** at least one UI test fails.

---

### User Story 3 - Tests Run Automatically on Every Commit (Priority: P3)

Every time a developer pushes code, the full test suite (unit + UI) runs automatically and blocks merging if any test fails.

**Why this priority**: Automation is the multiplier that makes the testing investment pay off long-term. However, it depends on Stories 1 and 2 producing reliable tests first — flaky tests in CI cause more harm than no CI.

**Independent Test**: Can be fully tested by pushing a commit with a known bug and observing that the automated pipeline reports a failure before the code can be merged.

**Acceptance Scenarios**:

1. **Given** a developer pushes a commit to a feature branch, **When** the push completes, **Then** the test suite runs automatically without any manual trigger.
2. **Given** a test fails in the automated run, **When** a developer views the pipeline results, **Then** they can see which specific test failed and why.
3. **Given** all tests pass, **When** the pipeline completes, **Then** the branch is marked as safe to merge.

---

### User Story 4 - Automated Deployment on Merge to Main (Priority: P4)

When code is merged to the `main` branch and all tests pass, the application is automatically deployed to the hosting environment without manual intervention.

**Why this priority**: CD completes the automation loop. Once CI is reliable (Story 3), adding deployment automation eliminates the manual deploy step and ensures the live application always matches the latest main branch.

**Independent Test**: Can be tested by merging a passing PR to main and verifying the deployed application reflects the latest changes within a reasonable time.

**Acceptance Scenarios**:

1. **Given** a PR is merged to `main`, **When** all tests pass in the CI pipeline, **Then** the application is deployed automatically to the hosting environment.
2. **Given** the deployment completes, **When** a user accesses the application, **Then** they see the latest version of the application.
3. **Given** the CI pipeline fails on `main` (e.g., a test was skipped locally), **When** the pipeline reports failure, **Then** no deployment occurs and the previous version remains live.
4. **Given** a deployment fails (e.g., hosting service unavailable), **When** the pipeline reports the failure, **Then** the developer can see a clear error message and can re-trigger the deployment manually.

---

### Edge Cases

- What happens when a test depends on a live Redmine connection? (Assumed: network calls are stubbed in tests — no live server required.)
- What happens when a UI test fails intermittently due to timing? (Assumed: tests must be deterministic; flaky tests are treated as failures to be fixed.)
- What is the minimum test coverage expected? (Assumed: all core business logic modules must have unit tests; all primary user flows must have UI tests.)
- What happens if the deployment target is unreachable? (Assumed: pipeline reports failure clearly; previous version remains live.)
- What happens if two merges to main overlap? (Assumed: deployments are serialized — only the latest main commit is deployed.)
- What hosting platform is used for deployment? (Assumed: to be determined during planning; the pipeline must be platform-agnostic enough to support common static hosting — GitHub Pages, Netlify, or similar.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Developers MUST be able to run the full unit test suite with a single command from the project root.
- **FR-002**: Developers MUST be able to run the full UI test suite with a single command from the project root.
- **FR-003**: Unit tests MUST cover all core business logic: time entry duration calculation, API request construction, settings read/write, and activity/issue data mapping.
- **FR-004**: UI tests MUST cover the primary user flows: loading the calendar, opening the time entry form, submitting a valid entry, and navigating between weeks.
- **FR-005**: Tests MUST NOT require a live Redmine connection — all network calls MUST be stubbed or mocked within the test environment.
- **FR-006**: Each failing test MUST report a clear message identifying what was expected and what was received.
- **FR-007**: The test suite MUST complete unit tests in under 30 seconds on a developer machine.
- **FR-008**: The automated pipeline MUST run both unit and UI tests on every push to any branch.
- **FR-009**: The automated pipeline MUST prevent merging to main if any test fails.
- **FR-010**: Test results MUST be visible in the pull request view on GitHub.
- **FR-011**: The CI/CD pipeline MUST automatically deploy the application to the hosting environment when code is merged to `main` and all tests pass.
- **FR-012**: The pipeline MUST NOT deploy if any test fails — the previous deployed version MUST remain live.
- **FR-013**: Deployment status MUST be visible in the GitHub Actions run log, including success/failure and the deployed URL.
- **FR-014**: A failed deployment MUST be re-triggerable manually without re-merging code.

### Key Entities

- **Unit Test**: An isolated, fast test that verifies the behaviour of a single JavaScript function or module without a browser or network.
- **UI Test**: A browser-based test that exercises a full user interaction scenario — from page load through user action to visible result.
- **Test Suite**: The complete collection of unit and UI tests, runnable together or independently.
- **CI Pipeline**: An automated process that runs the test suite on every code push and reports results back to GitHub.
- **CD Pipeline**: An automated process that deploys the application to the hosting environment after a successful merge to `main`.
- **Deployment Target**: The hosting environment where the application is served to end users (e.g., GitHub Pages, Netlify, or a self-hosted server).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The unit test suite runs to completion in under 30 seconds on a standard developer machine.
- **SC-002**: All core business logic modules (time entry, settings, API client, form logic) have unit test coverage.
- **SC-003**: All primary user flows have at least one corresponding UI test.
- **SC-004**: Zero live network calls are made during test execution.
- **SC-005**: A deliberate regression introduced into any covered module causes at least one test to fail within the same test run.
- **SC-006**: Test results are visible on every pull request on GitHub without any manual steps.
- **SC-007**: After a successful merge to `main`, the deployed application reflects the latest code within 5 minutes.
- **SC-008**: A failed deployment does not take down the previously deployed version.

## Assumptions

- Tests run locally without a running Redmine server — all API responses are simulated.
- CI runs on GitHub Actions (free tier), triggered on push to any branch.
- "Core business logic" means the functions in `js/redmine-api.js`, `js/time-entry-form.js`, `js/settings.js`, and `js/config.js`.
- "Primary user flows" means: settings save/load, calendar load with time entries, and time entry form open/submit.
- UI tests run headlessly in CI and can optionally run in a visible browser locally.
- Test infrastructure is added as dev dependencies only — no production bundle size impact.
- A minimum coverage percentage is not mandated; meaningful coverage of key paths is the goal.
- The deployment target will be determined during the planning phase. The application is a static SPA (HTML/CSS/JS, no server-side rendering) so any static hosting service is compatible.
- The CD pipeline deploys only from the `main` branch — feature branches are never deployed automatically.
- Secrets (deployment tokens, API keys) are stored as GitHub Actions secrets, not in the repository.
