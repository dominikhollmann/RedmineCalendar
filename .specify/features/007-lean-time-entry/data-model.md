# Data Model: Super Lean Time Entry UX (007)

## Entities

### Favourite

A user-pinned ticket for instant re-selection. Persisted across sessions.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `number` | Redmine issue ID |
| `subject` | `string` | Issue title (cached at time of pinning) |
| `projectName` | `string` | Project name (cached at time of pinning) |

**Storage**: `localStorage` key `redmine_calendar_favourites`  
**Format**: JSON array, no size limit  
**Ordering**: Most recently added first  

---

### LastUsed

Automatically maintained list of the 5 most recently submitted tickets.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `number` | Redmine issue ID |
| `subject` | `string` | Issue title (cached at submission time) |
| `projectName` | `string` | Project name (cached at submission time) |

**Storage**: `localStorage` key `redmine_calendar_last_used`  
**Format**: JSON array, max 5 entries, newest first  
**Update rule**: On save, prepend new entry; remove duplicates (same `id`); truncate to 5  

---

### LeanFormState (runtime only, not persisted)

Transient state held in the open form instance.

| Field | Type | Description |
|-------|------|-------------|
| `selectedIssue` | `{id, subject, projectName} \| null` | Currently selected ticket |
| `highlightedIndex` | `number` | Keyboard-highlighted row in the visible list |
| `listMode` | `'favourites' \| 'lastused' \| 'search'` | Which list is currently shown |
| `defaultActivityId` | `number \| null` | Cached default activity (module-level) |

---

## localStorage Key Registry (feature 007 additions)

| Key | Type | Owner |
|-----|------|-------|
| `redmine_calendar_favourites` | JSON array of Favourite | feature 007 |
| `redmine_calendar_last_used` | JSON array of LastUsed | feature 007 |
