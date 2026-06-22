// @ts-nocheck — DOM-heavy module.
/**
 * Keyboard handler and API-inversion logic for undo/redo.
 *
 * Depends on undoManager (pure logic) and the Redmine API client.
 * Communicates with calendar.js and planning-view-bookings.js via
 * custom DOM events to avoid circular imports.
 */

import {
  undoManager,
  ACTION_ADD,
  ACTION_PASTE,
  ACTION_DELETE,
  ACTION_EDIT,
  ACTION_MOVE,
  ACTION_RESIZE,
  ACTION_BULK_DELETE,
} from './undo-manager.js';
import { createTimeEntry, updateTimeEntry, deleteTimeEntry } from './redmine-api.js';
import { showToast } from './notify.js';
import { t } from './i18n.js';

// ── DOM event helpers ──────────────────────────────────────────────

function dispatch(type, detail) {
  document.dispatchEvent(new CustomEvent(type, { detail }));
}

function navigateTo(date) {
  if (!date) return;
  dispatch('undo:navigate', { date });
}

function highlightEntry(entryId, updatedEntry) {
  dispatch('undo:preAnimate', { entryId: String(entryId), animationType: 'highlight' });
  dispatch('undo:eventChanged', { entryId: String(entryId), updatedEntry });
}

function fadeDeleteEntry(entryId) {
  dispatch('undo:preAnimate', { entryId: String(entryId), animationType: 'fade-delete' });
}

function addEntry(entry) {
  dispatch('undo:eventAdded', { entry });
}

