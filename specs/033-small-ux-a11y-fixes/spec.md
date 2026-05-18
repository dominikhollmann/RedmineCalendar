# Feature Specification: Small UX & Accessibility Fixes

**Feature Branch**: `033-small-ux-a11y-fixes`
**Created**: 2026-05-17
**Status**: Draft
**Input**: User description: "I have a list of small changes I would like to include: clicking besides the time entry modal should NOT close the modal. it should just do nothing. Vacation and public holiday tickets need exemption from the Arbeitszeitgesetz rules - particularly any break-time rules. on the settings page, the server configuration is shown at the top. remove this. check the application for accessibility. does it meet modern standards?"

## Clarifications

### Session 2026-05-17

The user invoked `/speckit-clarify` with a standing instruction not to pause for interactive questions. The three open ambiguities below were resolved with reasonable-default decisions, each justified inline. Any decision can be overridden by editing this section before `/speckit-plan` runs.

- Q: ArbZG exemption scope — does the exemption apply only to break rules, or to every ArbZG warning category? → A: **All categories.** The user wrote "exemption from the Arbeitszeitgesetz rules — particularly any break-time rules", which scopes the request to the full ruleset with break rules called out as the most-prominent case. Semantically, an entry booked to the configured `holidayTicket` or `vacationTicket` represents paid leave, not working time, so none of the six warning categories exposed by `js/arbzg.js` — `daily`, `weekly`, `restPeriod`, `sunday`, `holiday`, `breaks` — meaningfully apply: a 24h vacation block on a Sunday is not "Sunday work"; a vacation week is not a "weekly-hours overrun"; etc. Exemption is implemented at the input filter (drop matching entries before any category runs), so all six categories inherit the exemption uniformly.
- Q: Accessibility audit/remediation scope — three main surfaces only, or the full app? → A: **Full app — audit AND remediate every user-facing surface to WCAG 2.2 Level AA in this feature.** The in-scope surface set is: calendar page (desktop view + mobile day-view), time-entry modal (open state), settings page, chatbot panel (open state), in-app docs panel (open state), and the voice-input UI — all in both light and dark themes. Rationale (user direction, 2026-05-17): "small changes" bundling is overridden for this story; the user wants one complete a11y pass instead of two partial ones. Trade-off accepted: this story alone is likely to dominate the feature's total effort, especially for the chatbot and docs panels which were not built with a11y in mind. If, during planning, the work for any specific surface proves disproportionately large, that surface (and only that surface) may be re-scoped to a follow-up — but the default is full remediation, and the audit report MUST justify any exception explicitly.
- Q: Accessibility regression strategy — one-shot audit only, or a permanent CI gate? → A: **Permanent CI gate covering every remediated surface (i.e., every surface).** The existing Playwright UI test pipeline gains axe-core scan steps for the calendar (desktop + mobile day-view), the time-entry modal (open), settings, the chatbot panel (open), the in-app docs panel (open), and the voice-input UI — in both light and dark themes. A future regression that re-introduces a WCAG 2.2 Level A or AA failure on any of these surfaces fails CI on the PR. Rationale: now that every surface is remediated (C2), the CI gate naturally expands to enforce the same scope; running axe per surface in the existing UI pipeline still costs only ~1–2 seconds per scan, so total added CI time is bounded (~15–25 s).

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

### User Story 2 — Vacation and public-holiday entries are exempt from ArbZG rules (Priority: P1)

Entries whose ticket is the admin-configured **holiday ticket** or **vacation ticket** must not trigger any Arbeitszeitgesetz (German Working Time Act) warnings or anomaly tags. These bookings represent paid leave, not working time, so none of the six ArbZG warning categories the application currently surfaces — daily limit, weekly limit, rest period (11h between days), Sunday work, public-holiday work, and break-time rules — meaningfully apply to them. Break-time rules are the most prominent case, but exempting only breaks would still leave false warnings on the other five categories (e.g., a vacation week showing a "weekly-hours overrun", a Sunday vacation day showing a "Sunday work" flag).

**Why this priority**: Without the exemption, a full day of vacation booked as a single 8h block currently surfaces a false "break required" anomaly; a vacation week currently surfaces a false "weekly hours overrun"; a vacation day on a Sunday surfaces a false "Sunday work" warning. Together these train users to dismiss ArbZG warnings, weakening the value of real ArbZG flags on real work days. This is a correctness bug in an existing compliance feature.

