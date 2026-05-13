# Tasks: App Versioning

## Phase 1: Setup

- [x] T001 Create `js/version.js` — fetch `/version.json`, fall back to "dev" if not found, export `getVersion()` and `displayVersion(element)`
- [x] T002 Add `version.json` to `.gitignore` (generated at deploy time, not committed)
- [x] T003 Add i18n keys for version label in `js/i18n.js` (en: "Version", de: "Version")

---

## Phase 2: User Story 1 — Version Display (P1)

- [x] T004 [US1] Update `settings.html` — add version display at the bottom of the settings card
- [x] T005 [US1] Wire version display in `js/settings.js` — import and call `displayVersion()` on page load
- [x] T006 [US1] Add unit test `tests/unit/version.test.js` — test getVersion() returns "dev" when version.json is missing, returns version when present

---

## Phase 3: User Story 2 — Auto Version Increment (P2)

- [x] T007 [US2] Update `.github/workflows/deploy.yml` — add version computation step: read latest git tag, determine increment (MINOR if merge commit message contains "feat:" or "merge:", PATCH otherwise), create new tag, write `version.json` with the version
- [x] T008 [US2] Update `.github/workflows/deploy.yml` — add `permissions: contents: write` for tag creation
- [x] T009 [US2] Add path filters to `.github/workflows/ci.yml` — only trigger on changes to `js/`, `css/`, `*.html`, `tests/`, `package.json`, `package-lock.json`, `.github/workflows/`
- [x] T010 [US2] Add path filters to `.github/workflows/deploy.yml` — same paths, plus `workflow_dispatch` always allowed

---

## Phase 4: User Story 3 — Backlog Version Tracking (P3)

- [x] T011 [US3] Add "Version" column to BACKLOG.md table headers (all three sections: New, In Progress, Done)
- [x] T012 [US3] Update `auto-commit.sh` — when event is `after_uat` (feature done), read the latest git tag and populate the Version column for that feature

---

## Phase 5: Polish

- [x] T013 Run quickstart.md acceptance tests
