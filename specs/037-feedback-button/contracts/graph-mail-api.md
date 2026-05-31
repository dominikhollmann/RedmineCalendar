# Contract: Microsoft Graph sendMail API

## Endpoint

```
POST https://graph.microsoft.com/v1.0/me/sendMail
```

## Authentication

Bearer token acquired via MSAL with scope `Mail.Send`. A dedicated `acquireFeedbackToken()` function in `js/outlook.js` handles this separately from the calendar token (`Calendars.Read`), so users who only use the calendar are never prompted for mail permissions.

## Request — Bug Report (with screenshot)

```json
{
  "message": {
    "subject": "Bug Report — RedmineCalendar [{{timestamp}}]",
    "body": {
      "contentType": "HTML",
      "content": "<html>…rich HTML body — see template below…</html>"
    },
    "toRecipients": [{ "emailAddress": { "address": "{{feedbackEmail}}" } }],
    "attachments": [
      {
        "@odata.type": "#microsoft.graph.fileAttachment",
        "name": "screenshot.png",
        "contentType": "image/png",
        "contentBytes": "{{base64PngWithoutDataUriPrefix}}"
      }
    ]
  },
  "saveToSentItems": false
}
```

The `contentBytes` value is the raw base64 string extracted from the `data:image/png;base64,` data URI — the `data:image/png;base64,` prefix is stripped before sending.

## Request — Suggestion (no attachment)

Same structure, subject prefix `Suggestion —`, `attachments` array omitted entirely.

## Request — Bug Report (screenshot unavailable)

Same as Bug Report but `attachments` array omitted. HTML body notes "Screenshot unavailable."

## HTML Email Body Template

The HTML body contains these sections in order:

1. **Header**: category badge (Bug Report / Suggestion), timestamp, submitter identity
2. **Description**: user-typed text in a `<blockquote>`
3. **Environment**: URL, user-agent, OS, viewport dimensions
4. **Screenshot**: inline `<img src="cid:screenshot.png">` reference when attachment present; "Screenshot unavailable" note otherwise
5. **Errors** (Bug Report only): ordered list of error messages + stack traces in `<pre>`
6. **Network Log** (Bug Report only): `<table>` of URL, method, status, response-time — failed requests (status 0 or ≥ 400) highlighted in red
7. **App Log** (Bug Report only): `<pre>` block of log entries
8. **Calendar State** (Bug Report only): view name, visible start/end dates
9. **localStorage Snapshot** (Bug Report only): `<table>` of key → value pairs

## Error Handling

| Graph error                     | User-visible action                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| `401 / token expired`           | Re-acquire token silently; if fails, dialog shows error and stays open              |
| `403 / Mail.Send not consented` | Dialog shows "Could not send — please contact your admin to grant mail permissions" |
| Network failure                 | Dialog shows error and stays open; description text is preserved                    |
| Any other non-2xx               | Dialog shows generic send error; description text is preserved                      |

## Fallback: mailto URL

When Office 365 is unavailable, the app opens a `mailto:` link:

```
mailto:{{feedbackEmail}}?subject={{encoded_subject}}&body={{encoded_plain_text_body}}
```

The plain-text body contains: category, description, submitter, URL, user-agent, OS, viewport. Screenshots and large log payloads are **not** included (mailto: body length limit ~2000 characters). The body is truncated with a note if it would exceed 1800 characters.
