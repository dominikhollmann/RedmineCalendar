import { STORAGE_KEY_WORKING_HOURS } from './config.js';
import { getCurrentUser, invalidateCredentialsCache } from './redmine-api.js';
import { encrypt, decrypt } from './crypto.js';
import { t } from './i18n.js';

const CREDENTIALS_KEY = 'redmine_calendar_credentials';

// ── Working hours helpers ─────────────────────────────────────────

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

export function writeWorkingHours(start, end) {
  localStorage.setItem(STORAGE_KEY_WORKING_HOURS, JSON.stringify({ start, end }));
}

export function clearWorkingHours() {
  localStorage.removeItem(STORAGE_KEY_WORKING_HOURS);
}

// ── Central configuration (config.json) ───────────────────────────

let _centralConfig = null;

export async function loadCentralConfig() {
  if (_centralConfig) return _centralConfig;

  let response;
  try {
    response = await fetch('/config.json');
  } catch {
    throw new Error(t('config.missing'));
  }

  if (!response.ok) {
    throw new Error(t('config.missing'));
  }

  let cfg;
  try {
    cfg = await response.json();
  } catch {
    throw new Error(t('config.malformed'));
  }

  if (!cfg.redmineUrl) {
    throw new Error(t('config.missing_field', { field: 'redmineUrl' }));
  }

  _centralConfig = cfg;
  return cfg;
}

export function getCentralConfigSync() {
  return _centralConfig;
}

// ── Encrypted credential storage ──────────────────────────────────

export async function readCredentials() {
  const raw = localStorage.getItem(CREDENTIALS_KEY);
  if (!raw) return null;

  try {
    const envelope = JSON.parse(raw);
    const plaintext = await decrypt(envelope);
    const creds = JSON.parse(plaintext);
    if (!creds) return null;
    const authType = creds.authType || 'apikey';
    if (authType === 'basic' && creds.username && creds.password) return { ...creds, authType };
    if (authType === 'apikey' && creds.apiKey) return { ...creds, authType };
    return null;
  } catch {
    throw new Error(t('credentials.decrypt_failed'));
  }
}

export async function writeCredentials(creds) {
  invalidateCredentialsCache();
  const plaintext = JSON.stringify(creds);
  const envelope = await encrypt(plaintext);
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(envelope));
}

export function clearCredentials() {
  localStorage.removeItem(CREDENTIALS_KEY);
}

export async function redirectToSettingsIfMissing() {
  try {
    await loadCentralConfig();
  } catch {
    window.location.href = 'settings.html';
    return;
  }

  try {
    const creds = await readCredentials();
    if (!creds) {
      window.location.href = 'settings.html';
    }
  } catch {
    window.location.href = 'settings.html';
  }
}

