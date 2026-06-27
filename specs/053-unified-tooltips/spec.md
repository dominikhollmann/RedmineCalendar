# Feature Specification: Unified Tooltips + Full-Text Event Hover

**Feature Branch**: `053-unified-tooltips`

**Created**: 2026-06-27

**Status**: Draft

**Input**: User description: "Unified tooltips + full-text event hover. (1) Standardize ALL tooltips app-wide on the existing custom dark tooltip style, replacing every native browser title-attribute tooltip (header buttons, calendar event rows, favourite star, planning/Outlook/Teams cards, settings hints). Keep accessibility intact (role=tooltip + aria-describedby, hover AND keyboard focus, dismissable). (2) For calendar and planning events — Redmine bookings AND Outlook/Teams events, in BOTH the calendar and planning views — a single hover/focus tooltip shows the COMPLETE event text (issue #id + subject, project, time range + duration, comment when present) so short clipped chips lose nothing. Localization via i18n; no new persistence; verify no axe a11y regression."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See the full content of a short / clipped event (Priority: P1)

A user has a short time entry or calendar event whose chip is too small to show every line — the subject, project, time range, or comment is cut off. The user hovers (or keyboard-focuses) the event and a single tooltip appears showing the complete text of that event, so they can read everything without opening the entry.

**Why this priority**: This is the core value the user asked for. Short events are common (15–30 min bookings, back-to-back Outlook meetings) and currently lose information visually. It works for every event type (Redmine bookings, Outlook, Teams) in both the calendar and planning views.

