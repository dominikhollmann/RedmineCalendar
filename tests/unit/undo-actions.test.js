/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.hoisted ensures _undoManagerMock is initialised before static imports run,
// so the vi.mock factory below can reference it directly (not via indirection).
const _undoManagerMock = vi.hoisted(() => ({
  undo: vi.fn(() => null),
  redo: vi.fn(() => null),
  push: vi.fn(),
  replaceTop: vi.fn(),
  canUndo: vi.fn(() => false),
  canRedo: vi.fn(() => false),
}));

vi.mock('../../js/undo-manager.js', () => ({
  undoManager: _undoManagerMock,
  ACTION_ADD: 'add',
  ACTION_PASTE: 'paste',
  ACTION_DELETE: 'delete',
  ACTION_EDIT: 'edit',
  ACTION_MOVE: 'move',
  ACTION_RESIZE: 'resize',
  ACTION_BULK_DELETE: 'bulk_delete',
  ACTION_BULK_ADD: 'bulk-add',
}));

const _createTimeEntry = vi.fn();
const _updateTimeEntry = vi.fn();
const _deleteTimeEntry = vi.fn();

vi.mock('../../js/redmine-api.js', () => ({
  createTimeEntry: (...a) => _createTimeEntry(...a),
  updateTimeEntry: (...a) => _updateTimeEntry(...a),
  deleteTimeEntry: (...a) => _deleteTimeEntry(...a),
}));

const _showToast = vi.fn();
vi.mock('../../js/notify.js', () => ({ showToast: (...a) => _showToast(...a) }));
vi.mock('../../js/i18n.js', () => ({ t: vi.fn((key) => key) }));

import { isUndoBlocked, handleKeydown } from '../../js/undo-actions.js';

// ── helpers ────────────────────────────────────────────────────────

function entry(overrides = {}) {
  return {
    id: 101,
    hours: 2.0,
    spentOn: '2026-06-18',
    startTime: '09:00',
    endTime: '11:00',
    activityId: 9,
    issueId: 42,
    comment: '',
    ...overrides,
  };
}

function ctrlZ() {
  return new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true });
}

function ctrlShiftZ() {
  return new KeyboardEvent('keydown', {
    key: 'z',
    ctrlKey: true,
    shiftKey: true,
    bubbles: true,
    cancelable: true,
  });
}

function ctrlY() {
  return new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true, cancelable: true });
}

// ── isUndoBlocked ─────────────────────────────────────────────────

describe('isUndoBlocked', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns false with no blocking element', () => {
    expect(isUndoBlocked()).toBe(false);
  });

  it('returns true when an INPUT has focus', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    expect(isUndoBlocked()).toBe(true);
  });

  it('returns true when a TEXTAREA has focus', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    ta.focus();
    expect(isUndoBlocked()).toBe(true);
  });

  it('returns true when a contentEditable element has focus', () => {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    div.tabIndex = 0; // required for jsdom to honour .focus()
    document.body.appendChild(div);
    div.focus();
    // jsdom does not implement isContentEditable — stub it on the element.
    Object.defineProperty(div, 'isContentEditable', { get: () => true, configurable: true });
    expect(isUndoBlocked()).toBe(true);
  });

  it('returns true when #lean-time-modal is present and not .hidden', () => {
    const modal = document.createElement('div');
    modal.id = 'lean-time-modal';
    document.body.appendChild(modal);
    expect(isUndoBlocked()).toBe(true);
  });

  it('returns false when #lean-time-modal exists but has class .hidden', () => {
    const modal = document.createElement('div');
    modal.id = 'lean-time-modal';
    modal.classList.add('hidden');
    document.body.appendChild(modal);
    expect(isUndoBlocked()).toBe(false);
  });

  it('returns true when #chatbot-panel has class chatbot-panel--open', () => {
    const panel = document.createElement('div');
    panel.id = 'chatbot-panel';
    panel.classList.add('chatbot-panel--open');
    document.body.appendChild(panel);
    expect(isUndoBlocked()).toBe(true);
  });

  it('returns false when #chatbot-panel exists but is not open', () => {
    const panel = document.createElement('div');
    panel.id = 'chatbot-panel';
    document.body.appendChild(panel);
    expect(isUndoBlocked()).toBe(false);
  });
});

// ── handleKeydown — key routing ───────────────────────────────────

