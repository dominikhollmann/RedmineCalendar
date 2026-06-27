// ── DOM glue for anomaly badges ───────────────────────────────────
// Attaches a small badge + tooltip to a FullCalendar event element when
// the entry id is present in the precomputed anomaly Map. Idempotent:
// repeated calls for the same element are no-ops (FC re-renders the event
// frequently — eventDidMount may fire multiple times).

/**
 * @typedef {Object} AnomalyTag
 * @property {string[]} ruleIds
 * @property {string[]} reasons
 */

/**
 * Append a badge + tooltip to the given FC event element. Safe to call
 * repeatedly: if a badge already exists on the element, it is replaced
 * (covers the edit-recompute case where the reason text may have changed).
 *
 * @param {HTMLElement} eventEl
 * @param {AnomalyTag} tag
 * @param {(key: string, vars?: Record<string, any>) => string} t
 * @param {string|number} entryId
 */
// Inline SVG centers reliably across fonts; the ⚠ glyph has a metric offset
// that prevents flex-centering from producing a visually centered result.
const _BADGE_SVG =
  '<svg viewBox="0 0 14 14" width="9" height="9" aria-hidden="true" focusable="false">' +
  '<path d="M7 1.5 L12.5 11.5 L1.5 11.5 Z" fill="#fff" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>' +
  '<rect x="6.3" y="5.2" width="1.4" height="3.6" rx="0.4" fill="currentColor"/>' +
  '<rect x="6.3" y="9.4" width="1.4" height="1.4" rx="0.4" fill="currentColor"/>' +
  '</svg>';

/**
 * Create the shared warning badge element (`.fc-event__anomaly-badge`).
 * Caller is responsible for creating and appending the linked tooltip.
 * @param {string} tooltipId
 * @param {string} ariaLabel
 * @returns {HTMLElement}
 */
export function createBadgeElement(tooltipId, ariaLabel) {
  const badge = document.createElement('span');
  badge.className = 'fc-event__anomaly-badge';
  badge.innerHTML = _BADGE_SVG;
  badge.setAttribute('role', 'button');
  badge.setAttribute('tabindex', '0');
  badge.setAttribute('aria-describedby', tooltipId);
  badge.setAttribute('aria-label', ariaLabel);
  return badge;
}

/**
 * Build the shared warning badge + its linked tooltip (the single source of
 * truth for the closed-ticket / anomaly indicator used on calendar events,
 * planning columns, and the booking modal). The badge toggles the tooltip on
 * click/Enter/Space; CSS also reveals it on hover/focus. The caller decides
 * where to place the two returned elements.
 *
 * @param {string} tooltipId
 * @param {string} ariaLabel
 * @param {string[]} reasons   one or more already-translated reason strings
 * @param {(key: string, vars?: Record<string, any>) => string} [t]  required only for the multi-reason header
 * @returns {{ badge: HTMLElement, tooltip: HTMLElement }}
 */
export function buildWarningBadge(tooltipId, ariaLabel, reasons, t) {
  const badge = createBadgeElement(tooltipId, ariaLabel);

  const tooltip = document.createElement('div');
  tooltip.className = 'anomaly-tooltip';
  tooltip.id = tooltipId;
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  _fillReasonTooltip(tooltip, reasons, t);

  const toggle = (e) => {
    e.stopPropagation();
    tooltip.hidden = !tooltip.hidden;
  };
  _wireBadgeToggle(badge, toggle);

  return { badge, tooltip };
}

// Fill a tooltip element with one or more already-translated reason strings:
// a single reason is plain text; multiple reasons get a "N reasons" header + a
// bulleted list. Content is set via textContent, never parsed as HTML.
function _fillReasonTooltip(tooltip, reasons, t) {
  if (reasons.length === 1) {
    tooltip.textContent = reasons[0];
    return;
  }
  const header = document.createElement('div');
  header.className = 'anomaly-tooltip__header';
  header.textContent = t ? t('anomaly.multipleReasons', { count: reasons.length }) : '';
  tooltip.appendChild(header);
  const list = document.createElement('ul');
  for (const reason of reasons) {
    const li = document.createElement('li');
    li.textContent = reason;
    list.appendChild(li);
  }
  tooltip.appendChild(list);
}

// Wire a badge's click + Enter/Space keyboard activation to a toggle handler.
function _wireBadgeToggle(badge, toggle) {
  badge.addEventListener('click', toggle);
  badge.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle(e);
    }
  });
}

// At most one custom tooltip is ever visible at once. When a tooltip shows it
// dismisses the previously-shown one, so a small tooltip nested inside a larger
// trigger (e.g. the closed-ticket badge inside a modal row / planning card that
// also carries a full-text tooltip) never stacks a second overlapping tooltip.
/** @type {(() => void) | null} */
let _activeHide = null;

