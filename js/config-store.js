// Config store: shared state for central config (config.json) and encrypted
// credentials. Extracted from settings.js to break the settings ↔ redmine-api
// import cycle (this module imports nothing from either, so both can read from
// it without forming a graph cycle).

import { encrypt, decrypt } from './crypto.js';
import { t } from './i18n.js';

const CREDENTIALS_KEY = 'redmine_calendar_credentials';

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

export function resetCentralConfigCache() {
  _centralConfig = null;
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

export async function writeCredentialsRaw(creds) {
  const plaintext = JSON.stringify(creds);
  const envelope = await encrypt(plaintext);
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(envelope));
}

export function clearCredentials() {
  localStorage.removeItem(CREDENTIALS_KEY);
}