function removeEntry(entryId) {
  dispatch('undo:eventDeleted', { entryId: String(entryId) });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── performUndo dispatcher ─────────────────────────────────────────

async function performUndo(action) {
  try {
    switch (action.type) {
      case ACTION_DELETE:
        await undoDelete(action);
        break;
      case ACTION_EDIT:
        await undoEdit(action);
        break;
      case ACTION_MOVE:
      case ACTION_RESIZE:
        await undoMoveOrResize(action);
        break;
      case ACTION_ADD:
        await undoAdd(action, t('undo.add_removed'));
        break;
      case ACTION_PASTE:
        await undoAdd(action, t('undo.paste_removed'));
        break;
      case ACTION_BULK_DELETE:
        await undoBulkDelete(action);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  } catch (err) {
    showToast(t('undo.failed', { message: err.message ?? String(err) }));
  }
}

// ── performRedo dispatcher ─────────────────────────────────────────

async function performRedo(action) {
  try {
    switch (action.type) {
      case ACTION_DELETE:
        await redoDelete(action);
        break;
      case ACTION_EDIT:
        await redoEdit(action);
        break;
      case ACTION_MOVE:
      case ACTION_RESIZE:
        await redoMoveOrResize(action);
        break;
      case ACTION_ADD:
        await redoAdd(action, t('redo.add_reapplied'));
        break;
      case ACTION_PASTE:
        await redoAdd(action, t('redo.paste_reapplied'));
        break;
      case ACTION_BULK_DELETE:
        await redoBulkDelete(action);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  } catch (err) {
    showToast(t('redo.failed', { message: err.message ?? String(err) }));
  }
}

// ── Undo / redo implementations ────────────────────────────────────

// Re-create a previously-removed entry (undo-delete / redo-add) and toast.
async function _recreateEntry(action, toastMsg) {
  navigateTo(action.entry.spentOn);
  const saved = await createTimeEntry(action.entry);
  action.entry.id = saved.id; // stale-ID fix
  addEntry(saved);
  showToast(toastMsg);
}

async function undoDelete(action) {
  await _recreateEntry(action, t('undo.delete_restored'));
}

async function redoDelete(action) {
  navigateTo(action.entry.spentOn);
  await deleteTimeEntry(action.entry.id);
  removeEntry(action.entry.id);
  showToast(t('redo.delete_reapplied'));
}

async function undoEdit(action) {
  navigateTo(action.before.spentOn);
  const saved = await updateTimeEntry(action.id, action.before);
  highlightEntry(action.id, saved);
  showToast(t('undo.edit_reversed'));
}

async function redoEdit(action) {
  navigateTo(action.after.spentOn);
  const saved = await updateTimeEntry(action.id, action.after);
  highlightEntry(action.id, saved);
  showToast(t('redo.edit_reapplied'));
}

async function undoMoveOrResize(action) {
  navigateTo(action.before.spentOn);
  const saved = await updateTimeEntry(action.id, action.before);
  highlightEntry(action.id, saved);
  const toast = action.type === ACTION_MOVE ? t('undo.move_reversed') : t('undo.resize_reversed');
  showToast(toast);
}

async function redoMoveOrResize(action) {
  navigateTo(action.after.spentOn);
  const saved = await updateTimeEntry(action.id, action.after);
  highlightEntry(action.id, saved);
  const toast = action.type === ACTION_MOVE ? t('redo.move_reapplied') : t('redo.resize_reapplied');
  showToast(toast);
}

async function undoAdd(action, toastMsg) {
  navigateTo(action.entry.spentOn);
  fadeDeleteEntry(action.entry.id);
  await delay(500);
  await deleteTimeEntry(action.entry.id);
  removeEntry(action.entry.id);
  showToast(toastMsg);
}

async function redoAdd(action, toastMsg) {
  await _recreateEntry(action, toastMsg);
}

async function undoBulkDelete(action) {
  const { entries } = action;
  if (entries.length > 0) navigateTo(entries[0].spentOn);

  const errors = [];
  await Promise.all(
    entries.map((entry) =>
      createTimeEntry(entry)
        .then((saved) => {
          entry.id = saved.id; // stale-ID fix
          addEntry(saved);
        })
        .catch((err) => {
          errors.push(err.message ?? String(err));
        })
    )
  );

  showToast(t('undo.bulk_delete_restored', { count: entries.length - errors.length }));
  if (errors.length > 0) {
    errors.forEach((msg) => showToast(t('undo.failed', { message: msg })));
  }
}

async function redoBulkDelete(action) {
  const { entries } = action;
  if (entries.length > 0) navigateTo(entries[0].spentOn);
  const errors = [];
  await Promise.all(
    entries.map((entry) =>
      deleteTimeEntry(entry.id)
        .then(() => removeEntry(entry.id))
        .catch((err) => {
          errors.push(err.message ?? String(err));
        })
    )
  );
  showToast(t('redo.bulk_delete_reapplied', { count: entries.length - errors.length }));
}

// ── Keyboard guard + handler ───────────────────────────────────────

export function isUndoBlocked() {
  const el = document.activeElement;
  if (el) {
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable) return true;
  }
  const modal = document.getElementById('lean-time-modal');
  if (modal && !modal.classList.contains('hidden')) return true;
  const chat = document.getElementById('chatbot-panel');
  if (chat && chat.classList.contains('chatbot-panel--open')) return true;
  return false;
}

export function handleKeydown(e) {
  const isCtrl = e.ctrlKey || e.metaKey;
  if (!isCtrl) return;

  const isZ = e.key === 'z' || e.key === 'Z';
  const isY = e.key === 'y' || e.key === 'Y';

  if (!isZ && !isY) return;
  if (isUndoBlocked()) return;

  const isRedo = (isZ && e.shiftKey) || isY;

  if (isRedo) {
    e.preventDefault();
    const action = undoManager.redo();
    if (action) performRedo(action);
  } else {
    e.preventDefault();
    const action = undoManager.undo();
    if (action) performUndo(action);
  }
}

document.addEventListener('keydown', handleKeydown);
document.addEventListener('undo:push', ({ detail }) => undoManager.push(detail));
document.addEventListener('undo:replacetop', ({ detail }) => undoManager.replaceTop(detail));
