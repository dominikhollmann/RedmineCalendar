# Contract: Issue Status API (js/redmine-api.js additions)

## `fetchIssueStatus(issueId)`

```js
/**
 * @param {number} issueId
 * @returns {Promise<{ is_closed: boolean } | null>}
 * Returns null on network error or non-200 response (callers treat null as "unknown").
 */
export async function fetchIssueStatus(issueId) { ... }
```

**Endpoint**: `GET /issues/${issueId}.json`
**Field extracted**: `response.issue.status.is_closed` (boolean)
**On error**: returns `null` — callers must treat `null` as "status unknown, skip gate"
**Caching**: none (stateless; each call is a fresh fetch)

## `fetchIssueStatuses(issueIds)`

```js
/**
 * @param {number[]} issueIds
 * @returns {Promise<Map<number, boolean>>}
 * Returns empty Map on error. Missing IDs (e.g. deleted issues) are absent from the Map.
 */
export async function fetchIssueStatuses(issueIds) { ... }
```

**Endpoint**: `GET /issues.json?issue_id=<comma-separated-ids>&limit=100`
**Field extracted**: per entry, `issue.id → issue.status.is_closed`
**On error**: returns empty `Map` — callers must treat missing keys as "status unknown, skip gate"
**Batch limit**: callers must not pass more than 100 IDs; planning view has ≤30 events per day

## Caller contract

Both functions follow the FR-008 graceful-failure rule:
- If the return value is `null` or the Map has no entry for a given ID, the caller **must not** block the booking — proceed as if `is_closed = false`.
