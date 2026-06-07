# Quickstart: User Feedback Button (037)

## UAT Result

| Scenario                              | Result                                                |
| ------------------------------------- | ----------------------------------------------------- |
| 1 — Bug Report (O365)                 | skipped — requires O365 sign-in, not available in dev |
| 2 — Suggestion (O365)                 | skipped — requires O365 sign-in, not available in dev |
| 3 — mailto Fallback                   | ✓ passed                                              |
| 4 — Button Hidden When Not Configured | ✓ passed                                              |
| 5 — Screenshot Capture Failure        | ✓ passed (tested via getDisplayMedia cancel)          |
| 6 — Keyboard Accessibility            | ✓ passed                                              |
| 7 — Settings Page                     | ✓ passed                                              |

**UAT passed** — all testable scenarios verified.

## Prerequisites

- `npm run dev` running (HTTPS dev server + CORS proxies)
- `config.json` at repo root with the new `feedbackEmail` field:

```json
{
  "redmineUrl": "https://your-redmine.example.com",
  "feedbackEmail": "dev-team@example.com"
}
```

---

## UAT Scenario 1 — Bug Report (Office 365 active)

**Setup**: Sign in to Outlook via the calendar (so MSAL is authenticated with a signed-in account).

1. Navigate to `index.html` (the calendar view).
2. Verify: a small floating button labelled "Give Feedback" is visible in the bottom-right corner.
3. Open DevTools console and run: `throw new Error("test error for feedback")` — this should be captured.
4. Click "Give Feedback".
5. Verify: dialog opens with the category selector empty.
6. Select "Bug Report".
7. Verify: the context section expands showing screenshot, error log (containing "test error for feedback"), network log, localStorage snapshot, and calendar state.
8. Leave description empty, click Submit.
9. Verify: submission is blocked with a validation message requesting a description.
10. Type "This is a test bug report" in the description field.
11. Click Submit.
12. Verify: email arrives at `feedbackEmail` with:
    - Subject containing "Bug Report"
    - HTML body with all context sections
    - `screenshot.png` attachment

---

## UAT Scenario 2 — Suggestion (Office 365 active)

1. Click "Give Feedback".
2. Select "Suggestion".
3. Verify: context section shows **only** the screenshot — no error log, no network log, no localStorage section.
4. Type "Add a dark mode for the calendar view."
5. Click Submit.
6. Verify: email arrives with subject "Suggestion —", no attachment if screenshot was unavailable, no log sections in the body.

---

## UAT Scenario 3 — mailto Fallback (Office 365 not signed in)

**Setup**: Ensure `azureClientId` is absent from `config.json` OR sign out of MSAL before testing.

1. Click "Give Feedback", select "Bug Report", enter a description.
2. Click Submit.
3. Verify: your default mail client opens with a pre-filled message:
   - Recipient: the configured `feedbackEmail`
   - Subject: "Bug Report — RedmineCalendar"
   - Body: plain text with description, URL, user-agent, OS, viewport (no screenshot, no logs)

---

## UAT Scenario 4 — Button Hidden When Not Configured

**Setup**: Remove `feedbackEmail` from `config.json` (or comment it out).

1. Hard-reload `index.html`.
2. Verify: the "Give Feedback" button is **not visible** anywhere on the page.
3. Verify: no error or placeholder is shown.

---

## UAT Scenario 5 — Screenshot Capture Failure

**Setup**: To simulate, add `window._simulateScreenshotFailure = true` in DevTools before opening the dialog (the implementation checks this flag in test/dev mode).

1. Open the feedback dialog.
2. Verify: context section shows "Screenshot unavailable" instead of an image.
3. Complete a submission.
4. Verify: submission succeeds without a screenshot; email body notes "Screenshot unavailable."

---

## UAT Scenario 6 — Keyboard Accessibility

1. Tab to the "Give Feedback" button using keyboard only and press Enter.
2. Tab through the dialog: category selector → description field → Submit → Cancel.
3. Verify: all controls are reachable and activatable via keyboard.
4. Press Escape.
5. Verify: dialog closes without submitting.

---

## UAT Scenario 7 — Settings Page

1. Navigate to `settings.html`.
2. Verify: "Give Feedback" button is visible.
3. Open the dialog, verify screenshot shows the settings page state.

---

## Development Notes

- Unit tests live in `tests/unit/feedback-context.test.js` and cover: ring-buffer limits, localStorage allowlist, OS extraction, base64 stripping, mailto truncation.
- Playwright UI tests in `tests/ui/feedback.spec.js` cover the dialog open/close, category switching, and submission flows.
- Re-run `npm run oss:generate` after adding `html2canvas` to `oss-manifest.json`.
- Re-run `npm run lint && npm run typecheck` before committing any new module.
