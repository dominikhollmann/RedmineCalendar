import { describe, it, expect, beforeEach } from 'vitest';
import {
  undoManager,
  UNDO_STACK_MAX,
  ACTION_ADD,
  ACTION_DELETE,
  ACTION_EDIT,
  ACTION_MOVE,
  ACTION_RESIZE,
  ACTION_PASTE,
  ACTION_BULK_DELETE,
  ACTION_BULK_MOVE,
} from '../../js/undo-manager.js';

beforeEach(() => {
  undoManager.clear();
});

// ── Constants ──────────────────────────────────────────────────────

describe('exported constants', () => {
  it('UNDO_STACK_MAX is 20', () => {
    expect(UNDO_STACK_MAX).toBe(20);
  });

  it('all action type constants are defined strings', () => {
    expect(ACTION_ADD).toBe('add');
    expect(ACTION_PASTE).toBe('paste');
    expect(ACTION_DELETE).toBe('delete');
    expect(ACTION_EDIT).toBe('edit');
    expect(ACTION_MOVE).toBe('move');
    expect(ACTION_RESIZE).toBe('resize');
    expect(ACTION_BULK_DELETE).toBe('bulk-delete');
    expect(ACTION_BULK_MOVE).toBe('bulk-move');
  });
});

// ── push() ─────────────────────────────────────────────────────────

describe('push()', () => {
  it('adds an action to the undo stack', () => {
    const action = { type: ACTION_ADD, entry: { id: 1 } };
    undoManager.push(action);
    expect(undoManager.canUndo()).toBe(true);
  });

  it('stores actions in LIFO order', () => {
    const a1 = { type: ACTION_ADD, entry: { id: 1 } };
    const a2 = { type: ACTION_EDIT, id: 2, before: {}, after: {} };
    undoManager.push(a1);
    undoManager.push(a2);
    const popped = undoManager.undo();
    expect(popped).toBe(a2);
  });

  it('clears the redo stack on push', () => {
    const a1 = { type: ACTION_DELETE, entry: { id: 1 } };
    undoManager.push(a1);
    undoManager.undo(); // moves a1 to redo
    expect(undoManager.canRedo()).toBe(true);

    undoManager.push({ type: ACTION_ADD, entry: { id: 2 } });
    expect(undoManager.canRedo()).toBe(false);
  });

  it('evicts the oldest entry when stack reaches UNDO_STACK_MAX', () => {
    const actions = [];
    for (let i = 0; i < UNDO_STACK_MAX; i++) {
      const a = { type: ACTION_ADD, entry: { id: i } };
      actions.push(a);
      undoManager.push(a);
    }

    // Stack is full — push one more
    const extra = { type: ACTION_EDIT, id: 999, before: {}, after: {} };
    undoManager.push(extra);

    // We should still be able to undo UNDO_STACK_MAX times, not more
    let count = 0;
    while (undoManager.canUndo()) {
      undoManager.undo();
      count++;
    }
    expect(count).toBe(UNDO_STACK_MAX);
  });

  it('does not grow beyond UNDO_STACK_MAX after repeated pushes', () => {
    for (let i = 0; i < UNDO_STACK_MAX + 5; i++) {
      undoManager.push({ type: ACTION_MOVE, id: i, entry: {}, before: {}, after: {} });
    }
    let count = 0;
    while (undoManager.canUndo()) {
      undoManager.undo();
      count++;
    }
    expect(count).toBe(UNDO_STACK_MAX);
  });

  it('the oldest entry is the one evicted (not the newest)', () => {
    const first = { type: ACTION_ADD, entry: { id: 0 } };
    undoManager.push(first);
    for (let i = 1; i < UNDO_STACK_MAX; i++) {
      undoManager.push({ type: ACTION_ADD, entry: { id: i } });
    }
    // Push one more — should evict `first`
    const last = { type: ACTION_EDIT, id: 99, before: {}, after: {} };
    undoManager.push(last);

    // Drain entire undo stack
    const drained = [];
    while (undoManager.canUndo()) {
      drained.push(undoManager.undo());
    }
    expect(drained).not.toContain(first);
    expect(drained).toContain(last);
  });
});

// ── undo() ─────────────────────────────────────────────────────────

