// @ts-nocheck — DOM-heavy module; runtime checks suffice. Tag pure helpers per-export with /** @type */ when they grow.
import { t } from './i18n.js';
import { displayVersion } from './version.js';
import { getTheme, setTheme } from './theme.js';
displayVersion(document.getElementById('app-version'));

// Tab title + page heading
document.title = t('settings_page.tab_title');
const settingsHeading = document.getElementById('settings-heading');
if (settingsHeading) settingsHeading.textContent = t('settings_page.heading');

// Help button aria-label
document.querySelector('.docs-help-btn')?.setAttribute('aria-label', t('docs.open_btn'));

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
document.getElementById('label-working-hours').textContent = t('calendar.toggle_working_hours');
document.getElementById('label-workweek').textContent = t('calendar.toggle_workweek');
document.getElementById('label-dark-mode').textContent = t('settings.theme.dark_mode');

// Display toggles: read from localStorage
const whCheckbox = document.getElementById('settingWorkingHours');
const wwCheckbox = document.getElementById('settingWorkweek');
const dmCheckbox = document.getElementById('settingDarkMode');
whCheckbox.checked = localStorage.getItem('redmine_calendar_view_mode') === 'working';
wwCheckbox.checked = localStorage.getItem('redmine_calendar_day_range') === 'workweek';
dmCheckbox.checked = getTheme() === 'dark';
whCheckbox.addEventListener('change', () => {
  localStorage.setItem('redmine_calendar_view_mode', whCheckbox.checked ? 'working' : '24h');
});
wwCheckbox.addEventListener('change', () => {
  localStorage.setItem('redmine_calendar_day_range', wwCheckbox.checked ? 'workweek' : 'full-week');
});
dmCheckbox.addEventListener('change', () => {
  setTheme(dmCheckbox.checked ? 'dark' : 'light');
});

// Auth radio labels
const authLabels = document.querySelectorAll('.auth-option');
if (authLabels[0]) authLabels[0].lastChild.textContent = ' ' + t('settings_page.auth_apikey');
if (authLabels[1]) authLabels[1].lastChild.textContent = ' ' + t('settings_page.auth_userpass');

// API key field
document.querySelector('label[for="apiKey"]').textContent = t('settings_page.apikey_label');
const apikeyHint = document.getElementById('apikey-hint-text');
if (apikeyHint) apikeyHint.textContent = t('settings_page.apikey_hint') + ' ';
const redmineLink = document.getElementById('redmine-account-link');
if (redmineLink) redmineLink.textContent = t('setup.open_redmine');

// Basic auth fields
document.querySelector('label[for="username"]').textContent = t('settings_page.username_label');
document.getElementById('username').placeholder = t('settings_page.username_placeholder');
document.querySelector('label[for="password"]').textContent = t('settings_page.password_label');
document.getElementById('password').placeholder = t('settings_page.password_placeholder');

// Working hours
document.querySelector('label[for="workStart"]').textContent = t('settings_page.work_start_label');
document.querySelector('label[for="workEnd"]').textContent = t('settings_page.work_end_label');
const workHoursHint = document.getElementById('workhours-error').previousElementSibling;
if (workHoursHint) workHoursHint.textContent = t('settings_page.working_hours_hint');

// Weekly hours (now inside the Working hours section)
const weeklyLabel = document.getElementById('label-weekly-hours');
if (weeklyLabel) weeklyLabel.textContent = t('settings.weekly_hours');
const weeklyHint = document.getElementById('hint-weekly-hours');
if (weeklyHint) weeklyHint.textContent = t('settings_page.weekly_hours_hint');

// Save button
document.getElementById('save-btn').textContent = t('settings_page.save_btn');

// Password toggle buttons
document.querySelectorAll('.password-toggle').forEach((btn) => {
  btn.textContent = t('settings.show_password');
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    btn.textContent = showing ? t('settings.show_password') : t('settings.hide_password');
  });
});
