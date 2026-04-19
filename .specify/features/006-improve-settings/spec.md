# Feature Specification: Improve Settings Page

**Feature Branch**: `006-improve-settings`  
**Created**: 2026-04-01  
**Status**: Draft  
**Input**: User description: "I want to improve the settings: 1. Let the user define the redmine url in the settings page instead of using the package.json file 2. Modify the UI for API authentication vs. user/password: If the user selects an authentication mode, only show the relevant input fields for that mode. still store all provided credentials 3. Add a third login option 'Anonymous Mode' 4. Make an error message, if login is not successfull for API or user/password authentication. don't go to anonymous mode in that case."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enter Redmine URL in Settings (Priority: P1)

A user opens the settings page and enters their Redmine server URL directly in the form. The app connects to that URL without any need to edit configuration files or restart a proxy with hardcoded values.

**Why this priority**: Without this, users cannot configure the app without editing files — it is a blocker for all other functionality.

**Independent Test**: Can be fully tested by entering a URL in the settings form, saving, and verifying the app communicates with the specified server.

**Acceptance Scenarios**:

1. **Given** the settings page is open, **When** the user enters a valid URL and saves, **Then** the app uses that URL for all subsequent Redmine API calls.
2. **Given** the user has previously saved a URL, **When** they reopen settings, **Then** the previously saved URL is pre-filled in the field.
3. **Given** the user enters an empty or malformed URL, **When** they try to save, **Then** a validation error is shown and the form is not submitted.

---

### User Story 2 - Conditional Authentication Fields (Priority: P2)

A user selects an authentication mode (API Key, Username & Password, or Anonymous). Only the input fields relevant to the selected mode are visible. Switching modes hides the irrelevant fields. All previously entered credentials for all modes are retained in storage even if those fields are currently hidden.

**Why this priority**: Reduces visual clutter and guides the user clearly — showing all fields at once causes confusion about which ones to fill in.

**Independent Test**: Can be fully tested by toggling between auth modes and verifying field visibility changes; then saving and reloading to verify all credentials persist.

**Acceptance Scenarios**:

1. **Given** the settings page loads, **When** "API Key" mode is selected, **Then** only the API key field is shown; username and password fields are hidden.
2. **Given** the settings page loads, **When** "Username & Password" mode is selected, **Then** only the username and password fields are shown; the API key field is hidden.
3. **Given** the user has entered an API key and then switches to "Username & Password", **When** they switch back to "API Key", **Then** the previously entered API key is still present in the field.
4. **Given** credentials are saved for one mode, **When** the user reopens settings and switches to a different mode, **Then** the stored credentials for that other mode are still available.

---

### User Story 3 - Authentication Error Feedback (Priority: P2)

When the user saves settings with API Key or Username & Password authentication, the app validates the credentials against the Redmine server. If authentication fails, a clear error message is shown on the settings page. The app does not fall back to Anonymous Mode or proceed as if the login succeeded.

**Why this priority**: Without this, a silent failure could mislead users into thinking they are logged in when they are not, causing confusing downstream errors.

**Independent Test**: Can be fully tested by entering invalid credentials, saving, and verifying an error message appears and the app does not navigate away.

**Acceptance Scenarios**:

1. **Given** the user enters an incorrect API key and saves, **When** the app attempts to verify the credentials, **Then** an inline error message explains that authentication failed, and the user remains on the settings page.
2. **Given** the user enters a wrong username or password and saves, **When** the app attempts to verify the credentials, **Then** an inline error message explains that authentication failed, and the user remains on the settings page.
3. **Given** authentication fails, **When** the error is shown, **Then** the app does NOT silently switch to Anonymous Mode or skip authentication.
4. **Given** the user corrects their credentials and saves again, **When** authentication succeeds, **Then** the app proceeds normally (navigates to the calendar).

---

### Edge Cases

- What happens when the Redmine server URL is reachable but returns an unexpected response format?
- How does the app handle a network timeout during credential verification?
- What if the user clears a credential field and saves — is the old stored value overwritten with an empty string?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The settings page MUST include an input field where users can enter the Redmine server URL.
- **FR-002**: The entered Redmine URL MUST be saved to persistent storage and used for all API requests.
- **FR-003**: The authentication mode selector MUST offer two options: "API Key" and "Username & Password". Anonymous Mode was removed after initial implementation — Redmine instances requiring no authentication are out of scope.
- **FR-004**: When "API Key" is selected, ONLY the API key input field MUST be visible; the username and password fields MUST be hidden.
- **FR-005**: When "Username & Password" is selected, ONLY the username and password fields MUST be visible; the API key field MUST be hidden.
- **FR-006**: *(Removed — Anonymous Mode is not supported.)*
- **FR-007**: Credentials for all authentication modes MUST be stored persistently, regardless of which mode is currently selected.
- **FR-008**: When the user reopens settings, all previously stored credentials for each mode MUST be pre-filled in their respective (possibly hidden) fields.
- **FR-009**: When saving with "API Key" or "Username & Password" mode, the app MUST verify the credentials against the Redmine server before proceeding.
- **FR-010**: If credential verification fails, the settings page MUST display an inline error message describing the failure.
- **FR-011**: The app MUST NOT continue to the calendar when authentication fails for "API Key" or "Username & Password" modes.
- **FR-012**: The Redmine URL field MUST validate that the entered value is a non-empty, well-formed URL before saving.

### Key Entities

- **Settings**: The complete user configuration — Redmine URL, selected authentication mode, and stored credentials for each mode (API key, username, password).
- **Authentication Mode**: One of two mutually exclusive states — API Key, Username & Password — that determines how API requests are authenticated.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can fully configure the app (URL + auth) through the settings page without editing any configuration files.
- **SC-002**: Switching authentication modes shows or hides the relevant fields immediately, without a page reload.
- **SC-003**: Credential verification feedback (success or error) is shown to the user within 5 seconds of pressing "Save & Connect".
- **SC-004**: 100% of saved credentials for all modes persist across page reloads and mode switches without data loss.
- **SC-005**: Authentication failures always result in an inline error on the settings page — the app never silently proceeds with a failed login. Note: the implementation uses an optimistic-write-then-restore pattern (config is temporarily written so `getCurrentUser()` can read it from the cookie, then restored on failure) — bad credentials never persist across page reloads.

## Assumptions

- The Redmine URL entered by the user is the base URL of the proxy (e.g., `http://localhost:8010`), not the direct Redmine server URL, consistent with the existing proxy setup.
- Credential verification is performed by making a lightweight authenticated request to the Redmine API — a 401 or similar error response indicates failure.
- Credentials are stored in the browser (cookies or localStorage), consistent with the existing storage approach in this project.
- Anonymous Mode was implemented and subsequently removed — Redmine instances not requiring authentication are out of scope for this feature.
- The proxy setup (`npm run proxy`) remains unchanged — this feature only changes how the URL and credentials are configured in the UI.
