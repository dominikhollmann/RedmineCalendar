# Tasks: Booking Modal Redesign

**Feature**: 055-booking-modal-redesign | **Branch**: `055-booking-modal-redesign`
**Input**: [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md),
[contracts/](contracts/), [spec.md](spec.md), [quickstart.md](quickstart.md)

Presentation-only restructure of the existing `lean-time-modal`. Files touched:
`js/time-entry-form-view.js`, `js/time-entry-form.js`, `js/time-entry-form-utils.js`,
`css/time-entry.css`, `js/config.js`, `js/i18n/{en,de}.js`, plus tests and user docs. The public
`openForm(...)` contract MUST NOT change (see [contracts/openForm.md](contracts/openForm.md)).

Test architecture (Constitution III): node Vitest for pure helpers, jsdom Vitest for DOM factories,
Playwright for FullCalendar-integrated flows + resize/scroll + the `@axe-core/playwright` WCAG 2.2
AA gate in both themes.

---

## Phase 1: Setup

- [x] T001 [P] Add `STORAGE_KEY_BOOKING_MODAL_SIZE = 'redmine_calendar_booking_modal_size'` to `js/config.js` (follow the existing `STORAGE_KEY_*` block; see [contracts/storage.md](contracts/storage.md)).
- [x] T002 [P] Add the new modal copy keys to `js/i18n/en.js`: `modal.title_add`, `modal.close_aria`, `modal.phase1_heading`, `modal.phase2_heading`, `modal.search_label`, `modal.search_empty`, `modal.selected_ticket_label`, `modal.comment_label`, `modal.fav_toggle_aria` (EN values per [contracts/dom-a11y.md](contracts/dom-a11y.md)); verify `modal.last_used_heading`/`favourites_heading`/`title_add` do not already exist and reuse if they do.
- [x] T003 [P] Add the same keys with German values to `js/i18n/de.js` (DE values per [contracts/dom-a11y.md](contracts/dom-a11y.md)): "1 · Ticket auswählen", "2 · Details der Buchung", "Suche", "Tippen, um zu suchen", "Ausgewähltes Ticket", "Kommentar (optional)", "Favorit umschalten", "Schließen", "Buchung hinzufügen". Keep en.js and de.js key sets identical.

---

## Phase 2: Foundational (blocking — the shell every phase renders into)

