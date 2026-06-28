# Phase 1 Data Model: Settings Page Redesign

No backend entities. State lives in `localStorage` (prefs + encrypted credentials) and in-memory UI state. This documents the persisted keys, the new key, and the in-memory state shapes.

## Persisted state (localStorage)

### Existing keys (reused as-is)

| Key                                        | Type                        | Meaning                                          |
| ------------------------------------------ | --------------------------- | ------------------------------------------------ |
| `redmine_calendar_view_mode`               | `'working' \| '24h'`        | "Nur Arbeitszeit" switch (`working` = on)        |
| `redmine_calendar_day_range`               | `'workweek' \| 'full-week'` | "Nur Mo–Fr" switch (`workweek` = on)             |
| `redmine_calendar_fast_mode`               | `'true' \| 'false'`         | "Schnellmodus" switch                            |
| `redmine_calendar_theme`                   | `'light' \| 'dark'`         | Theme (header toggle, via `theme.js`)            |
| `redmine_calendar_working_hours`           | JSON `{start,end}`          | Working-hours start/end                          |
| `redmine_calendar_weekly_hours`            | number                      | Weekly contracted hours (0–60)                   |
| `redmine_calendar_auto_refresh_interval`   | number (seconds)            | Auto-refresh; 0 = off (UI shows minutes)         |
| `redmine_calendar_planning_source_outlook` | `'1' \| '0'`                | Outlook source enabled                           |
| `redmine_calendar_planning_source_teams`   | `'1' \| '0'`                | Teams source enabled                             |
| (encrypted) `redmine_calendar_credentials` | encrypted JSON              | API key / username+password (via `js/crypto.js`) |

### NEW key

| Key                                      | Type                          | Default               | Meaning                                                                                                                                                                    |
| ---------------------------------------- | ----------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `redmine_calendar_planning_source_order` | JSON `string[]` of source ids | `["outlook","teams"]` | Order of planning-source columns; drives `planning-view.js`. Unknown/missing ids fall back to default order; bookings column is always first and is not part of this list. |

**Validation/robustness**: on read, filter to known ids and append any known id missing from the stored array (so adding a future source can't silently disappear); de-dupe. Write the normalized array back on any reorder.

## In-memory UI state (settings-page orchestrator)

| State             | Type                                                             | Notes                                                              |
| ----------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `prefs`           | `{ workingHoursOnly, monFriOnly, fastMode: boolean }`            | mirrors the switch keys; instant-apply on change                   |
| `authMode`        | `'apikey' \| 'basic'`                                            | segmented control (maps to existing `authType` radio values)       |
| `showKey`         | `boolean`                                                        | reveal toggle (view-only; never persisted)                         |
| `connection`      | `'disconnected' \| 'checking' \| 'connected' \| 'error'`         | see contracts/connection-state-machine.md                          |
| `connectionError` | `null \| 'invalid' \| 'network' \| 'server'`                     | reason for the `error` state                                       |
| `sources`         | `Array<{ id: string, label: string, enabled: boolean }>` ordered | render order = persisted order; `enabled` from the per-source keys |
| `activeSection`   | section id                                                       | scroll-spy result                                                  |
| `grabbed`         | `number \| null`                                                 | keyboard-drag index (desktop)                                      |
| `isMobile`        | `boolean`                                                        | 640px breakpoint, re-evaluated on resize                           |

## Key entities (conceptual)

- **Display preference** — boolean view option (work-hours-only, Mon–Fri-only, quick mode); applied immediately.
- **Working-hours settings** — `{ start: "HH:MM", end: "HH:MM", weeklyHours: number(0–60) }`; validated on change.
- **Credentials & connection** — `{ authMode, secret(s) }` (encrypted) + derived `connection` + `connectionError`.
- **Planning source** — `{ id, label, enabled, position }`; the ordered, enabled set drives planning columns.
- **Auto-refresh interval** — minutes (0 = off), persisted as seconds.

## State transitions

- **Connection**: `disconnected → checking → (connected | error)`; `connected → disconnected` on any credential-field edit; `error → checking` on re-Verbinden. (Full table in contract.)
- **Source order**: `order[]` mutated by move-up / move-down / drag-drop; persisted on every change; emits `planning:sources-changed`.
- **Footer CTA**: enabled iff `connection === 'connected'`.
