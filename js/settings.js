import { COOKIE_NAME, STORAGE_KEY_WORKING_HOURS } from './config.js';
import { getCurrentUser } from './redmine-api.js';

// ── Working hours helpers ─────────────────────────────────────────

/** Read working hours from localStorage. Returns { start, end } or null. */
export function readWorkingHours() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WORKING_HOURS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.start && parsed?.end) return parsed;
    return null;
  } catch {
    return null;
  }
}

/** Write working hours to localStorage. */
export function writeWorkingHours(start, end) {
  localStorage.setItem(STORAGE_KEY_WORKING_HOURS, JSON.stringify({ start, end }));
}

/** Remove working hours from localStorage. */
export function clearWorkingHours() {
  localStorage.removeItem(STORAGE_KEY_WORKING_HOURS);
}

// ── Cookie helpers ────────────────────────────────────────────────

/**
 * Read config cookie.
 * Returns { redmineUrl, authType, apiKey?, username?, password? } or null.
 */
export function readConfig() {
  const match = document.cookie.split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(COOKIE_NAME + '='));
  if (!match) return null;
  try {
    const value = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
    const cfg = JSON.parse(value);
    if (!cfg || !cfg.redmineUrl) return null;
    if (cfg.authType === 'basic' && cfg.username && cfg.password) return cfg;
    if ((cfg.authType === 'apikey' || !cfg.authType) && cfg.apiKey) return cfg;
    return null;
  } catch {
    return null;
  }
}

/** Write config to a SameSite=Strict cookie with 1-year expiry. */
export function writeConfig(cfg) {
  const value = encodeURIComponent(JSON.stringify(cfg));
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${COOKIE_NAME}=${value}; expires=${expires}; path=/; SameSite=Strict`;
}

/** If no valid config cookie exists, redirect to settings.html. */
export function redirectToSettingsIfMissing() {
  if (!readConfig()) {
    window.location.href = 'settings.html';
  }
}

// ── Settings page wiring (only runs on settings.html) ────────────
if (document.getElementById('settings-form')) {
  const form        = document.getElementById('settings-form');
  const urlInput    = document.getElementById('redmineUrl');
  const apiKeyInput = document.getElementById('apiKey');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const fieldApiKey = document.getElementById('field-apikey');
  const fieldBasic  = document.getElementById('field-basic');
  const errorEl     = document.getElementById('settings-error');
  const workhoursErrorEl = document.getElementById('workhours-error');
  const expiredEl   = document.getElementById('settings-expired');
  const saveBtn     = document.getElementById('save-btn');
  const authRadios  = form.querySelectorAll('input[name="authType"]');
  const workStartInput = document.getElementById('workStart');
  const workEndInput   = document.getElementById('workEnd');

  // ── Toggle auth fields ─────────────────────────────────────────
  function updateAuthFields() {
    const type = form.querySelector('input[name="authType"]:checked').value;
    fieldApiKey.classList.toggle('hidden', type !== 'apikey');
    fieldBasic.classList.toggle('hidden', type !== 'basic');
  }
  authRadios.forEach(r => r.addEventListener('change', updateAuthFields));
  updateAuthFields();

  // ── Pre-fill from existing cookie ──────────────────────────────
  const existing = readConfig();
  if (existing) {
    urlInput.value = existing.redmineUrl;
    if (existing.authType === 'basic') {
      form.querySelector('input[value="basic"]').checked = true;
      usernameInput.value = existing.username ?? '';
      passwordInput.value = existing.password ?? '';
      updateAuthFields();
    } else {
      apiKeyInput.value = existing.apiKey ?? '';
    }
  }

  // ── Pre-fill working hours ─────────────────────────────────────
  const existingWH = readWorkingHours();
  if (existingWH) {
    workStartInput.value = existingWH.start;
    workEndInput.value   = existingWH.end;
  }

  // ── Expiry banner ──────────────────────────────────────────────
  if (new URLSearchParams(window.location.search).get('expired') === '1') {
    expiredEl.classList.remove('hidden');
  }

  // ── Submit ─────────────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');

    const redmineUrl = urlInput.value.trim().replace(/\/$/, '');
    const authType   = form.querySelector('input[name="authType"]:checked').value;

    if (!redmineUrl) {
      showError('Proxy URL is required.');
      return;
    }

    let cfg;
    if (authType === 'apikey') {
      const apiKey = apiKeyInput.value.trim();
      if (!apiKey) { showError('API key is required.'); return; }
      cfg = { redmineUrl, authType: 'apikey', apiKey };
    } else {
      const username = usernameInput.value.trim();
      const password = passwordInput.value;
      if (!username || !password) { showError('Username and password are required.'); return; }
      cfg = { redmineUrl, authType: 'basic', username, password };
    }

    // ── Working hours validation ───────────────────────────────
    workhoursErrorEl.classList.add('hidden');
    const workStart = workStartInput.value;
    const workEnd   = workEndInput.value;
    const bothEmpty = !workStart && !workEnd;
    const bothFilled = workStart && workEnd;

    if (!bothEmpty && !bothFilled) {
      workhoursErrorEl.textContent = 'Please fill in both start and end time, or leave both empty.';
      workhoursErrorEl.classList.remove('hidden');
      return;
    }
    if (bothFilled && workEnd <= workStart) {
      workhoursErrorEl.textContent = 'End time must be after start time.';
      workhoursErrorEl.classList.remove('hidden');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Connecting…';

    if (bothEmpty) {
      clearWorkingHours();
    } else {
      writeWorkingHours(workStart, workEnd);
    }

    writeConfig(cfg);

    try {
      await getCurrentUser();
      window.location.href = 'index.html';
    } catch (err) {
      // 403 means the server is reachable but blocks the /users/current endpoint
      // (common on demo instances). Save anyway and let the calendar validate.
      if (err.status === 403) {
        window.location.href = 'index.html';
        return;
      }
      errorEl.textContent = `Connection failed: ${err.message}`;
      errorEl.classList.remove('hidden');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save & Connect';
    }
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
  }
}
