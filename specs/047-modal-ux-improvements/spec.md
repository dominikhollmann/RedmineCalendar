# Feature Specification: Modal UX Improvements

**Feature Branch**: `047-modal-ux-improvements`

**Created**: 2026-06-20

**Status**: Draft

**Input**: User description: "Modal UX improvements from github issues 241,242,243,244"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Fix View Toggle Blocked by Modal Backdrop (Priority: P1)

A user opens the time-entry booking modal and accidentally clicks the Calendar/Planning view toggle in the toolbar. Because the modal backdrop does not cover the toolbar, the view switches underneath the open modal, causing a jarring UI jump and possible state inconsistency.

**Why this priority**: Bug fix — existing breakage with observable, reproducible impact on every user who opens the modal. No new behaviour, just correctness.

**Independent Test**: Open the modal, try to click the view toggle — it must not respond. Dismiss the modal — the toggle must work again.

**Acceptance Scenarios**:

1. **Given** the booking modal is open, **When** the user clicks the Calendar/Planning toggle in the toolbar, **Then** the toggle does not respond and the view does not change.
2. **Given** the booking modal is open, **When** the user clicks the modal backdrop, **Then** the modal closes and the toggle is interactive again.
3. **Given** the booking modal is open, **When** the user presses Escape, **Then** the modal closes and the toggle is interactive again.

---

### User Story 2 — Favourite Toggle on Last-Used Entries (Priority: P2)

A user sees a recently used ticket in the **Last Used** list inside the booking modal and wants to save it to **Favourites** without closing the modal or re-typing anything. Currently there is no way to do this from within the modal.

**Why this priority**: Frequent-user workflow improvement — power users rely heavily on Favourites and currently face extra friction to populate the list.

**Independent Test**: Open the modal, hover over a Last Used row — a star icon appears. Click it — the entry moves to Favourites. Reopen the modal — the entry is listed under Favourites.

**Acceptance Scenarios**:

1. **Given** the booking modal is open with at least one Last Used entry, **When** the user views the Last Used list, **Then** each row shows a star/bookmark icon.
2. **Given** an entry is not yet a Favourite, **When** the user clicks its star icon, **Then** the icon becomes filled and the entry appears in Favourites immediately.
3. **Given** an entry is already a Favourite, **When** the user clicks its filled star icon, **Then** the icon becomes unfilled and the entry is removed from Favourites.
4. **Given** the user toggled a Favourite, **When** the modal is closed and reopened, **Then** the Favourites section reflects the change.
5. **Given** keyboard navigation is active, **When** focus reaches a star icon and the user presses Enter or Space, **Then** the toggle activates.

---

### User Story 3 — Increase Last-Used List to 20 Entries with Scroll (Priority: P3)

A user who works across many tickets finds the Last Used list too short to cover their ticket repertoire and must re-search tickets they used recently. Expanding the list to 20 entries and adding a scroll container resolves this without changing the modal's overall layout.

**Why this priority**: Quality-of-life improvement for users with broad ticket usage; no architectural change needed.

**Independent Test**: Log 25 distinct tickets in succession — the Last Used list stores and displays the 20 most recent ones. Scroll the list to verify all 20 are reachable.

**Acceptance Scenarios**:

1. **Given** fewer than 20 recently used tickets, **When** the modal opens, **Then** all entries are displayed without a scrollbar.
2. **Given** more than 20 recently used tickets, **When** the modal opens, **Then** the 20 most recent entries are displayed and the list is scrollable to reach all of them.
3. **Given** the list already has 20 entries, **When** a 21st ticket is used, **Then** the oldest entry is evicted and the list still shows 20 entries.
4. **Given** a short list (1–5 entries), **When** the modal opens, **Then** no visual regression occurs (no excessive empty space or scrollbar).

---

### User Story 4 — Fast Mode Setting for Ticket Selection Behaviour (Priority: P4)

A user who wants to add a comment after selecting a ticket currently cannot — selecting a ticket auto-submits and closes the modal. A **Fast Mode** toggle lets users choose whether ticket selection auto-closes the modal (on, the default) or merely pre-fills the ticket field (off).

**Why this priority**: P4 because it adds an opt-in user preference with no impact on existing users who do not change the setting; the current behaviour remains the default.

**Independent Test**: Disable Fast Mode in Settings — open the modal, click a Favourite — modal stays open, ticket field is filled, user can add a comment and submit manually.

**Acceptance Scenarios**:

1. **Given** Fast Mode is ON (default), **When** the user clicks a Favourite or search result, **Then** the ticket is selected and the modal closes immediately — existing behaviour preserved.
2. **Given** Fast Mode is OFF, **When** the user clicks a Favourite or search result, **Then** the ticket field is pre-filled but the modal stays open.
3. **Given** Fast Mode is OFF and the ticket field is filled, **When** the user presses Enter or clicks Confirm, **Then** the entry is submitted and the modal closes.
4. **Given** the user changes Fast Mode to OFF and reopens the app, **Then** the setting is persisted and the modal behaves accordingly.
5. **Given** Fast Mode is OFF, **When** the user clicks the Confirm button without selecting a ticket, **Then** appropriate validation feedback is shown.

