# Implementation Plan: Modal UX Improvements

**Branch**: `047-modal-ux-improvements` | **Date**: 2026-06-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/047-modal-ux-improvements/spec.md`

## Summary

Four focused improvements to the time-entry booking modal, sourced from issues #241–#244. Two are pure bug fixes (z-index overlay gap letting the planning FAB sit above the modal; Last Used list missing star icons). Two are quality-of-life enhancements (expanding the Last Used cap from 8 to 20 with a scroll boundary; Fast Mode toggle that controls whether ticket selection auto-closes the modal). All changes are confined to existing modules — no new JS files, no new dependencies, no API changes.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation)

**Primary Dependencies**: FullCalendar v6 (CDN, existing) — unaffected by this feature

**Storage**: `localStorage` — new key `redmine_calendar_fast_mode` (boolean, default true). Existing keys `redmine_calendar_favourites` and `redmine_calendar_last_used` unchanged in shape.

**Testing**: Vitest (unit — node environment) for pure-logic functions; Playwright (UI) for modal interactions, star toggle, keyboard navigation, and Fast Mode end-to-end.

**Target Platform**: Desktop browsers (Chromium/Firefox/Safari); existing mobile CSS unaffected

**Project Type**: Static SPA (vanilla JS, no build step)

**Performance Goals**: All four changes are synchronous DOM mutations or localStorage reads — no network roundtrips added. No performance regression expected.

**Constraints**: `max-lines-per-function: 60` on `js/**`; `max-lines: 500` effective-LOC on all modules. `time-entry-form.js` is at 598 lines — any additions must stay within the 600-hard-LOC limit (or extract). `time-entry-form-view.js` at 357 lines — safe. `time-entry-form-utils.js` at 205 lines — safe.

**Scale/Scope**: Single-user SPA; changes affect only the booking modal and settings page.

## Constitution Check

| Principle                          | Status | Notes                                                                                                                     |
| ---------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| I. Redmine API Contract            | ✓ PASS | No API changes; z-index fix, UI rendering, localStorage only                                                              |
| II. Calendar-First UX              | ✓ PASS | All four changes improve modal usability without touching the calendar render path                                        |
| III. Test-First                    | ✓ PASS | Unit tests for `capLastUsed` cap change and `getFastMode`; Playwright tests for all four UI stories                       |
| IV. Simplicity & YAGNI             | ✓ PASS | Reuses `makeStar`, `toggleFavourite`, existing checkbox pattern; no new abstractions                                      |
| V. Security by Default             | ✓ PASS | No external data handled; Fast Mode is a boolean preference, no sanitisation needed                                       |
| VI. Quality Gates                  | ✓ PASS | `time-entry-form.js` at 598 LOC — additions capped at 2 lines (Fast Mode read); if LOC gate is threatened, extract helper |
| VII. Reuse Before Reimplementation | ✓ PASS | Star icon reuses `makeStar`; Fast Mode helper reuses `settingsDarkMode` pattern; no parallel implementations              |

## Project Structure

### Documentation (this feature)

```text
specs/047-modal-ux-improvements/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # /speckit-tasks output
```

### Source Code (files touched)

```text
js/config.js                   # + STORAGE_KEY_FAST_MODE constant
js/time-entry-form-utils.js    # RECENT_CAP 8 → 20; + getFastMode()
js/time-entry-form-view.js     # renderLastUsed: add star icon per row
js/time-entry-form.js          # selectAndSave: skip doSave() when fast mode OFF
js/settings-page.js            # wire Fast Mode checkbox (read + onChange)
js/i18n/en.js                  # + settings.fast_mode, settings.fast_mode_hint
js/i18n/de.js                  # + settings.fast_mode, settings.fast_mode_hint
css/time-entry.css             # .lean-overlay z-index 300 → 9000; .lean-col--secondary .lean-list max-height
settings.html                  # + Fast Mode checkbox row
tests/unit/time-entry-form-utils.test.js   # capLastUsed cap=20; getFastMode
tests/ui/booking-modal.spec.js (or new)   # 4 new UI scenarios
```

## Complexity Tracking

No constitution violations — no entry required.

---

## Implementation Notes

### Story P1 — Z-index fix (Issue #244)

**Root cause**: `.planning-toggle-fab` in `css/planning-view.css` line 38 has `z-index: 8000`. The `.lean-overlay` in `css/time-entry.css` line 151 has `z-index: 300`. The FAB renders above the modal backdrop.

**Fix**: Raise `.lean-overlay { z-index: 9000 }` (above FAB's 8000, below tooltip layers at 9999). Also raise `.modal-overlay { z-index: 9000 }` for consistency.

**Note**: The mobile override in `time-entry.css` at line 468 already uses `z-index: 10000` — leave that in place.

### Story P2 — Star icon on Last Used (Issue #241)

**Root cause**: `renderLastUsed` (line 203, `time-entry-form-view.js`) builds rows via `makeRow()` but omits the star — unlike `renderFavs` (line 219) which already calls `makeStar`.

**Fix**: In `renderLastUsed`, after `makeRow(ticket, onSelect)`, compute `isFav` from `getFavourites()`, call `makeStar(ticket, isFav, () => { toggleFavourite(ticket); renderLastUsed(onSelect); renderFavs(onSelect); })`, and append it to the row.

**i18n**: `modal.add_favourite` and `modal.remove_favourite` already exist in both locale files — no new keys needed.

### Story P3 — Last Used cap 8 → 20 (Issue #243)

**Root cause**: `RECENT_CAP = 8` in `time-entry-form-utils.js` line 11. `.lean-list` has `overflow-y: auto` but no `max-height`, so 20 rows would expand the modal vertically.

**Fix**:

1. `RECENT_CAP = 8` → `RECENT_CAP = 20` in `time-entry-form-utils.js`.
2. Add `max-height` to `.lean-col--secondary .lean-list` in `time-entry.css` so the secondary columns scroll after ~8 visible rows. A value of `~200px` preserves the current visual footprint while enabling scroll for longer lists.

### Story P4 — Fast Mode (Issue #242)

**Root cause**: `selectAndSave()` in `time-entry-form.js` line 221 always calls `doSave()` unconditionally.

**Fix**:

1. `js/config.js`: add `export const STORAGE_KEY_FAST_MODE = 'redmine_calendar_fast_mode';`
2. `js/time-entry-form-utils.js`: add `export function getFastMode() { return localStorage.getItem(STORAGE_KEY_FAST_MODE) !== 'false'; }` (defaults to `true` when key absent).
3. `js/time-entry-form.js`: in `selectAndSave()`, replace `doSave()` with `if (getFastMode()) doSave();`
4. `settings.html`: add checkbox row `<input type="checkbox" id="settingFastMode" />` matching existing pattern.
5. `js/settings-page.js`: read `getFastMode()`, set `checked`, add `onChange` to write `localStorage.setItem(STORAGE_KEY_FAST_MODE, String(!fastCheckbox.checked ? 'false' : 'true'))`.
6. `js/i18n/en.js` + `de.js`: add `settings.fast_mode` and `settings.fast_mode_hint`.
