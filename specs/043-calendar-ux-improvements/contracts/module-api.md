# Module API Contracts: Calendar UX Improvements (043)

Internal module contracts for the new and modified ES modules in this feature. These define the public exports that other modules may depend on.

---

## `js/data-refresh.js` (NEW)

```js
/**
 * Start the auto-refresh timer.
 * Called once from calendar.js after the calendar is rendered.
 * Reads the interval from localStorage; no-op if interval is 0.
 */
export function startAutoRefresh(): void

/**
 * Stop and tear down the auto-refresh timer.
 * Called when the user disables auto-refresh in Settings.
 */
export function stopAutoRefresh(): void

/**
 * Manually trigger a data refresh across all active sources.
 * Debounced — second call while a refresh is in progress is a no-op.
 * @returns Promise that resolves when all sources have completed (or failed individually).
 */
export async function triggerRefresh(): Promise<void>

/**
 * Returns the timestamp of the last successful refresh, or null if
 * no refresh has completed yet in this session.
 */
export function getLastRefreshedAt(): Date | null
```

---

## `js/redmine-api.js` — new export (MODIFIED)

```js
/**
 * Batch-fetch closed status for each proposal that has a ticketId,
 * and stamp proposal.is_closed in place.
 * Uses fetchIssueStatuses internally (deduplicated via _issueInfoCache).
 * Safe to call concurrently for Outlook and Teams proposals — the shared
 * cache ensures each ticketId is fetched only once.
 * @param {CalendarProposal[]} proposals
 * @returns {Promise<void>}
 */
export async function stampClosedStatus(proposals: CalendarProposal[]): Promise<void>
```

---

## `js/planning-view-outlook.js` — internal change only

`_buildItems` delegates its closed-status logic to `stampClosedStatus`.
No change to exported API (`renderOutlookColumn`, `rerenderOutlookColumn`, etc.).

---

## `js/planning-view-teams.js` — internal change only

New private `_buildTeamsItems(proposals, records)` mirrors `_buildItems` in outlook; calls `stampClosedStatus`. Proposals from `normaliseMeeting` now include `source: 'Teams'`. No change to exported API (`renderTeamsColumn`, `rerenderTeamsColumn`, etc.).

---

## `js/time-entry-form-view.js` — signature change

```js
/**
 * @param {HTMLElement} modalEl
 * @param {{ subject: string, startTime: string, endTime: string, source?: string } | undefined} sourceEvent
 */
export function renderSourceEventInfo(modalEl, sourceEvent): void
// Unchanged call signature; `source` is a new optional field on the second arg.
```

---

## i18n keys added

| Key                               | en                                           | de                                                   |
| --------------------------------- | -------------------------------------------- | ---------------------------------------------------- |
| `planning.modal_source_info_from` | `"Source event from {source}"`               | `"Quellereignis aus {source}"`                       |
| `calendar.refresh_button`         | `"Refresh"`                                  | `"Aktualisieren"`                                    |
| `calendar.last_refreshed`         | `"Last refreshed at {time}"`                 | `"Zuletzt aktualisiert um {time}"`                   |
| `calendar.refresh_failed`         | `"Refresh failed for: {sources}"`            | `"Aktualisierung fehlgeschlagen für: {sources}"`     |
| `settings.auto_refresh_interval`  | `"Auto-refresh interval (minutes, 0 = off)"` | `"Auto-Aktualisierungsintervall (Minuten, 0 = aus)"` |
