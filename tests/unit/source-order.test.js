import { describe, it, expect, beforeEach } from 'vitest';
import {
  KNOWN_SOURCES,
  normalizeOrder,
  readOrder,
  writeOrder,
  move,
  moveUp,
  moveDown,
  canMoveUp,
  canMoveDown,
} from '../../js/source-order.js';
import { STORAGE_KEY_PLANNING_SOURCE_ORDER } from '../../js/config.js';

describe('source-order — normalizeOrder', () => {
  it('drops unknown ids and de-dupes (first wins)', () => {
    expect(normalizeOrder(['teams', 'bogus', 'teams', 'outlook'])).toEqual(['teams', 'outlook']);
  });

  it('appends known ids missing from the input in default order', () => {
    expect(normalizeOrder(['teams'])).toEqual(['teams', 'outlook']);
  });

  it('returns default order for non-array / empty input', () => {
    expect(normalizeOrder(undefined)).toEqual([...KNOWN_SOURCES]);
    expect(normalizeOrder(null)).toEqual([...KNOWN_SOURCES]);
    expect(normalizeOrder('outlook')).toEqual([...KNOWN_SOURCES]);
  });
});

describe('source-order — read/write', () => {
  beforeEach(() => {
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    };
  });

  it('returns default order when key absent', () => {
    expect(readOrder()).toEqual(['outlook', 'teams']);
  });

  it('round-trips a normalized order', () => {
    writeOrder(['teams', 'outlook']);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY_PLANNING_SOURCE_ORDER))).toEqual([
      'teams',
      'outlook',
    ]);
    expect(readOrder()).toEqual(['teams', 'outlook']);
  });

  it('normalizes invalid stored JSON to default', () => {
    localStorage.setItem(STORAGE_KEY_PLANNING_SOURCE_ORDER, 'not json');
    expect(readOrder()).toEqual(['outlook', 'teams']);
  });

  it('normalizes a partial stored array on read', () => {
    localStorage.setItem(STORAGE_KEY_PLANNING_SOURCE_ORDER, JSON.stringify(['teams']));
    expect(readOrder()).toEqual(['teams', 'outlook']);
  });
});

describe('source-order — pure transforms', () => {
  it('move returns a new array with the element relocated', () => {
    const src = ['a', 'b', 'c'];
    expect(move(src, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(src).toEqual(['a', 'b', 'c']); // unchanged
  });

  it('move is a no-op for out-of-range / equal indices', () => {
    expect(move(['a', 'b'], 0, 0)).toEqual(['a', 'b']);
    expect(move(['a', 'b'], -1, 1)).toEqual(['a', 'b']);
    expect(move(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
  });

  it('moveUp / moveDown respect ends', () => {
    expect(moveUp(['a', 'b', 'c'], 0)).toEqual(['a', 'b', 'c']);
    expect(moveUp(['a', 'b', 'c'], 2)).toEqual(['a', 'c', 'b']);
    expect(moveDown(['a', 'b', 'c'], 2)).toEqual(['a', 'b', 'c']);
    expect(moveDown(['a', 'b', 'c'], 0)).toEqual(['b', 'a', 'c']);
  });

  it('canMoveUp / canMoveDown', () => {
    expect(canMoveUp(['a', 'b'], 0)).toBe(false);
    expect(canMoveUp(['a', 'b'], 1)).toBe(true);
    expect(canMoveDown(['a', 'b'], 1)).toBe(false);
    expect(canMoveDown(['a', 'b'], 0)).toBe(true);
  });
});
