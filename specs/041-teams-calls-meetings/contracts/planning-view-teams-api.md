# Contract: planning-view-teams.js and planning-view-cache.js (Feature 041)

---

## Module: `js/planning-view-teams.js`

Teams column renderer. Mirrors the public API of `js/planning-view-outlook.js`.

---

### `renderTeamsColumn(container, date, bookings, bookingsContainer)`

```typescript
/**
 * Fetch Teams calls and meetings, classify them, and render into container.
 *
 * Errors in this function MUST NOT propagate — the Teams column degrades
 * independently; Bookings and Outlook columns are unaffected (FR-014).
 *
 * @param container         Host element for the Teams column (cleared on entry)
 * @param date              Planning day in 'YYYY-MM-DD' format
 * @param bookings          Existing Redmine time entries for the day (coverage check)
 * @param bookingsContainer Bookings FC element (for slot-height measurement)
 * @returns                 Array of PlanningEvent rendered (may be empty)
 */
export async function renderTeamsColumn(
  container: HTMLElement,
  date: string,
  bookings: TimeEntry[],
  bookingsContainer: HTMLElement
): Promise<PlanningEvent[]>;
```

**Behaviour**:
- Checks `STORAGE_KEY_PLANNING_SOURCE_TEAMS` (`localStorage`). If `'0'` or absent, renders
  nothing and returns `[]` immediately.
- If MSAL not signed in, renders a reconnect prompt (same visual as Outlook column).
- Shows a loading spinner while Graph API calls are in flight.
- Replaces spinner with rendered cards on success, or an error prompt with retry on failure.
- On permissions unavailable (HTTP 403 for required scopes), renders a non-blocking
  unavailable state (FR-015).
- All errors are caught internally; never throws (FR-014).

---

### `rerenderTeamsColumn(container, planningEvents, bookingsContainer)`

```typescript
/**
 * Re-render the Teams column using already-fetched events.
 * Called after working-hours toggle changes the Bookings FC's slot geometry.
 *
 * @param container         Host element for the Teams column (cleared on entry)
 * @param planningEvents    Previously rendered PlanningEvent array
 * @param bookingsContainer Bookings FC element (for updated slot-height measurement)
 */
export function rerenderTeamsColumn(
  container: HTMLElement,
  planningEvents: PlanningEvent[],
  bookingsContainer: HTMLElement
): void;
```

---

### `getSelectedEventIds(): Set<string>`

Returns the column-scoped selection as a set of planning event IDs. Safe to call when the
column is not rendered (returns empty set).

---

### `getSelectedEvents(): PlanningEvent[]`

Returns the full `PlanningEvent` objects for currently selected events in this column.

---

### `clearSelection(): void`

Clears the Teams column's `_selectedIds` state and removes all selection CSS classes from
rendered cards. Called by `planning-view.js` when a click or drag starts in a different
column (FR-010 — column-scoped selection).

---

## Module: `js/planning-view-cache.js`

Session-scoped memoisation cache for Redmine issue lookups. Shared singleton across all
Planning View event-source columns.

---

### `cachedLookupIssue(ticketId, fetchFn)`

```typescript
/**
 * Return a Redmine issue info object, using the in-memory cache if available.
 *
 * On cache miss: calls fetchFn(), stores the result on success, returns it.
 * On fetchFn() failure: does NOT cache; next call will retry (FR-017).
 *
 * @param ticketId  Redmine issue number
 * @param fetchFn   Async function that fetches IssueInfo from the Redmine API
 * @returns         IssueInfo on success, null if the issue cannot be resolved
 */
export async function cachedLookupIssue(
  ticketId: number,
  fetchFn: () => Promise<IssueInfo | null>
): Promise<IssueInfo | null>;
```

**Invariants**:
- Cache is keyed by `ticketId` (number).
- A successful `null` return from `fetchFn` (issue not found) IS cached to prevent repeated
  lookups for a known-absent issue.
- An exception thrown by `fetchFn` (network error, HTTP 5xx) is NOT cached; the exception
  propagates to the caller.
- The cache Map is never written to localStorage, IndexedDB, or any persistent store (FR-018).

---

### `clearCache(): void`

Resets the cache Map to empty. **For unit tests only** — never called during normal
application operation.
