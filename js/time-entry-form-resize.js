// @ts-nocheck — browser-only DOM/layout glue (window/ResizeObserver). Extracted
// from time-entry-form-view.js (UAT follow-up on feature 055) to keep both
// modules under the module-size gate; see the Complexity Tracking table in
// specs/055-booking-modal-redesign/plan.md for why a new module file was
// accepted here despite the original plan avoiding one. Owns the booking
// modal's resize + position (drag and centering) glue; the size clamp/read/
// write logic is unit-tested in time-entry-form-utils.test.js
// (clampModalSize/getModalSize/setModalSize); the wiring here is exercised by
// the Playwright resize/drag specs (tests/ui/booking-modal.spec.js).
import { getModalSize, setModalSize, clampModalSize } from './time-entry-form-utils.js';

/** @type {ResizeObserver|null} */
let _resizeObserver = null;
/** @type {ReturnType<typeof setTimeout>|undefined} */
let _resizeTimer;
/** @type {(() => void) | null} */
let _onWindowResize = null;
/** @type {WeakSet<HTMLElement>} */
const _dragWired = new WeakSet();

/* c8 ignore start */
/** Restore the persisted size, center, wire header-dragging, then watch for
 * further resizes. Called on every modal open. */
export function mountResize(card) {
  applyPersistedSize(card);
  centerCard(card);
  enableHeaderDrag(card);
  observeResize(card);
  _onWindowResize = () => centerCard(card);
  window.addEventListener?.('resize', _onWindowResize);
}

/** Header-drag repositioning via the same margin model as centerCard(), using
 * pointer capture so drag state needs no document-level listeners/cleanup. Not
 * persisted — reopening always re-centers. Idempotent per header element,
 * since mountResize() re-runs on every open but the card DOM is reused. */
function enableHeaderDrag(card) {
  const header = card?.querySelector('.lean-header');
  if (!header || _dragWired.has(header)) return;
  _dragWired.add(header);
  let startX, startY, startLeft, startTop;
  header.addEventListener('pointerdown', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    if (e.button !== 0 || target.closest('#lean-close')) return;
    header.setPointerCapture(e.pointerId);
    startX = e.clientX;
    startY = e.clientY;
    startLeft = parseFloat(card.style.marginLeft) || 0;
    startTop = parseFloat(card.style.marginTop) || 0;
  });
  header.addEventListener('pointermove', (e) => {
    if (!header.hasPointerCapture(e.pointerId)) return;
    card.style.marginLeft = `${startLeft + (e.clientX - startX)}px`;
    card.style.marginTop = `${startTop + (e.clientY - startY)}px`;
  });
}

/** Centers the card via a static margin instead of flex auto-centering (see the
 * `.lean-overlay` CSS comment). Skipped on the mobile sheet layout (no resize). */
function centerCard(card) {
  if (!Number.isFinite(window.innerWidth) || window.innerWidth <= 767) return;
  const left = Math.max(0, (window.innerWidth - card.offsetWidth) / 2);
  const top = Math.max(0, (window.innerHeight - card.offsetHeight) / 2);
  card.style.marginLeft = `${left}px`;
  card.style.marginTop = `${top}px`;
}

/** Apply the persisted modal size (clamped to the viewport) to the card. */
function applyPersistedSize(card) {
  const stored = getModalSize();
  if (!stored) return;
  const { w, h } = clampModalSize(stored, { w: window.innerWidth, h: window.innerHeight });
  card.style.width = `${w}px`;
  card.style.height = `${h}px`;
}

/** Persist the card's size once a resize settles (debounced), clamped to bounds. */
function observeResize(card) {
  if (typeof ResizeObserver === 'undefined') return;
  // Skip the initial observation (fires on observe() with the current size) so
  // we only persist sizes the user actually dragged to.
  let first = true;
  _resizeObserver = new ResizeObserver(() => {
    if (first) {
      first = false;
      return;
    }
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => {
      const size = clampModalSize(
        { w: card.offsetWidth, h: card.offsetHeight },
        { w: window.innerWidth, h: window.innerHeight }
      );
      setModalSize(size);
    }, 300);
  });
  _resizeObserver.observe(card);
}

/** Stop observing + clear any pending persist timer (called on modal close). */
export function teardownResize() {
  if (_resizeObserver) {
    _resizeObserver.disconnect();
    _resizeObserver = null;
  }
  clearTimeout(_resizeTimer);
  window.removeEventListener?.('resize', _onWindowResize);
  _onWindowResize = null;
}
/* c8 ignore stop */
