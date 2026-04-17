import { COOKIE_NAME, PROXY_PORT, STORAGE_KEY_WORKING_HOURS, AI_PROXY_PORT, AI_DEFAULT_MODEL } from './config.js';
import { getCurrentUser } from './redmine-api.js';
import { t }             from './i18n.js';

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
 * Returns { redmineUrl, redmineServerUrl?, authType, apiKey?, username?, password? } or null.
 * authType defaults to 'apikey' for backward compatibility with old cookies.
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
    const authType = cfg.authType || 'apikey';
    if (authType === 'basic' && cfg.username && cfg.password) return { ...cfg, authType };
    if (authType === 'apikey' && cfg.apiKey) return { ...cfg, authType };
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

/** Read AI chatbot config from cookie. Returns { aiApiKey, aiProxyPort, aiModel }. */
export function readAiConfig() {
  const match = document.cookie.split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(COOKIE_NAME + '='));
  if (!match) return { aiApiKey: '', aiProxyPort: AI_PROXY_PORT, aiModel: AI_DEFAULT_MODEL };
  try {
    const cfg = JSON.parse(decodeURIComponent(match.slice(COOKIE_NAME.length + 1)));
    return {
      aiApiKey:   cfg.aiApiKey   || '',
      aiProxyPort: cfg.aiProxyPort || AI_PROXY_PORT,
      aiModel:    cfg.aiModel    || AI_DEFAULT_MODEL,
    };
  } catch {
    return { aiApiKey: '', aiProxyPort: AI_PROXY_PORT, aiModel: AI_DEFAULT_MODEL };
  }
}

/** If no valid config cookie exists, redirect to settings.html. */
export function redirectToSettingsIfMissing() {
  if (!readConfig()) {
    window.location.href = 'settings.html';
  }
}

