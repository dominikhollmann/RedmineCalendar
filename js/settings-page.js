import { t } from './i18n.js';
import { displayVersion } from './version.js';
import { attachFixedTooltip } from './anomaly-render.js';
import { getTheme, setTheme } from './theme.js';
import { isSupported as voiceSupported, isPrivacyDismissed, revokePrivacy } from './voice-input.js';
import {
  STORAGE_KEY_PLANNING_SOURCE_OUTLOOK,
  STORAGE_KEY_PLANNING_SOURCE_TEAMS,
  STORAGE_KEY_FAST_MODE,
} from './config.js';
import {
  hasPlanningAiConsent,
  recordPlanningAiConsent,
  withdrawPlanningAiConsent,
  deletePlanningData,
  listPlanningData,
} from './privacy-store.js';
import { showToast } from './notify.js';
displayVersion(document.getElementById('app-version'));

// Tab title + page heading
document.title = t('settings_page.tab_title');
const settingsHeading = document.getElementById('settings-heading');
if (settingsHeading) settingsHeading.textContent = t('settings_page.heading');

// Help button aria-label + tooltip
const docsHelpBtn = /** @type {HTMLElement|null} */ (document.querySelector('.docs-help-btn'));
if (docsHelpBtn) {
  docsHelpBtn.setAttribute('aria-label', t('docs.open_btn'));
  docsHelpBtn.title = t('docs.open_btn');
}

// Docs panel aria-labels
document.getElementById('docs-panel')?.setAttribute('aria-label', t('docs.panel_title'));
document
  .querySelector('#docs-panel .docs-panel__close')
  ?.setAttribute('aria-label', t('docs.close_btn'));

// First-time banner
const ftIntro = document.getElementById('first-time-intro');
if (ftIntro) ftIntro.textContent = t('setup.intro');
const ftInstructions = document.getElementById('first-time-instructions');
if (ftInstructions) ftInstructions.textContent = t('setup.instructions');

// Section headings (order: display, working hours, auth)
const h2s = document.querySelectorAll('h2.form-section-heading');
if (h2s[0]) h2s[0].textContent = t('settings_page.display_heading');
if (h2s[1]) h2s[1].textContent = t('settings_page.working_hours_heading');
if (h2s[2]) h2s[2].textContent = t('settings_page.auth_method_heading');

// Display toggle labels
/** @type {HTMLElement} */ (document.getElementById('label-working-hours')).textContent = t(
  'calendar.toggle_working_hours'
);
/** @type {HTMLElement} */ (document.getElementById('label-workweek')).textContent = t(
  'calendar.toggle_workweek'
);
/** @type {HTMLElement} */ (document.getElementById('label-dark-mode')).textContent = t(
  'settings.theme.dark_mode'
);
/** @type {HTMLElement} */ (document.getElementById('label-fast-mode')).textContent =
  t('settings.fast_mode');
// Explanation shown as a hover/focus tooltip on the toggle (reuses the
// closed-ticket warning tooltip style) instead of a permanent hint line.
const fastModeToggle = document.getElementById('fast-mode-toggle');
if (fastModeToggle) {
  attachFixedTooltip(fastModeToggle, t('settings.fast_mode_hint'), 'fast-mode-tooltip');
}

// Display toggles: read from localStorage
const whCheckbox = /** @type {HTMLInputElement} */ (document.getElementById('settingWorkingHours'));
const wwCheckbox = /** @type {HTMLInputElement} */ (document.getElementById('settingWorkweek'));
const dmCheckbox = /** @type {HTMLInputElement} */ (document.getElementById('settingDarkMode'));
const fmCheckbox = /** @type {HTMLInputElement} */ (document.getElementById('settingFastMode'));
whCheckbox.checked = localStorage.getItem('redmine_calendar_view_mode') !== '24h';
wwCheckbox.checked = localStorage.getItem('redmine_calendar_day_range') !== 'full-week';
dmCheckbox.checked = getTheme() === 'dark';
fmCheckbox.checked = localStorage.getItem(STORAGE_KEY_FAST_MODE) !== 'false';
whCheckbox.addEventListener('change', () => {
  localStorage.setItem('redmine_calendar_view_mode', whCheckbox.checked ? 'working' : '24h');
});
wwCheckbox.addEventListener('change', () => {
  localStorage.setItem('redmine_calendar_day_range', wwCheckbox.checked ? 'workweek' : 'full-week');
});
dmCheckbox.addEventListener('change', () => {
  setTheme(dmCheckbox.checked ? 'dark' : 'light');
});
fmCheckbox.addEventListener('change', () => {
  localStorage.setItem(STORAGE_KEY_FAST_MODE, fmCheckbox.checked ? 'true' : 'false');
});

