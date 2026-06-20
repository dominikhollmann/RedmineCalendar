# Feature Specification: Real FullCalendar Columns for Planning View + Shared Factory

**Feature Branch**: `046-fc-timegrid-columns`

**Created**: 2026-06-19

**Status**: Draft

**Input**: User description: "issue #220 — Replace custom div timegrid with real FullCalendar instances in Outlook & Teams columns. note: next, we'll implement #229 - so be rather aggressive about refactoring for the calendar as we'll do it next anyways."

## Clarifications

### Session 2026-06-19

- Q: Should the classic week calendar (`js/calendar.js`) be migrated to consume the shared `createTimegridColumn()` factory within this feature, or should it only share the canonical options object? → A: All four surfaces (classic calendar + three planning-view columns) are factory consumers. The classic calendar passes `{ view: 'timeGridWeek', headerToolbar: { ... } }` to distinguish itself; the factory handles both view types. There is no interface mismatch — the Bookings column already requires the same interactive capabilities (drag, resize, selection, event creation).
- Q: Does the CSS unification requirement mean exactly one CSS file, or DRY (no rule duplicated across files)? → A: DRY — no duplication of rules across files. Multiple CSS files are fine; the constraint is that no style rule may be defined in more than one place. CSS file layout is an implementation decision for planning.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Visual Parity Across Planning View Columns (Priority: P1)

As a user looking at the Planning View with Bookings, Outlook, and Teams columns side by side, I see exactly the same visual grid in all three columns: the same dotted minor slot lines, the same band backgrounds, and the same half-hour separator weight — because all three columns now use the same rendering engine.

**Why this priority**: The original reason for this refactor. Today, the Outlook and Teams columns use a hand-rolled div grid that visually diverges from FullCalendar's table-based grid in subtle but persistent ways (dotted vs. solid minor slots, compositing differences in band backgrounds). This is the core UX defect being fixed.

**Independent Test**: Open the Planning View for any day, load events in all three columns. At every zoom level / scroll position, the gridlines and band backgrounds of all three columns MUST be indistinguishable.

**Acceptance Scenarios**:

1. **Given** the Planning View is open with all three columns visible, **When** I compare the minor slot lines (`:15`/`:45` marks) across Bookings, Outlook, and Teams, **Then** all three show identical dotted lines with identical gap transparency and colour.
2. **Given** a day with alternating gray bands (e.g. an hour with band background), **When** I view the same hour row across all three columns, **Then** the band color, opacity, and borders are pixel-identical.
3. **Given** the Planning View in dark mode, **When** I open it, **Then** all three columns apply the dark-mode CSS tokens consistently with no column-specific overrides needed.
4. **Given** a future FullCalendar upgrade or theme token change, **When** the tokens are updated once, **Then** all three columns reflect the change without any column-specific patch.

---

### User Story 2 — Synchronised Vertical Scrolling (Priority: P1)

As a user, when I scroll the Planning View vertically (e.g. to jump to 14:00), all three columns scroll together in lock-step so that the same time slot is always at the same vertical position across columns.

**Why this priority**: Scroll sync is a prerequisite for the layout to be usable — misaligned columns make event-time comparison impossible.

**Independent Test**: Scroll the planning view to a mid-day position; the time slot visible at the top of each column MUST be identical.

**Acceptance Scenarios**:

1. **Given** all three columns are rendered, **When** I drag the scroll bar to 50 % of the day height, **Then** all three columns are at the same vertical offset within ±1 px.
2. **Given** the user scrolls via mouse wheel while hovering over the Outlook column, **When** the scroll event fires, **Then** the Bookings and Teams columns scroll to the same position without lag or loop.
3. **Given** the page has just loaded and events are still being fetched, **When** I scroll, **Then** the columns that are already rendered sync immediately; columns still loading snap to the correct position once ready.
4. **Given** a rapid repeated scroll sequence (fast drag up and down), **When** the sequence ends, **Then** all three columns settle at the same final position with no feedback-loop judder.

---

### User Story 3 — Event Interaction Preserved (Priority: P1)

As a user, clicking an Outlook or Teams event in the Planning View still opens the booking modal pre-filled with that event's time slot — the same behaviour as before the refactor, just using a different internal renderer.

**Why this priority**: Functional regression risk. The refactor must not break the primary booking workflow.

**Independent Test**: Click any Outlook event; verify the booking modal opens with the correct start/end time pre-filled.

