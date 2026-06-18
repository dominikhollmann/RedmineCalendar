# Feature Specification: DSGVO / GDPR Privacy Compliance for Planning Features

**Feature Branch**: `044-dsgvo-privacy-compliance`

**Created**: 2026-06-18

**Status**: Draft

**Input**: User description: "issue 207 — Data Privacy / DSGVO Compliance for Planning Features"

## Clarifications

### Session 2026-06-18

- Q: Should the privacy notice be a dedicated static HTML page or an inline panel/modal? → A: Dedicated static page (`privacy.html`), following the same pattern as the existing `licenses.html`.
- Q: What is the retention period for locally cached planning data? → A: 30-day default, admin-overridable via `config.json` field `planningDataRetentionDays` (integer, days). The privacy notice must state the active value.
- Q: How does the Art. 15 "view my planning data" requirement (FR-012) work? → A: In-app display only — a collapsible "My stored planning data" section on the Settings page showing current planning storage keys and their values in a human-readable format. No file download required.
- Q: Should the app record a timestamped consent audit log for GDPR Art. 5(2) accountability? → A: Yes — store a consent record in localStorage (`{ consentedAt: ISO8601, withdrawnAt: ISO8601 | null }`) included in the FR-012 data view.
- Q: If the startup retention cleanup (FR-011) fails, should the app block or proceed? → A: Fail-open with warning — log the error, show a non-blocking toast notification, continue loading normally.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Privacy Notice Access (Priority: P1)

An employee opens the app and wants to understand what personal data is collected by the planning features (PC activity detection, Teams communication patterns, work schedule inference). They navigate to Settings and find a clearly labelled "Privacy" link in the footer, next to the existing "Licenses" link. The privacy notice opens and explains — in plain language, in their preferred language (German or English) — exactly what data is collected, for what purpose, on what legal basis, for how long it is retained, who receives it (including AI API providers), and what rights the employee has (access, deletion, portability).

**Why this priority**: Without a visible, comprehensible privacy notice the app cannot be lawfully deployed in an EU/German context. This is the foundational compliance deliverable on which the other stories depend.

**Independent Test**: Can be fully tested by opening Settings, clicking the Privacy footer link, and verifying the notice covers all required GDPR Art. 13 fields in both DE and EN — delivers legal discoverability without any other story being complete.

**Acceptance Scenarios**:

1. **Given** the app is loaded, **When** the user opens Settings and clicks the "Privacy" (Datenschutz) footer link, **Then** `privacy.html` opens in the user's current language (DE/EN) without requiring authentication.
2. **Given** the privacy notice is open, **When** the user reads it, **Then** it covers: data categories collected, processing purposes, legal basis per category (Art. 6 GDPR), retention periods, data recipients (including any AI API providers), and user rights (Art. 15–17 GDPR).
3. **Given** the app is set to German locale, **When** the notice is opened, **Then** it renders entirely in German; likewise for English locale.
4. **Given** a planning feature is disabled by the admin in `config.json`, **When** the notice is displayed, **Then** the corresponding data-processing section is either hidden or clearly marked as inactive.

---

### User Story 2 — Delete Planning Data (Priority: P2)

An employee decides they no longer want the app to retain any locally stored planning-related data (e.g. cached PC-activity snapshots, Teams communication summaries, planning preferences). They go to Settings, find a "Delete planning data" action, confirm the prompt, and all planning-specific data is removed from their browser. Their regular time-entry credentials and calendar preferences are not affected.

**Why this priority**: Art. 17 GDPR grants the right to erasure. Providing a user-initiated deletion control is required once planning data is persisted locally and is a hard acceptance criterion from the issue.

**Independent Test**: Can be fully tested by populating planning data (or simulating it in settings), clicking "Delete planning data", confirming, and verifying via browser DevTools that all planning-related storage keys are removed while credential/preference keys remain.

**Acceptance Scenarios**:

1. **Given** planning data exists in the browser (localStorage/IndexedDB keys for planning snapshots), **When** the user clicks "Delete planning data" in Settings and confirms, **Then** all planning-specific storage keys are removed and a success confirmation is shown.
2. **Given** the deletion completes, **When** the user inspects browser storage, **Then** no planning-related data keys remain, but credential keys and non-planning preferences are intact.
3. **Given** no planning data exists yet, **When** the "Delete planning data" button is clicked, **Then** it completes gracefully with a confirmation and does not error or remove unrelated data.

