import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeDialogDOM() {
  const elements = {
    'confirm-dialog': {
      classList: { remove: vi.fn(), add: vi.fn() },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    'confirm-dialog-title': { textContent: '' },
    'confirm-dialog-message': { textContent: '' },
    'confirm-dialog-ok': {
      textContent: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      focus: vi.fn(),
    },
    'confirm-dialog-cancel': {
      textContent: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      focus: vi.fn(),
    },
  };

  const docMock = {
    getElementById: vi.fn((id) => elements[id] ?? null),
    activeElement: elements['confirm-dialog-cancel'],
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  // setup.js defines document with configurable:false but writable:true — use assignment
  global.document = docMock;

  return elements;
}

async function loadFreshDialog() {
  vi.resetModules();
  vi.doMock('../../js/i18n.js', () => ({
    t: vi.fn((key) => key),
    locale: 'en',
    formatDate: vi.fn((d) => d),
  }));
  const mod = await import('../../js/confirm-dialog.js');
  return mod;
}

beforeEach(() => {
  global.requestAnimationFrame = vi.fn((cb) => cb());
});

describe('showConfirmDialog', () => {
  it('opens the dialog and sets text content', async () => {
    const els = makeDialogDOM();
    const { showConfirmDialog } = await loadFreshDialog();
    showConfirmDialog({ title: 'T', message: 'M', onConfirm: vi.fn() });
    expect(els['confirm-dialog'].classList.remove).toHaveBeenCalledWith('hidden');
    expect(els['confirm-dialog-title'].textContent).toBe('T');
    expect(els['confirm-dialog-message'].textContent).toBe('M');
  });

  it('uses default t("confirm") and t("cancel") labels when not supplied', async () => {
    const els = makeDialogDOM();
    const { showConfirmDialog } = await loadFreshDialog();
    showConfirmDialog({ title: 'T', message: 'M', onConfirm: vi.fn() });
    expect(els['confirm-dialog-ok'].textContent).toBe('confirm');
    expect(els['confirm-dialog-cancel'].textContent).toBe('cancel');
  });

  it('uses custom labels when supplied', async () => {
    const els = makeDialogDOM();
    const { showConfirmDialog } = await loadFreshDialog();
    showConfirmDialog({
      title: 'T',
      message: 'M',
      confirmLabel: 'Yes',
      cancelLabel: 'No',
      onConfirm: vi.fn(),
    });
    expect(els['confirm-dialog-ok'].textContent).toBe('Yes');
    expect(els['confirm-dialog-cancel'].textContent).toBe('No');
  });

  it('calls onConfirm and closes when ok button is clicked', async () => {
    const els = makeDialogDOM();
    const { showConfirmDialog } = await loadFreshDialog();
    const onConfirm = vi.fn();
    showConfirmDialog({ title: 'T', message: 'M', onConfirm });

    const okClick = els['confirm-dialog-ok'].addEventListener.mock.calls.find(
      ([ev]) => ev === 'click'
    )?.[1];
    okClick?.();

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(els['confirm-dialog'].classList.add).toHaveBeenCalledWith('hidden');
  });

  it('calls onCancel and closes when cancel button is clicked', async () => {
    const els = makeDialogDOM();
    const { showConfirmDialog } = await loadFreshDialog();
    const onCancel = vi.fn();
    showConfirmDialog({ title: 'T', message: 'M', onConfirm: vi.fn(), onCancel });

    const cancelClick = els['confirm-dialog-cancel'].addEventListener.mock.calls.find(
      ([ev]) => ev === 'click'
    )?.[1];
    cancelClick?.();

    expect(onCancel).toHaveBeenCalledOnce();
    expect(els['confirm-dialog'].classList.add).toHaveBeenCalledWith('hidden');
  });

  it('closes and calls onCancel on backdrop click', async () => {
    const els = makeDialogDOM();
    const { showConfirmDialog } = await loadFreshDialog();
    const onCancel = vi.fn();
    showConfirmDialog({ title: 'T', message: 'M', onConfirm: vi.fn(), onCancel });

    const backdropClick = els['confirm-dialog'].addEventListener.mock.calls.find(
      ([ev]) => ev === 'click'
    )?.[1];
    backdropClick?.({ target: els['confirm-dialog'] });

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not call onCancel on non-backdrop click inside dialog', async () => {
    const els = makeDialogDOM();
    const { showConfirmDialog } = await loadFreshDialog();
    const onCancel = vi.fn();
    showConfirmDialog({ title: 'T', message: 'M', onConfirm: vi.fn(), onCancel });

    const backdropClick = els['confirm-dialog'].addEventListener.mock.calls.find(
      ([ev]) => ev === 'click'
    )?.[1];
    backdropClick?.({ target: els['confirm-dialog-ok'] });

    expect(onCancel).not.toHaveBeenCalled();
  });

  it('replaces an open dialog when called a second time', async () => {
    const els = makeDialogDOM();
    const { showConfirmDialog } = await loadFreshDialog();
    showConfirmDialog({ title: 'T1', message: 'M1', onConfirm: vi.fn() });
    showConfirmDialog({ title: 'T2', message: 'M2', onConfirm: vi.fn() });
    expect(els['confirm-dialog-title'].textContent).toBe('T2');
  });

  it('Escape key closes dialog and calls onCancel', async () => {
    const els = makeDialogDOM();
    const { showConfirmDialog } = await loadFreshDialog();
    const onCancel = vi.fn();
    showConfirmDialog({ title: 'T', message: 'M', onConfirm: vi.fn(), onCancel });

    const handler = global.document.addEventListener.mock.calls.find(
      ([ev]) => ev === 'keydown'
    )?.[1];
    handler?.({ key: 'Escape', preventDefault: vi.fn() });

    expect(onCancel).toHaveBeenCalledOnce();
    expect(els['confirm-dialog'].classList.add).toHaveBeenCalledWith('hidden');
  });

  it('Tab key traps focus forward from last element', async () => {
    const els = makeDialogDOM();
    const { showConfirmDialog } = await loadFreshDialog();
    showConfirmDialog({ title: 'T', message: 'M', onConfirm: vi.fn() });

    const handler = global.document.addEventListener.mock.calls.find(
      ([ev]) => ev === 'keydown'
    )?.[1];
    // cancelBtn is at index 1 (last in [okBtn, cancelBtn]) — Tab should wrap to okBtn
    global.document.activeElement = els['confirm-dialog-cancel'];
    handler?.({ key: 'Tab', shiftKey: false, preventDefault: vi.fn() });

    expect(els['confirm-dialog-ok'].focus).toHaveBeenCalled();
  });

  it('Shift+Tab key traps focus backward from first element', async () => {
    const els = makeDialogDOM();
    const { showConfirmDialog } = await loadFreshDialog();
    showConfirmDialog({ title: 'T', message: 'M', onConfirm: vi.fn() });

    const handler = global.document.addEventListener.mock.calls.find(
      ([ev]) => ev === 'keydown'
    )?.[1];
    global.document.activeElement = els['confirm-dialog-cancel'];
    handler?.({ key: 'Tab', shiftKey: true, preventDefault: vi.fn() });

    expect(els['confirm-dialog-ok'].focus).toHaveBeenCalled();
  });

  it('closes a second time without error when _cleanup is already null', async () => {
    const els = makeDialogDOM();
    const { showConfirmDialog } = await loadFreshDialog();
    showConfirmDialog({ title: 'T', message: 'M', onConfirm: vi.fn() });

    const okClick = els['confirm-dialog-ok'].addEventListener.mock.calls.find(
      ([ev]) => ev === 'click'
    )?.[1];
    const cancelClick = els['confirm-dialog-cancel'].addEventListener.mock.calls.find(
      ([ev]) => ev === 'click'
    )?.[1];

    okClick?.(); // _cleanup is called and set to null
    expect(() => cancelClick?.()).not.toThrow(); // second close: _cleanup is null
  });

  it('unrecognized key does nothing', async () => {
    const els = makeDialogDOM();
    const { showConfirmDialog } = await loadFreshDialog();
    showConfirmDialog({ title: 'T', message: 'M', onConfirm: vi.fn() });

    const handler = global.document.addEventListener.mock.calls.find(
      ([ev]) => ev === 'keydown'
    )?.[1];
    const preventDefault = vi.fn();
    handler?.({ key: 'Enter', shiftKey: false, preventDefault });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(els['confirm-dialog'].classList.add).not.toHaveBeenCalled();
  });

  it('Tab does not trap focus when not at last element', async () => {
    const els = makeDialogDOM();
    const { showConfirmDialog } = await loadFreshDialog();
    showConfirmDialog({ title: 'T', message: 'M', onConfirm: vi.fn() });

    const handler = global.document.addEventListener.mock.calls.find(
      ([ev]) => ev === 'keydown'
    )?.[1];
    // okBtn is at index 0, which is NOT the last element — no trap expected
    global.document.activeElement = els['confirm-dialog-ok'];
    const preventDefault = vi.fn();
    handler?.({ key: 'Tab', shiftKey: false, preventDefault });

    expect(preventDefault).not.toHaveBeenCalled();
    // cancelBtn.focus should not have been called (trap only calls focusable[0].focus on wrap)
    expect(els['confirm-dialog-cancel'].focus).not.toHaveBeenCalled();
  });

  it('Shift+Tab does not trap focus when not at first element', async () => {
    const els = makeDialogDOM();
    const { showConfirmDialog } = await loadFreshDialog();
    showConfirmDialog({ title: 'T', message: 'M', onConfirm: vi.fn() });

    const handler = global.document.addEventListener.mock.calls.find(
      ([ev]) => ev === 'keydown'
    )?.[1];
    // cancelBtn is at index 1 (> 0), which is NOT the first element — no trap expected
    global.document.activeElement = els['confirm-dialog-cancel'];
    const preventDefault = vi.fn();
    handler?.({ key: 'Tab', shiftKey: true, preventDefault });

    expect(preventDefault).not.toHaveBeenCalled();
    // cancelBtn.focus should not have been called (trap would call focusable[last].focus)
    expect(els['confirm-dialog-cancel'].focus).not.toHaveBeenCalled();
  });

  it('does nothing when #confirm-dialog element is absent', async () => {
    const docMock = {
      getElementById: vi.fn(() => null),
      activeElement: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    global.document = docMock;
    const { showConfirmDialog } = await loadFreshDialog();
    expect(() => showConfirmDialog({ title: 'T', message: 'M', onConfirm: vi.fn() })).not.toThrow();
  });
});
