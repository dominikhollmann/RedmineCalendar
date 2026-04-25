# Data Model: Enhanced Project Display and Search

## Entity Changes

### TimeEntry (enriched)

Existing in-memory object returned by `mapTimeEntry()`. New field added:

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| projectName | `string \| null` | `raw.project?.name` | **Existing** — project display name |
| projectIdentifier | `string \| null` | Resolved from issue's `project.identifier` | **New** — Redmine project slug (e.g., "my-project") |
| projectId | `number \| null` | `raw.project?.id` | **Existing** — numeric project ID |

### SearchResult (enriched)

Returned by `searchIssues()`. New field added:

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| id | `number` | `issue.id` | Issue ID |
| subject | `string` | `issue.subject` | Issue title |
| projectName | `string` | `issue.project?.name` | **Existing** — project display name |
| projectIdentifier | `string \| null` | `issue.project?.identifier` | **New** — Redmine project slug |
| status | `string` | `issue.status?.name` | Issue status |

### Display Formatting

```
formatProject(identifier, name) → identifier ? `${truncate(identifier, 20)} — ${name}` : name
```

- Truncation: identifiers > 20 characters are truncated with `…` suffix
- Tooltip: full identifier shown on hover when truncated

## Storage Impact

### localStorage Keys (enriched)

| Key | Change | Description |
|-----|--------|-------------|
| `redmine_calendar_favourites` | Add `projectIdentifier` to each stored entry | Favourites list |
| `redmine_calendar_last_used` | Add `projectIdentifier` to each stored entry | Recently used tickets |

Backward compatible: missing `projectIdentifier` in stored entries gracefully falls back to name-only display.
