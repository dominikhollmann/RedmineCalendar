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
  'modal.ticket_required': 'Please select a ticket first.',
  'modal.date_required': 'Date is required.',
  'modal.start_required': 'Start time is required.',
  'modal.end_required': 'End time is required.',
  'modal.end_before_start': 'End time must be after start time.',
  'modal.comment_placeholder': 'Comment (optional)',
  'modal.hours_locked_break': 'Hours are locked to 0 because the break ticket is selected.',
  'modal.duration_break': '0m (break)',

  // Calendar
  'calendar.total_suffix': ' total',
  'calendar.overflow_before': 'Time entries exist before the visible range — click to show all',
  'calendar.overflow_after': 'Time entries exist after the visible range — click to show all',
  'calendar.overflow_weekend':
    'Time entries exist on hidden weekend days — click to show full week',
  'calendar.toggle_working_hours': 'Only show working hours',
  'calendar.working_hours_hint': 'Configure working hours in settings to enable this view.',
  'calendar.toggle_workweek': 'Only show Mo–Fr',
  'calendar.entry_saved': 'Time entry saved.',
  'calendar.entry_updated': 'Time entry updated.',
  'calendar.entry_deleted': 'Time entry deleted.',
  'calendar.clipboard_banner': '📋 #{{id}} {{subject}} — click any slot to paste',
  'calendar.break_label': 'Break (0h)',
  'calendar.clipboard_clear_aria': 'Clear clipboard',
  'calendar.check_settings_suffix': ' → Check your settings.',
  'calendar.move_failed': 'Move failed: {{message}}',
  'calendar.resize_failed': 'Resize failed: {{message}}',

  // Time entry display
  'entry.fallback_subject': 'Issue #{{id}}',

  // Errors (redmine-api.js)
  'error.not_configured': 'Not configured — please set your API key.',
  'error.network':
    'Network error — is the CORS proxy running? If using HTTPS, open {{proxyUrl}} in a new tab and accept the certificate.',
  'error.auth_failed': 'Authentication failed — please check your credentials.',
  'error.permission_denied': 'Permission denied.',
  'error.not_found':
    'Not found (404) — check your proxy URL and verify the Redmine REST API is enabled under Administration → Settings → API.',
  'error.validation': 'Validation error.',
  'error.server_unavailable':
    'Redmine server unreachable (503) — check the Redmine server URL in your proxy configuration.',
  'error.unexpected': 'Unexpected error ({{status}}).',

  // Settings validation (settings.js)
  'settings.proxy_required': 'Proxy URL is required.',
  'settings.apikey_required': 'API key is required.',
  'settings.credentials_required': 'Username and password are required.',
  'settings.hours_incomplete': 'Please fill in both start and end time, or leave both empty.',
  'settings.end_before_start': 'End time must be after start time.',
  'settings.connecting': 'Connecting…',
  'settings.invalid_credentials':
    'Invalid credentials — please check your API key or username and password.',
  'settings.proxy_not_found':
    'Proxy URL not found (404) — check the proxy URL and verify the Redmine REST API is enabled.',
  'settings.server_unavailable':
    'Redmine server unreachable (503) — check the Redmine server URL and make sure the proxy is restarted with the new URL.',
  'settings.connection_failed': 'Connection failed: {{message}}',
  'settings.save_btn': 'Save & Connect',
  'settings.server_url_https_required': 'Redmine server URL must start with https://.',

  // Index page
  'page.settings_title': 'Settings',
  'page.go_to_settings': 'Go to Settings',
  'page.retry': 'Retry',
  'page.help_aria': 'Help',

  // Settings page
  'settings_page.tab_title': 'Redmine Calendar – Settings',
  'settings_page.heading': 'Redmine Calendar Settings',
  'settings_page.session_expired': 'Session expired — please re-enter your credentials.',
  'settings_page.connection_heading': 'Connection',
  'settings_page.redmine_server_label': 'Redmine server URL',
  'settings_page.proxy_url_label': 'Redmine proxy URL',
  'settings_page.proxy_url_hint':
    'The proxy URL is what the app uses for API requests (default: http://localhost:8010/proxy).',
  'settings_page.auth_method_heading': 'Authentication method',
  'settings_page.auth_apikey': 'API Key',
  'settings_page.auth_userpass': 'Username & Password',
  'settings_page.apikey_label': 'API key',
  'settings_page.apikey_placeholder': 'Your Redmine API key',
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

  // AI Assistant settings
  'settings_page.ai_heading': 'AI Assistant',
  'settings_page.ai_model_label': 'AI model',
  'settings_page.ai_custom_model_label': 'Custom model name',
  'settings_page.ai_apikey_label': 'AI API key',
  'settings_page.ai_proxy_port_label': 'AI proxy port',
  'settings_page.ai_proxy_tip': 'Start the AI proxy:',
  'settings_page.ai_custom_tip': 'Enter the proxy URL target for your custom provider.',

  // Config errors
  'config.missing':
    'Configuration not found — the administrator needs to create a config.json file. See config.json.example for the required format.',
  'config.malformed':
    'Configuration error — config.json is not valid JSON. Please ask the administrator to check the file.',
  'config.missing_field':
    'Configuration error — required field "{{field}}" is missing in config.json.',

  // Setup screen
  'setup.heading': 'Welcome to Redmine Calendar',
  'setup.intro': 'To get started, you need your personal Redmine API key.',
  'setup.instructions': 'You can find your API key in Redmine under My Account → API access key.',
  'setup.open_redmine': 'Open My Account in Redmine',
  'setup.apikey_label': 'Your API key',
  'setup.apikey_placeholder': 'Paste your Redmine API key here',
  'setup.save_btn': 'Connect',

  // Credential errors
  'credentials.decrypt_failed': 'Could not read saved credentials — please re-enter your API key.',

  // Admin config display
  'admin.heading': 'Server Configuration (managed by admin)',
  'admin.redmine_url': 'Redmine URL',
  'admin.ai_provider': 'AI Provider',
  'admin.ai_model': 'AI Model',

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
  'chatbot.opening_form': 'Opening form…',
  'chatbot.no_entries_found': 'No time entries found for the specified criteria.',
  'chatbot.multiple_matches': 'Multiple entries match — please specify which one.',
  'chatbot.error_generic': 'AI service unavailable — please try again.',
  'chatbot.error_with_detail': 'AI error: {{message}}',
  'chatbot.error_no_key': 'AI API key not configured — set it in Settings.',
  'chatbot.error_proxy':
    'AI proxy not running. If using HTTPS, open {{proxyUrl}} in a new tab and accept the certificate.',
  'chatbot.retry_btn': 'Retry',
  'chatbot.error_rate_limit': 'Too many requests — please wait a moment.',
  'chatbot.fallback_raw_result': 'I couldn’t polish the response, but here are your results:',
  'chatbot.error_invalid_key': 'AI API key invalid — check Settings.',
  'chatbot.welcome': 'Hi! I can help you with RedmineCalendar. Ask me anything about the app.',
  'chatbot.break_routing_disabled':
    'NOTICE TO USER (you MUST relay this verbatim at the top of your summary): Break-routing is disabled — no break ticket is configured. Non-work events appear under "Needs your input" so you can pick a ticket or skip.',

  // Project display
  'project.identifier_label': 'Project',
  'project.no_identifier': 'No project identifier',

  // Voice input
  'voice.start': 'Start voice input',
  'voice.stop': 'Stop recording',
  'voice.cancel': 'Cancel recording',
  'voice.not_supported': 'Voice input is not supported in this browser.',
  'voice.permission_denied':
    'Microphone access denied. Please allow microphone access in your browser settings.',
  'voice.no_speech': 'No speech detected. Please try again.',
  'voice.network_error': 'Speech recognition failed due to a network error.',
  'voice.max_duration': 'Maximum recording time reached.',
  'voice.privacy_notice':
    'Voice input uses your browser’s speech recognition, which may send audio to cloud services for processing.',
  'voice.privacy_dismiss': 'Got it',

  // Outlook booking
  'outlook.not_configured':
    'Outlook integration is not configured. Ask your administrator to set the Azure Client ID in the app configuration.',
  'outlook.auth_failed':
    'Could not authenticate with Microsoft. Please try again or check your SSO session.',
  'outlook.no_events': 'No calendar events found for {{date}}.',
  'outlook.excluded_header':
    'EXCLUDED EVENTS (you MUST mention these to the user when summarizing):',
  'outlook.skipped_private_item': 'private event — {{subject}}',
  'outlook.skipped_overlap_item': 'overlaps an existing time entry — {{subject}}',
  'outlook.skipped_informational_item':
    'informational all-day event (birthday/anniversary/reminder) — {{subject}}',
  'outlook.bookable_header':
    'BOOKABLE MEETINGS for {{date}} (status=proposed; call create_time_entry for each):',
  'outlook.needs_input_header':
    'NEEDS USER INPUT (you MUST ask the user which ticket to book on, or whether to skip):',
  'outlook.meeting_with_ticket': '{{subject}} — #{{ticket}} ({{start}}–{{end}}, {{hours}}h)',
  'outlook.meeting_no_ticket': '{{subject}} — no ticket ({{start}}–{{end}}, {{hours}}h)',
  'outlook.holiday_proposal': '{{subject}} — holiday ticket #{{ticket}} ({{hours}}h)',
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
  'settings.holiday_ticket': 'Holiday ticket #',

  // Documentation panel
  'docs.open_btn': 'Help',
  'docs.panel_title': 'Help',
  'docs.close_btn': 'Close',
  'docs.loading': 'Loading…',
  'docs.load_error': 'Could not load documentation.',

  // ArbZG compliance warnings
  'arbzg.daily_limit': 'Daily limit exceeded: {{observed}}h worked, max {{allowed}}h (ArbZG §3)',
  'arbzg.weekly_limit': 'Weekly limit exceeded: {{observed}}h worked, max {{allowed}}h (ArbZG §3)',
  'arbzg.rest_period': 'Rest period too short: {{observed}}h rest, min {{allowed}}h (ArbZG §5)',
  'arbzg.sunday': 'Work on Sunday (ArbZG §9)',
  'arbzg.holiday': 'Work on public holiday: {{name}} (ArbZG §9)',
  'arbzg.break': 'Break too short: {{observed}} min taken, {{required}} min required (ArbZG §4)',
  'arbzg.break_continuous':
    'Uninterrupted work too long: {{observed}}h without a break, max {{allowed}}h (ArbZG §4)',

  // Anomaly detection (feature 029)
  'anomaly.veryShort.reason': 'Very short entry — possible typo ({{hours}}h)',
  'anomaly.overlap.reason': 'Overlaps with {{start}}–{{end}} entry on the same day',
  'anomaly.badge.aria': 'This entry has anomalies — click for details',
  'anomaly.tooltip.title': 'Possible issue',
  'anomaly.multipleReasons': '{{count}} issues:',
  'anomaly.dismissForTouch': 'Tap badge to close',
};
