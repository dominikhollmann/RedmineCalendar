# Data Model: DSGVO / GDPR Privacy Compliance for Planning Features

**Feature**: 044-dsgvo-privacy-compliance | **Date**: 2026-06-18

---

## Browser Storage Entities

### ConsentRecord

**Storage**: `localStorage` key `redmine_calendar_ai_consent`

```json
{
  "consentedAt": "2026-06-18T10:00:00.000Z",
  "withdrawnAt": null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `consentedAt` | `string \| null` | ISO 8601 UTC timestamp when the user gave consent. `null` if never consented. |
| `withdrawnAt` | `string \| null` | ISO 8601 UTC timestamp when the user withdrew consent. `null` if not withdrawn. |

**State derivation** (evaluated by `js/privacy-store.js`):

| State | Condition |
|-------|-----------|
| No consent recorded | Key missing OR `consentedAt === null` |
| Active consent | `consentedAt` is set AND (`withdrawnAt === null` OR `withdrawnAt < consentedAt`) |
| Consent withdrawn | `withdrawnAt` is set AND `withdrawnAt >= consentedAt` |

**Lifecycle**:
- Created: user clicks "Accept" in the consent modal
- Updated: user withdraws consent from Settings (sets `withdrawnAt`)
- Re-consented: user clicks "Accept" again after withdrawal (overwrites both fields with new timestamps)
- Cleared: user triggers "Delete planning data" action (key removed)

---

### PlanningSnapshot *(future — naming convention only)*

**Storage**: `localStorage` keys matching `redmine_calendar_planning_snapshot_*`

```json
{
  "_writtenAt": "2026-06-18T10:00:00.000Z",
  "...": "feature-specific payload"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `_writtenAt` | `string` | ISO 8601 UTC timestamp written when the key was last stored. Used by retention cleanup. |
| (remaining fields) | any | Feature-specific; defined by the planning feature that writes the key. |

**Convention**: Any planning feature that caches personal data to localStorage MUST:
1. Use a key name starting with `redmine_calendar_planning_snapshot_`
2. Include a top-level `_writtenAt` ISO 8601 field in the JSON value
3. Reference the DSGVO impact checklist (`specs/044-dsgvo-privacy-compliance/checklists/dsgvo-impact.md`) in its PR

**Retention**: Keys older than `planningDataRetentionDays` (default 30 days) are removed on startup by `js/privacy-store.js`.

---

### Planning Preference Flags *(existing)*

**Storage**: `localStorage` keys (existing, defined in `js/config.js`)

| Key | Type | Scope |
|-----|------|-------|
| `redmine_calendar_planning_source_outlook` | `'0' \| '1'` | Whether Outlook planning source is enabled |
| `redmine_calendar_planning_source_teams` | `'0' \| '1'` | Whether Teams planning source is enabled |
| `redmine_calendar_active_view` | `'planning' \| 'calendar'` | Last active top-level view |

These are UI state/preferences. They are included in the FR-012 "My stored planning data" view and cleared by the FR-005 "Delete planning data" action as they reveal which planning features the user has enabled.

---

## Admin Configuration Fields (config.json)

New fields read by `js/config-store.js`:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `privacyControllerName` | `string` | `"[Controller name — set in config.json]"` | Legal name of the data controller shown in `privacy.html` |
| `privacyControllerEmail` | `string` | `"[Controller email — set in config.json]"` | Data controller contact email |
| `privacyDpoEmail` | `string` | `"[DPO email — set in config.json]"` | Data Protection Officer email (may be same as controller email) |
| `planningDataRetentionDays` | `number` | `30` | Retention period in days for planning snapshot data. Shown in `privacy.html`. |

---

## New localStorage Key Constants (js/config.js additions)

| Constant | Value | Description |
|----------|-------|-------------|
| `STORAGE_KEY_AI_CONSENT` | `'redmine_calendar_ai_consent'` | ConsentRecord JSON object |
| `STORAGE_KEY_PLANNING_SNAPSHOT_PREFIX` | `'redmine_calendar_planning_snapshot_'` | Prefix for all planning snapshot keys (used by cleanup to enumerate and expire) |

---

## Module API: js/privacy-store.js

Pure-logic exports (no DOM, no side-effects other than localStorage reads/writes):

| Export | Signature | Description |
|--------|-----------|-------------|
| `hasPlanningAiConsent()` | `() => boolean` | Returns `true` if active consent is recorded |
| `recordPlanningAiConsent()` | `() => void` | Writes/updates the ConsentRecord (sets `consentedAt`, clears `withdrawnAt`) |
| `withdrawPlanningAiConsent()` | `() => void` | Sets `withdrawnAt` on the ConsentRecord |
| `getPlanningAiConsentRecord()` | `() => ConsentRecord \| null` | Returns the raw record or `null` |
| `deletePlanningData()` | `() => { removed: string[], errors: string[] }` | Removes all planning storage keys; returns lists of removed keys and any errors |
| `listPlanningData()` | `() => Record<string, unknown>` | Returns a map of all planning storage keys to their parsed values (for FR-012 view) |
| `runRetentionCleanup(retentionDays: number)` | `() => { removed: string[], error: Error \| null }` | Removes expired planning snapshots; returns results for the toast notification |
