# Research: Time Entry Anomaly Detection

**Feature**: 029-anomaly-detection
**Date**: 2026-05-10
**Phase**: 0 (Outline & Research)

This feature is layered on existing FullCalendar v6 callbacks and existing entry data. The "research" maps the touch-points and locks down the rule semantics.

---

## R1 — FC v6 hook for attaching per-event badges

**Decision**: use the `eventDidMount(info)` callback. Inside the callback, look up the event's entry id in the precomputed anomaly Map; if a tag exists, append a `<span class="fc-event__anomaly-badge">⚠</span>` (or similar glyph) to `info.el` and a sibling `.anomaly-tooltip` element with the reason(s).

**Rationale**:

- `eventDidMount` runs after FC has drawn the event element — perfect for decoration.
- It runs again on every re-render, so when `loadWeekEntries` refreshes events, badges are reapplied automatically.
- Adding a child element does not displace existing FC content (FR-008, FR-011).

**Alternatives considered**:

- **`eventContent` (custom render)**: rejected — replaces FC's whole event template, more invasive; risk of drifting from FC's accessibility defaults.
- **`eventClassNames`**: too coarse — only sets a class on the event root, can't attach a tooltip child element.
- **A separate overlay layer**: rejected — would have to track positions; FC already does it correctly inside the event.

---

## R2 — Existing entry-loading pipeline

**Decision**: compute the anomaly Map inside `loadWeekEntries()` in `js/calendar.js` immediately after `splitMidnightEntries(...)` and BEFORE `removeAllEvents/addEvent`. Store it on `window._calendarAnomalies` (mirroring the existing `window._calendarDayTotals` pattern at `js/calendar.js:329`). The `eventDidMount` callback reads from that global.

**Rationale**:

- Recomputing in the same place that `updateDayTotals` runs ensures both stay in sync.
- The `window._calendar*` global pattern is already in use for derived render data; we follow the existing convention rather than inventing a new state-passing mechanism.
- FR-005 (live update on edit) is satisfied: any CRUD ends in a `loadWeekEntries` call, which recomputes.

**Alternatives considered**:

- **An event bus / subscription pattern**: rejected — overkill for one consumer; YAGNI.
- **Call `detectAnomalies` from inside `eventDidMount`**: rejected — would re-run the O(n²) per-event, not per-render.

---

## R3 — Break-ticket and holiday-ticket exclusion

**Decision**: pass `cfg.breakTicket` (and `cfg.holidayTicket`, for symmetry) into `detectAnomalies(entries, { breakTicket, holidayTicket })`. Inside:

- The `very-short-entry` rule **excludes** break-ticket entries (their duration is artificially zero by design).
- The `overlapping-entries` rule **excludes** break-ticket entries from BOTH sides of the comparison: a break entry never appears in a pair, AND a break entry's presence does not cause any other entry to be flagged (FR-003, SC-006).
- Holiday-ticket entries are NOT excluded from any rule — they are normal entries with a normal 8h duration; they should not match `very-short-entry` and should match `overlapping-entries` if they actually overlap something else.

**Rationale**:

- Spec is explicit: "Zero-duration synthetic break-ticket blocks MUST be excluded from this rule" (FR-003); "Holiday/OOO booking → not flagged for any rule (the duration is normal; no overlap unless the user double-booked)" (Edge cases).
- The existing detection pattern `Number(entry.issueId) === Number(cfg.breakTicket)` is reused unchanged.

**Alternatives considered**:

- **Exclude every "synthetic" entry generically**: rejected — break-ticket is the only synthetic class today; over-generalizing would hide future intentional "tag-only" entries.

---

## R4 — Midnight-split entries

**Decision**: `detectAnomalies` operates on the **pre-split** entries (the `mapped` list, before `splitMidnightEntries` runs), so each underlying entry is evaluated exactly once. The resulting Map keys by the **original** entry ID. The render pass then attaches the badge to BOTH halves of a midnight-split event (they share the same `extendedProps.timeEntry.id`).

**Rationale**:

- A single underlying entry should produce a single anomaly state — running the rules over the post-split data would double-evaluate and could cause spurious overlaps between an entry's two halves.
- Both visual halves still need the badge (FR-008 requires the indicator to be visible on every rendered piece of the entry).

**Alternatives considered**:

- **Run on post-split data and dedupe by id**: rejected — produces the right output but does extra work; pre-split is cleaner.

---

## R5 — Tooltip primitive

**Decision**: implement a minimal CSS+JS popover. The badge is `<span class="fc-event__anomaly-badge" tabindex="0" role="button" aria-describedby="anomaly-tooltip-{id}">⚠</span>`. A sibling `<div class="anomaly-tooltip" id="anomaly-tooltip-{id}" role="tooltip" hidden>{reasons}</div>`. CSS shows the tooltip on `:hover` and `:focus-within`. JS toggles `hidden` on click for touch users (FR-008 — mobile visibility).

**Rationale**:

- Native `title` attribute is rejected because it doesn't work on touch devices.
- A new tooltip library is rejected (Principle IV — Simplicity).
- The pattern is already used elsewhere in the app (e.g., the ArbZG badge tooltip at `js/calendar.js:316–320`); we follow the same approach.

**Alternatives considered**:

- **`<details>`/`<summary>`**: rejected — visual style would clash with the calendar's compact layout.

---

## R6 — i18n keys

**Decision**: add the following keys to `js/i18n.js` in EN+DE:

| Key                        | EN                                                  | DE                                                             |
| -------------------------- | --------------------------------------------------- | -------------------------------------------------------------- |
| `anomaly.veryShort.reason` | `Very short entry — possible typo ({hours}h)`       | `Sehr kurzer Eintrag — möglicher Tippfehler ({hours}h)`        |
| `anomaly.overlap.reason`   | `Overlaps with {start}–{end} entry on the same day` | `Überschneidet sich mit Eintrag {start}–{end} am gleichen Tag` |
| `anomaly.badge.aria`       | `This entry has anomalies — click for details`      | `Dieser Eintrag enthält Auffälligkeiten — Details anzeigen`    |
| `anomaly.tooltip.title`    | `Possible issue`                                    | `Möglicher Fehler`                                             |
| `anomaly.multipleReasons`  | `{count} issues:`                                   | `{count} Hinweise:`                                            |
| `anomaly.dismissForTouch`  | `Tap badge to close`                                | `Symbol antippen zum Schließen`                                |

---

## R7 — Recompute trigger summary

| Trigger                                        | Where                                                                           | What runs                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------- |
| Initial load / week navigation                 | `loadWeekEntries()`                                                             | full `detectAnomalies` pass |
| Add entry                                      | post-create refresh inside `loadWeekEntries()`                                  | full pass (cheap)           |
| Edit / drag / resize / delete                  | post-action refresh inside `loadWeekEntries()`                                  | full pass (cheap)           |
| Settings change (break-ticket, holiday-ticket) | not a v1 concern (those settings are admin-managed and don't change at runtime) | no recompute needed         |

---

## Outcome

All Phase 0 unknowns resolved. Ready for Phase 1 design (data-model, quickstart).
