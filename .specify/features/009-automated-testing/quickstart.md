# Quickstart & Acceptance Tests: Automated Testing & CI/CD

## Setup

1. Install dev dependencies: `npm install`
2. Ensure `config.json` exists in the app root (or tests use their own fixture)

## Acceptance Tests

### US1 — Developer Runs Unit Tests

- [x] Run `npm test` from project root — unit tests execute and report pass/fail
- [x] Verify tests cover `js/redmine-api.js` (request construction, response mapping)
- [x] Verify tests cover `js/settings.js` (credential encrypt/decrypt, config loading)
- [x] Verify tests cover `js/config.js` (constants)
- [x] Verify tests cover `js/crypto.js` (encrypt/decrypt round-trip)
- [x] Verify tests cover time entry duration calculation
- [x] Introduce a deliberate bug in a covered module — verify at least one test fails
- [x] Verify unit tests complete in under 30 seconds

### US2 — Developer Runs Automated UI Tests

- [x] Run `npm run test:ui` from project root — browser launches (or runs headlessly) and tests execute
- [x] Verify UI test covers settings save/load flow
- [x] Verify UI test covers calendar load with time entries
- [x] Verify UI test covers time entry form (create/edit/delete)
- [x] Verify UI test covers copy-paste entries
- [x] Verify UI test covers working hours toggle
- [x] Verify UI test covers work week toggle
- [x] Verify UI test covers favourites
- [x] Verify UI test covers ArbZG compliance warnings
- [x] Verify UI test covers AI chat assistant
- [x] Verify UI test covers docs panel
- [x] Verify no live network calls are made (all stubbed)

### US3 — Tests Run Automatically on Every Commit

- [x] Push a commit to a feature branch — verify GitHub Actions runs the test suite automatically
- [x] Verify test results are visible on the pull request
- [x] Push a commit with a failing test — verify the PR is marked as failed
- [x] Push a fix — verify the PR status updates to passing

### US4 — Automated Deployment on Merge to Main

- [x] Merge a passing PR to main — verify GitHub Pages deployment triggers
- [x] Verify the deployed app reflects the latest changes
- [x] Push a failing commit to main — verify no deployment occurs
- [x] Verify deployment status is visible in the GitHub Actions run log
