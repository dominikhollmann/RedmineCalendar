// Feature 034 / US1: renders the in-app Open-Source Licenses page.
// Fetches attributions.json (produced by scripts/oss-generate.mjs) and
// renders the runtime open-source libraries the app ships with as an
// accessible <table>. Page chrome is localised via i18n.js; library
// metadata is shown verbatim (FR-004).

import { t } from './i18n.js';

/**
 * Escape a string for safe insertion into an HTML attribute or text node.
 * Used because attributions.json entries are produced by a generator that
 * reads upstream package metadata — verbatim text we did not author and
 * cannot trust.
 * @param {string} s
 * @returns {string}
 */
export function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render the attributions list into a fully-formed accessible HTML table.
 * Pure function — no DOM access. Tests cover empty/single/null-copyright
 * shapes and HTML escaping of every user-displayed field.
 *
 * @param {{entries: Array<{name:string,version:string,license:string,homepageUrl:string,copyright:string|null,supplier:string}>}} attributions
 * @returns {string} HTML markup for a single <table> element.
 */
export function renderAttributionsTable(attributions) {
  const entries = (attributions && attributions.entries) || [];
  const hasCopyright = entries.some((e) => e.copyright != null);
  const headers = [
    `<th scope="col">${escapeHtml(t('licenses.col.name'))}</th>`,
    `<th scope="col">${escapeHtml(t('licenses.col.version'))}</th>`,
    `<th scope="col">${escapeHtml(t('licenses.col.license'))}</th>`,
    `<th scope="col">${escapeHtml(t('licenses.col.homepage'))}</th>`,
  ];
  if (hasCopyright) {
    headers.push(`<th scope="col">${escapeHtml(t('licenses.col.copyright'))}</th>`);
  }

  const rows = entries.map((e) => {
    const cells = [
      `<td>${escapeHtml(e.name)}</td>`,
      `<td>${escapeHtml(e.version)}</td>`,
      `<td>${escapeHtml(e.license)}</td>`,
      `<td><a href="${escapeHtml(e.homepageUrl)}" rel="noopener noreferrer" target="_blank">${escapeHtml(e.homepageUrl)}</a></td>`,
    ];
    if (hasCopyright) {
      cells.push(`<td>${escapeHtml(e.copyright || '')}</td>`);
    }
    return `<tr>${cells.join('')}</tr>`;
  });

  return [
    '<table class="licenses-table">',
    `<thead><tr>${headers.join('')}</tr></thead>`,
    `<tbody>${rows.join('')}</tbody>`,
    '</table>',
  ].join('');
}

/**
 * Wire the rendered table into the static page shell. Calls fetch() to load
 * attributions.json. Surfaces an i18n error message on fetch failure (network
 * down, file missing, etc.).
 * @returns {Promise<void>}
 */
export async function bootstrapLicensesPage() {
  // Localised page chrome.
  const titleEl = document.getElementById('licenses-heading');
  if (titleEl) titleEl.textContent = t('licenses.title');
  const backEl = document.getElementById('licenses-back');
  if (backEl) backEl.textContent = t('licenses.back');
  const introEl = document.getElementById('licenses-intro');
  if (introEl) introEl.textContent = t('licenses.intro');
  const tabTitleEl = document.querySelector('title');
  if (tabTitleEl) tabTitleEl.textContent = t('licenses.title');

  const wrap = document.getElementById('licenses-table-wrap');
  const errorEl = document.getElementById('licenses-error');
  try {
    const res = await fetch('attributions.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const attributions = await res.json();
    if (wrap) wrap.innerHTML = renderAttributionsTable(attributions);
    if (errorEl) errorEl.classList.add('hidden');
  } catch {
    if (errorEl) {
      errorEl.textContent = t('licenses.error');
      errorEl.classList.remove('hidden');
    }
  }
}

/* c8 ignore start — browser auto-bootstrap path. The licenses-table-wrap
   element only exists on licenses.html, so this branch is unreachable in
   Vitest (jsdom-less); the Playwright UI test exercises it end-to-end. */
if (typeof document !== 'undefined' && document.getElementById?.('licenses-table-wrap')) {
  if (document.readyState !== 'loading') bootstrapLicensesPage();
  else document.addEventListener('DOMContentLoaded', bootstrapLicensesPage);
}
/* c8 ignore stop */
