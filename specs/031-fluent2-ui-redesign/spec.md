# Feature Specification: Fluent 2 UI Redesign with Corporate Identity Theme

**Feature Branch**: `031-fluent2-ui-redesign`
**Created**: 2026-05-10
**Status**: Draft
**Input**: User description: "ui design: use fluent 2 design system for the ui and corporate identity theme. make a note that I want to try out the new Claude ui capabilities here"

> **Process note**: the deploying team wants to use this feature as an opportunity to try out **new Claude UI capabilities** (e.g., Claude-generated design mockups, AI-assisted CSS synthesis, faster iteration on visual variants). This is a process preference, not a functional requirement, and the user-visible outcome must not depend on which Claude features are used. Recorded here so the intent is not lost in planning.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Consistent Fluent 2 Visual Language Across the App (Priority: P1)

A user opens the app on Monday morning. Today the visual language is a mix — buttons in modals look different from buttons on the calendar toolbar, headings use varying weights, spacing between fields varies between Settings and the entry form, and the chatbot/docs panels have their own bespoke style. After this feature, every surface looks like part of the same app: same type scale, same color tokens, same spacing rhythm, same elevations and motion. The user can move between surfaces without a visual context switch.

**Why this priority**: This is the foundation. Without a consistent base design system, layering corporate identity on top is meaningless — the brand colors would just paint over an inconsistent shape. Fluent 2 also gives us accessible defaults (contrast, focus states, touch sizing) for free. Every other story in this feature builds on this one.

**Independent Test**: A visual audit of every screen and panel — calendar (week + day views), Settings, time-entry modal, copy-paste banner, AI chat panel, docs panel, ArbZG warning banner, error/info banners, version display — confirms each uses the same color tokens, typography scale, spacing scale, elevation system, and motion patterns. No surface looks like a visual island.

**Acceptance Scenarios**:

1. **Given** the redesign is shipped, **When** I open the calendar and then the Settings page, **Then** the type scale (heading/body sizes), button styling, input styling, and spacing rhythm are visually consistent across both pages.
2. **Given** the redesign is shipped, **When** I open the time-entry modal on top of the calendar, **Then** the modal uses the same elevation, the same button styles, and the same spacing units as the calendar surfaces underneath.
3. **Given** the redesign is shipped, **When** I open the AI chat panel and the docs panel, **Then** both panels follow the same panel chrome conventions (header, close affordance, scroll behaviour) instead of each defining its own.
4. **Given** the redesign is shipped, **When** I trigger any modal open, hover, or focus interaction, **Then** the timing and easing of motion is consistent with the rest of the app.
5. **Given** the redesign is shipped on a mobile viewport (`< 768px`), **When** I tap any interactive element, **Then** the touch target is at least 44 × 44 px.
6. **Given** the redesign is shipped, **When** any pre-existing user flow is performed (entry CRUD, copy-paste, working-hours toggle, ArbZG warnings, AI chat, Outlook import), **Then** the behaviour is identical to before — only the visual presentation changes.

---

### User Story 2 - Corporate Identity Theme on Top of Fluent 2 (Priority: P2)

A new employee opens the app for the first time. Without being told, they recognise it as a tool from their company — the primary action color matches the company's brand, the logo or wordmark is visible where appropriate, and the typography (if the company has an opinion) matches what they see on the intranet. The tool feels like part of the company toolset, not a generic third-party app.

**Why this priority**: Brand recognition is what makes the redesign feel "ours" rather than "Microsoft-flavoured". It also gives sponsoring stakeholders an emotional sign-off moment. Lower priority than P1 because without a coherent base it would just be noise on top of noise.

**Independent Test**: With the redesign shipped, every surface shows the corporate brand colour as the primary accent, the company logo (or wordmark) where appropriate, and any company-specified typography. Accessibility audit confirms no contrast ratio dropped below WCAG 2.1 AA after the brand colours were applied.

**Acceptance Scenarios**:

1. **Given** the redesign is shipped, **When** I view any primary action button anywhere in the app, **Then** its colour matches the company's published brand primary.
2. **Given** the redesign is shipped, **When** I view the app's header / branding region, **Then** the company logo or wordmark is visible.
3. **Given** the redesign is shipped, **When** I run an automated WCAG 2.1 AA contrast audit on every interactive surface in both light and dark variants, **Then** every text/background pair passes the AA threshold.
4. **Given** the corporate-identity theme is applied, **When** I navigate every surface in the app, **Then** no surface falls back to the unbranded Fluent 2 default — the brand is uniform.

---

### User Story 3 - Light and Dark Variants Aligned with the New Design System (Priority: P3)

