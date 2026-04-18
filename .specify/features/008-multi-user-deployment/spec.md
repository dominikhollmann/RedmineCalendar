# Feature Specification: Professional Multi-User Deployment & Security Hardening

**Feature Branch**: `008-multi-user-deployment`  
**Created**: 2026-04-12  
**Updated**: 2026-04-18  
**Status**: Draft  
**Input**: User description: "Professional deployment - Extend tool for use in company environment with multiple users" + "also revisit security, e.g., encrypting keys/passwords"

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
3. **Given** the central configuration is missing or malformed, **When** an employee opens the tool, **Then** the tool shows a clear error message indicating that admin configuration is required.

---

### User Story 3 - Employee Uses the Tool Without IT Help (Priority: P3)

A new employee can onboard themselves — visiting the tool URL, entering their API key, and logging their first time entry — without reading documentation or contacting IT.

**Why this priority**: Self-service onboarding reduces IT overhead and is a key indicator of professional-grade usability, but it depends on Stories 1 and 2 being in place first.

**Independent Test**: Can be fully tested by a first-time user completing onboarding and logging one time entry in under 3 minutes without assistance.

**Acceptance Scenarios**:

1. **Given** a first-time employee visits the tool URL, **When** no API key is configured, **Then** they are shown a clear setup screen explaining what the API key is and where to find it in Redmine.
2. **Given** an employee completes setup, **When** they navigate to the calendar, **Then** their time entries load without any additional steps.

---

### User Story 4 - Credentials Are Protected at Rest (Priority: P4)

An employee's Redmine API key and any other credentials (including the AI API key from feature 014) are stored securely in the browser so that a casual observer, browser extension, or XSS attack cannot trivially read them in plain text.

**Why this priority**: In a multi-user company environment, the risk of credential exposure increases — shared workstations, browser extensions with storage access, or a colleague inspecting DevTools. Encrypting or obfuscating stored credentials reduces this attack surface. Depends on Stories 1–3 being in place first.

**Independent Test**: Can be tested by opening the browser's cookie/storage inspector and verifying that stored credentials are not visible as plain text.

**Acceptance Scenarios**:

1. **Given** an employee has saved their API key, **When** someone inspects the browser cookies or localStorage via DevTools, **Then** the API key value is not visible in plain text.
2. **Given** an employee has saved both a Redmine API key and an AI API key, **When** the credential storage is inspected, **Then** neither key is readable without the application's own decryption logic.
3. **Given** an employee opens the settings page, **When** they view the API key field, **Then** the key is shown masked (password field) and can only be revealed intentionally.
4. **Given** the application code is inspected, **When** the encryption/obfuscation mechanism is examined, **Then** it uses a standard approach (not security-through-obscurity) — e.g., the Web Crypto API with a device-derived key.

---

### Edge Cases

- What happens if the admin configuration is unreachable or malformed?
- What happens if two employees use the same browser profile (shared workstation)? (Resolved: separate Windows logins guarantee separate browser profiles; no multi-user-per-browser support needed.)
- What happens when an employee clears their browser cookies/storage — do they need to re-enter only their API key, or everything?
- What if the company uses multiple Redmine instances?
- What happens if the encryption key is lost or the user switches browsers — can they still access their credentials? (Assumed: re-entering the API key is acceptable; no cross-browser key recovery is needed.)
- What level of encryption is sufficient — full cryptographic protection or obfuscation against casual inspection? (Assumed: use the Web Crypto API or equivalent standard; security-through-obscurity is not acceptable.)
- Should password-based authentication (username/password) be removed in favour of API-key-only? (Assumed: both auth methods remain available; both are encrypted at rest.)

## Clarifications

### Session 2026-04-18

