# Phase 1 Data Model: Booking Modal Redesign

No backend/schema changes. All entities below are in-memory view state or reuse existing
`localStorage` structures; only the modal-size entity is new.

## Ticket reference (`TicketRef`) — reused, unchanged

The minimal ticket descriptor already used by the modal, favourites, and last-used lists.

| Field               | Type                          | Notes                                                                                        |
| ------------------- | ----------------------------- | -------------------------------------------------------------------------------------------- |
| `id`                | number                        | Redmine issue id.                                                                            |
| `subject`           | string                        | Issue subject.                                                                               |
| `projectName`       | string                        | Human project name; `''` when unknown (backfilled by `enrichStaleTickets`).                  |
| `projectIdentifier` | string \| null                | Project slug; used by `formatProject()`.                                                     |
| `is_closed`         | boolean (optional, transient) | Fetched async via `fetchIssueStatus(es)`; drives the closed-ticket icon + save confirmation. |

- **Source**: `searchIssues()` results, `getLastUsed()`, `getFavourites()`.
- **Display**: rendered by `makeRow()` (Phase 1 rows) and the Phase-2 selected-ticket block.
- **Truncation rule (FR-005)**: `#id` (never truncates, `flex:none`), subject (ellipsis), project
  line (ellipsis); full `#id subject — project` in the row button's `title`.
- **Favourite state**: not stored on `TicketRef`; derived at render time from `getFavourites()` so
  all views stay in sync (FR-007). Toggling re-renders Phase-1 columns **and** the Phase-2 star.

## Booking draft (`BookingDraft`) — reused, unchanged

The in-progress booking composed in the modal. Not a stored object; assembled at save time by
`collectSaveInputs()` + `computeSaveHours()` into the existing Redmine payload.

| Field           | Type                   | Source control                   | Notes                                                                                                                     |
| --------------- | ---------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `selectedIssue` | `TicketRef` \| null    | Phase-1 row click                | Drives Phase 2; `null` disables Save.                                                                                     |
| `date`          | string `YYYY-MM-DD`    | Phase-2 `#lean-info-date`        | Prefilled from entry/prefill/today.                                                                                       |
| `startTime`     | string `HH:MM` \| null | Phase-2 `#lean-info-start`       |                                                                                                                           |
| `endTime`       | string `HH:MM` \| null | Phase-2 `#lean-info-end`         | Auto-filled from start + default hours if empty.                                                                          |
| `duration`      | derived                | —                                | `diffMinutes(start,end)`; formatted via `formatDuration()` ("1h 30m"); "0m (break)" for the break ticket. **Not stored.** |
| `comment`       | string                 | Phase-2 `#lean-comment` textarea | Optional.                                                                                                                 |
| `activityId`    | number (implicit)      | default activity                 | Unchanged (`_defaultActivityId`).                                                                                         |

- **Validation** (`validateTimeInputs`, unchanged): ticket required → date required → start required
  → end required → end > start. Break ticket bypasses duration via `breakHoursForRedmine()`.
- **Persistence path** (unchanged): `createTimeEntry` (new) / `updateTimeEntry` (edit) with an
  `undo:push` event; delete via `deleteTimeEntry` behind `runDeleteGuard` + confirm overlay.

## Modal size (`ModalSize`) — NEW

Persisted UI window size for the resizable modal (FR-010, clarified: persist across sessions).

| Field | Type        | Notes                                                                        |
| ----- | ----------- | ---------------------------------------------------------------------------- |
| `w`   | number (px) | Card width; clamped to `[MIN_W(780), min(maxW, 0.95·innerWidth)]` on read.   |
| `h`   | number (px) | Card height; clamped to `[MIN_H(420), min(maxH, 0.95·innerHeight)]` on read. |

- **Storage key**: `redmine_calendar_booking_modal_size` (`STORAGE_KEY_BOOKING_MODAL_SIZE` in
  `js/config.js`).
- **Shape on disk**: JSON `{"w":1180,"h":720}`. Absent/corrupt → fall back to the CSS default
  (≈1040×660); `clampModalSize()` guarantees a usable size regardless of stored value or viewport.
- **Lifecycle**: read + applied (clamped) on `openForm`; written (clamped) when a resize settles.
  Contains only a window geometry — **no personal data** (DSGVO: all triggers "No").

## Keyboard-navigation state (`nav`) — reused, unchanged

Shared `nav = { visibleRows, highlightedIndex, searchMode }` object in
`time-entry-form-utils.js`. `visibleRows` is the flat ticket list for ArrowUp/Down/Enter; in the
redesign it is populated from the inline Suche results when searching, else from last-used +
favourites (unchanged semantics, new render target for search).

## State transitions

```text
open(entry|null, prefill)
  → apply persisted ModalSize (clamped)  → render Phase 1 (search empty-state, last-used, favs)
  → populate Phase 2 from entry/prefill (or empty selected-ticket placeholder)

type in Suche
  → q<2 or empty: Suche list shows "Tippen, um zu suchen"; visibleRows = last-used+favs
  → q≥2 (debounced): searchIssues → rows, or "Keine Treffer" on zero matches

click any Phase-1 row  (or Enter on highlighted)
  → selectedIssue set → Phase 2 selected-ticket + star + duration update in place
  → async fetchIssueStatus → closed icon/confirm if closed
  → if fastMode: doSave() → persist → close   (else: stay open for editing)

edit date/start/end     → duration recomputed (break ticket → "0m (break)")
toggle favourite (any)  → getFavourites() mutated → re-render Phase-1 cols + Phase-2 star
resize card             → on settle: setModalSize(clamp({w,h}))
Save / Enter (selected) → validate → guards → persist → undo:push → close
Delete (edit only)      → runDeleteGuard → confirm overlay → deleteTimeEntry → undo:push → close
Cancel / Escape / ✕     → close (onCancel)
```