// ── Settings page wiring (only runs on settings.html) ────────────
if (document.getElementById('settings-form')) {
  const form             = document.getElementById('settings-form');
  const urlInput         = document.getElementById('redmineUrl');
  const serverUrlInput   = document.getElementById('redmineServerUrl');
  const proxyTip         = document.getElementById('proxy-tip');
  const apiKeyInput      = document.getElementById('apiKey');
  const usernameInput    = document.getElementById('username');
  const passwordInput    = document.getElementById('password');
  const fieldApiKey      = document.getElementById('field-apikey');
  const fieldBasic       = document.getElementById('field-basic');
  const errorEl          = document.getElementById('settings-error');
  const workhoursErrorEl = document.getElementById('workhours-error');
  const expiredEl        = document.getElementById('settings-expired');
  const saveBtn          = document.getElementById('save-btn');
  const authRadios       = form.querySelectorAll('input[name="authType"]');
  const workStartInput   = document.getElementById('workStart');
  const workEndInput     = document.getElementById('workEnd');
  const aiApiKeyInput    = document.getElementById('aiApiKey');
  const aiProxyPortInput = document.getElementById('aiProxyPort');
  const aiModelInput     = document.getElementById('aiModel');

  // ── Proxy command tip ──────────────────────────────────────────
  function updateProxyTip() {
    const serverUrl = serverUrlInput.value.trim();
    proxyTip.textContent = serverUrl
      ? `Start proxy: npx lcp --proxyUrl ${serverUrl} --port ${PROXY_PORT}`
      : '';
  }
  serverUrlInput.addEventListener('input', updateProxyTip);

  // ── Toggle auth fields ─────────────────────────────────────────
  function updateAuthFields() {
    const type = form.querySelector('input[name="authType"]:checked').value;
    fieldApiKey.classList.toggle('hidden', type !== 'apikey');
    fieldBasic.classList.toggle('hidden', type !== 'basic');
  }
  authRadios.forEach(r => r.addEventListener('change', updateAuthFields));
  updateAuthFields();

  // ── Pre-fill all fields from existing cookie ───────────────────
  const existing = readConfig();
  if (existing) {
    urlInput.value       = existing.redmineUrl;
    serverUrlInput.value = existing.redmineServerUrl ?? '';
    apiKeyInput.value    = existing.apiKey    ?? '';
    usernameInput.value  = existing.username  ?? '';
    passwordInput.value  = existing.password  ?? '';
    const radio = form.querySelector(`input[value="${existing.authType}"]`);
    if (radio) radio.checked = true;
    updateAuthFields();
    updateProxyTip();
  }

  // ── Pre-fill AI settings ────────────────────────────────────────
  const existingAi = readAiConfig();
  if (aiApiKeyInput)    aiApiKeyInput.value    = existingAi.aiApiKey    || '';
  if (aiProxyPortInput) aiProxyPortInput.value = existingAi.aiProxyPort || '';
  if (aiModelInput)     aiModelInput.value     = existingAi.aiModel     || '';

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

    const redmineUrl       = urlInput.value.trim().replace(/\/$/, '');
    const redmineServerUrl = serverUrlInput.value.trim().replace(/\/$/, '');
    const authType         = form.querySelector('input[name="authType"]:checked').value;

    if (!redmineUrl) {
      showError(t('settings.proxy_required'));
      return;
    }

    if (redmineServerUrl && !redmineServerUrl.startsWith('https://')) {
      showError(t('settings.server_url_https_required'));
      return;
    }

    // Per-mode required-field validation
    if (authType === 'apikey' && !apiKeyInput.value.trim()) {
      showError(t('settings.apikey_required'));
      return;
    }
    if (authType === 'basic' && (!usernameInput.value.trim() || !passwordInput.value)) {
      showError(t('settings.credentials_required'));
      return;
    }

    // Build config — ALL credentials stored regardless of active mode
    const cfg = {
      redmineUrl,
      redmineServerUrl,
      authType,
      apiKey:   apiKeyInput.value.trim(),
      username: usernameInput.value.trim(),
      password: passwordInput.value,
      aiApiKey:    aiApiKeyInput?.value.trim()    || '',
      aiProxyPort: parseInt(aiProxyPortInput?.value) || AI_PROXY_PORT,
      aiModel:     aiModelInput?.value.trim()      || AI_DEFAULT_MODEL,
    };

    // ── Working hours validation ───────────────────────────────
    workhoursErrorEl.classList.add('hidden');
    const workStart  = workStartInput.value;
    const workEnd    = workEndInput.value;
    const bothEmpty  = !workStart && !workEnd;
    const bothFilled = workStart && workEnd;

    if (!bothEmpty && !bothFilled) {
      workhoursErrorEl.textContent = t('settings.hours_incomplete');
      workhoursErrorEl.classList.remove('hidden');
      return;
    }
    if (bothFilled && workEnd <= workStart) {
      workhoursErrorEl.textContent = t('settings.end_before_start');
      workhoursErrorEl.classList.remove('hidden');
      return;
    }

    if (bothEmpty) {
      clearWorkingHours();
    } else {
      writeWorkingHours(workStart, workEnd);
    }

    // ── Verify credentials BEFORE persisting config ───────────
    saveBtn.disabled = true;
    saveBtn.textContent = t('settings.connecting');

    // Optimistic-write-then-restore: writeConfig() before verifying because
    // getCurrentUser() → request() → readConfig() reads credentials from the
    // cookie. On failure the previous config is restored, so bad credentials
    // never survive a page reload. This diverges from the plan's stated order
    // (write only after success) but achieves the same security invariant.
    const previousConfig = readConfig();
    writeConfig(cfg);

    try {
      await getCurrentUser();
      // Success: cfg is in cookie, navigate
      window.location.href = 'index.html';
    } catch (err) {
      // 403 means the server is reachable but /users/current is blocked on this instance.
      // Proceed to the calendar — the app can still function.
      if (err.status === 403) {
        window.location.href = 'index.html';
        return;
      }
      // Restore cookie to previous state — bad credentials must not persist
      if (previousConfig) {
        writeConfig(previousConfig);
      } else {
        document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`;
      }
      let msg;
      if (err.status === 401) {
        msg = t('settings.invalid_credentials');
      } else if (err.status === 404) {
        msg = t('settings.proxy_not_found');
      } else if (err.status === 503) {
        msg = t('settings.server_unavailable');
      } else {
        msg = t('settings.connection_failed', { message: err.message });
      }
      errorEl.textContent = msg;
      errorEl.classList.remove('hidden');
      saveBtn.disabled = false;
      saveBtn.textContent = t('settings.save_btn');
    }
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
  }
}
