// @ts-nocheck — DOM-only orchestration glue; pure logic lives in
// settings-connection.js / source-order.js (both type-checked + unit-tested).
// ── Settings page orchestrator (Feature 054 redesign) ─────────────
// Wires the redesigned, card-based settings page: static i18n text, header
// theme toggle, instant-apply display switches + working hours, the explicit
// status-driven Redmine connection, reorderable planning sources, section
// nav + scroll-spy, the connection-gated sticky footer, and the data/privacy
// danger zone. Pure logic lives in settings-connection.js / source-order.js;
// DOM glue in settings-nav.js / settings-sources.js. DOM-only — Playwright-
// tested (tests/ui/settings-redesign.spec.js).

import { t } from './i18n.js';
import { displayVersion } from './version.js';
import { attachFixedTooltip, attachLabelTooltip } from './anomaly-render.js';
import { getTheme, setTheme, subscribeOnChange } from './theme.js';
import { isSupported as voiceSupported, isPrivacyDismissed, revokePrivacy } from './voice-input.js';
import { getCurrentUser } from './redmine-api.js';
import { STORAGE_KEY_FAST_MODE } from './config.js';
import {
  writeCredentials,
  readCredsFromForm,
  updateAuthFields,
  hasRequiredCreds,
  validateWorkingHours,
  validateWeeklyHours,
  persistWorkingHours,
  loadInitialSettings,
} from './settings.js';
import { bindConnection, isFooterEnabled } from './settings-connection.js';
import { initSettingsNav } from './settings-nav.js';
import { initSettingsSources } from './settings-sources.js';
import {
  hasPlanningAiConsent,
  recordPlanningAiConsent,
  withdrawPlanningAiConsent,
  deletePlanningData,
  listPlanningData,
} from './privacy-store.js';
import { showToast } from './notify.js';

// ── Shared live-region announcer (T011) ───────────────────────────
const _liveEl = document.getElementById('settings-live');
function announce(message) {
  if (_liveEl) _liveEl.textContent = message;
}

function setText(id, key) {
  const el = document.getElementById(id);
  if (el) el.textContent = t(key);
}

// ── Static text + chrome ──────────────────────────────────────────
function wireStaticText() {
  document.title = t('settings_page.tab_title');
  setText('settings-heading', 'settings_page.app_title');
  setText('settings-subtitle', 'settings_page.subtitle');

  // Section card titles — auth + sources use the longer forms (the nav keeps
  // the short section labels, per the prototype).
  setText('heading-display', 'settings.section.display');
  setText('heading-working-hours', 'settings.section.workingHours');
  setText('heading-auth', 'settings_page.auth_method_heading');
  setText('heading-sources', 'planning.sources_section');
  setText('heading-data', 'settings.section.dataPrivacy');
  setText('sources-help', 'settings.sources_help');

  document.getElementById('settings-nav')?.setAttribute('aria-label', t('settings_page.heading'));

  // Display switch labels
  setText('label-working-hours', 'calendar.toggle_working_hours');
  setText('label-workweek', 'calendar.toggle_workweek');
  setText('label-fast-mode', 'settings.fast_mode');
  const fastModeToggle = document.getElementById('fast-mode-toggle');
  if (fastModeToggle)
    attachFixedTooltip(fastModeToggle, t('settings.fast_mode_hint'), 'fast-mode-tooltip');

  // Auth segmented control labels
  const segSpans = document.querySelectorAll('#auth-segmented .segmented-option span');
  if (segSpans[0]) segSpans[0].textContent = t('settings_page.auth_apikey');
  if (segSpans[1]) segSpans[1].textContent = t('settings_page.auth_userpass');

  wireFieldLabels();
  wireButtonsText();
}

function wireFieldLabels() {
  /** @type {HTMLElement} */ (document.querySelector('label[for="apiKey"]')).textContent = t(
    'settings_page.apikey_label'
  );
  const apikeyHint = document.getElementById('apikey-hint-text');
  if (apikeyHint) apikeyHint.textContent = t('settings_page.apikey_hint') + ' ';
  const redmineLink = document.getElementById('redmine-account-link');
  if (redmineLink) redmineLink.textContent = t('setup.open_redmine');
  /** @type {HTMLElement} */ (document.querySelector('label[for="username"]')).textContent = t(
    'settings_page.username_label'
  );
  /** @type {HTMLInputElement} */ (document.getElementById('username')).placeholder = t(
    'settings_page.username_placeholder'
  );
  /** @type {HTMLElement} */ (document.querySelector('label[for="password"]')).textContent = t(
    'settings_page.password_label'
  );
  /** @type {HTMLInputElement} */ (document.getElementById('password')).placeholder = t(
    'settings_page.password_placeholder'
  );
  /** @type {HTMLElement} */ (document.querySelector('label[for="workStart"]')).textContent = t(
    'settings_page.work_start_label'
  );
  /** @type {HTMLElement} */ (document.querySelector('label[for="workEnd"]')).textContent = t(
    'settings_page.work_end_label'
  );
  const whHint = /** @type {HTMLElement} */ (document.getElementById('workhours-error'))
    ?.previousElementSibling;
  if (whHint) whHint.textContent = t('settings_page.working_hours_hint');
  setText('label-weekly-hours', 'settings.weekly_hours');
  setText('hint-weekly-hours', 'settings_page.weekly_hours_hint');
  setText('label-auto-refresh-interval', 'settings.auto_refresh_interval');
  setText('sublabel-auto-refresh', 'settings.auto_refresh_sublabel');
  const privacyLink = document.getElementById('privacy-policy-link');
  if (privacyLink) privacyLink.textContent = t('settings.privacy_link');
}

