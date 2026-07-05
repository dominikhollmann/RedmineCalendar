# Contract: Modal DOM structure, ARIA, focus & i18n

Defines the target DOM/accessibility contract for the redesigned modal. Ids marked _(existing)_ are
reused by `$e()` / callers / tests and MUST keep their meaning; ids marked _(new)_ are added.

## Shell structure

```text
#lean-time-modal .lean-overlay            (existing id; role=dialog aria-modal aria-label=modal.aria_label)
  .lean-card  [resize:both]               (fixed header / scroll middle / fixed footer; resizable)
    .lean-error #lean-error               (existing; role=alert)
    .lean-header      flex:0 0 auto       (NEW) — title (modal.title_add) + close button
      button.lean-close #lean-close       (NEW) — aria-label=modal.close_aria, type=button
    .lean-scroll      flex:1 1 auto        (NEW) — the ONLY scroll region; padding+neg-margin buffer
      .lean-phase1                        (NEW) — "1 · …" heading + 3-col grid
        .lean-phase-heading               modal.phase1_heading (bold/upper/tracked, subordinate grey)
        .lean-grid (Suche | Zuletzt | Favoriten)
          .lean-col--search: label(modal.search_label) + .lean-search-wrap(input#lean-search + svg) + list#lean-search-results
          .lean-col: label(modal.last_used_heading) + list#lean-list-lastused (+ empty#lean-lastused-empty)
          .lean-col: label(modal.favourites_heading) + list#lean-list-favs (+ empty#lean-favs-empty)
      .lean-phase2      flex:0 0 auto      (NEW) — border-top divider, NO box, content-sized
        .lean-phase-heading               modal.phase2_heading
        .lean-grid (selected | datetime | comment)
          selected: label(modal.selected_ticket_label) + #lean-ticket-idtitle + #lean-ticket-proj + star#lean-ticket-star
          datetime: #lean-info-date, #lean-info-start, #lean-info-end, #lean-info-dur
          comment:  label(modal.comment_label) + textarea#lean-comment
    .lean-actions     flex:0 0 auto        (existing) — #lean-delete / #lean-cancel / #lean-save
  #lean-confirm-modal .confirm-overlay      (existing, unchanged)
```

## Ticket row (Phase-1, all three columns)

```text
.lean-row-wrap  (flex container, NOT interactive)
  button.lean-row   type=button  title="#id subject — project"
    .lean-row-title  → span.lean-row-id (#id, never truncates) + span.lean-row-subject (ellipsis)
    .lean-row-project (ellipsis)                    [+ closed-ticket icon when closed]
  button.lean-star  type=button  aria-pressed=<bool>  aria-label=modal.add/remove_favourite
```

- Row selecting button and star button are **siblings** (no button-in-button).
- Selected row: `.lean-row--selected` → brand-tinted bg + `inset 3px 0 0 var(--color-primary)`
  (box-shadow accent, not a border — no layout shift).
- Row is single-line-per-line, fixed height (~46px, `flex:none`), never wraps.

## ARIA / focus requirements (FR-006, FR-007, FR-017)

- Every interactive element is a real focusable control: search input, each ticket-row button, each
  star button, close button, date/start/end inputs, comment textarea, footer buttons.
- Star buttons expose `aria-pressed` (favourited state) + an accessible `aria-label`.
- The Phase-2 selected-ticket star: `aria-pressed` reflects favourite state, `aria-label`
  = `modal.fav_toggle_aria`.
- **Focus rings must not be clipped**: the single `.lean-scroll` region uses padding + equal
  negative margin so edge-flush controls' rings render fully; Phase 2 has **no** nested
  `overflow-y:auto` (Known Pitfalls #2, #3).
- Colour contrast + target size preserved from the existing modal (time inputs keep `min-height:24px`
  desktop / 44px mobile). Axe WCAG 2.2 AA scan of `#lean-time-modal` passes with **zero new
  violations** in light and dark themes.

## i18n keys (all in `js/i18n/en.js` + `de.js`)

| Key                                                                           | DE                           | EN                  |
| ----------------------------------------------------------------------------- | ---------------------------- | ------------------- |
| `modal.aria_label` _(exist)_                                                  | …                            | …                   |
| `modal.title_add` _(new/verify)_                                              | Buchung hinzufügen           | Add booking         |
| `modal.close_aria` _(new)_                                                    | Schließen                    | Close               |
| `modal.phase1_heading` _(new)_                                                | 1 · Ticket auswählen         | 1 · Select ticket   |
| `modal.phase2_heading` _(new)_                                                | 2 · Details der Buchung      | 2 · Booking details |
| `modal.search_label` _(new)_                                                  | Suche                        | Search              |
| `modal.search_placeholder` _(exist)_                                          | Ticket-Nr. oder Stichwort…   | …                   |
| `modal.search_empty` _(new)_                                                  | Tippen, um zu suchen         | Type to search      |
| `modal.no_results` _(exist)_                                                  | Keine Treffer                | No matches          |
| `modal.last_used_heading` _(exist)_                                           | Zuletzt verwendet            | Last used           |
| `modal.favourites_heading` _(exist)_                                          | Favoriten                    | Favourites          |
| `modal.selected_ticket_label` _(new)_                                         | Ausgewähltes Ticket          | Selected ticket     |
| `modal.date_label` / `start_label` / `end_label` / `duration_label` _(exist)_ | Datum / Start / Ende / Dauer | …                   |
| `modal.comment_label` _(new)_                                                 | Kommentar (optional)         | Comment (optional)  |
| `modal.fav_toggle_aria` _(new)_                                               | Favorit umschalten           | Toggle favourite    |
| `modal.add_favourite` / `remove_favourite` _(exist)_                          | …                            | …                   |
| `modal.save_btn` / `cancel_btn` / `delete_btn` / `saving` _(exist)_           | …                            | …                   |
| `modal.no_ticket` / `duration_break` _(exist)_                                | …                            | …                   |

_Existing keys reused verbatim; only listed for completeness. Verify actual DE/EN values against
`js/i18n/_.js` during implementation and reuse rather than duplicate.\*
