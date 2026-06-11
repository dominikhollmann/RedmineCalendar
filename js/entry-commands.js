// @ts-nocheck
import { getSelected, getAnchor, deselectAll } from './entry-selection.js';
import { deleteTimeEntry } from './redmine-api.js';
import { showDeleteConfirm } from './time-entry-form.js';
import { showToast } from './notify.js';
import { t } from './i18n.js';

let _context = null;
let _prevContext = null;
let _registered = false;

function _isCopyShortcut(e) {
  return (e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || e.code === 'KeyC');
}

function _anchorEntry() {
  const entry = getAnchor()?.extendedProps?.timeEntry;
  return !entry || entry._isMidnightContinuation ? null : entry;
}

function _deletableItems() {
  return getSelected().flatMap((ev) => {
    const entry = ev.extendedProps?.timeEntry;
    return entry?.id && !entry._isMidnightContinuation ? [{ ev, entry }] : [];
  });
}

function _handleDelete(e, ctx) {
  const toDelete = _deletableItems();
  if (toDelete.length === 0) return;
  e.preventDefault();
  deselectAll();
  showDeleteConfirm(() => {
    Promise.all(toDelete.map(({ entry }) => deleteTimeEntry(entry.id)))
      .then(() => {
        toDelete.forEach(({ ev }) => ev.remove());
        showToast(t('calendar.entry_deleted'));
        ctx.onAfterDelete?.();
      })
      .catch((err) => ctx.onDeleteError?.(err.message ?? t('modal.delete_failed')));
  });
}

function _handleKeydown(e) {
  if (!_context) return;
  const ctx = _context;
  if (e.key === 'Escape') {
    deselectAll();
    return;
  }
  if (_isCopyShortcut(e) && ctx.onCopy) {
    const entry = _anchorEntry();
    if (!entry) return;
    e.preventDefault();
    ctx.onCopy(entry);
    return;
  }
  if (e.key === 'Enter' && ctx.onEdit) {
    const entry = _anchorEntry();
    if (!entry) return;
    deselectAll();
    ctx.onEdit(entry);
    return;
  }
  if (e.key === 'Delete') _handleDelete(e, ctx);
}

/**
 * Activate keyboard commands for the current surface.
 * Saves the previous context (depth-1 stack) so deactivate() restores it.
 * @param {{ onAfterDelete?: () => void, onDeleteError?: (msg: string) => void, onEdit?: (entry: object) => void, onCopy?: (entry: object) => void }} context
 */
export function activate(context) {
  _prevContext = _context;
  _context = context;
  if (!_registered && typeof document !== 'undefined') {
    document.addEventListener('keydown', _handleKeydown);
    _registered = true;
  }
}

/**
 * Deactivate the current surface and restore the previous context.
 */
export function deactivate() {
  _context = _prevContext;
  _prevContext = null;
}
