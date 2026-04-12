# Feature Specification: Entry Form UX Enhancements and Localization

**Feature Branch**: `003-entry-form-ux`
**Created**: 2026-03-31
**Updated**: 2026-04-12
**Status**: Draft
**Input**: User description: "Support localization for german and english dependent on the browser settings. In the view to add a time entry: Show a list of frequently used tickets in the last 15 days. Add a feature to save favourites of tickets (stored in cookie). In Log-View: Let the user input start and end time. Duration is calculated but not editable."

## Clarifications

### Session 2026-04-12

- Q: Which user stories from 003 still need to be implemented given 007's delivery (start/end times, last used, favourites)? → A: Remove US1–US3 (covered by 007); 003 is localization-only (US4).
- Q: How should translation strings be stored? → A: Inline JS object in `js/i18n.js` — key/value map per locale, no fetch required.
- Q: Should dynamic Redmine content (ticket subjects, project names, API errors) be excluded from the localization requirement? → A: Yes — only static UI strings (labels, buttons, placeholders, app-generated error messages) are in scope.
- Q: Should the user be able to override the detected language in Settings? → A: No — auto-detection only; no manual override.
- Q: Should the lean time entry modal (007) be covered by localization? → A: Yes — full coverage; lean modal strings included in `i18n.js` alongside all other screens.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - German/English Localization Based on Browser Language (Priority: P1)

As a user, I want the application's interface to automatically appear in German or English based on my browser's language setting, so I do not have to configure the language manually.

**Independent Test**: Set the browser language to German (`de`), reload the application, and verify all UI labels, button text, and error messages appear in German. Switch browser language to English (`en`) and verify the interface switches accordingly.

**Acceptance Scenarios**:

1. **Given** the browser language is set to German (`de` or `de-*`), **When** the application loads, **Then** all UI text (labels, buttons, placeholders, error messages, date formats) is displayed in German.
2. **Given** the browser language is set to English or any unsupported language, **When** the application loads, **Then** all UI text is displayed in English (fallback).
3. **Given** the application is displayed in German, **When** date and time values are shown, **Then** they follow German conventions (e.g., 24-hour clock, DD.MM.YYYY date format).
4. **Given** the application is displayed in English, **When** date and time values are shown, **Then** they follow English/ISO conventions.
5. **Given** a new UI string is added in a future update, **When** the locale is German, **Then** the string must have a German translation (no untranslated English strings leak through in German mode).

---

### Edge Cases

- If the browser reports a language other than `de` or `en` (e.g., `fr`), fall back to English.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST detect the browser's preferred language on load and apply the matching locale (German for `de`/`de-*`, English otherwise).
- **FR-002**: All user-facing strings, labels, error messages, placeholders, and date/time formats MUST be localized for both German and English.
- **FR-003**: Language selection MUST be automatic (no manual language toggle required).

### Key Entities

- **Locale**: The active language/region setting (German or English) derived from the browser at application load time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All static UI strings (labels, buttons, placeholders, app-generated error messages) are displayed in the correct language with 0 untranslated static strings visible to the user. Dynamic content from Redmine (ticket subjects, project names, activity names) is excluded from this requirement.
- **SC-002**: Language is applied on initial load with no flash of English text when German is active.

## Assumptions

- Only two locales are in scope: German (`de`) and English (`en`). No other languages are planned for this feature.
- Date format in German mode: DD.MM.YYYY. Date format in English mode: ISO (YYYY-MM-DD) for consistency with Redmine.
- Language detection uses `navigator.language` / `navigator.languages[0]`; no server-side locale detection is required.
- Translations are stored as an inline JS key/value object in `js/i18n.js`; no JSON files or network fetch is required.
- Localization covers all screens: the calendar view, the lean time entry modal (007), and the settings page. All hardcoded English strings in `js/time-entry-form.js` must be migrated to `i18n.js`.
- Mobile layout is out of scope, consistent with the overall project constitution.
