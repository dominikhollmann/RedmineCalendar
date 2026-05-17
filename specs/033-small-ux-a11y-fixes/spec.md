# Feature Specification: Small UX & Accessibility Fixes

**Feature Branch**: `033-small-ux-a11y-fixes`
**Created**: 2026-05-17
**Status**: Draft
**Input**: User description: "I have a list of small changes I would like to include: clicking besides the time entry modal should NOT close the modal. it should just do nothing. Vacation and public holiday tickets need exemption from the Arbeitszeitgesetz rules - particularly any break-time rules. on the settings page, the server configuration is shown at the top. remove this. check the application for accessibility. does it meet modern standards?"

## User Scenarios & Testing _(mandatory)_

This feature bundles four independent improvements. Each user story can be implemented, tested, and shipped on its own — they share only the release vehicle, not the implementation.

### User Story 1 — Time-entry modal no longer closes on outside click (Priority: P1)

When a user opens the time-entry modal (to create or edit a booking) and accidentally clicks the dim/backdrop area outside the modal, the modal must stay open and the user's in-progress input must be preserved. The user closes the modal deliberately, via the close button, the Cancel button, or the Escape key.

**Why this priority**: Today an off-target click silently discards everything the user has typed — issue ID, comment, hours. This is a recurring source of frustration and lost work, and the fix is small and well-scoped.

**Independent Test**: Open the time-entry modal, type partial input into one field, click anywhere on the dim backdrop outside the modal — the modal stays open, the input is intact. Repeat with Escape and the X button — both still close the modal.

**Acceptance Scenarios**:

1. **Given** the time-entry modal is open with text entered into the issue/comment fields, **When** the user clicks on the page area outside the modal box (the backdrop), **Then** the modal stays open and all entered values remain.
2. **Given** the time-entry modal is open, **When** the user presses the Escape key, **Then** the modal closes (existing keyboard-dismiss behaviour is preserved).
3. **Given** the time-entry modal is open, **When** the user clicks the X (close) or Cancel button, **Then** the modal closes as before.
4. **Given** the time-entry modal is open on a touch device, **When** the user taps outside the modal box, **Then** the modal stays open.

---

### User Story 2 — Vacation and public-holiday entries are exempt from ArbZG break rules (Priority: P1)

Entries whose ticket is the admin-configured **holiday ticket** or **vacation ticket** must not trigger any Arbeitszeitgesetz (German Working Time Act) break-time warnings or anomaly tags. These bookings represent paid leave, not working time, so the legal rules about mandatory breaks after >6h and >9h of continuous work do not apply to them, and they do not contribute to the "continuous working time" tally that triggers a break-required warning on the same day.

**Why this priority**: Without the exemption, a full day of vacation booked as a single 8h block currently surfaces a false "break required" anomaly. This trains users to dismiss anomaly warnings, weakening the value of real ArbZG flags on real work days. This is a correctness bug in an existing compliance feature.

**Independent Test**: Configure a `holidayTicket` and `vacationTicket` in admin config. Book an 8h entry on the holiday ticket for a single day. Reload the calendar — no break-required warning appears on that entry or that day. Book a mixed day (4h on a regular ticket + 4h on the vacation ticket) — break-time evaluation considers only the 4h of regular work and does not raise a break warning.

**Acceptance Scenarios**:

1. **Given** a day contains only entries booked to the admin-configured holiday ticket, **When** the calendar applies ArbZG break-rule evaluation, **Then** no break-required anomaly is raised for those entries or that day.
2. **Given** a day contains only entries booked to the admin-configured vacation ticket, **When** the calendar applies ArbZG break-rule evaluation, **Then** no break-required anomaly is raised for those entries or that day.
3. **Given** a day mixes regular work entries with holiday/vacation entries, **When** ArbZG break-rule evaluation runs, **Then** only the regular work duration counts toward the "continuous working time" thresholds; holiday/vacation duration is ignored.
4. **Given** the admin has not configured a vacation or holiday ticket (the IDs are absent from `config.json`), **When** any day is evaluated, **Then** existing ArbZG behaviour is preserved (no entries are exempted, because there is no ticket ID to match).

---

### User Story 3 — Settings page no longer shows the server-configuration block (Priority: P2)

The top of the per-user Settings page currently shows an admin-information block listing the Redmine URL, AI provider, and AI model (the contents of `config.json` that the admin manages). This information is not actionable from this page — users cannot change it — and it adds noise above the actual user-controlled settings. Remove the block entirely so the page opens directly into the user-controlled options.

