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
