import { COOKIE_NAME } from './config.js';
import { getCurrentUser } from './redmine-api.js';

// ── Cookie helpers ────────────────────────────────────────────────

/** Read config cookie. Returns { redmineUrl, apiKey } or null. */
export function readConfig() {
  const match = document.cookie.split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(COOKIE_NAME + '='));
  if (!match) return null;
  try {
    const value = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
    const cfg = JSON.parse(value);
    if (cfg && cfg.redmineUrl && cfg.apiKey) return cfg;
    return null;
  } catch {
    return null;
  }
}

/** Write config to cookie with 1-year expiry (SameSite=Strict). */
export function writeConfig(redmineUrl, apiKey) {
  const value = encodeURIComponent(JSON.stringify({ redmineUrl, apiKey }));
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${COOKIE_NAME}=${value}; expires=${expires}; path=/; SameSite=Strict`;
}

/** If no config cookie present, redirect to settings.html immediately. */
export function redirectToSettingsIfMissing() {
  if (!readConfig()) {
    window.location.href = 'settings.html';
  }
}

// ── Settings page wiring (only runs on settings.html) ────────────
if (document.getElementById('settings-form')) {
  const form        = document.getElementById('settings-form');
  const urlInput    = document.getElementById('redmineUrl');
  const keyInput    = document.getElementById('apiKey');
  const errorEl     = document.getElementById('settings-error');
  const expiredEl   = document.getElementById('settings-expired');
  const saveBtn     = document.getElementById('save-btn');

  // Pre-fill from existing cookie
  const existing = readConfig();
  if (existing) {
    urlInput.value = existing.redmineUrl;
    keyInput.value = existing.apiKey;
  }

  // Show expiry banner if redirected with ?expired=1
  if (new URLSearchParams(window.location.search).get('expired') === '1') {
    expiredEl.classList.remove('hidden');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');

    const redmineUrl = urlInput.value.trim().replace(/\/$/, '');
    const apiKey     = keyInput.value.trim();

    if (!redmineUrl || !apiKey) {
      errorEl.textContent = 'Both fields are required.';
      errorEl.classList.remove('hidden');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Connecting…';

    // Temporarily write so getCurrentUser() can use it
    writeConfig(redmineUrl, apiKey);

    try {
      await getCurrentUser();
      window.location.href = 'index.html';
    } catch (err) {
      errorEl.textContent = `Connection failed: ${err.message}`;
      errorEl.classList.remove('hidden');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save & Connect';
    }
  });
}
