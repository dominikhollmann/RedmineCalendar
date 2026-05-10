import { t } from './i18n.js';

let _version = null;

/**
 * Clear the cached version string. Used by tests.
 * @returns {void}
 */
export function resetVersionCache() {
  _version = null;
}

/**
 * Read `version.json` once per session and return the version string.
 * Falls back to `'dev'` if the file is missing or malformed.
 * @returns {Promise<string>}
 */
export async function getVersion() {
  if (_version) return _version;

  try {
    const response = await fetch('version.json');
    if (!response.ok) throw new Error();
    const data = await response.json();
    _version = data.version || 'dev';
  } catch {
    _version = 'dev';
  }

  return _version;
}

/**
 * Render the version label into the supplied element. No-op when null.
 * @param {Element|null|undefined} element
 * @returns {Promise<void>}
 */
export async function displayVersion(element) {
  if (!element) return;
  const version = await getVersion();
  element.textContent = `${t('version.label')}: ${version}`;
}
