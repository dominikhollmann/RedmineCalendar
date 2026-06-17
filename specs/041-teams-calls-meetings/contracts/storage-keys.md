# Storage Keys — Teams Calls & Meetings Column (Feature 041)

## New localStorage Keys

### `redmine_calendar_planning_source_teams`

| Attribute       | Value                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------ |
| **Constant**    | `STORAGE_KEY_PLANNING_SOURCE_TEAMS` (in `js/config.js`)                                          |
| **Type**        | `'0'` \| `'1'`                                                                                   |
| **Default**     | `'0'` (Teams column disabled — FR-002)                                                           |
| **Set by**      | Settings page (`js/settings-page.js`) via the Teams column toggle                                |
| **Read by**     | `js/planning-view-teams.js` (availability check), `js/planning-view.js` (mount/unmount decision) |
| **Persistence** | Survives page reload (localStorage)                                                              |

**Semantics**: `'0'` or absent = Teams column hidden; `'1'` = Teams column visible in the
Planning View. The column is off by default (FR-002) — it MUST NOT fetch any data until the
user explicitly enables it in Settings.

---

## Keys NOT Modified by This Feature

| Key                                        | Owner          | Notes     |
| ------------------------------------------ | -------------- | --------- |
| `redmine_calendar_planning_source_outlook` | `js/config.js` | Unchanged |
| All other `redmine_calendar_*` keys        | various        | Unchanged |

---

## Data NOT Stored (FR-018)

The following data exists in-memory only and is **never written to any storage**:

- Teams call records (participant names, call times, call IDs)
- Teams meeting actual times (join/leave timestamps from attendance reports)
- Redmine issue lookup results in `planning-view-cache.js` (session-scoped `Map`, page-lifetime only)
