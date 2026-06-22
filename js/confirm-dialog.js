// @ts-nocheck — DOM-heavy module; getElementById casts handled at call sites.
import { t } from './i18n.js';

let _cleanup = null;

function _close() {
  const el = document.getElementById('confirm-dialog');
  /* c8 ignore next */
  if (el) el.classList.add('hidden');
  if (_cleanup) {
    _cleanup();
    _cleanup = null;
  }
}

function _makeFocusTrap(focusable, onEscape) {
  return function (e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onEscape();
      return;
    }
    if (e.key === 'Tab') {
      const idx = focusable.indexOf(document.activeElement);
      if (e.shiftKey) {
        if (idx <= 0) {
          e.preventDefault();
          focusable[focusable.length - 1].focus();
        }
      } else if (idx >= focusable.length - 1) {
        e.preventDefault();
        focusable[0].focus();
      }
    }
  };
}

/**
 * Show a shared confirmation dialog. A second call while one is open replaces it.
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} [opts.confirmLabel]
 * @param {string} [opts.cancelLabel]
 * @param {() => void} opts.onConfirm
 * @param {() => void} [opts.onCancel]
 */
export function showConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}) {
  const dialog = document.getElementById('confirm-dialog');
  if (!dialog) return;

  if (_cleanup) {
    _cleanup();
    _cleanup = null;
  }

  document.getElementById('confirm-dialog-title').textContent = title;
  document.getElementById('confirm-dialog-message').textContent = message;
  document.getElementById('confirm-dialog-ok').textContent = confirmLabel ?? t('confirm');
  document.getElementById('confirm-dialog-cancel').textContent = cancelLabel ?? t('cancel');

  const okBtn = document.getElementById('confirm-dialog-ok');
  const cancelBtn = document.getElementById('confirm-dialog-cancel');

  const handleConfirm = () => {
    _close();
    onConfirm();
  };
  const handleCancel = () => {
    _close();
    onCancel?.();
  };
  const handleBackdrop = (e) => {
    if (e.target === dialog) handleCancel();
  };
  const handleKeydown = _makeFocusTrap([okBtn, cancelBtn], handleCancel);

  okBtn.addEventListener('click', handleConfirm);
  cancelBtn.addEventListener('click', handleCancel);
  dialog.addEventListener('click', handleBackdrop);
  document.addEventListener('keydown', handleKeydown);

  _cleanup = () => {
    okBtn.removeEventListener('click', handleConfirm);
    cancelBtn.removeEventListener('click', handleCancel);
    dialog.removeEventListener('click', handleBackdrop);
    document.removeEventListener('keydown', handleKeydown);
  };

  dialog.classList.remove('hidden');
  requestAnimationFrame(() => okBtn.focus());
}

/**
 * Promise-wrapped confirmation for booking against a closed Redmine ticket.
 * Shared by the calendar drag-drop and planning-view batch-booking paths.
 * @returns {Promise<boolean>} resolves true on confirm, false on cancel/escape
 */
export function confirmClosedTicket() {
  return new Promise((resolve) => {
    showConfirmDialog({
      title: t('timeEntry.closedTicketConfirmTitle'),
      message: t('timeEntry.closedTicketConfirmBody'),
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
}
