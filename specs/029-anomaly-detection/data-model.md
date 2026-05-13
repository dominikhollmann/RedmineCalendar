# Data Model: Time Entry Anomaly Detection

**Feature**: 029-anomaly-detection
**Date**: 2026-05-10
**Phase**: 1 (Design & Contracts)

This feature has **no persistent data**. The only entity is a transient per-render Map.

---

## Persistent storage

| Key    | Source | Read by this feature? | Written by this feature? |
| ------ | ------ | --------------------- | ------------------------ |
| (none) | —      | —                     | —                        |

No new keys, no schema changes.

---

## Transient entity: `AnomalyTag`

Computed once per render of the visible week.

### Shape

```ts
type AnomalyTag = {
  ruleIds: ('very-short-entry' | 'overlapping-entries')[]; // every rule that matched
  reasons: string[]; // localized human-readable strings, one per matched rule, ordered identically to ruleIds
};
```

### Container shape

```ts
type AnomalyMap = Map<string /* entryId */, AnomalyTag>;
```

Only entries that match at least one rule appear as keys. Entries that match no rule are simply absent from the Map (cheaper than storing empty tags).

### Computation

`detectAnomalies(entries: Entry[], { breakTicket, holidayTicket }) → AnomalyMap`:

1. Filter out break-ticket entries from the working set used by both rules.
2. For each remaining entry, evaluate `veryShortEntry(entry)`: returns a reason string or `null`.
3. Group remaining entries by `spentOn` (date string). Within each group, run `overlappingEntries(group)`: a pairwise pass that, for each colliding pair, records the reason string referencing the _other_ entry on both sides of the pair.
4. Aggregate the per-rule results into the AnomalyMap, merging reasons when an entry matches both rules.
5. Return the Map.

### Pure helpers

```ts
veryShortEntry(entry, t): string | null
// Returns t('anomaly.veryShort.reason', { hours: entry.hours }) iff entry.hours <= 0.1.

overlappingEntries(dayGroup, t): Map<string, string[]>
// Returns a Map<entryId, reasonString[]> for every entry in the day-group that overlaps any other entry in the same group.
// Reason text references the OTHER entry's time range: "Overlaps with 14:30–15:30 entry on the same day".
// Back-to-back ([14:00–15:00] and [15:00–16:00]) does NOT count as overlap (FR specifies strict intersection).
// Break-ticket entries MUST be excluded from dayGroup before calling this function.
```

### Invariants

- `detectAnomalies` is **pure**: no DOM access, no `Date.now()`, no `localStorage`. Reasons come from the `t()` function passed in (or via i18n module reference).
- Break-ticket entries (`entry.issueId === breakTicket`) are NEVER keys in the returned Map (FR-003, SC-006).
- An entry that matches both rules has `ruleIds.length === 2` and `reasons.length === 2`.
- `reasons` text is localized at compute time (so the consumer doesn't need to re-localize at render).
- Holiday-ticket entries are not specially excluded — they participate in both rules normally (they have full 8h duration so they won't match `very-short-entry`; they only match `overlapping-entries` if they actually overlap something else).

---

## State transitions

There are no state transitions to model — `AnomalyMap` is recomputed from scratch on each `loadWeekEntries` call. Any CRUD that triggers a refetch causes a fresh evaluation, which satisfies FR-005 (badge appears/disappears live).

---

## i18n keys

See research.md §R6 — six keys added to `js/i18n.js` (EN + DE). No data-model implications.
