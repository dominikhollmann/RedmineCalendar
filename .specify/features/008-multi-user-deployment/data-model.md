# Data Model: Multi-User Deployment

## Central Configuration (config.json — server-side, admin-managed)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| redmineUrl | string | yes | CORS proxy URL for Redmine API requests (what the browser hits) |
| redmineServerUrl | string | yes | Actual Redmine server URL (for HTTPS validation, proxy tip) |
| aiProvider | string | no | AI provider identifier (e.g., "anthropic") |
| aiModel | string | no | AI model identifier |
| aiApiKey | string | no | Company-wide AI API key |
| aiProxyUrl | string | no | AI proxy URL for assistant requests |

**Lifecycle**: Created once by admin. Updated by editing the file on the server. Read by every client on page load.

## User Configuration (browser-side, encrypted in localStorage)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| authType | "apikey" \| "basic" | yes | Authentication method |
| apiKey | string | conditional | Redmine API key (required if authType=apikey) |
| username | string | conditional | Redmine username (required if authType=basic) |
| password | string | conditional | Redmine password (required if authType=basic) |

**Storage**: Encrypted via AES-GCM using a non-exportable CryptoKey in IndexedDB. Stored in localStorage as `{ iv, ciphertext }` under the key `redmine_calendar_credentials`.

**Lifecycle**: Created when user first saves settings. Updated on settings change. Cleared when user clears browser data (re-entry required).

## User Preferences (browser-side, localStorage — not encrypted)

| Key | Type | Description |
|-----|------|-------------|
| redmine_calendar_working_hours | JSON | Working hours start/end |
| redmine_calendar_view_mode | string | Calendar view mode |
| redmine_calendar_day_range | string | Workweek or full-week |
| redmine_calendar_favourites | JSON | Favourite tickets |
| redmine_calendar_last_used | JSON | Last used tickets |

**Note**: Preferences are not sensitive and remain in plain-text localStorage.

## Encryption Key (IndexedDB)

| Store | Key | Value | Extractable |
|-------|-----|-------|-------------|
| redmine_calendar_keystore | encryption_key | AES-GCM-256 CryptoKey | false |

**Lifecycle**: Generated on first credential save. Persists until IndexedDB is cleared. If lost, user re-enters credentials.