**Independent Test**: Configure a `holidayTicket` and `vacationTicket` in admin config. Book an 8h entry on the holiday ticket for a single day, including a Sunday. Reload the calendar — no ArbZG warning of any category appears on that entry, that day, or that week. Book a mixed day (4h on a regular ticket + 4h on the vacation ticket) — every ArbZG category evaluates only the 4h of regular work; the vacation entry is invisible to the rule engine.

**Acceptance Scenarios**:

1. **Given** a day contains only entries booked to the admin-configured holiday ticket, **When** ArbZG warnings are computed, **Then** no warning of any category (daily, weekly, restPeriod, sunday, holiday, breaks) is raised for that day attributable to those entries.
2. **Given** a day contains only entries booked to the admin-configured vacation ticket, **When** ArbZG warnings are computed, **Then** no warning of any category is raised for that day attributable to those entries.
3. **Given** a day mixes regular work entries with holiday/vacation entries, **When** ArbZG warnings are computed, **Then** only the regular work duration is fed into every rule (daily limit, weekly limit, rest period, Sunday, holiday, breaks); holiday/vacation duration is ignored at the input filter.
4. **Given** the admin has not configured a vacation or holiday ticket (the IDs are absent, null, zero, or not a positive integer in `config.json`), **When** any day is evaluated, **Then** existing ArbZG behaviour is preserved exactly (no entries are exempted, because there is no ticket ID to match).
5. **Given** a vacation entry on a Sunday, **When** ArbZG warnings are computed, **Then** the "Sunday work" category does not flag that day (the vacation entry is filtered out before the Sunday-work check runs).

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

Run a comprehensive accessibility audit of the **entire application** against **WCAG 2.2 Level AA** and fix the issues across every user-facing surface: the calendar page (desktop view and mobile day-view), the time-entry modal, the settings page, the chatbot panel, the in-app docs panel, and the voice-input UI — in both light and dark themes. The intent is not a fully certified accessibility programme but a documented, evidence-based pass that resolves the common defects (keyboard traps, missing labels, low contrast, no focus indicators, missing landmarks, missing `lang` declarations, modals without proper roles, decorative icons announced by screen readers, dynamic content not announced, etc.) across **all** of them.

**Why this priority**: Accessibility is a broad, exploratory task whose exact fix list is not known until the audit runs. It is bundled with the other small fixes because the user explicitly asked, and the user has chosen (Clarification C2) a single-pass full-app remediation over an audit-only or surface-narrowed approach. It sits below the two correctness P1s so they ship even if the audit uncovers larger scope; if any single surface's remediation proves disproportionately large during planning, that surface MAY be re-scoped to a follow-up but the audit report MUST document the exception.

**Independent Test**: An audit report (committed under `specs/033-small-ux-a11y-fixes/a11y-audit.md`) lists the WCAG 2.2 AA failures found across **every** user-facing surface (calendar desktop, calendar mobile day-view, time-entry modal, settings, chatbot panel, docs panel, voice-input UI) plus a triage table marking each finding as **fixed in this feature**, **deferred (with explicit owner + rationale)**, or **not applicable**. After remediation, an automated axe-core scan re-run produces zero Level A or Level AA failures on every surface in both themes.

**Acceptance Scenarios**:

