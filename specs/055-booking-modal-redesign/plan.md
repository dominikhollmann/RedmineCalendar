# Implementation Plan: Booking Modal Redesign

**Branch**: `055-booking-modal-redesign` | **Date**: 2026-07-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/055-booking-modal-redesign/spec.md`

## Summary

Restructure the "Add booking" modal (`lean-time-modal`) into two always-visible phases on one
screen — **Phase 1 · Ticket auswählen** (three equal columns: Suche / Zuletzt verwendet / Favoriten)
directly above **Phase 2 · Details der Buchung** (selected ticket + star / date-time-duration /
comment). Clicking any Phase-1 row instantly updates Phase 2, with no confirm/next step. The modal
opens wider (≈1040×660), is user-resizable with its size persisted in `localStorage`, has a fixed
header + footer with a single scrolling middle region, routes all colour through the existing
Fluent 2 tokens (purple `--ci-primary`), and preserves every existing booking behaviour (search,
last-used, favourites, break-ticket, closed-ticket, fast-mode auto-save-and-close, delete, undo).

This is a **presentation restructure only**: the public entry point `openForm(entry, prefill,
onSave, onDelete, onCancel)` and its callback contract are unchanged, and all data flows
(`searchIssues`, favourites/last-used localStorage, `createTimeEntry`/`updateTimeEntry`/
`deleteTimeEntry`, the booking guards) are reused verbatim.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation, no build step)

**Primary Dependencies**: FullCalendar v6 (CDN, existing, indirect), DOMPurify (existing, for source-event subject sanitisation). No new runtime dependencies. **No framework** — the handoff prototype's React `Component` is authoring convenience only; it is ported to the existing vanilla module pattern (state object + explicit render/refresh functions + event listeners).

**Storage**: `localStorage` — existing keys `redmine_calendar_favourites`, `redmine_calendar_last_used`, `redmine_calendar_fast_mode` (all reused unchanged) + **one NEW key** `redmine_calendar_booking_modal_size` (JSON `{ w:number, h:number }`) for resize persistence (FR-010, clarified). No `config.json` changes; no backend/API changes.

**Testing**: Vitest (node + jsdom unit) for pure helpers and DOM-construction logic; Playwright (Chromium) for FullCalendar-integrated modal flows, resize/scroll mechanics, and the `@axe-core/playwright` WCAG 2.2 AA gate on the modal surface in both themes.

**Target Platform**: Modern evergreen browsers (desktop primary; existing mobile responsive behaviour retained via the `@media (width <= 767px)` block).

**Project Type**: Single-project static SPA (vanilla JS/CSS/HTML).

**Performance Goals**: 60 fps interaction; ticket selection updates Phase 2 within one frame (no network round-trip on the render path — closed-status fetch stays async/non-blocking as today).

**Constraints**: No hard-coded colour literals outside the `:root` token block in `css/base.css` (stylelint `color-no-hex`/`color-named`). Effective-LOC ≤500 soft / <600 hard per module (`tests/unit/module-size.test.js`). `max-lines-per-function: 60` on `js/**`. SQI composite ≥80. All user-visible copy via `t()` in `js/i18n/{en,de}.js`.

**Scale/Scope**: One modal surface. Four files rewritten/extended: `js/time-entry-form-view.js` (markup + row/column/Phase-2 factories), `js/time-entry-form.js` (state-machine wiring for inline search + resize), `js/time-entry-form-utils.js` (resize-size storage helpers), `css/time-entry.css` (full modal layout). Plus `js/config.js` (one new storage-key constant) and `js/i18n/{en,de}.js` (new/renamed copy keys).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

- **I. Redmine API Contract** — PASS. No API-client changes; reuses `searchIssues`, `createTimeEntry`, `updateTimeEntry`, `deleteTimeEntry`, `fetchIssueStatus(es)`, `formatProject` unchanged.
- **II. Calendar-First UX** — PASS. Improves the primary booking-entry surface; keeps Enter-to-activate / Escape-to-dismiss and the calendar callback contract intact.
- **III. Test-First** — PASS. Pure helpers (duration formatting reused; new `getModalSize`/`setModalSize`/`clampModalSize`) get node-Vitest tests; DOM row/column factories get jsdom tests; modal flow + resize + a11y get Playwright. Tests written against the FRs before/with implementation.
- **IV. Simplicity & YAGNI** — PASS. Restructures existing modules in place; no new abstraction layer, no parallel modal, no framework. Resize uses native CSS `resize:both` (no custom drag JS) with a small `ResizeObserver`/`pointerup` persistence hook.
- **V. Security by Default** — PASS. No new data collected, no new recipients, no credential/consent surface change. Source-event subject stays DOMPurify-sanitised. DSGVO impact checklist: all five triggers "No" (the new localStorage key stores only a UI window size — non-personal). See quickstart DSGVO note.
- **VI. Continuous Quality Gates** — PASS (target). Keeps modules under the LOC/function/complexity gates; no new hex outside tokens; i18n-complete; axe gate extended to the redesigned modal; `knowledge:check` unaffected (no new module files — existing modules stay in their topic mapping); `dup:check` respected (extend shared row/column factories rather than fork).
- **VII. Reuse-First** — PASS. Extends the existing `time-entry-form*` trio and the shared `attachLabelTooltip`, warning-badge, favourites/last-used utils rather than introducing a second modal or a second ticket-row component.

**No violations — Complexity Tracking table not required.**

## Project Structure

### Documentation (this feature)

```text
specs/055-booking-modal-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions (search-inline, resize, focus-ring, Phase-2 sizing)
├── data-model.md        # Phase 1 — Ticket ref, Booking draft, Modal-size, storage
├── quickstart.md        # Phase 1 — UAT validation scenarios ([ ] checkboxes)
├── contracts/
│   ├── openForm.md       # Public entry-point + callback contract (UNCHANGED — regression contract)
│   ├── dom-a11y.md       # DOM structure, ARIA, focus, i18n-key contract for the modal
│   └── storage.md        # localStorage key + JSON shape for modal size
├── checklists/
│   └── requirements.md   # Spec quality checklist (from /specify + /clarify)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
js/
├── time-entry-form-view.js   # REWRITE markup: two-phase shell (header/scroll-middle/footer),
│                             #   3-col Phase-1 grid, ticket row as <button> + ellipsis + title,
│                             #   inline Suche results (empty-until-typed), Phase-2 factories
│                             #   (selected-ticket+star / date-time-duration / comment). Element
│                             #   refs ($e) updated to the new ids.
├── time-entry-form.js        # ADJUST wiring: onSearchInput renders inline into the Suche column
│                             #   empty-state ("Tippen, um zu suchen" → results → "Keine Treffer");
│                             #   selection updates always-visible Phase 2; keep debounce/min-query,
│                             #   fast-mode (auto-save+close), break/closed/delete/undo/keyboard.
│                             #   Attach resize-persistence on open + persist on resize end.
├── time-entry-form-utils.js  # ADD getModalSize()/setModalSize()/clampModalSize() (pure + storage);
│                             #   keep all existing helpers unchanged.
├── config.js                 # ADD STORAGE_KEY_BOOKING_MODAL_SIZE constant.
└── i18n/{en,de}.js           # ADD/RENAME keys: phase headers, column labels, empty states,
                              #   search placeholder, favourite aria-label, close aria-label, etc.

css/
└── time-entry.css            # REPLACE .lean-* modal layout with the two-phase shell: resizable
                              #   card, fixed header/footer, single scroll wrapper (padding+negative
                              #   margin buffer for focus rings), Phase-1 3-col grid (flex:1 1 200px,
                              #   min-height:120), ticket-row button, Phase-2 flat divider (no box,
                              #   content-sized). All colour via tokens. Mobile block retained/adapted.

tests/
├── unit/                     # node/jsdom Vitest for modal-size helpers + row/Phase-2 DOM factories
└── ui/                       # Playwright: two-phase flow, inline search states, resize+persist,
                              #   scroll-at-floor, favourite sync, axe WCAG 2.2 AA (light + dark)
```

**Structure Decision**: Single-project SPA — extend the existing `js/time-entry-form*` module trio and `css/time-entry.css` in place (Assumptions in spec.md; Reuse-First / Principle VII). No new top-level directories. New module files are avoided so `knowledge.topics.json` and the module graph stay unchanged; the only additive surface is one storage-key constant and i18n keys.

## Complexity Tracking

> No Constitution Check violations — table intentionally empty.
