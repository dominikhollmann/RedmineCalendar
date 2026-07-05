# Phase 0 Research: Booking Modal Redesign

All Technical-Context unknowns were resolvable from the handoff package
(`.tmp/design_handoff_booking_modal/README.md` + prototype) cross-referenced against the existing
`js/time-entry-form*` modules and `css/base.css` tokens. No open `NEEDS CLARIFICATION` remain (the
two spec-level ambiguities were resolved in `/clarify`: resize persistence = localStorage; fast mode
= auto-save-and-close preserved).

## D1 — Colour routing: tokens, not the literal `#6c2bd9`

- **Decision**: Route every colour through the existing Fluent 2 tokens in `css/base.css`. Brand
  accent → `--color-primary` (which is `var(--ci-primary, var(--brand-primary))`); selected-row
  tint → `color-mix(in srgb, var(--color-primary) …%, transparent)`; favourite star → existing
  `--color-warning-amber` (`#f59e0b`, already the value used in the prototype); surfaces/borders/
  text → `--color-surface` / `--color-border` / `--color-text` / `--color-muted` / `--color-bg`;
  elevation → `--shadow-28`; radii → `--radius`; spacing → `--space-*`.
- **Rationale**: On `main` the purple `#6c2bd9` is the admin **CI override** `--ci-primary`, while
  `--brand-primary` is Fluent blue `#0f6cbd`. Hard-coding `#6c2bd9` would (a) break the stylelint
  `color-no-hex` gate outside the token block and (b) wrongly force purple even where an admin has
  not set a CI colour. The Settings redesign (Feature 054) uses the same indirection.
- **Alternatives considered**: Adding a modal-specific `--booking-accent` token — rejected (YAGNI;
  `--color-primary` already carries exactly this meaning).

## D2 — Suche results render inline in the column, empty-until-typed

- **Decision**: Replace the current floating absolutely-positioned dropdown (`.lean-search-results`,
  `position:absolute; top:100%`) with results rendered **inside the Suche column's bordered list
  box**, in the same slot that shows the empty-state message. State machine: empty query →
  `modal.search_empty` ("Tippen, um zu suchen"); query < `MIN_QUERY_LEN` → same empty state; query
  with zero matches after fetch → `modal.no_results` ("Keine Treffer"); otherwise the result rows.
- **Rationale**: FR-004 + README require the Suche column to behave like the other two columns (a
  bordered scrolling list), showing nothing until typed. A floating dropdown cannot sit "in the
  grid" and would overlay Zuletzt/Favoriten. The existing debounce (300 ms) and `MIN_QUERY_LEN` (2)
  and `searchIssues()` call are kept unchanged — only the render target moves.
- **Alternatives considered**: Keeping the dropdown and only widening the modal — rejected (fails
  FR-002's "three equal columns" and the README's explicit fix).

## D3 — Ticket row becomes a real `<button>`

- **Decision**: `makeRow()` builds a `<button type="button" class="lean-row">` (was a
  `<div role="option">`). It carries the full `#id subject — project` string in a native `title`
  attribute (plus the existing `attachLabelTooltip`) and truncates each line with
  `overflow:hidden; text-overflow:ellipsis; white-space:nowrap`. The favourite star stays a nested
  `<button>` with `aria-pressed` + `aria-label`; its click calls `stopPropagation()` so it doesn't
  select the row.
- **Rationale**: FR-006 + Accessibility + axe gate require genuine focusable controls with
  keyboard activation (Enter/Space native on `<button>`). A nested interactive button inside a
  button is invalid HTML; the star must therefore be a **sibling** of the row button (row and star
  laid out by the row container), not a descendant — see D3a.
- **D3a (nesting fix)**: Row layout = a flex container holding the selecting `<button>` (grows,
  `min-width:0`) and the star `<button>` (fixed) as **siblings**, so neither button nests inside the
  other. The container is not itself interactive.
- **Alternatives considered**: `<div role="option" tabindex="0">` with manual key handling —
  rejected (re-implements button semantics, weaker AT support, more axe risk).

## D4 — Fixed header / scrollable middle / fixed footer

- **Decision**: The card is `display:flex; flex-direction:column` with three children:
  header `flex:0 0 auto`, middle wrapper `flex:1 1 auto; min-height:0; overflow-y:auto`, footer
  `flex:0 0 auto`. Both Phase 1 and Phase 2 live **inside** the middle wrapper. Header/footer are
  never inside the scroll region.
- **Rationale**: FR-012 — the footer (Abbrechen/Speichern) must stay visible when the modal is
  short. Documented directly in the README shell spec.
