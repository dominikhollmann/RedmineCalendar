# Feature Specification: Booking Modal Redesign

**Feature Branch**: `055-booking-modal-redesign`

**Created**: 2026-07-05

**Status**: Draft

**Input**: User description: "Redesign the Add-booking modal into two always-visible phases (ticket selection + booking details) on one screen, wider and user-resizable, Fluent 2 purple accent."

## User Scenarios & Testing _(mandatory)_

The "Add booking" modal today mixes ticket-finding and booking-detail entry into one undifferentiated three-column layout, is narrower than it needs to be (so ticket subjects and project paths truncate awkwardly and the Last-Used / Favourites lists are cramped), and does not reflect the real two-step mental model users follow: first pick a ticket, then adjust the booking's details. This feature restructures the modal into two explicit, always-visible phases on a single screen — no wizard, no "confirm ticket" step — and makes it wider and user-resizable.

### User Story 1 - Select a ticket in one click, from whichever source is fastest (Priority: P1)

A user opens the booking modal and immediately sees three equal ways to find their ticket: type to search, pick from what they used recently, or pick a favourite. A single click on any row selects that ticket and the booking-details area below updates instantly — there is no intermediate "confirm" or "next" step.

**Why this priority**: This is the core interaction the redesign optimizes for — minimizing clicks to get from "open modal" to "ticket chosen". Without it, the redesign delivers no user value. It is the MVP slice.

**Independent Test**: Open the modal, click a ticket in each of the three columns in turn, and confirm the booking-details area reflects the clicked ticket every time with no additional click required.

**Acceptance Scenarios**:

1. **Given** the modal is open, **When** the user looks at the top region, **Then** three columns render side by side under a "1 · Ticket auswählen" (Select ticket) header, labelled Suche (Search) / Zuletzt verwendet (Last used) / Favoriten (Favourites).
2. **Given** the modal is open, **When** the user clicks any ticket row in any of the three columns, **Then** the booking-details region below immediately shows that ticket as the selected ticket, with no intermediate step.
3. **Given** the Search column, **When** the query is empty, **Then** no results are shown and an empty-state message ("Tippen, um zu suchen" — Type to search) is displayed instead.
4. **Given** the Search column, **When** the user types a query that matches nothing, **Then** a "Keine Treffer" (No matches) message is shown.
5. **Given** any ticket row in any column, **When** its ticket number, subject, or project path is longer than the row width, **Then** the text truncates with an ellipsis on a single line (never wraps) and the full "#id subject — project" text is available as a native hover tooltip.
6. **Given** a ticket row, **When** the user navigates by keyboard (Tab / Enter / Space), **Then** the row is reachable and activatable as a real button, and its focus ring is fully visible (not clipped by the scrolling list container).

---

### User Story 2 - Adjust booking details without extra clicks (Priority: P1)

Once a ticket is picked, the booking details are already pre-filled with sensible defaults and the user can edit any of them before saving. The booking-details region is always visible below the ticket-selection region — it is part of the same screen, never a separate step.

**Why this priority**: The whole point of the two-phase-one-screen restructure is that details are always visible and editable in place. Ticket selection (US1) without an always-visible, editable details region would not deliver the intended flow.

**Independent Test**: Select a ticket, then confirm the details region below shows the ticket plus editable date, start, end, computed duration, and comment fields, and that saving persists the edited values.

**Acceptance Scenarios**:

1. **Given** a ticket is selected, **When** the user looks below the ticket-selection region, **Then** a "2 · Details der Buchung" (Booking details) region is visible with three columns aligned to the ticket-selection grid: (1) the selected ticket with a favourite-star toggle, (2) date / start / end / duration, (3) an optional comment.
2. **Given** the details region, **When** the user sets or edits the Start and End times, **Then** the Duration value is recomputed automatically and shown formatted (e.g., "1h 30m").
3. **Given** the details region, **When** the user toggles the favourite star on the selected ticket, **Then** the ticket's favourite state changes and the change is reflected consistently in the Favourites column and any matching ticket rows.
4. **Given** the modal, **When** a ticket is selected via any Phase-1 column, **Then** there is no page or step transition — Phase 2 was already rendered and simply updates in place.
5. **Given** the details region is open, **When** the user tabs through the ticket favourite toggle, date/time inputs, and comment field, **Then** every control is keyboard-reachable and its focus ring is fully visible (not clipped).

---

### User Story 3 - Use the space I have, and resize if I want more (Priority: P2)