1. **Given** an automated scan (axe-core or equivalent) is run against every user-facing surface — calendar desktop, calendar mobile day-view, time-entry modal (open), settings, chatbot panel (open), docs panel (open), voice-input UI — in both light and dark themes, **When** the scan completes, **Then** zero WCAG 2.2 Level A or AA violations are reported on any surface in either theme.
2. **Given** a keyboard-only user starts on `index.html`, **When** they Tab through the page, **Then** every interactive control receives a visible focus indicator, focus order matches visual order, and no keyboard trap is present.
3. **Given** the time-entry modal is open, **When** a screen-reader user explores it, **Then** the modal has an accessible name (`aria-labelledby` referencing the modal title), the role is `dialog` with `aria-modal="true"`, focus is moved into the modal on open and returned to the triggering element on close, and Tab focus is constrained within the modal while it is open.
4. **Given** the chatbot panel and the in-app docs panel are opened in turn, **When** a screen-reader user explores each, **Then** each has an accessible name, exposes an appropriate landmark or dialog role, moves focus to a meaningful control inside the panel on open, and restores focus to the triggering element on close.
5. **Given** the voice-input UI is activated, **When** a screen-reader user explores it, **Then** the current recording state (idle / listening / processing) and any transcript updates are announced via an `aria-live` region without overwhelming chatter, and the start/stop control has a clear accessible label that changes to reflect state.
6. **Given** the calendar is rendered in the mobile day-view layout, **When** a keyboard or touch user interacts with it, **Then** every control is reachable, focus indicators are visible, target sizes meet WCAG 2.2 AA (≥24×24 CSS px effective for pointer inputs per SC 2.5.8), and the same axe scan that passes on desktop also passes on the mobile day-view.
7. **Given** any decorative icon, emoji, or SVG without semantic content on any surface, **When** assistive tech traverses the page, **Then** it is not announced (e.g., `aria-hidden="true"` or empty alt text).
8. **Given** the `<html>` element of every served page, **When** assistive tech opens it, **Then** a `lang` attribute is present and matches the active UI locale (`en` or `de`).
9. **Given** all text and meaningful icons on any surface in both light and dark themes, **When** contrast is measured, **Then** every foreground/background pair meets WCAG 2.2 AA (4.5:1 for normal text, 3:1 for large text and meaningful UI components).

---

### Edge Cases

