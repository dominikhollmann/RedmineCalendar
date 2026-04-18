# Quickstart & Acceptance Tests: Multi-User Deployment

## Setup

1. Ensure `config.json` exists in the app root with valid Redmine URL
2. Start the web server: `npm run serve`
3. Start the CORS proxy for Redmine
4. (Optional) Start the AI proxy if AI assistant is configured

## Acceptance Tests

### US1 — Employee Accesses the Tool

- [x] Open the tool URL in a browser with no prior settings
- [x] Verify the settings page appears with Redmine URL pre-filled from config.json and not editable
- [x] Enter a valid Redmine API key and save
- [x] Verify the calendar loads with the user's time entries
- [x] Close and reopen the browser — verify the calendar loads without re-entering the key
- [ ] Open the tool in a second browser profile with a different API key — verify each sees their own entries

### US2 — Administrator Configures the Shared Instance

- [x] Create a `config.json` with the company Redmine URL and AI settings
- [x] Open the tool — verify Redmine URL is shown as read-only
- [x] Update `config.json` (e.g., change AI model) — reload the tool and verify the change is reflected
- [x] Delete or corrupt `config.json` — verify the tool shows a clear error message

### US3 — Self-Service Onboarding

- [x] Open the tool as a first-time user (no API key saved)
- [x] Verify the setup screen explains what the API key is and where to find it in Redmine
- [x] Complete setup and log a time entry — should take under 3 minutes total

### US4 — Credentials Protected at Rest

- [x] Save an API key in settings
- [x] Open DevTools → Application → localStorage — verify the stored value is encrypted (base64 ciphertext, not readable API key)
- [x] Open DevTools → Application → IndexedDB → redmine_calendar_keystore — verify the key shows as `[CryptoKey]` (not extractable)
- [x] Open DevTools → Application → Cookies — verify no plain-text credentials in cookies
- [x] Clear IndexedDB (simulating key loss) — reload the tool and verify it redirects to settings with a message to re-enter credentials

### FR-016/FR-017 — Shared CORS Proxy

- [x] Verify the tool uses the proxy URL from `config.json` (not a locally configured one)
- [x] Verify no user needs to run `npx lcp` locally in production mode

### FR-018 — Centralized AI Key

- [x] Verify the AI assistant works using the company API key from `config.json`
- [x] Verify the settings page does not ask users for an AI API key

### Edge Cases

- [x] Malformed `config.json` (invalid JSON) — tool shows error, not a blank page
- [x] Missing required field in `config.json` (e.g., no `redmineUrl`) — tool shows specific error
- [x] Invalid API key — settings page shows auth error, does not save the bad key
- [x] Browser data cleared — user can re-enter API key and resume; preferences are lost but recoverable