**Acceptance Scenarios**:

1. **Given** the Outlook column contains a calendar event from 10:00–11:00, **When** I click that event, **Then** the booking modal opens with start time 10:00 and end time 11:00.
2. **Given** the Teams column contains a call record, **When** I click it, **Then** the booking modal opens with the call's duration pre-filled.
3. **Given** a multi-day or all-day Outlook event, **When** it is displayed in the day column, **Then** it is rendered as a timed block spanning the visible portion of the day (not as an all-day banner), and clicking it opens the modal with the event's day-local times.
4. **Given** the Outlook or Teams column is in a loading state, **When** events have not yet appeared, **Then** clicking the empty grid does not open a modal or throw an error.

---

### User Story 4 — Unified CSS Across All Calendar Surfaces (Priority: P2)

As a user switching between the classic week calendar and the Planning View, events that represent the same state (e.g. a time entry marked as "break") always look the same regardless of which surface I am on. There is no visual inconsistency caused by two separate CSS files trying to stay in sync.

**Why this priority**: Today `calendar.css` and `planning-view.css` each define event and timegrid styles independently. Any change to the visual language must be applied in two places, which is the root cause of the parity bugs this feature is fixing. A single canonical CSS block for all FC surfaces makes parity permanent by construction.

**Independent Test**: Inspect the same Redmine "break" time entry in both the classic week calendar and the Planning View Bookings column — both must show the same background colour, border radius, and font size.

**Acceptance Scenarios**:

1. **Given** a Redmine time entry classified as "break", **When** it appears in both the classic week calendar and the Planning View Bookings column, **Then** the visual appearance (colour, size, padding) is identical in both views.
2. **Given** the team updates the brand's primary accent colour in `base.css`, **When** the change is deployed, **Then** all FC event cards across all surfaces update without any per-surface CSS edit.
3. **Given** an Outlook event and a Teams call are both in the "bookable" ticket-detection state, **When** displayed simultaneously in their respective columns, **Then** both show the same colour as a Bookings-column entry in the "bookable" state — confirming a single shared colour token drives all three.
4. **Given** the refactor is complete, **When** the CSS directory is inspected, **Then** there is no duplication of `.fc-event` base rules, slot-border rules, or band-background rules across multiple CSS files.

---

### User Story 5 — Shared Timegrid Factory for All Four FC Surfaces (Priority: P2)

As a developer maintaining this codebase, all four FullCalendar-backed surfaces — the classic week calendar, the Bookings column, the Outlook column, and the Teams column — are initialized via a single shared `createTimegridColumn()` factory. The factory accepts a view type and toolbar options so it handles both `timeGridWeek` (classic calendar) and `timeGridDay` (planning-view columns). A design change (slot height, band colour, border style, dark-mode token) is applied in one place and propagates to every surface automatically.

**Why this priority**: The longer-term architectural goal. Without a shared factory, the class of "column A looks different from column B" bugs returns with every future change. The classic calendar and the Bookings column already share the same interactive capabilities (drag, resize, selection, event creation) — the only differences are view type and toolbar visibility, both of which are factory parameters.

**Independent Test**: Change the canonical `slotDuration` in the factory; verify that the classic calendar, Bookings, Outlook, and Teams columns all reflect the change without any per-surface edit.

**Acceptance Scenarios**:

1. **Given** the factory is implemented, **When** a new event-source column (e.g. a future GitHub Activity column) is added, **Then** it is created by calling `createTimegridColumn(el, { view: 'timeGridDay', mode: 'readonly', source: '...' })` with no re-implementation of timegrid logic.
2. **Given** the factory exposes `setDate(date)`, `setEvents(events[])`, and `destroy()`, **When** the planning view changes to a different day, **Then** calling `setDate(newDate)` on each planning-view column instance correctly re-renders all events.
3. **Given** the classic calendar is a factory consumer with `{ view: 'timeGridWeek', headerToolbar: { ... } }`, **When** a shared slot configuration value (e.g. `slotDuration`) changes in the factory, **Then** the classic calendar reflects it without a separate edit to `calendar.js`.
4. **Given** any of the four factory consumers calls `destroy()`, **When** destroy is called, **Then** the FC instance is torn down cleanly and no scroll-sync listeners remain attached.

---

### Edge Cases

