/**
 * Pure-logic undo/redo stack manager.
 * No DOM, no Redmine API, no imports from other project modules.
 * @module undo-manager
 */

// ── Stack depth ────────────────────────────────────────────────────
/** @type {number} Maximum number of entries in the undo stack. */
export const UNDO_STACK_MAX = 20;

// ── Action type constants ──────────────────────────────────────────
export const ACTION_ADD = 'add';
export const ACTION_PASTE = 'paste';
export const ACTION_DELETE = 'delete';
export const ACTION_EDIT = 'edit';
export const ACTION_MOVE = 'move';
export const ACTION_RESIZE = 'resize';
export const ACTION_BULK_DELETE = 'bulk-delete';
export const ACTION_BULK_ADD = 'bulk-add';
export const ACTION_BULK_MOVE = 'bulk-move'; // reserved — no call site yet

// ── Internal state ─────────────────────────────────────────────────
/** @type {Array} */
let _undoStack = [];
/** @type {Array} */
let _redoStack = [];

// ── Singleton manager ──────────────────────────────────────────────

/**
 * Module-level singleton. One stack per tab, shared across all views.
 */
export const undoManager = {
  /**
   * Push an action onto the undo stack.
   * Clears the redo stack. Evicts the oldest entry when the cap is reached.
   * @param {object} action
   */
  push(action) {
    _redoStack = [];
    if (_undoStack.length === UNDO_STACK_MAX) {
      _undoStack.shift();
    }
    _undoStack.push(action);
  },

  /**
   * Pop the most recent action from the undo stack.
   * Pushes it to the redo stack and returns it, or returns null if empty.
   * @returns {object|null}
   */
  undo() {
    if (_undoStack.length === 0) return null;
    const action = _undoStack.pop();
    _redoStack.push(action);
    return action;
  },

  /**
   * Pop the most recent action from the redo stack.
   * Pushes it back to the undo stack and returns it, or returns null if empty.
   * @returns {object|null}
   */
  redo() {
    if (_redoStack.length === 0) return null;
    const action = _redoStack.pop();
    _undoStack.push(action);
    return action;
  },

  /** @returns {boolean} True when the undo stack is non-empty. */
  canUndo() {
    return _undoStack.length > 0;
  },

  /** @returns {boolean} True when the redo stack is non-empty. */
  canRedo() {
    return _redoStack.length > 0;
  },

  /** Empty both stacks. Used in tests. */
  clear() {
    _undoStack = [];
    _redoStack = [];
  },

  /** Mutate the top-of-undo-stack action in-place. No-op when empty. */
  replaceTop(mutation) {
    if (_undoStack.length === 0) return;
    Object.assign(_undoStack[_undoStack.length - 1], mutation);
  },
};
