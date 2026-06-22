// @ts-nocheck — DOM-heavy glue. Shared readonly-column render lifecycle used by
// every planning-view source column (Outlook, Teams). Extracted from the
// duplicated render/rerender bodies in planning-view-outlook.js +
// planning-view-teams.js (feature 048 — clones #3/#4 plus the byte-identical
// rerender*Column functions that sat below jscpd's detection floor).

/** @typedef {import('./types.d.ts').PlanningEvent} PlanningEvent */
/** @typedef {import('./types.d.ts').TimeEntry} TimeEntry */

import { buildPlanningEvents, mountReadonlyFcColumn } from './planning-view-column-base.js';

/**
 * Run the shared readonly-column render lifecycle: tear down any live FC
 * instance, reset the container + selection pool, run the availability guard,
 * fetch + build the column's items, then mount a fresh FC instance.
 *
 * The two source-specific concerns are injected:
 *  - `availabilityGuard` decides whether the column may render (and renders its
 *    own "disabled / sign-in / not-connected" prompt when not);
 *  - `fetchAndBuildItems` fetches + adapts source data into buildPlanningEvents
 *    input, owning its own spinner/error handling; returning `null` short-circuits.
 *
 * @param {object} cfg
 * @param {HTMLElement} cfg.container
 * @param {string} cfg.date  YYYY-MM-DD
 * @param {TimeEntry[]} cfg.bookings
 * @param {object} cfg.col  per-column state from createColumnState()
 * @param {{ current: object|null }} cfg.fcRef  box holding the live FC instance
 * @param {(container: HTMLElement, date: string, bookings: TimeEntry[]) => boolean|Promise<boolean>} cfg.availabilityGuard
 * @param {() => Promise<Array<object>|null>} cfg.fetchAndBuildItems
 * @returns {Promise<PlanningEvent[]>}  rendered events ([] on guard/fetch short-circuit)
 */
export async function renderPlanningColumn({
  container,
  date,
  bookings,
  col,
  fcRef,
  availabilityGuard,
  fetchAndBuildItems,
}) {
  if (fcRef.current) {
    fcRef.current.destroy();
    fcRef.current = null;
  }
  container.innerHTML = '';
  col.setRenderedPlanningEvents([]);
  col.clearSelection();

  const ok = await availabilityGuard(container, date, bookings);
  if (!ok) return [];

  const items = await fetchAndBuildItems();
  if (!items) return [];

  const planningEvents = buildPlanningEvents(items, bookings);
  col.setRenderedPlanningEvents(planningEvents);
  fcRef.current = mountReadonlyFcColumn(container, date, col, planningEvents);
  return planningEvents;
}

/**
 * Re-render an already-mounted column in place (after a slot-height or booking
 * change). No-op when no live FC instance exists. Replaces the byte-identical
 * `rerenderOutlookColumn` / `rerenderTeamsColumn` bodies.
 * @param {object} col
 * @param {{ current: object|null }} fcRef
 * @param {PlanningEvent[]} planningEvents
 */
export function rerenderPlanningColumn(col, fcRef, planningEvents) {
  if (!fcRef.current) return;
  col.setRenderedPlanningEvents(planningEvents);
  col.updateFcEventsInPlace(planningEvents);
}
