# Contracts: Shared Abstractions (Feature 048)

Interface contracts for the modules this refactor introduces or extends. These
are **internal JS module contracts** (the only "interface" a static SPA exposes
across its own modules). Signatures are normative; bodies are implemented in
`/speckit-implement`. Each contract is behaviour-preserving unless a Part-C
divergence is converged (then the contract pins the agreed correct behaviour).

## `planning-view-column-render.js` (NEW)

```js
/**
 * Shared render lifecycle for a readonly planning column (Outlook, Teams, …).
 * Owns: FC teardown, container reset, selection reset, availability short-circuit,
 * spinner+error fetch, buildPlanningEvents, mount, return.
 * @param {{
 *   container: HTMLElement, date: string, bookings: TimeEntry[],
 *   col: ColumnState, fcRef: { current: object|null },
 *   availabilityGuard: (c:HTMLElement,d:string,b:TimeEntry[]) => Promise<boolean>|boolean,
 *   fetchAndBuild: () => Promise<Array<BuildItem>|null>,
 *   errorKey: string, retryKey: string,
 * }} config
 * @returns {Promise<PlanningEvent[]>}  rendered events ([] on guard/fetch short-circuit)
 */
export async function renderPlanningColumn(config) {}

/**
 * Re-render an already-mounted column in place (slot-height / booking change).
 * No-op when no live FC instance. Replaces identical rerenderOutlook/TeamsColumn.
 * @param {ColumnState} col
 * @param {{ current: object|null }} fcRef
 * @param {PlanningEvent[]} planningEvents
 */
export function rerenderPlanningColumn(col, fcRef, planningEvents) {}
```

**Invariants**: identical observable output to today's `renderOutlookColumn` /
`renderTeamsColumn` for the same inputs; selection pool semantics unchanged
(shared `_sharedSelectedIds`); calls `mountReadonlyFcColumn` exactly once per
successful render.

**Consumers**: `planning-view-outlook.js` (guard = `_checkOutlookAvailability`,
`fetchAndBuild` = `_fetchAndParseProposals`+`_buildItems`),
`planning-view-teams.js` (guard = `_checkTeamsAvailability`, `fetchAndBuild` =
`_fetchTeamsActivity`+normalise+`_buildTeamsItems`).

## `markdown.js` (NEW)

```js
/**
 * Render a markdown source string to sanitised HTML (DOMPurify, ALLOWED_* policy
 * matching the hardened chatbot path). Pure given DOMPurify availability.
 * @param {string} src
 * @returns {string}  sanitised HTML
 */
export function renderMarkdown(src) {}
```

**Invariants**: output is always DOMPurify-sanitised; supported syntax subset is
the union agreed in the Part-C #1 divergence check; never weaker than the current
`chatbot.renderMessage` sanitisation.

**Consumers**: `chatbot.js`, `docs.js`.

## `http.js` (NEW)

```js
/**
 * Fetch + ok-check + JSON parse + normalised error. Transport only.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<any>}  parsed JSON
 * @throws {Error}  normalised { message } on non-ok / network / parse failure
 */
export async function fetchJson(url, options) {}
```

**Invariants**: does not inject auth headers itself (callers pass them); Redmine
callers keep `X-Redmine-API-Key` + HTTPS target in `redmine-api.js`. Error shape
matches what `chatbot-api.js`/`redmine-api.js` callers currently surface.

**Consumers**: `chatbot-api.js`, `redmine-api.js`.

## `booking-event-map.js` (NEW, or extend existing mapper)

```js
/**
 * Map a Redmine time entry (booking) to a FullCalendar event object.
 * Single source for calendar + planning-bookings column.
 * @param {TimeEntry} booking
 * @param {object} [ctx]  any shared context (config tickets, classes)
 * @returns {object}  FC event
 */
export function bookingToFcEvent(booking, ctx) {}
```

**Invariants**: pins the agreed-correct mapping after the Part-C #2 divergence
diff (rounding, title/comment, classes). If calendar and planning-bookings
currently differ accidentally, the converged behaviour is product-owner-approved
and asserted in tests.

**Consumers**: `calendar.js`, `planning-view-bookings.js`.

## `config-store.js` (EXTEND)

```js
/**
 * Resolve a positive integer ticket id from central config, else null.
 * Extracted from duplicated resolveTicket() (clone #21).
 * @param {string} field  e.g. 'breakTicket', 'holidayTicket', 'vacationTicket'
 * @returns {number|null}
 */
export function resolveConfigTicket(field) {}
```

**Invariants**: `Number.isFinite(id) && id > 0 ? id : null` — identical to the two
current copies in `event-classes.js` / `calendar-overlays.js`.

**Consumers**: `event-classes.js`, `calendar-overlays.js` (and any other
`resolveTicket` site found during implement).

## Gate contracts (non-code)

- `dup-baseline.json`: `{ clones: <measured+headroom, <20>, percentage: <≤1.5> }`.
- `js/knowledge.topics.json`: routes `planning-view-column-render`, `markdown`,
  `http`, `booking-event-map` (and any other new module) — `knowledge:check` green.
