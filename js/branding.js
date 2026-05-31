// ── Corporate-identity overlay (feature 031) ──────────────────────
// Pure helper: validate the four optional admin-supplied CI fields and
// apply each valid one as a CSS variable on the given root element +
// update the logo <img>. Invalid fields are skipped with one warning each.
// No fetch, no localStorage, no Date.now.
//
// Validation regexes (per research.md §R4) intentionally strict —
// admin-supplied values are still untrusted per Constitution Principle V.

const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;
const FONT_RE = /^[\w\s,'"-]+$/;
const FONT_MAX = 200;

/**
 * @typedef {Object} CorporateIdentity
 * @property {string} [brandPrimary]
 * @property {string} [brandAccent]
 * @property {string} [brandLogoUrl]
 * @property {string} [brandFontFamily]
 */

function isValidHex(v) {
  return typeof v === 'string' && HEX_RE.test(v);
}
function isValidHttpsUrl(v) {
  return typeof v === 'string' && (v.startsWith('https://') || v.startsWith('/'));
}
function isValidFontFamily(v) {
  return typeof v === 'string' && v.length > 0 && v.length <= FONT_MAX && FONT_RE.test(v);
}

/**
 * Returns true iff at least one field is present AND valid.
 * @param {CorporateIdentity | null | undefined} ci
 * @returns {boolean}
 */
export function isValidCi(ci) {
  if (!ci || typeof ci !== 'object') return false;
  if (isValidHex(ci.brandPrimary)) return true;
  if (isValidHex(ci.brandAccent)) return true;
  if (isValidHttpsUrl(ci.brandLogoUrl)) return true;
  if (isValidFontFamily(ci.brandFontFamily)) return true;
  return false;
}

/**
 * Apply or clear one `--ci-*` variable based on the field's value and validator.
 * @param {HTMLElement} rootEl
 * @param {string} varName
 * @param {string | undefined} value
 * @param {(v: string) => boolean} validator
 * @param {string} warnLabel
 */
function applyVar(rootEl, varName, value, validator, warnLabel) {
  if (value === undefined) {
    rootEl.style.removeProperty(varName);
    return;
  }
  if (validator(value)) {
    rootEl.style.setProperty(varName, value);
    return;
  }
  console.warn(`[branding] invalid ${warnLabel}; falling back to design-system default`);
  rootEl.style.removeProperty(varName);
}

function applyLogo(url) {
  const logo = /** @type {HTMLImageElement | null} */ (
    typeof document !== 'undefined' && document.querySelector
      ? document.querySelector('.brand-logo')
      : null
  );
  if (!logo) return;
  if (url === undefined) {
    logo.removeAttribute('src');
    logo.hidden = true;
    return;
  }
  if (isValidHttpsUrl(url)) {
    logo.src = url;
    logo.hidden = false;
    return;
  }
  console.warn('[branding] invalid brandLogoUrl; logo hidden');
  logo.removeAttribute('src');
  logo.hidden = true;
}

/**
 * Validate each field; for valid fields, set the corresponding `--ci-*`
 * variable on `rootEl` and update the brand-logo <img>. For invalid
 * fields, log one warning per field and skip. Missing fields are silent.
 *
 * Calling with an empty object (or `null`) clears all `--ci-*` variables
 * and hides the logo — idempotent reset.
 *
 * @param {HTMLElement | null | undefined} rootEl
 * @param {CorporateIdentity | null | undefined} ci
 */
export function applyCorporateIdentity(rootEl, ci) {
  if (!rootEl || !rootEl.style) return;
  const cfg = ci && typeof ci === 'object' ? ci : {};
  applyVar(rootEl, '--ci-primary', cfg.brandPrimary, isValidHex, 'brandPrimary');
  applyVar(rootEl, '--ci-accent', cfg.brandAccent, isValidHex, 'brandAccent');
  applyVar(rootEl, '--ci-font-family', cfg.brandFontFamily, isValidFontFamily, 'brandFontFamily');
  applyLogo(cfg.brandLogoUrl);
}
