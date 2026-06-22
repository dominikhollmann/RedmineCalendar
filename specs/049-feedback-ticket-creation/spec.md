# Feature Specification: Feedback — Create Ticket Instead of Sending Email

**Feature Branch**: `049-feedback-ticket-creation`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "issue #254 — Feedback: create ticket instead of sending email"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Submit Feedback as a Redmine Ticket (Priority: P1)

An end user opens the feedback panel, types their feedback, and submits it. The app calls the Redmine REST API using the existing stored API key to create a new issue in the admin-configured Redmine project. The captured screenshot is attached to the issue and the diagnostic context (errors, network log, app log, calendar state, storage snapshot) is included in the issue description. A success toast appears with a clickable link to the newly created ticket.

**Why this priority**: Redmine is the primary system the product already integrates with, and the app already holds the user's API key — so this path reuses an existing credential, adds no secret exposure, and is the only channel that can preserve the feature's full diagnostic value (screenshot + logs). It is the immediate user-visible win.

**Independent Test**: Can be fully tested by configuring `config.json` with `"feedback": { "system": "redmine", "redmineProjectId": <id> }`, submitting feedback with the diagnostic context opted in, and verifying a Redmine issue is created with the screenshot attached, the logs in the description, and a success toast containing a valid link.

**Acceptance Scenarios**:

1. **Given** `config.json` has `feedback.system = "redmine"` and a valid `redmineProjectId`, **When** the user submits feedback, **Then** a new Redmine issue is created whose title is derived from the feedback and whose body contains the full feedback text, and a success toast with a direct URL to the issue appears within 5 seconds.
2. **Given** the diagnostic-context opt-in is enabled, **When** the user submits feedback, **Then** the screenshot is attached to the Redmine issue and the errors / network log / app log / calendar state / storage snapshot are included in the issue description.
3. **Given** the Redmine API is unreachable or returns an error, **When** the user submits feedback, **Then** an error toast is displayed and the entered feedback text is preserved in the form (no silent loss).
4. **Given** the existing Redmine API key is missing or expired, **When** the user submits feedback, **Then** an error toast identifies the authentication problem and prompts the user to check their API key in Settings.

---

### User Story 2 — Submit Feedback as a GitHub Issue via Prefilled Form (Priority: P2)

An end user submits feedback and, because the admin has configured the GitHub integration, the app opens GitHub's "new issue" page for the configured repository in a new browser tab, with the title and body already filled in from the feedback. The user's existing GitHub session authorises the action; if they are not signed in, GitHub shows its normal login page and returns them to the prefilled form. The user reviews and clicks GitHub's own "Submit new issue" button.

**Why this priority**: GitHub Issues is a natural alternative tracker, but GitHub cannot be addressed the same way as Redmine: the app holds no GitHub credential, GitHub's public Issues API cannot upload screenshots, and storing a GitHub token in the client-visible `config.json` would expose it. The prefilled-URL approach needs **no token at all** (it rides the user's own GitHub session), keeps the secret-exposure surface at zero, and attributes the issue to the actual user. The trade-off — no automatic screenshot, length-limited logs, no in-app ticket link — is acceptable for a secondary channel.

**Independent Test**: Can be fully tested by configuring `config.json` with `"feedback": { "system": "github", "githubOwner": "...", "githubRepo": "..." }`, submitting feedback, and verifying the app opens a `https://github.com/<owner>/<repo>/issues/new?...` URL whose `title` and `body` parameters match the feedback content.

**Acceptance Scenarios**:

1. **Given** `config.json` has `feedback.system = "github"` with valid `githubOwner` and `githubRepo`, **When** the user submits feedback, **Then** the app opens GitHub's new-issue page in a new tab with the title and body prefilled from the feedback, and shows a confirmation toast that the GitHub form was opened.
2. **Given** the user is not signed in to GitHub, **When** the prefilled form opens, **Then** GitHub presents its standard login page and returns the user to the prefilled form after sign-in — the app stores or transmits no GitHub credential at any point.
3. **Given** the diagnostic context has been opted in, **When** the GitHub form opens, **Then** the textual context (metadata, and as much of the logs as fits within URL-length limits) is included in the prefilled body, and the form/UI instructs the user to paste the captured screenshot manually (GitHub's editor supports paste-to-upload).
4. **Given** the textual context would exceed the safe URL length, **When** the GitHub form opens, **Then** the body is truncated with a clear "[…truncated]" marker rather than failing to open.

---

### User Story 3 — Include Diagnostic Context with Consent (Priority: P3)

When the user submits feedback, they can opt in (via a checkbox in the feedback form, unchecked by default) to include supplementary diagnostic context: the current app version, browser/OS information, the captured screenshot, and — for bug reports — the error log, network log, app log, calendar state, and storage snapshot. The context is attached best-effort per the chosen system: fully on the Redmine path (screenshot as an attachment, logs in the description), and degraded on the GitHub path (textual context in the prefilled body, screenshot pasted manually by the user).

**Why this priority**: Diagnostic context dramatically accelerates bug triage, but screenshots and logs can contain personal or sensitive data, so collecting them requires explicit consent. An opt-in checkbox is the minimal privacy-respecting path; the context is a force-multiplier, not a prerequisite for the core ticket-creation flow.

**Independent Test**: Can be fully tested by submitting feedback with the context checkbox checked and verifying the created Redmine ticket includes the screenshot attachment and logs; and by submitting without the checkbox checked and verifying only the feedback text (plus a minimal title) is sent.

**Acceptance Scenarios**:

1. **Given** the context checkbox is unchecked (default state), **When** the user submits feedback, **Then** the created ticket contains only the feedback text — no screenshot, no logs, no browser/OS data.
2. **Given** the context checkbox is checked and the system is Redmine, **When** the user submits feedback, **Then** the screenshot is attached and the full diagnostic context appears in the issue description.
3. **Given** the context checkbox is checked and the system is GitHub, **When** the user submits feedback, **Then** the textual context is included in the prefilled body (length-limited) and the UI prompts the user to paste the screenshot manually.

---

### Edge Cases

- What happens when `config.json` has no `feedback` block at all? The feedback button/panel should remain visible but submission should display a configuration-missing error toast (no silent failure).
- What if the network connection is lost during a Redmine submission? The in-flight request should time out, the entered feedback should be preserved in the form, and the user should receive an error toast.
- What if the feedback description is empty? The UI should validate that a non-empty description is provided before allowing submission; a localised generic title (e.g., "Feedback from RedmineCalendar") should be used as the ticket title when no explicit subject is present.
- What if the user closes the GitHub tab without clicking GitHub's "Submit new issue" button? The feedback is not filed; this is an inherent limitation of the prefilled-URL channel and is acceptable, but the app must not claim success — its confirmation wording must say the form was *opened*, not that a ticket was *created*.
- What if the captured screenshot is large and the system is Redmine? The screenshot upload should be attempted; if the upload fails, the issue should still be created with the text/log context and the failure surfaced (the screenshot must not silently disappear without the issue being created).
- What happens when the existing email-based path is removed but a legacy config still references email settings (`feedbackEmail`)? Unused email config keys should be silently ignored.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Admin MUST be able to configure the feedback integration in `config.json` by adding a `"feedback"` object specifying `"system"` (`"redmine"` or `"github"`) and the system-appropriate target (`"redmineProjectId"` for Redmine; `"githubOwner"` + `"githubRepo"` for GitHub). No GitHub token is configured or stored.
- **FR-002**: When `feedback.system = "redmine"`, the app MUST create a new Redmine issue via the Redmine REST API, reusing the API key already stored in the app — no separate credential is required.
- **FR-003**: When the Redmine path is used and the diagnostic-context opt-in is enabled, the app MUST attach the captured screenshot to the issue (via Redmine's upload mechanism) and include the textual diagnostic context (errors, network log, app log, calendar state, storage snapshot) in the issue description.
- **FR-004**: When `feedback.system = "github"`, the app MUST open GitHub's prefilled "new issue" page for the configured `githubOwner`/`githubRepo` in a new browser tab, relying on the user's existing GitHub browser session for authentication. The app MUST NOT store, request, or transmit any GitHub credential or token.
- **FR-005**: When the GitHub path is used, the app MUST prefill the issue title and body from the feedback content; when diagnostic context is opted in, it MUST include the textual context in the body and MUST instruct the user (in the feedback UI) to paste the captured screenshot manually. The prefilled body MUST be truncated with a clear marker if it would exceed safe URL-length limits.
- **FR-006**: The ticket title MUST be derived from the feedback content; if no explicit subject is provided, a localised generic title (e.g., "Feedback from RedmineCalendar") MUST be used as a fallback.
- **FR-007**: The ticket body MUST contain the full feedback text supplied by the user.
- **FR-008**: On successful Redmine ticket creation, the app MUST display a toast notification that includes a direct, clickable hyperlink to the newly created ticket. On the GitHub path, the app MUST display a confirmation that the prefilled GitHub form was *opened* in a new tab — it MUST NOT claim a ticket was created, because the app cannot observe the result of the user's submission.
- **FR-009**: On any Redmine ticket-creation failure (network error, auth error, API error, misconfiguration), the app MUST display an error toast with a human-readable explanation and MUST preserve the entered feedback text. The submitted feedback MUST NOT be silently discarded.
- **FR-010**: When no `feedback` block exists in `config.json`, the app MUST show a configuration-missing error toast on submission attempt; the feedback form MUST remain accessible.
- **FR-011**: The existing email-based feedback delivery mechanism (MSAL/Graph email and the `mailto:` fallback) MUST be removed. No email is sent by the app.
- **FR-012**: The feedback form MUST include an opt-in checkbox (unchecked by default) that gates inclusion of diagnostic context (app version, browser/OS, screenshot, and bug logs). Adjacent to the checkbox, the form MUST display an explicit, plain-language warning stating **(a)** exactly what is attached when enabled — in particular that the screenshot captures whatever is visible on screen (real issue titles, project names, time entries) — and **(b)** that the resulting ticket is visible to everyone with access to the configured feedback project/repository. When unchecked, only the feedback text and a minimal title are sent.
- **FR-013**: Before inclusion in any ticket, network-log entries MUST be sanitized so that only the scheme, host, and path of each URL is retained — query strings and fragments MUST be stripped — to avoid exposing search terms, filters, or record identifiers in the captured context.
- **FR-014**: All new user-visible strings (toast messages, confirmation wording, checkbox label, the consent warning, manual-screenshot instruction, error descriptions, fallback ticket title) MUST be added to `js/i18n/en.js` and `js/i18n/de.js` and accessed via `t('key')`. No hardcoded strings in UI code.
- **FR-015**: The `config.json` `feedback` block schema MUST be documented in the user-facing settings documentation (`docs/content.en.md` and `docs/content.de.md`).

### Key Entities

- **FeedbackReport**: The user-entered feedback plus captured context. Key attributes: category (bug | suggestion), description, screenshot (image data), and — for bugs — errors, network log, app log, calendar state, storage snapshot, plus environment metadata (app version, browser/OS, viewport).
- **FeedbackConfig**: The admin-supplied configuration block in `config.json`. Attributes: `system` (enum: redmine | github), `redmineProjectId` (number, required when system = redmine), `githubOwner` (string, required when system = github), `githubRepo` (string, required when system = github). No GitHub token field exists.
- **TicketOutcome**: The result of a submission. For Redmine: a success state carrying the created ticket's URL, or a failure state with an error message. For GitHub: an "opened prefilled form" state (no resulting ticket URL is knowable to the app).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On the Redmine path, users can submit feedback and see a success toast with a ticket link within 5 seconds on a typical broadband connection.
- **SC-002**: No Redmine feedback submission is silently lost — every submission results in either a successfully created ticket (with a link shown) or an error toast with the feedback text preserved.
- **SC-003**: Admins can switch between the Redmine and GitHub feedback channels by editing only `config.json` — no code changes or redeployment required.
- **SC-004**: No GitHub credential or token is present anywhere in client-reachable configuration or storage; the GitHub path functions purely on the user's own browser session.
- **SC-005**: When diagnostic context is opted in on the Redmine path, the created issue contains the screenshot as an attachment and the full textual logs in its description.
- **SC-006**: Both submission paths are covered by automated unit tests using mocked APIs / URL construction, maintaining the project's ≥ 95% per-file line coverage gate.
- **SC-007**: All feedback UI strings render correctly in English and German with no hardcoded English-only strings remaining in the codebase after this change.
- **SC-008**: No personal context is attached unless the user has actively enabled the opt-in checkbox after the disclosure warning is shown; with the checkbox disabled, the created ticket contains only the feedback text and a minimal title (verified for both the Redmine and GitHub paths).
- **SC-009**: Under no configuration does the ticket payload contain the Redmine API key, the encrypted credential store, or any request/response bodies — the localStorage allowlist excludes credentials and the network log records only sanitized URL, method, status, and duration.

## Assumptions

- **Hybrid mechanism (clarified 2026-06-22)**: Redmine submissions go through the Redmine REST API (reusing the stored API key); GitHub submissions go through a prefilled new-issue URL on the user's own GitHub session. No GitHub token is ever configured or stored — this resolves the secret-exposure concern of putting a token in the client-fetched `config.json`.
- **Best-effort context (clarified 2026-06-22)**: Diagnostic context is attached as fully as each channel allows — screenshot-as-attachment + logs-in-description for Redmine; length-limited textual context + manual screenshot paste for GitHub. GitHub's public Issues API cannot upload images, which is one reason the GitHub path uses the prefilled-form channel rather than an API call.
- The existing feedback button, dialog, screenshot capture, and context collection (introduced in feature 037) are preserved; only the *delivery* mechanism changes from email to ticket creation, and a consent checkbox gates the context.
- **Data minimization & disclosure (clarified 2026-06-22)**: Diagnostic context (especially the screenshot) contains personal/operational data and, on the Redmine path, lands in a shared feedback project visible to every triager. Therefore the context is strictly opt-in, and the user is shown an explicit warning of *what* is shared and *who can see it* before consenting. No secrets are ever included — the localStorage snapshot is allowlist-based and excludes the encrypted credential key, and the network log carries only sanitized URL/method/status/duration (the Redmine API key travels in a request header, never in captured data).
- **DSGVO/privacy**: This feature introduces a new data flow (screenshots + diagnostic logs sent to an external ticket system / new data recipient). The DSGVO impact checklist MUST be completed and `privacy.html` (DE + EN) + the data inventory updated during the plan/implement phase before review. Admins MUST point `redmineProjectId` (and the GitHub repo) at a target whose visibility is appropriate for personal screenshots.
- Redmine users have permission to create issues in the configured project, and the screenshot is uploaded via Redmine's standard upload-then-reference flow through the existing CORS proxy.
- GitHub users either have an active GitHub session or are willing to sign in via GitHub's own login page; the app never sees their GitHub credentials.
- App version (read from `version.json`), browser/OS (derived from `navigator.userAgent`), and viewport size are non-sensitive and are included only when the user opts into context.
- Mobile support for the feedback form is out of scope for this feature; the existing desktop-only layout is retained.
- JIRA, Linear, and other ticket systems are explicitly out of scope and may be added in a future feature.