---

### User Story 3 — AI API Data-Sharing Disclosure & Acknowledgement (Priority: P2)

Before the app sends any personal planning data (work schedule, attendance patterns, Teams contacts) to an external AI API (Claude or OpenAI), the user sees a clear disclosure explaining what is being sent, to whom, and why. The user must actively acknowledge this disclosure before the first planning-AI interaction. The acknowledgement is stored so the user is not repeatedly prompted on every request, but can be withdrawn from Settings.

**Why this priority**: Sending personal data to third-party AI providers is a significant GDPR processing activity that requires explicit consent. Without a disclosure/acknowledgement flow, the app cannot lawfully use Claude/OpenAI for planning data. Explicit per-user in-app consent is required before the first planning-AI action (not merely disclosure); the company's DPA with the AI provider covers the processor relationship but does not substitute for the data-subject consent obligation under Art. 6(1)(a) GDPR.

**Independent Test**: Can be fully tested by triggering an AI-planning action for the first time and verifying the disclosure modal appears, that dismissal without acknowledgement blocks the action, and that once acknowledged the preference persists across page reloads.

**Acceptance Scenarios**:

1. **Given** a user has never acknowledged AI data sharing, **When** they trigger a planning feature that sends data to an external AI API, **Then** a disclosure panel appears before the request is sent, summarising what data is shared and with whom.
2. **Given** the disclosure is shown, **When** the user declines, **Then** the AI planning action is cancelled and no data is transmitted.
3. **Given** the user acknowledges the disclosure, **When** subsequent planning-AI actions are triggered, **Then** no repeated disclosure appears.
4. **Given** the user has acknowledged previously, **When** they visit Settings and withdraw consent, **Then** the stored acknowledgement is cleared and the disclosure reappears on the next planning-AI action.

---

### User Story 4 — Cookie / Storage Banner Decision (Priority: P3)

The legal/compliance decision on whether a cookie-or-storage consent banner is required under TTDSG § 25 is documented and — if required — a banner is implemented that lets users accept or reject non-essential storage before it is written. Strictly necessary storage (encrypted credentials, UI preferences) is not gated by the banner.

**Why this priority**: This is a legal decision that must be made and documented, but for strictly necessary storage (which covers most current app usage) it is likely no banner is required, limiting engineering effort. It is lower priority than the privacy notice and deletion control.

**Independent Test**: Can be fully tested by reviewing the documented decision (a note in the privacy notice or a design decision record) and — if a banner is implemented — verifying that non-essential storage is withheld until the user accepts, while login/credential storage works without acceptance.

**Acceptance Scenarios**:

1. **Given** the legal analysis is complete, **When** the conclusion is "no banner required" (strictly necessary storage only), **Then** the decision is documented in the privacy notice with a rationale referencing TTDSG § 25 and the relevant exemption.
2. **Given** the legal analysis concludes a banner IS required, **When** a first-time user opens the app, **Then** a banner appears before any non-essential storage is written, offering accept/reject.
3. **Given** a banner is implemented and the user rejects, **When** they use the app, **Then** only strictly necessary storage (credentials, core preferences) is written; planning snapshots and non-essential data are not persisted.

---

### Edge Cases