function wireButtonsText() {
  setText('connect-btn', 'settings.connect');
  setText('open-calendar-btn', 'settings.openCalendar');
  // Help button + docs panel aria
  const docsHelpBtn = /** @type {HTMLElement|null} */ (document.querySelector('.docs-help-btn'));
  if (docsHelpBtn) {
    docsHelpBtn.setAttribute('aria-label', t('docs.open_btn'));
    attachLabelTooltip(docsHelpBtn, t('docs.open_btn'), 'settings-docs-help-tooltip');
  }
  document.getElementById('docs-panel')?.setAttribute('aria-label', t('docs.panel_title'));
  document
    .querySelector('#docs-panel .docs-panel__close')
    ?.setAttribute('aria-label', t('docs.close_btn'));
  setText('first-time-intro', 'setup.intro');
  setText('first-time-instructions', 'setup.instructions');
  // Generic data-i18n elements (delete/consent/viewer/footer links)
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
}

// ── Header theme toggle (T010) ────────────────────────────────────
function wireThemeToggle() {
  const btn = /** @type {HTMLButtonElement|null} */ (document.getElementById('theme-toggle'));
  if (!btn) return;
  const icon = btn.querySelector('.theme-toggle-icon');
  const refresh = () => {
    const dark = getTheme() === 'dark';
    btn.setAttribute(
      'aria-label',
      t(dark ? 'settings.theme.toggle_to_light' : 'settings.theme.toggle_to_dark')
    );
    btn.dataset.theme = dark ? 'dark' : 'light';
    if (icon) icon.textContent = dark ? '☀' : '🌙';
  };
  btn.addEventListener('click', () => setTheme(getTheme() === 'dark' ? 'light' : 'dark'));
  subscribeOnChange(refresh);
  refresh();
}

// ── Display switches, instant-apply (T030) ────────────────────────
function makeSwitch(id, isOn, onToggle) {
  const el = /** @type {HTMLButtonElement|null} */ (document.getElementById(id));
  if (!el) return;
  const apply = (on) => el.setAttribute('aria-checked', String(on));
  apply(isOn());
  el.addEventListener('click', () => {
    const next = el.getAttribute('aria-checked') !== 'true';
    apply(next);
    onToggle(next);
  });
}

function wireDisplaySwitches() {
  makeSwitch(
    'settingWorkingHours',
    () => localStorage.getItem('redmine_calendar_view_mode') !== '24h',
    (on) => localStorage.setItem('redmine_calendar_view_mode', on ? 'working' : '24h')
  );
  makeSwitch(
    'settingWorkweek',
    () => localStorage.getItem('redmine_calendar_day_range') !== 'full-week',
    (on) => localStorage.setItem('redmine_calendar_day_range', on ? 'workweek' : 'full-week')
  );
  makeSwitch(
    'settingFastMode',
    () => localStorage.getItem(STORAGE_KEY_FAST_MODE) !== 'false',
    (on) => localStorage.setItem(STORAGE_KEY_FAST_MODE, on ? 'true' : 'false')
  );
}

// ── Working hours, instant-apply (T015) ───────────────────────────
function wireWorkingHours() {
  const workStart = /** @type {HTMLInputElement} */ (document.getElementById('workStart'));
  const workEnd = /** @type {HTMLInputElement} */ (document.getElementById('workEnd'));
  const weekly = /** @type {HTMLInputElement} */ (document.getElementById('weeklyHours'));
  const whErr = document.getElementById('workhours-error');
  const wkErr = document.getElementById('weekly-hours-error');

  const saveHours = () => {
    whErr?.classList.add('hidden');
    const v = validateWorkingHours(workStart.value, workEnd.value, whErr);
    if (!v) return;
    persistWorkingHours(v.bothEmpty, workStart.value, workEnd.value, null);
  };
  workStart?.addEventListener('change', saveHours);
  workEnd?.addEventListener('change', saveHours);
  weekly?.addEventListener('change', () => {
    wkErr?.classList.add('hidden');
    const n = validateWeeklyHours(wkErr);
    // Persist weekly hours without disturbing the (separately-validated) work
    // hours fields — read them back so an empty pair still clears correctly.
    if (n != null)
      persistWorkingHours(!workStart.value && !workEnd.value, workStart.value, workEnd.value, n);
  });
}

