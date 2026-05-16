// @ts-nocheck — DOM glue (excluded from unit coverage; Playwright covers it).
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
export function attachAnomalyBadge(eventEl, tag, t, entryId) {
  if (!eventEl || !tag || !tag.reasons?.length) return;

  // Remove any existing badge + tooltip first (idempotent for re-renders).
  eventEl.querySelectorAll('.fc-event__anomaly-badge, .anomaly-tooltip').forEach((n) => n.remove());

  const tooltipId = `anomaly-tooltip-${entryId}`;
  const badge = document.createElement('span');
  badge.className = 'fc-event__anomaly-badge';
  // Inline SVG centers reliably across fonts; the ⚠ glyph has a metric offset
  // that prevents flex-centering from producing a visually centered result.
  badge.innerHTML =
    '<svg viewBox="0 0 14 14" width="9" height="9" aria-hidden="true" focusable="false">' +
    '<path d="M7 1.5 L12.5 11.5 L1.5 11.5 Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<rect x="6.3" y="5.2" width="1.4" height="3.6" rx="0.4" fill="currentColor"/>' +
    '<rect x="6.3" y="9.4" width="1.4" height="1.4" rx="0.4" fill="currentColor"/>' +
    '</svg>';
  badge.setAttribute('role', 'button');
  badge.setAttribute('tabindex', '0');
  badge.setAttribute('aria-describedby', tooltipId);
  badge.setAttribute('aria-label', t('anomaly.badge.aria'));

  const tooltip = document.createElement('div');
  tooltip.className = 'anomaly-tooltip';
  tooltip.id = tooltipId;
  tooltip.setAttribute('role', 'tooltip');
  tooltip.hidden = true;

  if (tag.reasons.length === 1) {
    tooltip.textContent = tag.reasons[0];
  } else {
    const header = document.createElement('div');
    header.className = 'anomaly-tooltip__header';
    header.textContent = t('anomaly.multipleReasons', { count: tag.reasons.length });
    tooltip.appendChild(header);
    const list = document.createElement('ul');
    for (const reason of tag.reasons) {
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

  eventEl.appendChild(badge);
  eventEl.appendChild(tooltip);
}