A user who works in low-light conditions — or who simply prefers a dark UI — wants to switch the entire app to a dark variant of the same corporate-identity-tinted design system. The dark variant must be a true dark theme (not just inverted colours) and must preserve brand recognition and accessibility.

**Why this priority**: The Fluent 2 system natively supports light/dark variants, so getting both for free is mostly free. Lower priority than P1 and P2 because dark mode is a personal preference rather than a default expectation, and because feature 030 (Dark Mode Settings-Only Toggle) is independently tracked. Listed here to make the relationship explicit and avoid the two features fighting each other in implementation.

**Independent Test**: Switching between light and dark variants on a representative set of surfaces (calendar, settings, modal, chat panel, docs panel) shows visually correct, brand-consistent results in both modes. WCAG 2.1 AA contrast audit passes for both modes.

**Acceptance Scenarios**:

1. **Given** the redesign is shipped, **When** I switch the app to dark mode, **Then** every surface renders a true dark variant of the corporate-identity-tinted Fluent 2 system (background dark, text light, accents on-brand).
2. **Given** the dark variant is active, **When** I run a WCAG 2.1 AA contrast audit, **Then** every text/background pair passes the AA threshold.
3. **Given** the dark variant is active, **When** I look at brand-coloured elements (primary buttons, focus rings, brand accents), **Then** they remain recognisably on-brand in dark mode (the brand identity does not disappear into the dark background).

---

### Edge Cases

- **Vendor-rendered components** (FullCalendar grid, headers, time-entry blocks): not natively Fluent 2; the redesign must visually integrate them via the app's own CSS layer so they do not appear as inconsistent islands.
- **Browser-level forced colours** / OS high-contrast mode: the user agent's rules win; the redesign does not override.
- **Brand palette accessibility**: if the company's published brand primary fails WCAG AA on white or dark backgrounds, the redesign must adjust the operational colour (e.g., a darker variant of the brand colour for buttons) while still being recognisable. The brand is preserved in _spirit_, not in literal hex values.
- **Mobile** (`< 768px`): all Fluent 2 mobile guidance applies — touch sizes, density, navigation patterns. No surface may regress on mobile.
- **First paint**: theme tokens must be available before paint to avoid a flash of unstyled content. This is especially relevant for the dark variant when feature 030's preference is loaded.
- **No-internet rendering**: any custom typography fonts must either be self-hosted in the app or have safe fallbacks that don't disturb layout.

## Requirements _(mandatory)_

### Functional Requirements

**Fluent 2 visual language (US1)**

- **FR-001**: All UI surfaces — calendar (week + day views), Settings page, time-entry modal, confirmation dialogs, AI chat panel, docs panel, ArbZG warning banners, error/info banners, version display, copy-paste banner — MUST present a consistent visual language characterised by the Fluent 2 design system's published color, typography, spacing, elevation, and motion patterns.
- **FR-002**: Vendor-rendered components (the FullCalendar grid, time-entry blocks, day and week headers, all-day rows) MUST be visually integrated with the rest of the design system so they do not appear as inconsistent islands.
- **FR-003**: Touch targets on mobile viewports (`< 768px`) MUST meet a minimum interaction-target size of 44 × 44 px.
- **FR-004**: Motion (transitions, hovers, focus states, modal open/close) MUST follow consistent timing and easing patterns across the app.
- **FR-005**: All current user-visible behaviours — entry create/edit/delete/move/resize/copy-paste, working-hours toggle, workweek toggle, ArbZG warnings, AI chat with tool calling and voice input, Outlook calendar import, holiday/break-ticket booking, favourites and last-used — MUST remain functionally identical after the redesign. No UX regressions.

**Corporate identity (US2)**

- **FR-006**: A corporate-identity theme MUST be applied on top of the base Fluent 2 design such that primary action colours, brand accent colours, and (if applicable) logo, wordmark, and brand typography reflect values defined by the deploying admin in `config.json`. The CI block MUST support at minimum: `brandPrimary` (hex string), `brandAccent` (hex string), `brandLogoUrl` (URL string, optional), and `brandFontFamily` (CSS font-family stack, optional). When any value is not configured, the redesign MUST fall back to a sensible neutral default that is not visibly broken.
- **FR-007**: Applying the corporate-identity theme MUST NOT reduce the WCAG 2.1 AA contrast guarantee that the base Fluent 2 system provides; if a literal brand colour fails contrast on a given background, the redesign MUST use a contrast-safe operational variant of the brand colour while preserving brand recognisability.
- **FR-008**: The corporate-identity theme MUST be applied uniformly across all surfaces — no surface may fall back to the unbranded Fluent 2 default in production.

**Light and dark variants (US3)**