- What happens when a user clears browser storage externally (e.g. via browser settings)? The acknowledgement of AI data sharing must reset gracefully and prompt again on the next planning-AI action.
- What if the admin has not enabled any planning features? The privacy notice should still be accessible but may show a reduced scope (only time-entry data, no planning-specific sections).
- What if the user switches browser locale mid-session? The privacy notice must reflect the current locale without requiring a page reload.
- What if deletion of planning data fails (e.g. IndexedDB permission error)? The user must see an error message and the partial deletion must not leave data in an inconsistent state.
- What if the startup retention cleanup (FR-011) fails? The app fails-open: a non-blocking toast is shown informing the user that stale planning data may remain; the app continues loading normally and the user can trigger manual deletion via the Settings "Delete planning data" action.
- What if a new planning feature is added in a future release? The privacy notice update process (and the data inventory) must be maintainable without a full engineering cycle.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST display a "Privacy" (Datenschutz) link in the Settings footer, adjacent to the existing "Licenses" link, that opens `privacy.html` — a dedicated static HTML page following the same pattern as the existing `licenses.html`.
- **FR-002**: The privacy notice MUST be available in both German and English, toggling automatically with the app's current locale setting.
- **FR-003**: The privacy notice MUST document every personal data point collected by planning features (PC activity, Teams communication metadata, work-schedule inferences, calendar events used for planning) with: data category, processing purpose, legal basis (citing the applicable GDPR article), retention period, and recipients (including named AI providers).
- **FR-004**: The privacy notice MUST include a section on user rights under Art. 15–17 GDPR (access, rectification, erasure, portability) and contact information for the data controller. The controller name, DPO contact, and legal-entity details MUST be admin-configurable via `config.json` fields (`privacyControllerName`, `privacyControllerEmail`, `privacyDpoEmail`) — the app ships with clearly labelled placeholder text that the admin must fill in before production deployment.
- **FR-005**: The app MUST provide a "Delete planning data" action in the Settings page that removes all planning-specific data from browser storage (localStorage keys and IndexedDB object stores used by planning features) without affecting credentials or non-planning preferences.
- **FR-006**: The deletion action (FR-005) MUST display a confirmation prompt before executing and MUST show a success or error notification on completion.
- **FR-007**: Before transmitting personal planning data to any external AI API for the first time, the app MUST display a disclosure that names the AI provider(s), describes what data categories are sent, and states the processing purpose.
- **FR-008**: The app MUST NOT transmit planning data to an external AI API until the user has explicitly consented via the disclosure modal (FR-007). Consent is a hard gate — the AI planning action is cancelled if the user declines. No admin-level bypass exists; the company's DPA with the AI provider covers the processor relationship but does not substitute for individual user consent under Art. 6(1)(a) GDPR.
- **FR-009**: The user's AI-data-sharing consent MUST be persisted as a structured record in localStorage containing `consentedAt` (ISO 8601 timestamp) and `withdrawnAt` (ISO 8601 timestamp or `null`). This satisfies both the no-repeat-prompt requirement and the GDPR Art. 5(2) accountability obligation. The record MUST be visible in the FR-012 "My stored planning data" view and MUST be cleared by the FR-005 "Delete planning data" action. Consent MUST be withdrawable from Settings (sets `withdrawnAt` to the current timestamp and triggers re-prompt on the next planning-AI action).
- **FR-010**: The cookie/storage banner decision MUST be documented in the privacy notice. If a banner is required under TTDSG § 25, it MUST be implemented as described in User Story 4.
- **FR-011**: Planning data MUST NOT be retained in browser storage beyond the retention period. The default retention period is 30 days, overridable by the admin via `config.json` field `planningDataRetentionDays` (integer, days). The app MUST enforce this by clearing expired planning snapshots on startup. The privacy notice MUST display the active retention value (read from `config.json` at render time). If the startup cleanup fails, the app MUST fail-open: log the error, show a non-blocking toast notification informing the user that stale planning data may remain, and continue loading normally.
- **FR-012**: The app MUST provide a collapsible "My stored planning data" section on the Settings page that displays all personally identifiable planning data currently in browser storage in a human-readable format, satisfying the Art. 15 right-of-access requirement. No file download or export is required.
- **FR-013**: The works-council / Betriebsrat requirement (§ 87(1)(6) BetrVG for PC-activity monitoring and Teams-partner logging) MUST be assessed. If no Betriebsvereinbarung is in place, those specific data-collection features MUST be gated (disabled by default in `config.json`) until legal/HR sign-off is obtained.
- **FR-014**: This feature MUST deliver a reusable "DSGVO Impact Checklist" artifact (stored at `specs/044-dsgvo-privacy-compliance/checklists/dsgvo-impact.md`) that any future feature implementer can work through to determine whether their change requires a privacy notice update. The checklist MUST cover at minimum: does the feature collect new personal data? does it change the purpose or legal basis of existing data? does it add a new data recipient (including external APIs)? does it change retention periods? does it require new or revised user consent? If any answer is "yes", the implementer MUST update `privacy.html` (DE + EN) and the data inventory before the PR is merged.
- **FR-015**: The DSGVO impact checklist (FR-014) MUST be referenced in the project's standard housekeeping rules (CLAUDE.md "Housekeeping" section) so it is visible to every future implementer alongside the existing AI knowledge routing and user documentation obligations.