function wireAutoRefresh() {
  const input = /** @type {HTMLInputElement|null} */ (
    document.getElementById('autoRefreshInterval')
  );
  if (!input) return;
  const stored = localStorage.getItem('redmine_calendar_auto_refresh_interval');
  input.value = stored != null ? String(Math.round(Number(stored) / 60)) : '5';
  input.addEventListener('change', async () => {
    const mins = Math.max(0, parseInt(input.value, 10) || 0);
    const secs = mins * 60;
    localStorage.setItem('redmine_calendar_auto_refresh_interval', String(secs));
    const { stopAutoRefresh, startAutoRefresh } = await import('./data-refresh.js');
    stopAutoRefresh();
    startAutoRefresh(secs);
  });
}

// ── Connection flow + footer gating (T019/T021/T033) ──────────────
function buildEls() {
  return {
    apiKeyInput: /** @type {HTMLInputElement} */ (document.getElementById('apiKey')),
    usernameInput: /** @type {HTMLInputElement} */ (document.getElementById('username')),
    passwordInput: /** @type {HTMLInputElement} */ (document.getElementById('password')),
    fieldApiKey: document.getElementById('field-apikey'),
    fieldBasic: document.getElementById('field-basic'),
    workStartInput: /** @type {HTMLInputElement} */ (document.getElementById('workStart')),
    workEndInput: /** @type {HTMLInputElement} */ (document.getElementById('workEnd')),
    configErrorEl: document.getElementById('config-error'),
    firstTimeBanner: document.getElementById('first-time-banner'),
  };
}

function wireConnection(els, showError) {
  const connectBtn = /** @type {HTMLButtonElement} */ (document.getElementById('connect-btn'));
  const openBtn = /** @type {HTMLButtonElement} */ (document.getElementById('open-calendar-btn'));
  const footerHint = document.getElementById('footer-hint');
  if (footerHint) footerHint.textContent = t('settings.footer.hint');

  const onChange = (state) => {
    const enabled = isFooterEnabled(state);
    if (openBtn) openBtn.disabled = !enabled;
    if (footerHint) footerHint.classList.toggle('hidden', enabled);
  };

  const controller = bindConnection({
    pill: document.getElementById('conn-status'),
    button: connectBtn,
    hint: document.getElementById('conn-hint'),
    checkConnection: getCurrentUser,
    persistCredentials: () => writeCredentials(readCredsFromForm(els)),
    announce,
    onChange,
  });

  connectBtn?.addEventListener('click', () => {
    document.getElementById('settings-error')?.classList.add('hidden');
    if (!hasRequiredCreds(els)) {
      showError(t(getAuthErrorKey(els)));
      return;
    }
    controller.connect();
  });
  openBtn?.addEventListener('click', () => {
    if (!openBtn.disabled) window.location.href = 'index.html';
  });

  wireCredInvalidation(els, controller);
  return controller;
}

function getAuthErrorKey(els) {
  return !els.apiKeyInput.value.trim() &&
    els.fieldApiKey &&
    !els.fieldApiKey.classList.contains('hidden')
    ? 'settings.apikey_required'
    : 'settings.credentials_required';
}

function wireCredInvalidation(els, controller) {
  const credInputs = [els.apiKeyInput, els.usernameInput, els.passwordInput];
  credInputs.forEach((inp) =>
    inp?.addEventListener('input', () => controller.invalidate('editCreds'))
  );
  document.querySelectorAll('input[name="authType"]').forEach((r) =>
    r.addEventListener('change', () => {
      updateAuthFields(els);
      controller.invalidate('switchMode');
    })
  );
  updateAuthFields(els);
  const hint = document.getElementById('conn-hint');
  if (hint) hint.textContent = t('settings.conn.credsChanged');
}

// ── Section nav + sources (T013/T025) ─────────────────────────────
function wireNav() {
  const sections = [
    { id: 'section-display', labelKey: 'settings.section.display' },
    { id: 'section-working-hours', labelKey: 'settings.section.workingHours' },
    { id: 'section-auth', labelKey: 'settings.section.auth' },
    { id: 'section-sources', labelKey: 'settings.section.sources' },
    { id: 'section-data', labelKey: 'settings.section.dataPrivacy' },
  ];
  initSettingsNav(sections, document.getElementById('settings-nav'));
}

function wireSources() {
  initSettingsSources(document.getElementById('source-list'), announce);
}