A user with a cramped or truncated modal today gets a wider default modal (so text is not cut off) and can drag to resize it larger. Extra vertical space goes to the ticket lists (showing more rows) rather than stretching the details region, and the header and footer stay fixed while only the middle content scrolls.

**Why this priority**: This resolves the concrete "modal too small / lists cramped / text truncated" complaint. It materially improves the experience but the two-phase flow (US1+US2) is usable at the default size without it, so it is P2.

**Independent Test**: Open the modal at its default size and confirm ticket text is not truncated at typical lengths; drag the resize handle to grow the modal and confirm the ticket lists gain rows while the details region keeps its natural height; shrink the modal and confirm the header/footer stay put and only the middle scrolls.

**Acceptance Scenarios**:

1. **Given** the modal opens, **When** it is at its default size, **Then** it is noticeably wider and taller than the previous modal (target default ≈ 1040×660) so typical ticket subjects and project paths are not truncated.
2. **Given** the modal, **When** the user drags its resize handle, **Then** the modal resizes within a minimum floor (below which nothing visually breaks) and a generous maximum (≈ 95% of viewport width and height).
3. **Given** the modal is resized taller, **When** there is extra vertical space, **Then** the ticket-selection region (Phase 1) absorbs it and shows more ticket rows, while the booking-details region (Phase 2) stays at its natural content height (does not stretch).
4. **Given** the modal is sized shorter than its content's natural height, **When** the content overflows, **Then** the header ("Buchung hinzufügen" + close) and footer (Abbrechen / Speichern) stay fixed and only the Phase-1 + Phase-2 content area scrolls.

---

### Edge Cases

- **Empty Last-Used / Favourites**: When there is no recent-ticket history or no favourites, the respective column shows a neutral empty-state message rather than an empty box.
- **Editing an existing booking**: When the modal opens to edit an existing entry (not create), the entry's ticket is pre-selected and its date/time/comment pre-filled; delete affordance remains available where it exists today.
- **Break ticket / zero-duration bookings**: When the selected ticket is the configured break ticket, the duration behaviour that exists today (fixed/zero duration display) is preserved.
- **Closed ticket**: A ticket known to be closed still shows its closed indicator, and saving against a closed ticket still surfaces the existing confirmation.
- **Very long query with zero matches**: The Search column shows the "no matches" message, distinct from the "type to search" empty state.
- **Resize below the floor**: Attempting to shrink below the minimum floor is prevented; the layout at the floor still shows a fully usable Phase 1 and a fully visible Phase 2 (the comment box and its focus ring are not clipped).

## Clarifications

### Session 2026-07-05

- Q: FR-010 makes the modal user-resizable — should the size the user drags to be remembered? → A: Persist across sessions in localStorage; the modal reopens at the user's last chosen size, and the ≈1040×660 default applies only until the user first resizes.
- Q: When Fast mode is ON and the user clicks a ticket, what should happen given Phase 2 is always visible? → A: Preserve current behaviour exactly — clicking a ticket immediately saves the booking with default values and closes the modal, bypassing Phase 2 editing. Fast mode OFF populates the always-visible Phase 2 in place for editing before save.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The modal MUST present two always-rendered phases on one screen — Phase 1 "Select ticket" above Phase 2 "Booking details" — with no wizard navigation and no separate "confirm ticket" step.
- **FR-002**: Phase 1 MUST show three equal columns in order: Search, Last used, Favourites, each under a subordinate column label, all beneath a bold "1 · …" section header.
- **FR-003**: Clicking any ticket row in any Phase-1 column MUST immediately set it as the selected ticket and update Phase 2 in place.
- **FR-004**: The Search column MUST show no results and a "type to search" empty-state message until the user enters a query; after a query it MUST show matches, or a distinct "no matches" message when the query matches nothing.
- **FR-005**: Ticket rows MUST be single-line, fixed-height, truncated with an ellipsis (never wrapped), and MUST expose the full "#id subject — project" text as a native hover tooltip.
- **FR-006**: Every ticket row and every interactive control (search input, favourite toggles, date/time inputs, comment field, footer buttons, close button) MUST be a real focusable element with a visible focus indicator that is not clipped by any scrolling ancestor.
- **FR-007**: Favourite-toggle controls MUST expose their pressed state and an accessible label to assistive technology, and toggling a favourite in any location MUST keep all views of that ticket's favourite state in sync.
- **FR-008**: Phase 2 MUST show, in three columns aligned to the Phase-1 grid: (1) the selected ticket with a favourite toggle, (2) date, start, end, and a read-only duration, (3) an optional comment field.
- **FR-009**: The booking duration MUST be computed automatically from the start and end times and displayed in a human-readable format.
- **FR-010**: The modal MUST open at a wider/taller default than the previous modal (target ≈ 1040×660) and MUST be user-resizable within a minimum floor and a maximum of ≈ 95% of the viewport in each dimension. The user's last chosen size MUST be persisted in localStorage and restored on subsequent opens; the ≈ 1040×660 default applies only until the user first resizes.
- **FR-011**: Extra vertical space MUST be absorbed by Phase 1 (more visible ticket rows); Phase 2 MUST remain at its natural content height and MUST NOT stretch to fill leftover space.
- **FR-012**: The modal header and footer MUST stay fixed while only the Phase-1 + Phase-2 content area scrolls when the modal is shorter than its content's natural height.
- **FR-013**: All user-visible copy (section headers, column labels, field labels, empty-state messages, button labels, accessible labels/tooltips) MUST be provided through the existing localization layer in both supported languages (DE and EN); no hard-coded display strings.
- **FR-014**: The redesign MUST reuse the existing booking data sources (ticket search, last-used history, favourites) and the existing save / update / delete logic, changing presentation only — not the underlying booking behaviour.
- **FR-015**: Existing booking behaviours MUST be preserved: editing an existing entry (with delete affordance), break-ticket duration handling, closed-ticket indicator and save confirmation, and the current keyboard shortcuts (activate on Enter, dismiss on Escape).
- **FR-016**: The redesign MUST use the app's established Fluent 2 design-token system with the purple brand accent (as in the Settings redesign); no new hard-coded color literals outside the central token block.
- **FR-017**: The redesign MUST pass the app's existing automated accessibility gate (WCAG 2.2 AA) with no new violations on the modal surface in either theme.

