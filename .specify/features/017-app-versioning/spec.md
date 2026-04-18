# Feature Specification: App Versioning

**Feature Branch**: `017-app-versioning`
**Created**: 2026-04-18
**Status**: Draft
**Input**: User description: "Versioning for CI/CD pipeline. Version number visible in the app. Backlog tracks release versions per feature. Semantic versioning preferred."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User Sees the App Version (Priority: P1)

A user opens the application and can see which version they are running. This helps support conversations ("which version are you on?") and confirms whether a deployment succeeded.

**Why this priority**: Version visibility is the core user-facing outcome. Without it, versioning is invisible and provides no value to end users.

**Independent Test**: Can be fully tested by opening the app and locating the version number on the page.

**Acceptance Scenarios**:

1. **Given** a user opens the app, **When** they navigate to the settings page or help panel, **Then** they see the current version number displayed.
2. **Given** a new version is deployed, **When** a user reloads the app, **Then** the displayed version number matches the newly deployed version.
3. **Given** a user is on a local development instance, **When** they view the version, **Then** it shows a development indicator (e.g., "dev" or a local version) so they can distinguish it from a deployed release.

---

### User Story 2 - Version Increments Automatically on Release (Priority: P2)

When code is merged to main and deployed, the version number increments automatically based on what changed — no manual version bumping required.

**Why this priority**: Automatic versioning removes human error and ensures every deployment has a unique, traceable version. Depends on Story 1 being in place to display the result.

**Independent Test**: Can be fully tested by merging a feature branch to main and verifying the deployed version number is higher than the previous one.

**Acceptance Scenarios**:

1. **Given** a feature branch is merged to main, **When** the CI/CD pipeline runs, **Then** the version number is incremented automatically.
2. **Given** a bug fix or non-feature commit is merged to main, **When** the pipeline runs, **Then** the version receives a patch increment.
3. **Given** two deployments occur in sequence, **When** a user checks versions, **Then** the second version is strictly higher than the first.

---

### User Story 3 - Backlog Tracks Release Versions (Priority: P3)

The backlog shows which version each completed feature was released in, making it easy to answer "when was feature X shipped?"

**Why this priority**: Version tracking in the backlog is a project management benefit that depends on versioning being in place first. It adds traceability but doesn't block core functionality.

**Independent Test**: Can be fully tested by completing a feature, deploying it, and checking that the backlog row for that feature shows the release version.

**Acceptance Scenarios**:

1. **Given** a feature is completed and deployed, **When** the backlog is updated, **Then** the feature row includes the version number it was released in.
2. **Given** multiple features are deployed in the same release, **When** the backlog is viewed, **Then** all features in that release show the same version number.
3. **Given** a user views the backlog, **When** they look at completed features, **Then** they can sort or filter by version to see what shipped together.

---

### Edge Cases

- What happens when a deployment fails — does the version still increment? (Assumed: no, version only increments on successful deployment.)
- What happens in local development — is there a version? (Assumed: local shows "dev" or the package.json version as a fallback.)
- What happens if the backlog update script runs but the version is unknown? (Assumed: the version column is left empty; it can be filled retroactively.)
- What happens when only spec/documentation files are committed to main? (Resolved: CI and deploy pipelines skip runs for documentation-only changes using path filters.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST display the current version number in a user-accessible location (settings page, help panel, or footer).
- **FR-002**: The version number MUST update automatically when a new version is deployed — no manual version bumping.
- **FR-003**: The versioning scheme MUST use semantic versioning (MAJOR.MINOR.PATCH) where feature merges increment MINOR and other commits increment PATCH.
- **FR-004**: The CI/CD pipeline MUST generate the version number during the build/deploy process.
- **FR-005**: The version number MUST be embedded in the deployed application so it is available at runtime without additional network requests.
- **FR-006**: The backlog (BACKLOG.md) MUST include a version column showing which release version each completed feature was included in.
- **FR-007**: The backlog version column MUST be updated automatically by the CI/CD pipeline or deployment scripts when a feature is deployed.
- **FR-008**: Local development instances MUST show a distinguishable version indicator (e.g., "dev" or the package.json version) so users can tell they are not on a deployed release.
- **FR-009**: The version MUST NOT increment when a deployment fails — only successful deployments receive a new version number.
- **FR-010**: The CI pipeline MUST only run when source code or test files change — documentation-only changes (specs, backlog, README, `.specify/` files) MUST NOT trigger CI runs.
- **FR-011**: The deploy pipeline MUST only trigger when code changes are merged to main — not on documentation-only commits.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of deployments result in a unique, incrementing version number visible in the app within 5 minutes.
- **SC-002**: Users can identify their app version in under 10 seconds from any page.
- **SC-003**: Every completed feature in the backlog has a corresponding release version within one deployment cycle.
- **SC-004**: Zero manual steps required to increment or display the version number during a standard deployment.
- **SC-005**: Documentation-only commits to main do not trigger CI or deployment pipelines, saving CI minutes.

## Assumptions

- The MAJOR version starts at 1 (the app is functional and in use). MAJOR increments are reserved for breaking changes and done manually.
- The current package.json version (1.0.0) serves as the starting point for semantic versioning.
- The CI/CD pipeline (GitHub Actions, feature 009) handles version generation during the deploy workflow.
- The version is injected at build/deploy time, not computed at runtime from git history.
- The backlog version column is a new column added to the existing table structure in BACKLOG.md.
- The auto-commit script (auto-commit.sh) is extended to populate the version column when updating the backlog after deployment.
