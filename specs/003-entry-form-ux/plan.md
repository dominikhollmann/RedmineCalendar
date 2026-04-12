# Implementation Plan: German/English Localization (003)

**Branch**: `003-entry-form-ux` | **Date**: 2026-04-12 | **Spec**: `specs/003-entry-form-ux/spec.md`

---

## Summary

Add automatic German/English localization to RedmineCalendar based on the browser's language preference. All static UI strings (labels, buttons, placeholders, app-generated errors) are migrated to a central `js/i18n.js` module. Dynamic content from Redmine (ticket subjects, activity names) is intentionally excluded. No external library is required.

---

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla, no transpilation)
**Primary Dependencies**: FullCalendar v6 (CDN) — unchanged; no new dependencies
**Storage**: N/A — locale is detected at runtime from `navigator.languages`, not persisted
**Testing**: Manual acceptance checklist (`quickstart.md`) per Constitution III exception — single-user tool, no CI pipeline
**Target Platform**: Desktop browser (Chrome, Firefox, Safari)
**Project Type**: Web application (static SPA)
**Performance Goals**: Locale applied synchronously at module import — zero async latency, no flash of English text
**Constraints**: No build step, no bundler, no external i18n library; flat key/value translation map only

---

## Constitution Check

### I. Redmine API Contract ✅
No changes to API client code. `redmine-api.js` error messages are migrated to `i18n.js` keys but the API interaction logic is unchanged.

### II. Calendar-First UX ✅
Localization is purely additive — no calendar behaviour, layout, or rendering changes. Date display in the calendar header will use `Intl.DateTimeFormat` for locale-appropriate formatting.

### III. Test-First — **Exception applied**
**Deviation**: No automated tests. Manual acceptance checklist (`quickstart.md`) covers all FR and acceptance scenarios per the Constitution 1.1.0 exception.
**Justification**: Single-user tool, no CI pipeline, no shared contributors. The `quickstart.md` checklist covers all 6 acceptance scenarios and all FRs. Checklist must be executed in full before marking the feature complete.

### IV. Simplicity & YAGNI ✅
Inline JS object in `js/i18n.js`, flat key/value structure, `t(key, vars)` function. No library, no async fetch, no build step. Two locales only — no plugin architecture or lazy loading.

### V. Security by Default ✅
`navigator.language` is a trusted browser API. No new user-supplied data. All rendered strings are hardcoded translations, not user content — no XSS risk introduced.

---

## Project Structure

### Documentation (this feature)

```text
specs/003-entry-form-ux/
├── plan.md          ✅ this file
├── research.md      ✅ generated
├── data-model.md    ✅ generated
├── quickstart.md    ✅ generated
└── tasks.md         ⬜ next step (/speckit.tasks)
```

### Source Code Changes

```text
js/i18n.js              # NEW — locale detection, t(), formatDate()
js/time-entry-form.js   # MODIFY — migrate ~20 hardcoded strings to t()
js/calendar.js          # MODIFY — migrate ~5 hardcoded strings to t()
js/redmine-api.js       # MODIFY — migrate ~8 user-facing error strings to t()
settings.html           # MODIFY — migrate ~15 static strings to t() via script
index.html              # MODIFY — migrate ~3 static strings
```

**Structure Decision**: Single flat module `js/i18n.js` loaded as ES module. All other JS files import `{ t, locale, formatDate }` from it. HTML files with static strings use a small inline `<script type="module">` to apply translations to DOM elements on load.

---

## Complexity Tracking

No constitution violations requiring justification beyond the Test-First exception above.

| Deviation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| No automated tests (III) | Single-user tool, no CI | Manual checklist is the documented compensating control per Constitution 1.1.0 |
