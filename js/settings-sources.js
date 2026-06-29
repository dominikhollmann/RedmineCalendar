// ── Planning-source list UI (Feature 054 / US3 / #274) ────────────
// Renders the reorderable source rows and wires three non-pointer-equivalent
// modalities: HTML5 drag (desktop), keyboard grab/arrows on the grip
// (desktop), and up/down arrow buttons (mobile). Pure ordering logic lives in
// source-order.js; this module is DOM glue, Playwright-tested. Every move is
// announced via the shared aria-live region. See contracts/source-reorder.md.

import { t } from './i18n.js';
import {
  readOrder,
  writeOrder,
  moveUp,
  moveDown,
  move,
  canMoveUp,
  canMoveDown,
} from './source-order.js';
import {
  STORAGE_KEY_PLANNING_SOURCE_OUTLOOK,
  STORAGE_KEY_PLANNING_SOURCE_TEAMS,
} from './config.js';

const SOURCE_META = {
  outlook: {
    labelKey: 'planning.source_outlook_label',
    storageKey: STORAGE_KEY_PLANNING_SOURCE_OUTLOOK,
  },
  teams: {
    labelKey: 'planning.source_teams_label',
    storageKey: STORAGE_KEY_PLANNING_SOURCE_TEAMS,
  },
};

function isEnabled(id) {
  return localStorage.getItem(SOURCE_META[id].storageKey) !== '0';
}

function setEnabled(id, on) {
  localStorage.setItem(SOURCE_META[id].storageKey, on ? '1' : '0');
  document.dispatchEvent(new CustomEvent('planning:sources-changed'));
}

function persist(ctx, next, movedId) {
  ctx.order = writeOrder(next);
  document.dispatchEvent(new CustomEvent('planning:sources-changed'));
  render(ctx);
  if (movedId) {
    focusGrip(ctx, ctx.order.indexOf(movedId), true);
    ctx.announce?.(
      t('settings.sources.moved', {
        source: t(SOURCE_META[movedId].labelKey),
        pos: String(ctx.order.indexOf(movedId) + 1),
        total: String(ctx.order.length),
      })
    );
  }
}

function focusGrip(ctx, index, keepGrabbed) {
  const grip = ctx.listEl.querySelector(`[data-grip="${index}"]`);
  if (grip instanceof HTMLElement) grip.focus();
  if (!keepGrabbed) ctx.grabbed = null;
}

function toggleGrab(ctx, index) {
  const id = ctx.order[index];
  ctx.grabbed = ctx.grabbed === index ? null : index;
  render(ctx);
  ctx.announce?.(
    t(ctx.grabbed == null ? 'settings.sources.dropped' : 'settings.sources.grabbed', {
      source: t(SOURCE_META[id].labelKey),
    })
  );
  focusGrip(ctx, ctx.grabbed == null ? index : ctx.grabbed, true);
}

function onGripKey(ctx, e, index) {
  const id = ctx.order[index];
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    toggleGrab(ctx, index);
  } else if (e.key === 'Escape' && ctx.grabbed != null) {
    e.preventDefault();
    ctx.grabbed = null;
    render(ctx);
    focusGrip(ctx, index, true);
  } else if (ctx.grabbed === index && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    e.preventDefault();
    const next = e.key === 'ArrowUp' ? moveUp(ctx.order, index) : moveDown(ctx.order, index);
    ctx.grabbed = next.indexOf(id);
    persist(ctx, next, id);
  }
}

function buildGrip(ctx, id, index) {
  const grip = document.createElement('button');
  grip.type = 'button';
  grip.className = 'source-grip';
  grip.dataset.grip = String(index);
  grip.setAttribute(
    'aria-label',
    t('settings.sources.grip_label', { source: t(SOURCE_META[id].labelKey) })
  );
  grip.setAttribute('aria-pressed', String(ctx.grabbed === index));
  grip.textContent = '⠿';
  grip.addEventListener('keydown', (e) => onGripKey(ctx, e, index));
  return grip;
}

function buildBadge(index) {
  const badge = document.createElement('span');
  badge.className = 'source-badge';
  badge.textContent = String(index + 1);
  return badge;
}

function buildToggle(id) {
  const label = document.createElement('label');
  label.className = 'source-toggle';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = isEnabled(id);
  if (id === 'teams') cb.dataset.testid = 'teams-source-toggle';
  cb.addEventListener('change', () => setEnabled(id, cb.checked));
  const span = document.createElement('span');
  span.textContent = t(SOURCE_META[id].labelKey);
  label.append(cb, span);
  return label;
}

function arrowButton(glyph, label, disabled, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'source-arrow';
  b.textContent = glyph;
  b.setAttribute('aria-label', label);
  b.disabled = disabled;
  b.addEventListener('click', onClick);
  return b;
}

function buildArrows(ctx, id, index) {
  const wrap = document.createElement('div');
  wrap.className = 'source-arrows';
  wrap.append(
    arrowButton('▲', t('settings.sources.move_up'), !canMoveUp(ctx.order, index), () =>
      persist(ctx, moveUp(ctx.order, index), id)
    ),
    arrowButton('▼', t('settings.sources.move_down'), !canMoveDown(ctx.order, index), () =>
      persist(ctx, moveDown(ctx.order, index), id)
    )
  );
  return wrap;
}

function wireDrag(ctx, row, index) {
  row.addEventListener('dragstart', (e) => {
    e.dataTransfer?.setData('text/plain', String(index));
    row.classList.add('dragging');
  });
  row.addEventListener('dragend', () => row.classList.remove('dragging'));
  row.addEventListener('dragover', (e) => e.preventDefault());
  row.addEventListener('drop', (e) => {
    e.preventDefault();
    const from = Number(e.dataTransfer?.getData('text/plain'));
    if (Number.isInteger(from) && from !== index) {
      persist(ctx, move(ctx.order, from, index), ctx.order[from]);
    }
  });
}

function buildRow(ctx, id, index) {
  const row = document.createElement('div');
  row.className = 'source-row';
  row.setAttribute('role', 'listitem');
  row.draggable = true;
  if (ctx.grabbed === index) row.classList.add('grabbed');
  // Order: grip · arrows · checkbox+label (flex:1) · badge. The grip (desktop
  // drag/keyboard) and the arrows (mobile fallback) are toggled by CSS per
  // breakpoint; the flex:1 toggle pushes the position badge to the far right.
  row.append(
    buildGrip(ctx, id, index),
    buildArrows(ctx, id, index),
    buildToggle(id),
    buildBadge(index)
  );
  wireDrag(ctx, row, index);
  return row;
}

function render(ctx) {
  ctx.listEl.textContent = '';
  ctx.listEl.setAttribute('role', 'list');
  ctx.order.forEach((id, i) => ctx.listEl.appendChild(buildRow(ctx, id, i)));
}

/**
 * @param {HTMLElement} listEl  the <div role="list"> container
 * @param {(msg: string) => void} announce
 */
export function initSettingsSources(listEl, announce) {
  if (!listEl) return;
  const ctx = { listEl, announce, order: readOrder(), grabbed: null };
  render(ctx);
}
