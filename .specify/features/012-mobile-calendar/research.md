# Research: Mobile Calendar View

## R1: FullCalendar Mobile Support

**Decision**: Use FullCalendar's built-in responsive views with CSS media queries for mobile adaptation.

**Rationale**: FullCalendar v6 supports `timeGridDay` view which works well on mobile. Combined with CSS media queries for breakpoints under 768px, this provides a mobile-optimized experience without a separate codebase.

**Alternatives considered**:
- **Separate mobile library**: Adds a dependency and doubles maintenance. Rejected per FR-011 (single responsive app).
- **Custom calendar rendering for mobile**: Too much work for the benefit. FullCalendar's day view is already touch-friendly.

## R2: Mobile View Switching

**Decision**: Auto-detect screen width and switch to `timeGridDay` view on screens narrower than 768px. Users can still toggle manually.

**Rationale**: FullCalendar supports `initialView` and responsive `views` configuration. We can set `timeGridDay` as the default for narrow screens via the `windowResize` callback or initial width check.

## R3: Touch Interactions

**Decision**: Use FullCalendar's native touch support. FullCalendar v6 handles touch events natively (tap = click, swipe not built-in). Add swipe navigation via a lightweight touch event handler.

**Rationale**: FullCalendar handles tap-to-select and tap-to-create natively. Swipe for day navigation requires a small custom handler (touchstart/touchend delta detection).

## R4: Mobile Form Layout

**Decision**: CSS media queries to make the time entry modal full-screen on mobile. Inputs get `width: 100%`, buttons get larger padding, and the three-column layout stacks vertically.

**Rationale**: The existing modal HTML is already semantic — no structural changes needed, just CSS overrides for small screens.

## R5: AI Chat on Mobile

**Decision**: CSS media queries to make the chat panel full-screen on mobile (instead of side panel). Same underlying JS.

**Rationale**: The chat panel is already a fixed-position overlay. Making it full-width on mobile is a CSS-only change.

## R6: PWA Considerations

**Decision**: Add a basic `manifest.json` and service worker registration as a stretch goal. Not required for MVP.

**Rationale**: A PWA manifest allows "Add to Home Screen" on mobile, giving a native-like experience. But it's not critical for functionality — the app works fine in a mobile browser.
