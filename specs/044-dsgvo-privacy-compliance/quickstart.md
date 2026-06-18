# Quickstart / UAT Validation Guide: DSGVO Privacy Compliance

**Feature**: 044-dsgvo-privacy-compliance | **Date**: 2026-06-18

## Prerequisites

- Dev server running: `npm run dev` (HTTPS + proxies on https://localhost:3000)
- Browser: Chromium (Playwright default)
- `tests/fixtures/config.json` includes the four new admin fields (see `contracts/config-schema.md`)
- Browser storage cleared before each scenario (DevTools → Application → Clear site data)

---

## Scenario 1 — Privacy Notice Reachability and Content

- [ ] Open `https://localhost:3000/settings.html`. Verify a "Privacy" (or "Datenschutz" in DE locale) link appears in the Settings footer, adjacent to the existing "Licenses" link.
- [ ] Click the Privacy footer link. Verify `privacy.html` opens without authentication and without console errors.
- [ ] Confirm the page renders in the current app locale (English if EN, German if DE).
- [ ] Verify the page contains sections covering: data categories collected by planning features, processing purposes, legal basis (Art. 6 GDPR), retention periods, data recipients (including AI provider names), and user rights (Art. 15–17 GDPR).
- [ ] Confirm the active retention period shown on the page matches `planningDataRetentionDays` from `tests/fixtures/config.json` (default: 30 days).
- [ ] Confirm the data controller name and DPO contact shown on the page match the values set in `tests/fixtures/config.json`.
- [ ] Switch the app to the other locale (EN ↔ DE) and reload `privacy.html`. Verify the page renders fully in the new locale with no untranslated strings.

---

## Scenario 2 — Delete Planning Data

- [ ] Manually write a planning-related localStorage key in DevTools (e.g. `localStorage.setItem('redmine_calendar_ai_consent', JSON.stringify({ consentedAt: new Date().toISOString(), withdrawnAt: null }))`).
- [ ] Open Settings. Verify a "Delete planning data" button is visible in the Settings page.
- [ ] Click the button. Verify a confirmation prompt appears before any deletion occurs.
- [ ] Cancel the confirmation. Verify no storage keys were removed (inspect DevTools → Application → Local Storage).
- [ ] Click the button again and confirm. Verify a success notification appears.
- [ ] Inspect DevTools → Application → Local Storage. Confirm no `redmine_calendar_ai_consent` or `redmine_calendar_planning_snapshot_*` keys remain.
- [ ] Confirm that credential keys (e.g. `redmine_calendar_credentials`) and non-planning preference keys are untouched.
- [ ] Click the button again with no planning data present. Verify the action completes gracefully with a confirmation and no error.

---

## Scenario 3 — AI Data-Sharing Consent Gate

- [ ] Ensure browser storage is clear (no consent record). Open the app and trigger a chatbot planning action (e.g. ask the AI to "book my Outlook day" or use another planning-data tool).
- [ ] Verify a consent/disclosure modal appears before the AI tool result is returned, naming the AI provider and describing what data is sent.
- [ ] Click "Decline" (or equivalent). Verify the planning action is cancelled and no planning data appears in the AI response.
- [ ] Trigger the same planning action again. Verify the consent modal appears again (not skipped after a single decline).
- [ ] Click "Accept" in the consent modal. Verify the planning action proceeds and the AI receives the planning data.
- [ ] Inspect DevTools → Local Storage. Confirm `redmine_calendar_ai_consent` exists with a `consentedAt` timestamp and `withdrawnAt: null`.
- [ ] Trigger a second planning AI action without reloading. Verify the consent modal does NOT appear a second time.
- [ ] Reload the page and trigger a planning AI action again. Verify the consent modal still does not appear (consent persists across page loads).

---

## Scenario 4 — Consent Withdrawal

- [ ] With active consent recorded (from Scenario 3), open Settings. Verify a consent status indicator or "Withdraw AI consent" option is visible.
- [ ] Activate the withdrawal (toggle off or click withdraw). Verify a confirmation notification is shown.
- [ ] Inspect DevTools → Local Storage. Confirm `redmine_calendar_ai_consent` now has a `withdrawnAt` timestamp ≥ `consentedAt`.
- [ ] Trigger a planning AI action. Verify the consent modal appears again (consent was reset).

---

## Scenario 5 — "My Stored Planning Data" View (Art. 15)

- [ ] With at least one planning storage key present (from Scenario 3 — the consent record), open Settings.
- [ ] Expand the collapsible "My stored planning data" section. Verify it appears and lists the `redmine_calendar_ai_consent` key with its value in human-readable form (e.g. formatted timestamps).
- [ ] Verify the section is empty or shows "No planning data stored" when no planning keys are present.

---

## Scenario 6 — Startup Retention Cleanup

- [ ] Write a `redmine_calendar_planning_snapshot_test` key with a `_writtenAt` timestamp older than 30 days: `localStorage.setItem('redmine_calendar_planning_snapshot_test', JSON.stringify({ _writtenAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString() }))`.
- [ ] Reload the app. Verify the expired key is removed (check DevTools → Local Storage after load).
- [ ] Write a `redmine_calendar_planning_snapshot_recent` key with `_writtenAt` = now. Reload. Verify the recent key is NOT removed.

---

## Scenario 7 — DSGVO Impact Checklist Artifact

- [ ] Verify `specs/044-dsgvo-privacy-compliance/checklists/dsgvo-impact.md` exists and contains the five trigger questions from FR-014.
- [ ] Verify CLAUDE.md "Housekeeping" section references the DSGVO impact checklist.

---

## Automated Test Coverage

The following scenarios map to automated tests:

| Scenario | Test type | File |
|----------|-----------|------|
| Consent record create / read / withdraw | Unit (Node) | `tests/unit/privacy-store.test.js` |
| `deletePlanningData()` return value | Unit (Node) | `tests/unit/privacy-store.test.js` |
| `runRetentionCleanup()` expiry logic | Unit (Node) | `tests/unit/privacy-store.test.js` |
| Privacy footer link reachable | Playwright | `tests/ui/privacy.spec.js` |
| Consent modal shown / suppressed | Playwright | `tests/ui/chatbot-consent.spec.js` |
| Delete planning data button flow | Playwright | `tests/ui/settings-privacy.spec.js` |
| Data viewer shows / hides keys | Playwright | `tests/ui/settings-privacy.spec.js` |
