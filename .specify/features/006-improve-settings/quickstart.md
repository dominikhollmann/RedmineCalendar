# Quickstart & Acceptance Test: Improve Settings Page

**Branch**: `006-improve-settings` | **Date**: 2026-04-01  
**Constitution §III note**: This checklist is the compensating control for the Test-First exception. It MUST be executed in full before the feature is considered complete.

## Setup

1. Start the CORS proxy: `npm run proxy` (or `lcp --proxyUrl <your-redmine-url> --port 8010`)
2. Start the dev server: `npx serve .`
3. Open `http://localhost:3000/settings.html` in your browser
4. Clear the config cookie before each test group: open DevTools → Application → Cookies → delete `redmine_calendar_config`

---

## US1: Redmine Server URL Field

### T001 — New "Redmine Server URL" field is present
- [x] Open `settings.html`
- [x] Verify a "Redmine Server URL" input field is visible (separate from "Redmine proxy URL")

### T002 — Proxy start command tip updates dynamically
- [x] Enter `https://company.redmine.com` in the Redmine Server URL field
- [x] Verify the settings page shows a command hint that includes `https://company.redmine.com` (e.g., `lcp --proxyUrl https://company.redmine.com --port 8010`)

### T003 — Both URLs persist after save
- [x] Fill in both URL fields and valid API key, save successfully
- [x] Reopen `settings.html`
- [x] Verify both URL fields are pre-filled with the saved values

### T004 — Empty URL prevents save
- [x] Clear the proxy URL field, attempt to save
- [x] Verify a validation error is shown and the form is not submitted

### T005 — Malformed URL shows validation error
- [x] Enter `not-a-url` in the proxy URL field, attempt to save
- [x] Verify a validation error is shown

---

## US2: Conditional Auth Fields

### T006 — API Key mode shows only API key field
- [x] Select "API Key" radio
- [x] Verify only the API key input is visible
- [x] Verify username and password inputs are hidden

### T007 — Username & Password mode shows only username/password fields
- [x] Select "Username & Password" radio
- [x] Verify only username and password inputs are visible
- [x] Verify API key input is hidden

### T008 — ~~Anonymous Mode~~ (entfernt — Feature nicht mehr vorhanden)

### T009 — Switching modes preserves entered values
- [x] Select "API Key", enter `my-api-key`
- [x] Switch to "Username & Password", enter username `user1` and password `pass1`
- [x] Switch back to "API Key"
- [x] Verify API key field still shows `my-api-key`
- [x] Switch to "Username & Password"
- [x] Verify username is still `user1` and password is still `pass1`

### T010 — All credentials persist across page reload
- [x] Enter values in all credential fields across all modes (by switching between them)
- [x] Save successfully (use any mode)
- [x] Reload `settings.html`
- [x] Switch to each mode and verify the previously entered credentials are pre-filled in the (possibly hidden) fields

---

## US3: ~~Anonymous Mode~~ (entfernt — Feature nicht mehr vorhanden)

---

## US4: Authentication Error Feedback

### T015 — Invalid API key shows inline error
- [x] Select "API Key" mode, enter a deliberately wrong API key (e.g., `wrong-key-12345`)
- [x] Enter valid proxy URL, click "Save & Connect"
- [x] Verify an inline error message appears on the settings page
- [x] Verify the page does NOT navigate away to `index.html`

### T016 — Wrong username/password shows inline error
- [x] Select "Username & Password" mode, enter wrong credentials
- [x] Click "Save & Connect"
- [x] Verify inline error message appears, page stays on settings

### T017 — Error message is a connection/auth failure message
- [x] After T015 or T016, verify the error is a connection/auth failure message

### T018 — Config cookie is NOT written on auth failure
- [x] Clear the cookie, fill in wrong API key, attempt save
- [x] Verify cookie is not created (or not updated if one existed) after the failed attempt

### T019 — Correcting credentials and re-saving succeeds
- [x] After a failed save (T015), correct the API key to a valid one
- [x] Click "Save & Connect" again
- [x] Verify save succeeds and navigates to `index.html`

### T020 — 403 response still proceeds to calendar *(nicht testbar — erfordert spezifische Redmine-Konfiguration)*

---

## Regression Checks

### T021 — Working hours field still functions
- [x] Enter start `09:00` and end `17:00`, save
- [x] Reopen settings, verify working hours are pre-filled

### T022 — Existing API-key cookie from previous version loads correctly *(nicht testbar — erfordert manuelles Cookie-Setup)*

### T023 — ~~Session-expired banner~~ (entfernt — Auth-Fehler werden jetzt direkt im Kalender angezeigt, kein Redirect mehr)
