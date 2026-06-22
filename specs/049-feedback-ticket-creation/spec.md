# Feature Specification: Feedback — Create Ticket Instead of Sending Email

**Feature Branch**: `049-feedback-ticket-creation`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "issue #254 — Feedback: create ticket instead of sending email"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Submit Feedback as a Redmine Ticket (Priority: P1)

An end user opens the feedback panel, types their feedback, and submits it. The app calls the Redmine REST API using the existing stored API key to create a new issue in the admin-configured Redmine project. A success toast appears with a clickable link to the newly created ticket.

**Why this priority**: Redmine is the primary system the product already integrates with. Replacing email with a tracked Redmine issue is the immediate user-visible value and the path of least resistance (existing API key, no new credential required).

**Independent Test**: Can be fully tested by configuring `config.json` with `"feedback": { "system": "redmine", "redmineProjectId": <id> }`, submitting any feedback text, and verifying a Redmine issue is created and the success toast contains a valid link.

**Acceptance Scenarios**:

1. **Given** `config.json` has `feedback.system = "redmine"` and a valid `redmineProjectId`, **When** the user submits feedback with a subject and body, **Then** a new Redmine issue is created whose title matches the subject line and whose body contains the full feedback text, and a success toast with a direct URL to the issue appears within 5 seconds.
2. **Given** the Redmine API is unreachable or returns an error, **When** the user submits feedback, **Then** an error toast is displayed and no data is silently discarded.
3. **Given** the existing Redmine API key is missing or expired, **When** the user submits feedback, **Then** an error toast identifies the authentication problem and prompts the user to check their API key in Settings.

---

### User Story 2 — Submit Feedback as a GitHub Issue (Priority: P2)

An end user submits feedback and, because the admin has configured the GitHub integration, the app calls the GitHub Issues API to create a new issue in the configured repository. On success a toast appears with a link to the GitHub issue; on failure an error toast is shown.

**Why this priority**: GitHub Issues is a natural alternative tracker for teams that host their source on GitHub. Supporting it makes the feature useful across a broader range of admin configurations without coupling all installations to Redmine.

**Independent Test**: Can be fully tested by configuring `config.json` with `"feedback": { "system": "github", "githubOwner": "...", "githubRepo": "..." }` and verifying a GitHub issue is created on submit.

**Acceptance Scenarios**:

1. **Given** `config.json` has `feedback.system = "github"` with valid `githubOwner` and `githubRepo`, **When** the user submits feedback, **Then** a new GitHub issue is created with the subject as title and the full text as body, and a success toast with a direct URL to the issue appears.
2. **Given** a `githubToken` is provided in config, **When** the user submits feedback, **Then** the API call is authenticated (allowing access to private repos and avoiding rate-limit errors).
3. **Given** no `githubToken` is provided, **When** the user submits feedback, **Then** the app attempts the unauthenticated GitHub API path, and any rate-limit or auth error surfaces as an error toast.
4. **Given** the GitHub repository does not exist or the token lacks write access, **When** the user submits feedback, **Then** an error toast explains the failure and no data is lost.

---

### User Story 3 — Include Optional Metadata with Consent (Priority: P3)

When the user submits feedback, they can opt in (via a checkbox in the feedback form, unchecked by default) to include supplementary technical context: the current app version and their browser/OS information. When opted in, this information is appended to the ticket body to help developers reproduce issues.

**Why this priority**: Metadata accelerates bug triage, but collecting browser/OS info without explicit consent raises privacy concerns. An opt-in checkbox is the minimal privacy-respecting path; it is a convenience, not a prerequisite for the core ticket-creation flow.

**Independent Test**: Can be fully tested by submitting feedback with the metadata checkbox checked and verifying the created ticket body includes app version and browser/OS string; and by submitting without the checkbox checked and verifying those fields are absent.

**Acceptance Scenarios**:

1. **Given** the metadata checkbox is unchecked (default state), **When** the user submits feedback, **Then** the created ticket body contains only the feedback text — no version or browser/OS data.
2. **Given** the metadata checkbox is checked, **When** the user submits feedback, **Then** the created ticket body appends the current app version and a browser/OS summary below the feedback text.
3. **Given** the metadata checkbox is checked, **When** the user submits feedback via both Redmine and GitHub paths, **Then** metadata appears consistently in both ticket bodies.

---

### Edge Cases