---

### Edge Cases

- What happens when the Last Used list is empty and the user opens the modal? (No star icons shown; no list visible — no regression.)
- What happens if a Last Used entry references a ticket that has since been deleted in Redmine? (Entry remains in the list; star toggle still works on the stored data.)
- What if the user rapidly double-clicks a star icon? (Toggle should debounce or treat as a single activation to avoid flickering.)
- What if localStorage is full or write fails when saving a new Favourite? (Existing error handling applies; no silent data loss.)
- What if the user opens the booking modal via keyboard (no mouse)? (All new interactive elements must be keyboard-reachable.)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The modal backdrop MUST cover the entire toolbar so that toolbar controls (including the Calendar/Planning toggle) are not interactive while any modal is open.
- **FR-002**: The z-index layering of the modal and its backdrop MUST be above all toolbar elements.
- **FR-003**: Each row in the Last Used list inside the booking modal MUST display a star/bookmark icon indicating Favourite status.
- **FR-004**: The star icon MUST reflect the real-time Favourite state: unfilled when not a Favourite, filled when it is.
- **FR-005**: Clicking an unfilled star MUST add the corresponding entry to the Favourites list and update the icon immediately.
- **FR-006**: Clicking a filled star MUST remove the corresponding entry from Favourites and update the icon immediately.
- **FR-007**: Favourite changes made via the star icon MUST be persisted to the same storage used by other Favourite-add paths.
- **FR-008**: The star icon MUST be keyboard-focusable and activatable via Enter and Space keys.
- **FR-009**: The star icon tooltip and aria-label MUST be translated in both English and German locale files.
- **FR-010**: The recently-used tickets list MUST store and display up to 20 entries (raised from the current limit).
- **FR-011**: The recently-used list container in the modal MUST scroll vertically when the list exceeds the visible height.
- **FR-012**: When a 21st entry is added, the oldest entry MUST be evicted so the list never exceeds 20 items.
- **FR-013**: A user setting called "Fast Mode" MUST be available on the Settings page.
- **FR-014**: Fast Mode MUST default to ON, preserving existing auto-close-on-ticket-select behaviour for all users.
- **FR-015**: When Fast Mode is ON, selecting a ticket from search results or Favourites MUST submit the form and close the modal (current behaviour).
- **FR-016**: When Fast Mode is OFF, selecting a ticket from search results or Favourites MUST pre-fill the ticket field but leave the modal open.
- **FR-017**: The Fast Mode setting MUST be persisted across sessions.
- **FR-018**: The Fast Mode setting label and description MUST be translated in both English and German locale files.
- **FR-019**: Confirm button / Enter key MUST always submit the form regardless of Fast Mode state.

### Key Entities

- **Favourite Entry**: A persisted ticket + project + activity combination that a user has marked for quick reuse. Attributes: issue ID, project ID, activity ID, display label.
- **Last Used Entry**: A recently used ticket + activity combination stored transiently per-user. Attributes: same as Favourite Entry plus timestamp for eviction ordering.
- **Fast Mode Preference**: A boolean user preference (default: true) governing modal auto-close behaviour on ticket selection.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The view toggle is non-interactive in 100% of cases while the booking modal is open (zero state-inconsistency incidents from this path).
- **SC-002**: Users can add any recently-used ticket to Favourites in a single click without leaving the modal.
- **SC-003**: The Last Used list shows up to 20 entries and is scrollable — users with 20+ distinct recently-used tickets can access all of them from the modal.
- **SC-004**: Fast Mode OFF allows users to add a comment before submitting, without any extra navigation — reducing modal re-opens for comment addition to zero when the setting is active.
- **SC-005**: All new interactive elements are keyboard-accessible and pass WCAG 2.2 AA checks in both light and dark themes.
- **SC-006**: No regression in existing modal behaviour for users who do not change any settings (Fast Mode defaults ON, list still shows entries, star icons do not interfere with existing actions).

## Assumptions

- The existing modal backdrop mechanism (overlay element + z-index) can be extended to cover the toolbar without a full structural rewrite.
- The `redmine_calendar_favourites` and `redmine_calendar_last_used` localStorage keys follow the existing data shape documented in CLAUDE.md; no schema migration is needed.
- The Fast Mode setting will use a new localStorage key (e.g., `redmine_calendar_fast_mode`) following the same naming convention as other preference keys.
- The current list-size cap is a simple constant in the application code and can be changed without touching the data format.
- All four improvements ship in a single feature branch and PR; they are independent enough that any one could be skipped, but they are small enough to batch.
- Accessibility regression gate (`@axe-core/playwright`) already covers the booking modal surface and will automatically cover the new elements.
