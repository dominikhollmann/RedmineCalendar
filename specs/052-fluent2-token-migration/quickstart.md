# Quickstart / UAT: Token migration + enforcement

**Feature**: 052-fluent2-token-migration · **Date**: 2026-06-26

Prerequisites: `npm install` (pulls the new `stylelint-declaration-strict-value` devDep), then `npm run dev` for the visual walkthrough.

## Scenario 1 — Enforcement gate is active and green

- [ ] Run `npm run lint` on a clean tree — it passes with no `scale-unlimited/declaration-strict-value` errors.
- [ ] Confirm `.stylelintrc.json` lists `stylelint-declaration-strict-value` in `plugins` and the `scale-unlimited/declaration-strict-value` rule with `font-size`, `border-radius`, `/^transition/`, `box-shadow`, `/^padding/`, `/^margin/`, and gap properties.

## Scenario 2 — Gate fails on a new raw literal (per category)

- [ ] Temporarily add `font-size: 13px;` to a rule in `css/calendar.css`, run `npm run lint`, confirm it **fails** naming the declaration; revert.
- [ ] Repeat with a raw `border-radius: 7px;` — lint fails; revert.
- [ ] Repeat with a raw `box-shadow: 0 1px 1px black;` — lint fails; revert.
- [ ] Repeat with a raw `transition: opacity 0.4s;` — lint fails; revert.
- [ ] Repeat with a raw `padding: 7px;` — lint fails; revert.
- [ ] Confirm `npm run lint` returns to green after all reverts.

## Scenario 3 — Escape hatch works for genuine exceptions

- [ ] Confirm the `:root` token blocks in `css/base.css` are wrapped in a `scale-unlimited/declaration-strict-value` disable region (definitions, not use sites).
- [ ] Confirm each Band-C dense-calendar micro-padding and each focus-ring `box-shadow` carries an inline disable + a one-line rationale comment; `npm run lint` passes.

## Scenario 4 — No unintended visual change (manual walkthrough, light + dark)

For each surface, compare against the pre-migration build (e.g. git stash / previous tag) in **both light and dark themes**:

- [ ] Calendar (work-week and full-week density) — event chips, time labels, ArbZG/anomaly badges, toolbar, week-total all look unchanged.
- [ ] Working-hours switch — track is fully rounded (pill), unchanged.
- [ ] Time-entry modal — typography, padding, and the modal drop-shadow elevation read the same; modal corners unchanged.
- [ ] Settings page — labels, section headers, footer link sizing unchanged.
- [ ] Docs panel — headings, code text, side-panel shadow unchanged.
- [ ] Feedback panel + pill button — button is fully rounded; panel shadow unchanged.
- [ ] Planning view — list typography and panel shadow unchanged.
- [ ] Mobile bottom-sheet (narrow viewport) — top corners keep their larger radius.

## Scenario 5 — Theme toggle integrity

- [ ] Toggle light ↔ dark with a modal open — the modal elevation switches to the deeper dark-theme shadow and back; no fl/flicker or missing shadow.

## Scenario 6 — OSS artifacts + full pipeline

- [ ] Run `npm run oss:generate`; confirm `sbom.json` includes `stylelint-declaration-strict-value` and `git status` shows the regenerated files committed.
- [ ] Run `npm run oss:drift` — passes (no drift).
- [ ] Run `npm run oss:licenses` — passes (MIT on allowlist).
- [ ] Run `npm run sqi` — composite stays ≥ 80 (GREEN).
- [ ] Run `npm run test:ui` — full Playwright + axe a11y matrix passes.

## Expected outcome

All gated CSS properties reference design tokens (or carry a documented exception), the build fails on any new raw literal, and the app is visually identical (within snap tolerance) across every surface, theme, and density level.