- What happens when `config.json` has no `feedback` block at all? The feedback button/panel should remain visible but submission should display a configuration-missing error toast (no silent failure).
- What if the network connection is lost between the user clicking "Submit" and the API responding? The in-flight request should time out and the user should receive an error toast.
- What if the feedback subject is empty? The UI should validate that at minimum a non-empty body is provided before allowing submission; a generic title (e.g., "Feedback from RedmineCalendar") should be used as a fallback if no subject is present.
- What happens when the existing email-based path is removed but a legacy config still references email settings? Unused email config keys should be silently ignored.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Admin MUST be able to configure the feedback integration in `config.json` by adding a `"feedback"` object specifying `"system"` (`"redmine"` or `"github"`), and the system-appropriate target (`"redmineProjectId"` for Redmine; `"githubOwner"` + `"githubRepo"` for GitHub).
- **FR-002**: When `feedback.system = "redmine"`, the app MUST create a new Redmine issue via the Redmine REST API, reusing the API key already stored in the app — no separate credential is required.
- **FR-003**: When `feedback.system = "github"`, the app MUST create a new GitHub issue via the GitHub Issues REST API. If `feedback.githubToken` is present in `config.json`, it MUST be used as a Bearer token; if absent, the unauthenticated API path MUST be attempted.
- **FR-004**: The ticket title MUST be derived from the feedback subject field; if no subject is provided, a localised generic title (e.g., "Feedback from RedmineCalendar") MUST be used as a fallback.
- **FR-005**: The ticket body MUST contain the full feedback text supplied by the user.
- **FR-006**: On successful ticket creation, the app MUST display a toast notification that includes a direct, clickable hyperlink to the newly created ticket.
- **FR-007**: On any ticket-creation failure (network error, auth error, API error, misconfiguration), the app MUST display an error toast with a human-readable explanation. The submitted feedback text MUST NOT be silently discarded.
- **FR-008**: When no `feedback` block exists in `config.json`, the app MUST show a configuration-missing error toast on submission attempt; the feedback form MUST remain accessible.
- **FR-009**: The existing email-based feedback delivery mechanism MUST be removed. No email is sent by the app.
- **FR-010**: The feedback form MUST include an opt-in checkbox (unchecked by default) that allows the user to consent to appending app version and browser/OS metadata to the ticket body.
- **FR-011**: All new user-visible strings (toast messages, checkbox label, error descriptions, fallback ticket title) MUST be added to `js/i18n/en.js` and `js/i18n/de.js` and accessed via `t('key')`. No hardcoded strings in UI code.
- **FR-012**: The `config.json` `feedback` block schema MUST be documented in the settings documentation (user-facing docs).

### Key Entities

- **FeedbackTicket**: A ticket created in an external system representing a piece of user feedback. Key attributes: title (string), body (string), optional metadata (app version, browser/OS), target system identifier, resulting ticket URL.
- **FeedbackConfig**: The admin-supplied configuration block in `config.json`. Attributes: `system` (enum: redmine | github), `redmineProjectId` (number, required when system = redmine), `githubOwner` (string, required when system = github), `githubRepo` (string, required when system = github), `githubToken` (string, optional).
- **TicketCreationResult**: The outcome of a ticket-creation API call. Contains either a success state with a `ticketUrl` (string) or a failure state with an `errorMessage` (string).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can submit feedback and see a success toast with a ticket link within 5 seconds on a typical broadband connection.
- **SC-002**: Zero feedback submissions are silently lost — every submission results in either a successfully created ticket visible to the admin or an error toast visible to the user.
- **SC-003**: Admins can switch between Redmine and GitHub ticket systems by editing only `config.json` — no code changes or redeployment required.
- **SC-004**: Both Redmine and GitHub submission paths are covered by automated unit tests using mocked API calls, maintaining the project's ≥ 95% per-file line coverage gate.
- **SC-005**: All feedback UI strings render correctly in English and German with no hardcoded English-only strings remaining in the codebase after this change.

## Assumptions

- The existing feedback button and panel UI (introduced in feature 037) are preserved; only the submission mechanism changes from email to ticket creation.
- Admins have sufficient permissions to create issues in the configured Redmine project or GitHub repository.
- The GitHub Issues API is accessed through the existing CORS proxy configured by the admin — no new proxy is needed.
- GitHub unauthenticated API access (when no token is configured) is acceptable for low-volume feedback; rate-limit errors surface as an error toast rather than being silently retried.
- A `githubToken` stored in admin-managed `config.json` on the server does not violate the credential-storage principle because `config.json` is a server-side admin file, not client-side storage. The token MUST NOT be exposed to end users via the UI or logs.
- App version (read from `version.json`) is non-sensitive and may always be included when the user opts into metadata.
- Browser/OS metadata is derived entirely from `navigator.userAgent` — no additional permissions or APIs are required.
- Mobile support for the feedback form is out of scope for this feature; the existing desktop-only layout is retained.
- JIRA, Linear, and other ticket systems are explicitly out of scope and may be added in a future feature.
