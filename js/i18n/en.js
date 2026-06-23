export default {
  // Modal
  'modal.aria_label': 'Log time entry',
  'modal.search_heading': 'Search',
  'modal.search_placeholder': 'Search by name or ID…',
  'modal.no_ticket': 'No ticket selected',
  'modal.date_label': 'Date',
  'modal.start_label': 'Start',
  'modal.end_label': 'End',
  'modal.duration_label': 'Duration',
  'modal.delete_btn': 'Delete',
  'modal.cancel_btn': 'Cancel',
  'modal.save_btn': 'Save',
  'modal.last_used_heading': 'Last used',
  'modal.no_recent': 'No recent tickets',
  'modal.favourites_heading': 'Favourites',
  'modal.no_favourites': 'No favourites yet',
  'modal.delete_confirm': 'Delete this time entry? This cannot be undone.',
  'modal.remove_favourite': 'Remove from favourites',
  'modal.add_favourite': 'Add to favourites',
  'modal.no_results': 'No results',
  'modal.search_error': 'Search unavailable — check your connection.',
  'modal.saving': 'Saving…',
  'modal.save_failed': 'Save failed — please try again.',
  'modal.delete_failed': 'Delete failed.',
  'modal.comment_placeholder': 'Comment (optional)',
  'modal.duration_break': '0m (break)',
  'modal.ticket_required': 'Please select a ticket.',
  'modal.date_required': 'Please enter a date.',
  'modal.start_required': 'Please enter a start time.',
  'modal.end_required': 'Please enter an end time.',
  'modal.end_before_start': 'End time must be after start time.',

  // Calendar
  'calendar.week_total_label': 'Week: ',
  'calendar.overflow_weekend':
    'Time entries exist on hidden weekend days — click to show full week',
  'calendar.toggle_working_hours': 'Only show working hours',
  'calendar.working_hours_hint': 'Configure working hours in settings to enable this view.',
  'calendar.toggle_workweek': 'Only show Mo–Fr',
  'calendar.entry_saved': 'Time entry saved.',
  'calendar.entry_updated': 'Time entry updated.',
  'calendar.entry_deleted': 'Time entry deleted.',
  'calendar.clipboard_banner': '📋 #{{id}} {{subject}} — click any slot to paste',
  'calendar.clipboard_clear_aria': 'Clear clipboard',
  'calendar.check_settings_suffix': ' → Check your settings.',
  'calendar.move_failed': 'Move failed: {{message}}',
  'calendar.resize_failed': 'Resize failed: {{message}}',
  'calendar.refresh_button': 'Refresh',
  'calendar.last_refreshed': 'Last refreshed at {{time}}',
  'calendar.refresh_failed': 'Refresh failed for: {{sources}}',

  // Time entry display
  'entry.fallback_subject': 'Issue #{{id}}',

  // Errors (redmine-api.js)
  'error.not_configured': 'Not configured — please set your API key.',
  'error.network':
    'Network error — cannot reach the CORS proxy. If using a self-signed certificate, open the proxy URL in a new tab to accept it first.',
  'error.auth_failed': 'Authentication failed — please check your credentials.',
  'error.permission_denied': 'Permission denied.',
  'error.not_found':
    'Not found (404) — check your proxy URL and verify the Redmine REST API is enabled under Administration → Settings → API.',
  'error.validation': 'Validation error.',
  'error.server_unavailable':
    'Redmine server unreachable (503) — check the Redmine server URL in your proxy configuration.',
  'error.unexpected': 'Unexpected error ({{status}}).',

  // Settings validation (settings.js)
  'settings.apikey_required': 'API key is required.',
  'settings.credentials_required': 'Username and password are required.',
  'settings.connecting': 'Connecting…',
  'settings.invalid_credentials':
    'Invalid credentials — please check your API key or username and password.',
  'settings.proxy_not_found':
    'Proxy URL not found (404) — check the proxy URL and verify the Redmine REST API is enabled.',
  'settings.server_unavailable':
    'Redmine server unreachable (503) — check the Redmine server URL and make sure the proxy is restarted with the new URL.',
  'settings.connection_failed': 'Connection failed: {{message}}',
  'settings.save_btn': 'Save & Connect',

  // Index page
  'page.settings_title': 'Settings',
  'page.go_to_settings': 'Go to Settings',
  'page.retry': 'Retry',

  // Settings page
  'settings_page.tab_title': 'Redmine Calendar – Settings',
  'settings_page.heading': 'Redmine Calendar Settings',
  'settings_page.auth_method_heading': 'Redmine Authentication',
  'settings_page.auth_apikey': 'API Key',
  'settings_page.auth_userpass': 'Username & Password',
  'settings_page.apikey_label': 'API key',
  'settings_page.apikey_hint': 'Find it under My Account → API access key in Redmine.',
  'settings_page.username_label': 'Username',
  'settings_page.username_placeholder': 'Your Redmine login',
  'settings_page.password_label': 'Password',
  'settings_page.password_placeholder': 'Your Redmine password',
  'settings_page.working_hours_heading': 'Working hours',
  'settings_page.display_heading': 'Calendar display',
  'settings_page.work_start_label': 'Start',
  'settings_page.work_end_label': 'End',
  'settings_page.working_hours_hint': 'Leave both fields empty to disable the working hours view.',
  'settings_page.weekly_hours_hint':
    'Used for booking holidays/OOO. Daily hours = weekly hours ÷ 5.',
  'settings_page.save_btn': 'Save & Connect',

  // Config errors
  'config.missing':
    'Configuration not found — the administrator needs to create a config.json file. See config.json.example for the required format.',
  'config.malformed':
    'Configuration error — config.json is not valid JSON. Please ask the administrator to check the file.',
  'config.missing_field':
    'Configuration error — required field "{{field}}" is missing in config.json.',

  // Setup screen
  'setup.intro': 'To get started, you need your personal Redmine API key.',
  'setup.instructions': 'You can find your API key in Redmine under My Account → API access key.',
  'setup.open_redmine': 'Open My Account in Redmine',

  // Credential errors
  'credentials.decrypt_failed': 'Could not read saved credentials — please re-enter your API key.',

  // Password toggle
  'settings.show_password': 'Show',
  'settings.hide_password': 'Hide',

  // Version
  'version.label': 'Version',

  // Chatbot
  'chatbot.open_btn': 'AI Chat',
  'chatbot.panel_title': 'AI Assistant',
  'chatbot.input_placeholder': 'Ask about RedmineCalendar…',
  'chatbot.send_btn': 'Send',
  'chatbot.loading': 'Thinking…',
  'chatbot.looking_up': 'Looking up your entries…',
  'chatbot.no_entries_found': 'No time entries found for the specified criteria.',
  'chatbot.multiple_matches': 'Multiple entries match — please specify which one.',
  'chatbot.error_generic': 'AI service unavailable — please try again.',
  'chatbot.error_with_detail': 'AI error: {{message}}',
  'chatbot.error_no_key': 'AI assistant is not configured — ask your administrator.',
  'chatbot.error_proxy':
    'AI proxy unreachable. If using a self-signed certificate, open the proxy URL in a new tab to accept it first.',
  'chatbot.retry_btn': 'Retry',
  'chatbot.error_rate_limit': 'Too many requests — please wait a moment.',
  'chatbot.error_invalid_key': 'AI service rejected the request — ask your administrator.',
  'chatbot.welcome': 'Hi! I can help you with RedmineCalendar. Ask me anything about the app.',
  'chatbot.break_routing_disabled':
    'NOTICE TO USER (you MUST relay this verbatim at the top of your summary): Break-routing is disabled — no break ticket is configured. Non-work events appear under "Needs your input" so you can pick a ticket or skip.',

  // Voice input
  'voice.start': 'Start voice input',
  'voice.stop': 'Stop recording',
  'voice.max_duration': 'Maximum recording time reached.',
  'voice.privacy_notice':
    "Voice input uses your browser's speech recognition, which may send audio to cloud services for processing.",
  'voice.privacy_dismiss': 'Got it',
  'voice.consent_reset_label': 'Voice input privacy consent',
  'voice.consent_reset_btn': 'Reset consent',
  'voice.consent_reset_done':
    'Consent reset — you will be asked again next time you use voice input.',

  // Outlook booking
  'outlook.not_configured':
    'Outlook integration is not configured. Ask your administrator to set the Azure Client ID in the app configuration.',
  'outlook.no_events': 'No calendar events found for {{date}}.',
  'outlook.excluded_header':
    'EXCLUDED EVENTS (you MUST mention these to the user when summarizing):',
  'outlook.skipped_overlap_item': 'overlaps an existing time entry — {{subject}}',
  'outlook.skipped_informational_item':
    'informational all-day event (birthday/anniversary/reminder) — {{subject}}',
  'outlook.bookable_header':
    'BOOKABLE MEETINGS for {{date}} (status=proposed; call create_time_entry for each):',
  'outlook.needs_input_header':
    'NEEDS USER INPUT (you MUST ask the user which ticket to book on, or whether to skip):',
  'outlook.meeting_no_ticket': '{{subject}} — no ticket ({{start}}–{{end}}, {{hours}}h)',
  'outlook.allday_ask':
    '{{subject}} — all-day event (not a holiday); ASK the user whether to book this on a ticket OR skip it; do NOT proceed without an explicit answer',
  'outlook.fetch_error': 'Failed to fetch calendar events: {{message}}',
  // Feature 025 — break-ticket booking
  'outlook.meeting_with_ticket_subject':
    '{{subject}} — #{{ticket}} {{ticketSubject}} ({{start}}–{{end}}, {{hours}}h)',
  'outlook.holiday_proposal_subject':
    '{{subject}} — holiday ticket #{{ticket}} {{ticketSubject}} ({{hours}}h)',
  'outlook.vacation_proposal_subject':
    '{{subject}} — vacation ticket #{{ticket}} {{ticketSubject}} ({{hours}}h)',
  'outlook.break_section_header':
    'AUTO-ROUTED TO BREAK TICKET #{{ticket}} {{ticketSubject}} (0h each — non-work events. Call create_time_entry with hours=0, start_time, end_time, comment=event subject; do NOT ask the user):',
  'outlook.break_proposal':
    '{{subject}} — Break (0h) on #{{ticket}} {{ticketSubject}} ({{start}}–{{end}})',
  'settings.weekly_hours': 'Weekly hours',
  'settings.auto_refresh_interval': 'Auto-refresh interval (minutes, 0 = off)',
  'settings.theme.dark_mode': 'Dark mode',
  'settings.fast_mode': 'Fast mode',
  'settings.fast_mode_hint':
    'When on, selecting a ticket closes the time-entry form immediately. Turn off to keep the form open for adding a comment.',
  'branding.logoAlt': '',

  // Documentation panel
  'docs.open_btn': 'Help',
  'docs.panel_title': 'Help',
  'docs.close_btn': 'Close',
  'docs.loading': 'Loading…',
  'docs.load_error': 'Could not load documentation.',

  // ArbZG compliance warnings
  'arbzg.sunday': 'Work on Sunday (ArbZG §9)',
  'arbzg.holiday': 'Work on public holiday: {{name}} (ArbZG §9)',

  // Anomaly detection (feature 029)
  'anomaly.veryShort.reason': 'Very short entry — possible typo ({{hours}}h)',
  'anomaly.overlap.reason': 'Overlaps with {{start}}–{{end}} entry on the same day',
  'anomaly.badge.aria': 'This entry has anomalies — click for details',
  'anomaly.multipleReasons': '{{count}} issues:',
  'anomaly.dismissForTouch': 'Tap badge to close',

  // Accessibility labels (feature 033 / US4)
  'a11y.chatbot.close': 'Close chatbot',

  // Feedback button (feature 037)
  'feedback.button_label': 'Give Feedback',
  'feedback.dialog_title': 'Send Feedback',
  'feedback.category_label': 'Category',
  'feedback.category_bug': 'Bug Report',
  'feedback.category_suggestion': 'Suggestion',
  'feedback.description_placeholder': 'Describe the bug or your idea…',
  'feedback.submit_btn': 'Send',
  'feedback.cancel_btn': 'Cancel',
  'feedback.context_heading': 'Context (auto-collected)',
  'feedback.screenshot_unavailable': 'Screenshot unavailable',
  'feedback.sending': 'Sending…',
  'feedback.sent': 'Feedback sent — thank you!',
  'feedback.send_failed': 'Could not send feedback. Please try again.',
  'feedback.category_required': 'Please select a category.',
  'feedback.description_required': 'Please enter a description.',
  'feedback.section_errors': 'Errors',
  'feedback.section_network': 'Network Log',
  'feedback.section_app_log': 'App Log',
  'feedback.section_environment': 'Environment',
  'feedback.section_calendar': 'Calendar State',
  'feedback.section_storage': 'Storage',
  'feedback.section_screenshot': 'Screenshot',
  'feedback.add_screenshot_btn': 'Add Screenshot',
  'feedback.screenshot_capturing': 'Select the tab in the browser prompt…',
  'feedback.mail_send_forbidden':
    'Could not send — ask your admin to grant mail permissions (Mail.Send scope).',
  // Feedback ticket creation (feature 049)
  'feedback.consent_checkbox': 'Include diagnostic context (screenshot & logs)',
  'feedback.consent_warning':
    'When enabled, the screenshot captures whatever is visible on your screen right now — including real issue titles, project names, and time entries — and the logs are attached to the ticket. The resulting ticket is visible to everyone with access to the feedback project or repository.',
  'feedback.config_missing': 'Feedback is not configured. Please contact your administrator.',
  'feedback.creating_ticket': 'Creating ticket…',
  'feedback.ticket_created': 'Ticket created — thank you! Click to open.',
  'feedback.github_form_opened': 'GitHub issue form opened in a new tab.',
  'feedback.screenshot_manual_note':
    'Paste the captured screenshot manually into the GitHub issue (the editor supports paste-to-upload).',
  'feedback.upload_failed_partial':
    'Screenshot upload failed; the ticket was created without the attachment.',
  'feedback.fallback_title': 'Feedback from RedmineCalendar',

  // Planning View (feature 038)
  'planning.toggle_label': 'Planning View',
  'planning.close_label': 'Calendar View',
  'planning.bookings_column': 'Bookings',
  'planning.outlook_column': 'Outlook',
  'planning.prev_day': 'Previous day',
  'planning.next_day': 'Next day',
  'planning.today': 'Today',
  'planning.loading_outlook': 'Loading Outlook events…',
  'planning.outlook_not_connected': 'Outlook is not connected. Go to Settings to connect.',
  'planning.outlook_sign_in': 'Not signed in to Outlook. Click to connect.',
  'planning.outlook_disabled': 'Outlook source is disabled in Settings.',
  'planning.outlook_error': 'Could not load Outlook events. {{message}}',
  'planning.outlook_retry': 'Retry',
  'planning.bookings_empty': 'No time entries for this day.',
  'planning.outlook_empty': 'No Outlook events for this day.',
  'planning.category_bookable': 'Bookable',
  'planning.category_needs_ticket': 'Needs ticket',
  'planning.category_excluded': 'Excluded',
  'planning.event_covered': 'Time already booked',
  'planning.entry_created': 'Time entry created from {{subject}}.',
  'planning.batch_n_succeeded': '{{n}} created',
  'planning.batch_n_canceled': '{{n}} canceled',
  'planning.batch_n_failed': '{{n}} failed',
  'planning.batch_failed_item': 'Failed to book "{{subject}}": {{error}}',
  'planning.source_outlook_label': 'Microsoft Outlook (Calendar Events)',
  'planning.source_teams_label': 'Microsoft Teams (calls & meetings)',
  'planning.sources_section': 'Planning View Sources',
  'planning.modal_source_info': 'Source event',
  'planning.modal_source_info_from': 'Source event from {{source}}',
  'planning.ticket_invalid': 'invalid ticket',

  // Teams column
  'planning.teams_column': 'Teams',
  'planning.teams_disabled': 'Teams source is disabled in Settings.',
  'planning.teams_not_connected': 'Microsoft account not connected. Go to Settings to connect.',
  'planning.teams_sign_in': 'Not signed in to Microsoft. Click to connect.',
  'planning.teams_error': 'Could not load Teams activity. {{message}}',
  'planning.teams_empty': 'No Teams activity for this day.',
  'planning.teams_unavailable_permissions':
    'Teams call history requires additional permissions (CallRecords.Read.All). Contact your IT administrator to enable this.',
  'planning.teams_participants': '{{names}}',
  'planning.teams_solo_call': 'Solo call',
  'planning.teams_meeting_fallback': 'Teams Meeting',
  'planning.teams_participants_truncated': '{{first}} + {{n}} more',
  'planning.teams_retry': 'Retry',
  'feedback.toolbar_label': 'Feedback',

  // Open-source licenses page (feature 034)
  'licenses.link': 'Open-source licenses',
  'licenses.title': 'Open-source licenses',
  'licenses.intro': 'This application uses the following open-source libraries.',
  'licenses.col.name': 'Library',
  'licenses.col.version': 'Version',
  'licenses.col.license': 'License',
  'licenses.col.homepage': 'Homepage',
  'licenses.col.copyright': 'Copyright',
  'licenses.back': 'Back to settings',
  'licenses.error': 'Could not load the license list. Please reload the page.',

  // Undo / redo (feature 039)
  'undo.delete_restored': 'Undo: entry restored',
  'undo.add_removed': 'Undo: new entry removed',
  'undo.paste_removed': 'Undo: pasted entry removed',
  'undo.edit_reversed': 'Undo: edit reversed',
  'undo.move_reversed': 'Undo: move reversed',
  'undo.resize_reversed': 'Undo: resize reversed',
  'undo.bulk_delete_restored': 'Undo: {{count}} entries restored',
  'undo.bulk_add_removed': 'Undo: {{count}} entries removed',
  'undo.bulk_move_reversed': 'Undo: {{count}} entries moved back',
  'undo.failed': 'Undo failed: {{message}}',

  'redo.delete_reapplied': 'Redo: entry deleted again',
  'redo.add_reapplied': 'Redo: entry re-created',
  'redo.paste_reapplied': 'Redo: paste re-applied',
  'redo.edit_reapplied': 'Redo: edit re-applied',
  'redo.move_reapplied': 'Redo: move re-applied',
  'redo.resize_reapplied': 'Redo: resize re-applied',
  'redo.bulk_delete_reapplied': 'Redo: {{count}} entries deleted again',
  'redo.bulk_add_reapplied': 'Redo: {{count}} entries added again',
  'redo.bulk_move_reapplied': 'Redo: {{count}} entries moved again',
  'redo.failed': 'Redo failed: {{message}}',

  // Closed-ticket booking gate (feature 040)
  confirm: 'Confirm',
  cancel: 'Cancel',
  'closedTicket.tooltip': 'This ticket is closed.',
  'timeEntry.closedTicketConfirmTitle': 'Closed ticket',
  'timeEntry.closedTicketConfirmBody':
    "This ticket is closed. Booking time on it may not be in line with your project's rules or processes. Continue anyway?",

  // Privacy / DSGVO (feature 044)
  'privacy.retention.cleanup_error':
    'Stale planning data may remain — retention cleanup encountered an error.',
  'privacy.link': 'Privacy',
  'privacy.title': 'Privacy Notice',
  'privacy.intro':
    'This notice explains what personal data this application processes, for what purpose, and what rights you have as a data subject (GDPR Art. 13).',
  'privacy.controller.heading': 'Data Controller',
  'privacy.rights.heading': 'Your Rights',
  'privacy.data.heading': 'Data Processed',
  'privacy.retention.heading': 'Retention Periods',
  'privacy.ttdsg.heading': 'Storage Technologies (TTDSG § 25)',
  'privacy.betriebsrat.heading': 'Works Council Note',
  'settings.deleteData.heading': 'Planning Data',
  'settings.deleteData.description':
    'Remove all locally stored planning data — planning snapshots, AI consent record, and planning source preferences.',
  'settings.deleteData.button': 'Delete planning data',
  'settings.deleteData.confirm':
    'Delete all planning data? This removes your AI consent record, planning snapshots, and planning source settings. Non-planning data (credentials, calendar preferences) will not be affected.',
  'settings.deleteData.success': 'Planning data deleted.',
  'settings.deleteData.error': 'Some planning data could not be deleted — please try again.',
  'settings.consent.heading': 'AI Planning Consent',
  'settings.consent.status.active':
    'You have given consent to share planning data with the AI assistant.',
  'settings.consent.status.none': 'No AI planning consent recorded.',
  'settings.consent.grant': 'Grant consent',
  'settings.consent.withdraw': 'Withdraw consent',
  'settings.dataViewer.heading': 'My stored planning data',
  'settings.dataViewer.empty': 'No planning data stored.',
  'consent.modal.title': 'Share planning data with AI assistant?',
  'consent.modal.body':
    'To fulfil your request, the AI assistant needs to access your personal planning data (Outlook calendar events, Teams activity). This data will be sent to the configured AI provider ({{provider}}) for processing. You can withdraw this consent at any time in Settings.',
  'consent.modal.accept': 'Allow',
  'consent.modal.decline': 'Cancel',

  // Booking guard warnings (feature 042)
  'bookingGuard.futureDateTitle': 'Booking in the future',
  'bookingGuard.futureDateBody':
    'This entry is dated in the future. Time entries are usually logged for work already done. Continue anyway?',
  'bookingGuard.deadlineTitle': 'Booking after reporting deadline',
  'bookingGuard.deadlineBody':
    'The reporting cutoff for this period has already passed. This change will not appear in the submitted weekly report. Continue anyway?',
  'bookingGuard.deadlineDeleteBody':
    'The reporting cutoff for this period has already passed. Deleting this entry will not be reflected in the submitted weekly report. Continue anyway?',
  'bookingGuard.continueAnyway': 'Continue anyway',
};
