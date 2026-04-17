# Research: Visual Appearance Improvements (011)

## Decision 1: How to swap event card text styles (US1)

**Decision**: Directly swap the CSS rules for `.ev-time` and `.ev-issue` in `css/style.css`.

**Current styles**:
```
.ev-time    { font-size: 0.75rem; font-weight: 600; white-space: nowrap; overflow: hidden; }
.ev-issue   { font-size: 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ev-project { font-size: 0.7rem; opacity: 0.75; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
```

**Target after swap**:
- `.ev-issue` gets `font-weight: 600` (currently only `.ev-time` has this) and keeps its size
- `.ev-time` drops `font-weight: 600` and adopts the smaller size and opacity of `.ev-project`
- `.ev-project` unchanged

**Rationale**: The three class names are already cleanly separated in CSS. No JavaScript or DOM changes needed — a pure CSS edit achieves the hierarchy swap.

**Alternatives considered**: Adding a new CSS class to the time element via JavaScript was rejected (more fragile; CSS alone is sufficient).

---

## Decision 2: Row height increase (US2)

**Decision**: Increase `.fc .fc-timegrid-slot { height: ... }` from the current `20px` to `28px`.

**Rationale**: At 15-minute slots and 20px height, the calendar shows 4 slots per hour × 20px = 80px/hour. Increasing to 28px gives 112px/hour — enough vertical space for a 30-minute entry card to show all three text lines legibly. 28px is a conservative increase that keeps the full work day (8 h) within ~900px, fitting most desktop screens without excessive scrolling.

**Alternatives considered**: 30px or 32px would be more generous but pushes 8 h of work to >1000px, requiring noticeable scrolling on 1080p screens. The value can be tuned during UAT.

---

## Decision 3: Hourly banding via CSS attribute selectors (US3)

**Decision**: Replace the current 30-minute banding selectors with selectors that match all four 15-minute slots of every even hour (00, 02, 04, … 22).

**Current approach** (30-min bands — same pattern repeats each hour):
```css
[data-time$=":00:00"], [data-time$=":15:00"]  → first 30 min of every hour shaded
```

**New approach** (60-min alternating bands):
```css
[data-time^="00:"], [data-time^="02:"], [data-time^="04:"], ...  → all slots of even hours shaded
```

**Rationale**: FullCalendar v6 renders each 15-minute slot as a separate DOM element with a `data-time` attribute (e.g., `data-time="08:00:00"`). The `^=` (starts-with) CSS attribute selector can match all slots within a given hour without JavaScript. Listing the 12 even-hour prefixes explicitly is verbose but reliable and requires no runtime code.

**Alternatives considered**:
- Using `:nth-child` selectors: unreliable because FullCalendar inserts non-slot DOM nodes between slots.
- JavaScript to add classes: works but adds runtime overhead for a purely cosmetic change; CSS-only is preferable.
