# Feature Specification: User Feedback Button

**Feature Branch**: `037-feedback-button`  
**Created**: 2026-05-30  
**Status**: Draft  
**Input**: User description: "the user should be able to give feedback in case they encounter any problems or have ideas for improvements. in the ui this should be a small 'give feedback' button. the feedback automatically includes relevant information for understanding the issue (where possible), e.g. screenshot, stack trace, log."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Report a Problem with Auto-Collected Context (Priority: P1)

A user encounters an unexpected error or unexpected behaviour in the app. They click the small "Give Feedback" button in the bottom-right corner, which opens a feedback dialog. They select "Bug Report" from the mandatory category selector. The dialog immediately populates the context section with all available diagnostics: a screenshot of the current state, recent application errors with stack traces, app log entries, the current page URL, browser and OS information, and the user's identity. The user adds a short description of the problem and submits. The feedback is delivered without the user having to manually gather any diagnostic information.

**Why this priority**: This is the core value of the feature — reducing friction for users reporting problems and providing developers with the context needed to reproduce and fix issues.

**Independent Test**: Can be fully tested by triggering a JavaScript error in the app, clicking the feedback button, verifying all context is pre-filled in the dialog, and submitting — delivering a complete feedback report with diagnostics.

**Acceptance Scenarios**:

1. **Given** the user is on any page of the app and a JavaScript error has occurred, **When** they click "Give Feedback", **Then** a dialog opens with the error message and stack trace pre-filled in the context section.
2. **Given** the feedback dialog is open, **When** the user clicks Submit without typing a description, **Then** they are prompted to add at least a brief description before submission.
3. **Given** the feedback dialog is open, **When** the user reviews the auto-collected context, **Then** they can expand a collapsible section showing screenshot, error logs, URL, and browser info before submission.

---

### User Story 2 - Share an Improvement Idea (Priority: P2)

A user has an idea for a new feature or workflow improvement. They click the feedback button, select "Suggestion" from the mandatory category selector, type their idea in the description field, and submit. The context section shows only a screenshot — no error logs or stack traces, keeping the dialog clean and uncluttered for non-technical users. The feedback reaches the development team with a screenshot showing the relevant app state.

**Why this priority**: Improvement ideas are valuable input but less time-critical than bug reports; the core reporting flow (P1) must work first.

**Independent Test**: Can be fully tested by opening the feedback dialog, selecting "Suggestion", typing an idea, and confirming the delivered feedback contains only description + screenshot (no log entries).

**Acceptance Scenarios**:

1. **Given** the user selects "Suggestion" in the category selector, **When** the context section is rendered, **Then** it shows only the screenshot (plus URL and browser info) — no error logs, no stack traces.
2. **Given** the feedback dialog is open with "Suggestion" selected, **When** the user clicks Cancel, **Then** the dialog closes without sending anything and the app state is unchanged.
3. **Given** no category is selected, **When** the user clicks Submit, **Then** submission is blocked and the user is told a category is required.

---

### User Story 3 - Screenshot Capture Fails Gracefully (Priority: P3)

In some browsers or under certain permissions, the automatic screenshot capture may fail. The user should still be able to submit feedback without a screenshot; the failure is surfaced as a small note ("Screenshot unavailable") in the context section, and submission proceeds normally.

**Why this priority**: Graceful degradation ensures the feature is usable across all supported browsers; it is a robustness concern rather than core functionality.

**Independent Test**: Can be fully tested by blocking screenshot-capture permissions (or simulating a capture failure) and verifying the dialog still opens, shows "Screenshot unavailable", and allows submission.

**Acceptance Scenarios**:

1. **Given** screenshot capture is unavailable, **When** the feedback dialog opens, **Then** the context section shows "Screenshot unavailable" and all other context (URL, browser, errors) is still present.
2. **Given** screenshot capture is unavailable, **When** the user submits feedback, **Then** the feedback is delivered successfully without a screenshot, with no blocking error shown to the user.

---

### Edge Cases

