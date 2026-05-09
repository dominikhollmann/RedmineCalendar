// Notification surface — currently a single transient toast banner used to
// confirm successful user actions (entry saved, updated, deleted). Error
// messaging uses a separate persistent banner managed in calendar.js because
// its UX (retry button, dismissable) is intentionally different.

const TOAST_DURATION_MS = 3000;

/**
 * Show a transient confirmation toast (auto-hides after 3s).
 * @param {string} message
 * @returns {void}
 */
export function showToast(message) {
  const toastEl = document.getElementById('toast');
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  setTimeout(() => toastEl.classList.add('hidden'), TOAST_DURATION_MS);
}
