# Data Model: Improve Settings Page

**Branch**: `006-improve-settings` | **Date**: 2026-04-01

## Cookie Schema: `redmine_calendar_config`

The cookie stores a JSON object with the following shape (all fields top-level):

```json
{
  "redmineUrl":       "http://localhost:8010",
  "redmineServerUrl": "https://company.redmine.com",
  "authType":         "apikey | basic | anonymous",
  "apiKey":           "...",
  "username":         "...",
  "password":         "..."
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `redmineUrl` | string (URL) | always | Proxy base URL used for all API requests. Default: `http://localhost:8010`. |
| `redmineServerUrl` | string (URL) | optional | The real Redmine server URL. Stored for reference; used to generate the proxy start command shown in settings. May be empty for existing configs. |
| `authType` | `"apikey"` \| `"basic"` \| `"anonymous"` | always | Selected authentication mode. |
| `apiKey` | string | when `authType = "apikey"` | Redmine API key. Persisted even when another mode is active. |
| `username` | string | when `authType = "basic"` | Redmine login username. Persisted even when another mode is active. |
| `password` | string | when `authType = "basic"` | Redmine login password. Persisted even when another mode is active. |

### Validity Rules (enforced by `readConfig()`)

- `redmineUrl` must be a non-empty string.
- `authType` must be one of `"apikey"`, `"basic"`, `"anonymous"`.
- If `authType = "apikey"`: `apiKey` must be a non-empty string.
- If `authType = "basic"`: `username` and `password` must both be non-empty strings.
- If `authType = "anonymous"`: no credential fields are required.
- Configs missing `authType` default to `"apikey"` for backward compatibility.

### Backward Compatibility

Existing cookies without `authType` continue to work: `readConfig()` treats a missing or undefined `authType` as `"apikey"` (same as today). Existing cookies without `redmineServerUrl` are valid (field is optional).

## State Transitions: Auth Mode

```
         ┌──────────┐
         │  apikey  │◄──────────────────┐
         └──────────┘                   │
              │ user selects             │ user selects
              ▼                         │
         ┌──────────┐        ┌──────────────┐
         │  basic   │◄──────►│  anonymous   │
         └──────────┘        └──────────────┘
```

Switching mode:
- Hides/shows the relevant credential fields
- Does NOT clear stored field values (fields remain pre-filled with last-entered values)
- Takes effect at save time only

## Settings Form Fields → Cookie Mapping

| Form Field | DOM id | Cookie field | Visible when |
|------------|--------|--------------|--------------|
| Redmine proxy URL | `redmineUrl` | `redmineUrl` | always |
| Redmine server URL | `redmineServerUrl` | `redmineServerUrl` | always |
| Auth mode | `authType` (radio) | `authType` | always |
| API key | `apiKey` | `apiKey` | `authType = apikey` |
| Username | `username` | `username` | `authType = basic` |
| Password | `password` | `password` | `authType = basic` |
| Work start | `workStart` | `localStorage` key | always |
| Work end | `workEnd` | `localStorage` key | always |
