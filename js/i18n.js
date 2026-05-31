// ── Locale detection ──────────────────────────────────────────────
// Detects 'de' if the browser's primary language starts with 'de';
// all other values fall back to 'en'. Set once at import time.
/** @type {'en'|'de'} */
export const locale = (navigator.languages?.[0] ?? navigator.language ?? 'en').startsWith('de')
  ? 'de'
  : 'en';

// Feature 033 / US4 (FR-018): keep <html lang> in sync with the detected
// locale so assistive tech pronounces content correctly. Runs at module
// import time, which happens before any localized rendering.
/* c8 ignore next 2 — unit tests inject globalThis.document themselves, so
   document is always defined; the FALSE branch is structurally unreachable. */
if (typeof document !== 'undefined' && document.documentElement) {
  document.documentElement.lang = locale;
}

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
// modal.comment_placeholder      modal.duration_break
//
// calendar.total_suffix          calendar.overflow_weekend
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
// settings.apikey_required       settings.credentials_required
// settings.connecting            settings.invalid_credentials
// settings.proxy_not_found       settings.server_unavailable
// settings.connection_failed     ({{message}})
// settings.save_btn
//
// page.settings_title            page.go_to_settings
// page.retry

// settings_page.tab_title        settings_page.heading
// settings_page.auth_method_heading  settings_page.auth_apikey
// settings_page.auth_userpass    settings_page.apikey_label
// settings_page.apikey_hint      settings_page.username_label
// settings_page.username_placeholder  settings_page.password_label
// settings_page.password_placeholder  settings_page.working_hours_heading
// settings_page.display_heading  settings_page.work_start_label
// settings_page.work_end_label   settings_page.working_hours_hint
// settings_page.weekly_hours_hint  settings_page.save_btn
//
// chatbot.error_with_detail      ({{message}})
// entry.fallback_subject         ({{id}})
//
// arbzg.sunday                   arbzg.holiday           ({{name}})
//
// anomaly.veryShort.reason       ({{hours}})
// anomaly.overlap.reason         ({{start}}, {{end}})
// anomaly.badge.aria             anomaly.multipleReasons  ({{count}})
// anomaly.dismissForTouch

import en from './i18n/en.js';
import de from './i18n/de.js';

const TRANSLATIONS = { en, de };

/**
 * Translate a key, substituting optional `{{placeholder}}` tokens from `vars`.
 * Falls back from the active locale to English to the raw key itself.
 * @param {string} key
 * @param {Record<string, string|number>} [vars]
 * @returns {string}
 */
export function t(key, vars = {}) {
  const str = TRANSLATIONS[locale]?.[key] ?? TRANSLATIONS.en[key] ?? key;
  return str.replace(/\{\{(\w+)\}\}/g, (_, name) => vars[name] ?? `{{${name}}}`);
}

/**
 * Format a `YYYY-MM-DD` string per the active locale.
 * `de` returns `DD.MM.YYYY`; everything else returns the input unchanged.
 * Used for non-calendar date strings (form fields, labels); the calendar
 * itself uses FullCalendar's native locale option for date headers.
 * @param {string} dateStr
 * @returns {string}
 */
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
