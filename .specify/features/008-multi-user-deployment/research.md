# Research: Multi-User Deployment & Security Hardening

## R1: Browser-Side Credential Encryption

**Decision**: Use the Web Crypto API with AES-GCM, keyed by a CryptoKey stored in IndexedDB (non-exportable).

**Rationale**: The Web Crypto API is the browser-native standard for cryptography. AES-GCM provides authenticated encryption. Storing a non-exportable CryptoKey in IndexedDB means the key cannot be read via DevTools (IndexedDB shows `[CryptoKey]`, not the raw bytes). This meets the spec requirement of "resistant to casual inspection" without requiring a user-supplied passphrase.

**Alternatives considered**:
- **Base64 encoding / XOR obfuscation**: Not a standard cryptographic approach; fails FR-011.
- **User-supplied passphrase**: Adds friction; violates FR-012 (no passphrase required).
- **Server-side credential storage**: Out of scope; would require a backend.

**Key generation**: On first use, generate a random AES-GCM-256 key via `crypto.subtle.generateKey()` and store it in IndexedDB with `extractable: false`. The key is scoped to the browser origin — switching browsers or clearing IndexedDB requires re-entering credentials (acceptable per spec edge case).

**Storage format**: Credentials stored in localStorage as JSON: `{ iv: <base64>, ciphertext: <base64> }`. The key name remains `redmine_calendar_config` for credential data.

## R2: Central Configuration via config.json

**Decision**: The app fetches `/config.json` at startup. The file is a static JSON file in the app root, edited by the administrator.

**Rationale**: Simplest possible approach — no build step, no server-side logic. The admin edits one file. The app reads it on every page load.

**Alternatives considered**:
- **Environment variables at build time**: Requires a build step; violates FR-015 (static file server).
- **Server-side config endpoint**: Requires an application server; violates FR-015.
- **JavaScript config file (`config.js`)**: Works but JSON is more admin-friendly and less error-prone.

**config.json schema**:
```json
{
  "redmineUrl": "https://proxy.company.internal:8010",
  "redmineServerUrl": "https://redmine.company.internal",
  "aiProvider": "anthropic",
  "aiModel": "claude-haiku-4-5-20251001",
  "aiApiKey": "sk-ant-...",
  "aiProxyUrl": "https://proxy.company.internal:8011"
}
```

**Error handling**: If `config.json` is missing (404) or malformed (parse error), show an error page explaining the admin needs to create it.

## R3: Settings Page Split — Admin vs User

**Decision**: The settings page shows only user-configurable fields. Admin-managed fields (Redmine URL, AI config) are read from `config.json` and displayed as read-only info.

**Rationale**: Prevents users from accidentally overriding admin settings. Simplifies the settings form to just the API key field and personal preferences.

**Alternatives considered**:
- **Hiding admin fields entirely**: Less transparent; users might wonder where the Redmine URL comes from.
- **Separate admin page**: Unnecessary; admin edits `config.json` directly.

## R4: CORS Proxy Architecture

**Decision**: In production, the admin runs a shared CORS proxy (or configures a reverse proxy on the web server). The proxy URL goes into `config.json`. The `npx lcp` local proxy remains available for development.

**Rationale**: 50–100 users can't each run their own proxy. A shared proxy is standard for intranet tools.

**Alternatives considered**:
- **Configuring Redmine CORS headers directly**: Requires Redmine server config changes; may not be possible.
- **Same-origin deployment on Redmine server**: Requires access to Redmine's web server config; couples deployment.

## R5: Cookie-to-Encrypted Migration

**Decision**: Since backward compatibility is not required, the existing cookie-based config storage will be replaced entirely. No migration logic needed.

**Rationale**: The tool is not yet in production use. Clean break is simpler and avoids migration edge cases.
