// @ts-nocheck — DOM-heavy module; getElementById casts handled at call sites.
import { t } from './i18n.js';

let _cleanup = null;

function _close() {
  const el = document.getElementById('confirm-dialog');
  if (el) el.classList.add('hidden');
  if (_cleanup) {
    _cleanup();
    _cleanup = null;
  }
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

  const okBtn = /** @type {HTMLButtonElement} */ (document.getElementById('confirm-dialog-ok'));
  const cancelBtn = /** @type {HTMLButtonElement} */ (
    document.getElementById('confirm-dialog-cancel')
  );

  function handleConfirm() {
    _close();
    onConfirm();
  }

  function handleCancel() {
    _close();
    onCancel?.();
  }

  function handleBackdrop(e) {
    if (e.target === dialog) handleCancel();
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
      return;
    }
    if (e.key === 'Tab') {
      const focusable = [cancelBtn, okBtn];
      const idx = focusable.indexOf(/** @type {HTMLElement} */ (document.activeElement));
      if (e.shiftKey) {
        if (idx <= 0) {
          e.preventDefault();
          focusable[focusable.length - 1].focus();
        }
      } else {
        if (idx >= focusable.length - 1) {
          e.preventDefault();
          focusable[0].focus();
        }
      }
    }
  }

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
  requestAnimationFrame(() => cancelBtn.focus());
}
