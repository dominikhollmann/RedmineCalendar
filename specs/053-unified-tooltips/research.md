# Research: Unified Tooltips + Full-Text Event Hover

**Feature**: 053-unified-tooltips · **Date**: 2026-06-27

All decisions resolve the Technical Context unknowns; there are no remaining `NEEDS CLARIFICATION` markers.

## R1 — Single tooltip mechanism (reuse vs. new)

**Decision**: Reuse `attachFixedTooltip(trigger, text, tooltipId)` in `js/anomaly-render.js` as the one and only tooltip primitive. Extend it to accept multi-line content; do **not** introduce a second helper or a CSS framework.

**Rationale**: The helper already solves the hard parts — portals the tooltip to `<body>` with `position: fixed` (escaping overflow clipping and sibling stacking contexts), shows on `mouseenter`/`focusin`, hides on `mouseleave`/`focusout`, sets `role="tooltip"` + `aria-describedby`, and returns `{ show, hide }` for extra triggers. Its docstring already names "the inline warning badge and the settings hint tooltips" as shared consumers. Forking it would violate Constitution VII and trip `dup:check`.

**Alternatives considered**: (a) A new dedicated event-tooltip component — rejected as duplication. (b) Native `title` everywhere — rejected: that is the inconsistency we are removing, and it cannot be styled or made multi-line. (c) A CSS-only `:hover::after` tooltip — rejected: clipped by `overflow:hidden` event chips and can't carry `aria-describedby`.

## R2 — Multi-line rendering inside the existing tooltip

**Decision**: `attachFixedTooltip` keeps accepting a plain string (current single-line callers unchanged). For multi-line, callers pass an **array of strings**; the helper renders each as its own child line element and adds a `--multiline` class. Text is always set via `textContent` (never `innerHTML`).

**Rationale**: An array models "these are the event's lines" cleanly and lets each line wrap independently. Per-line elements give nicer wrapping than a single `pre-line` blob and keep long subjects/comments readable (FR-013). Backward-compatible: string → single text node (existing behavior); array → line list. `textContent` upholds XSS safety (Constitution V) for untrusted issue/comment text.

**Alternatives considered**: Newline-joined string + `white-space: pre-line` (matches `#arbzg-tooltip`) — simpler but wraps the whole block as one flow and is harder to bound per-line; kept as the fallback styling idea only. Markdown/HTML content — rejected (XSS + complexity).

## R3 — The event line builder (where the content comes from)

**Decision**: Add a **pure leaf module** `js/event-tooltip.js` exporting `buildEventTooltipText(fields, t)` that returns an ordered `string[]`:

1. `#<issueId> <issueSubject>` (subject falls back to the existing localized fallback)
2. project (via existing `formatProject(identifier, name)`) — omitted if absent
3. `start – end (duration)` — omitted if start/end absent
4. comment — omitted if absent/empty

Empty lines are never emitted (FR-005). The builder takes a normalized `fields` object so both the calendar entry shape (`entry.issueId/issueSubject/projectName/projectIdentifier/startTime/endTime/comment`) and the planning proposal/booking shape map onto it with a tiny adapter at each call site.

**Rationale**: A pure function with no DOM is node-unit-testable (Constitution III, fastest test layer) and is the single source of truth for "all the event's text", mirroring exactly the four lines `eventContent` already builds in `js/calendar-overlays.js`. Keeping it a leaf (depends only on `i18n` + `formatProject`) avoids import cycles.

**Alternatives considered**: Reading the rendered DOM lines back out of the chip — rejected: brittle, depends on mobile-hidden rows, and couples to markup. Duplicating the assembly in each view — rejected (duplication).

## R4 — Attach point for the event tooltip

**Decision**: Attach in the FullCalendar `eventDidMount`-style path where the event element exists: calendar via `js/calendar-overlays.js eventDidMount(info.el)`, planning via the planning column's event mount. The trigger is the event element; the tooltip text is `buildEventTooltipText(...)`. Build the text lazily (on first `show`) where practical to avoid per-event work on mount.

**Rationale**: `info.el` is the stable per-event DOM node; attaching there means one tooltip per event and automatic teardown on `eventWillUnmount`. The existing anomaly badge already mounts here, so the pattern is proven.

**Alternatives considered**: Attaching in `eventContent` wrapper — the wrapper is re-created on re-render and is a child, making cleanup noisier. Rejected.

## R5 — Touch / pointer-less behavior

**Decision**: For **event** tooltips, wire hover + keyboard focus only — do **not** hijack tap. Tap on a calendar/planning event already opens the entry/booking modal (which shows full detail), so the full-text tooltip is a desktop/keyboard affordance. For **label** tooltips on buttons, the existing helper's focus support covers keyboard; touch users get the button's visible label/icon.

**Rationale**: Overriding tap on events would conflict with the primary open-entry interaction and surprise users. The modal already satisfies the "see everything" need on touch (FR-012 is satisfied via hover/focus equivalence without a new gesture). Documented as an assumption.

**Alternatives considered**: Click-toggle on events (like the inline warning badge) — rejected for events because it collides with open-on-click; the warning badge is a separate small target, events are not.

## R6 — Accessibility: name vs. description, no double-announce

**Decision**: Tooltip text is exposed as a **description** (`aria-describedby`, already done by the helper). Buttons keep their existing `aria-label` as the accessible **name**. Where a button's `aria-label` and its tooltip text would be identical (e.g. "Open settings"), keep both — name + matching description is acceptable and common; do not duplicate into three places. The native `title` is removed so AT no longer reads a redundant third string.

**Rationale**: Removing `title` while adding `aria-describedby` keeps (or improves) screen-reader parity and removes the native-tooltip double-read. Validated by the axe matrix (FR-011, SC-004).

**Alternatives considered**: Using `aria-labelledby` pointing at the tooltip — rejected: a tooltip is a description, not the name; and the tooltip is removed from the DOM while hidden, which would break a name reference.

## R7 — Testing strategy

**Decision**:

- **node Vitest** — `buildEventTooltipText`: ordering, omit-empty (no project / no comment / no times), issue fallback, localization via injected `t`.
- **jsdom Vitest** — `attachFixedTooltip` multi-line: renders one line element per array entry, sets `role="tooltip"` + `aria-describedby`, shows on `focusin`, hides on `focusout`, removes node on hide.
- **Playwright + axe** — hover and keyboard-focus a calendar event, a planning event, and a header button: assert the custom tooltip appears and that the targeted elements expose **no** native `title`; run the existing 7×2 axe matrix for zero new violations.

**Rationale**: Matches the project's three-layer testing architecture and the coverage-gate promotion rule. The pure builder and the DOM helper reach the per-file coverage thresholds without a browser; only the FC-integration and a11y assertions need Playwright.
