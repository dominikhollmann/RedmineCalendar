// ── Planning-source ordering (Feature 054 / #274) ─────────────────
// Pure, DOM-light logic for the ordered set of planning-source columns.
// Reads/writes the STORAGE_KEY_PLANNING_SOURCE_ORDER localStorage key and
// exposes pure array transforms (move/moveUp/moveDown) used by the settings
// source list and by planning-view.js. No DOM access — unit-tested in
// tests/unit/source-order.test.js.

import { STORAGE_KEY_PLANNING_SOURCE_ORDER, DEFAULT_PLANNING_SOURCE_ORDER } from './config.js';

/** Known planning-source ids, in default order. Extensible. @type {string[]} */
export const KNOWN_SOURCES = [...DEFAULT_PLANNING_SOURCE_ORDER];

/**
 * Normalize an arbitrary id array to a valid source order:
 *  - drop unknown ids and duplicates (first occurrence wins)
 *  - append any KNOWN_SOURCES id missing from the input (in default order)
 * @param {unknown} input
 * @returns {string[]}
 */
export function normalizeOrder(input) {
  const seen = new Set();
  const out = [];
  if (Array.isArray(input)) {
    for (const id of input) {
      if (KNOWN_SOURCES.includes(id) && !seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
  }
  for (const id of KNOWN_SOURCES) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

/**
 * Read the stored order, normalized. Falls back to the default order when the
 * key is missing, invalid JSON, or localStorage is unavailable.
 * @returns {string[]}
 */
export function readOrder() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLANNING_SOURCE_ORDER);
    if (!raw) return [...KNOWN_SOURCES];
    return normalizeOrder(JSON.parse(raw));
  } catch {
    return [...KNOWN_SOURCES];
  }
}

/**
 * Persist a normalized order. Swallows storage errors (private browsing).
 * @param {string[]} order
 * @returns {string[]} the normalized order that was written
 */
export function writeOrder(order) {
  const normalized = normalizeOrder(order);
  try {
    localStorage.setItem(STORAGE_KEY_PLANNING_SOURCE_ORDER, JSON.stringify(normalized));
  } catch {
    /* private browsing / storage disabled — ignore */
  }
  return normalized;
}

/**
 * Pure move: returns a new array with the element at `from` moved to `to`.
 * Out-of-range indices return a shallow copy unchanged.
 * @param {string[]} order
 * @param {number} from
 * @param {number} to
 * @returns {string[]}
 */
export function move(order, from, to) {
  const arr = [...order];
  if (from < 0 || from >= arr.length || to < 0 || to >= arr.length || from === to) {
    return arr;
  }
  const [item] = arr.splice(from, 1);
  arr.splice(to, 0, item);
  return arr;
}

/**
 * @param {string[]} order
 * @param {number} index
 * @returns {string[]} new array; no-op at index 0
 */
export function moveUp(order, index) {
  return index <= 0 ? [...order] : move(order, index, index - 1);
}

/**
 * @param {string[]} order
 * @param {number} index
 * @returns {string[]} new array; no-op at last index
 */
export function moveDown(order, index) {
  return index >= order.length - 1 ? [...order] : move(order, index, index + 1);
}

/**
 * @param {string[]} order
 * @param {number} index
 * @returns {boolean}
 */
export function canMoveUp(order, index) {
  return index > 0 && index < order.length;
}

/**
 * @param {string[]} order
 * @param {number} index
 * @returns {boolean}
 */
export function canMoveDown(order, index) {
  return index >= 0 && index < order.length - 1;
}