- What happens when the user is offline at submission time? → Submission fails gracefully with a user-visible error; the feedback text is preserved in the dialog so the user can retry or copy it manually.
- How does the system handle stack traces or screenshots that may contain sensitive information (e.g. API keys visible on screen, personal data)? → The user can review the full context in the collapsible section before submitting and can delete individual pieces of context.
- What if the feedback dialog is opened while another modal (e.g. the time-entry form) is open? → The feedback button remains accessible and opens the feedback dialog on top of any existing dialog.
- What if very large log buffers are captured? → Logs are capped at the most recent 50 entries to keep feedback payloads reasonable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST display a persistently visible "Give Feedback" button that is accessible from all views without scrolling.
- **FR-002**: Clicking the button MUST open a feedback dialog containing a mandatory category selector ("Bug Report" / "Suggestion"), a text description field, and a collapsible context section. Submission MUST be blocked until a category is selected.
- **FR-003**: The feedback dialog MUST automatically capture and display: current page URL, timestamp, browser name and version, operating system, and the submitting user's identity (Office 365 display name if signed in via MSAL, otherwise Redmine username, otherwise "Anonymous").
- **FR-004**: The feedback dialog MUST attempt to capture a screenshot of the current app state for both categories and display it in the context section; when sent via Office 365 the screenshot MUST be included as an image attachment on the email.
- **FR-005**: For "Bug Report" only, the feedback dialog MUST automatically include any application errors (with stack traces) that occurred in the current session, up to the 10 most recent. For "Suggestion", error logs and stack traces MUST NOT be collected or shown.
- **FR-006**: For "Bug Report" only, the feedback dialog MUST automatically include the most recent 50 app log entries from the current session (if the app maintains an in-memory log). For "Suggestion", app log entries MUST NOT be collected or shown.
- **FR-007**: The user MUST be able to expand or collapse the auto-collected context section to review what will be sent before submitting.
- **FR-008**: The user MUST be able to remove individual pieces of auto-collected context (screenshot, error log, browser info) before submitting.
- **FR-009**: Submission MUST be blocked if the description field is empty; the user MUST be informed they need to provide a description.
- **FR-010**: After successful submission, the dialog MUST close and the user MUST receive a brief confirmation.
- **FR-011**: If submission fails (e.g. offline or Office 365 unavailable), the dialog MUST remain open, show an error message, and preserve the user's typed description.
- **FR-012**: When the app's existing Office 365 connection is active (i.e. the user is signed in via the existing MSAL integration), submitting feedback MUST send the email silently via the Office 365 Mail API — with a rich HTML body and the screenshot as an image attachment — and confirm to the user once sent. When Office 365 is not configured or the user is not signed in, the app MUST fall back to opening the user's default mail client with a pre-filled plain-text email (no screenshot). The recipient email address MUST be configurable by the admin in `config.json`.
- **FR-014**: The Office 365 send path MUST use the existing MSAL authentication already present in the app; no additional sign-in step MUST be required if the user is already authenticated.
- **FR-013**: The feedback button MUST be rendered as a small fixed floating button in the bottom-right corner of the viewport, visually distinct from the header controls (AI chat, docs, settings), and MUST NOT overlap interactive calendar elements or form controls.
- **FR-015**: The feedback button MUST be hidden entirely when `feedbackEmail` is not present in `config.json`; no error or placeholder MUST be shown to the user.

### Key Entities

- **Feedback Report**: User-provided description, submitter identity (display name or username or "Anonymous"), timestamp, page URL, browser/OS info, screenshot (optional), recent error log (optional), recent app log entries (optional).
- **Delivery Target**: Admin-configured recipient email address in `config.json`; the send path (Office 365 API or mailto: fallback) is determined at runtime by whether the user is signed in via the existing MSAL integration.
- **Session Error Buffer**: In-memory list of captured JavaScript errors for the current browser session, populated by a global error listener.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can open the feedback dialog and submit a complete report (including auto-collected context) within 30 seconds of clicking the button.
- **SC-002**: Auto-collected context (URL, timestamp, browser info) is attached to 100% of submitted feedback reports.
- **SC-003**: When Office 365 is active, the screenshot is included as an image attachment in at least 80% of submitted feedback reports. When falling back to mailto:, the screenshot is visible in the dialog but not sent (expected behaviour, not a failure).
- **SC-004**: Users can access the feedback button from every app view without any scrolling or navigation.
- **SC-005**: Zero blocking errors occur when screenshot capture or log capture fails — all submissions still complete.
- **SC-006**: Users can complete a feedback submission using keyboard navigation only (no mouse required).

## Clarifications

### Session 2026-05-30

- Q: How should the auto-captured screenshot be delivered — given that mailto: links cannot carry image data? → A: Use the existing Office 365 MSAL integration (primary path) to send a rich HTML email with the screenshot as an attachment; fall back to a plain-text mailto: link (no screenshot) when Office 365 is not configured or the user is not signed in.
- Q: Should the feedback email include the submitting user's identity? → A: Yes — Office 365 display name when signed in via MSAL, otherwise the Redmine username from the active session, falling back to "Anonymous" if neither is available.
- Q: Where should the "Give Feedback" button be positioned in the UI? → A: Fixed floating button in the bottom-right corner, visually distinct from the header actions (AI chat, docs, settings).
- Q: What happens when `feedbackEmail` is not set in `config.json`? → A: The feedback button is hidden entirely — same pattern as other admin-gated features (AI chat, Outlook).
- Q: Should users categorise feedback, and does the category affect what context is collected? → A: Mandatory category selector ("Bug Report" / "Suggestion") — submission blocked until chosen. Bug Report collects all context (screenshot, error log with stack traces, app log entries). Suggestion collects screenshot only (no logs, no stack traces).

## Assumptions

- The app is used on modern browsers; screenshot capture may not be supported in all browser environments and graceful fallback is required.
- The admin configures the feedback delivery target(s) in `config.json`; no per-user configuration is needed.
- The app does not currently maintain a structured in-memory log; a lightweight session log buffer will need to be introduced or the feature will fall back to capturing only JavaScript errors.
- Feedback data (especially screenshots) may contain sensitive business information; the user-review-before-submit flow (FR-007, FR-008) is the primary privacy safeguard — no server-side scrubbing is assumed.
- Mobile support is in scope only to the extent that the existing app is already mobile-usable; the feedback button must not make the mobile experience worse.
- The feature does not require authentication changes — feedback is submitted as the currently signed-in user (if applicable) or anonymously.
