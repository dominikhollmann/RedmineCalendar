// ── Locale detection ──────────────────────────────────────────────
// Detects 'de' if the browser's primary language starts with 'de';
// all other values fall back to 'en'. Set once at import time.
export const locale = (
  (navigator.languages?.[0] ?? navigator.language ?? 'en')
    .startsWith('de') ? 'de' : 'en'
);

// ── Translation maps ──────────────────────────────────────────────
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
// settings.save_btn
//
// page.settings_title            page.go_to_settings
// page.retry
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
// settings_page.working_hours_hint    settings_page.save_btn

const TRANSLATIONS = {
  en: {
    // Modal
    'modal.aria_label':            'Log time entry',
    'modal.search_heading':        'Search',
    'modal.search_placeholder':    'Search by name or ID\u2026',
    'modal.no_ticket':             'No ticket selected',
    'modal.start_label':           'Start',
    'modal.end_label':             'End',
    'modal.duration_label':        'Duration',
    'modal.delete_btn':            'Delete',
    'modal.cancel_btn':            'Cancel',
    'modal.save_btn':              'Save',
    'modal.last_used_heading':     'Last used',
    'modal.no_recent':             'No recent tickets',
    'modal.favourites_heading':    'Favourites',
    'modal.no_favourites':         'No favourites yet',
    'modal.delete_confirm':        'Delete this time entry? This cannot be undone.',
    'modal.remove_favourite':      'Remove from favourites',
    'modal.add_favourite':         'Add to favourites',
    'modal.no_results':            'No results',
    'modal.search_error':          'Search unavailable \u2014 check your connection.',
    'modal.saving':                'Saving\u2026',
    'modal.save_failed':           'Save failed \u2014 please try again.',
    'modal.delete_failed':         'Delete failed.',
    'modal.end_before_start':      'End time must be after start time.',

    // Calendar
    'calendar.total_suffix':           ' total',
    'calendar.overflow_before':        'Time entries exist before the visible range \u2014 click to show all',
    'calendar.overflow_after':         'Time entries exist after the visible range \u2014 click to show all',
    'calendar.overflow_weekend':       'Time entries exist on hidden weekend days \u2014 click to show full week',
    'calendar.toggle_working_hours':   'Only show working hours',
    'calendar.working_hours_hint':     'Configure working hours in settings to enable this view.',
    'calendar.toggle_workweek':        'Only show Mo\u2013Fr',
    'calendar.entry_saved':            'Time entry saved.',
    'calendar.entry_updated':          'Time entry updated.',
    'calendar.entry_deleted':          'Time entry deleted.',

    // Errors (redmine-api.js)
    'error.not_configured':    'Not configured \u2014 please set your API key.',
    'error.network':           'Network error \u2014 is the CORS proxy running?',
    'error.auth_failed':       'Authentication failed \u2014 please check your credentials.',
    'error.permission_denied': 'Permission denied.',
    'error.not_found':         'Not found (404) \u2014 check your proxy URL and verify the Redmine REST API is enabled under Administration \u2192 Settings \u2192 API.',
    'error.validation':        'Validation error.',
    'error.server_unavailable':'Redmine server unreachable (503) \u2014 check the Redmine server URL in your proxy configuration.',
    'error.unexpected':        'Unexpected error ({{status}}).',

    // Settings validation (settings.js)
    'settings.proxy_required':       'Proxy URL is required.',
    'settings.apikey_required':      'API key is required.',
    'settings.credentials_required': 'Username and password are required.',
    'settings.hours_incomplete':     'Please fill in both start and end time, or leave both empty.',
    'settings.end_before_start':     'End time must be after start time.',
    'settings.connecting':           'Connecting\u2026',
    'settings.invalid_credentials':  'Invalid credentials \u2014 please check your API key or username and password.',
    'settings.proxy_not_found':      'Proxy URL not found (404) \u2014 check the proxy URL and verify the Redmine REST API is enabled.',
    'settings.server_unavailable':   'Redmine server unreachable (503) \u2014 check the Redmine server URL and make sure the proxy is restarted with the new URL.',
    'settings.connection_failed':    'Connection failed: {{message}}',
    'settings.save_btn':             'Save & Connect',

    // Index page
    'page.settings_title':   'Settings',
    'page.go_to_settings':   'Go to Settings',
    'page.retry':            'Retry',

    // Settings page
    'settings_page.session_expired':       'Session expired \u2014 please re-enter your credentials.',
    'settings_page.connection_heading':    'Connection',
    'settings_page.redmine_server_label':  'Redmine server URL',
    'settings_page.proxy_url_label':       'Redmine proxy URL',
    'settings_page.proxy_url_hint':        'The proxy URL is what the app uses for API requests (default: http://localhost:8010/proxy).',
    'settings_page.auth_method_heading':   'Authentication method',
    'settings_page.auth_apikey':           'API Key',
    'settings_page.auth_userpass':         'Username & Password',
    'settings_page.apikey_label':          'API key',
    'settings_page.apikey_placeholder':    'Your Redmine API key',
    'settings_page.apikey_hint':           'Find it under My Account \u2192 API access key in Redmine.',
    'settings_page.username_label':        'Username',
    'settings_page.username_placeholder':  'Your Redmine login',
    'settings_page.password_label':        'Password',
    'settings_page.password_placeholder':  'Your Redmine password',
    'settings_page.working_hours_heading': 'Working hours',
    'settings_page.work_start_label':      'Start',
    'settings_page.work_end_label':        'End',
    'settings_page.working_hours_hint':    'Leave both fields empty to disable the working hours view.',
    'settings_page.save_btn':              'Save & Connect',
  },

  de: {
    // Modal
    'modal.aria_label':            'Zeiteintrag erfassen',
    'modal.search_heading':        'Suche',
    'modal.search_placeholder':    'Nach Name oder ID suchen\u2026',
    'modal.no_ticket':             'Kein Ticket ausgew\u00e4hlt',
    'modal.start_label':           'Start',
    'modal.end_label':             'Ende',
    'modal.duration_label':        'Dauer',
    'modal.delete_btn':            'L\u00f6schen',
    'modal.cancel_btn':            'Abbrechen',
    'modal.save_btn':              'Speichern',
    'modal.last_used_heading':     'Zuletzt verwendet',
    'modal.no_recent':             'Keine k\u00fcrzlichen Tickets',
    'modal.favourites_heading':    'Favoriten',
    'modal.no_favourites':         'Noch keine Favoriten',
    'modal.delete_confirm':        'Zeiteintrag l\u00f6schen? Dies kann nicht r\u00fcckg\u00e4ngig gemacht werden.',
    'modal.remove_favourite':      'Aus Favoriten entfernen',
    'modal.add_favourite':         'Zu Favoriten hinzuf\u00fcgen',
    'modal.no_results':            'Keine Ergebnisse',
    'modal.search_error':          'Suche nicht verf\u00fcgbar \u2014 Verbindung pr\u00fcfen.',
    'modal.saving':                'Wird gespeichert\u2026',
    'modal.save_failed':           'Speichern fehlgeschlagen \u2014 bitte erneut versuchen.',
    'modal.delete_failed':         'L\u00f6schen fehlgeschlagen.',
    'modal.end_before_start':      'Endzeit muss nach der Startzeit liegen.',

    // Calendar
    'calendar.total_suffix':           ' gesamt',
    'calendar.overflow_before':        'Zeiteintr\u00e4ge existieren vor dem sichtbaren Bereich \u2014 klicken zum Anzeigen',
    'calendar.overflow_after':         'Zeiteintr\u00e4ge existieren nach dem sichtbaren Bereich \u2014 klicken zum Anzeigen',
    'calendar.overflow_weekend':       'Zeiteintr\u00e4ge an ausgeblendeten Wochenendtagen \u2014 klicken f\u00fcr volle Woche',
    'calendar.toggle_working_hours':   'Nur Arbeitszeit anzeigen',
    'calendar.working_hours_hint':     'Arbeitszeiten in den Einstellungen konfigurieren, um diese Ansicht zu aktivieren.',
    'calendar.toggle_workweek':        'Nur Mo\u2013Fr anzeigen',
    'calendar.entry_saved':            'Zeiteintrag gespeichert.',
    'calendar.entry_updated':          'Zeiteintrag aktualisiert.',
    'calendar.entry_deleted':          'Zeiteintrag gel\u00f6scht.',

    // Errors (redmine-api.js)
    'error.not_configured':    'Nicht konfiguriert \u2014 bitte API-Schl\u00fcssel setzen.',
    'error.network':           'Netzwerkfehler \u2014 l\u00e4uft der CORS-Proxy?',
    'error.auth_failed':       'Authentifizierung fehlgeschlagen \u2014 Anmeldedaten pr\u00fcfen.',
    'error.permission_denied': 'Zugriff verweigert.',
    'error.not_found':         'Nicht gefunden (404) \u2014 Proxy-URL pr\u00fcfen und sicherstellen, dass die Redmine REST API unter Verwaltung \u2192 Einstellungen \u2192 API aktiviert ist.',
    'error.validation':        'Validierungsfehler.',
    'error.server_unavailable':'Redmine-Server nicht erreichbar (503) \u2014 Redmine-Server-URL in der Proxy-Konfiguration pr\u00fcfen.',
    'error.unexpected':        'Unerwarteter Fehler ({{status}}).',

    // Settings validation (settings.js)
    'settings.proxy_required':       'Proxy-URL ist erforderlich.',
    'settings.apikey_required':      'API-Schl\u00fcssel ist erforderlich.',
    'settings.credentials_required': 'Benutzername und Passwort sind erforderlich.',
    'settings.hours_incomplete':     'Bitte Start- und Endzeit ausf\u00fcllen oder beide Felder leer lassen.',
    'settings.end_before_start':     'Endzeit muss nach der Startzeit liegen.',
    'settings.connecting':           'Verbinde\u2026',
    'settings.invalid_credentials':  'Ung\u00fcltige Anmeldedaten \u2014 API-Schl\u00fcssel oder Benutzername und Passwort pr\u00fcfen.',
    'settings.proxy_not_found':      'Proxy-URL nicht gefunden (404) \u2014 Proxy-URL pr\u00fcfen und sicherstellen, dass die Redmine REST API aktiviert ist.',
    'settings.server_unavailable':   'Redmine-Server nicht erreichbar (503) \u2014 Server-URL pr\u00fcfen und Proxy mit neuer URL neu starten.',
    'settings.connection_failed':    'Verbindung fehlgeschlagen: {{message}}',
    'settings.save_btn':             'Speichern & Verbinden',

    // Index page
    'page.settings_title':   'Einstellungen',
    'page.go_to_settings':   'Zu den Einstellungen',
    'page.retry':            'Wiederholen',

    // Settings page
    'settings_page.session_expired':       'Sitzung abgelaufen \u2014 bitte Anmeldedaten erneut eingeben.',
    'settings_page.connection_heading':    'Verbindung',
    'settings_page.redmine_server_label':  'Redmine-Server-URL',
    'settings_page.proxy_url_label':       'Redmine-Proxy-URL',
    'settings_page.proxy_url_hint':        'Die Proxy-URL wird f\u00fcr API-Anfragen verwendet (Standard: http://localhost:8010/proxy).',
    'settings_page.auth_method_heading':   'Authentifizierungsmethode',
    'settings_page.auth_apikey':           'API-Schl\u00fcssel',
    'settings_page.auth_userpass':         'Benutzername & Passwort',
    'settings_page.apikey_label':          'API-Schl\u00fcssel',
    'settings_page.apikey_placeholder':    'Ihr Redmine-API-Schl\u00fcssel',
    'settings_page.apikey_hint':           'Zu finden unter Mein Konto \u2192 API-Zugriffsschl\u00fcssel in Redmine.',
    'settings_page.username_label':        'Benutzername',
    'settings_page.username_placeholder':  'Ihr Redmine-Login',
    'settings_page.password_label':        'Passwort',
    'settings_page.password_placeholder':  'Ihr Redmine-Passwort',
    'settings_page.working_hours_heading': 'Arbeitszeiten',
    'settings_page.work_start_label':      'Start',
    'settings_page.work_end_label':        'Ende',
    'settings_page.working_hours_hint':    'Beide Felder leer lassen, um die Arbeitszeitansicht zu deaktivieren.',
    'settings_page.save_btn':              'Speichern & Verbinden',
  },
};

// ── t() — translate a key, substituting optional {{placeholder}} tokens ──
export function t(key, vars = {}) {
  const str = TRANSLATIONS[locale]?.[key] ?? TRANSLATIONS.en[key] ?? key;
  return str.replace(/\{\{(\w+)\}\}/g, (_, name) => vars[name] ?? `{{${name}}}`);
}

// ── formatDate() — format a YYYY-MM-DD string per the active locale ──
// de → DD.MM.YYYY   en → DD/MM/YYYY
export function formatDate(dateStr) {
  try {
    const [year, month, day] = dateStr.split('-');
    if (locale === 'de') {
      return `${day}.${month}.${year}`;
    }
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}
