# Data Model: Bulk Multi-Select for Move and Delete

**Feature**: 028-bulk-select-move-delete
**Date**: 2026-05-10
**Phase**: 1 (Design & Contracts)

This feature has **no persistent storage**. The two new entities are transient client-side values held in module-level state.

---

## Persistent storage

| Key    | Source | Read by this feature? | Written by this feature? |
| ------ | ------ | --------------------- | ------------------------ |
| (none) | —      | —                     | —                        |

No new keys, no schema changes, no IndexedDB / localStorage writes.

---

## Entity 1: `Selection`

A transient set of currently-selected time entry IDs.

### Shape

```ts
type Selection = {
  ids: Set<string>; // entryId strings (Redmine time entry IDs as returned by the API)
  size: number; // derived: ids.size
};
```

### Operations (exposed by `js/selection.js`)

| API                                      | Behaviour                                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `addToSelection(id: string)`             | Adds the id; idempotent. Fires `onChange`.                                                         |
| `removeFromSelection(id: string)`        | Removes the id; idempotent. Fires `onChange`.                                                      |
| `toggleInSelection(id: string)`          | If present → remove; else → add. Fires `onChange` exactly once per call.                           |
| `clearSelection()`                       | Empties the set. Fires `onChange` only if the set was non-empty.                                   |
| `isSelected(id: string) → boolean`       | Predicate; never fires `onChange`.                                                                 |
| `getSelection() → readonly Set<string>`  | Snapshot for callers (e.g., toolbar render). Returns a _new_ Set each call to discourage mutation. |
| `onChange(listener: (snapshot) => void)` | Registers a listener. Returns an unsubscribe fn. Multiple listeners supported.                     |

### Invariants

- The set never contains duplicates (it is a `Set`, not an `Array`).
- Listeners are called _after_ the mutation, with the **post-mutation** snapshot.
- The selection is cleared when the visible week changes (FR-008) and when the user clicks an empty cell (FR-007). Both are wired in `js/calendar.js`, not in `selection.js`.

---

## Entity 2: `BatchResult`

The output of `runBulkMove` and `runBulkDelete`. Used to render the partial-failure summary (FR-010, SC-004).

### Shape

```ts
type BatchResult = {
  total: number; // length of the input selection
  succeeded: string[]; // entry IDs that were updated/deleted successfully
  failed: { id: string; error: string }[]; // one entry per failure with a short user-facing reason
};
```

### Computation

`runBulkMove(ids: string[], delta: -1 | +1, redmineApi)`:

1. Fetch each entry's current state (or pass them in pre-loaded — they live in `_currentEntries` already).
2. Build `nextEntries` via `shiftEntriesByDays(entries, delta)` (pure helper — see below).
3. Issue concurrent `redmineApi.updateTimeEntry(id, payload)` for each via `Promise.allSettled`.
4. Aggregate into a `BatchResult` and return it. Never throws.

`runBulkDelete(ids: string[], redmineApi)`:

1. Issue concurrent `redmineApi.deleteTimeEntry(id)` for each via `Promise.allSettled`.
2. Aggregate. Never throws.

### Pure helper: `shiftEntriesByDays`

```ts
function shiftEntriesByDays(entries: Entry[], delta: number): Entry[];
```

- Returns a new array; does not mutate inputs.
- For each entry, increments `spentOn` by `delta` calendar days using local-timezone arithmetic (see research.md §R5).
- Preserves `startTime`, `endTime`, `hours`, all other fields.

### Invariants

- `succeeded.length + failed.length === total`.
- The `error` string is a localized, short summary (≤ 100 chars). Long Redmine error bodies are truncated.
- The orchestrator NEVER throws — partial failure is always returned, never raised.

---

## i18n keys

See research.md §R8 — 12 keys added to `js/i18n.js`. No data-model implications.

---

## State transitions

The `Selection` has only two states: empty and non-empty. The toolbar visibility is a function of `selection.size > 0` AND viewport ≥ 768 px. There are no mid-batch states beyond a soft "in progress" UI lock (FR-011), which is held in a module-level boolean inside `bulk-actions.js` (not part of the persistent data model).