### Key Entities _(include if feature involves data)_

- **Ticket reference**: A minimal descriptor of a Redmine ticket shown in a row and the selected-ticket display — id, subject, project (name/identifier), and favourite state. Sourced from search results, last-used history, and the favourites list.
- **Booking draft**: The in-progress booking being composed — selected ticket, date, start time, end time, derived duration, and optional comment — persisted via the existing save/update path.
- **Last-used history**: The user's recently used tickets (existing local storage).
- **Favourites list**: The user's favourited tickets (existing local storage).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can go from opening the modal to a ticket being selected in exactly one click on a ticket row (zero intermediate confirm/next steps).
- **SC-002**: At the default modal size, typical ticket subjects and project paths (representative of the user's real data) are displayed without visual truncation; where a value does exceed the row, the full text is retrievable via hover tooltip.
- **SC-003**: The booking-details region is visible and editable at all times the modal is open, with the duration updating within the same interaction whenever start or end changes.
- **SC-004**: When the modal is enlarged, 100% of the added vertical space is given to the ticket lists (more rows visible); the details region's height does not change.
- **SC-005**: When the modal is shrunk to its minimum floor, the header, footer, and the entire booking-details region (including the comment field and its focus ring) remain fully visible and usable, with the middle region scrolling as needed.
- **SC-006**: Every interactive element in the modal is reachable and operable by keyboard, with a fully visible (unclipped) focus indicator, and the modal passes the automated accessibility gate with zero new violations in both light and dark themes.
- **SC-007**: All user-visible text renders correctly in both German and English with no hard-coded strings, verified by the localization lint/gate.

## Assumptions

- The redesign replaces the current modal markup, view logic, and styling (`js/time-entry-form-view.js`, `js/time-entry-form.js`, `js/time-entry-form-utils.js`, `css/time-entry.css`) rather than adding a parallel modal; the public entry point (`openForm(...)`) and its callback contract stay the same so all callers are unaffected.
- "Fast mode" (auto-save-and-close on ticket selection) remains a user preference with its current behaviour unchanged: when Fast mode is ON, clicking a ticket immediately saves the booking with default values and closes the modal, bypassing Phase 2 editing; when OFF, selection populates the always-visible Phase 2 in place for editing before save.
- The Fluent System "Search" icon is rendered via the project's existing icon approach rather than a copied inline SVG, if such an approach exists; otherwise an inline token-colored glyph consistent with the design system is acceptable.
- Target default dimensions (≈1040×660) and the minimum floor are design targets; exact pixel values may be tuned to the token scale as long as the truncation and "nothing breaks below the floor" outcomes hold.
- No backend/API changes are required; ticket search, last-used, favourites, and save/update/delete all reuse existing services.
- Mobile/very-narrow viewports keep the existing responsive behaviour of the app; this feature targets the modal's desktop layout, and the max-size cap (≈95vw/95vh) keeps it within any viewport.