describe('handleKeydown — key routing', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    _undoManagerMock.undo.mockReset().mockReturnValue(null);
    _undoManagerMock.redo.mockReset().mockReturnValue(null);
    _showToast.mockReset();
  });

  it('ignores non-Ctrl keys', () => {
    handleKeydown(new KeyboardEvent('keydown', { key: 'z', ctrlKey: false }));
    expect(_undoManagerMock.undo).not.toHaveBeenCalled();
    expect(_undoManagerMock.redo).not.toHaveBeenCalled();
  });

  it('ignores Ctrl+A (unrelated key)', () => {
    handleKeydown(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true }));
    expect(_undoManagerMock.undo).not.toHaveBeenCalled();
  });

  it('Ctrl+Z calls undoManager.undo()', () => {
    handleKeydown(ctrlZ());
    expect(_undoManagerMock.undo).toHaveBeenCalledTimes(1);
    expect(_undoManagerMock.redo).not.toHaveBeenCalled();
  });

  it('Ctrl+Shift+Z calls undoManager.redo()', () => {
    handleKeydown(ctrlShiftZ());
    expect(_undoManagerMock.redo).toHaveBeenCalledTimes(1);
    expect(_undoManagerMock.undo).not.toHaveBeenCalled();
  });

  it('Ctrl+Y calls undoManager.redo()', () => {
    handleKeydown(ctrlY());
    expect(_undoManagerMock.redo).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+Z does nothing when a text input is focused', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    handleKeydown(ctrlZ());
    expect(_undoManagerMock.undo).not.toHaveBeenCalled();
  });

  it('Ctrl+Z does nothing when modal is open', () => {
    const modal = document.createElement('div');
    modal.id = 'lean-time-modal';
    document.body.appendChild(modal);
    handleKeydown(ctrlZ());
    expect(_undoManagerMock.undo).not.toHaveBeenCalled();
  });
});

// ── handleKeydown — action dispatch ──────────────────────────────
// Each test pushes a mock action onto the undo stack via undoManager.undo(),
// then fires Ctrl+Z and verifies the correct API call is made.

describe('handleKeydown — DELETE action dispatch', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    _undoManagerMock.undo.mockReset();
    _undoManagerMock.redo.mockReset();
    _createTimeEntry.mockReset();
    _showToast.mockReset();
    _createTimeEntry.mockResolvedValue({ id: 999, ...entry() });
  });

  it('calls createTimeEntry to restore the deleted entry', async () => {
    _undoManagerMock.undo.mockReturnValueOnce({ type: 'delete', entry: entry() });
    handleKeydown(ctrlZ());
    await vi.waitFor(() => expect(_createTimeEntry).toHaveBeenCalledTimes(1));
  });

  it('shows undo.delete_restored toast on success', async () => {
    _undoManagerMock.undo.mockReturnValueOnce({ type: 'delete', entry: entry() });
    handleKeydown(ctrlZ());
    await vi.waitFor(() => expect(_showToast).toHaveBeenCalledWith('undo.delete_restored'));
  });
});

describe('handleKeydown — EDIT action dispatch', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    _undoManagerMock.undo.mockReset();
    _updateTimeEntry.mockReset();
    _showToast.mockReset();
    _updateTimeEntry.mockResolvedValue({ id: 101, ...entry() });
  });

  it('calls updateTimeEntry with the BEFORE values', async () => {
    const before = entry({ hours: 2.0, comment: 'original' });
    const after = entry({ hours: 3.0, comment: 'edited' });
    _undoManagerMock.undo.mockReturnValueOnce({ type: 'edit', id: 101, before, after });
    handleKeydown(ctrlZ());
    await vi.waitFor(() => expect(_updateTimeEntry).toHaveBeenCalledTimes(1));
    expect(_updateTimeEntry).toHaveBeenCalledWith(101, before);
  });

  it('shows undo.edit_reversed toast', async () => {
    _undoManagerMock.undo.mockReturnValueOnce({
      type: 'edit',
      id: 101,
      before: entry(),
      after: entry({ hours: 3.0 }),
    });
    handleKeydown(ctrlZ());
    await vi.waitFor(() => expect(_showToast).toHaveBeenCalledWith('undo.edit_reversed'));
  });
});

describe('handleKeydown — MOVE action dispatch', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    _undoManagerMock.undo.mockReset();
    _updateTimeEntry.mockReset();
    _showToast.mockReset();
    _updateTimeEntry.mockResolvedValue({ id: 101, ...entry() });
  });

  it('calls updateTimeEntry with the BEFORE position', async () => {
    const before = entry({ startTime: '09:00', endTime: '11:00' });
    const after = entry({ startTime: '10:00', endTime: '12:00' });
    _undoManagerMock.undo.mockReturnValueOnce({ type: 'move', id: 101, before, after });
    handleKeydown(ctrlZ());
    await vi.waitFor(() => expect(_updateTimeEntry).toHaveBeenCalledWith(101, before));
  });

  it('shows undo.move_reversed toast', async () => {
    _undoManagerMock.undo.mockReturnValueOnce({
      type: 'move',
      id: 101,
      before: entry(),
      after: entry({ startTime: '10:00' }),
    });
    handleKeydown(ctrlZ());
    await vi.waitFor(() => expect(_showToast).toHaveBeenCalledWith('undo.move_reversed'));
  });
});