- What happens when scroll sync fires during the initial render before all three columns have mounted? (Risk: feedback loop between two partially-mounted instances.)
- How does the factory handle `destroy()` called during an in-flight data fetch for that column?
- What happens when `slotMinTime`/`slotMaxTime` changes due to user settings update while the Planning View is open?
- What if an Outlook event spans midnight (e.g. 23:00–01:00 the following day)? The day column should clip at `slotMaxTime`.
- What if the Outlook Graph or Teams API returns zero events for a day? The column should render an empty grid, not a blank div.
- What happens when the user rapidly switches days in the Planning View while a previous fetch is still in-flight?

## Requirements _(mandatory)_

### Functional Requirements

**Phase 1 — Replace custom div timegrid:**

- **FR-001**: The Outlook column MUST use a real FullCalendar `timeGridDay` instance instead of the current div-based custom grid.
- **FR-002**: The Teams column MUST use a real FullCalendar `timeGridDay` instance instead of the current div-based custom grid.
- **FR-003**: The Outlook and Teams FC instances MUST use the same `slotMinTime`, `slotMaxTime`, and `slotDuration` as the Bookings column, reading these values from the shared working-hours settings.
- **FR-004**: Outlook Graph events MUST be transformed into FullCalendar event objects (with `id`, `title`, `start`, `end`) and loaded via the FC `events` array or `setOption`.
- **FR-005**: Teams call records MUST be transformed into FullCalendar event objects and loaded similarly.
- **FR-006**: Click interaction on an Outlook or Teams FC event MUST trigger the same booking-modal pre-fill logic as before the refactor.
- **FR-007**: All-day or multi-day Outlook events MUST be rendered as timed blocks in the day column (spanning the visible portion of the current day), not as all-day banners.
- **FR-008**: Vertical scroll synchronisation MUST keep all three planning-view columns at the same scroll offset at all times, without re-entrant feedback loops.
- **FR-009**: The custom rendering functions `renderTimeGrid()`, `_renderTimedCard()`, `_renderAlldayAsTimed()`, and all absolute-pixel positioning arithmetic MUST be deleted from `planning-view-outlook.js` and `planning-view-teams.js`.
- **FR-010**: The planning-view-specific CSS classes for the div grid (`.planning-time-grid`, `.planning-grid-slot`, `.planning-grid-slot--minor`, `.planning-outlook-timed`, `.planning-teams-timed`) MUST be deleted.
- **FR-011**: Any remaining bespoke CSS overrides for slot border colour, band compositing, or half-hour separator weight that exist only to compensate for the div/table rendering difference MUST be deleted.

**Phase 2 — Shared timegrid factory:**

- **FR-012**: A `createTimegridColumn(el, options)` factory function MUST be implemented in a new shared module (e.g. `js/timegrid-column.js`).
- **FR-013**: The factory MUST accept a behaviour descriptor (`{ mode: 'bookings' | 'readonly', source: 'redmine' | 'outlook' | 'teams' }`) and construct the FC `Calendar` instance with a canonical shared option set.
- **FR-014**: The factory MUST expose a minimal public interface: `setDate(date)`, `setEvents(events[])`, `destroy()`.
- **FR-015**: All four FC surfaces — the classic week calendar, the Bookings column, the Outlook column, and the Teams column — MUST be initialized via the factory. The factory MUST accept a `view` parameter (`'timeGridWeek'` | `'timeGridDay'`) and a `headerToolbar` option so the classic calendar can show its navigation toolbar while planning-view columns hide it.
- **FR-016**: The factory MUST include the scroll-sync hook internally (coordinated across all factory instances for the planning view) OR expose a scroll-sync registration API consumed by `planning-view.js`.
- **FR-017**: The factory module MUST NOT exceed 500 effective LOC (CLAUDE.md module-size policy).
- **FR-018**: All new `js/*.js` modules introduced by this feature MUST be registered in `js/knowledge.topics.json`.

**Phase 3 — Unified CSS across all calendar surfaces (DRY):**