**Why this priority**: This is a small cleanup that reduces visual clutter on the most-visited admin page and does not affect functionality. Lower priority than the two correctness fixes above.

**Independent Test**: Open `settings.html`. The page's first content under the header must be the user-controlled toggles/inputs; the admin-info block (Redmine URL / AI provider / AI model) must not appear.

**Acceptance Scenarios**:

1. **Given** a user is on the Settings page, **When** the page renders, **Then** no element listing Redmine URL, AI provider, or AI model appears anywhere on the page.
2. **Given** the admin info block is removed, **When** the user views the page, **Then** the user-controlled settings (working-hours toggle, work-week toggle, dark-mode toggle, etc.) appear immediately under the page header without an intervening admin section.
3. **Given** a translation key referenced only the removed block (`admin.heading`, `admin.redmine_url`, `admin.ai_provider`, `admin.ai_model`), **When** the feature ships, **Then** the dead translation keys are removed from both `en.js` and `de.js`.

---

### User Story 4 — Application meets a modern accessibility baseline (Priority: P2)

Run a focused accessibility audit of the application against **WCAG 2.2 Level AA** and fix the issues the audit surfaces. The intent is not a fully certified accessibility programme but a documented, evidence-based pass that resolves the common defects (keyboard traps, missing labels, low contrast, no focus indicators, missing landmarks, missing `lang` declarations, modals without proper roles, decorative icons announced by screen readers, etc.) and closes anything the calendar's mobile, modal-heavy, and dynamic-content UI is most likely to break.

**Why this priority**: Accessibility is a broad, exploratory task whose exact fix list is not known until the audit runs. It is bundled with the other small fixes because the user explicitly asked, but it sits below the two correctness P1s so they ship even if the audit uncovers larger scope.

**Independent Test**: An audit report (committed under `specs/033-small-ux-a11y-fixes/a11y-audit.md` or equivalent) lists the WCAG 2.2 AA failures found across the three main surfaces (calendar, time-entry modal, settings page) plus a triage table marking each finding as **fixed in this feature**, **deferred (rationale)**, or **not applicable**. After the fixes, the same audit re-run produces no Level A or Level AA failures in any of the three surfaces.

**Acceptance Scenarios**:

1. **Given** an automated scan (axe-core or equivalent) is run against the calendar, the time-entry modal (open state), and the settings page, **When** the scan completes, **Then** zero WCAG 2.2 Level A or AA violations are reported on any of the three surfaces.
2. **Given** a keyboard-only user starts on `index.html`, **When** they Tab through the page, **Then** every interactive control receives a visible focus indicator, focus order matches visual order, and no keyboard trap is present.
3. **Given** the time-entry modal is open, **When** a screen-reader user explores it, **Then** the modal has an accessible name (`aria-labelledby` referencing the modal title), the role is `dialog` with `aria-modal="true"`, focus is moved into the modal on open and returned to the triggering element on close, and Tab focus is constrained within the modal while it is open.
4. **Given** any decorative icon, emoji, or SVG without semantic content, **When** assistive tech traverses the page, **Then** it is not announced (e.g., `aria-hidden="true"` or empty alt text).
5. **Given** the `<html>` element of every served page, **When** assistive tech opens it, **Then** a `lang` attribute is present and matches the active UI locale (`en` or `de`).
6. **Given** all text and meaningful icons in both light and dark themes, **When** contrast is measured, **Then** every foreground/background pair meets WCAG 2.2 AA (4.5:1 for normal text, 3:1 for large text and meaningful UI components).

---

### Edge Cases

- **Modal**: Outside-click is also used to close some other dropdowns/popovers in the app (e.g., the chatbot panel, favourites menu). Only the **time-entry modal** changes; other popover/overlay behaviours remain unchanged.
- **Modal**: A drag that _starts_ inside the modal and _ends_ outside it (e.g., text-selection drag that overshoots) must not be treated as an outside click and must not close the modal.
- **ArbZG**: A single entry that _spans_ a day boundary (uncommon in this app, since entries are per-day) is still evaluated per-day; the exemption rule applies day-by-day.
- **ArbZG**: If a user manually books regular work to the configured holiday/vacation ticket (misuse), the exemption still applies — the rule is "this ticket ID is exempt", not "this kind of activity is exempt". Trade-off accepted: misclassification is a data-entry issue, not a compliance issue.
- **Settings**: If a non-admin error condition needs to surface the configured Redmine URL (e.g., `config.json` is missing or malformed), the existing `#config-error` channel — not the removed admin-info block — is used.
- **Accessibility**: The Fluent 2 token redesign (feature 031) introduced corporate-identity overlay tokens; any contrast failures the audit finds in the default tokens must be fixed in the token layer, not by overriding individual components.
- **Accessibility**: Dynamic content (calendar redraws on view change, anomaly badges appearing after re-render) must announce changes appropriately via `aria-live` regions or focus management, without being so chatty that a screen reader becomes unusable.