// Auth radio labels
const authLabels = document.querySelectorAll('.auth-option');
if (authLabels[0]?.lastChild)
  authLabels[0].lastChild.textContent = ' ' + t('settings_page.auth_apikey');
if (authLabels[1]?.lastChild)
  authLabels[1].lastChild.textContent = ' ' + t('settings_page.auth_userpass');

// API key field
/** @type {HTMLElement} */ (document.querySelector('label[for="apiKey"]')).textContent = t(
  'settings_page.apikey_label'
);
const apikeyHint = document.getElementById('apikey-hint-text');
if (apikeyHint) apikeyHint.textContent = t('settings_page.apikey_hint') + ' ';
const redmineLink = document.getElementById('redmine-account-link');
if (redmineLink) redmineLink.textContent = t('setup.open_redmine');

// Basic auth fields
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

// Working hours
/** @type {HTMLElement} */ (document.querySelector('label[for="workStart"]')).textContent = t(
  'settings_page.work_start_label'
);
/** @type {HTMLElement} */ (document.querySelector('label[for="workEnd"]')).textContent = t(
  'settings_page.work_end_label'
);
const workHoursHint = /** @type {HTMLElement} */ (document.getElementById('workhours-error'))
  .previousElementSibling;
if (workHoursHint) workHoursHint.textContent = t('settings_page.working_hours_hint');

// Weekly hours (now inside the Working hours section)
const weeklyLabel = document.getElementById('label-weekly-hours');
if (weeklyLabel) weeklyLabel.textContent = t('settings.weekly_hours');
const weeklyHint = document.getElementById('hint-weekly-hours');
if (weeklyHint) weeklyHint.textContent = t('settings_page.weekly_hours_hint');

// Auto-refresh interval
const autoRefreshLabel = document.getElementById('label-auto-refresh-interval');
if (autoRefreshLabel) autoRefreshLabel.textContent = t('settings.auto_refresh_interval');
const autoRefreshInput = /** @type {HTMLInputElement|null} */ (
  document.getElementById('autoRefreshInterval')
);
if (autoRefreshInput) {
  const stored = localStorage.getItem('redmine_calendar_auto_refresh_interval');
  autoRefreshInput.value = stored != null ? String(Math.round(Number(stored) / 60)) : '5';
  autoRefreshInput.addEventListener('change', async () => {
    const mins = Math.max(0, parseInt(autoRefreshInput.value, 10) || 0);
    const secs = mins * 60;
    localStorage.setItem('redmine_calendar_auto_refresh_interval', String(secs));
    // Dynamically reload the refresh module so calendar.js doesn't need to be imported here
    const { stopAutoRefresh, startAutoRefresh } = await import('./data-refresh.js');
    stopAutoRefresh();
    startAutoRefresh(secs);
  });
}

// Save button
/** @type {HTMLElement} */ (document.getElementById('save-btn')).textContent =
  t('settings_page.save_btn');

// Feature 034 / US1: footer link to the Open-Source Licenses page.
document.querySelectorAll('[data-i18n]').forEach((el) => {
  const key = el.getAttribute('data-i18n');
  if (key) el.textContent = t(key);
});

// Voice consent revocation (SEC-009)
const voiceSection = document.getElementById('voice-consent-section');
const voiceLabel = document.getElementById('voice-consent-label');
const voiceResetBtn = /** @type {HTMLButtonElement | null} */ (
  document.getElementById('voice-consent-reset-btn')
);
const voiceDone = document.getElementById('voice-consent-done');
if (
  voiceSection &&
  voiceLabel &&
  voiceResetBtn &&
  voiceDone &&
  voiceSupported() &&
  isPrivacyDismissed()
) {
  voiceSection.classList.remove('hidden');
  voiceLabel.textContent = t('voice.consent_reset_label');
  voiceResetBtn.textContent = t('voice.consent_reset_btn');
  voiceResetBtn.addEventListener('click', () => {
    revokePrivacy();
    voiceDone.textContent = t('voice.consent_reset_done');
    voiceDone.classList.remove('hidden');
    voiceResetBtn.disabled = true;
  });
}

