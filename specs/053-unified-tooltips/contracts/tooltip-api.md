# Contract: Tooltip API surface

**Feature**: 053-unified-tooltips · **Date**: 2026-06-27

This is a UI/library contract (no HTTP). It defines the public JS surface the rest of the app depends on, so callers and tests have a stable shape.

## `js/event-tooltip.js` (NEW — pure leaf)

```js
/**
 * Assemble the ordered, localized lines describing one calendar/planning event.
 * Pure: no DOM, no module-level i18n. Omits lines whose source data is absent.
 *
 * @param {EventTooltipFields} fields  normalized event fields (see data-model.md)
 * @param {(key: string, vars?: object) => string} t  i18n translator
 * @returns {string[]}  e.g. ["#123 Fix login", "ACME / web", "09:00 – 09:30 (0.5h)", "pairing w/ Sam"]
 */
export function buildEventTooltipText(fields, t);
```

**Guarantees**

- Index 0 is always the issue line and never empty (uses localized fallback subject when `issueSubject` is null).
- Project / time / comment lines appear only when their data is present, in that fixed order.
- Returns `[]`-free of empty strings; callers may `.join('\n')` or pass the array straight to `attachFixedTooltip`.
- Deterministic for the same input; no side effects.

## `js/anomaly-render.js` (EXTEND)

### `attachFixedTooltip(trigger, text, tooltipId)` — signature widened

```js
/**
 * @param {HTMLElement} trigger
 * @param {string | string[]} text  string ⇒ single-line (existing); string[] ⇒ multi-line
 * @param {string} tooltipId
 * @returns {{ tooltip: HTMLElement, show: () => void, hide: () => void }}
 */
export function attachFixedTooltip(trigger, text, tooltipId);
```

**Backward compatibility**: existing string callers are unchanged (single text node, no `--multiline` class). Array input renders one `.anomaly-tooltip__line` per entry and adds `--multiline`. Content is always set via `textContent`.

### `attachLabelTooltip(trigger, text, tooltipId?)` — NEW convenience

```js
/**
 * Replace a native `title` tooltip on a button/control with the custom style.
 * Thin wrapper over attachFixedTooltip for the single-line label case; generates
 * a tooltipId when omitted. Removes any existing `title` attribute on `trigger`.
 *
 * @param {HTMLElement} trigger
 * @param {string} text   already-translated label
 * @param {string} [tooltipId]
 * @returns {{ tooltip, show, hide }}
 */
export function attachLabelTooltip(trigger, text, tooltipId);
```

**Guarantees**

- After the call, `trigger.hasAttribute('title') === false` (no native + custom double tooltip).
- `trigger` gains `aria-describedby` → `tooltipId` (accessible description preserved).
- Shows on hover AND keyboard focus; hides on leave/blur.

## Consumption contract (call sites)

| Call site                                  | Before                            | After                                                             |
| ------------------------------------------ | --------------------------------- | ----------------------------------------------------------------- |
| `calendar-overlays.js` event mount         | `issueDiv.title`, `projDiv.title` | one `attachFixedTooltip(info.el, buildEventTooltipText(...), id)` |
| `planning-view-column-base.js` event mount | (native row titles, if any)       | one `attachFixedTooltip(eventEl, buildEventTooltipText(...), id)` |
| `page-init.js` header buttons              | `.title = t(...)`                 | `attachLabelTooltip(el, t(...))`                                  |
| `calendar-toolbar.js` toolbar buttons      | `.title = t(...)`                 | `attachLabelTooltip(el, t(...))`                                  |
| `feedback.js` feedback button              | `.title = t(...)`                 | `attachLabelTooltip(el, t(...))`                                  |
| `settings-page.js` docs-help button        | `.title = t(...)`                 | `attachLabelTooltip(el, t(...))`                                  |
| `time-entry-form.js` modal rows            | `.title = ...`                    | `attachLabelTooltip(el, ...)`                                     |
| `time-entry-form-view.js` star + rows      | `.title = ...`                    | `attachLabelTooltip(el, ...)`                                     |

**Out of scope**: document `<title>`, and any `title` used purely as non-tooltip data are left untouched.

## Error / edge behavior

- Null/empty `text` to `attachLabelTooltip` ⇒ no-op (no tooltip attached, no `aria-describedby`).
- Trigger removed from DOM while tooltip shown ⇒ tooltip removed on `eventWillUnmount` / `mouseleave`; no orphan nodes in `<body>`.
- Near viewport edge ⇒ position clamps so the tooltip stays on-screen (FR-008).