- Q: How should CORS proxying work in production (50–100 users)? → A: Shared CORS proxy or reverse proxy managed by admin; users don't run their own.
- Q: How to handle shared workstations? → A: One user per browser profile; separate Windows logins guarantee separate profiles.
- Q: How should the AI proxy/key work in production? → A: Shared AI proxy with company-wide API key managed centrally; users don't need their own AI key.
- Q: Where should the central config file live? → A: `config.json` in the app root directory, next to `index.html`.
- Q: Is backward compatibility with single-user mode needed? → A: No. The tool is not yet in use; no fallback to single-user mode required. `config.json` is mandatory.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The tool MUST be deployable to a shared web server so multiple employees can access it via a single URL.
- **FR-002**: Each user's Redmine API key MUST be stored only in their own browser, never on the server.
- **FR-003**: The tool MUST support a central configuration for admin-managed settings (Redmine URL, AI assistant provider/model, AI API key, CORS proxy URL, AI proxy URL) that applies to all users.
- **FR-004**: Admin-managed settings MUST be pre-filled for employees and not editable by them.
- **FR-005**: Employees MUST only need to provide their personal Redmine API key to get started. All other user-specific settings (working hours, view preferences, etc.) remain per-user.
- **FR-018**: In a multi-user deployment, the AI assistant MUST use a company-wide API key configured centrally by the administrator. Individual users MUST NOT need to provide their own AI API key.
- **FR-006**: The tool MUST show a clear first-time setup screen when no API key is detected.
- **FR-007**: The setup screen MUST explain what the API key is and how to obtain it from Redmine.
- **FR-008**: The central configuration MUST be updatable by an administrator without requiring employees to change their personal settings.
- **FR-009**: The tool MUST require a valid `config.json` in the app root. If it is missing or malformed, the tool MUST show a clear error message directing the administrator to create it.
- **FR-010**: All credentials (Redmine API key, AI API key, username/password) MUST be encrypted before being stored in the browser. Plain-text credentials MUST NOT be persisted in cookies or localStorage.
- **FR-011**: The encryption mechanism MUST use a standard cryptographic approach (not custom obfuscation) and MUST be resistant to casual inspection via browser DevTools.
- **FR-012**: The application MUST be able to decrypt stored credentials at runtime without requiring the user to enter a separate password or passphrase.
- **FR-013**: If stored credentials cannot be decrypted (e.g., corruption or browser migration), the application MUST redirect to settings with a clear message asking the user to re-enter their credentials.
- **FR-014**: The README MUST include deployment instructions covering both local development and shared company hosting scenarios.
- **FR-015**: The deployment MUST work with a simple static file server — no application server, runtime, or database required.
- **FR-016**: In a multi-user deployment, CORS proxying MUST be handled by a shared proxy or reverse proxy configured by the administrator. Individual users MUST NOT need to run their own CORS proxy.
- **FR-017**: The central configuration MUST include the CORS proxy URL so users connect through it automatically.

### Key Entities

- **Central Configuration**: Company-wide settings (Redmine URL, AI assistant provider/model, optional defaults) set once by an admin and served to all users. Not stored in individual browsers.
- **User Configuration**: Per-user settings (API key) stored only in the user's own browser. Never shared or sent to a server.
- **Encrypted Credential Store**: The browser-side storage mechanism that holds credentials in encrypted form, decryptable only by the application running in the same browser origin.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new employee can complete first-time setup and log their first time entry in under 3 minutes.
- **SC-002**: Zero personal API keys are stored on the server at any point.
- **SC-003**: An administrator can update the central configuration (Redmine URL, AI settings) and all users see the change on next page load without any action on their part.
- **SC-005**: Two employees using the tool simultaneously log time entries to their own respective Redmine accounts without cross-contamination.
- **SC-006**: No credential value (API key, password) is visible in plain text when inspecting browser cookies or localStorage via DevTools.
- **SC-007**: Credentials are usable by the application immediately after page load without requiring the user to enter a decryption passphrase.

## Assumptions

- The tool is a static web application — no server-side runtime, database, or build step. Deployment means copying files to any web server (company intranet server, cloud hosting, or `npm run serve` locally for development).
- The README will include step-by-step deployment instructions for both scenarios (local dev and shared hosting).
- The central configuration is delivered as a static `config.json` file in the app root directory (next to `index.html`), edited by the administrator directly.
- Expected user base is 50–100 employees.
- All users share the same Redmine instance (one company Redmine URL). Multi-instance support is out of scope.
- The production Redmine instance is hosted on-premise within the company intranet; users access it via VPN. For development and testing, a public Easy Redmine cloud instance is used instead.
- In production, a shared CORS proxy or reverse proxy (admin-managed) handles Redmine API requests for all users. Similarly, a shared AI proxy with a company-wide Anthropic API key handles AI assistant requests. The per-user local proxies (`npx lcp`) are only used in single-user/development mode.
- User identity is solely the Redmine API key — no separate login, username, or password is added to this tool.
- Browser storage (cookies or localStorage) remains the mechanism for per-user data, consistent with the existing implementation. Each employee has a separate Windows login and therefore a separate browser profile — no multi-user-per-browser support is needed.
- An "administrator" in this context is a person with access to the web server file system or deployment pipeline, not a special in-app role. Admin-managed settings include: Redmine URL, CORS proxy URL, AI assistant provider/model, AI API key, AI proxy URL. User-managed settings include: Redmine API key, working hours, view preferences, favourites.
- Credential encryption uses browser-native APIs (e.g., Web Crypto API) with a key derived from the browser origin or a device-specific value. No user-supplied passphrase is required.
- Encryption protects against casual inspection (DevTools, browser extensions reading cookies/storage). It does not protect against a determined attacker with full access to the user's browser profile and application source code — that threat model requires server-side credential management, which is out of scope.
- No backward compatibility with the current single-user setup is required. The tool is not yet in use; the existing cookie-based settings flow will be replaced entirely.
