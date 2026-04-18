# Quickstart & Acceptance Tests: Automated Testing & CI/CD

## Setup

1. Install dev dependencies: `npm install`
2. Ensure `config.json` exists in the app root (or tests use their own fixture)

## Acceptance Tests

### US1 — Developer Runs Unit Tests

- [ ] Run `npm test` from project root — unit tests execute and report pass/fail
- [ ] Verify tests cover `js/redmine-api.js` (request construction, response mapping)
- [ ] Verify tests cover `js/settings.js` (credential encrypt/decrypt, config loading)
- [ ] Verify tests cover `js/config.js` (constants)
- [ ] Verify tests cover `js/crypto.js` (encrypt/decrypt round-trip)
- [ ] Verify tests cover time entry duration calculation
- [ ] Introduce a deliberate bug in a covered module — verify at least one test fails
- [ ] Verify unit tests complete in under 30 seconds

### US2 — Developer Runs Automated UI Tests

- [ ] Run `npm run test:ui` from project root — browser launches (or runs headlessly) and tests execute
- [ ] Verify UI test covers settings save/load flow
- [ ] Verify UI test covers calendar load with time entries
- [ ] Verify UI test covers time entry form (create/edit/delete)
- [ ] Verify UI test covers copy-paste entries
- [ ] Verify UI test covers working hours toggle
- [ ] Verify UI test covers work week toggle
- [ ] Verify UI test covers favourites
- [ ] Verify UI test covers ArbZG compliance warnings
- [ ] Verify UI test covers AI chat assistant
- [ ] Verify UI test covers docs panel
- [ ] Verify no live network calls are made (all stubbed)

### US3 — Tests Run Automatically on Every Commit

- [ ] Push a commit to a feature branch — verify GitHub Actions runs the test suite automatically
- [ ] Verify test results are visible on the pull request
- [ ] Push a commit with a failing test — verify the PR is marked as failed
- [ ] Push a fix — verify the PR status updates to passing

### US4 — Automated Deployment on Merge to Main

- [ ] Merge a passing PR to main — verify GitHub Pages deployment triggers
- [ ] Verify the deployed app reflects the latest changes
- [ ] Push a failing commit to main — verify no deployment occurs
- [ ] Verify deployment status is visible in the GitHub Actions run log