- [x] T004 Rewrite `buildModalHtml()` in `js/time-entry-form-view.js` to the two-phase shell per [contracts/dom-a11y.md](contracts/dom-a11y.md): `.lean-card` → `.lean-error`, `.lean-header` (title `modal.title_add` + `#lean-close` button `aria-label=modal.close_aria`), `.lean-scroll` (the only scroll region) containing `.lean-phase1` (heading + 3-col grid: Suche/Zuletzt/Favoriten) and `.lean-phase2` (heading + 3-col grid: selected-ticket/date-time/comment), and `.lean-actions` footer. Keep the confirm-overlay markup unchanged. Preserve all reused ids (`lean-search`, `lean-search-results`, `lean-list-lastused`, `lean-lastused-empty`, `lean-list-favs`, `lean-favs-empty`, `lean-ticket-idtitle`, `lean-ticket-proj`, `lean-ticket-star`, `lean-info-date/start/end/dur`, `lean-comment`, `lean-save/cancel/delete`).
- [x] T005 Update `$e()` in `js/time-entry-form-view.js` to collect the new refs (`lean-close`) and drop any removed ones; keep it throwing `TypeError` on missing required elements.
- [x] T006 Rewrite `makeRow()` in `js/time-entry-form-view.js` to return a `.lean-row-wrap` flex container holding a selecting `<button type="button" class="lean-row" title="#id subject — project">` (with `.lean-row-title` = `.lean-row-id` + ellipsis `.lean-row-subject`, then ellipsis `.lean-row-project`, closed-icon when closed) and a **sibling** star `<button>` — no button-in-button (research D3/D3a). Keep `attachLabelTooltip` + closed-status cache behaviour. Update `makeStar()` to set `type="button"` + `aria-pressed`.
- [x] T007 Replace the `.lean-*` modal layout in `css/time-entry.css` with the two-phase shell CSS: resizable `.lean-card` (`resize:both; overflow:hidden; width:1040px; height:min(660px,88vh); min-width:780px; min-height:420px; max-width:95vw; max-height:95vh; display:flex; flex-direction:column`), fixed `.lean-header`/`.lean-actions` (`flex:0 0 auto`), single `.lean-scroll` (`flex:1 1 auto; min-height:0; overflow-y:auto` + `var(--space-1)` padding & equal negative margin for focus-ring buffer — Known Pitfall #2). All colour via tokens (`--color-*`, `--space-*`, `--radius`, `--shadow-28`, `--color-warning-amber`); no hex outside `base.css`.
- [x] T008 Wire `ensureModal()` / `setupFormListeners()` in `js/time-entry-form.js` for the new shell: keep the `#lean-search` input, `#lean-info-start/end` change listeners; add `#lean-close` click → `closeModal`; keep cancel/save/delete bindings. No change to `openForm(...)` signature.

**Checkpoint**: modal opens with both phase skeletons, header/footer fixed, resizable card, no console errors.

---

## Phase 3: User Story 1 — Select a ticket in one click (P1) 🎯 MVP

**Goal**: Three equal Phase-1 columns; one click on any row selects the ticket and updates Phase 2;
Suche is empty-until-typed with distinct empty/no-match states; rows truncate + tooltip.
**Independent test**: quickstart Scenarios 1–3.

- [x] T009 [P] [US1] jsdom Vitest for `makeRow()`/`makeStar()` in `tests/unit/`: asserts the row is a `<button>`, star is a sibling `<button>` with `aria-pressed`, `title` carries `#id subject — project`, and the three text spans have the ellipsis classes. (Promote to coverage gate only if it reaches thresholds; else leave view module excluded.)
- [x] T010 [P] [US1] node Vitest for the search empty-state decision in `tests/unit/` (a small pure helper `searchColumnState(query, results)` → `'empty' | 'no-match' | 'results'`, extracted into `js/time-entry-form-utils.js`) covering empty query, `<MIN_QUERY_LEN`, zero matches, and matches.
- [x] T011 [US1] Add `searchColumnState()` (or equivalent pure helper) to `js/time-entry-form-utils.js` and a `renderSearchColumn()` path in `js/time-entry-form-view.js` that renders results **inline into `#lean-search-results` inside the Suche column list box** (not a floating dropdown), showing `modal.search_empty` when empty and `modal.no_results` on zero matches (research D2).
- [x] T012 [US1] Update `onSearchInput()` in `js/time-entry-form.js` to drive the inline Suche column: empty/short query → show `modal.search_empty` + rebuild `nav.visibleRows` from last-used+favs; `≥ MIN_QUERY_LEN` → debounced `searchIssues()` → `renderSearchColumn(results)` (keep 300 ms debounce + error path). Remove the old floating-dropdown show/hide logic.
- [x] T013 [US1] Point `renderLastUsed()` / `renderFavs()` / `renderSearchResults` at the new column list boxes in `js/time-entry-form-view.js`; keep favourite-star wiring and `enrichStaleTickets`; keep `applyHighlight()` keyboard highlight working against the new row buttons.
- [x] T014 [US1] Confirm `selectAndSave()` in `js/time-entry-form.js` updates the always-visible Phase 2 in place (no dropdown to hide beyond clearing search results), preserving the async `fetchIssueStatus` closed-check and the fast-mode `doSave()` branch (contracts/openForm.md).
- [x] T015 [US1] CSS in `css/time-entry.css`: Phase-1 3-col grid (`grid-template-columns:1fr 1fr 1fr; gap:var(--space-4)`), column labels as subordinate 12px grey (NOT bold section style — Known Pitfall #5), Suche input with left-inset search glyph, list boxes (`1px solid var(--color-border); border-radius:var(--radius); overflow-y:auto`), row button (`min-height:46px; flex:none; single-line ellipsis`), selected state (`.lean-row--selected` tint + `inset 3px 0 0 var(--color-primary)`), star colours via `--color-warning-amber`.
- [x] T016 [US1] Add the inline Fluent "Search" SVG glyph to the Suche input markup in `js/time-entry-form-view.js` (`aria-hidden`, `fill:var(--color-muted)`, absolutely positioned, `pointer-events:none`) — research D9.
- [x] T017 [US1] Playwright spec in `tests/ui/`: open modal → assert 3 columns under `modal.phase1_heading`; click a row in each of Suche/Zuletzt/Favoriten → Phase 2 reflects it; empty Suche shows `modal.search_empty`; a zero-match query shows `modal.no_results`; long subject truncates (no wrap) and exposes a `title`.

**Checkpoint**: US1 fully usable and testable on its own.

---

## Phase 4: User Story 2 — Adjust booking details without extra clicks (P1)

**Goal**: Always-visible Phase 2 with selected-ticket+star, date/start/end/duration, comment;
duration auto-computes; favourite state stays in sync across Phase 1 and Phase 2.
**Independent test**: quickstart Scenario 4.

- [x] T018 [US2] Build the Phase-2 selected-ticket column in `js/time-entry-form-view.js`/`updateTicketInfo()`: label `modal.selected_ticket_label`, `#lean-ticket-idtitle` (ticket link/`#id subject`, wraps freely — it's the chosen item), `#lean-ticket-proj`, and the `#lean-ticket-star` toggle with `aria-pressed` + `aria-label=modal.fav_toggle_aria`, inset ~13px on the content row only (Known Pitfall #5). Reuse `buildTicketLink`, `makeClosedIcon`, `updateTicketStar`.
- [x] T019 [US2] Build the Phase-2 date/time column: `modal.date_label` full-width `#lean-info-date` row, then `Start`/`Ende` (`#lean-info-start`/`#lean-info-end`) side-by-side with labels above, then `Dauer` read-only `#lean-info-dur` — reuse `initTimeInputs`, `onStartChange`, `onEndChange`, `setDurationText`, `applyHoursLock` unchanged; ensure no row stretches (Known Pitfall — no `flex:1 1 100%` on date).
- [x] T020 [US2] Build the Phase-2 comment column: label `modal.comment_label` above a `#lean-comment` `<textarea resize:none>` that stretches to the column height (`flex:1` in a `flex-direction:column` column); keep the existing prefill/read wiring in `openForm`/`doSave`.
- [x] T021 [US2] Ensure favourite-toggle sync: toggling the star in any Phase-1 row OR the Phase-2 selected-ticket star re-renders Phase-1 columns and refreshes the Phase-2 star (reuse `_refreshTicketStar`/`setTicketStarRefresher`/`updateTicketStar`); verify no stale listeners after `cloneNode` replace.
- [x] T022 [US2] CSS for Phase 2 in `css/time-entry.css`: flat `border-top:1px solid var(--color-border); padding-top:var(--space-3)` divider (NO box wrapper — research D5), `flex:0 0 auto` (content-sized, no internal `overflow-y`), 3-col grid aligned to Phase 1, label left-edge flush across both phases (Known Pitfall #5).
- [x] T023 [US2] Playwright spec in `tests/ui/`: select a ticket → edit Start/Ende → `#lean-info-dur` recomputes ("Xh Ym"); type a comment + Save → entry created with edited values; toggle the Phase-2 star → Favoriten column + matching Phase-1 rows update.

**Checkpoint**: US1 + US2 = a fully usable redesigned modal at default size.

---

## Phase 5: User Story 3 — Resize and use the space (P2)

**Goal**: Wider default; user-resizable with persisted size; Phase 1 absorbs extra height; Phase 2
stays content-sized; header/footer fixed with the middle scrolling at the floor.
**Independent test**: quickstart Scenarios 5–6.

- [x] T024 [P] [US3] node Vitest in `tests/unit/` for `clampModalSize(size, viewport)`: below-floor → floor, above-max → 95% cap, within-bounds → unchanged, tiny viewport → still usable (contracts/storage.md).
- [x] T025 [P] [US3] jsdom Vitest in `tests/unit/` for `getModalSize()`/`setModalSize()`: round-trip, corrupt-JSON → null, absent → null.
- [x] T026 [US3] Add `getModalSize()`, `setModalSize()`, `clampModalSize()` to `js/time-entry-form-utils.js` using `STORAGE_KEY_BOOKING_MODAL_SIZE` (pure clamp; try/catch read like `getFavourites`).
- [x] T027 [US3] In `openForm()` (`js/time-entry-form.js`): on open, read `getModalSize()`, `clampModalSize` against `innerWidth/innerHeight`, and apply to the card's inline `width`/`height` (fall back to CSS default when null). Attach a settle-debounced `ResizeObserver` (or `pointerup`) on `.lean-card` that persists the clamped `{w,h}` via `setModalSize`; detach on `closeModal`.
- [x] T028 [US3] CSS in `css/time-entry.css`: confirm `.lean-card` resize bounds (T007) and that `.lean-phase1` wrapper `flex:1 1 200px; min-height:120px` (grows to absorb free height — Known Pitfall #4) while `.lean-phase2` is `flex:0 0 auto`; verify the middle `.lean-scroll` scrolls (header/footer fixed) at the min-height floor with the comment box + focus ring fully visible (Known Pitfalls #2–4).
- [x] T029 [US3] Playwright spec in `tests/ui/`: default size not truncating; drag-resize taller → Phase-1 lists gain rows, Phase-2 height unchanged; shrink to floor → header/footer stay, middle scrolls, comment visible; close+reopen → restored to last size.

**Checkpoint**: all three user stories complete and independently verified.

---

## Phase 6: Polish & Cross-Cutting

- [x] T030 [P] Remove dead CSS/JS from the old design in `css/time-entry.css` + `js/time-entry-form-view.js` (old `.lean-search-results` floating dropdown rules, `.lean-columns`/`.lean-col--main`/`.lean-ticket-info` panel styles, `.lean-col-heading` bold style if superseded) — keep anything still referenced (confirm overlay, AI-highlight, bulk-day notice, source-event, closed-icon).
- [x] T031 [P] Update the mobile `@media (width <= 767px)` block in `css/time-entry.css` for the two-phase layout (stack Phase-1 columns; keep touch target sizes; ensure Phase 2 still visible) — retain existing responsive behaviour per spec Assumptions.
- [x] T032 [P] Update user docs `docs/content.en.md` and `docs/content.de.md` to describe the two-phase booking modal + resize (Housekeeping rule).
- [x] T033 Run the axe WCAG 2.2 AA modal scan (`@axe-core/playwright`) over `#lean-time-modal` in **light and dark** themes; fix any new violations (focus order, contrast, names) — zero new violations required (FR-017, SC-006).
- [x] T034 Manual Known-Pitfalls verification pass (research + README): tab through every control at the min-size floor confirming no clipped focus rings (#2/#3), Phase 2 never clipped by Phase 1 (#4), all labels flush at the same left edge across both phases (#5).
- [x] T035 Run the full local gate: `npm run lint && npm run format:check && npm run htmlhint && npm run typecheck && npm run knowledge:check && npm run dup:check && npm run test:coverage && npm run sqi` — all pass (SQI composite ≥ 80); promote any newly ≥95% module off the coverage exclude list per the promotion rule.
- [x] T036 Run `npm run test:ui` (full Playwright) and confirm the existing openForm-driven flows (save/edit/delete/closed/break/bulk/fast-mode) still pass against the new DOM, updating only DOM selectors (not behavioural expectations) where needed (contracts/openForm.md).

---

## Dependencies & Execution

- **Setup (T001–T003)** → no deps; all `[P]`.
- **Foundational (T004–T008)** → depends on Setup; blocks all user stories. T004→T005 (refs after markup), T004→T006/T007 (styling the markup), T008 after T004/T005.
- **US1 (T009–T017)** → depends on Foundational. Tests T009/T010 `[P]` first; T011 needs T010's helper; T012 needs T011; T013/T014 after T011; T015/T016 `[P]` CSS/markup; T017 last.
- **US2 (T018–T023)** → depends on Foundational (can start after US1 or in parallel by a second worker since it touches Phase-2 DOM; shares files with US1 so coordinate edits). T018–T020 build columns; T021 sync; T022 CSS; T023 test.
- **US3 (T024–T029)** → depends on Foundational; helper tests T024/T025 `[P]`; T026 then T027; T028 CSS; T029 test. Independent of US1/US2 logic.
- **Polish (T030–T036)** → after the user stories. T030–T032 `[P]`; T033/T034 verification; T035/T036 gates last.

**Parallel opportunities**: T001‖T002‖T003; T009‖T010; T015‖T016; T024‖T025; T030‖T031‖T032.

**MVP scope**: Phases 1–3 (Setup + Foundational + US1) deliver the core one-click two-phase
selection. US2 completes editable details; US3 adds resize/persistence.

**Independent test criteria**:

- US1 → quickstart Scenarios 1–3 (two phases visible, one-click select, search states, truncation).
- US2 → quickstart Scenario 4 (editable details, duration recompute, favourite sync).
- US3 → quickstart Scenarios 5–6 (resize + persist, Phase-1 absorbs space, fixed header/footer scroll).