// Planning View Sources section
const planningHeading = document.getElementById('planning-sources-heading');
if (planningHeading) planningHeading.textContent = t('planning.sources_section');
const outlookSourceLabel = document.getElementById('label-planning-source-outlook');
if (outlookSourceLabel) outlookSourceLabel.textContent = t('planning.source_outlook_label');
const outlookSourceCb = /** @type {HTMLInputElement|null} */ (
  document.getElementById('settingPlanningSourceOutlook')
);
if (outlookSourceCb) {
  outlookSourceCb.checked = localStorage.getItem(STORAGE_KEY_PLANNING_SOURCE_OUTLOOK) !== '0';
  outlookSourceCb.addEventListener('change', () => {
    localStorage.setItem(STORAGE_KEY_PLANNING_SOURCE_OUTLOOK, outlookSourceCb.checked ? '1' : '0');
    document.dispatchEvent(new CustomEvent('planning:sources-changed'));
  });
}

const teamsSourceLabel = document.getElementById('label-planning-source-teams');
if (teamsSourceLabel) teamsSourceLabel.textContent = t('planning.source_teams_label');
const teamsSourceCb = /** @type {HTMLInputElement|null} */ (
  document.getElementById('settingPlanningSourceTeams')
);
if (teamsSourceCb) {
  teamsSourceCb.checked = localStorage.getItem(STORAGE_KEY_PLANNING_SOURCE_TEAMS) !== '0';
  teamsSourceCb.addEventListener('change', () => {
    localStorage.setItem(STORAGE_KEY_PLANNING_SOURCE_TEAMS, teamsSourceCb.checked ? '1' : '0');
    document.dispatchEvent(new CustomEvent('planning:sources-changed'));
  });
}

// Password toggle buttons
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

// ── Feature 044 / US2: Delete planning data ──────────────────────
const deletePlanningDataBtn = document.getElementById('delete-planning-data-btn');
if (deletePlanningDataBtn) {
  if (deletePlanningDataBtn.hasAttribute('data-i18n')) {
    deletePlanningDataBtn.textContent = t('settings.deleteData.button');
  }
  deletePlanningDataBtn.addEventListener('click', () => {
    if (!confirm(t('settings.deleteData.confirm'))) return;
    const { errors } = deletePlanningData();
    if (errors.length > 0) {
      showToast(t('settings.deleteData.error'));
    } else {
      showToast(t('settings.deleteData.success'));
    }
    _refreshConsentStatus();
  });
}

// ── Feature 044 / US3: AI consent withdrawal + Art. 15 data viewer ──

function _refreshConsentStatus() {
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

_refreshConsentStatus();

const grantConsentBtn = document.getElementById('grant-consent-btn');
if (grantConsentBtn) {
  grantConsentBtn.addEventListener('click', () => {
    recordPlanningAiConsent();
    _refreshConsentStatus();
  });
}

const withdrawConsentBtn = document.getElementById('withdraw-consent-btn');
if (withdrawConsentBtn) {
  withdrawConsentBtn.addEventListener('click', () => {
    withdrawPlanningAiConsent();
    _refreshConsentStatus();
  });
}

const planningDataViewer = document.getElementById('planning-data-viewer');
if (planningDataViewer) {
  planningDataViewer.addEventListener('toggle', () => {
    if (!planningDataViewer.hasAttribute('open')) return;
    const contentEl = document.getElementById('planning-data-content');
    if (!contentEl) return;
    const data = listPlanningData();
    const entries = Object.entries(data);
    if (entries.length === 0) {
      const p = document.createElement('p');
      p.className = 'planning-data-empty';
      p.textContent = t('settings.dataViewer.empty');
      contentEl.innerHTML = '';
      contentEl.appendChild(p);
      return;
    }
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
      tr.appendChild(tdKey);
      tr.appendChild(tdVal);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    contentEl.innerHTML = '';
    contentEl.appendChild(table);
  });
}
