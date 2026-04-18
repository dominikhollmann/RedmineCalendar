import { t } from './i18n.js';

let _version = null;

export function resetVersionCache() {
  _version = null;
}

export async function getVersion() {
  if (_version) return _version;

  try {
    const base = document.querySelector('base')?.href || window.location.pathname.replace(/\/[^/]*$/, '/');
    const response = await fetch(new URL('version.json', base));
    if (!response.ok) throw new Error();
    const data = await response.json();
    _version = data.version || 'dev';
  } catch {
    _version = 'dev';
  }

  return _version;
}

export async function displayVersion(element) {
  if (!element) return;
  const version = await getVersion();
  element.textContent = `${t('version.label')}: ${version}`;
}
