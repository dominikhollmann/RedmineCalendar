# Implementation Plan: Unified Tooltips + Full-Text Event Hover

**Branch**: `053-unified-tooltips` | **Date**: 2026-06-27 | **Spec**: [`spec.md`](./spec.md)

**Input**: Feature specification from `specs/053-unified-tooltips/spec.md`

## Summary

Two coordinated UX changes, both built on the **existing** custom tooltip primitive (`attachFixedTooltip()` in `js/anomaly-render.js`) — no second tooltip system (Constitution VII reuse-first):

1. **Full-text event hover (P1)** — a single hover/focus tooltip on every calendar and planning event (Redmine bookings + Outlook/Teams, calendar view + planning view) showing the complete event text: issue (`#id subject`), project, time range + duration, and comment when present. A pure leaf builder assembles the ordered, localized lines from the data the chip already has; both the calendar (`js/calendar-overlays.js`) and planning (`js/planning-view-column-base.js`) `eventContent` paths call it.
2. **App-wide style unification (P2)** — replace the remaining native browser `title`-attribute tooltips (header settings/help/chat, calendar toolbar buttons, feedback button, calendar event rows, booking-modal favourite star + ticket/project rows, settings-page hints) with the same custom tooltip, via a thin `attachLabelTooltip()` convenience wrapping the existing helper. Accessibility (role=tooltip, `aria-describedby`, hover + keyboard focus, dismiss) is preserved because the existing helper already provides it.

No new dependencies, no new persistence, no new network calls. Verified against the existing axe a11y matrix (7 surfaces × 2 themes).

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) — unchanged

**Primary Dependencies**: FullCalendar v6 (CDN, existing) for event rendering callbacks; existing `js/anomaly-render.js` custom-tooltip helper; `js/i18n` for localized strings. No new dependencies.

**Storage**: N/A — tooltip content is computed at render time from already-loaded event data; no localStorage / IndexedDB / config keys added.

**Testing**: Vitest (node for the pure line-builder; jsdom for the DOM attach/aria/show-hide); Playwright + `@axe-core/playwright` for the hover/focus integration and the a11y regression matrix.

**Target Platform**: Browser SPA (desktop primary; mobile/touch behavior mirrors the existing custom warning-badge tooltip).

**Project Type**: Single-project static web app (vanilla ES modules under `js/`, styles under `css/`).

**Performance Goals**: Tooltip appears within perceived-instant (<300 ms, Constitution II); no measurable render regression on calendar/planning event mounting (tooltip text is built lazily on show, not eagerly per event).

**Constraints**: Event/issue text is untrusted Redmine content → MUST be rendered as text (`textContent`), never `innerHTML` (Constitution V, XSS). Tooltips must escape clipping/stacking contexts (the existing helper already portals to `<body>` with `position: fixed`).

**Scale/Scope**: ~18 native `title` assignment sites across 7 JS modules; 2 event-content builders; 1 shared line-builder module; CSS only adds a multi-line tooltip variant class.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. Redmine API Contract** — N/A; no API change. Tooltip re-presents already-fetched data. ✅
- **II. Calendar-First UX** — Directly improves calendar usability (no information lost on short chips); interactions stay <300 ms. ✅
- **III. Test-First** — Pure line-builder gets node unit tests written first; DOM attach gets jsdom tests; hover/focus + a11y get Playwright. Red-Green-Refactor enforced. ✅
- **IV. Simplicity & YAGNI** — Reuses the existing tooltip primitive; adds one small pure module + one thin wrapper. No speculative config. ✅
- **V. Security by Default** — All tooltip text set via `textContent`; untrusted issue subjects/comments never injected as HTML. ✅
- **VI. Continuous Quality Gates** — Full pipeline (lint, stylelint, typecheck, coverage, SQI ≥ 80, axe matrix, dup:check, knowledge:check) must pass. New module added to `js/knowledge.topics.json`. ✅
- **VII. Reuse-First / No Duplication** — Core principle here: a single tooltip mechanism, extended (multi-line) not forked. `dup:check` baseline respected. ✅

**No violations** → Complexity Tracking table omitted.

## Project Structure

### Documentation (this feature)

```text
specs/053-unified-tooltips/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions (multi-line render, attach point, touch, a11y)
├── data-model.md        # Phase 1 — tooltip content shape + builder contract
├── quickstart.md        # Phase 1 — UAT acceptance scenarios
├── contracts/
│   └── tooltip-api.md   # Phase 1 — public surface of the tooltip helpers + line builder
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
js/
├── event-tooltip.js          # NEW — pure leaf: buildEventTooltipText(fields) → string[] (ordered, localized, empties omitted)
├── anomaly-render.js         # EXTEND — attachFixedTooltip() gains multi-line support; add attachLabelTooltip() convenience
├── calendar-overlays.js      # EDIT — eventContent/eventDidMount: attach full-text tooltip; drop issueDiv/projDiv native title
├── planning-view-column-base.js # EDIT — planning eventContent: attach full-text tooltip
├── calendar-toolbar.js       # EDIT — toolbar button titles → attachLabelTooltip
├── page-init.js              # EDIT — header settings/help/chat titles → attachLabelTooltip
├── feedback.js               # EDIT — feedback button title → attachLabelTooltip
├── settings-page.js          # EDIT — docs-help button title → attachLabelTooltip
├── time-entry-form.js        # EDIT — modal ticket/project row titles → attachLabelTooltip
├── time-entry-form-view.js   # EDIT — favourite star + ticket/project row titles → attachLabelTooltip
├── i18n/{en,de}.js           # EDIT — any new tooltip keys (e.g. event-tooltip line labels if needed)
└── knowledge.topics.json     # EDIT — register js/event-tooltip.js

css/
└── calendar-overlays.css     # EDIT — add .anomaly-tooltip--multiline variant (white-space: pre-line / line list)

tests/
├── unit/event-tooltip.test.js        # NEW (node) — line assembly, ordering, omit-empty, localization
├── unit/attach-tooltip.test.js       # NEW (jsdom) — multi-line render, aria-describedby, show/hide on focus
└── ui/tooltips.spec.js               # NEW (Playwright) — hover/focus event + header tooltips; no native title; axe
```

**Structure Decision**: Single-project vanilla-ES-module layout (existing). The only new runtime module is the pure `js/event-tooltip.js` leaf; everything else extends existing modules. The tooltip _mechanism_ stays centralized in `js/anomaly-render.js` to honor reuse-first.

## Complexity Tracking

> No Constitution violations — table intentionally omitted.
