import { STORAGE_KEY_WORKING_HOURS, STORAGE_KEY_WEEKLY_HOURS } from './config.js';
import { getCurrentUser, invalidateCredentialsCache } from './redmine-api.js';
import { t } from './i18n.js';
import {
  loadCentralConfig,
  writeCredentialsRaw,
  readCredentials,
  clearCredentials,
} from './config-store.js';
import { applyCorporateIdentity } from './branding.js';

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

// ── Weekly hours + holiday ticket helpers ────────────────────────

export function readWeeklyHours() {
  const val = localStorage.getItem(STORAGE_KEY_WEEKLY_HOURS);
  const num = val ? parseFloat(val) : NaN;
  return Number.isFinite(num) && num > 0 ? num : null;
}

export function writeWeeklyHours(hours) {
  localStorage.setItem(STORAGE_KEY_WEEKLY_HOURS, String(hours));
}

// ── Encrypted credential storage ──────────────────────────────────
// readCredentials / clearCredentials live in config-store.js (consumers
// should import them from there directly). writeCredentials lives here
// because it has a side effect (invalidate the API client's cred cache)
// that requires importing from redmine-api.js — only legal in the
// settings.js direction of the settings → redmine-api → config-store
// dependency chain.

export async function writeCredentials(creds) {
  invalidateCredentialsCache();
  await writeCredentialsRaw(creds);
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

function fillCredentialFields(form, els, existing) {
  els.apiKeyInput.value = existing.apiKey ?? '';
  els.usernameInput.value = existing.username ?? '';
  els.passwordInput.value = existing.password ?? '';
  const radio = form.querySelector(`input[value="${existing.authType}"]`);
  if (radio) radio.checked = true;
}

function prefillWorkingHours(workStartInput, workEndInput) {
  const existingWH = readWorkingHours();
  if (!existingWH) return;
  workStartInput.value = existingWH.start;
  workEndInput.value = existingWH.end;
}

function showWorkhoursError(workhoursErrorEl, key) {
  if (!workhoursErrorEl) return;
  workhoursErrorEl.textContent = t(key);
  workhoursErrorEl.classList.remove('hidden');
}

function validateWorkingHours(workStart, workEnd, workhoursErrorEl) {
  const bothEmpty = !workStart && !workEnd;
  const bothFilled = workStart && workEnd;

  if (!bothEmpty && !bothFilled) {
    showWorkhoursError(workhoursErrorEl, 'settings.hours_incomplete');
    return null;
  }
  if (bothFilled && workEnd <= workStart) {
    showWorkhoursError(workhoursErrorEl, 'settings.end_before_start');
    return null;
  }
  return { bothEmpty, bothFilled };
}

function persistWorkingHours(bothEmpty, workStart, workEnd) {
  if (bothEmpty) clearWorkingHours();
  else writeWorkingHours(workStart, workEnd);
  const weeklyHoursVal = /** @type {HTMLInputElement | null} */ (
    document.getElementById('weeklyHours')
  )?.value;
  if (weeklyHoursVal) writeWeeklyHours(parseFloat(weeklyHoursVal));
}

function connectionErrorMessage(err) {
  if (err.status === 401) return t('settings.invalid_credentials');
  if (err.status === 404) return t('settings.proxy_not_found');
  if (err.status === 503) return t('settings.server_unavailable');
  return t('settings.connection_failed', { message: err.message });
}

async function loadInitialSettings(els, showError) {
  let cfg;
  try {
    cfg = await loadCentralConfig();
  } catch (err) {
    if (els.configErrorEl) {
      els.configErrorEl.textContent = err.message;
      els.configErrorEl.classList.remove('hidden');
    }
    els.form.classList.add('hidden');
    return;
  }

  applyCorporateIdentity(document.documentElement, /** @type {any} */ (cfg));

  const redmineLink = /** @type {HTMLAnchorElement | null} */ (
    document.getElementById('redmine-account-link')
  );
  if (redmineLink && cfg.redmineServerUrl) {
    redmineLink.href = `${cfg.redmineServerUrl}/my/account`;
  }

  let existing = null;
  try {
    existing = await readCredentials();
  } catch {
    clearCredentials();
    showError(t('credentials.decrypt_failed'));
  }

  if (existing) {
    fillCredentialFields(els.form, els, existing);
    els.updateAuthFields();
  } else if (els.firstTimeBanner) {
    els.firstTimeBanner.classList.remove('hidden');
  }

  prefillWorkingHours(els.workStartInput, els.workEndInput);

  const weeklyHoursInput = /** @type {HTMLInputElement | null} */ (
    document.getElementById('weeklyHours')
  );
  const existingWeekly = readWeeklyHours();
  if (weeklyHoursInput && existingWeekly)
    /** @type {any} */ (weeklyHoursInput).value = existingWeekly;
}

function validateAuthInputs(els, authType, showError) {
  if (authType === 'apikey' && !els.apiKeyInput.value.trim()) {
    showError(t('settings.apikey_required'));
    return false;
  }
  if (authType === 'basic' && (!els.usernameInput.value.trim() || !els.passwordInput.value)) {
    showError(t('settings.credentials_required'));
    return false;
  }
  return true;
}

async function attemptConnection(els, creds) {
  els.saveBtn.disabled = true;
  els.saveBtn.textContent = t('settings.connecting');
  await writeCredentials(creds);

  try {
    await getCurrentUser();
    window.location.href = 'index.html';
  } catch (err) {
    clearCredentials();
    const msg = connectionErrorMessage(err);
    renderConnectionError(els.errorEl, msg, err.proxyUrl);
    els.errorEl.classList.remove('hidden');
    els.saveBtn.disabled = false;
    els.saveBtn.textContent = t('settings.save_btn');
  }
}

async function handleFormSubmit(e, els, showError) {
  e.preventDefault();
  els.errorEl.classList.add('hidden');

  const authType = els.form.querySelector('input[name="authType"]:checked').value;
  if (!validateAuthInputs(els, authType, showError)) return;

  if (els.workhoursErrorEl) els.workhoursErrorEl.classList.add('hidden');
  const workStart = els.workStartInput.value;
  const workEnd = els.workEndInput.value;
  const validation = validateWorkingHours(workStart, workEnd, els.workhoursErrorEl);
  if (!validation) return;

  persistWorkingHours(validation.bothEmpty, workStart, workEnd);

  const creds = {
    authType,
    apiKey: els.apiKeyInput.value.trim(),
    username: els.usernameInput.value.trim(),
    password: els.passwordInput.value,
  };
  await attemptConnection(els, creds);
}

// ── Settings page wiring (only runs on settings.html) ────────────
const _settingsForm = document.getElementById('settings-form');
if (_settingsForm) {
  const form = _settingsForm;
  const els = {
    form,
    apiKeyInput: document.getElementById('apiKey'),
    usernameInput: document.getElementById('username'),
    passwordInput: document.getElementById('password'),
    fieldApiKey: document.getElementById('field-apikey'),
    fieldBasic: document.getElementById('field-basic'),
    errorEl: document.getElementById('settings-error'),
    workhoursErrorEl: document.getElementById('workhours-error'),
    saveBtn: document.getElementById('save-btn'),
    workStartInput: document.getElementById('workStart'),
    workEndInput: document.getElementById('workEnd'),
    configErrorEl: document.getElementById('config-error'),
    firstTimeBanner: document.getElementById('first-time-banner'),
  };
  const authRadios = form.querySelectorAll('input[name="authType"]');

  function updateAuthFields() {
    const checked = /** @type {HTMLInputElement | null} */ (
      form.querySelector('input[name="authType"]:checked')
    );
    const type = checked?.value;
    if (!type) return;
    els.fieldApiKey?.classList.toggle('hidden', type !== 'apikey');
    els.fieldBasic?.classList.toggle('hidden', type !== 'basic');
  }
  els.updateAuthFields = updateAuthFields;
  authRadios.forEach((r) => r.addEventListener('change', updateAuthFields));
  updateAuthFields();

  function showError(msg) {
    if (!els.errorEl) return;
    els.errorEl.textContent = msg;
    els.errorEl.classList.remove('hidden');
  }

  loadInitialSettings(els, showError);
  form.addEventListener('submit', (e) => handleFormSubmit(e, els, showError));
}

function renderConnectionError(el, msg, url) {
  el.textContent = '';
  if (url && msg.includes(url)) {
    const idx = msg.indexOf(url);
    el.append(msg.slice(0, idx));
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = url;
    el.append(a);
    el.append(msg.slice(idx + url.length));
  } else {
    el.append(msg);
  }
}
