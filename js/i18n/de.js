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
  'modal.comment_placeholder': 'Kommentar (optional)',
  'modal.duration_break': '0m (Pause)',
  'modal.ticket_required': 'Bitte ein Ticket auswählen.',
  'modal.date_required': 'Bitte ein Datum eingeben.',
  'modal.start_required': 'Bitte eine Startzeit eingeben.',
  'modal.end_required': 'Bitte eine Endzeit eingeben.',
  'modal.end_before_start': 'Endzeit muss nach der Startzeit liegen.',

  // Calendar
  'calendar.week_total_label': 'Woche: ',
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
  'calendar.clipboard_clear_aria': 'Zwischenablage leeren',
  'calendar.check_settings_suffix': ' → Prüfen Sie Ihre Einstellungen.',
  'calendar.move_failed': 'Verschieben fehlgeschlagen: {{message}}',
  'calendar.resize_failed': 'Größenänderung fehlgeschlagen: {{message}}',
  'calendar.refresh_button': 'Aktualisieren',
  'calendar.last_refreshed': 'Zuletzt aktualisiert um {{time}}',
  'calendar.refresh_failed': 'Aktualisierung fehlgeschlagen für: {{sources}}',

  // Time entry display
  'entry.fallback_subject': 'Ticket #{{id}}',

  // Errors (redmine-api.js)
  'error.not_configured': 'Nicht konfiguriert — bitte API-Schlüssel setzen.',
  'error.network':
    'Netzwerkfehler — CORS-Proxy nicht erreichbar. Bei selbstsigniertem Zertifikat: Proxy-URL in neuem Tab öffnen und Zertifikat akzeptieren.',
  'error.auth_failed': 'Authentifizierung fehlgeschlagen — Anmeldedaten prüfen.',
  'error.permission_denied': 'Zugriff verweigert.',
  'error.not_found':
    'Nicht gefunden (404) — Proxy-URL prüfen und sicherstellen, dass die Redmine REST API unter Verwaltung → Einstellungen → API aktiviert ist.',
  'error.validation': 'Validierungsfehler.',
  'error.server_unavailable':
    'Redmine-Server nicht erreichbar (503) — Redmine-Server-URL in der Proxy-Konfiguration prüfen.',
  'error.unexpected': 'Unerwarteter Fehler ({{status}}).',

  // Settings validation (settings.js)
  'settings.apikey_required': 'API-Schlüssel ist erforderlich.',
  'settings.credentials_required': 'Benutzername und Passwort sind erforderlich.',
  'settings.connecting': 'Verbinde…',
  'settings.invalid_credentials':
    'Ungültige Anmeldedaten — API-Schlüssel oder Benutzername und Passwort prüfen.',
  'settings.proxy_not_found':
    'Proxy-URL nicht gefunden (404) — Proxy-URL prüfen und sicherstellen, dass die Redmine REST API aktiviert ist.',
  'settings.server_unavailable':
    'Redmine-Server nicht erreichbar (503) — Server-URL prüfen und Proxy mit neuer URL neu starten.',
  'settings.connection_failed': 'Verbindung fehlgeschlagen: {{message}}',
  'settings.save_btn': 'Speichern & Verbinden',

  // Index page
  'page.settings_title': 'Einstellungen',
  'page.go_to_settings': 'Zu den Einstellungen',
  'page.retry': 'Wiederholen',

  // Settings page
  'settings_page.tab_title': 'Redmine Calendar – Einstellungen',
  'settings_page.heading': 'Redmine Calendar Einstellungen',
  'settings_page.auth_method_heading': 'Redmine Authentifizierung',
  'settings_page.auth_apikey': 'API-Schlüssel',
  'settings_page.auth_userpass': 'Benutzername & Passwort',
  'settings_page.apikey_label': 'API-Schlüssel',
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

  // Config errors
  'config.missing':
    'Konfiguration nicht gefunden — der Administrator muss eine config.json-Datei erstellen. Siehe config.json.example für das erforderliche Format.',
  'config.malformed':
    'Konfigurationsfehler — config.json ist kein gültiges JSON. Bitte den Administrator bitten, die Datei zu prüfen.',
  'config.missing_field': 'Konfigurationsfehler — Pflichtfeld „{{field}}" fehlt in config.json.',

  // Setup screen
  'setup.intro': 'Um zu beginnen, benötigen Sie Ihren persönlichen Redmine-API-Schlüssel.',
  'setup.instructions':
    'Ihren API-Schlüssel finden Sie in Redmine unter Mein Konto → API-Zugriffsschlüssel.',
  'setup.open_redmine': 'Mein Konto in Redmine öffnen',

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
  'chatbot.no_entries_found': 'Keine Zeiteinträge für die angegebenen Kriterien gefunden.',
  'chatbot.multiple_matches': 'Mehrere Einträge passen — bitte genauer angeben.',
  'chatbot.error_generic': 'KI-Dienst nicht verfügbar — bitte erneut versuchen.',
  'chatbot.error_with_detail': 'KI-Fehler: {{message}}',
  'chatbot.error_no_key': 'KI-Assistent ist nicht konfiguriert — bitte Administrator kontaktieren.',
  'chatbot.error_proxy':
    'KI-Proxy nicht erreichbar. Bei selbstsigniertem Zertifikat: Proxy-URL in neuem Tab öffnen und Zertifikat akzeptieren.',
  'chatbot.retry_btn': 'Erneut versuchen',
  'chatbot.error_rate_limit': 'Zu viele Anfragen — bitte kurz warten.',
  'chatbot.error_invalid_key':
    'KI-Dienst hat die Anfrage abgelehnt — bitte Administrator kontaktieren.',
  'chatbot.welcome': 'Hallo! Ich kann dir bei RedmineCalendar helfen. Frag mich etwas zur App.',
  'chatbot.break_routing_disabled':
    'HINWEIS AN DEN NUTZER (musst du wörtlich am Anfang deiner Zusammenfassung wiedergeben): Break-Routing ist deaktiviert — kein Break-Ticket konfiguriert. Nicht-arbeitsbezogene Termine erscheinen unter „Benötigt Nutzer-Input", damit du ein Ticket auswählen oder überspringen kannst.',

  // Voice input
  'voice.start': 'Spracheingabe starten',
  'voice.stop': 'Aufnahme stoppen',
  'voice.max_duration': 'Maximale Aufnahmezeit erreicht.',
  'voice.privacy_notice':
    'Spracheingabe nutzt die Spracherkennung Ihres Browsers, die Audio zur Verarbeitung an Cloud-Dienste senden kann.',
  'voice.privacy_dismiss': 'Verstanden',
  'voice.consent_reset_label': 'Datenschutzeinwilligung Spracheingabe',
  'voice.consent_reset_btn': 'Einwilligung zurücksetzen',
  'voice.consent_reset_done':
    'Einwilligung zurückgesetzt — beim nächsten Verwenden der Spracheingabe werden Sie erneut gefragt.',

  // Outlook booking
  'outlook.not_configured':
    'Outlook-Integration nicht konfiguriert. Bitten Sie Ihren Administrator, die Azure-Client-ID in der App-Konfiguration zu hinterlegen.',
  'outlook.no_events': 'Keine Kalendertermine für {{date}} gefunden.',
  'outlook.excluded_header':
    'AUSGESCHLOSSENE TERMINE (in der Zusammenfassung MÜSSEN diese erwähnt werden):',
  'outlook.skipped_overlap_item': 'überschneidet sich mit bestehendem Zeiteintrag — {{subject}}',
  'outlook.skipped_informational_item':
    'rein informativer Ganztagstermin (Geburtstag/Jubiläum/Erinnerung) — {{subject}}',
  'outlook.bookable_header':
    'BUCHBARE TERMINE für {{date}} (status=proposed; rufe create_time_entry für jeden auf):',
  'outlook.needs_input_header':
    'BENÖTIGT NUTZER-INPUT (du MUSST den Nutzer fragen, auf welches Ticket gebucht werden soll oder ob übersprungen wird):',
  'outlook.meeting_no_ticket': '{{subject}} — kein Ticket ({{start}}–{{end}}, {{hours}}h)',
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
  'settings.weekly_hours_invalid': 'Bitte Wochenstunden eingeben (größer als 0).',
  'settings.weekly_hours_too_high': 'Bitte höchstens 60 Wochenstunden eingeben.',
  'settings.auto_refresh_interval': 'Auto-Aktualisierung',
  'settings.auto_refresh_sublabel': 'Minuten · 0 = aus',
  'settings.theme.dark_mode': 'Dunkelmodus',
  'settings.fast_mode': 'Schnellmodus',
  'settings.fast_mode_hint':
    'Wenn aktiv, schließt die Auswahl eines Tickets das Zeitbuchungs-Formular sofort. Deaktivieren, um das Formular für einen Kommentar offen zu halten.',

  // Feature 054 — Settings page redesign
  'settings_page.app_title': 'Redmine Calendar',
  'settings_page.subtitle': 'Einstellungen',
  'settings.section.display': 'Anzeige',
  'settings.section.workingHours': 'Arbeitszeiten',
  'settings.section.auth': 'Authentifizierung',
  'settings.section.sources': 'Quellen',
  'settings.section.dataPrivacy': 'Daten & Datenschutz',
  'settings.conn.disconnected': 'Nicht verbunden',
  'settings.conn.checking': 'Verbindung wird geprüft…',
  'settings.conn.connected': 'Verbunden',
  'settings.conn.error.invalid': 'Ungültige Zugangsdaten',
  'settings.conn.error.network': 'Netzwerkfehler — Verbindung nicht möglich',
  'settings.conn.error.server': 'Serverfehler — bitte später erneut versuchen',
  'settings.conn.credsChanged': 'Zugangsdaten geändert — erneut verbinden.',
  'settings.connect': 'Verbinden',
  'settings.openCalendar': 'Kalender öffnen →',
  'settings.footer.hint': 'Zuerst mit Redmine verbinden, um den Kalender zu öffnen.',
  'settings.theme.toggle_to_dark': 'Zu dunklem Design wechseln',
  'settings.theme.toggle_to_light': 'Zu hellem Design wechseln',
  'settings.sources_help':
    'Aktivieren und sortieren — per Maus ziehen oder den Griff fokussieren, Leertaste zum Aufnehmen, dann ↑/↓. Die Reihenfolge bestimmt die Anzeige in der App.',
  'settings.sources.grip_label': 'Reihenfolge ändern: {{source}}',
  'settings.sources.move_up': 'Nach oben',
  'settings.sources.move_down': 'Nach unten',
  'settings.sources.grabbed': '{{source}} aufgenommen — mit Pfeiltasten verschieben',
  'settings.sources.dropped': '{{source}} abgelegt',
  'settings.sources.moved': '{{source}} verschoben — Position {{pos}} von {{total}}',
  'settings.privacy_link': 'Datenschutzerklärung ansehen',
  'settings.privacy_row_label': 'Datenschutzerklärung & Verarbeitung der Planungsdaten',
  'branding.logoAlt': '',

  // Documentation panel
  'docs.open_btn': 'Hilfe',
  'docs.panel_title': 'Hilfe',
  'docs.close_btn': 'Schließen',
  'docs.loading': 'Wird geladen…',
  'docs.load_error': 'Dokumentation konnte nicht geladen werden.',

  // ArbZG compliance warnings
  'arbzg.sunday': 'Arbeit an Sonntag (ArbZG §9)',
  'arbzg.holiday': 'Arbeit an Feiertag: {{name}} (ArbZG §9)',

  // Anomaly detection (feature 029)
  'anomaly.veryShort.reason': 'Sehr kurzer Eintrag — möglicher Tippfehler ({{hours}}h)',
  'anomaly.overlap.reason': 'Überschneidet sich mit Eintrag {{start}}–{{end}} am gleichen Tag',
  'anomaly.badge.aria': 'Dieser Eintrag enthält Auffälligkeiten — Details anzeigen',
  'anomaly.multipleReasons': '{{count}} Hinweise:',
  'anomaly.dismissForTouch': 'Symbol antippen zum Schließen',

  // Accessibility labels (feature 033 / US4)
  'a11y.chatbot.close': 'Chatbot schließen',

  // Feedback button (feature 037)
  'feedback.button_label': 'Feedback geben',
  'feedback.dialog_title': 'Feedback senden',
  'feedback.category_label': 'Kategorie',
  'feedback.category_bug': 'Fehlermeldung',
  'feedback.category_suggestion': 'Verbesserungsvorschlag',
  'feedback.subject_label': 'Betreff',
  'feedback.subject_placeholder': 'Kurze Zusammenfassung (wird als Ticket-Betreff verwendet)',
  'feedback.subject_required': 'Bitte einen Betreff eingeben.',
  'feedback.description_placeholder': 'Fehler oder Idee beschreiben…',
  'feedback.submit_btn': 'Senden',
  'feedback.cancel_btn': 'Abbrechen',
  'feedback.context_heading': 'Kontext (automatisch erfasst)',
  'feedback.screenshot_unavailable': 'Screenshot nicht verfügbar',
  'feedback.sending': 'Wird gesendet…',
  'feedback.sent': 'Feedback gesendet — vielen Dank!',
  'feedback.send_failed': 'Feedback konnte nicht gesendet werden. Bitte erneut versuchen.',
  'feedback.category_required': 'Bitte eine Kategorie auswählen.',
  'feedback.description_required': 'Bitte eine Beschreibung eingeben.',
  'feedback.section_errors': 'Fehler',
  'feedback.section_network': 'Netzwerkprotokoll',
  'feedback.section_app_log': 'App-Protokoll',
  'feedback.section_environment': 'Umgebung',
  'feedback.section_calendar': 'Kalenderstatus',
  'feedback.section_storage': 'Speicher',
  'feedback.add_screenshot_btn': 'Screenshot hinzufügen',
  'feedback.screenshot_retake_btn': 'Screenshot neu aufnehmen',
  'feedback.screenshot_remove_btn': 'Screenshot entfernen',
  'feedback.screenshot_capturing': 'Tab im Browser-Dialog auswählen…',
  'feedback.mail_send_forbidden':
    'Senden nicht möglich — bitte Administrator um die Mail.Send-Berechtigung bitten.',
  // Feedback-Ticket-Erstellung (Feature 049)
  'feedback.context_section_heading': 'Diagnosekontext',
  'feedback.consent_checkbox': 'Diagnosekontext einbeziehen (Protokolle)',
  'feedback.consent_warning':
    'Wenn aktiviert, werden Diagnoseprotokolle (Fehler, Netzwerkanfragen, App-Aktivität, Kalenderstatus und gespeicherte Einstellungen) an das Ticket angehängt — diese können echte Ticket-Titel, Projektnamen und Zeiteinträge enthalten. Das erstellte Ticket ist für alle sichtbar, die Zugriff auf das Feedback-Projekt bzw. das Repository haben.',
  'feedback.screenshot_section_heading': 'Screenshot (optional)',
  'feedback.screenshot_warning':
    'Ein Screenshot erfasst alles, was gerade auf Ihrem Bildschirm sichtbar ist — einschließlich echter Ticket-Titel, Projektnamen und Zeiteinträge. Fügen Sie nur einen hinzu, wenn Sie mit der Weitergabe des Bildschirminhalts einverstanden sind; das Ticket ist für alle sichtbar, die Zugriff auf das Feedback-Projekt bzw. das Repository haben.',
  'feedback.config_missing':
    'Feedback ist nicht konfiguriert. Bitte wenden Sie sich an Ihren Administrator.',
  'feedback.project_not_found':
    'Ticket konnte nicht erstellt werden — das konfigurierte Feedback-Projekt wurde nicht gefunden (404). Bitte bitten Sie Ihren Administrator, die Feedback-Projekt-ID in config.json zu prüfen.',
  'feedback.creating_ticket': 'Ticket wird erstellt…',
  'feedback.ticket_created': 'Ticket erstellt — vielen Dank! Zum Öffnen klicken.',
  'feedback.github_form_opened': 'GitHub-Issue-Formular in einem neuen Tab geöffnet.',
  'feedback.github_screenshot_confirm_title': 'Screenshot manuell einfügen',
  'feedback.github_screenshot_confirm_message':
    'GitHub kann den Screenshot nicht automatisch übernehmen. Ihr Screenshot wird in die Zwischenablage kopiert — fügen Sie ihn vor dem Absenden (Strg/Cmd+V) in den Issue-Editor ein. Fortfahren?',
  'feedback.github_screenshot_confirm_ok': 'Kopieren & Issue öffnen',
  'feedback.screenshot_manual_note':
    'Fügen Sie den erfassten Screenshot manuell in das GitHub-Issue ein (der Editor unterstützt Einfügen per Zwischenablage).',
  'feedback.upload_failed_partial':
    'Screenshot-Upload fehlgeschlagen; das Ticket wurde ohne Anhang erstellt.',
  'feedback.fallback_title': 'Feedback aus RedmineCalendar',

  // Planning View (feature 038)
  'planning.toggle_label': 'Planungsansicht',
  'planning.close_label': 'Kalenderansicht',
  'planning.bookings_column': 'Buchungen',
  'planning.outlook_column': 'Outlook',
  'planning.prev_day': 'Vorheriger Tag',
  'planning.next_day': 'Nächster Tag',
  'planning.today': 'Heute',
  'planning.loading_outlook': 'Outlook-Termine werden geladen…',
  'planning.outlook_not_connected': 'Outlook ist nicht verbunden. In den Einstellungen verbinden.',
  'planning.outlook_sign_in': 'Nicht bei Outlook angemeldet. Zum Verbinden klicken.',
  'planning.outlook_disabled': 'Outlook-Quelle ist in den Einstellungen deaktiviert.',
  'planning.outlook_error': 'Outlook-Termine konnten nicht geladen werden. {{message}}',
  'planning.outlook_retry': 'Erneut versuchen',
  'planning.bookings_empty': 'Keine Zeiteinträge für diesen Tag.',
  'planning.outlook_empty': 'Keine Outlook-Termine für diesen Tag.',
  'planning.category_bookable': 'Buchbar',
  'planning.category_needs_ticket': 'Ticket erforderlich',
  'planning.category_excluded': 'Ausgeschlossen',
  'planning.event_covered': 'Zeit bereits gebucht',
  'planning.entry_created': 'Zeiteintrag aus {{subject}} erstellt.',
  'planning.batch_n_succeeded': '{{n}} erstellt',
  'planning.batch_n_canceled': '{{n}} abgebrochen',
  'planning.batch_n_failed': '{{n}} fehlgeschlagen',
  'planning.batch_failed_item': 'Buchung von „{{subject}}" fehlgeschlagen: {{error}}',
  'planning.source_outlook_label': 'Microsoft Outlook (Kalendereinträge)',
  'planning.source_teams_label': 'Microsoft Teams (Anrufe & Besprechungen)',
  'planning.sources_section': 'Planungsansicht-Quellen',
  'planning.modal_source_info': 'Quellereignis',
  'planning.modal_source_info_from': 'Quellereignis aus {{source}}',
  'planning.ticket_invalid': 'Ungültiges Ticket',

  // Teams-Spalte
  'planning.teams_column': 'Teams',
  'planning.teams_disabled': 'Teams-Quelle ist in den Einstellungen deaktiviert.',
  'planning.teams_not_connected':
    'Microsoft-Konto nicht verbunden. In den Einstellungen verbinden.',
  'planning.teams_sign_in': 'Nicht bei Microsoft angemeldet. Zum Verbinden klicken.',
  'planning.teams_error': 'Teams-Aktivität konnte nicht geladen werden. {{message}}',
  'planning.teams_empty': 'Keine Teams-Aktivität für diesen Tag.',
  'planning.teams_unavailable_permissions':
    'Teams-Anrufverlauf erfordert zusätzliche Berechtigungen (CallRecords.Read.All). Wenden Sie sich an Ihren IT-Administrator.',
  'planning.teams_participants': '{{names}}',
  'planning.teams_solo_call': 'Einzelanruf',
  'planning.teams_meeting_fallback': 'Teams-Besprechung',
  'planning.teams_participants_truncated': '{{first}} + {{n}} weitere',
  'planning.teams_retry': 'Erneut versuchen',

  'feedback.toolbar_label': 'Feedback',

  // Open-source licenses page (feature 034)
  'licenses.link': 'Open-Source-Lizenzen',
  'licenses.title': 'Open-Source-Lizenzen',
  'licenses.intro': 'Diese Anwendung nutzt die folgenden Open-Source-Bibliotheken.',
  'licenses.col.name': 'Bibliothek',
  'licenses.col.version': 'Version',
  'licenses.col.license': 'Lizenz',
  'licenses.col.homepage': 'Webseite',
  'licenses.col.copyright': 'Copyright',
  'licenses.back': 'Zurück zu den Einstellungen',
  'licenses.error': 'Die Lizenzliste konnte nicht geladen werden. Bitte die Seite neu laden.',

  // Undo / Redo (Feature 039)
  'undo.delete_restored': 'Rückgängig: Eintrag wiederhergestellt',
  'undo.add_removed': 'Rückgängig: Neuer Eintrag entfernt',
  'undo.paste_removed': 'Rückgängig: Eingefügter Eintrag entfernt',
  'undo.edit_reversed': 'Rückgängig: Bearbeitung zurückgesetzt',
  'undo.move_reversed': 'Rückgängig: Verschiebung zurückgesetzt',
  'undo.resize_reversed': 'Rückgängig: Größenänderung zurückgesetzt',
  'undo.bulk_delete_restored': 'Rückgängig: {{count}} Einträge wiederhergestellt',
  'undo.bulk_add_removed': 'Rückgängig: {{count}} Einträge entfernt',
  'undo.bulk_move_reversed': 'Rückgängig: {{count}} Einträge zurückverschoben',
  'undo.failed': 'Rückgängig fehlgeschlagen: {{message}}',

  'redo.delete_reapplied': 'Wiederholen: Eintrag erneut gelöscht',
  'redo.add_reapplied': 'Wiederholen: Eintrag neu erstellt',
  'redo.paste_reapplied': 'Wiederholen: Einfügen erneut angewendet',
  'redo.edit_reapplied': 'Wiederholen: Bearbeitung erneut angewendet',
  'redo.move_reapplied': 'Wiederholen: Verschiebung erneut angewendet',
  'redo.resize_reapplied': 'Wiederholen: Größenänderung erneut angewendet',
  'redo.bulk_delete_reapplied': 'Wiederholen: {{count}} Einträge erneut gelöscht',
  'redo.bulk_add_reapplied': 'Wiederholen: {{count}} Einträge erneut hinzugefügt',
  'redo.bulk_move_reapplied': 'Wiederholen: {{count}} Einträge erneut verschoben',
  'redo.failed': 'Wiederholen fehlgeschlagen: {{message}}',

  // Closed-ticket booking gate (feature 040)
  confirm: 'Bestätigen',
  cancel: 'Abbrechen',
  'closedTicket.tooltip': 'Dieses Ticket ist geschlossen.',
  'timeEntry.closedTicketConfirmTitle': 'Geschlossenes Ticket',
  'timeEntry.closedTicketConfirmBody':
    'Dieses Ticket ist geschlossen. Eine Zeitbuchung könnte gegen die Regeln oder Prozesse deines Projekts verstoßen. Trotzdem fortfahren?',

  // Datenschutz / DSGVO (Feature 044)
  'privacy.retention.cleanup_error':
    'Veraltete Planungsdaten könnten noch vorhanden sein — beim Bereinigen ist ein Fehler aufgetreten.',
  'privacy.link': 'Datenschutz',
  'privacy.title': 'Datenschutzerklärung',
  'privacy.intro':
    'Diese Erklärung informiert darüber, welche personenbezogenen Daten diese Anwendung verarbeitet, zu welchem Zweck und welche Rechte Sie als betroffene Person haben (DSGVO Art. 13).',
  'privacy.controller.heading': 'Verantwortlicher',
  'privacy.rights.heading': 'Ihre Rechte',
  'privacy.data.heading': 'Verarbeitete Daten',
  'privacy.retention.heading': 'Speicherdauer',
  'privacy.ttdsg.heading': 'Speichertechnologien (TTDSG § 25)',
  'privacy.betriebsrat.heading': 'Betriebsratshinweis',
  'settings.deleteData.heading': 'Planungsdaten',
  'settings.deleteData.description':
    'Alle lokal gespeicherten Planungsdaten löschen — Planungs-Snapshots, KI-Einwilligungsnachweis und Planungsquellen-Einstellungen.',
  'settings.deleteData.button': 'Planungsdaten löschen',
  'settings.deleteData.confirm':
    'Alle Planungsdaten löschen? Dies entfernt Ihren KI-Einwilligungsnachweis, Planungs-Snapshots und Planungsquellen-Einstellungen. Nicht-Planungsdaten (Anmeldedaten, Kalendereinstellungen) werden nicht berührt.',
  'settings.deleteData.success': 'Planungsdaten gelöscht.',
  'settings.deleteData.error':
    'Einige Planungsdaten konnten nicht gelöscht werden — bitte erneut versuchen.',
  'settings.consent.heading': 'KI-Planungseinwilligung',
  'settings.consent.status.active':
    'Sie haben die Einwilligung zur Weitergabe von Planungsdaten an den KI-Assistenten erteilt.',
  'settings.consent.status.none': 'Keine KI-Planungseinwilligung erfasst.',
  'settings.consent.grant': 'Einwilligung erteilen',
  'settings.consent.withdraw': 'Einwilligung widerrufen',
  'settings.dataViewer.heading': 'Meine gespeicherten Planungsdaten',
  'settings.dataViewer.empty': 'Keine Planungsdaten gespeichert.',
  'consent.modal.title': 'Planungsdaten mit KI-Assistent teilen?',
  'consent.modal.body':
    'Um Ihre Anfrage zu erfüllen, muss der KI-Assistent auf Ihre persönlichen Planungsdaten (Outlook-Kalendertermine, Teams-Aktivitäten) zugreifen. Diese Daten werden zur Verarbeitung an den konfigurierten KI-Anbieter ({{provider}}) übermittelt. Sie können diese Einwilligung jederzeit in den Einstellungen widerrufen.',
  'consent.modal.accept': 'Erlauben',
  'consent.modal.decline': 'Abbrechen',

  // Booking guard warnings (feature 042)
  'bookingGuard.futureDateTitle': 'Buchung in der Zukunft',
  'bookingGuard.futureDateBody':
    'Dieser Eintrag liegt in der Zukunft. Zeitbuchungen werden normalerweise für bereits geleistete Arbeit erfasst. Trotzdem fortfahren?',
  'bookingGuard.deadlineTitle': 'Buchung nach Meldeschluss',
  'bookingGuard.deadlineBody':
    'Die Einreichungsfrist für diesen Zeitraum ist bereits abgelaufen. Diese Änderung wird nicht im eingereichten Wochenbericht erscheinen. Trotzdem fortfahren?',
  'bookingGuard.deadlineDeleteBody':
    'Die Einreichungsfrist für diesen Zeitraum ist bereits abgelaufen. Das Löschen dieses Eintrags wird im eingereichten Wochenbericht nicht berücksichtigt. Trotzdem fortfahren?',
  'bookingGuard.continueAnyway': 'Trotzdem fortfahren',

  // Multi-day planning event expansion (feature 050)
  'outlook.bulk_booked': '{{n}} Einträge gebucht',
  'outlook.bulk_none_weekdays': 'Keine Werktage in diesem Ereignis — nichts gebucht',
  'outlook.bulk_partial': '{{n}} von {{total}} Einträgen gebucht — {{failed}} fehlgeschlagen',
  'outlook.bulk_day_notice': '{{n}} Tage werden gebucht (Mo–Fr) ab folgendem Datum',
};
