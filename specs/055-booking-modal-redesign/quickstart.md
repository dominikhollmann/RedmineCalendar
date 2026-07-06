# Quickstart / UAT: Booking Modal Redesign

**Prerequisites**: `npm run dev` (HTTPS dev server + CORS proxies), a configured Redmine URL + API
key in Settings, and at least one favourite + one recently-used ticket so Phase 1 has data. Open the
calendar and click an empty time slot (or double-click a slot) to open the **Buchung hinzufügen**
modal.

Each scenario below is a UAT checkbox scanned by `/speckit-uat-run`.

## Scenario 1 — Two phases, one screen (US1/US2, FR-001/003)

- [x] Open the modal and confirm two labelled regions are visible at once: **1 · Ticket auswählen**
      (three columns: Suche / Zuletzt verwendet / Favoriten) above **2 · Details der Buchung**.
- [x] Click a ticket row in the **Zuletzt verwendet** column and confirm Phase 2's selected-ticket
      block updates immediately, with no confirm/next step.
- [x] Click a ticket row in the **Favoriten** column and confirm Phase 2 updates in place again.
- [x] Confirm there is no wizard navigation and no separate "confirm ticket" button anywhere.

## Scenario 2 — Search behaviour (US1, FR-004)

- [x] With the Suche field empty, confirm the Suche column shows "Tippen, um zu suchen" (EN: "Type
      to search") and **no** ticket rows.
- [x] Type a query that matches at least one ticket and confirm matching rows appear inside the Suche
      column (not a floating dropdown over the other columns).
- [x] Click a search-result row and confirm Phase 2 updates immediately.
- [x] Type a query that matches nothing and confirm the column shows "Keine Treffer" (EN: "No
      matches"), distinct from the empty "type to search" state.

## Scenario 3 — Rows truncate, don't wrap (FR-005)

- [x] Find (or search for) a ticket whose subject or project path is longer than the column and
      confirm each row stays single-line per line with an ellipsis — never wrapping.
- [x] Hover the row and confirm a tooltip shows the full "#id subject — project" text, using the
      app's unified tooltip style (fixed via `attachLabelTooltip`, consistent with tooltips
      elsewhere in the app; FR-005 updated during UAT to reflect this).

## Scenario 4 — Booking details editable (US2, FR-008/009)

- [x] With a ticket selected, edit Start and Ende and confirm Dauer recomputes and shows a
      human-readable value (e.g. "1h 30m").
- [x] Type in the Kommentar field, click Speichern, and confirm the entry is created with the edited
      date/time/comment (check the calendar).
- [x] Toggle the favourite star in Phase 2's selected-ticket block and confirm the Favoriten column
      (and any matching Phase-1 rows) reflect the change consistently.

## Scenario 5 — Resize + persistence (US3, FR-010/011, clarified)

- [x] At default size confirm the modal is noticeably wider/taller than before and typical ticket
      text is not truncated.
- [x] Drag the bottom-right resize handle to make the modal taller and confirm the **ticket lists**
      (Phase 1) gain visible rows while the booking-details region keeps its natural height.
      (Fixed during UAT: the resize handle previously tracked the mouse at half speed because
      flex-centering the modal fought the native `resize:both` handle — every resize tick
      re-centered the box, which silently ate half the drag distance on the left/top edge. The
      modal is now centered via a static JS-computed margin instead of flex auto-alignment, so
      the visible corner tracks the mouse 1:1. Regression test: `tests/ui/booking-modal.spec.js`
      "dragging the resize handle tracks the mouse 1:1".)
- [x] Drag to shrink toward the minimum and confirm nothing breaks: header, footer, and the entire
      Phase 2 (including the comment box) stay visible, with the middle region scrolling as needed.
- [x] Close the modal, reopen it, and confirm it reopens at the size you left it at (persisted).
- [x] Drag the modal by its header (not the resize handle) and confirm it can be freely
      repositioned, without resizing, and the close button stays clickable afterwards. Position is
      session-only — closing and reopening the modal re-centers it (not persisted, per clarification
      during UAT). Regression test: `tests/ui/booking-modal.spec.js` "dragging the header
      repositions the card".

## Scenario 6 — Fixed header/footer, scrolling middle (FR-012)

- [x] Shrink the modal below its content's natural height and confirm the header
      ("Buchung hinzufügen" + ✕) and footer (Abbrechen / Speichern) stay fixed while only the
      Phase-1 + Phase-2 area scrolls.

## Scenario 7 — Preserved behaviours (FR-014/015)

- [x] Open the modal to **edit** an existing entry and confirm its ticket/date/time/comment are
      prefilled and a Delete affordance is present; delete it and confirm it is removed (and undoable).
- [x] Select the configured **break ticket** and confirm the duration shows the break readout and
      saving stores a zero/near-zero-hour entry as before.
- [x] Select a **closed** ticket and confirm the closed indicator shows and saving surfaces the
      existing closed-ticket confirmation.
- [x] With Fast mode ON, click a ticket and confirm the booking auto-saves and the modal closes
      (unchanged behaviour). With Fast mode OFF, confirm selection instead keeps the modal open with
      Phase 2 editable.
- [x] Press Escape and confirm the modal dismisses.

## Scenario 8 — Accessibility & i18n (FR-006/007/013/016/017)

- [x] Tab through every control — search input, each ticket row, each star, close, date/time inputs,
      comment, footer buttons — and confirm each is reachable and its focus ring is fully visible
      (not clipped by any scrolling edge), including at the minimum size.
- [x] Activate a ticket row with Enter/Space (as a real button) and a star toggle with Space; confirm
      the star exposes pressed state to assistive tech.
- [x] Switch the app to English and confirm all copy (headers, labels, empty states, buttons,
      tooltips, aria-labels) is translated with no hard-coded German.
- [x] Switch to dark theme and confirm the modal renders correctly with the purple brand accent.
      (Fixed during UAT: `.lean-row-id` / `.lean-ticket-idtitle a` used raw `--color-primary`
      instead of the D3-safeguarded `--color-link-on-dark`, so a purple admin CI accent
      (`#6c2bd9`) dropped ticket-ID text to ~2.23:1 against the selected-row tint — well under
      WCAG AA 4.5:1. axe-core did not catch this (can't resolve the `color-mix()`-tinted
      background); added a dedicated WCAG-math Playwright test — see
      `tests/ui/a11y.spec.js` "ticket-ID text clears 4.5:1".)

## Automated gates (run before marking done)

- [x] `npm run lint && npm run format:check && npm run htmlhint && npm run typecheck` pass.
- [x] `npm run test:coverage` passes (modal-size + row/Phase-2 unit tests included).
- [x] `npm run test:ui` passes, including the axe WCAG 2.2 AA modal scan in both themes.
- [x] `npm run dup:check`, `npm run knowledge:check`, `npm run sqi` (composite ≥ 80) pass.

## DSGVO impact

All five triggers are **No**: no new personal data (the one new localStorage key stores only a UI
window size), no changed legal basis/recipient/retention, no new consent. No `privacy.html` update
required.
