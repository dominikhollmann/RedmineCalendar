# Contracts: Fluent 2 UI Redesign with Corporate Identity

## External interface: `config.json` admin block

This feature exposes ONE external interface — a new admin-managed block in `config.json`. All four fields are optional; each falls back to a Fluent 2 design-system default when absent or invalid.

```json
{
  "brandPrimary":   "#0F6CBD",
  "brandAccent":    "#1B5BAB",
  "brandLogoUrl":   "https://example.com/logo.svg",
  "brandFontFamily": "\"Acme Sans\", \"Segoe UI\", system-ui, sans-serif"
}
```

### Validation

| Field | Allowed | Behaviour on invalid |
|---|---|---|
| `brandPrimary`, `brandAccent` | hex string `/^#[0-9a-fA-F]{3,8}$/` | logged warning, default kept |
| `brandLogoUrl` | string starting with `https://`; reject `javascript:` / `data:` | logged warning, logo hidden |
| `brandFontFamily` | non-empty string ≤ 200 chars; safe characters only | logged warning, default kept |

### Notes

- Brand fonts are NOT auto-loaded. Admins must ensure the font is web-available (system font, hosted by the company, or via a separate webfont CDN configured outside this app).
- `brandLogoUrl` is rendered via `<img src>`, never `innerHTML`. CSP `img-src` rules apply normally.
- All fields are read once on page load (after `config.json` fetch). Runtime changes require a page reload.

## Internal contracts

The internal JS module contract (`js/branding.js`) and the cross-feature inheritance from feature 030 are documented in `data-model.md`.

This feature does NOT expose any new HTTP endpoints, query strings, file formats, or RPC methods.