describe('handleKeydown — ADD action dispatch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    _undoManagerMock.undo.mockReset();
    _deleteTimeEntry.mockReset();
    _showToast.mockReset();
    _deleteTimeEntry.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls deleteTimeEntry after the animation delay', async () => {
    _undoManagerMock.undo.mockReturnValueOnce({ type: 'add', entry: entry() });
    handleKeydown(ctrlZ());
    // Advance past the 500 ms fade animation delay in undoAdd
    await vi.advanceTimersByTimeAsync(600);
    expect(_deleteTimeEntry).toHaveBeenCalledWith(101);
  });
});

describe('handleKeydown — PASTE action dispatch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    _undoManagerMock.undo.mockReset();
    _deleteTimeEntry.mockReset();
    _showToast.mockReset();
    _deleteTimeEntry.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows undo.paste_removed toast (not undo.add_removed)', async () => {
    _undoManagerMock.undo.mockReturnValueOnce({ type: 'paste', entry: entry() });
    handleKeydown(ctrlZ());
    await vi.advanceTimersByTimeAsync(600);
    expect(_showToast).toHaveBeenCalledWith('undo.paste_removed');
    expect(_showToast).not.toHaveBeenCalledWith('undo.add_removed');
  });
});

describe('handleKeydown — redo dispatch', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    _undoManagerMock.redo.mockReset();
    _deleteTimeEntry.mockReset();
    _showToast.mockReset();
    _deleteTimeEntry.mockResolvedValue(undefined);
  });

  it('Ctrl+Shift+Z with a DELETE redo action calls deleteTimeEntry', async () => {
    _undoManagerMock.redo.mockReturnValueOnce({ type: 'delete', entry: entry() });
    handleKeydown(ctrlShiftZ());
    await vi.waitFor(() => expect(_deleteTimeEntry).toHaveBeenCalledWith(101));
  });

  it('shows redo.delete_reapplied toast', async () => {
    _undoManagerMock.redo.mockReturnValueOnce({ type: 'delete', entry: entry() });
    handleKeydown(ctrlShiftZ());
    await vi.waitFor(() => expect(_showToast).toHaveBeenCalledWith('redo.delete_reapplied'));
  });
});

describe('undo:push batch coalescing', () => {
  beforeEach(() => {
    _undoManagerMock.push.mockReset();
  });

  function pushAdd(id) {
    document.dispatchEvent(
      new CustomEvent('undo:push', { detail: { type: 'add', entry: entry({ id }) } })
    );
  }

  it('pushes each add directly when no batch is open', () => {
    pushAdd(1);
    pushAdd(2);
    expect(_undoManagerMock.push).toHaveBeenCalledTimes(2);
    expect(_undoManagerMock.push.mock.calls[0][0].type).toBe('add');
  });

  it('coalesces adds between batchbegin/batchend into one bulk-add', () => {
    document.dispatchEvent(new CustomEvent('undo:batchbegin'));
    pushAdd(1);
    pushAdd(2);
    pushAdd(3);
    // Nothing pushed to the manager yet — adds are buffered.
    expect(_undoManagerMock.push).not.toHaveBeenCalled();
    document.dispatchEvent(new CustomEvent('undo:batchend'));
    expect(_undoManagerMock.push).toHaveBeenCalledTimes(1);
    const action = _undoManagerMock.push.mock.calls[0][0];
    expect(action.type).toBe('bulk-add');
    expect(action.entries.map((e) => e.id)).toEqual([1, 2, 3]);
  });

  it('pushes nothing on an empty batch (no successful adds)', () => {
    document.dispatchEvent(new CustomEvent('undo:batchbegin'));
    document.dispatchEvent(new CustomEvent('undo:batchend'));
    expect(_undoManagerMock.push).not.toHaveBeenCalled();
  });

  it('resumes direct pushes after the batch closes', () => {
    document.dispatchEvent(new CustomEvent('undo:batchbegin'));
    pushAdd(1);
    document.dispatchEvent(new CustomEvent('undo:batchend'));
    _undoManagerMock.push.mockReset();
    pushAdd(2);
    expect(_undoManagerMock.push).toHaveBeenCalledTimes(1);
    expect(_undoManagerMock.push.mock.calls[0][0].type).toBe('add');
  });
});
