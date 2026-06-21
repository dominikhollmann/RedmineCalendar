# Research: Modal UX Improvements (047)

All four improvements involve existing patterns already present in the codebase.
No third-party research required. Findings below confirm implementation approach.

---

## R1 — Z-index layering for modal vs. planning FAB

**Decision**: Raise `.lean-overlay` and `.modal-overlay` z-index from `300` to `9000`.

**Rationale**: The `.planning-toggle-fab` (the calendar/planning view switch button, `#planning-view-toggle`) is rendered as a `position: fixed` element with `z-index: 8000` (`css/planning-view.css` line 38). The modal overlay sits at `z-index: 300`, so the FAB button visually pierces the backdrop and remains clickable. Raising the overlay to `9000` clears the FAB (8000) without conflicting with the ArbZG tooltip (9999) or anomaly tooltip (9999), which both have `pointer-events: none` and need not be below the modal.

**Alternatives considered**:

- Adding `pointer-events: none` to the FAB when the modal is open: requires JS state coupling; brittle if other elements also need suppression.
- Lowering the FAB z-index to below 300: would break the FAB's visibility above the calendar grid.
- `inert` attribute on the toolbar: broader API, not yet fully supported in Playwright's Chromium version used by CI.

---

## R2 — Star icon reuse for Last Used rows

**Decision**: Reuse `makeStar()` from `time-entry-form-view.js` and `toggleFavourite()` from `time-entry-form-utils.js`.

**Rationale**: `renderFavs()` (line 219) and `renderSearchResults()` (line 244) both already follow the pattern: `makeRow(ticket, onSelect)` → `makeStar(ticket, isFav, onToggle)` → append star to row. `renderLastUsed()` (line 203) builds rows identically but skips the star step. Adding the same three lines brings it into parity.

**i18n**: `modal.add_favourite` and `modal.remove_favourite` already exist in both `en.js` and `de.js`. No new keys needed for this story.

**Alternatives considered**: A separate "add to favourites" button instead of the star icon — rejected; the star is already the established affordance and keyboard-accessible.

---

## R3 — Last Used list cap and scroll

**Decision**: `RECENT_CAP = 8` → `RECENT_CAP = 20`; add `max-height: 200px` to `.lean-col--secondary .lean-list`.

**Rationale**: The constant `RECENT_CAP` is already the correct abstraction for the list limit. The `.lean-list` already has `overflow-y: auto` — it just lacks a `max-height` to activate it. The comment in `time-entry.css` line 337 ("no max-height so 5 rows fit without scrollbar") describes current intentional behaviour, which must change now that the list grows to 20. `200px` preserves ~5 rows visible before scrolling (consistent with the existing Favourites list visual rhythm).

**Alternatives considered**: Setting `max-height` on `.lean-col--secondary` instead of `.lean-col--secondary .lean-list` — less specific; would also constrain the heading and empty-state elements.

---

## R4 — Fast Mode boolean setting

**Decision**: Store as `localStorage` string `'false'` / absent (default true). Helper `getFastMode()` returns `localStorage.getItem(STORAGE_KEY_FAST_MODE) !== 'false'`.

**Rationale**: Every other boolean preference in the codebase (`redmine_calendar_view_mode`, `redmine_calendar_day_range`, `redmine_calendar_theme`) uses the same string-in-localStorage pattern with a boolean default derived by comparison. `getFastMode()` follows the same idiom. The `darkMode` checkbox wiring in `settings-page.js` lines 62–74 is the exact template to replicate.

**Alternatives considered**:

- Storing `'true'`/`'false'`: requires the key to be explicitly written on first page-load; absence-as-default is simpler and avoids a migration for existing users.
- A separate settings module: overkill for a single boolean; the existing `settings-page.js` + `config.js` pattern handles it in ~8 lines total.
