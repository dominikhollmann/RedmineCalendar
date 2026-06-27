# Quickstart / UAT: Unified Tooltips + Full-Text Event Hover

**Feature**: 053-unified-tooltips · **Date**: 2026-06-27

Prerequisites: `npm install`, then `npm run dev` for the visual walkthrough. Have at least one **short** Redmine booking (≈15 min, with a comment) and, if connected, an Outlook/Teams event visible in the planning view.

## Scenario 1 — Full-text tooltip on a short calendar booking

- [x] Hover a short booking whose chip visibly clips rows — a single dark tooltip shows issue (`#id subject`), project, time range + duration, and the comment.
- [x] Keyboard-focus the same event (Tab to it) — the same tooltip appears on focus and disappears on blur.
- [x] Hover a booking that has **no comment** — the tooltip shows the other lines and omits the comment row (no empty line).
- [x] Move the pointer off the event — the tooltip disappears.

## Scenario 2 — Full-text tooltip in the planning view (bookings + Outlook/Teams)

- [x] In the planning view, hover a bookings-column event — the tooltip shows the complete event text.
- [x] Hover an Outlook or Teams event (if connected) — the tooltip shows its complete text (subject, project/where, time range + duration as applicable).
- [x] Confirm the tooltip is not clipped by the scrollable planning column and is not painted over by neighbouring cards.

## Scenario 3 — One consistent tooltip style app-wide

- [x] Hover the header **settings**, **help (?)**, and **chat (✨)** buttons — each shows the custom dark tooltip (not the native OS tooltip).
- [x] Hover calendar toolbar controls (refresh, working-hours hint, prev/next day) and the feedback button — all show the custom style.
- [x] Open the booking modal and hover the **favourite star** and the ticket/project rows — custom style.
- [x] On the settings page, hover the fast-mode hint and the docs-help button — custom style.
- [x] Confirm no element above still triggers a second, native browser tooltip (no double tooltip).

## Scenario 4 — Light + dark parity

- [x] Repeat a calendar-event hover and a header-button hover in **dark** mode — the tooltip background, text, padding, radius, and elevation match the light-mode tooltip style (same component, themed).

## Scenario 5 — Accessibility (keyboard + screen reader + axe)

- [x] Tab through header buttons and a focused calendar event — each reveals its tooltip on focus and exposes the tooltip text as an accessible description (`aria-describedby`).
- [ ] Confirm no targeted control still carries a native `title` attribute (inspect element, or rely on the Playwright assertion).
- [x] Run `npm run test:ui` — full Playwright + axe a11y matrix (7 surfaces × 2 themes) passes with no new violations.

## Scenario 6 — Long content stays readable

- [x] Hover an event with a long subject and/or long comment — the tooltip wraps within a constrained width and stays on-screen (not pushed off the right/bottom edge), even near the viewport corner.

## Scenario 7 — Quality pipeline

- [x] `npm run lint` and `npm run stylelint` (via lint) pass — no hardcoded user-visible strings; CSS uses tokens.
- [x] `npm run knowledge:check` passes — `js/event-tooltip.js` is registered in `js/knowledge.topics.json`.
- [x] `npm run dup:check` passes — no new token-identical clones (single tooltip mechanism, not forked).
- [x] `npm run test:coverage` passes — `event-tooltip` and the tooltip-attach DOM tests meet per-file thresholds.
- [x] `npm run sqi` — composite stays ≥ 80 (GREEN).

## Expected outcome

Every targeted tooltip uses one custom style across both themes, no native browser tooltips remain on the targeted controls, and hovering/focusing any calendar or planning event reveals the event's complete text — so short, clipped chips no longer hide information — with no accessibility regression.
