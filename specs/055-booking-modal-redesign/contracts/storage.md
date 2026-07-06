# Contract: Modal-size localStorage key

## Key

`redmine_calendar_booking_modal_size` — exported as `STORAGE_KEY_BOOKING_MODAL_SIZE` from
`js/config.js` (follows the existing `redmine_calendar_*` naming + `STORAGE_KEY_*` constant
convention).

## Value

JSON object `{ "w": <number px>, "h": <number px> }`, e.g. `{"w":1180,"h":720}`.

## Helper API (in `js/time-entry-form-utils.js`, pure + storage)

```js
/** Read persisted size, or null if unset/corrupt. */
export function getModalSize(): { w:number, h:number } | null

/** Persist a size (already clamped by the caller). */
export function setModalSize(size: { w:number, h:number }): void

/**
 * Clamp a size to the modal's bounds against the current viewport.
 * min 780×420; max min(0.95·innerWidth, ...) × min(0.95·innerHeight, ...).
 * PURE — viewport passed in for testability.
 */
export function clampModalSize(
  size: { w:number, h:number },
  viewport: { w:number, h:number }
): { w:number, h:number }
```

## Rules

- **Read**: `getModalSize()` returns `null` on absent/malformed JSON (try/catch, same pattern as
  `getFavourites`). Callers apply `clampModalSize(size, { w:innerWidth, h:innerHeight })` before
  setting the card's inline width/height, so a stored size larger than the current screen never
  breaks layout.
- **Write**: persisted only when a resize **settles** (debounced ResizeObserver or `pointerup`),
  with the clamped value — never on every resize frame.
- **Bounds** (must match the CSS): `MIN_W = 780`, `MIN_H = 420`, `maxW = 0.95·innerWidth`,
  `maxH = 0.95·innerHeight`. Default when unset: CSS `width:1040px; height:min(660px,88vh)`.
- **Privacy**: value is a UI window geometry only — no personal data. DSGVO triggers all "No".

## Tests

- `clampModalSize` — node Vitest: below-floor, above-max, within-bounds, tiny viewport all return
  usable bounded sizes.
- `getModalSize`/`setModalSize` — jsdom Vitest: round-trip, corrupt-JSON → null, absent → null.
