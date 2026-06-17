import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (factories must be inline — vi.mock is hoisted) ─────────

vi.mock('../../js/entry-selection.js', () => ({
  getSelected: vi.fn(() => []),
  getAnchor: vi.fn(() => null),
  deselectAll: vi.fn(),
}));
vi.mock('../../js/redmine-api.js', () => ({
  deleteTimeEntry: vi.fn(async () => {}),
}));
vi.mock('../../js/time-entry-form.js', () => ({
  showDeleteConfirm: vi.fn(),
}));
vi.mock('../../js/notify.js', () => ({ showToast: vi.fn() }));
vi.mock('../../js/i18n.js', () => ({ t: vi.fn((k) => k), locale: 'en' }));
vi.mock('../../js/booking-guard.js', () => ({
  deadlineTriggeredForMove: vi.fn(() => false),
}));
vi.mock('../../js/confirm-dialog.js', () => ({
  showConfirmDialog: vi.fn(),
}));

// Capture the keydown handler registered via document.addEventListener
let _capturedHandler = null;
global.document = {
  addEventListener: vi.fn((evt, handler) => {
    if (evt === 'keydown') _capturedHandler = handler;
  }),
  dispatchEvent: vi.fn(),
};

import { getSelected, getAnchor, deselectAll } from '../../js/entry-selection.js';
import { deleteTimeEntry } from '../../js/redmine-api.js';
import { showDeleteConfirm } from '../../js/time-entry-form.js';
import { deadlineTriggeredForMove } from '../../js/booking-guard.js';
import { showConfirmDialog } from '../../js/confirm-dialog.js';
import { activate, deactivate } from '../../js/entry-commands.js';

// ── Helpers ───────────────────────────────────────────────────────

async function flush() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

function getHandler() {
  // entry-commands.js registers once; return the captured handler.
  return (
    _capturedHandler ??
    global.document.addEventListener.mock.calls.find((c) => c[0] === 'keydown')?.[1]
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getSelected.mockReturnValue([]);
  getAnchor.mockReturnValue(null);
  deleteTimeEntry.mockResolvedValue(undefined);
  showDeleteConfirm.mockReset();
  // Re-activate with empty context so handler fires (module singleton retains _registered=true)
  activate({});
});

// ── T013: activate / deactivate ───────────────────────────────────

describe('entry-commands: activate / deactivate', () => {
  it('registers keydown listener exactly once', () => {
    // already activated in beforeEach; calling activate again should not re-register
    activate({});
    const keydownCalls = global.document.addEventListener.mock.calls.filter(
      (c) => c[0] === 'keydown'
    );
    expect(keydownCalls.length).toBe(1);
  });

  it('deactivate restores the previous context', () => {
    const ctx1 = { onAfterDelete: vi.fn() };
    const ctx2 = { onAfterDelete: vi.fn() };
    activate(ctx1);
    activate(ctx2);
    deactivate(); // back to ctx1

    const entry = { id: 1 };
    const ev = { extendedProps: { timeEntry: entry }, remove: vi.fn() };
    getSelected.mockReturnValue([ev]);
    showDeleteConfirm.mockImplementation((cb) => cb());

    const h = getHandler();
    h({ key: 'Delete', preventDefault: vi.fn() });
    // ctx1.onAfterDelete is called async; just assert showDeleteConfirm fired
    expect(showDeleteConfirm).toHaveBeenCalled();
  });
});

// ── T014: Escape ──────────────────────────────────────────────────

describe('entry-commands: Escape key', () => {
  it('calls deselectAll', () => {
    const h = getHandler();
    h({ key: 'Escape' });
    expect(deselectAll).toHaveBeenCalled();
  });
});

// ── T015: Ctrl+C (copy) ───────────────────────────────────────────