- **FR-009**: The redesign MUST provide visually correct rendering in both a light and a dark variant of the corporate-identity-tinted Fluent 2 system.
- **FR-010**: This redesign **coexists** with feature 030 (Dark Mode Settings-Only Toggle). 030 ships first and provides the user-facing light/dark toggle on the Settings page along with the persistence mechanism. This feature MUST inherit and reuse 030's toggle and persistence — it MUST NOT add a second toggle, a duplicate persistence key, or new theme-switching UI. The work delivered by this feature, in the dark-variant area, is to re-skin both the light and dark variants on the Fluent 2 + corporate-identity design system that 030 introduced via simple CSS.
- **FR-011**: Brand-coloured elements (primary buttons, focus rings, brand accents) MUST remain recognisably on-brand in both light and dark variants.

**Cross-cutting**

- **FR-012**: The chosen theme variant MUST be applied before the page becomes visible to the user, to prevent a flash of the wrong theme on load.
- **FR-013**: All localized user-visible strings MUST remain unchanged; this redesign is purely visual and structural, not editorial.
- **FR-014**: New or modified components MUST be covered by Vitest unit tests where they introduce business logic, and by Playwright UI tests where they introduce or change user-facing visual flows, per Constitution Principle III. Existing tests broken by selector changes MUST be updated, not deleted.

### Key Entities

- **Design System Tokens**: the published colour, typography, spacing, elevation, and motion values from Fluent 2. Source of truth for the visual language.
- **Corporate Identity Theme**: a layered set of brand-specific overrides (primary colour, accent, logo asset, optional brand typography) applied on top of the design-system tokens. Source-of-truth: a CI block in admin-managed `config.json` (`brandPrimary`, `brandAccent`, `brandLogoUrl`, `brandFontFamily`).
- **Theme Variant**: a chosen surface-level mode (light or dark) that selects a specific palette from the design-system tokens with the corporate identity applied.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A visual audit of every screen and panel confirms consistent application of design-system tokens. 0 surfaces classified as "off-system".
- **SC-002**: All existing automated tests (Vitest unit + Playwright UI) pass after the redesign — verified by the existing CI pipeline staying green.
- **SC-003**: WCAG 2.1 AA contrast audit passes for every text/background pair on every interactive surface in both light and dark variants, with corporate identity applied.
- **SC-004**: Mobile touch-target audit on a 375 × 667 viewport finds 0 interactive elements smaller than 44 × 44 px.
- **SC-005**: First-paint time after the redesign is no slower than before (no perceivable regression versus the baseline measured pre-redesign).
- **SC-006**: At least one stakeholder design review with the deploying organisation confirms the corporate identity is recognisable and on-brand.
- **SC-007**: 0 visible flash-of-unstyled-content or flash-of-wrong-theme events on the calendar or Settings pages, confirmed by Playwright on a slow-network throttle profile.
- **SC-008**: After the redesign ships, the previous custom CSS surface-by-surface variation is reduced to a single source-of-truth design-token layer; no surface defines its own bespoke colour scale or type scale.

## Assumptions

- All app-side UI source files (HTML, CSS, JS modules, locale strings) are in scope. Vendor minified bundles (FullCalendar locales etc.) are not modified directly; they are styled via the app's own CSS layer.
- This feature is purely visual and structural — no new business logic, no new per-user persistent settings beyond what feature 030 introduces (light/dark toggle + persistence). The only new admin-managed configuration is the CI block in `config.json` (`brandPrimary`, `brandAccent`, `brandLogoUrl`, `brandFontFamily`).
- **Dependency on 030**: feature 030 (Dark Mode Settings-Only Toggle) is a hard prerequisite for this feature's dark-variant work. 030 ships first and owns the toggle and persistence; this feature inherits and re-skins both variants on the Fluent 2 + CI system.
- All user-visible strings are unchanged; the existing `js/i18n.js` table and EN/DE locales are untouched.
- Existing automated tests are extended where rendering changes break selectors. Test concepts are not removed; they are migrated to the new markup.
- The corporate-identity theme is the only theme exposed to end users in production. The unbranded "vanilla" Fluent 2 theme is not surfaced (it exists only as an internal token layer).
- Localisation, accessibility (WCAG 2.1 AA), and performance characteristics (Constitution Principle II: ≤ 300 ms calendar render) are non-regressive after the redesign.
- **Process intent**: the implementer wishes to use this feature as an opportunity to try out new Claude UI capabilities (Claude-generated mockups, AI-assisted code synthesis, etc.). This is a process preference; the user-visible outcome does not depend on which Claude features are used during planning or implementation.
- Mobile is in scope; touch targets and density follow the design-system mobile guidance. No mobile deferral.
- Constitution Principle II ("Mobile responsiveness MAY be deferred provided the spec explicitly declares Mobile support out of scope for vN") is **not invoked** — mobile is in scope for v1 of this feature.
