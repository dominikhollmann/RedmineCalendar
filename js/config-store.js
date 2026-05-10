// Config store: shared state for central config (config.json) and encrypted
// credentials. Extracted from settings.js to break the settings ↔ redmine-api
// import cycle (this module imports nothing from either, so both can read from
// it without forming a graph cycle).

import { encrypt, decrypt } from './crypto.js';
import { t } from './i18n.js';

/** @typedef {import('./types').CentralConfig} CentralConfig */
/** @typedef {import('./types').Credentials} Credentials */

const CREDENTIALS_KEY = 'redmine_calendar_credentials';

// ── Central configuration (config.json) ───────────────────────────

/** @type {CentralConfig|null} */
let _centralConfig = null;

/**
 * Fetch and cache the admin-managed `/config.json`. Subsequent calls return the
 * in-memory cache.
 * @returns {Promise<CentralConfig>}
 * @throws {Error} when the file is missing, malformed, or lacks `redmineUrl`.
 */
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

/**
 * Synchronously return the cached config (or null if not yet loaded).
 * @returns {CentralConfig|null}
 */
export function getCentralConfigSync() {
  return _centralConfig;
}

/**
 * Reset the in-memory config cache. Used by tests.
 * @returns {void}
 */
export function resetCentralConfigCache() {
  _centralConfig = null;
}

// ── Encrypted credential storage ──────────────────────────────────

/**
 * Read and decrypt the per-user credentials from localStorage.
 * @returns {Promise<Credentials|null>} `null` when no credentials are stored.
 * @throws {Error} when stored ciphertext cannot be decrypted.
 */
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

/**
 * Encrypt and persist credentials. Does NOT invalidate the redmine-api cache —
 * callers should use `writeCredentials` from `settings.js` for the high-level path.
 * @param {Credentials} creds
 * @returns {Promise<void>}
 */
export async function writeCredentialsRaw(creds) {
  const plaintext = JSON.stringify(creds);
  const envelope = await encrypt(plaintext);
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(envelope));
}

/**
 * Remove credentials from localStorage.
 * @returns {void}
 */
export function clearCredentials() {
  localStorage.removeItem(CREDENTIALS_KEY);
}