describe('undo()', () => {
  it('returns null when the undo stack is empty', () => {
    expect(undoManager.undo()).toBeNull();
  });

  it('returns the last pushed action', () => {
    const action = { type: ACTION_DELETE, entry: { id: 5 } };
    undoManager.push(action);
    const result = undoManager.undo();
    expect(result).toBe(action);
  });

  it('moves the action to the redo stack', () => {
    undoManager.push({ type: ACTION_ADD, entry: { id: 1 } });
    expect(undoManager.canRedo()).toBe(false);
    undoManager.undo();
    expect(undoManager.canRedo()).toBe(true);
  });

  it('empties the undo stack after all entries are undone', () => {
    undoManager.push({ type: ACTION_ADD, entry: { id: 1 } });
    undoManager.push({ type: ACTION_EDIT, id: 2, before: {}, after: {} });
    undoManager.undo();
    undoManager.undo();
    expect(undoManager.canUndo()).toBe(false);
    expect(undoManager.undo()).toBeNull();
  });
});

// ── redo() ─────────────────────────────────────────────────────────

describe('redo()', () => {
  it('returns null when the redo stack is empty', () => {
    expect(undoManager.redo()).toBeNull();
  });

  it('returns the last undone action', () => {
    const action = { type: ACTION_EDIT, id: 3, before: {}, after: {} };
    undoManager.push(action);
    undoManager.undo();
    const result = undoManager.redo();
    expect(result).toBe(action);
  });

  it('moves the action back to the undo stack', () => {
    undoManager.push({ type: ACTION_ADD, entry: { id: 1 } });
    undoManager.undo();
    expect(undoManager.canUndo()).toBe(false);
    undoManager.redo();
    expect(undoManager.canUndo()).toBe(true);
  });

  it('redo does not apply the UNDO_STACK_MAX cap (re-adds an existing entry)', () => {
    for (let i = 0; i < UNDO_STACK_MAX; i++) {
      undoManager.push({ type: ACTION_ADD, entry: { id: i } });
    }
    undoManager.undo(); // undo stack = 19, redo stack = 1
    undoManager.redo(); // undo stack = 20 — should NOT evict
    let count = 0;
    while (undoManager.canUndo()) {
      undoManager.undo();
      count++;
    }
    expect(count).toBe(UNDO_STACK_MAX);
  });

  it('redo stack cleared after push — Ctrl+Shift+Z then new action is no-op', () => {
    undoManager.push({ type: ACTION_EDIT, id: 1, before: {}, after: {} });
    undoManager.undo();
    expect(undoManager.canRedo()).toBe(true);
    undoManager.push({ type: ACTION_DELETE, entry: { id: 2 } }); // new action
    expect(undoManager.canRedo()).toBe(false);
    expect(undoManager.redo()).toBeNull();
  });
});

// ── canUndo() / canRedo() ──────────────────────────────────────────

describe('canUndo() / canRedo()', () => {
  it('both false on an empty manager', () => {
    expect(undoManager.canUndo()).toBe(false);
    expect(undoManager.canRedo()).toBe(false);
  });

  it('canUndo true after push, false after draining', () => {
    undoManager.push({ type: ACTION_MOVE, id: 1, entry: {}, before: {}, after: {} });
    expect(undoManager.canUndo()).toBe(true);
    undoManager.undo();
    expect(undoManager.canUndo()).toBe(false);
  });

  it('canRedo true after undo, false after redo', () => {
    undoManager.push({ type: ACTION_BULK_DELETE, entries: [] });
    undoManager.undo();
    expect(undoManager.canRedo()).toBe(true);
    undoManager.redo();
    expect(undoManager.canRedo()).toBe(false);
  });
});

// ── clear() ────────────────────────────────────────────────────────

describe('clear()', () => {
  it('empties both stacks', () => {
    undoManager.push({ type: ACTION_ADD, entry: { id: 1 } });
    undoManager.push({ type: ACTION_EDIT, id: 2, before: {}, after: {} });
    undoManager.undo();
    undoManager.clear();
    expect(undoManager.canUndo()).toBe(false);
    expect(undoManager.canRedo()).toBe(false);
    expect(undoManager.undo()).toBeNull();
    expect(undoManager.redo()).toBeNull();
  });
});
