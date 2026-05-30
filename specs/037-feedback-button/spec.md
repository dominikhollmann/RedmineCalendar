# Feature Specification: User Feedback Button

**Feature Branch**: `037-feedback-button`  
**Created**: 2026-05-30  
**Status**: Draft  
**Input**: User description: "the user should be able to give feedback in case they encounter any problems or have ideas for improvements. in the ui this should be a small 'give feedback' button. the feedback automatically includes relevant information for understanding the issue (where possible), e.g. screenshot, stack trace, log."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Report a Problem with Auto-Collected Context (Priority: P1)

A user encounters an unexpected error or unexpected behaviour in the app. They click the small "Give Feedback" button visible in the UI, which opens a feedback dialog. The dialog already contains auto-collected context: a screenshot of the current state, any recent JavaScript errors or stack traces, the current page URL, browser and OS information, and recent app log entries. The user adds a short description of the problem and submits. The feedback is delivered to the designated target (configured by the admin) without the user having to manually gather diagnostic information.

**Why this priority**: This is the core value of the feature — reducing friction for users reporting problems and providing developers with the context needed to reproduce and fix issues.

**Independent Test**: Can be fully tested by triggering a JavaScript error in the app, clicking the feedback button, verifying all context is pre-filled in the dialog, and submitting — delivering a complete feedback report with diagnostics.

**Acceptance Scenarios**:

1. **Given** the user is on any page of the app and a JavaScript error has occurred, **When** they click "Give Feedback", **Then** a dialog opens with the error message and stack trace pre-filled in the context section.
2. **Given** the feedback dialog is open, **When** the user clicks Submit without typing a description, **Then** they are prompted to add at least a brief description before submission.
3. **Given** the feedback dialog is open, **When** the user reviews the auto-collected context, **Then** they can expand a collapsible section showing screenshot, error logs, URL, and browser info before submission.

---

### User Story 2 - Share an Improvement Idea (Priority: P2)

A user has an idea for a new feature or workflow improvement. They click the feedback button, type their suggestion in the description field, and submit. The context section still collects environment info but is less prominent for ideas (no errors to show). The feedback reaches the development team with enough context to understand which part of the app the user was using.

**Why this priority**: Improvement ideas are valuable input but less time-critical than bug reports; the core reporting flow (P1) must work first.

**Independent Test**: Can be fully tested by opening the feedback dialog from the main calendar view, typing a feature suggestion, submitting, and confirming the feedback is delivered with the current page context attached.

**Acceptance Scenarios**:

1. **Given** the user is on the calendar view, **When** they submit feedback with only a text description (no errors present), **Then** the delivered feedback includes their description plus current page URL and timestamp.
2. **Given** the feedback dialog is open, **When** the user clicks Cancel, **Then** the dialog closes without sending anything and the app state is unchanged.

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
- **FR-002**: Clicking the button MUST open a feedback dialog with a text description field and a collapsible context section.
- **FR-003**: The feedback dialog MUST automatically capture and display: current page URL, timestamp, browser name and version, operating system.
- **FR-004**: The feedback dialog MUST attempt to capture a screenshot of the current app state and include it in the context section.
- **FR-005**: The feedback dialog MUST automatically include any application errors (with stack traces) that occurred in the current session, up to the 10 most recent.
- **FR-006**: The feedback dialog MUST automatically include the most recent 50 app log entries from the current session (if the app maintains an in-memory log).
- **FR-007**: The user MUST be able to expand or collapse the auto-collected context section to review what will be sent before submitting.
- **FR-008**: The user MUST be able to remove individual pieces of auto-collected context (screenshot, error log, browser info) before submitting.
- **FR-009**: Submission MUST be blocked if the description field is empty; the user MUST be informed they need to provide a description.
- **FR-010**: After successful submission, the dialog MUST close and the user MUST receive a brief confirmation.
- **FR-011**: If submission fails (e.g. offline), the dialog MUST remain open, show an error message, and preserve the user's typed description.
- **FR-012**: The delivery method for submitted feedback MUST be [NEEDS CLARIFICATION: should feedback be delivered by opening a pre-filled email in the user's mail client (Outlook or similar — no additional configuration required) or by automatically creating a GitHub issue (requires an admin-configured GitHub token) or should the admin be able to choose between both delivery methods in the configuration file?].
- **FR-013**: The feedback button MUST be visually unobtrusive — small, fixed-position, and must not overlap interactive calendar elements or form controls.

### Key Entities

- **Feedback Report**: User-provided description, timestamp, page URL, browser/OS info, screenshot (optional), recent error log (optional), recent app log entries (optional).
- **Delivery Target**: Admin-configured destination (email address and/or GitHub repository) read from `config.json`.
- **Session Error Buffer**: In-memory list of captured JavaScript errors for the current browser session, populated by a global error listener.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can open the feedback dialog and submit a complete report (including auto-collected context) within 30 seconds of clicking the button.
- **SC-002**: Auto-collected context (URL, timestamp, browser info) is attached to 100% of submitted feedback reports.
- **SC-003**: Screenshot capture succeeds and is included in submitted feedback on at least 80% of submissions across supported browsers.
- **SC-004**: Users can access the feedback button from every app view without any scrolling or navigation.
- **SC-005**: Zero blocking errors occur when screenshot capture or log capture fails — all submissions still complete.
- **SC-006**: Users can complete a feedback submission using keyboard navigation only (no mouse required).

## Assumptions

- The app is used on modern browsers; screenshot capture may not be supported in all browser environments and graceful fallback is required.
- The admin configures the feedback delivery target(s) in `config.json`; no per-user configuration is needed.
- The app does not currently maintain a structured in-memory log; a lightweight session log buffer will need to be introduced or the feature will fall back to capturing only JavaScript errors.
- Feedback data (especially screenshots) may contain sensitive business information; the user-review-before-submit flow (FR-007, FR-008) is the primary privacy safeguard — no server-side scrubbing is assumed.
- Mobile support is in scope only to the extent that the existing app is already mobile-usable; the feedback button must not make the mobile experience worse.
- The feature does not require authentication changes — feedback is submitted as the currently signed-in user (if applicable) or anonymously.