/**
 * Attach a portaled, dark "anomaly-tooltip"-styled tooltip to any trigger
 * element. Shown on hover/focus and removed on leave/blur. The tooltip is
 * `position: fixed` and **portaled to <body>** while shown, so it escapes both
 * overflow clipping (scrollable lists/cards) AND the trigger's stacking context
 * (a sibling element would otherwise paint over it). Shared by the inline
 * warning badge and the settings hint tooltips. Returns the tooltip plus its
 * show/hide controls so callers can wire extra triggers (e.g. a click toggle).
 *
 * `text` may be a string (single line — existing behaviour) or an array of
 * strings (one rendered line per entry + the `--multiline` class). It may also
 * be a **thunk** returning either — recomputed on every show, so callers whose
 * source data mutates in place after attach (e.g. a planning event awaiting
 * async ticket enrichment) always render the current text. Content is always set
 * via `textContent`, so untrusted issue/comment text is never parsed as HTML
 * (Constitution V).
 *
 * @param {HTMLElement} trigger
 * @param {string | string[] | (() => string | string[])} text  already-translated text / lines, or a thunk returning them
 * @param {string} tooltipId
 * @returns {{ tooltip: HTMLElement, show: () => void, hide: () => void }}
 */
export function attachFixedTooltip(trigger, text, tooltipId) {
  const tooltip = document.createElement('div');
  tooltip.className = 'anomaly-tooltip anomaly-tooltip--fixed';
  tooltip.id = tooltipId;
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;

  const renderContent = (value) => {
    if (Array.isArray(value)) {
      tooltip.classList.add('anomaly-tooltip--multiline');
      tooltip.textContent = '';
      for (const lineText of value) {
        const line = document.createElement('div');
        line.className = 'anomaly-tooltip__line';
        line.textContent = lineText;
        tooltip.appendChild(line);
      }
    } else {
      tooltip.textContent = value;
    }
  };

  // Static content is rendered once now; a thunk is (re)rendered on each show.
  if (typeof text !== 'function') renderContent(text);
  trigger.setAttribute('aria-describedby', tooltipId);

  const { show, hide } = _portalTooltip(trigger, tooltip, () => {
    if (typeof text === 'function') renderContent(text());
  });
  trigger.addEventListener('mouseenter', show);
  trigger.addEventListener('mouseleave', hide);
  // focusin/focusout bubble, so this also fires when a focusable child (e.g. a
  // checkbox inside a <label> trigger) receives focus.
  trigger.addEventListener('focusin', show);
  trigger.addEventListener('focusout', hide);
  return { tooltip, show, hide };
}

/**
 * Shared show/hide controls for a portaled tooltip: dismiss any other tooltip
 * (single active), (re)render via `beforeShow`, append to <body>, position below
 * the trigger clamped within the viewport (flip above near the bottom edge), and
 * remove on hide. Portaling to <body> escapes both overflow clipping AND the
 * trigger's stacking context, so neighbouring elements never paint over it.
 *
 * @param {HTMLElement} trigger
 * @param {HTMLElement} tooltip   already-built, `position: fixed` tooltip element
 * @param {() => void} [beforeShow]  optional content refresh run on each show
 * @returns {{ show: () => void, hide: () => void }}
 */
function _portalTooltip(trigger, tooltip, beforeShow) {
  const show = () => {
    // Dismiss any other tooltip first so only one is ever visible at a time.
    if (_activeHide && _activeHide !== hide) _activeHide();
    if (beforeShow) beforeShow();
    const r = trigger.getBoundingClientRect();
    // Insert + unhide first so offsetWidth/Height reflect the rendered content,
    // then clamp within the viewport: a trigger near the right/bottom edge (e.g.
    // the top-right settings gear) would otherwise push the tooltip off-screen.
    tooltip.hidden = false;
    if (tooltip.parentNode !== document.body) document.body.appendChild(tooltip);
    const margin = 8;
    let left = r.left;
    if (left + tooltip.offsetWidth + margin > window.innerWidth) {
      left = window.innerWidth - tooltip.offsetWidth - margin;
    }
    if (left < margin) left = margin;
    // Default below the trigger; flip above if it would overflow the bottom edge
    // and there is room above.
    let top = r.bottom + 4;
    if (
      top + tooltip.offsetHeight + margin > window.innerHeight &&
      r.top - tooltip.offsetHeight - 4 >= margin
    ) {
      top = r.top - tooltip.offsetHeight - 4;
    }
    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
    _activeHide = hide;
  };
  const hide = () => {
    tooltip.hidden = true;
    tooltip.remove();
    if (_activeHide === hide) _activeHide = null;
  };
  return { show, hide };
}

// Monotonic counter for auto-generated label-tooltip ids (callers that don't
// already have a stable element id can omit tooltipId).
let _labelTooltipSeq = 0;

// Tracks the tooltip controls already wired to a trigger so repeated
// attachLabelTooltip calls on the same (persistent) element refresh the text
// instead of stacking duplicate listeners + tooltip nodes.
/** @type {WeakMap<HTMLElement, { tooltip: HTMLElement, show: () => void, hide: () => void }>} */
const _labelTooltips = new WeakMap();