## Requirements _(mandatory)_

### Functional Requirements

**Modal click-outside fix**

- **FR-001**: The time-entry modal MUST NOT close when the user clicks, taps, or otherwise activates the backdrop or any area outside the modal's content box.
- **FR-002**: The time-entry modal MUST continue to close when the user presses the Escape key, clicks the close (X) button in the modal header, or clicks the Cancel button — none of these closing paths is removed.
- **FR-003**: A pointer interaction that starts inside the modal content box and ends outside it (e.g., a text-selection drag) MUST NOT be interpreted as an outside click and MUST NOT close the modal.
- **FR-004**: The fix MUST apply only to the time-entry modal; existing close-on-outside-click behaviour of other overlays (chatbot panel, favourites dropdown, etc.) is preserved unless those overlays are independently in scope.

**ArbZG exemption for vacation/holiday tickets**

- **FR-005**: The ArbZG break-rule evaluator MUST treat any entry whose ticket ID equals the admin-configured `holidayTicket` (in `config.json`) as exempt: it does not contribute working minutes to the continuous-working-time tally for that day, and it cannot itself raise a break-required anomaly.
- **FR-006**: The ArbZG break-rule evaluator MUST apply the same exemption to any entry whose ticket ID equals the admin-configured `vacationTicket` (in `config.json`).
- **FR-007**: On a mixed day (some entries exempt, some not), the break-rule evaluation MUST be performed against only the non-exempt working time; the exempt entries' durations MUST NOT be included.
- **FR-008**: If the admin has not configured `holidayTicket` or `vacationTicket` (the field is absent, null, zero, or not a positive integer), the evaluator MUST behave exactly as it does today (no exemption applied — no functional regression).
- **FR-009**: The exemption MUST apply to all surfaces where ArbZG break warnings are surfaced today (e.g., per-entry anomaly tags, day-level summaries, the anomaly tally in the header). No surface should still display a break warning that the underlying rule now considers inapplicable.

**Settings page server-config block removal**

- **FR-010**: The Settings page MUST NOT render any block, section, or paragraph that displays the Redmine URL, AI provider, or AI model (the contents of the admin-info / server-configuration block currently at the top of the page).
- **FR-011**: The removal MUST be complete: HTML markup, the JavaScript code path that populates it (currently `renderAdminInfo` in `js/settings.js`), the associated CSS for `.admin-info`, and any orphaned i18n keys (`admin.heading`, `admin.redmine_url`, `admin.ai_provider`, `admin.ai_model`) are all removed in the same change.
- **FR-012**: Removing this block MUST NOT regress unrelated Settings page behaviour: the existing config-error channel (`#config-error`) and the first-time welcome banner continue to render as today.

**Accessibility audit and remediation**

