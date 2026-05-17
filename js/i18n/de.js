export default {
  // Modal
  'modal.aria_label': 'Zeiteintrag erfassen',
  'modal.search_heading': 'Suche',
  'modal.search_placeholder': 'Nach Name oder ID suchen…',
  'modal.no_ticket': 'Kein Ticket ausgewählt',
  'modal.date_label': 'Datum',
  'modal.start_label': 'Start',
  'modal.end_label': 'Ende',
  'modal.duration_label': 'Dauer',
  'modal.delete_btn': 'Löschen',
  'modal.cancel_btn': 'Abbrechen',
  'modal.save_btn': 'Speichern',
  'modal.last_used_heading': 'Zuletzt verwendet',
  'modal.no_recent': 'Keine kürzlichen Tickets',
  'modal.favourites_heading': 'Favoriten',
  'modal.no_favourites': 'Noch keine Favoriten',
  'modal.delete_confirm': 'Zeiteintrag löschen? Dies kann nicht rückgängig gemacht werden.',
  'modal.remove_favourite': 'Aus Favoriten entfernen',
  'modal.add_favourite': 'Zu Favoriten hinzufügen',
  'modal.no_results': 'Keine Ergebnisse',
  'modal.search_error': 'Suche nicht verfügbar — Verbindung prüfen.',
  'modal.saving': 'Wird gespeichert…',
  'modal.save_failed': 'Speichern fehlgeschlagen — bitte erneut versuchen.',
  'modal.delete_failed': 'Löschen fehlgeschlagen.',
  'modal.ticket_required': 'Bitte wählen Sie zuerst ein Ticket aus.',
  'modal.date_required': 'Datum ist erforderlich.',
  'modal.start_required': 'Startzeit ist erforderlich.',
  'modal.end_required': 'Endzeit ist erforderlich.',
  'modal.end_before_start': 'Endzeit muss nach der Startzeit liegen.',
  'modal.comment_placeholder': 'Kommentar (optional)',
  'modal.hours_locked_break': 'Stunden sind auf 0 gesperrt, weil das Break-Ticket ausgewählt ist.',
  'modal.duration_break': '0m (Pause)',

  // Calendar
  'calendar.total_suffix': ' gesamt',
  'calendar.overflow_before':
    'Zeiteinträge existieren vor dem sichtbaren Bereich — klicken zum Anzeigen',
  'calendar.overflow_after':
    'Zeiteinträge existieren nach dem sichtbaren Bereich — klicken zum Anzeigen',
  'calendar.overflow_weekend':
    'Zeiteinträge an ausgeblendeten Wochenendtagen — klicken für volle Woche',
  'calendar.toggle_working_hours': 'Nur Arbeitszeit anzeigen',
  'calendar.working_hours_hint':
    'Arbeitszeiten in den Einstellungen konfigurieren, um diese Ansicht zu aktivieren.',
  'calendar.toggle_workweek': 'Nur Mo–Fr anzeigen',
  'calendar.entry_saved': 'Zeiteintrag gespeichert.',
  'calendar.entry_updated': 'Zeiteintrag aktualisiert.',
  'calendar.entry_deleted': 'Zeiteintrag gelöscht.',
  'calendar.clipboard_banner': '📋 #{{id}} {{subject}} — Slot anklicken zum Einfügen',
  'calendar.break_label': 'Pause (0h)',
  'calendar.clipboard_clear_aria': 'Zwischenablage leeren',
  'calendar.check_settings_suffix': ' → Prüfen Sie Ihre Einstellungen.',
  'calendar.move_failed': 'Verschieben fehlgeschlagen: {{message}}',
  'calendar.resize_failed': 'Größenänderung fehlgeschlagen: {{message}}',

  // Time entry display
  'entry.fallback_subject': 'Ticket #{{id}}',

  // Errors (redmine-api.js)
  'error.not_configured': 'Nicht konfiguriert — bitte API-Schlüssel setzen.',
  'error.network':
    'Netzwerkfehler — läuft der CORS-Proxy? Bei HTTPS: {{proxyUrl}} in neuem Tab öffnen und Zertifikat akzeptieren.',
  'error.auth_failed': 'Authentifizierung fehlgeschlagen — Anmeldedaten prüfen.',
  'error.permission_denied': 'Zugriff verweigert.',
  'error.not_found':
    'Nicht gefunden (404) — Proxy-URL prüfen und sicherstellen, dass die Redmine REST API unter Verwaltung → Einstellungen → API aktiviert ist.',
  'error.validation': 'Validierungsfehler.',
  'error.server_unavailable':
    'Redmine-Server nicht erreichbar (503) — Redmine-Server-URL in der Proxy-Konfiguration prüfen.',
  'error.unexpected': 'Unerwarteter Fehler ({{status}}).',

  // Settings validation (settings.js)
  'settings.proxy_required': 'Proxy-URL ist erforderlich.',
  'settings.apikey_required': 'API-Schlüssel ist erforderlich.',
  'settings.credentials_required': 'Benutzername und Passwort sind erforderlich.',
  'settings.hours_incomplete': 'Bitte Start- und Endzeit ausfüllen oder beide Felder leer lassen.',
  'settings.end_before_start': 'Endzeit muss nach der Startzeit liegen.',
  'settings.connecting': 'Verbinde…',
  'settings.invalid_credentials':
    'Ungültige Anmeldedaten — API-Schlüssel oder Benutzername und Passwort prüfen.',
  'settings.proxy_not_found':
    'Proxy-URL nicht gefunden (404) — Proxy-URL prüfen und sicherstellen, dass die Redmine REST API aktiviert ist.',
  'settings.server_unavailable':
    'Redmine-Server nicht erreichbar (503) — Server-URL prüfen und Proxy mit neuer URL neu starten.',
  'settings.connection_failed': 'Verbindung fehlgeschlagen: {{message}}',
  'settings.save_btn': 'Speichern & Verbinden',
  'settings.server_url_https_required': 'Redmine-Server-URL muss mit https:// beginnen.',

  // Index page
  'page.settings_title': 'Einstellungen',
  'page.go_to_settings': 'Zu den Einstellungen',
  'page.retry': 'Wiederholen',
  'page.help_aria': 'Hilfe',

  // Settings page
  'settings_page.tab_title': 'Redmine Calendar – Einstellungen',
  'settings_page.heading': 'Redmine Calendar Einstellungen',
  'settings_page.session_expired': 'Sitzung abgelaufen — bitte Anmeldedaten erneut eingeben.',
  'settings_page.connection_heading': 'Verbindung',
  'settings_page.redmine_server_label': 'Redmine-Server-URL',
  'settings_page.proxy_url_label': 'Redmine-Proxy-URL',
  'settings_page.proxy_url_hint':
    'Die Proxy-URL wird für API-Anfragen verwendet (Standard: http://localhost:8010/proxy).',
  'settings_page.auth_method_heading': 'Authentifizierungsmethode',
  'settings_page.auth_apikey': 'API-Schlüssel',
  'settings_page.auth_userpass': 'Benutzername & Passwort',
  'settings_page.apikey_label': 'API-Schlüssel',
  'settings_page.apikey_placeholder': 'Ihr Redmine-API-Schlüssel',
  'settings_page.apikey_hint': 'Zu finden unter Mein Konto → API-Zugriffsschlüssel in Redmine.',
  'settings_page.username_label': 'Benutzername',
  'settings_page.username_placeholder': 'Ihr Redmine-Login',
  'settings_page.password_label': 'Passwort',
  'settings_page.password_placeholder': 'Ihr Redmine-Passwort',
  'settings_page.working_hours_heading': 'Arbeitszeiten',
  'settings_page.display_heading': 'Kalenderanzeige',
  'settings_page.work_start_label': 'Start',
  'settings_page.work_end_label': 'Ende',
  'settings_page.working_hours_hint':
    'Beide Felder leer lassen, um die Arbeitszeitansicht zu deaktivieren.',
  'settings_page.weekly_hours_hint':
    'Wird zur Buchung von Urlaub/Abwesenheit verwendet. Tagesstunden = Wochenstunden ÷ 5.',
  'settings_page.save_btn': 'Speichern & Verbinden',

  // AI Assistant settings
  'settings_page.ai_heading': 'KI-Assistent',
  'settings_page.ai_model_label': 'KI-Modell',
  'settings_page.ai_custom_model_label': 'Benutzerdefinierter Modellname',
  'settings_page.ai_apikey_label': 'KI-API-Schlüssel',
  'settings_page.ai_proxy_port_label': 'KI-Proxy-Port',
  'settings_page.ai_proxy_tip': 'KI-Proxy starten:',
  'settings_page.ai_custom_tip': 'Proxy-URL-Ziel für Ihren benutzerdefinierten Anbieter eingeben.',

  // Config errors
  'config.missing':
    'Konfiguration nicht gefunden — der Administrator muss eine config.json-Datei erstellen. Siehe config.json.example für das erforderliche Format.',
  'config.malformed':
    'Konfigurationsfehler — config.json ist kein gültiges JSON. Bitte den Administrator bitten, die Datei zu prüfen.',
  'config.missing_field': 'Konfigurationsfehler — Pflichtfeld „{{field}}“ fehlt in config.json.',

  // Setup screen
  'setup.heading': 'Willkommen bei Redmine Calendar',
  'setup.intro': 'Um zu beginnen, benötigen Sie Ihren persönlichen Redmine-API-Schlüssel.',
  'setup.instructions':
    'Ihren API-Schlüssel finden Sie in Redmine unter Mein Konto → API-Zugriffsschlüssel.',
  'setup.open_redmine': 'Mein Konto in Redmine öffnen',
  'setup.apikey_label': 'Ihr API-Schlüssel',
  'setup.apikey_placeholder': 'Redmine-API-Schlüssel hier einfügen',
  'setup.save_btn': 'Verbinden',

  // Credential errors
  'credentials.decrypt_failed':
    'Gespeicherte Anmeldedaten konnten nicht gelesen werden — bitte API-Schlüssel erneut eingeben.',

  // Password toggle
  'settings.show_password': 'Anzeigen',
  'settings.hide_password': 'Verbergen',

  // Version
  'version.label': 'Version',

  // Chatbot
  'chatbot.open_btn': 'KI-Chat',
  'chatbot.panel_title': 'KI-Assistent',
  'chatbot.input_placeholder': 'Frage zu RedmineCalendar stellen…',
  'chatbot.send_btn': 'Senden',
  'chatbot.loading': 'Überlege…',
  'chatbot.looking_up': 'Einträge werden gesucht…',
  'chatbot.opening_form': 'Formular wird geöffnet…',
  'chatbot.no_entries_found': 'Keine Zeiteinträge für die angegebenen Kriterien gefunden.',
  'chatbot.multiple_matches': 'Mehrere Einträge passen — bitte genauer angeben.',
  'chatbot.error_generic': 'KI-Dienst nicht verfügbar — bitte erneut versuchen.',
  'chatbot.error_with_detail': 'KI-Fehler: {{message}}',
  'chatbot.error_no_key': 'KI-API-Schlüssel nicht konfiguriert — in Einstellungen festlegen.',
  'chatbot.error_proxy':
    'KI-Proxy läuft nicht. Bei HTTPS: {{proxyUrl}} in neuem Tab öffnen und Zertifikat akzeptieren.',
  'chatbot.retry_btn': 'Erneut versuchen',
  'chatbot.error_rate_limit': 'Zu viele Anfragen — bitte kurz warten.',
  'chatbot.fallback_raw_result':
    'Ich konnte die Antwort nicht aufbereiten, aber hier sind Ihre Ergebnisse:',
  'chatbot.error_invalid_key': 'KI-API-Schlüssel ungültig — Einstellungen prüfen.',
  'chatbot.welcome': 'Hallo! Ich kann dir bei RedmineCalendar helfen. Frag mich etwas zur App.',
  'chatbot.break_routing_disabled':
    'HINWEIS AN DEN NUTZER (musst du wörtlich am Anfang deiner Zusammenfassung wiedergeben): Break-Routing ist deaktiviert — kein Break-Ticket konfiguriert. Nicht-arbeitsbezogene Termine erscheinen unter „Benötigt Nutzer-Input", damit du ein Ticket auswählen oder überspringen kannst.',

  // Project display
  'project.identifier_label': 'Projekt',
  'project.no_identifier': 'Keine Projektkennung',

  // Voice input
  'voice.start': 'Spracheingabe starten',
  'voice.stop': 'Aufnahme stoppen',
  'voice.cancel': 'Aufnahme abbrechen',
  'voice.not_supported': 'Spracheingabe wird in diesem Browser nicht unterstützt.',
  'voice.permission_denied':
    'Mikrofonzugriff verweigert. Bitte erlauben Sie den Zugriff in Ihren Browsereinstellungen.',
  'voice.no_speech': 'Keine Sprache erkannt. Bitte versuchen Sie es erneut.',
  'voice.network_error': 'Spracherkennung wegen Netzwerkfehler fehlgeschlagen.',
  'voice.max_duration': 'Maximale Aufnahmezeit erreicht.',
  'voice.privacy_notice':
    'Spracheingabe nutzt die Spracherkennung Ihres Browsers, die Audio zur Verarbeitung an Cloud-Dienste senden kann.',
  'voice.privacy_dismiss': 'Verstanden',

  // Outlook booking
  'outlook.not_configured':
    'Outlook-Integration nicht konfiguriert. Bitten Sie Ihren Administrator, die Azure-Client-ID in der App-Konfiguration zu hinterlegen.',
  'outlook.auth_failed':
    'Authentifizierung bei Microsoft fehlgeschlagen. Bitte erneut versuchen oder SSO-Sitzung prüfen.',
  'outlook.no_events': 'Keine Kalendertermine für {{date}} gefunden.',
  'outlook.excluded_header':
    'AUSGESCHLOSSENE TERMINE (in der Zusammenfassung MÜSSEN diese erwähnt werden):',
  'outlook.skipped_private_item': 'privater Termin — {{subject}}',
  'outlook.skipped_overlap_item': 'überschneidet sich mit bestehendem Zeiteintrag — {{subject}}',
  'outlook.skipped_informational_item':
    'rein informativer Ganztagstermin (Geburtstag/Jubiläum/Erinnerung) — {{subject}}',
  'outlook.bookable_header':
    'BUCHBARE TERMINE für {{date}} (status=proposed; rufe create_time_entry für jeden auf):',
  'outlook.needs_input_header':
    'BENÖTIGT NUTZER-INPUT (du MUSST den Nutzer fragen, auf welches Ticket gebucht werden soll oder ob übersprungen wird):',
  'outlook.meeting_with_ticket': '{{subject}} — #{{ticket}} ({{start}}–{{end}}, {{hours}}h)',
  'outlook.meeting_no_ticket': '{{subject}} — kein Ticket ({{start}}–{{end}}, {{hours}}h)',
  'outlook.holiday_proposal': '{{subject}} — Feiertagsticket #{{ticket}} ({{hours}}h)',
  'outlook.allday_ask':
    '{{subject}} — Ganztagstermin (kein Feiertag); FRAGE den Nutzer, ob auf ein Ticket gebucht ODER übersprungen werden soll; nicht ohne explizite Antwort fortfahren',
  'outlook.fetch_error': 'Kalendertermine konnten nicht abgerufen werden: {{message}}',
  // Feature 025 — Break-Ticket-Buchung
  'outlook.meeting_with_ticket_subject':
    '{{subject}} — #{{ticket}} {{ticketSubject}} ({{start}}–{{end}}, {{hours}}h)',
  'outlook.holiday_proposal_subject':
    '{{subject}} — Feiertagsticket #{{ticket}} {{ticketSubject}} ({{hours}}h)',
  'outlook.vacation_proposal_subject':
    '{{subject}} — Urlaubsticket #{{ticket}} {{ticketSubject}} ({{hours}}h)',
  'outlook.break_section_header':
    'AUTOMATISCH AUF BREAK-TICKET #{{ticket}} {{ticketSubject}} GEBUCHT (jeweils 0h — Nicht-Arbeitsereignisse. Rufe create_time_entry mit hours=0, start_time, end_time, comment=Termintitel auf; den Nutzer NICHT fragen):',
  'outlook.break_proposal':
    '{{subject}} — Pause (0h) auf #{{ticket}} {{ticketSubject}} ({{start}}–{{end}})',
  'settings.weekly_hours': 'Wochenstunden',
  'settings.holiday_ticket': 'Feiertagsticket #',
  'settings.theme.dark_mode': 'Dunkelmodus',
  'settings.theme.heading': 'Erscheinungsbild',
  'settings.theme.light': 'Hell',
  'settings.theme.dark': 'Dunkel',
  'settings.theme.hint':
    'Wählen Sie das Erscheinungsbild der App. Ihre Wahl wird nur in diesem Browser gespeichert.',
  'branding.logoAlt': '',

  // Documentation panel
  'docs.open_btn': 'Hilfe',
  'docs.panel_title': 'Hilfe',
  'docs.close_btn': 'Schließen',
  'docs.loading': 'Wird geladen…',
  'docs.load_error': 'Dokumentation konnte nicht geladen werden.',

  // ArbZG compliance warnings
  'arbzg.daily_limit':
    'Tageshöchstarbeitszeit überschritten: {{observed}}h gearbeitet, max. {{allowed}}h (ArbZG §3)',
  'arbzg.weekly_limit':
    'Wochenhöchstarbeitszeit überschritten: {{observed}}h gearbeitet, max. {{allowed}}h (ArbZG §3)',
  'arbzg.rest_period': 'Ruhezeit zu kurz: {{observed}}h Ruhe, min. {{allowed}}h (ArbZG §5)',
  'arbzg.sunday': 'Arbeit an Sonntag (ArbZG §9)',
  'arbzg.holiday': 'Arbeit an Feiertag: {{name}} (ArbZG §9)',
  'arbzg.break':
    'Pause zu kurz: {{observed}} Min. genommen, {{required}} Min. vorgeschrieben (ArbZG §4)',
  'arbzg.break_continuous':
    'Ununterbrochene Arbeitszeit zu lang: {{observed}}h ohne Pause, max. {{allowed}}h (ArbZG §4)',

  // Anomaly detection (feature 029)
  'anomaly.veryShort.reason': 'Sehr kurzer Eintrag — möglicher Tippfehler ({{hours}}h)',
  'anomaly.overlap.reason': 'Überschneidet sich mit Eintrag {{start}}–{{end}} am gleichen Tag',
  'anomaly.badge.aria': 'Dieser Eintrag enthält Auffälligkeiten — Details anzeigen',
  'anomaly.tooltip.title': 'Möglicher Fehler',
  'anomaly.multipleReasons': '{{count}} Hinweise:',
  'anomaly.dismissForTouch': 'Symbol antippen zum Schließen',

  // Accessibility labels (feature 033 / US4)
  'a11y.modal.close': 'Zeiteintrag-Formular schließen',
  'a11y.chatbot.close': 'Chatbot schließen',
  'a11y.docs.close': 'Hilfe-Panel schließen',
  'a11y.voice.label_idle': 'Spracheingabe starten',
  'a11y.voice.label_listening': 'Spracheingabe stoppen (hört zu)',
  'a11y.voice.label_processing': 'Spracheingabe wird verarbeitet',
  'a11y.icon.decorative': '',
};
