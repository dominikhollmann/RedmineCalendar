import { invalidateCredentialsCache } from './redmine-api.js';
import { t } from './i18n.js';
import {
  loadCentralConfig,
  writeCredentialsRaw,
  readCredentials,
  clearCredentials,
} from './config-store.js';
import { applyCorporateIdentity } from './branding.js';
import {
  readWorkingHours,
  writeWorkingHours,
  clearWorkingHours,
  readWeeklyHours,
  writeWeeklyHours,
} from './working-hours.js';

export {
  readWorkingHours,
  writeWorkingHours,
  clearWorkingHours,
  readWeeklyHours,
  writeWeeklyHours,
};

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

// ── Credential-field helpers (consumed by settings-page.js) ───────

/**
 * Fill the credential inputs and the auth-type radio from stored creds.
 * @param {{apiKeyInput: HTMLInputElement, usernameInput: HTMLInputElement, passwordInput: HTMLInputElement}} els
 * @param {{apiKey?: string, username?: string, password?: string, authType?: string}} existing
 */
export function fillCredentialFields(els, existing) {
  els.apiKeyInput.value = existing.apiKey ?? '';
  els.usernameInput.value = existing.username ?? '';
  els.passwordInput.value = existing.password ?? '';
  const radio = document.querySelector(`input[name="authType"][value="${existing.authType}"]`);
  /* c8 ignore next */ if (radio) /** @type {HTMLInputElement} */ (radio).checked = true;
}

/** Currently-selected auth method. @returns {'apikey'|'basic'} */
export function getAuthType() {
  const checked = /** @type {HTMLInputElement | null} */ (
    document.querySelector('input[name="authType"]:checked')
  );
  return checked?.value === 'basic' ? 'basic' : 'apikey';
}

/**
 * Show the field group matching the active auth method.
 * @param {{fieldApiKey: HTMLElement|null, fieldBasic: HTMLElement|null}} els
 */
export function updateAuthFields(els) {
  const type = getAuthType();
  els.fieldApiKey?.classList.toggle('hidden', type !== 'apikey');
  els.fieldBasic?.classList.toggle('hidden', type !== 'basic');
}

/**
 * Read credentials from the form inputs.
 * @param {{apiKeyInput: HTMLInputElement, usernameInput: HTMLInputElement, passwordInput: HTMLInputElement}} els
 */
export function readCredsFromForm(els) {
  return {
    authType: getAuthType(),
    apiKey: els.apiKeyInput.value.trim(),
    username: els.usernameInput.value.trim(),
    password: els.passwordInput.value,
  };
}

/**
 * Validate that the active auth method has its required fields.
 * @returns {boolean}
 */
export function hasRequiredCreds(els) {
  const type = getAuthType();
  if (type === 'apikey') return !!els.apiKeyInput.value.trim();
  return !!els.usernameInput.value.trim() && !!els.passwordInput.value;
}

// ── Working-hours validation + persistence ────────────────────────

function showWorkhoursError(workhoursErrorEl, key) {
  if (!workhoursErrorEl) return;
  workhoursErrorEl.textContent = t(key);
  workhoursErrorEl.classList.remove('hidden');
}

/**
 * @returns {{bothEmpty: boolean, bothFilled: boolean}|null} null on invalid
 */
export function validateWorkingHours(workStart, workEnd, workhoursErrorEl) {
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

/**
 * Validate the weekly-hours field (0 < value ≤ 60). Shows an inline error and
 * returns null on invalid; otherwise returns the parsed value.
 * @param {HTMLElement|null} weeklyHoursErrorEl
 * @returns {number|null}
 */
export function validateWeeklyHours(weeklyHoursErrorEl) {
  const raw = /** @type {HTMLInputElement | null} */ (
    document.getElementById('weeklyHours')
  )?.value?.trim();
  const parsed = parseFloat(raw ?? '');
  const tooHigh = Number.isFinite(parsed) && parsed > 60;
  if (!raw || !Number.isFinite(parsed) || parsed <= 0 || tooHigh) {
    if (weeklyHoursErrorEl) {
      weeklyHoursErrorEl.textContent = t(
        tooHigh ? 'settings.weekly_hours_too_high' : 'settings.weekly_hours_invalid'
      );
      weeklyHoursErrorEl.classList.remove('hidden');
    }
    return null;
  }
  return parsed;
}

/**
 * Persist working-hours start/end (or clear) plus weekly hours.
 * @param {boolean} bothEmpty
 */
export function persistWorkingHours(bothEmpty, workStart, workEnd, weeklyHours) {
  if (bothEmpty) clearWorkingHours();
  else writeWorkingHours(workStart, workEnd);
  if (weeklyHours != null) writeWeeklyHours(weeklyHours);
}

// ── Initial load: central config + branding + credential prefill ──

/**
 * Load central config, apply branding, prefill credentials + working hours.
 * Returns `{ ok, hasCreds }`. On config failure the caller shows the config
 * error and hides the cards.
 * @param {object} els
 * @param {(msg: string) => void} showError
 * @returns {Promise<{ok: boolean, hasCreds: boolean}>}
 */
export async function loadInitialSettings(els, showError) {
  let cfg;
  try {
    cfg = await loadCentralConfig();
  } catch (err) {
    if (els.configErrorEl) {
      els.configErrorEl.textContent = err.message;
      els.configErrorEl.classList.remove('hidden');
    }
    // Config is a hard failure — hide the cards + sticky footer but keep the
    // error banner (which lives inside the card column) visible.
    document.querySelectorAll('.settings-section').forEach((s) => s.classList.add('hidden'));
    document.querySelector('.settings-sticky-footer')?.classList.add('hidden');
    return { ok: false, hasCreds: false };
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
    fillCredentialFields(els, existing);
    updateAuthFields(els);
  } else if (els.firstTimeBanner) {
    els.firstTimeBanner.classList.remove('hidden');
  }

  els.workStartInput.value = readWorkingHours().start;
  els.workEndInput.value = readWorkingHours().end;
  const weeklyHoursInput = /** @type {HTMLInputElement | null} */ (
    document.getElementById('weeklyHours')
  );
  if (weeklyHoursInput) weeklyHoursInput.value = String(readWeeklyHours());

  return { ok: true, hasCreds: !!existing };
}
