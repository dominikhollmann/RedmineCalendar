# Contract: Admin Config Fields — DSGVO Privacy Compliance

**Feature**: 044-dsgvo-privacy-compliance | **Date**: 2026-06-18

These fields are added to `config.json` (admin-managed, server-side). They are read by `js/config-store.js` and consumed by `js/privacy.js` (notice rendering) and `js/privacy-store.js` (retention cleanup). The app ships with placeholder values that the admin MUST replace before production deployment.

---

## New Fields in `config.json`

```jsonc
{
  // ... existing fields unchanged ...

  // Data controller identity — displayed in privacy.html and deletion confirmation
  "privacyControllerName": "[Controller name — set in config.json]",
  "privacyControllerEmail": "[Controller email — set in config.json]",
  "privacyDpoEmail": "[DPO email — set in config.json]",

  // Retention period for planning snapshot keys (redmine_calendar_planning_snapshot_*)
  // Integer, days. Startup cleanup removes keys older than this value.
  // Displayed in privacy.html so users see the active value.
  "planningDataRetentionDays": 30,
}
```

---

## Field Specifications

| Field                       | Type     | Default                                     | Required             | Description                                                                                                                                                               |
| --------------------------- | -------- | ------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `privacyControllerName`     | `string` | `"[Controller name — set in config.json]"`  | Yes (before go-live) | Legal name of the data controller shown in the privacy notice and deletion confirmation.                                                                                  |
| `privacyControllerEmail`    | `string` | `"[Controller email — set in config.json]"` | Yes (before go-live) | Contact email for the data controller (Art. 13(1)(a) GDPR).                                                                                                               |
| `privacyDpoEmail`           | `string` | `"[DPO email — set in config.json]"`        | Yes (before go-live) | Data Protection Officer contact email (Art. 13(1)(b) GDPR). May equal `privacyControllerEmail` if no separate DPO appointed.                                              |
| `planningDataRetentionDays` | `number` | `30`                                        | No                   | Retention period in days for planning snapshot keys (`redmine_calendar_planning_snapshot_*`). Must be a positive integer. If absent or invalid, the app falls back to 30. |

---

## Validation Rules (enforced by `js/config-store.js`)

- `planningDataRetentionDays`: if present, must be a finite positive integer. If the value is `0`, negative, or `NaN`, `config-store.js` logs a warning and falls back to `30`.
- `privacyControllerName`, `privacyControllerEmail`, `privacyDpoEmail`: no runtime validation beyond presence check. The app renders them as-is in `privacy.html`. If missing, the placeholder text `"[… set in config.json]"` is rendered — this is intentional (forces the admin to notice the gap before go-live).

---

## `js/config-store.js` Accessor API (additions)

These getters are added alongside existing accessors (`getRedmineUrl()`, etc.):

```js
/** @returns {string} */
export function getPrivacyControllerName() { ... }

/** @returns {string} */
export function getPrivacyControllerEmail() { ... }

/** @returns {string} */
export function getPrivacyDpoEmail() { ... }

/** @returns {number} Positive integer, defaults to 30 */
export function getPlanningDataRetentionDays() { ... }
```

---

## Test Fixture Update

`tests/fixtures/config.json` MUST include the new fields so Playwright tests can reference them:

```json
{
  "privacyControllerName": "Test Controller GmbH",
  "privacyControllerEmail": "privacy@test-controller.example",
  "privacyDpoEmail": "dpo@test-controller.example",
  "planningDataRetentionDays": 30
}
```
