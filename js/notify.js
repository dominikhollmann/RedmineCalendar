// Notification surface — currently a single transient toast banner used to
// confirm successful user actions (entry saved, updated, deleted). Error
// messaging uses a separate persistent banner managed in calendar.js because
// its UX (retry button, dismissable) is intentionally different.

const TOAST_DURATION_MS = 3000;

/**
 * Show a transient confirmation toast (auto-hides after 3s). When `href` is
 * supplied the message is rendered as a clickable link (opens in a new tab) —
 * used for the feedback ticket-created toast (feature 049). The link is built
 * with DOM APIs (no innerHTML) so the message text cannot inject markup.
 * @param {string} message
 * @param {{ href?: string }} [opts]
 * @returns {void}
 */
export function showToast(message, opts = {}) {
  const toastEl = document.getElementById('toast');
  /* c8 ignore next — tests always provide a #toast stub; null path is a
     production safety guard for pages that omit the element. */
  if (!toastEl) return;
  if (opts.href) {
    toastEl.replaceChildren();
    const link = document.createElement('a');
    link.href = opts.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = message;
    toastEl.appendChild(link);
  } else {
    toastEl.textContent = message;
  }
  toastEl.classList.remove('hidden');
  setTimeout(() => toastEl.classList.add('hidden'), TOAST_DURATION_MS);
}