**Independent Test**: Create/observe a 15-minute event in both the calendar and planning views, hover and keyboard-focus it, and confirm the tooltip lists issue (#id + subject), project, time range + duration, and the comment when present — even when those rows are visually clipped on the chip.

**Acceptance Scenarios**:

1. **Given** a short Redmine booking in the calendar whose chip clips the project and time rows, **When** the user hovers the event, **Then** a single tooltip shows the issue (#id + subject), project, time range + duration, and comment (if any).
2. **Given** an Outlook or Teams event in the planning view, **When** the user hovers or keyboard-focuses it, **Then** a single tooltip shows the complete event text that the chip would otherwise display.
3. **Given** an event with no comment, **When** the user hovers it, **Then** the tooltip omits the comment line (no empty row) and shows the remaining lines.
4. **Given** the user moves the pointer off the event (or blurs focus), **When** the event is no longer hovered/focused, **Then** the tooltip disappears.

---

### User Story 2 - Consistent tooltip appearance across the whole app (Priority: P2)

A user notices that hovering different UI elements produces visually different tooltips — some are the browser's native OS-styled tooltip, others are the app's custom dark style. The user wants one consistent tooltip style everywhere so the UI feels coherent.

**Why this priority**: This is the inconsistency that triggered the feature. It is a polish/coherence improvement that is valuable but secondary to recovering clipped event content (P1). It can ship independently of US1.

**Independent Test**: Hover the header buttons (settings, help, chat), a calendar event's issue/project rows, the favourite star in the booking modal, and the closed-issue warning badge; confirm every visible hover tooltip uses the same custom style (no native browser tooltip appears for these elements).

**Acceptance Scenarios**:

1. **Given** any element that previously showed a native `title` tooltip (header buttons, event rows, favourite star, settings hints), **When** the user hovers it, **Then** the tooltip rendered uses the app's single custom tooltip style and no native browser tooltip appears.
2. **Given** two different tooltip-bearing elements anywhere in the app, **When** the user hovers each, **Then** both tooltips share the same visual style (background, text color, padding, corner radius, elevation) in both light and dark themes.

---

### User Story 3 - Tooltips are keyboard- and screen-reader-accessible (Priority: P2)

A keyboard or assistive-technology user can reach every tooltip without a pointer: focusing a tooltip-bearing control reveals the tooltip and associates it with the control, and moving focus away hides it.

**Why this priority**: Accessibility is a standing project requirement (existing axe CI gate over 7 surfaces × 2 themes). Replacing native `title` (which AT reads automatically) with custom tooltips must not regress screen-reader access, so this rides alongside US2.

**Independent Test**: Tab to each migrated tooltip trigger, confirm the tooltip shows on focus and hides on blur, that the trigger exposes an accessible description of the tooltip text, and that the axe matrix shows no new violations.

**Acceptance Scenarios**:

1. **Given** a tooltip-bearing control, **When** the user moves keyboard focus to it, **Then** the tooltip appears and the control is programmatically associated with the tooltip's text for assistive technology.
2. **Given** a visible tooltip, **When** the user moves focus away or presses the dismiss affordance, **Then** the tooltip hides.
3. **Given** the full app across all surfaces and both themes, **When** the accessibility scan runs, **Then** there are no new accessibility violations compared to the pre-feature baseline.

---

### Edge Cases

- **Very long content**: An event with a long subject and/or long comment — the tooltip must remain readable (wrap/constrain width) and not overflow the viewport.
- **Touch devices**: With no hover, the event tooltip must still be reachable (e.g. tap/focus toggle) consistent with how the existing custom warning-badge tooltip already behaves on touch.
- **Clipping containers**: Events inside scrollable planning columns or small calendar chips — the tooltip must not be clipped by the container or painted over by sibling elements.
- **Event near a screen edge**: The tooltip should remain on-screen (not pushed off the right/bottom edge).
- **Rapid hover across many events**: Hovering quickly across adjacent events must not leave multiple tooltips visible at once.
- **Elements with both an accessible label and a tooltip** (e.g. an icon button): the accessible name and the tooltip description must not produce a confusing or duplicated screen-reader announcement.
- **Empty / missing fields**: Events missing a project or subject must omit those lines rather than show blank/`#` placeholders.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The application MUST present a single, consistent custom tooltip style for all hover/focus tooltips, reusing the existing custom tooltip mechanism rather than introducing a second style.
- **FR-002**: The application MUST replace native browser `title`-attribute tooltips on user-facing interactive/informational elements (header settings/help/chat controls, calendar event issue and project rows, the favourite star, planning / Outlook / Teams event cards, settings-page hints) with the custom tooltip.
- **FR-003**: For calendar and planning events (Redmine bookings, Outlook events, Teams events) in both the calendar view and the planning view, hovering or focusing an event MUST show one tooltip containing the complete event text: issue (#id + subject), project, time range + duration, and comment when present.
- **FR-004**: The event tooltip MUST aggregate exactly the text already shown (or that would be shown with enough room) on the event chip — no new metadata fields (e.g. activity type, source, anomaly reasons) are introduced by this feature.
- **FR-005**: The event tooltip MUST omit lines for fields that are absent (e.g. no comment, no project) without leaving empty rows or placeholder symbols.
- **FR-006**: Every custom tooltip MUST appear on pointer hover AND on keyboard focus of its trigger, and MUST hide on pointer-leave / blur.
- **FR-007**: Every custom tooltip MUST be programmatically associated with its trigger for assistive technology (an accessible description relationship) and use an appropriate tooltip role.
- **FR-008**: Tooltips MUST remain fully visible — not clipped by scrollable containers or small event chips, not painted over by sibling elements, and not pushed off-screen near viewport edges.
- **FR-009**: All tooltip text MUST be localized through the existing localization system (English + German); no hard-coded user-visible strings.
- **FR-010**: The feature MUST NOT introduce new client-side persistence or collect/transmit any new data.
- **FR-011**: The feature MUST NOT introduce a new accessibility violation in the existing automated accessibility matrix (all surfaces × light/dark).
- **FR-012**: On touch devices (no hover), the event tooltip MUST be reachable via an equivalent interaction (tap/focus toggle), consistent with the existing custom-tooltip touch behavior.
- **FR-013**: Long tooltip content MUST wrap and remain within a constrained, readable width rather than overflowing.

### Key Entities

- **Event tooltip content**: The aggregated, ordered, localized lines describing a single calendar/planning event — issue identifier + subject, project, time range + duration, and optional comment. Derived at render time from the event's existing display data; not persisted.
- **Tooltip trigger**: Any element that reveals a tooltip on hover/focus (header buttons, event chips, favourite star, settings hints, warning badges). Carries the accessible-description association to its tooltip.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: For 100% of calendar and planning events (bookings, Outlook, Teams), hovering or focusing the event reveals a tooltip containing every populated content line (issue, project, time range + duration, comment), verified across both views.
- **SC-002**: A user can read the full content of a clipped short event without opening the entry or resizing — the information is available within one hover/focus interaction.
- **SC-003**: 0 elements in the app present a native browser tooltip for the targeted interactive/informational controls; 100% use the single custom style (no two visibly different hover-tooltip styles coexist) in both light and dark themes.
- **SC-004**: Every tooltip is reachable by keyboard and exposes its text to assistive technology; the automated accessibility scan reports 0 new violations versus the pre-feature baseline across all surfaces and both themes.
- **SC-005**: 100% of tooltip strings are served from the localization catalog in both English and German with no hard-coded fallbacks.

## Assumptions

- The existing custom tooltip mechanism (the dark "anomaly-tooltip" style and its portaled, hover/focus, accessible attachment helper) is the canonical style and will be reused/extended rather than reinvented (Constitution reuse-first; no second tooltip implementation).
- "All text on the event" means the lines the event chip is designed to display (issue, project, time range + duration, comment) — not raw API fields beyond those.
- Document-level or non-user-facing `title` attributes (e.g. the page `<title>`, or `title` used purely as a non-tooltip data carrier) are out of scope; only user-facing hover tooltips are unified.
- Mobile/touch behavior mirrors the existing custom warning-badge tooltip (tap/focus toggle); no new gesture is invented.
- No changes to what data is fetched from Redmine/Outlook/Teams — the tooltip only re-presents data already loaded for the event.
- The 7-surface × 2-theme axe accessibility matrix from prior features is the baseline against which "no regression" is measured.
