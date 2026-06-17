// @ts-nocheck — DOM-heavy utility; used by planning-view-column-base.js.

/**
 * @typedef {import('./types').PlanningEvent} PlanningEvent
 */

function _toMins(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Assign `col` and `numCols` to each event so overlapping events sit side-by-side.
 * Pure function — no DOM, no module state.
 * @param {PlanningEvent[]} planningEvents
 * @param {number} minMin  start of visible time range in minutes from midnight
 * @param {number} maxMin  end of visible time range in minutes from midnight
 * @returns {{ pe: PlanningEvent, startMin: number, endMin: number, col: number, numCols: number }[]}
 */
export function computeLayout(planningEvents, minMin, maxMin) {
  const items = planningEvents.map((pe) => ({
    pe,
    startMin: pe.proposal.isAllDay ? minMin : _toMins(pe.displayStartTime ?? pe.proposal.startTime),
    endMin: pe.proposal.isAllDay ? maxMin : _toMins(pe.displayEndTime ?? pe.proposal.endTime),
    col: 0,
    numCols: 1,
  }));

  items.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const colEnds = [];
  for (const item of items) {
    let col = colEnds.findIndex((end) => end <= item.startMin);
    if (col === -1) col = colEnds.length;
    colEnds[col] = item.endMin;
    item.col = col;
  }

  // Union-Find: merge all directly-overlapping events into the same component
  const parent = items.map((_, i) => i);
  const find = (i) => {
    while (parent[i] !== i) i = parent[i];
    return i;
  };
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (items[i].startMin < items[j].endMin && items[j].startMin < items[i].endMin) {
        const pi = find(i),
          pj = find(j);
        if (pi !== pj) parent[pi] = pj;
      }
    }
  }

  const compMax = {};
  items.forEach((item, i) => {
    const r = find(i);
    compMax[r] = Math.max(compMax[r] ?? 0, item.col);
  });
  items.forEach((item, i) => {
    item.numCols = compMax[find(i)] + 1;
  });

  return items;
}

/**
 * Set left/right CSS on a card element to position it within its column group.
 * @param {HTMLElement} card
 * @param {number} col
 * @param {number} numCols
 */
export function setCardPosition(card, col, numCols) {
  const INSET = 2;
  card.style.left = `calc(${(col / numCols) * 100}% + ${INSET}px)`;
  card.style.right = `calc(${((numCols - col - 1) / numCols) * 100}% + ${INSET}px)`;
}
