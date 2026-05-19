# Contract: `fetchTimeEntryById` Error Surface

**Module**: `js/redmine-api.js`
**Function**: `fetchTimeEntryById(id) → Promise<TimeEntry>`
**Feature**: 035-handover-readiness, FR-008
**Status**: BREAKING change to a single caller (`js/chatbot-tools.js:306`). All other public methods in `js/redmine-api.js` already follow the new contract; this change brings the one outlier into line.

## Before

```js
export async function fetchTimeEntryById(id) {
  try {
    const { time_entry } = await request(`/time_entries/${id}.json`);
    return time_entry;
  } catch (error) {
    if (error instanceof RedmineError && error.status === 404) return null;
    return null; // ← silent on 500, 401, network, anything
  }
}
```

Return type: `TimeEntry | null` — the `null` carries no information about _why_ the entry was unavailable.

## After

```js
export async function fetchTimeEntryById(id) {
  const { time_entry } = await request(`/time_entries/${id}.json`);
  return time_entry;
}
```

Return type: `TimeEntry` (never `null`). The function throws `RedmineError` on any failure, consistent with every other public method in this module.

## Caller adaptation

`js/chatbot-tools.js:306` (the sole caller, confirmed by grep at planning time):

**Before**:

```js
const raw = await fetchTimeEntryById(entry_id);
if (!raw) {
  return { ok: false, error: `time entry ${entry_id} not found` };
}
// ... use raw ...
```

**After**:

```js
let raw;
try {
  raw = await fetchTimeEntryById(entry_id);
} catch (err) {
  if (err instanceof RedmineError && err.status === 404) {
    return { ok: false, error: `time entry ${entry_id} not found` };
  }
  throw err; // re-throw server / auth / network errors — they are not "not found"
}
// ... use raw ...
```

This restores the _intended_ semantics: a 404 is a recoverable "no such entry" result; a 500 or network error is a real failure that should surface to the chatbot user rather than silently masquerade as "not found."

## Contract invariants

After the change, every public function in `js/redmine-api.js` MUST satisfy:

1. **No silent error paths.** Catching an error and returning `null`/`undefined`/`{}` is forbidden in public methods unless the function's name explicitly communicates the absence (e.g. `tryFetchX` would be acceptable; `fetchX` is not).
2. **Typed error class.** Any thrown error MUST be a `RedmineError` (or a sub-class) so consumers can `instanceof`-discriminate.
3. **Status preserved.** When the failure is HTTP-shaped, the `RedmineError.status` field MUST carry the response code so consumers can branch (the 404-recovery pattern shown above).

These invariants are already true for every other public method in the file (`request`, `fetchTimeEntries`, `createTimeEntry`, `updateTimeEntry`, `deleteTimeEntry`, `fetchIssues`, `fetchProjects`, `fetchActivities`, `fetchCurrentUser`). FR-008 brings `fetchTimeEntryById` into compliance.

## Verification

- **Unit test (existing, modified)**: `tests/unit/redmine-api.test.js` — assertion that currently expects `null` on a 404 response is updated to expect `RedmineError` with `status === 404`. New assertion: 500 response throws `RedmineError` (was previously not testable because it returned `null`).
- **Unit test (chatbot-tools, existing or new)**: assert the caller's translation: a `RedmineError` with `status === 404` yields the existing tool error string; other statuses re-throw.
- **Integration**: no integration test required — the change is purely contractual; behavior to end-users is identical for the existing success and 404 paths and is _improved_ for the 500/auth paths (which previously silently masqueraded).