- **FR-019**: Every CSS rule that applies to FC event cards (base style: border radius, padding, font size, overflow) MUST exist in exactly one place across all CSS files. The current duplication between `calendar.css` and `planning-view.css` MUST be eliminated — each rule defined once, applied everywhere via shared selectors or tokens.
- **FR-020**: Slot-border rules, band-background rules, and minor-slot (`:15`/`:45`) rules MUST NOT be defined independently in multiple CSS files. Each rule is written once; both the classic calendar and planning-view columns inherit it.
- **FR-021**: Event card colours MUST follow a two-tier scheme: (a) Redmine time entries (classic week calendar + Bookings column) share one colour set by entry state; (b) external-source events (Outlook, Teams, and any future added columns) share one colour set by **ticket-detection state** (bookable, needs-ticket, excluded, etc.). There is NO separate colour per source (Outlook and Teams look identical in the same detection state).
- **FR-022**: Per-event state modifier classes (bookable, needs-ticket, break, excluded, covered, selected) MUST be defined once and applied identically across the classic calendar, the Bookings column, the Outlook column, and the Teams column — no per-surface re-declaration of these modifiers.
- **FR-023**: Any CSS rule currently duplicated between `calendar.css` and `planning-view.css` (or any other CSS files) that governs FC timegrid or FC event appearance MUST be deduplicated. Where to consolidate is an implementation decision; the constraint is zero duplication.

### Key Entities

- **Timegrid Column Instance**: A FullCalendar `timeGridDay` Calendar instance mounted on a given DOM element, configured with shared slot settings, and exposing `setDate`, `setEvents`, `destroy`.
- **FC Event Object**: The FullCalendar-format event `{ id, title, start, end, extendedProps }` that maps from an Outlook Graph event or Teams call record.
- **Scroll-Sync Group**: The set of three planning-view columns whose scroll containers are kept at the same vertical offset.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Zero planning-view-specific CSS overrides for slot borders, band backgrounds, or sub-pixel alignment remain after the refactor (verifiable by grepping for `.planning-grid-slot`, `.planning-outlook-timed`, `.planning-teams-timed`, and the `:30 border whitening` comment in `css/`).
- **SC-002**: All three planning-view columns are visually identical under automated axe-core accessibility scan across both light and dark themes.
- **SC-003**: All existing Playwright UI tests for the Planning View (`tests/ui/planning-view*.spec.js`) pass green after the refactor.
- **SC-004**: SQI composite score remains ≥ 80 (`npm run sqi:json`) after the refactor.
- **SC-005**: The jscpd duplication baseline does not increase (`npm run dup:check` passes) — ideally it decreases as the custom div grid code is deleted.
- **SC-006**: The shared factory module has ≤ 500 effective LOC and passes all lint, typecheck, and format gates.
- **SC-007**: A slot-configuration change in the factory is reflected in all four FC surfaces (classic calendar + three planning-view columns) without any per-surface edit.
- **SC-008**: After CSS unification, no FC timegrid or event rule appears in more than one CSS file (verifiable by diffing the rule sets across files — zero duplicate selectors with duplicate declarations).
- **SC-009**: The same Redmine time-entry state (e.g. "break") renders with visually identical colours and dimensions in both the classic week calendar and the Planning View Bookings column.

## Assumptions

- FullCalendar v6 supports three simultaneous `timeGridDay` instances on the same page without degrading scrolling or rendering performance in the Planning View.
- The classic calendar's `timeGridWeek` view IS a factory consumer in this feature. The only differences from the planning-view `timeGridDay` columns are view type and toolbar visibility — both are factory parameters, not interface changes.
- Drag-to-create (used on the classic calendar and Bookings column) vs. read-only (Outlook/Teams columns) is distinguishable via the `mode` descriptor passed to the factory.
- Scroll synchronisation belongs inside the factory (or is coordinated by `planning-view.js` via an exposed API) — the exact boundary will be decided during planning.
- Phase 2 (shared factory) is explicitly in scope for this feature, because issue #229 (DRY cleanup) follows immediately and will build on the same shared-base infrastructure.
- Mobile support is out of scope; the Planning View is a desktop-only surface.
- The existing `js/planning-view-column-base.js` (Card-Rendering, Selection) is the reuse starting point for shared logic — the factory extends or co-locates with this module rather than duplicating it.
- All-day Outlook events rendered as timed blocks reuse the existing `_renderAlldayAsTimed` conversion logic (extracted to a shared utility, not deleted entirely).
- The classic calendar and the Planning View Bookings column currently use the same colour tokens for time-entry states (bookable, break, etc.). If any per-surface colour differences are found during planning, they are treated as bugs and unified — not preserved as intentional differences, unless the user explicitly says otherwise during `/speckit-plan`.
- CSS file layout after the refactor (which file hosts the shared FC styles) is an implementation decision for planning. The spec constraint is DRY: no rule duplicated across files.
