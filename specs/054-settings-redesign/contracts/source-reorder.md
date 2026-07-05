# Contract: Planning-Source Reorder (#274)

Pure logic: `js/source-order.js` (unit-tested). UI glue: `js/settings-sources.js` (Playwright-tested).

## Pure API (`source-order.js`)

```text
KNOWN_SOURCES = ['outlook', 'teams']   // extensible

readOrder() -> string[]
  // reads STORAGE_KEY_PLANNING_SOURCE_ORDER, normalizes:
  //   - drop unknown ids, de-dupe
  //   - append any KNOWN_SOURCES id missing from the stored array
  //   - missing/invalid key => KNOWN_SOURCES default order

writeOrder(order: string[]) -> void          // normalizes then persists

move(order: string[], from: number, to: number) -> string[]   // pure, returns new array
moveUp(order, index) -> string[]              // no-op at index 0
moveDown(order, index) -> string[]            // no-op at last index

canMoveUp(order, index) -> boolean
canMoveDown(order, index) -> boolean
```

`writeOrder` (or the caller) dispatches `planning:sources-changed` so `planning-view.js` re-renders.

## UI contract (`settings-sources.js`)

Each source row (`role="listitem"` in a `role="list"`): reorder grip `<button>` + enable `<input type=checkbox>` + label + position badge.

- **Desktop drag**: native HTML5 drag of the row; drop reorders via `move()`.
- **Desktop keyboard**: grip is a `<button aria-label=…>`. Space/Enter grabs (row gets `--nav-active-bg` bg + brand border + shadow; announce `settings.sources.grabbed`); ↑/↓ call `moveUp`/`moveDown` and keep focus on the moved grip; Space/Esc drops (announce `settings.sources.dropped`).
- **Mobile**: up/down arrow `<button>`s per row; `disabled` when `!canMoveUp`/`!canMoveDown`; ≥44px targets.
- **Every move**: re-render position badges; announce new position via the visually-hidden `role="status"` `aria-live="polite"` region, e.g. `settings.sources.moved` → "Outlook verschoben — Position 1 von 2".

## Application contract (`planning-view.js`)

- Read order via `readOrder()` where columns/headers are assembled.
- Bookings column stays first; outlook/teams columns + headers emitted in stored order.
- Absent key → default order (backwards compatible).

## Acceptance (maps to spec US3, WCAG 2.5.7)

- Order persists and is reflected in the planning views.
- Full reorder achievable with keyboard only (desktop) and arrow buttons only (mobile) — no pointer required.
- Arrow buttons disabled at the ends (no silent no-op surprise); keyboard move past an end keeps focus on the grip.
- Every move announced via `aria-live`.