### Key Entities

- **Privacy Notice (Datenschutzhinweis)**: A human-readable document (page or panel) covering all GDPR Art. 13 disclosure fields for planning-feature data processing. Exists in DE and EN. Linked from the Settings footer.
- **Planning Data**: The set of personal data points collected exclusively by planning features — PC presence/activity signals, Teams communication metadata (contact identifiers, timestamps, durations), inferred work-schedule patterns, and calendar event summaries used for planning. Distinct from time-entry data (which has its own, lower-sensitivity profile).
- **Data Inventory**: A structured internal record (can be a section within the privacy notice) mapping each planning data point to: sensitivity classification, storage location, legal basis, retention period, and recipient list.
- **AI Data-Sharing Consent Record**: A per-browser localStorage object (`{ consentedAt: ISO8601, withdrawnAt: ISO8601 | null }`) recording when the user consented to AI data sharing and when (if ever) they withdrew. Serves both the no-repeat-prompt requirement and the GDPR Art. 5(2) accountability obligation. Visible in the FR-012 data view; cleared by the FR-005 deletion action.
- **Planning Data Deletion Record**: Not persisted — the deletion action is fire-and-forget; the app verifies storage is empty after the operation and reports success or error.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % of personal data points collected by planning features are documented in the privacy notice with purpose, legal basis, and retention period — verified by cross-checking the notice against the data-inventory checklist.
- **SC-002**: The privacy notice is reachable from the Settings footer in two clicks or fewer from any page in the app.
- **SC-003**: The "Delete planning data" action removes all planning-specific storage keys within 3 seconds on a standard device; zero non-planning keys are removed as a side effect.
- **SC-004**: No planning data is transmitted to an external AI API in any session where the user has not acknowledged the disclosure — verified by network inspection in the Playwright test suite.
- **SC-005**: The privacy notice renders without layout issues or untranslated strings in both DE and EN locales on desktop screen sizes.
- **SC-006**: The works-council/Betriebsrat assessment is completed and documented (decision record in the privacy notice or a linked document) before the feature is merged to `main`.
- **SC-007**: The cookie/storage banner legal decision is documented with a rationale; if a banner is required, it is implemented and passing automated tests before merge.
- **SC-008**: The DSGVO impact checklist artifact exists at `specs/044-dsgvo-privacy-compliance/checklists/dsgvo-impact.md` and covers all five trigger questions from FR-014. It is referenced in CLAUDE.md "Housekeeping" before this feature is merged to `main`.
- **SC-009**: At least one subsequent feature PR (after this feature merges) can demonstrate the checklist was consulted by including a completed checklist entry in its PR description or `checklists/` directory.

## Assumptions

- The company deploying the app has (or will obtain before go-live) a Data Processing Agreement with Claude/Anthropic and with OpenAI covering the processing of employee planning data sent via the API. The in-app disclosure (FR-007) supplements but does not replace that DPA.
- PC-activity detection and Teams-partner logging are gated features controlled by admin `config.json` flags; this spec assumes those flags exist (or will be added as part of planning-feature implementation) and that the privacy notice can conditionally show/hide the corresponding sections based on `config.json`.
- The existing in-app i18n system (`js/i18n.js` + `js/i18n/en.js` / `js/i18n/de.js`) is used for all user-visible strings in the privacy notice UI chrome (footer link, deletion button labels, confirmation dialogs). The notice body text itself may be stored as static HTML or markdown per-locale rather than as individual i18n keys.
- "Planning data" refers specifically to data introduced by planning features (PC activity, Teams metadata, inferred attendance). Standard time-entry data (issue, hours, comment) is already covered by whatever privacy policy the company uses for Redmine; this feature does not retroactively revise that coverage.
- Mobile layout is out of scope for v1 of this feature; the privacy notice and deletion UI must be functional and readable on desktop browsers (matching the app's general mobile stance).
- The data-controller contact details (company name, DPO address) are admin-configurable via `config.json` — the app ships with placeholder text that must be filled in before production deployment; the spec does not hard-code a company name.
- Retention enforcement (FR-011) applies to planning-specific snapshot keys only; credential and preference storage is not affected by retention rules.
