// @ts-nocheck — DOM-heavy module; top-layer confirmation popup + clipboard handoff.
import { t } from './i18n.js';

/**
 * Decode a `data:image/png;base64,…` URL into a PNG Blob for the clipboard.
 * @param {string} dataUrl
 * @returns {Blob}
 */
function _dataUrlToPngBlob(dataUrl) {
  const b64 = dataUrl.split(',')[1] ?? '';
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: 'image/png' });
}

/**
 * Copy the captured screenshot to the clipboard as an image so the user can
 * paste it into the GitHub issue editor. Must be called from a user gesture.
 * @param {string} dataUrl
 * @returns {Promise<void>}
 */
async function _copyScreenshotToClipboard(dataUrl) {
  const blob = _dataUrlToPngBlob(dataUrl);
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

/**
 * Show a top-layer confirmation popup before opening the GitHub form when a
 * screenshot was captured: remind the user to paste it manually, copy it to the
 * clipboard on confirm. Resolves true to proceed, false if cancelled.
 * @param {string} dataUrl
 * @returns {Promise<boolean>}
 */
export function confirmScreenshotPaste(dataUrl) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'feedback-dialog feedback-screenshot-confirm';
    dlg.setAttribute('aria-modal', 'true');
    const h2 = document.createElement('h2');
    h2.textContent = t('feedback.github_screenshot_confirm_title');
    const msg = document.createElement('p');
    msg.textContent = t('feedback.github_screenshot_confirm_message');
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.className = 'btn-primary';
    okBtn.textContent = t('feedback.github_screenshot_confirm_ok');
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn-secondary';
    cancelBtn.textContent = t('feedback.cancel_btn');
    actions.appendChild(okBtn);
    actions.appendChild(cancelBtn);
    dlg.append(h2, msg, actions);
    document.body.appendChild(dlg);

    const done = (result) => {
      dlg.close();
      dlg.remove();
      resolve(result);
    };
    cancelBtn.addEventListener('click', () => done(false));
    dlg.addEventListener('cancel', (ev) => {
      ev.preventDefault();
      done(false);
    });
    okBtn.addEventListener('click', async () => {
      okBtn.disabled = true;
      try {
        await _copyScreenshotToClipboard(dataUrl);
      } catch {
        // Clipboard may be blocked (permissions / insecure context); the
        // in-issue manual-paste note remains as the fallback.
      }
      done(true);
    });

    dlg.showModal();
    requestAnimationFrame(() => okBtn.focus());
  });
}
