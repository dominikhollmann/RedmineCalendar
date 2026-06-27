# Data Model: Unified Tooltips + Full-Text Event Hover

**Feature**: 053-unified-tooltips · **Date**: 2026-06-27

This feature introduces **no persisted data** and **no new network shapes**. The only "model" is the in-memory, render-time content of a tooltip. Documented here for the builder contract and tests.

## Entity: EventTooltipFields (input to the line builder)

A normalized view of one calendar/planning event, adapted at each call site from the existing entry/proposal shapes. All fields optional except where noted.

| Field               | Type                     | Notes                                                                    |
| ------------------- | ------------------------ | ------------------------------------------------------------------------ |
| `issueId`           | number \| string \| null | Redmine issue id; rendered as `#<id>`.                                   |
| `issueSubject`      | string \| null           | Falls back to the existing localized `entry.fallback_subject` when null. |
| `projectIdentifier` | string \| null           | Passed to existing `formatProject(identifier, name)`.                    |
| `projectName`       | string \| null           | Passed to existing `formatProject(identifier, name)`.                    |
| `startTime`         | string \| null           | `HH:MM`. Time line emitted only if both start and end present.           |
| `endTime`           | string \| null           | `HH:MM`.                                                                 |
| `durationHours`     | number \| null           | If null, derived from start/end by the caller (existing helper).         |
| `comment`           | string \| null           | Omitted if absent/empty.                                                 |

**Validation / rules** (enforced by `buildEventTooltipText`):

- Output is an **ordered** `string[]`: `[issueLine, projectLine?, timeLine?, commentLine?]`.
- A line is **omitted entirely** (not blank) when its source data is absent (FR-005).
- The issue line is always present; if `issueSubject` is null it uses the localized fallback (so it is never just `#`).
- The project line uses `formatProject` — identical formatting to the chip's line 2.
- The time line is `"<start> – <end> (<durationLabel>)"` using the existing `formatDuration`.
- All text is plain (no markup); the consumer sets it via `textContent`.
- The builder takes an injected `t` (i18n) — no module-level i18n import needed for the pure unit test.

## Entity: Tooltip (runtime DOM, produced by the helper)

Created/owned by `attachFixedTooltip` (existing). Transient — created on attach, portaled to `<body>` while shown, removed on hide/unmount.

| Property         | Value                                                                |
| ---------------- | -------------------------------------------------------------------- |
| element          | `<div class="anomaly-tooltip anomaly-tooltip--fixed [--multiline]">` |
| `role`           | `"tooltip"`                                                          |
| `id`             | unique `tooltipId`; referenced by the trigger's `aria-describedby`.  |
| content (single) | one text node (string input) — existing behavior, unchanged.         |
| content (multi)  | one child `<div class="anomaly-tooltip__line">` per array entry.     |
| visibility       | `hidden` attribute toggled by `show()` / `hide()`.                   |
| position         | `top/left` set from the trigger's bounding rect on each `show()`.    |

**State transitions**: `hidden` → (mouseenter | focusin) → `shown` (appended to body, positioned) → (mouseleave | focusout | unmount) → `hidden` (removed from body). At most one tooltip per trigger; rapid hover across events hides the previous trigger's tooltip on `mouseleave` before the next shows (FR-008 edge: no two visible at once).

## Relationships

- One **trigger** (event element / button) ↔ one **Tooltip** (1:1), linked by `aria-describedby` → `tooltipId`.
- One event's **EventTooltipFields** → `buildEventTooltipText` → `string[]` → the Tooltip's multi-line content.

## Non-goals (explicitly out of model)

- No new metadata fields (activity, source label, anomaly reasons) — FR-004.
- No persistence, no caching across renders — content is rebuilt from live event data.
