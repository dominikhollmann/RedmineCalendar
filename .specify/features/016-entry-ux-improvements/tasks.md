# Tasks: Entry UX Improvements

## Phase 1: User Story 1 — #Number Search (P1)

- [ ] T001 [US1] Update `js/redmine-api.js` `searchIssues()` — add `#` prefix handling: strip `#`, do ID-only lookup, return empty array if not found (no subject fallback)
- [ ] T002 [US1] Add unit test in `tests/unit/redmine-api.test.js` — test `#123` returns ID-only result, `#99999` returns empty array

---

## Phase 2: User Story 2 — Ticket Hyperlinks (P2)

- [ ] T003 [US2] Update `js/calendar.js` `eventContent()` — render ticket line as `<a>` element with href to `{redmineServerUrl}/issues/{id}`, target `_blank`, instead of plain `<div>`
- [ ] T004 [US2] Update `js/calendar.js` `eventClick` handler — if click target is an `<a>` link inside the event, don't trigger select/edit
- [ ] T005 [US2] Add CSS in `css/style.css` — style `.ev-issue a` with appropriate color, hover underline, pointer cursor
- [ ] T006 [US2] Add i18n keys if needed in `js/i18n.js`

---

## Phase 3: User Story 3 — Comment Field (P3)

- [ ] T007 [US3] Update `js/time-entry-form.js` — add comment input field below the time fields, pre-fill on edit, include in save payload
- [ ] T008 [US3] Update `js/time-entry-form.js` — prevent Enter key in comment field from submitting the form
- [ ] T009 [US3] Add i18n keys for comment label in `js/i18n.js`
- [ ] T010 [US3] Add CSS for comment field in `css/style.css`

---

## Phase 4: Polish

- [ ] T011 Run quickstart.md acceptance tests