// ── Password show/hide toggles ────────────────────────────────────
function wirePasswordToggles() {
  document.querySelectorAll('.password-toggle').forEach((btn) => {
    const btnEl = /** @type {HTMLElement} */ (btn);
    btnEl.textContent = t('settings.show_password');
    btnEl.addEventListener('click', () => {
      const input = /** @type {HTMLInputElement | null} */ (
        document.getElementById(btnEl.dataset.target ?? '')
      );
      if (!input) return;
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btnEl.textContent = showing ? t('settings.show_password') : t('settings.hide_password');
    });
  });
}

// ── Data & privacy danger zone (T037) ─────────────────────────────
function refreshConsentStatus() {
  const statusEl = document.getElementById('consent-status');
  const grantBtn = /** @type {HTMLButtonElement | null} */ (
    document.getElementById('grant-consent-btn')
  );
  const withdrawBtn = /** @type {HTMLButtonElement | null} */ (
    document.getElementById('withdraw-consent-btn')
  );
  if (!statusEl) return;
  const active = hasPlanningAiConsent();
  statusEl.textContent = t(
    active ? 'settings.consent.status.active' : 'settings.consent.status.none'
  );
  if (grantBtn) grantBtn.classList.toggle('hidden', active);
  if (withdrawBtn) withdrawBtn.classList.toggle('hidden', !active);
}

function wireDangerZone() {
  const deleteBtn = document.getElementById('delete-planning-data-btn');
  deleteBtn?.addEventListener('click', () => {
    if (!confirm(t('settings.deleteData.confirm'))) return;
    const { errors } = deletePlanningData();
    showToast(t(errors.length > 0 ? 'settings.deleteData.error' : 'settings.deleteData.success'));
    refreshConsentStatus();
  });
  refreshConsentStatus();
  document.getElementById('grant-consent-btn')?.addEventListener('click', () => {
    recordPlanningAiConsent();
    refreshConsentStatus();
  });
  document.getElementById('withdraw-consent-btn')?.addEventListener('click', () => {
    if (!confirm(t('settings.consent.withdraw') + '?')) return;
    withdrawPlanningAiConsent();
    refreshConsentStatus();
  });
  wireDataViewer();
  wireVoiceConsent();
}

function wireDataViewer() {
  const viewer = document.getElementById('planning-data-viewer');
  viewer?.addEventListener('toggle', () => {
    if (!viewer.hasAttribute('open')) return;
    const contentEl = document.getElementById('planning-data-content');
    if (!contentEl) return;
    const entries = Object.entries(listPlanningData());
    contentEl.innerHTML = '';
    if (entries.length === 0) {
      const p = document.createElement('p');
      p.className = 'planning-data-empty';
      p.textContent = t('settings.dataViewer.empty');
      contentEl.appendChild(p);
      return;
    }
    contentEl.appendChild(buildDataTable(entries));
  });
}

function buildDataTable(entries) {
  const table = document.createElement('table');
  table.className = 'planning-data-table';
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Key</th><th>Value</th></tr>';
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  for (const [k, v] of entries) {
    const tr = document.createElement('tr');
    const tdKey = document.createElement('td');
    tdKey.textContent = k;
    const tdVal = document.createElement('td');
    tdVal.textContent = typeof v === 'string' ? v : JSON.stringify(v, null, 2);
    tr.append(tdKey, tdVal);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}

function wireVoiceConsent() {
  const section = document.getElementById('voice-consent-section');
  const label = document.getElementById('voice-consent-label');
  const resetBtn = /** @type {HTMLButtonElement | null} */ (
    document.getElementById('voice-consent-reset-btn')
  );
  const done = document.getElementById('voice-consent-done');
  if (!(section && label && resetBtn && done && voiceSupported() && isPrivacyDismissed())) return;
  section.classList.remove('hidden');
  label.textContent = t('voice.consent_reset_label');
  resetBtn.textContent = t('voice.consent_reset_btn');
  resetBtn.addEventListener('click', () => {
    revokePrivacy();
    done.textContent = t('voice.consent_reset_done');
    done.classList.remove('hidden');
    resetBtn.disabled = true;
  });
}

// ── Boot ──────────────────────────────────────────────────────────
displayVersion(document.getElementById('app-version'));
const _els = buildEls();
function _showError(msg) {
  const el = document.getElementById('settings-error');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

wireStaticText();
wireThemeToggle();
wireDisplaySwitches();
wireWorkingHours();
wireAutoRefresh();
wirePasswordToggles();
wireNav();
wireSources();
wireDangerZone();
const _connection = wireConnection(_els, _showError);
// Auto-verify on open when a credential is already stored, so a returning
// user who only wants to tweak e.g. display prefs isn't forced to click
// "Verbinden" manually before "Kalender öffnen" unlocks.
loadInitialSettings(_els, _showError).then((res) => {
  if (res.hasCreds) _connection.connect();
});

export { announce };
