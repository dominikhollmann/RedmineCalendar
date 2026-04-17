# Feature Specification: User Documentation

**Feature Branch**: `013-user-docs`  
**Created**: 2026-04-17  
**Status**: Clarified  
**Input**: User description: "I want to integrate a user documentation explaining the functionality of the software"

## Clarifications

### Session 2026-04-17

- Q: Should documentation be a separate HTML page or an in-page panel? → A: In-page slide-in panel within `index.html`
- Q: Should documentation content be structured for machine readability (chatbot access)? → A: Markdown source file with consistent per-feature headings
- Q: What language should be shown for locales other than `en` or `de`? → A: Fall back to English
- Q: Should the documentation be readable without JavaScript? → A: No — JS is a prerequisite for the application; no static fallback required

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Access In-App Help (Priority: P1)

A new user opens the RedmineCalendar application for the first time and wants to understand what it does and how to use its core features (viewing time entries, creating entries, navigating the calendar). They access a help/documentation page or panel directly from the app without leaving the browser.

**Why this priority**: New users need orientation to get productive with the tool. Without documentation, onboarding is blocked by trial-and-error. This delivers the most user value as a standalone slice.

**Independent Test**: Can be fully tested by navigating to the documentation entry point (e.g., a "Help" link or "?" button in the app header) and verifying all core feature descriptions are present and readable.

**Acceptance Scenarios**:

1. **Given** a user is on the main calendar view, **When** they click the help/documentation link, **Then** a slide-in documentation panel opens within the same page describing the core features of the application.
2. **Given** a user has opened the documentation, **When** they read the content, **Then** they find explanations for: viewing time entries on the calendar, creating/editing/deleting time entries, navigating between weeks/months, and configuring settings (Redmine URL and API key).
3. **Given** a user is on the settings page, **When** they click a help link, **Then** they are shown documentation relevant to the settings configuration (what the Redmine URL and API key fields mean and where to find the values).

---

### User Story 2 - Discover Feature-Specific Help (Priority: P2)

An existing user encounters a specific feature they haven't used before (e.g., copy-paste of time entries, working-hours view, keyboard shortcuts) and wants to understand how it works without hunting through the entire documentation.

**Why this priority**: Contextual or feature-specific help reduces support friction and increases feature adoption for users who are already familiar with the basics.

**Independent Test**: Can be tested independently by verifying that documentation covers all major features (copy/paste, working-hours toggle, day-range toggle, favourites, ArbZG compliance indicators) with short, self-contained explanations.

**Acceptance Scenarios**:

1. **Given** a user reading the documentation, **When** they look for keyboard shortcuts, **Then** they find a complete list of all supported keyboard shortcuts (e.g., Ctrl+C to copy, Del to delete, Enter to open).
2. **Given** a user reading the documentation, **When** they browse feature descriptions, **Then** each major feature has a clear explanation of what it does and how to activate or use it.
3. **Given** a user reading the documentation, **When** they view the copy-paste section, **Then** the documentation explains how single-click selection, double-click/Enter to open, Ctrl+C to copy, and slot-click/drag to paste work together.

---

### User Story 3 - Language-Appropriate Documentation (Priority: P3)

A German-speaking user accesses the documentation and sees it in German, matching the application locale they are already using.

**Why this priority**: The application already supports English and German locales (via `js/i18n.js`). Providing documentation in the user's detected language increases comprehension and consistency with the rest of the UI.

**Independent Test**: Can be tested by loading the app with a German browser locale and verifying that documentation content is displayed in German.

**Acceptance Scenarios**:

1. **Given** the browser locale is German (`de`), **When** the user opens the documentation, **Then** all documentation content is displayed in German.
2. **Given** the browser locale is English (`en`) or any non-German locale, **When** the user opens the documentation, **Then** all documentation content is displayed in English.

---

### Edge Cases

- JavaScript disabled: not a supported scenario — the application requires JS to function; no documentation fallback is needed.
- How does the documentation handle future features being added (is it easy to extend)?
- What if the user's locale is neither `en` nor `de` — English is shown as the fallback language.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST provide a clearly accessible entry point to user documentation (e.g., a "?" button or "Help" link visible on the main calendar view and settings page) that opens a slide-in panel within the same page without navigation.
- **FR-002**: The documentation MUST cover all core features: calendar navigation, time entry creation/editing/deletion, settings configuration (Redmine URL and API key), copy-paste of time entries, working-hours view toggle, full-week/work-week toggle, favourite issues, ArbZG compliance indicators, and keyboard shortcuts.
- **FR-003**: The documentation MUST include a keyboard shortcuts reference listing all supported shortcuts.
- **FR-004**: Documentation content MUST be available in both English and German. The language shown MUST match the application locale (`navigator.languages[0]`): German (`de`) shows German content; any other locale falls back to English.
- **FR-005**: All user-visible strings in the documentation UI (headings, navigation labels, link text) MUST be managed through the existing localisation system (`js/i18n.js` / `t('key')`).
- **FR-006**: The documentation MUST be integrated into the application without requiring an external service or internet connection beyond what the app already uses.
- **FR-007**: The documentation entry point MUST be visible without scrolling on both the calendar view and the settings view.
- **FR-008**: Documentation content MUST be authored as a single Markdown source file with one consistent heading per feature area, so that it is both human-maintainable and machine-readable (e.g. by the AI chatbot in feature 014).

### Key Entities

- **Documentation Panel**: A slide-in panel rendered within the main application page displaying help content parsed from the Markdown source file.
- **Documentation Source File**: A single Markdown file with one heading per feature area, serving as the canonical content source for both the panel and external consumers (e.g. the AI chatbot).
- **Help Entry Point**: A UI element (button, link, or icon) placed in the application header or toolbar that opens the documentation panel.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can locate the documentation entry point within 10 seconds of opening the application without any prior guidance.
- **SC-002**: The documentation covers 100% of the named features listed in FR-002.
- **SC-003**: All documentation text is available in both English and German with no untranslated strings visible in either locale.
- **SC-004**: The documentation panel opens and is fully readable within 500ms without network requests beyond those already required by the application.
- **SC-005**: 90% of new users, after reading the documentation, can successfully create their first time entry without additional help.

## Assumptions

- The documentation will be a slide-in panel rendered within `index.html` by the existing JavaScript (no separate `docs.html` page), consistent with the project's no-build-step architecture. Content is sourced from a Markdown file (e.g. `docs/content.md`) parsed at runtime.
- Mobile/responsive layout for the documentation page is out of scope for this feature; desktop layout is the primary target, matching the existing application.
- The documentation will be maintained manually alongside feature development; no automated doc-generation tooling is required.
- The existing `js/i18n.js` locale detection (`navigator.languages[0]`) will be reused as-is for language selection in the documentation.
- Screenshots or animated GIFs are out of scope; documentation will be text-based with optional structural elements (tables for keyboard shortcuts, headings per feature).