/**
 * Replace a native `title` tooltip on a button/control with the unified custom
 * tooltip style. Thin convenience over {@link attachFixedTooltip} for the
 * single-line label case: removes the native `title` (so AT + the browser don't
 * announce/show a redundant second tooltip), generates a tooltipId when omitted,
 * and shows on hover AND keyboard focus. No-op on empty text.
 *
 * @param {HTMLElement} trigger
 * @param {string} text   already-translated label
 * @param {string} [tooltipId]
 * @returns {{ tooltip: HTMLElement, show: () => void, hide: () => void } | undefined}
 */
export function attachLabelTooltip(trigger, text, tooltipId) {
  if (!trigger || !text) return undefined;
  // Drop the native title first so there is never a native + custom double tooltip.
  trigger.removeAttribute('title');
  // Idempotent: dynamic rows (e.g. the modal ticket/project row) re-run on every
  // selection. Refresh the existing tooltip's text instead of stacking a second
  // set of listeners + tooltip nodes on the same element.
  const existing = _labelTooltips.get(trigger);
  if (existing) {
    existing.tooltip.textContent = text;
    return existing;
  }
  const id = tooltipId ?? `label-tooltip-${++_labelTooltipSeq}`;
  const controls = attachFixedTooltip(trigger, text, id);
  // Dismiss on press: a control that opens a dialog/panel can occlude itself
  // without moving the pointer, so mouseleave never fires; hide eagerly.
  trigger.addEventListener('mousedown', controls.hide);
  _labelTooltips.set(trigger, controls);
  return controls;
}

/**
 * Inline variant of the warning badge for use next to a title (booking modal
 * rows + planning/Outlook event cards). The badge sits inline; its tooltip is
 * portaled to <body> (see attachFixedTooltip) and also toggles on click /
 * keyboard for touch + a11y. Only the badge is placed by the caller.
 *
 * @param {string} tooltipId
 * @param {string} reason   single, already-translated reason string
 * @returns {{ badge: HTMLElement, tooltip: HTMLElement }}
 */
export function buildInlineWarningBadge(tooltipId, reason) {
  const badge = createBadgeElement(tooltipId, reason);
  badge.classList.add('warning-badge--inline');
  const { tooltip, show, hide } = attachFixedTooltip(badge, reason, tooltipId);

  const toggle = (e) => {
    e.stopPropagation();
    if (tooltip.hidden) show();
    else hide();
  };
  _wireBadgeToggle(badge, toggle);

  return { badge, tooltip };
}

export function attachAnomalyBadge(eventEl, tag, t, entryId) {
  if (!eventEl || !tag || !tag.reasons?.length) return;

  // Remove any existing badge first (idempotent for re-renders).
  eventEl.querySelectorAll('.fc-event__anomaly-badge, .anomaly-tooltip').forEach((n) => n.remove());

  const tooltipId = `anomaly-tooltip-${entryId}`;
  // The tooltip is portaled to <body> on show, so a prior one may outlive its
  // event element on re-render — drop it by id rather than via eventEl.
  document.getElementById(tooltipId)?.remove();
  const badge = createBadgeElement(tooltipId, t('anomaly.badge.aria'));

  // Portaled (`--fixed`) tooltip rather than an in-event absolute one: the event
  // sits in its own stacking context, so a neighbouring overlapping event would
  // otherwise paint over an in-event tooltip. Portaling to <body> escapes that
  // and routes the warning through the same single-active registry as every other
  // tooltip — so hovering/focusing the badge dismisses the event's full-text
  // tooltip automatically (no double tooltip), feature 053.
  const tooltip = document.createElement('div');
  tooltip.className = 'anomaly-tooltip anomaly-tooltip--fixed';
  tooltip.id = tooltipId;
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;
  _fillReasonTooltip(tooltip, tag.reasons, t);

  const { show, hide } = _portalTooltip(badge, tooltip);
  badge.addEventListener('mouseenter', show);
  badge.addEventListener('mouseleave', hide);
  // Stop focus from bubbling to the event element, whose own focusin would
  // otherwise re-show the full-text tooltip on top of the warning.
  badge.addEventListener('focusin', (e) => {
    e.stopPropagation();
    show();
  });
  badge.addEventListener('focusout', hide);
  // Click / Enter / Space reveal the warning (touch + keyboard activation). Show
  // rather than toggle: pointer activation fires mouseenter (→ show) before the
  // click — including emulated touch taps — so a toggle would immediately hide
  // what the tap just revealed. Dismissal is via mouseleave / blur (tapping
  // elsewhere on touch fires mouseleave) and the single-active registry.
  _wireBadgeToggle(badge, (e) => {
    e.stopPropagation();
    show();
  });

  eventEl.appendChild(badge);
  return { badge, tooltip, show, hide };
}
