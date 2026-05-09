// ── Locale detection ──────────────────────────────────────────────
// Detects 'de' if the browser's primary language starts with 'de';
// all other values fall back to 'en'. Set once at import time.
export const locale = (navigator.languages?.[0] ?? navigator.language ?? 'en').startsWith('de')
  ? 'de'
  : 'en';

// ── Translation maps ──────────────────────────────────────────────
// Tables live in ./i18n/en.js and ./i18n/de.js (split for readability).
// This file remains the canonical key inventory.
//
// Key inventory (namespaced, snake_case):
//
// modal.aria_label               modal.search_heading
// modal.search_placeholder       modal.no_ticket
// modal.start_label              modal.end_label
// modal.duration_label           modal.delete_btn
// modal.cancel_btn               modal.save_btn
// modal.last_used_heading        modal.no_recent
// modal.favourites_heading       modal.no_favourites
// modal.delete_confirm           modal.remove_favourite
// modal.add_favourite            modal.no_results
// modal.search_error             modal.saving
// modal.save_failed              modal.delete_failed
// modal.end_before_start
//
// calendar.total_suffix          calendar.overflow_before
// calendar.overflow_after        calendar.overflow_weekend
// calendar.toggle_working_hours  calendar.working_hours_hint
// calendar.toggle_workweek       calendar.entry_saved
// calendar.entry_updated         calendar.entry_deleted
// calendar.clipboard_banner      ({{id}}, {{subject}})
// calendar.clipboard_clear_aria  calendar.check_settings_suffix
// calendar.move_failed           ({{message}})
// calendar.resize_failed         ({{message}})
//
// error.not_configured           error.network
// error.auth_failed              error.permission_denied
// error.not_found                error.validation
// error.server_unavailable       error.unexpected        ({{status}})
//
// settings.proxy_required        settings.apikey_required
// settings.credentials_required  settings.hours_incomplete
// settings.end_before_start      settings.connecting
// settings.invalid_credentials   settings.proxy_not_found
// settings.server_unavailable    settings.connection_failed  ({{message}})
// settings.save_btn              settings.server_url_https_required
//
// page.settings_title            page.go_to_settings
// page.retry                     page.help_aria

// settings_page.tab_title        settings_page.heading
// chatbot.error_with_detail      ({{message}})
// entry.fallback_subject         ({{id}})
//
// arbzg.daily_limit                   arbzg.weekly_limit
// arbzg.rest_period                   arbzg.sunday
// arbzg.holiday                       arbzg.break
// arbzg.break_continuous
//
// settings_page.session_expired       settings_page.connection_heading
// settings_page.redmine_server_label  settings_page.proxy_url_label
// settings_page.proxy_url_hint        settings_page.auth_method_heading
// settings_page.auth_apikey           settings_page.auth_userpass
// settings_page.apikey_label          settings_page.apikey_placeholder
// settings_page.apikey_hint           settings_page.username_label
// settings_page.username_placeholder  settings_page.password_label
// settings_page.password_placeholder  settings_page.working_hours_heading
// settings_page.work_start_label      settings_page.work_end_label
// settings_page.working_hours_hint    settings_page.weekly_hours_hint
// settings_page.save_btn

import en from './i18n/en.js';
import de from './i18n/de.js';

const TRANSLATIONS = { en, de };

// ── t() — translate a key, substituting optional {{placeholder}} tokens ──
export function t(key, vars = {}) {
  const str = TRANSLATIONS[locale]?.[key] ?? TRANSLATIONS.en[key] ?? key;
  return str.replace(/\{\{(\w+)\}\}/g, (_, name) => vars[name] ?? `{{${name}}}`);
}

// ── formatDate() — format a YYYY-MM-DD string per the active locale ──
// de → DD.MM.YYYY   en → YYYY-MM-DD (ISO, for consistency with Redmine)
// Note: calendar date display is handled by FullCalendar's native locale option.
// formatDate() is a utility for non-calendar date strings (e.g. form fields, labels).
export function formatDate(dateStr) {
  try {
    const [year, month, day] = dateStr.split('-');
    if (locale === 'de') {
      return `${day}.${month}.${year}`;
    }
    return `${year}-${month}-${day}`;
  } catch {
    return dateStr;
  }
}
