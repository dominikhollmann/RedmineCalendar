# Contract: Redmine Connection State Machine

Module: `js/settings-connection.js` (DOM-light core + thin DOM binder). Unit-tested core.

## States

| State          | Pill text (i18n key)                                  | Pill style tokens                                                                           | Footer CTA |
| -------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------- |
| `disconnected` | `settings.conn.disconnected` ("Nicht verbunden")      | dot `--status-disconnected-dot`, bg `--neutral-background-3`, text `--neutral-foreground-2` | disabled   |
| `checking`     | `settings.conn.checking` ("Verbindung wird geprüft…") | dot `--status-checking-dot` (brand), bg `--nav-active-bg`, text `--color-primary`           | disabled   |
| `connected`    | `settings.conn.connected` ("Verbunden")               | dot `--status-connected-dot`, bg `--color-success-bg`, text `--color-success`               | enabled    |
| `error`        | `settings.conn.error.<reason>`                        | dot `--danger`, bg `--color-danger-bg`, text `--color-danger`                               | disabled   |

`error` reasons: `invalid` (401/403), `network` (fetch/TypeError/offline), `server` (5xx / other). Each has its own i18n message shown on the pill or inline.

## Transitions

| From                     | Event                           | To             | Side effects                                                                                              |
| ------------------------ | ------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------- |
| `disconnected` / `error` | click Verbinden (creds present) | `checking`     | persist credentials (encrypted); button `disabled`+`aria-busy=true`; announce                             |
| `checking`               | `getCurrentUser()` resolves     | `connected`    | button re-enabled; footer CTA enabled; announce                                                           |
| `checking`               | `getCurrentUser()` rejects      | `error`        | set `connectionError` reason; button re-enabled; announce reason                                          |
| `connected`              | edit apiKey/username/password   | `disconnected` | footer CTA disabled; show hint `settings.conn.credsChanged` ("Zugangsdaten geändert — erneut verbinden.") |
| any                      | switch authMode                 | `disconnected` | clear `connectionError`; footer disabled                                                                  |

## Core API (pure, unit-testable)

```text
mapError(err) -> 'invalid' | 'network' | 'server'
nextState(current, event, ctx) -> { state, error? }   // pure reducer
isFooterEnabled(state) -> boolean                       // state === 'connected'
```

The DOM binder calls `getCurrentUser()` (real), feeds resolve/reject into `nextState`, and renders pill/button/hint/footer + announces via the shared `aria-live` region.

## Acceptance (maps to spec US2/US5)

- Pill never shows a stale `connected`/`checking` after a credential edit (→ `disconnected`).
- A failed check shows a specific reason, not a generic/silent failure.
- Footer "Kalender öffnen →" is enabled **only** in `connected`.
- `checking` sets `aria-busy` on the button and disables it.
