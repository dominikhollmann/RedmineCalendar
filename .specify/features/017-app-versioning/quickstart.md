# Quickstart & Acceptance Tests: App Versioning

## Acceptance Tests

### US1 — User Sees the App Version

- [ ] Open the settings page — verify version number is displayed
- [ ] On local dev, verify it shows "dev" or package.json version
- [ ] After deploying, verify the deployed version is shown (not "dev")

### US2 — Version Increments Automatically

- [ ] Merge a feature to main — verify version MINOR increments
- [ ] Push a fix commit to main — verify version PATCH increments
- [ ] Verify two sequential deploys have strictly increasing versions

### US3 — Backlog Tracks Release Versions

- [ ] Verify BACKLOG.md has a Version column
- [ ] After a deployment, verify completed features show the release version

### CI Path Filters

- [x] Push a documentation-only change to main — verify CI does NOT run
- [ ] Push a JS file change — verify CI runs normally
