# UAT Quickstart: Feedback — Create Ticket Instead of Sending Email

**Feature**: 049 | **Branch**: `049-feedback-ticket-creation`

## Prerequisites

- A running dev environment (`npm run dev`).
- A Redmine instance accessible via the configured CORS proxy.
- A Redmine project ID to use as `redmineProjectId`.
- A GitHub repository (can be a personal test repo) for the GitHub path.

---

## Scenario 1 — Redmine path: basic ticket creation

- [x] Set `config.json`: `"feedback": { "system": "redmine", "redmineProjectId": <id> }` and reload.
- [x] Click the feedback toolbar button (💬) to open the feedback dialog.
- [x] Select a category (Bug Report or Suggestion), enter a **subject**, and enter a description.
- [x] Verify the ticket subject equals the **subject field** (not the description's first line) and the description forms the ticket body.
- [x] Verify the opt-in checkbox is **unchecked by default** and the context preview `<details>` is hidden.
- [x] Click **Submit** without checking the context checkbox.
- [x] Verify a success toast appears containing a clickable link to the new Redmine issue.
- [x] Open the link and confirm the issue description contains only the feedback text — no screenshot, no logs.

---

## Scenario 2 — Redmine path: ticket with diagnostic context

- [x] Open the feedback dialog (category = Bug Report, subject + description entered).
- [x] Read the consent disclosure warning text visible next to the checkbox.
- [x] Check the opt-in checkbox — verify the context preview (`<details>`) becomes visible (Environment + logs, **no** screenshot).
- [x] In the separate **Screenshot** section, click **Add Screenshot** and capture one.
- [x] Click **Submit**.
- [x] Verify the success toast links to a Redmine issue that has a `screenshot.png` attachment.
- [x] Open the Redmine issue and confirm the description contains Environment, Error Log, Network Log, App Log, and Calendar State sections.
- [x] Verify that network log URLs in the issue description contain **no query strings or fragments** (scheme+host+path only).

---

## Scenario 3 — Redmine path: API error handling

- [x] Temporarily break the Redmine API (e.g. use a wrong `redmineProjectId` that returns 404, or disconnect the proxy).
- [x] Submit feedback.
- [x] Verify an error toast appears with a human-readable message.
- [x] Verify the description text is still present in the dialog form (not cleared).

---

## Scenario 4 — GitHub path: prefilled form

- [ ] Set `config.json`: `"feedback": { "system": "github", "githubOwner": "<owner>", "githubRepo": "<repo>" }` and reload.
- [ ] Click the feedback toolbar button, enter a description, and click **Submit**.
- [ ] Verify a new browser tab opens at `https://github.com/<owner>/<repo>/issues/new?title=…&body=…` with title and body prefilled from the feedback.
- [ ] Verify a confirmation toast appears stating the GitHub form was **opened** (not "created").
- [ ] Inspect `config.json` and all network requests — confirm no GitHub token or credential appears anywhere.

---

## Scenario 5 — GitHub path: context in prefilled body

- [ ] (GitHub config active) Open feedback, check the opt-in checkbox, submit.
- [ ] Verify the prefilled GitHub body contains textual diagnostic context (environment, logs).
- [ ] Verify the UI shows a note instructing the user to paste the screenshot manually.
- [ ] Verify the total URL length does not exceed 8 000 characters (check in browser address bar or DevTools).

---

## Scenario 6 — No feedback config

- [ ] Remove the `feedback` key from `config.json` (and ensure `feedbackEmail` is also absent), reload.
- [ ] Verify the feedback toolbar button is **not shown** (initFeedback no-ops).
- [ ] If `feedbackEmail` is set but `feedback` is absent, verify the feedback button **is shown** (backward compatibility guard) but submission shows a "Feedback is not configured" error toast.

---

## Scenario 7 — Input validation

- [ ] Open the feedback dialog and click **Submit** without entering a description.
- [ ] Verify an inline validation error appears and no network request is made.
- [ ] Verify the category dropdown shows an error if no category is selected.

---

## Scenario 8 — Localization

- [ ] Open the app with German locale (set `navigator.languages` override or use `?lang=de`).
- [ ] Open the feedback dialog and verify all new strings (checkbox label, consent warning, toast messages) appear in German.
- [ ] Repeat with English locale and confirm English strings.

---

## Scenario 9 — Email removal verification

- [ ] Confirm `js/feedback-email.js` no longer exists in the repository.
- [ ] Confirm `feedback.js` no longer imports from `outlook.js` or `feedback-email.js`.
- [ ] Confirm no `mailto:` link is opened by any feedback submission path.
- [ ] Confirm no MSAL `sendFeedbackEmail` call is made during feedback submission.