- **FR-013**: An accessibility audit MUST be performed against WCAG 2.2 Level AA across the three main surfaces — the calendar page (`index.html`), the time-entry modal (open state), and the settings page (`settings.html`) — in both light and dark themes.
- **FR-014**: The audit MUST be captured as a written artefact in the feature directory (e.g., `a11y-audit.md`), listing every finding, the WCAG criterion it violates, the severity (A vs AA), and a triage decision: fixed in this feature, deferred (with rationale and follow-up), or not applicable.
- **FR-015**: After remediation, an automated accessibility scan (axe-core or equivalent industry-standard scanner) of each of the three surfaces MUST report zero WCAG 2.2 Level A or Level AA violations. The scan results MUST be reproducible (recorded scan commands or fixtures in the test suite).
- **FR-016**: The time-entry modal MUST, in its open state, expose a dialog role with an accessible name, trap Tab focus inside itself while open, move initial focus to a meaningful control inside the modal on open, and return focus to the element that opened it on close.
- **FR-017**: Every interactive control across the three surfaces MUST have a visible focus indicator with a contrast ratio of at least 3:1 against its adjacent background, in both themes.
- **FR-018**: Every served HTML document MUST declare a `lang` attribute on the `<html>` element matching the active UI locale (`en` or `de`); if the locale is detected dynamically, the attribute MUST be updated to match before the page is interactive.
- **FR-019**: Every decorative icon, emoji, or SVG that conveys no semantic information MUST be hidden from assistive technology (`aria-hidden="true"` or empty `alt`). Every icon that _does_ convey meaning MUST carry an accessible label.
- **FR-020**: Foreground/background colour contrast for all text and meaningful UI components in both light and dark themes MUST meet WCAG 2.2 AA (≥4.5:1 for normal text, ≥3:1 for large text and meaningful UI components). Failures MUST be fixed in the Fluent 2 token layer (per feature 031's intent), not via per-component overrides.

### Key Entities

This feature has no new persisted data or domain entities. It re-uses two existing admin-config fields:

- **`holidayTicket`** (number, in `config.json`): The Redmine ticket ID used by the application for public-holiday bookings. Read-only from the per-user app; managed by the admin server-side. Already exists.
- **`vacationTicket`** (number, in `config.json`): The Redmine ticket ID used by the application for personal-vacation bookings. Read-only from the per-user app; managed by the admin server-side. Already exists.

The accessibility audit produces one new committed artefact (`a11y-audit.md`) under the feature directory, but this is documentation, not runtime data.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: After the modal fix ships, the rate at which users report or otherwise signal "I lost my time-entry input" (support messages, in-app feedback, or chat-bot complaints — whichever channel the team monitors) drops to zero attributable to the outside-click cause over a 30-day window.
- **SC-002**: After the ArbZG exemption ships, on any test day containing only vacation or holiday entries, the count of break-required anomalies surfaced anywhere in the UI is zero.
- **SC-003**: After the ArbZG exemption ships, on any test day containing only regular work entries, the count of break-required anomalies is identical to the count produced by the current (pre-feature) implementation — i.e., no false negatives are introduced.
- **SC-004**: After the settings cleanup, the Settings page renders no element whose text content matches the Redmine URL, AI provider, or AI model values from `config.json`.
- **SC-005**: After accessibility remediation, an automated axe-core (or equivalent) scan of `index.html` (calendar view), the time-entry modal (open), and `settings.html` reports zero WCAG 2.2 Level A or Level AA violations, in both light and dark themes — for a total of 6 zero-violation scans.
- **SC-006**: After accessibility remediation, a keyboard-only walkthrough of the three surfaces (calendar → open time-entry modal → save → navigate to settings → toggle dark mode → return to calendar) completes without the user ever needing a pointing device, with every active control showing a visible focus indicator.
- **SC-007**: The combined change does not regress any Software Quality Index metric tracked by `npm run sqi`: the SQI score after the feature is greater than or equal to the score on `main` immediately before the feature branch was cut.
- **SC-008**: The combined change does not regress test coverage: `npm run test:coverage` reports per-file line coverage equal to or above the project's existing thresholds on all touched files.

## Assumptions

- The admin-configured `holidayTicket` and `vacationTicket` fields in `config.json` are the canonical identifiers of vacation and public-holiday bookings for ArbZG purposes. If, in the future, multiple ticket IDs per category need to be exempted (e.g., separate tickets per country/state), that is a separate feature.
- Escape-key dismissal of the time-entry modal is desirable and is preserved — the user's request was specifically about _outside clicks_, not about removing all dismissal paths. Keeping Escape ensures keyboard accessibility (which also serves story 4).
- "Modern accessibility standards" is interpreted as WCAG 2.2 Level AA (the current published standard as of 2026-05). Level AAA is out of scope; Level A is implicitly covered because AA includes A.
- The accessibility audit targets the three main surfaces (calendar, modal, settings). Lower-traffic surfaces (e.g., the in-app docs panel, the chatbot voice-input UI) are noted in the audit report but their remediation may be deferred to a follow-up feature if the audit shows they would substantially expand scope.
- No new dependencies are introduced. The accessibility scan uses tooling already available in the test pipeline or installed once for development verification; the audit artefact itself is plain Markdown.
- The settings admin-info block is purely informational today (admin already manages `config.json` server-side, per CLAUDE.md "Deployment Model"). Removing it does not break any admin workflow.
- Other features that _also_ render admin-config information (e.g., a chatbot tool that returns Redmine URL diagnostics) are out of scope; this feature only removes the Settings-page block.
- The Fluent 2 token layer (feature 031) is the right place to fix any contrast failures the audit surfaces; per-component CSS overrides are explicitly discouraged.