// ── Settings page wiring (only runs on settings.html) ────────────
if (document.getElementById('settings-form')) {
  const form             = document.getElementById('settings-form');
  const apiKeyInput      = document.getElementById('apiKey');
  const usernameInput    = document.getElementById('username');
  const passwordInput    = document.getElementById('password');
  const fieldApiKey      = document.getElementById('field-apikey');
  const fieldBasic       = document.getElementById('field-basic');
  const errorEl          = document.getElementById('settings-error');
  const workhoursErrorEl = document.getElementById('workhours-error');
  const saveBtn          = document.getElementById('save-btn');
  const authRadios       = form.querySelectorAll('input[name="authType"]');
  const workStartInput   = document.getElementById('workStart');
  const workEndInput     = document.getElementById('workEnd');
  const configErrorEl    = document.getElementById('config-error');
  const adminInfoEl      = document.getElementById('admin-info');
  const firstTimeBanner  = document.getElementById('first-time-banner');

  function updateAuthFields() {
    const type = form.querySelector('input[name="authType"]:checked').value;
    fieldApiKey.classList.toggle('hidden', type !== 'apikey');
    fieldBasic.classList.toggle('hidden', type !== 'basic');
  }
  authRadios.forEach(r => r.addEventListener('change', updateAuthFields));
  updateAuthFields();

  // ── Load central config + credentials ───────────────────────
  (async () => {
    let cfg;
    try {
      cfg = await loadCentralConfig();
    } catch (err) {
      if (configErrorEl) {
        configErrorEl.textContent = err.message;
        configErrorEl.classList.remove('hidden');
      }
      form.classList.add('hidden');
      return;
    }

    // Display admin-managed settings as read-only
    if (adminInfoEl) {
      const items = [];
      items.push(`${t('admin.redmine_url')}: ${cfg.redmineUrl}`);
      if (cfg.aiProvider) items.push(`${t('admin.ai_provider')}: ${cfg.aiProvider}`);
      if (cfg.aiModel) items.push(`${t('admin.ai_model')}: ${cfg.aiModel}`);
      adminInfoEl.innerHTML = `<h2 class="form-section-heading">${t('admin.heading')}</h2>`
        + items.map(i => `<p class="admin-config-item">${i}</p>`).join('');
      adminInfoEl.classList.remove('hidden');
    }

    // Set Redmine account link
    const redmineLink = document.getElementById('redmine-account-link');
    if (redmineLink && cfg.redmineServerUrl) {
      redmineLink.href = `${cfg.redmineServerUrl}/my/account`;
    }

    // Load existing credentials
    let existing = null;
    try {
      existing = await readCredentials();
    } catch {
      clearCredentials();
      showError(t('credentials.decrypt_failed'));
    }

    if (existing) {
      apiKeyInput.value    = existing.apiKey    ?? '';
      usernameInput.value  = existing.username  ?? '';
      passwordInput.value  = existing.password  ?? '';
      const radio = form.querySelector(`input[value="${existing.authType}"]`);
      if (radio) radio.checked = true;
      updateAuthFields();
    } else if (firstTimeBanner) {
      firstTimeBanner.classList.remove('hidden');
    }

    // Pre-fill working hours
    const existingWH = readWorkingHours();
    if (existingWH) {
      workStartInput.value = existingWH.start;
      workEndInput.value   = existingWH.end;
    }
  })();

  // ── Form submit ────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');

    const authType = form.querySelector('input[name="authType"]:checked').value;

    if (authType === 'apikey' && !apiKeyInput.value.trim()) {
      showError(t('settings.apikey_required'));
      return;
    }
    if (authType === 'basic' && (!usernameInput.value.trim() || !passwordInput.value)) {
      showError(t('settings.credentials_required'));
      return;
    }

    // Working hours validation
    if (workhoursErrorEl) workhoursErrorEl.classList.add('hidden');
    const workStart  = workStartInput.value;
    const workEnd    = workEndInput.value;
    const bothEmpty  = !workStart && !workEnd;
    const bothFilled = workStart && workEnd;

    if (!bothEmpty && !bothFilled) {
      if (workhoursErrorEl) {
        workhoursErrorEl.textContent = t('settings.hours_incomplete');
        workhoursErrorEl.classList.remove('hidden');
      }
      return;
    }
    if (bothFilled && workEnd <= workStart) {
      if (workhoursErrorEl) {
        workhoursErrorEl.textContent = t('settings.end_before_start');
        workhoursErrorEl.classList.remove('hidden');
      }
      return;
    }

    if (bothEmpty) {
      clearWorkingHours();
    } else {
      writeWorkingHours(workStart, workEnd);
    }

    const creds = {
      authType,
      apiKey:   apiKeyInput.value.trim(),
      username: usernameInput.value.trim(),
      password: passwordInput.value,
    };

    saveBtn.disabled = true;
    saveBtn.textContent = t('settings.connecting');

    await writeCredentials(creds);

    try {
      await getCurrentUser();
      window.location.href = 'index.html';
    } catch (err) {
      clearCredentials();
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
