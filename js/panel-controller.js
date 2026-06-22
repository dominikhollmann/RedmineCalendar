// Shared slide-in side-panel controller. The chatbot panel and the docs panel
// had byte-identical close-tail, resize-handle, and Escape-to-close wiring
// (feature 048 — clones #9/#12/#13). These helpers are the single source for
// that wiring; each panel injects its own selectors + open-state accessor.
//
// Both panels are pure `transform: translateX` overlays. The former
// `--chatbot-panel-w` CSS variable was vestigial (written, never read by any
// CSS/JS) and was removed during this unification.

/**
 * Close-tail shared by every panel: drop the open class, then hide the panel
 * (`hidden` attribute) after the 0.3s slide-out transition — unless it was
 * reopened in the meantime (checked via `isOpen` at timeout-fire time).
 * @param {HTMLElement} panel
 * @param {string} openClass  e.g. 'chatbot-panel--open'
 * @param {() => boolean} isOpen  live open-state accessor
 */
export function hidePanelAfterClose(panel, openClass, isOpen) {
  panel.classList.remove(openClass);
  setTimeout(() => {
    if (!isOpen()) panel.setAttribute('hidden', '');
  }, 300);
}

/**
 * Wire Escape-to-close on the document for a panel.
 * @param {() => boolean} isOpen
 * @param {() => void} close
 */
export function wireEscapeToClose(isOpen, close) {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) close();
  });
}

/**
 * Install the drag-to-resize behaviour for a left-edge resize handle. Width is
 * clamped between `minWidth` and 90% of the viewport. No-op when the handle is
 * absent.
 * @param {object} opts
 * @param {string} opts.handleSelector  e.g. '.chatbot-panel__resize'
 * @param {() => HTMLElement|null} opts.getPanel
 * @param {number} [opts.minWidth]
 */
export function installPanelResizer({ handleSelector, getPanel, minWidth = 280 }) {
  const handle = document.querySelector(handleSelector);
  if (!handle) return;
  let dragging = false;
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    dragging = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const panel = getPanel();
    if (!panel) return;
    const width = window.innerWidth - e.clientX;
    panel.style.width = Math.max(minWidth, Math.min(width, window.innerWidth * 0.9)) + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });
}
