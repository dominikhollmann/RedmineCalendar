# Quickstart / UAT: Booking Modal Redesign

**Prerequisites**: `npm run dev` (HTTPS dev server + CORS proxies), a configured Redmine URL + API
key in Settings, and at least one favourite + one recently-used ticket so Phase 1 has data. Open the
calendar and click an empty time slot (or double-click a slot) to open the **Buchung hinzufügen**
modal.

Each scenario below is a UAT checkbox scanned by `/speckit-uat-run`.

## Scenario 1 — Two phases, one screen (US1/US2, FR-001/003)

- [ ] Open the modal and confirm two labelled regions are visible at once: **1 · Ticket auswählen**
      (three columns: Suche / Zuletzt verwendet / Favoriten) above **2 · Details der Buchung**.
- [ ] Click a ticket row in the **Zuletzt verwendet** column and confirm Phase 2's selected-ticket
      block updates immediately, with no confirm/next step.
- [ ] Click a ticket row in the **Favoriten** column and confirm Phase 2 updates in place again.
- [ ] Confirm there is no wizard navigation and no separate "confirm ticket" button anywhere.

## Scenario 2 — Search behaviour (US1, FR-004)

- [ ] With the Suche field empty, confirm the Suche column shows "Tippen, um zu suchen" (EN: "Type
      to search") and **no** ticket rows.
- [ ] Type a query that matches at least one ticket and confirm matching rows appear inside the Suche
      column (not a floating dropdown over the other columns).
- [ ] Click a search-result row and confirm Phase 2 updates immediately.
- [ ] Type a query that matches nothing and confirm the column shows "Keine Treffer" (EN: "No
      matches"), distinct from the empty "type to search" state.

## Scenario 3 — Rows truncate, don't wrap (FR-005)

- [ ] Find (or search for) a ticket whose subject or project path is longer than the column and
      confirm each row stays single-line per line with an ellipsis — never wrapping.
- [ ] Hover the row and confirm a native tooltip shows the full "#id subject — project" text.

## Scenario 4 — Booking details editable (US2, FR-008/009)

- [ ] With a ticket selected, edit Start and Ende and confirm Dauer recomputes and shows a
      human-readable value (e.g. "1h 30m").
- [ ] Type in the Kommentar field, click Speichern, and confirm the entry is created with the edited
      date/time/comment (check the calendar).
- [ ] Toggle the favourite star in Phase 2's selected-ticket block and confirm the Favoriten column
      (and any matching Phase-1 rows) reflect the change consistently.

## Scenario 5 — Resize + persistence (US3, FR-010/011, clarified)

- [ ] At default size confirm the modal is noticeably wider/taller than before and typical ticket
      text is not truncated.
- [ ] Drag the bottom-right resize handle to make the modal taller and confirm the **ticket lists**
      (Phase 1) gain visible rows while the booking-details region keeps its natural height.
- [ ] Drag to shrink toward the minimum and confirm nothing breaks: header, footer, and the entire
      Phase 2 (including the comment box) stay visible, with the middle region scrolling as needed.
- [ ] Close the modal, reopen it, and confirm it reopens at the size you left it at (persisted).

## Scenario 6 — Fixed header/footer, scrolling middle (FR-012)

- [ ] Shrink the modal below its content's natural height and confirm the header
      ("Buchung hinzufügen" + ✕) and footer (Abbrechen / Speichern) stay fixed while only the
      Phase-1 + Phase-2 area scrolls.

## Scenario 7 — Preserved behaviours (FR-014/015)

- [ ] Open the modal to **edit** an existing entry and confirm its ticket/date/time/comment are
      prefilled and a Delete affordance is present; delete it and confirm it is removed (and undoable).
- [ ] Select the configured **break ticket** and confirm the duration shows the break readout and
      saving stores a zero/near-zero-hour entry as before.
- [ ] Select a **closed** ticket and confirm the closed indicator shows and saving surfaces the
      existing closed-ticket confirmation.
- [ ] With Fast mode ON, click a ticket and confirm the booking auto-saves and the modal closes
      (unchanged behaviour). With Fast mode OFF, confirm selection instead keeps the modal open with
      Phase 2 editable.
- [ ] Press Escape and confirm the modal dismisses.

## Scenario 8 — Accessibility & i18n (FR-006/007/013/016/017)

- [ ] Tab through every control — search input, each ticket row, each star, close, date/time inputs,
      comment, footer buttons — and confirm each is reachable and its focus ring is fully visible
      (not clipped by any scrolling edge), including at the minimum size.
- [ ] Activate a ticket row with Enter/Space (as a real button) and a star toggle with Space; confirm
      the star exposes pressed state to assistive tech.
- [ ] Switch the app to English and confirm all copy (headers, labels, empty states, buttons,
      tooltips, aria-labels) is translated with no hard-coded German.
- [ ] Switch to dark theme and confirm the modal renders correctly with the purple brand accent.

## Automated gates (run before marking done)

- [ ] `npm run lint && npm run format:check && npm run htmlhint && npm run typecheck` pass.
- [ ] `npm run test:coverage` passes (modal-size + row/Phase-2 unit tests included).
- [ ] `npm run test:ui` passes, including the axe WCAG 2.2 AA modal scan in both themes.
- [ ] `npm run dup:check`, `npm run knowledge:check`, `npm run sqi` (composite ≥ 80) pass.

## DSGVO impact

All five triggers are **No**: no new personal data (the one new localStorage key stores only a UI
window size), no changed legal basis/recipient/retention, no new consent. No `privacy.html` update
required.
