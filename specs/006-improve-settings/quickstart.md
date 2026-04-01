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
- [ ] Open `settings.html`
- [ ] Verify a "Redmine Server URL" input field is visible (separate from "Redmine proxy URL")

### T002 — Proxy start command tip updates dynamically
- [ ] Enter `https://company.redmine.com` in the Redmine Server URL field
- [ ] Verify the settings page shows a command hint that includes `https://company.redmine.com` (e.g., `lcp --proxyUrl https://company.redmine.com --port 8010`)

### T003 — Both URLs persist after save
- [ ] Fill in both URL fields and valid API key, save successfully
- [ ] Reopen `settings.html`
- [ ] Verify both URL fields are pre-filled with the saved values

### T004 — Empty URL prevents save
- [ ] Clear the proxy URL field, attempt to save
- [ ] Verify a validation error is shown and the form is not submitted

### T005 — Malformed URL shows validation error
- [ ] Enter `not-a-url` in the proxy URL field, attempt to save
- [ ] Verify a validation error is shown

---

## US2: Conditional Auth Fields

### T006 — API Key mode shows only API key field
- [ ] Select "API Key" radio
- [ ] Verify only the API key input is visible
- [ ] Verify username and password inputs are hidden

### T007 — Username & Password mode shows only username/password fields
- [ ] Select "Username & Password" radio
- [ ] Verify only username and password inputs are visible
- [ ] Verify API key input is hidden

### T008 — Anonymous Mode shows no credential fields
- [ ] Select "Anonymous Mode" radio
- [ ] Verify no credential inputs (API key, username, password) are visible

### T009 — Switching modes preserves entered values
- [ ] Select "API Key", enter `my-api-key`
- [ ] Switch to "Username & Password", enter username `user1` and password `pass1`
- [ ] Switch back to "API Key"
- [ ] Verify API key field still shows `my-api-key`
- [ ] Switch to "Username & Password"
- [ ] Verify username is still `user1` and password is still `pass1`

### T010 — All credentials persist across page reload
- [ ] Enter values in all credential fields across all modes (by switching between them)
- [ ] Save successfully (use any mode)
- [ ] Reload `settings.html`
- [ ] Switch to each mode and verify the previously entered credentials are pre-filled in the (possibly hidden) fields

---

## US3: Anonymous Mode

### T011 — Anonymous Mode option is available
- [ ] Open `settings.html`
- [ ] Verify "Anonymous Mode" is listed as a radio option alongside "API Key" and "Username & Password"

### T012 — Anonymous Mode can be saved without credentials
- [ ] Select "Anonymous Mode"
- [ ] Fill in proxy URL, leave all credential fields empty
- [ ] Click "Save & Connect"
- [ ] Verify save succeeds and redirects to `index.html` (no credential verification step)

### T013 — Anonymous Mode is pre-selected after save
- [ ] After T012, reopen `settings.html`
- [ ] Verify "Anonymous Mode" radio is pre-selected

### T014 — API requests in Anonymous Mode have no auth headers
- [ ] With Anonymous Mode saved, open `index.html`
- [ ] Open DevTools → Network
- [ ] Verify outgoing API requests contain no `X-Redmine-API-Key` header and no `Authorization` header

---

## US4: Authentication Error Feedback

### T015 — Invalid API key shows inline error
- [ ] Select "API Key" mode, enter a deliberately wrong API key (e.g., `wrong-key-12345`)
- [ ] Enter valid proxy URL, click "Save & Connect"
- [ ] Verify an inline error message appears on the settings page
- [ ] Verify the page does NOT navigate away to `index.html`

### T016 — Wrong username/password shows inline error
- [ ] Select "Username & Password" mode, enter wrong credentials
- [ ] Click "Save & Connect"
- [ ] Verify inline error message appears, page stays on settings

### T017 — Error message does not say "Anonymous Mode" or redirect anonymously
- [ ] After T015 or T016, verify the error is a connection/auth failure message
- [ ] Verify `authType` in the cookie is NOT changed to `"anonymous"`

### T018 — Config cookie is NOT written on auth failure
- [ ] Clear the cookie, fill in wrong API key, attempt save
- [ ] Verify cookie is not created (or not updated if one existed) after the failed attempt

### T019 — Correcting credentials and re-saving succeeds
- [ ] After a failed save (T015), correct the API key to a valid one
- [ ] Click "Save & Connect" again
- [ ] Verify save succeeds and navigates to `index.html`

### T020 — 403 response still proceeds to calendar
- [ ] With valid credentials on a Redmine instance that blocks `/users/current` with 403
- [ ] Click "Save & Connect"
- [ ] Verify the app proceeds to `index.html` (403 = "server reachable, permission denied on this endpoint", not auth failure)

---

## Regression Checks

### T021 — Working hours field still functions
- [ ] Enter start `09:00` and end `17:00`, save
- [ ] Reopen settings, verify working hours are pre-filled

### T022 — Existing API-key cookie from previous version loads correctly
- [ ] Manually set a cookie with the old format: `{"redmineUrl":"http://localhost:8010","apiKey":"abc123"}`
- [ ] Open `settings.html`, verify URL and API key are pre-filled, auth mode defaults to "API Key"

### T023 — Session-expired banner still shows when redirected from app
- [ ] Manually navigate to `settings.html?expired=1`
- [ ] Verify the "Session expired" banner is visible