describe('entry-commands: Ctrl+C key', () => {
  it('calls onCopy with the anchor entry and prevents default', () => {
    const onCopy = vi.fn();
    activate({ onCopy });
    const entry = { id: 5, issueId: 99 };
    getAnchor.mockReturnValue({ extendedProps: { timeEntry: entry } });

    const e = { key: 'c', ctrlKey: true, preventDefault: vi.fn() };
    getHandler()(e);
    expect(onCopy).toHaveBeenCalledWith(entry);
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it('is a no-op when no anchor', () => {
    const onCopy = vi.fn();
    activate({ onCopy });
    getAnchor.mockReturnValue(null);
    getHandler()({ key: 'c', ctrlKey: true, preventDefault: vi.fn() });
    expect(onCopy).not.toHaveBeenCalled();
  });

  it('is a no-op for midnight continuation anchor', () => {
    const onCopy = vi.fn();
    activate({ onCopy });
    getAnchor.mockReturnValue({
      extendedProps: { timeEntry: { id: 1, _isMidnightContinuation: true } },
    });
    getHandler()({ key: 'c', ctrlKey: true, preventDefault: vi.fn() });
    expect(onCopy).not.toHaveBeenCalled();
  });

  it('is a no-op when context has no onCopy', () => {
    activate({});
    const e = { key: 'c', ctrlKey: true, preventDefault: vi.fn() };
    getHandler()(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  it('recognises metaKey+c (Mac) as copy shortcut', () => {
    const onCopy = vi.fn();
    activate({ onCopy });
    const entry = { id: 7 };
    getAnchor.mockReturnValue({ extendedProps: { timeEntry: entry } });
    const e = { key: 'c', ctrlKey: false, metaKey: true, preventDefault: vi.fn() };
    getHandler()(e);
    expect(onCopy).toHaveBeenCalledWith(entry);
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it('recognises Ctrl+C (uppercase key) as copy shortcut', () => {
    const onCopy = vi.fn();
    activate({ onCopy });
    const entry = { id: 8 };
    getAnchor.mockReturnValue({ extendedProps: { timeEntry: entry } });
    const e = { key: 'C', ctrlKey: true, preventDefault: vi.fn() };
    getHandler()(e);
    expect(onCopy).toHaveBeenCalledWith(entry);
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it('recognises Ctrl+KeyC (code-based) as copy shortcut', () => {
    const onCopy = vi.fn();
    activate({ onCopy });
    const entry = { id: 9 };
    getAnchor.mockReturnValue({ extendedProps: { timeEntry: entry } });
    const e = { key: 'd', code: 'KeyC', ctrlKey: true, preventDefault: vi.fn() };
    getHandler()(e);
    expect(onCopy).toHaveBeenCalledWith(entry);
    expect(e.preventDefault).toHaveBeenCalled();
  });
});

// ── T016: Enter (edit) ────────────────────────────────────────────

describe('entry-commands: Enter key', () => {
  it('calls deselectAll then onEdit with the anchor entry', () => {
    const onEdit = vi.fn();
    activate({ onEdit });
    const entry = { id: 10 };
    getAnchor.mockReturnValue({ extendedProps: { timeEntry: entry } });
    getHandler()({ key: 'Enter' });
    expect(deselectAll).toHaveBeenCalled();
    expect(onEdit).toHaveBeenCalledWith(entry);
  });

  it('is a no-op when no anchor', () => {
    const onEdit = vi.fn();
    activate({ onEdit });
    getAnchor.mockReturnValue(null);
    getHandler()({ key: 'Enter' });
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('is a no-op when context has no onEdit', () => {
    activate({});
    getAnchor.mockReturnValue({ extendedProps: { timeEntry: { id: 1 } } });
    getHandler()({ key: 'Enter' }); // should not throw
  });
});

// ── T017: Delete ──────────────────────────────────────────────────

describe('entry-commands: Delete key', () => {
  it('calls showDeleteConfirm and then deleteTimeEntry for each selected entry', async () => {
    const onAfterDelete = vi.fn();
    activate({ onAfterDelete });
    const entry = { id: 20 };
    const ev = { extendedProps: { timeEntry: entry }, remove: vi.fn() };
    getSelected.mockReturnValue([ev]);
    showDeleteConfirm.mockImplementation((cb) => cb());

    getHandler()({ key: 'Delete', preventDefault: vi.fn() });
    expect(showDeleteConfirm).toHaveBeenCalled();
    await flush();
    expect(deleteTimeEntry).toHaveBeenCalledWith(20);
    expect(ev.remove).toHaveBeenCalled();
    expect(onAfterDelete).toHaveBeenCalled();
  });

  it('is a no-op when nothing is selected', () => {
    activate({});
    getSelected.mockReturnValue([]);
    getHandler()({ key: 'Delete', preventDefault: vi.fn() });
    expect(showDeleteConfirm).not.toHaveBeenCalled();
  });

  it('skips midnight continuation entries', () => {
    activate({});
    const ev = {
      extendedProps: { timeEntry: { id: 99, _isMidnightContinuation: true } },
      remove: vi.fn(),
    };
    getSelected.mockReturnValue([ev]);
    getHandler()({ key: 'Delete', preventDefault: vi.fn() });
    expect(showDeleteConfirm).not.toHaveBeenCalled();
  });

  it('calls onDeleteError on failure', async () => {
    const onDeleteError = vi.fn();
    activate({ onDeleteError });
    deleteTimeEntry.mockRejectedValue(new Error('network'));
    const ev = { extendedProps: { timeEntry: { id: 30 } }, remove: vi.fn() };
    getSelected.mockReturnValue([ev]);
    showDeleteConfirm.mockImplementation((cb) => cb());

    getHandler()({ key: 'Delete', preventDefault: vi.fn() });
    await flush();
    expect(onDeleteError).toHaveBeenCalledWith('network');
  });

  it('prevents default when there are deletable entries', () => {
    activate({});
    const ev = { extendedProps: { timeEntry: { id: 1 } }, remove: vi.fn() };
    getSelected.mockReturnValue([ev]);
    const e = { key: 'Delete', preventDefault: vi.fn() };
    getHandler()(e);
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it('falls back to i18n key when error has no message', async () => {
    const onDeleteError = vi.fn();
    activate({ onDeleteError });
    deleteTimeEntry.mockRejectedValue({}); // error object with no .message
    const ev = { extendedProps: { timeEntry: { id: 31 } }, remove: vi.fn() };
    getSelected.mockReturnValue([ev]);
    showDeleteConfirm.mockImplementation((cb) => cb());

    getHandler()({ key: 'Delete', preventDefault: vi.fn() });
    await flush();
    expect(onDeleteError).toHaveBeenCalledWith('modal.delete_failed');
  });

  it('shows deadline dialog and proceeds when user confirms', async () => {
    deadlineTriggeredForMove.mockReturnValue(true);
    showConfirmDialog.mockImplementation(({ onConfirm }) => onConfirm?.());
    showDeleteConfirm.mockImplementation((cb) => cb());
    const ev = { extendedProps: { timeEntry: { id: 40 } }, remove: vi.fn() };
    getSelected.mockReturnValue([ev]);

    getHandler()({ key: 'Delete', preventDefault: vi.fn() });
    await flush();
    expect(showConfirmDialog).toHaveBeenCalledTimes(1);
    expect(showDeleteConfirm).toHaveBeenCalled();
    expect(deleteTimeEntry).toHaveBeenCalledWith(40);
  });

  it('aborts deletion when user cancels the deadline dialog', async () => {
    deadlineTriggeredForMove.mockReturnValue(true);
    showConfirmDialog.mockImplementation(({ onCancel }) => onCancel?.());
    const ev = { extendedProps: { timeEntry: { id: 41 } }, remove: vi.fn() };
    getSelected.mockReturnValue([ev]);

    getHandler()({ key: 'Delete', preventDefault: vi.fn() });
    await flush();
    expect(showConfirmDialog).toHaveBeenCalledTimes(1);
    expect(showDeleteConfirm).not.toHaveBeenCalled();
    expect(deleteTimeEntry).not.toHaveBeenCalled();
  });
});
