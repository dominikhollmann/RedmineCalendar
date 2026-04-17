# Data Model: Localization (003)

**Date**: 2026-04-12

---

## Entities

### Locale

The active language setting, derived once at application load time.

| Field | Type | Values | Source |
|-------|------|--------|--------|
| `locale` | `string` | `'en'` \| `'de'` | `navigator.languages[0]` or `navigator.language` |

**Detection rule**: If the browser's primary language starts with `'de'`, locale is `'de'`. All other values fall back to `'en'`.

**Lifecycle**: Set once on module import; does not change during the session (no reactive updates).

---

### TranslationMap

The in-memory key/value store for all localised strings.

```js
const TRANSLATIONS = {
  en: {
    'key': 'English string',
    // ...
  },
  de: {
    'key': 'Deutscher Text',
    // ...
  }
}
```

**Structure rules**:
- Keys are `snake_case` strings, namespaced by area: `modal.save`, `error.network`, `calendar.week_total`, etc.
- Every key in `en` MUST have a corresponding key in `de` (and vice versa).
- Values may contain `{{placeholder}}` tokens for runtime substitution.
- No nested objects — flat key/value only for simplicity.

---

## Module Contract: `js/i18n.js`

```js
// Detected locale — 'en' or 'de'
export const locale: 'en' | 'de'

// Look up a translation key, substituting optional variables
export function t(key: string, vars?: Record<string, string>): string

// Format a date string (YYYY-MM-DD) per the active locale
export function formatDate(dateStr: string): string
```

**Guarantees**:
- `t(key)` never throws — returns the `en` fallback if key missing in `de`, or the raw key if missing entirely.
- `locale` is set synchronously at import time — no async dependency.
- `formatDate` uses `Intl.DateTimeFormat`; handles `de` → DD.MM.YYYY, `en` → DD/MM/YYYY (ISO-friendly).
