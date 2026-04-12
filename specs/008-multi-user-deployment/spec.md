# Feature Specification: Professional Multi-User Deployment

**Feature Branch**: `008-multi-user-deployment`  
**Created**: 2026-04-12  
**Status**: Draft  
**Input**: User description: "Professional deployment - Extend tool for use in company environment with multiple users"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Employee Accesses the Tool (Priority: P1)

A company employee opens the tool in their browser via a shared company URL. They enter their personal Redmine API key once and the tool remembers it. From then on they can log time against their own Redmine account without any setup or IT involvement.

**Why this priority**: This is the core multi-user scenario — every employee must be able to use the tool independently with their own identity. Nothing else matters if this doesn't work.

**Independent Test**: Can be fully tested by opening the shared URL, entering a Redmine API key, and verifying that time entries are saved to the correct Redmine user account.

**Acceptance Scenarios**:

1. **Given** a new employee visits the tool URL, **When** they enter their Redmine API key in settings, **Then** the tool saves it to their browser and uses it for all subsequent requests.
2. **Given** two employees use the tool on the same shared URL, **When** each has entered their own API key, **Then** each sees only their own calendar and their entries go to their own Redmine account.
3. **Given** an employee's API key is invalid or expired, **When** they try to load the calendar, **Then** they are redirected to settings with a clear error message.

---

### User Story 2 - Administrator Configures the Shared Instance (Priority: P2)

A company administrator sets up the tool once for the whole organisation — configuring the shared Redmine URL and any company-wide defaults — so employees only need to supply their personal API key.

**Why this priority**: Without a centralised configuration, every employee must know and manually enter the Redmine URL, which is error-prone and creates support overhead.

**Independent Test**: Can be fully tested by an admin setting the Redmine URL in a central config, then a new user opening the tool and seeing the URL pre-filled, needing only to enter their API key.

**Acceptance Scenarios**:

1. **Given** an admin has set the company Redmine URL in the central configuration, **When** a new employee opens the tool, **Then** the Redmine URL is pre-filled and not editable by the employee.
2. **Given** the central configuration is updated, **When** any employee reloads the tool, **Then** they see the updated configuration without needing to change their personal settings.
3. **Given** no central configuration exists, **When** an employee opens the tool, **Then** the tool falls back to allowing the employee to enter the Redmine URL themselves (backward-compatible behaviour).

---

### User Story 3 - Employee Uses the Tool Without IT Help (Priority: P3)

A new employee can onboard themselves — visiting the tool URL, entering their API key, and logging their first time entry — without reading documentation or contacting IT.

**Why this priority**: Self-service onboarding reduces IT overhead and is a key indicator of professional-grade usability, but it depends on Stories 1 and 2 being in place first.

**Independent Test**: Can be fully tested by a first-time user completing onboarding and logging one time entry in under 3 minutes without assistance.

**Acceptance Scenarios**:

1. **Given** a first-time employee visits the tool URL, **When** no API key is configured, **Then** they are shown a clear setup screen explaining what the API key is and where to find it in Redmine.
2. **Given** an employee completes setup, **When** they navigate to the calendar, **Then** their time entries load without any additional steps.

---

### Edge Cases

- What happens if the admin configuration is unreachable or malformed?
- What happens if two employees use the same browser profile (shared workstation)?
- What happens when an employee clears their browser cookies/storage — do they need to re-enter only their API key, or everything?
- What if the company uses multiple Redmine instances?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The tool MUST be deployable to a shared web server so multiple employees can access it via a single URL.
- **FR-002**: Each user's Redmine API key MUST be stored only in their own browser, never on the server.
- **FR-003**: The tool MUST support a central configuration for the company Redmine URL, set by an administrator, that applies to all users.
- **FR-004**: The central Redmine URL MUST be pre-filled for employees and not require manual entry.
- **FR-005**: Employees MUST only need to provide their personal Redmine API key to get started.
- **FR-006**: The tool MUST show a clear first-time setup screen when no API key is detected.
- **FR-007**: The setup screen MUST explain what the API key is and how to obtain it from Redmine.
- **FR-008**: The central configuration MUST be updatable by an administrator without requiring employees to change their personal settings.
- **FR-009**: The tool MUST remain functional for existing single-user deployments (no breaking change to current setup flow).

### Key Entities

- **Central Configuration**: Company-wide settings (Redmine URL, optional defaults) set once by an admin and served to all users. Not stored in individual browsers.
- **User Configuration**: Per-user settings (API key) stored only in the user's own browser. Never shared or sent to a server.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new employee can complete first-time setup and log their first time entry in under 3 minutes.
- **SC-002**: Zero personal API keys are stored on the server at any point.
- **SC-003**: An administrator can update the central Redmine URL and all users see the change on next page load without any action on their part.
- **SC-004**: Existing single-user deployments continue to work without any configuration changes.
- **SC-005**: Two employees using the tool simultaneously log time entries to their own respective Redmine accounts without cross-contamination.

## Assumptions

- The tool is deployed as a static web application on a company-accessible web server (e.g., internal server, intranet, or cloud hosting). No server-side user database is introduced.
- The central configuration is delivered as a static config file (e.g., `config.json`) bundled with the deployment, edited by the administrator directly.
- All users share the same Redmine instance (one company Redmine URL). Multi-instance support is out of scope.
- User identity is solely the Redmine API key — no separate login, username, or password is added to this tool.
- Browser storage (cookies or localStorage) remains the mechanism for per-user data, consistent with the existing implementation.
- An "administrator" in this context is a person with access to the web server file system or deployment pipeline, not a special in-app role.
