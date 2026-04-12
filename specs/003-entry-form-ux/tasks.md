# Tasks: German/English Localization (003)

**Input**: Design documents from `/specs/003-entry-form-ux/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: No automated tests — manual acceptance checklist (`quickstart.md`) per Constitution III exception.

---

## Phase 1: Setup

**Purpose**: Create the `js/i18n.js` module skeleton that all subsequent tasks depend on.

- [ ] T001 Create `js/i18n.js` with locale detection (`navigator.languages[0]`/`navigator.language`, `startsWith('de')` → `'de'` else `'en'`), stub `t(key, vars={})` function with `{{placeholder}}` substitution, stub `formatDate(dateStr)` using `Intl.DateTimeFormat`, and empty `TRANSLATIONS = { en: {}, de: {} }` map

---

## Phase 2: Foundational

**Purpose**: Define the complete translation key inventory — all JS files and HTML files depend on these keys existing before strings can be migrated.

**⚠️ CRITICAL**: Phases 3 tasks cannot begin until T002–T003 are complete (keys must exist before callers import them).

- [ ] T002 Audit all user-facing hardcoded strings in `js/time-entry-form.js`, `js/calendar.js`, `js/redmine-api.js`, `index.html`, and `settings.html` — list every string as a namespaced key (e.g. `modal.save`, `error.network`, `calendar.week_total`) in a comment block at the top of `js/i18n.js`
- [ ] T003 Populate `TRANSLATIONS.en` in `js/i18n.js` with all keys from T002 audit mapped to their current English text
- [ ] T004 Populate `TRANSLATIONS.de` in `js/i18n.js` with all keys from T002 audit translated to German

**Checkpoint**: `js/i18n.js` exports `locale`, `t()`, and `formatDate()` with full EN+DE maps. Module can be imported and tested in browser console before any callers are migrated.

---

## Phase 3: User Story 1 — Localization (Priority: P1)

**Goal**: All static UI strings across every screen display in German or English based on browser language, with zero untranslated strings.

**Independent Test**: Set browser to `de`, reload — all labels, buttons, and error messages in the calendar view, lean modal, and settings page appear in German. Set to `en` (or `fr`) — everything in English.

- [ ] T005 [P] [US1] Migrate all hardcoded user-facing strings in `js/time-entry-form.js` to `t()` calls — add `import { t } from './i18n.js';` at top of file; replace every string literal used in DOM output (modal headings, button labels, placeholder text, error messages, empty-state messages)
- [ ] T006 [P] [US1] Migrate all hardcoded user-facing strings in `js/calendar.js` to `t()` calls — add `import { t, formatDate } from './i18n.js';`; replace week total label, overflow indicator text, toolbar button labels, and any other visible strings
- [ ] T007 [P] [US1] Migrate all user-facing error message strings in `js/redmine-api.js` to `t()` calls — add `import { t } from './i18n.js';`; replace every string passed to `new RedmineError(...)` that is shown to the user
- [ ] T008 [P] [US1] Apply translations to static DOM strings in `index.html` — add `<script type="module">` block that imports `{ t }` from `./js/i18n.js` and sets `textContent` / `placeholder` on all static labels; replace any hardcoded visible text in the HTML body
- [ ] T009 [P] [US1] Apply translations to static DOM strings in `settings.html` — same pattern as T008; cover all form labels, section headings, button text, and hint text
- [ ] T010 [US1] Replace hardcoded date string formatting in `js/calendar.js` with `formatDate()` from `js/i18n.js` for all calendar header and date display locations (depends on T006)

**Checkpoint**: With browser set to `de`, every visible string on every screen is in German. With `en` or any other language, everything is in English.

---

## Phase 4: Polish

**Purpose**: Verify completeness and update project documentation.

- [ ] T011 Grep `js/time-entry-form.js`, `js/calendar.js`, `js/redmine-api.js`, `index.html`, `settings.html` for any remaining hardcoded English string literals in DOM output — fix any found
- [ ] T012 Run the full `specs/003-entry-form-ux/quickstart.md` acceptance checklist manually (de locale, en locale, fallback, no-flash, errors, Redmine exclusion)

---

## Dependencies & Execution Order

```
T001 (create i18n.js skeleton)
  └─► T002 (audit strings)
        └─► T003 (EN map)
              └─► T004 (DE map)
                    └─► T005, T006, T007, T008, T009 (all parallel — different files)
                          └─► T010 (date formatting — depends on T006)
                                └─► T011 (verify no leaks)
                                      └─► T012 (quickstart checklist)
```

### Parallel Opportunities

T005, T006, T007, T008, T009 all touch different files and can run in parallel once T004 is complete.

---

## Implementation Strategy

### MVP (single increment — this feature is a single story)

1. Complete Phase 1: Create `js/i18n.js` skeleton → T001
2. Complete Phase 2: Audit + fill translation maps → T002, T003, T004
3. Complete Phase 3: Migrate all callers → T005–T010 (T005–T009 in parallel)
4. Polish: Verify + checklist → T011, T012

---

## Notes

- Import `{ t }` from `./i18n.js` in JS files (ES module relative path)
- Import `{ t }` from `./js/i18n.js` in HTML inline scripts
- `t(key)` returns the `en` value if `de` key is missing — safe during migration
- Dynamic Redmine content (ticket subjects, project names, activity names) must NOT be passed through `t()` — leave as-is
- Commit after T004 (translation maps complete) and after T010 (all callers migrated) as logical checkpoints