- **Modal**: Outside-click is also used to close some other dropdowns/popovers in the app (e.g., the chatbot panel, favourites menu). Only the **time-entry modal** changes; other popover/overlay behaviours remain unchanged.
- **Modal**: A drag that _starts_ inside the modal and _ends_ outside it (e.g., text-selection drag that overshoots) must not be treated as an outside click and must not close the modal.
- **ArbZG**: A single entry that _spans_ a day boundary (uncommon in this app, since entries are per-day) is still evaluated per-day; the exemption rule applies day-by-day.
- **ArbZG**: If a user manually books regular work to the configured holiday/vacation ticket (misuse), the exemption still applies — the rule is "this ticket ID is exempt", not "this kind of activity is exempt". Trade-off accepted: misclassification is a data-entry issue, not a compliance issue.
- **Settings**: If a non-admin error condition needs to surface the configured Redmine URL (e.g., `config.json` is missing or malformed), the existing `#config-error` channel — not the removed admin-info block — is used.
- **Accessibility**: The Fluent 2 token redesign (feature 031) introduced corporate-identity overlay tokens; any contrast failures the audit finds in the default tokens must be fixed in the token layer, not by overriding individual components.
- **Accessibility**: Dynamic content (calendar redraws on view change, anomaly badges appearing after re-render, chatbot streaming tokens, voice-input transcript updates) must announce changes appropriately via `aria-live` regions or focus management, without being so chatty that a screen reader becomes unusable. Streaming chatbot output in particular needs deliberate aria-live politeness tuning.
- **Accessibility**: The chatbot panel and the docs panel both have their own outside-click and Escape-key handling (independent of Story 1's time-entry-modal fix); story 4 may revise their dismissal/focus-trap behaviour to meet dialog accessibility patterns. This is a conscious overlap with story 1's surface — story 1 changes the time-entry modal's dismissal logic, story 4 may change the chatbot/docs panels' dismissal logic for accessibility reasons.

## Requirements _(mandatory)_

### Functional Requirements

**Modal click-outside fix**

- **FR-001**: The time-entry modal MUST NOT close when the user clicks, taps, or otherwise activates the backdrop or any area outside the modal's content box.
- **FR-002**: The time-entry modal MUST continue to close when the user presses the Escape key, clicks the close (X) button in the modal header, or clicks the Cancel button — none of these closing paths is removed.
- **FR-003**: A pointer interaction that starts inside the modal content box and ends outside it (e.g., a text-selection drag) MUST NOT be interpreted as an outside click and MUST NOT close the modal.
- **FR-004**: The fix MUST apply only to the time-entry modal; existing close-on-outside-click behaviour of other overlays (chatbot panel, favourites dropdown, etc.) is preserved unless those overlays are independently in scope.

**ArbZG exemption for vacation/holiday tickets**

- **FR-005**: The ArbZG warning engine (`computeArbzgWarnings` and its underlying per-category checks) MUST filter out, before any rule evaluation, every entry whose ticket ID equals the admin-configured `holidayTicket` (in `config.json`). Exempt entries MUST be invisible to all six warning categories: `daily`, `weekly`, `restPeriod`, `sunday`, `holiday`, `breaks`.
- **FR-006**: The ArbZG warning engine MUST apply the same input-filter exemption to any entry whose ticket ID equals the admin-configured `vacationTicket` (in `config.json`).
- **FR-007**: On a mixed day (some entries exempt, some not), every ArbZG category MUST be evaluated against only the non-exempt working time; the exempt entries' durations MUST NOT contribute to daily totals, weekly totals, rest-period boundaries, Sunday-work detection, holiday-work detection, or break-time calculation.
- **FR-008**: If the admin has not configured `holidayTicket` or `vacationTicket` (the field is absent, null, zero, or not a positive integer), the evaluator MUST behave exactly as it does today (no exemption applied — no functional regression).
- **FR-009**: The exemption MUST apply to every surface where ArbZG warnings are surfaced today (per-entry anomaly tags, day-level warnings, the weekly ArbZG badge, the ArbZG tooltip, and any other UI affordance that reads from `window._calendarArbzgWarnings`). No surface should still display a warning of any category that the underlying engine no longer raises.

**Settings page server-config block removal**

- **FR-010**: The Settings page MUST NOT render any block, section, or paragraph that displays the Redmine URL, AI provider, or AI model (the contents of the admin-info / server-configuration block currently at the top of the page).
- **FR-011**: The removal MUST be complete: HTML markup, the JavaScript code path that populates it (currently `renderAdminInfo` in `js/settings.js`), the associated CSS for `.admin-info`, and any orphaned i18n keys (`admin.heading`, `admin.redmine_url`, `admin.ai_provider`, `admin.ai_model`) are all removed in the same change.
- **FR-012**: Removing this block MUST NOT regress unrelated Settings page behaviour: the existing config-error channel (`#config-error`) and the first-time welcome banner continue to render as today.

**Accessibility audit and remediation**

- **FR-013**: An accessibility audit MUST be performed against WCAG 2.2 Level AA covering every user-facing surface of the application: the calendar page (`index.html`) in both desktop and mobile day-view layouts, the time-entry modal (open state), the settings page (`settings.html`), the chatbot panel (open state), the in-app docs panel (open state), and the voice-input UI — in both light and dark themes.
- **FR-014**: The audit MUST be captured as a written artefact in the feature directory (`a11y-audit.md`), listing every finding, the WCAG criterion it violates, the severity (A vs AA), and a triage decision per finding: **fixed in this feature** (default for every finding) or **deferred** (only by explicit exception with a documented owner, rationale, and follow-up issue link). The "not applicable" category is also permitted for false positives. Per Clarification C2, remediation is full-app by default; deferral is the exception that must be justified, not the rule.
- **FR-015**: After remediation, an automated accessibility scan (axe-core via the Playwright UI pipeline) of **every** user-facing surface — calendar desktop, calendar mobile day-view, time-entry modal (open), settings, chatbot panel (open), in-app docs panel (open), and voice-input UI — MUST report zero WCAG 2.2 Level A or Level AA violations in both light and dark themes. The scan MUST run as a Playwright UI test case so it is reproducible and re-runnable locally with `npm run test:ui`.
- **FR-015a**: The axe-core scan MUST be wired into the project's existing CI pipeline as a permanent regression gate covering every surface enumerated in FR-015: a future change that re-introduces a Level A or AA violation on any of those surfaces fails CI on the PR. There are no "reporting-only" surfaces — the gate's scope is the full app.
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
- **SC-002**: After the ArbZG exemption ships, on any test day or week containing only vacation or holiday entries, the count of ArbZG warnings of **any** category (daily, weekly, restPeriod, sunday, holiday, breaks) surfaced anywhere in the UI is zero.
- **SC-003**: After the ArbZG exemption ships, on any test day or week containing only regular work entries (no vacation/holiday entries), the warnings produced by every ArbZG category are byte-identical to those produced by the current (pre-feature) implementation — i.e., no false negatives or false positives are introduced for non-exempt entries.
- **SC-004**: After the settings cleanup, the Settings page renders no element whose text content matches the Redmine URL, AI provider, or AI model values from `config.json`.
- **SC-005**: After accessibility remediation, an automated axe-core scan of every user-facing surface in both themes — calendar desktop × {light, dark}, calendar mobile day-view × {light, dark}, time-entry modal (open) × {light, dark}, settings × {light, dark}, chatbot panel (open) × {light, dark}, docs panel (open) × {light, dark}, voice-input UI × {light, dark} — reports zero WCAG 2.2 Level A or Level AA violations: **14 zero-violation scans total**. The same scan runs in CI on every PR and on `main` post-merge.
- **SC-006**: After accessibility remediation, a keyboard-only walkthrough of every user-facing surface (calendar desktop → open time-entry modal → save → navigate to settings → toggle dark mode → return to calendar → open chatbot panel → exchange a message → open docs panel → activate voice input → switch to mobile day-view) completes without the user ever needing a pointing device, with every active control showing a visible focus indicator with at least 3:1 contrast against its adjacent background in both themes.
- **SC-006a**: The audit artefact (`a11y-audit.md`) covers every user-facing surface of the application (calendar desktop, calendar mobile day-view, time-entry modal, settings, chatbot panel, docs panel, voice-input UI), records every finding with its WCAG criterion and severity, and triages each finding as fixed / deferred (with owner and follow-up issue) / not-applicable. **Deferred findings on any surface are zero by default**; any non-zero deferred count requires explicit per-finding justification per FR-014.
- **SC-007**: The combined change does not regress any Software Quality Index metric tracked by `npm run sqi`: the SQI score after the feature is greater than or equal to the score on `main` immediately before the feature branch was cut.
- **SC-008**: The combined change does not regress test coverage: `npm run test:coverage` reports per-file line coverage equal to or above the project's existing thresholds on all touched files.

## Assumptions

- The admin-configured `holidayTicket` and `vacationTicket` fields in `config.json` are the canonical identifiers of vacation and public-holiday bookings for ArbZG purposes. If, in the future, multiple ticket IDs per category need to be exempted (e.g., separate tickets per country/state), that is a separate feature.
- Escape-key dismissal of the time-entry modal is desirable and is preserved — the user's request was specifically about _outside clicks_, not about removing all dismissal paths. Keeping Escape ensures keyboard accessibility (which also serves story 4).
- "Modern accessibility standards" is interpreted as WCAG 2.2 Level AA (the current published standard as of 2026-05). Level AAA is out of scope; Level A is implicitly covered because AA includes A.
- The accessibility audit AND remediation both cover the full application (every user-facing surface: calendar desktop, calendar mobile day-view, time-entry modal, settings, chatbot panel, in-app docs panel, voice-input UI), per Clarification C2 (user direction, 2026-05-17). Deferring any specific surface to a follow-up feature is allowed only as a documented exception, not as a default planning move.
- This story is now expected to be the dominant cost in the feature. Plan estimates should treat it as significantly larger than the other three stories combined; the chatbot, docs, and voice surfaces were not built with a11y in mind and are likely to surface the bulk of findings.
- The axe-core accessibility scan is added to the Playwright UI test pipeline (one new test file or set of test cases that loops over every surface × both themes), runs on every PR + post-merge `main` push as a permanent CI regression gate over the full surface set, and is locally re-runnable via `npm run test:ui`. A new dev dependency (`@axe-core/playwright` or the project's preferred equivalent) is introduced — this is a build-time-only dependency, not a runtime dependency for the SPA.
- The audit artefact itself is plain Markdown committed to the feature directory.
- The settings admin-info block is purely informational today (admin already manages `config.json` server-side, per CLAUDE.md "Deployment Model"). Removing it does not break any admin workflow.
- Other features that _also_ render admin-config information (e.g., a chatbot tool that returns Redmine URL diagnostics) are out of scope; this feature only removes the Settings-page block.
- The Fluent 2 token layer (feature 031) is the right place to fix any contrast failures the audit surfaces; per-component CSS overrides are explicitly discouraged.
