# Research: Entry Form UX — Localization (003)

**Date**: 2026-04-12
**Feature**: German/English localization via `js/i18n.js`

---

## Decision 1: i18n architecture

**Decision**: Inline JS module `js/i18n.js` exporting a `t(key, vars)` lookup function and a `locale` constant.

**Rationale**: The project is vanilla JS ES2022 with no build step. External i18n libraries (i18next, LinguiJS) all require npm and a bundler. A simple key/value object in a module is the minimum viable approach and satisfies all requirements (two locales, static strings only, no pluralisation complexity).

**Alternatives considered**:
- **i18next (CDN)**: Adds ~50 KB, async load, complex API — overkill for two static locales.
- **JSON files fetched at startup**: Requires a `fetch()` call before the UI renders, introducing a render-blocking async gap. Ruled out per SC-002 (no flash of English text).
- **Strings embedded per file**: No central source of truth; makes adding a third locale later painful. Ruled out.

---

## Decision 2: Browser language detection

**Decision**: `(navigator.languages?.[0] ?? navigator.language ?? 'en').startsWith('de') ? 'de' : 'en'`

**Rationale**: `navigator.languages` is the modern standard (returns ordered preference list); `navigator.language` is the legacy fallback. The `startsWith('de')` check covers `de`, `de-DE`, `de-AT`, `de-CH` etc. Any non-`de` language falls back to `en` per spec.

**Cross-browser compatibility**: `navigator.languages` is supported in all modern browsers (Chrome 32+, Firefox 32+, Safari 10.1+). The `?? navigator.language` fallback covers any edge case.

---

## Decision 3: String interpolation

**Decision**: Support simple `{{key}}` placeholder substitution in `t()` for dynamic values (e.g., error messages with counts or IDs).

**Rationale**: Some error messages contain dynamic values (e.g., "Saving failed — error {{code}}"). A minimal regex replacement in `t()` handles this without adding a templating library.

**Implementation**:
```js
export function t(key, vars = {}) {
  const str = TRANSLATIONS[locale]?.[key] ?? TRANSLATIONS.en[key] ?? key;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
}
```

---

## Decision 4: Scope of changes

**Files requiring string migration**:

| File | Strings to migrate |
|------|--------------------|
| `js/time-entry-form.js` | Modal labels, buttons, error messages, empty states (~20 strings) |
| `js/calendar.js` | Week total label, overflow indicator, toolbar button labels (~5 strings) |
| `js/redmine-api.js` | Error messages surfaced to the user (~8 strings) |
| `settings.html` | Form labels, section headings, button text (~15 strings) |
| `index.html` | App title, header labels (~3 strings) |

**Files NOT requiring changes**:
- `css/style.css` — no user-visible strings
- `js/config.js` — constants only
- `js/settings.js` — logic only

**Dynamic Redmine content excluded** (per clarification): ticket subjects, project names, activity names, API error bodies from Redmine itself.

---

## Decision 5: Date/time format localisation

**Decision**: Localise date display in the calendar header and any date labels using `Intl.DateTimeFormat` with the detected locale, rather than manual format strings.

**Rationale**: `Intl.DateTimeFormat` is built into all modern browsers, handles DD.MM.YYYY for `de` and ISO/MDY for `en` automatically, and requires zero additional code for timezone handling.

**Implementation**:
```js
// In i18n.js
export function formatDate(dateStr) {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(new Date(dateStr));
}
```