- **Focus-ring buffer (Known Pitfall #2)**: the scrolling middle wrapper gets a few px of padding
  **and** an equal negative margin on all sides, so `overflow-y:auto` (which also clips overflow-x)
  does not cut focus rings of edge-flush controls (search input, comment textarea).

## D5 — Phase 1 absorbs vertical space; Phase 2 is content-sized

- **Decision**: Phase 1 wrapper `flex:1 1 200px; min-height:120px`; its inner 3-col grid
  `flex:1 1 auto; min-height:0` with each column's list box `overflow-y:auto`. Phase 2 wrapper
  `flex:0 0 auto` with **no** internal `overflow-y` and **no** box wrapper — just `border-top` +
  `padding-top`.
- **Rationale**: FR-011 + Known Pitfalls #3 and #4. `min-height:120` (not 200) prevents Phase 1
  from starving Phase 2's comment box at the size floor; Phase 2 having no second scroll context
  prevents a nested clipping context from cutting the comment field's focus ring.
- **Alternatives considered**: Giving both phases `flex:1` — rejected (Phase 2 would stretch,
  violating FR-011 and SC-004).

## D6 — Resize: native CSS `resize:both`, persisted on resize end

- **Decision**: The card uses CSS `resize:both; overflow:hidden` with `min-width:780px`,
  `min-height:420px`, `max-width:95vw`, `max-height:95vh`, default `width:1040px`,
  `height:min(660px,88vh)`. On open, if a persisted size exists it is applied (clamped to the
  min/max bounds). Size is persisted to `redmine_calendar_booking_modal_size` when the user finishes
  resizing, observed via a `ResizeObserver` debounced on the card (or a `pointerup` on the card),
  writing the clamped `{w,h}`.
- **Rationale**: FR-010 (clarified: persist across sessions). Native `resize` is the simplest
  correct mechanism (Principle IV) and needs no custom drag math; a lightweight observer handles
  persistence. Clamping on read protects against a stored size larger than the current viewport.
- **Alternatives considered**: Custom pointer-drag handle — rejected (more code, no benefit; native
  handle already sits at the card's bottom-right with `resize:both`). Persisting on every resize
  frame — rejected (writes thrash localStorage; debounce/settle instead).

## D7 — Fast mode preserved unchanged

- **Decision**: `selectAndSave()` keeps its current shape: on selection it populates the
  always-visible Phase 2, then if `getFastMode()` is true it calls `doSave()` (auto-save + close).
  When fast mode is off, Phase 2 stays populated for editing before an explicit Save.
- **Rationale**: `/clarify` decision — preserve current behaviour exactly (FR-015). The
  always-visible Phase 2 changes nothing about the fast-mode branch; it only makes the OFF path's
  editing surface permanent instead of a col-1 panel.

## D8 — i18n key reuse vs. new keys

- **Decision**: Reuse existing keys where the copy is unchanged (`modal.save_btn`,
  `modal.cancel_btn`, `modal.delete_btn`, `modal.no_results`, `modal.no_ticket`,
  `modal.duration_break`, `modal.add_favourite`, `modal.remove_favourite`, `modal.aria_label`,
  date/start/end/duration labels, closed-ticket confirm). Add new keys for the redesign-specific
  copy: `modal.phase1_heading` ("1 · Ticket auswählen"), `modal.phase2_heading`
  ("2 · Details der Buchung"), `modal.search_label` ("Suche"), `modal.last_used_heading`/
  `favourites_heading` (may already exist — reuse if so), `modal.search_empty`
  ("Tippen, um zu suchen"), `modal.selected_ticket_label` ("Ausgewähltes Ticket"),
  `modal.comment_label` ("Kommentar (optional)"), `modal.fav_toggle_aria`
  ("Favorit umschalten"), `modal.close_aria` ("Schließen"). Every string in both `en.js` + `de.js`.
- **Rationale**: FR-013 + Code Style (no hard-coded UI strings; ESLint regression rule). Reuse
  keeps the translation surface minimal (Reuse-First).

## D9 — Search icon glyph

- **Decision**: Render the Fluent "Search" glyph as an inline token-coloured SVG (fill
  `var(--color-muted)`), absolutely positioned in the input's left padding
  (`padding-left: var(--space-8)`, icon at `left: var(--space-3)`, `pointer-events:none`,
  `aria-hidden="true"`). The repo has no shared Fluent-icon module, so an inline SVG consistent with
  the design system is acceptable (spec Assumptions).
- **Rationale**: Matches the prototype and the spec's fallback allowance; avoids adding an icon
  dependency (YAGNI).
