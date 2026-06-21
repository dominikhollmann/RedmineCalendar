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

  if (reasons.length === 1) {
    tooltip.textContent = reasons[0];
  } else {
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

  const toggle = (e) => {
    e.stopPropagation();
    tooltip.hidden = !tooltip.hidden;
  };
  badge.addEventListener('click', toggle);
  badge.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle(e);
    }
  });

  return { badge, tooltip };
}

/**
 * Inline variant of the warning badge for use next to a title (booking modal
 * rows + planning/Outlook event cards). The badge sits inline; its tooltip is
 * `position: fixed` and positioned relative to the badge on show, so it escapes
 * the overflow clipping of scrollable lists and small event cards. Returns the
 * badge + tooltip; the caller appends them (as adjacent siblings, so the
 * hover-reveal CSS keeps working).
 *
 * @param {string} tooltipId
 * @param {string} reason   single, already-translated reason string
 * @returns {{ badge: HTMLElement, tooltip: HTMLElement }}
 */
export function buildInlineWarningBadge(tooltipId, reason) {
  const { badge, tooltip } = buildWarningBadge(tooltipId, reason, [reason]);
  badge.classList.add('warning-badge--inline');
  tooltip.classList.add('anomaly-tooltip--fixed');

  // Fixed tooltips need viewport coordinates; recompute them whenever the
  // tooltip is about to appear (hover, focus, or click-toggle).
  const place = () => {
    const r = badge.getBoundingClientRect();
    tooltip.style.top = `${Math.round(r.bottom + 4)}px`;
    tooltip.style.left = `${Math.round(r.left)}px`;
  };
  badge.addEventListener('mouseenter', place);
  badge.addEventListener('focus', place);
  badge.addEventListener('click', place);

  return { badge, tooltip };
}

export function attachAnomalyBadge(eventEl, tag, t, entryId) {
  if (!eventEl || !tag || !tag.reasons?.length) return;

  // Remove any existing badge + tooltip first (idempotent for re-renders).
  eventEl.querySelectorAll('.fc-event__anomaly-badge, .anomaly-tooltip').forEach((n) => n.remove());

  const { badge, tooltip } = buildWarningBadge(
    `anomaly-tooltip-${entryId}`,
    t('anomaly.badge.aria'),
    tag.reasons,
    t
  );
  eventEl.appendChild(badge);
  eventEl.appendChild(tooltip);
}
