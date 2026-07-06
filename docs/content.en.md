# RedmineCalendar Help

**Contents**

1. [Getting Started](#getting-started)
2. [Calendar Navigation](#calendar-navigation)
3. [Time Entries](#time-entries)
4. [Break-Ticket Entries](#break-ticket-entries)
5. [Copy and Paste Time Entries](#copy-and-paste-time-entries)
6. [Bulk Select, Move, and Delete](#bulk-select-move-and-delete)
7. [Working Hours View](#working-hours-view)
8. [Work Week / Full Week Toggle](#work-week--full-week-toggle)
9. [Planning View](#planning-view)
10. [Mobile](#mobile)
11. [Favourite Issues](#favourite-issues)
12. [ArbZG Compliance Indicators](#arbzg-compliance-indicators)
13. [Anomaly Indicators](#anomaly-indicators)
14. [AI Chat Assistant](#ai-chat-assistant)
15. [Settings](#settings)
16. [Keyboard Shortcuts](#keyboard-shortcuts)

## Getting Started

RedmineCalendar is a weekly calendar view for your Redmine time entries. It connects to your Redmine server and displays all your time entries in a familiar calendar layout.

To get started, open **Settings** (gear icon in the header) and enter your personal Redmine API key. The Redmine server URL and other shared settings are configured by your administrator in `config.json`.

## Calendar Navigation

The calendar shows one week at a time. Use the navigation buttons in the toolbar:

- **Previous / Next** arrows move one week back or forward
- **Today** button jumps to the current week
- **Refresh** button (🔄 in the toolbar) reloads your time entries and planning data from Redmine without a full page reload. A toast confirms the last refresh time.
- The **week total** is displayed in the header, showing the sum of all hours for the visible week

If you have set a **Weekly hours** target in Settings, the header also shows a target indicator next to the week total:

- `Booked / Target` — e.g., `24 / 40h`
- `Xh left` — remaining hours to reach the target
- `Xd` — remaining workdays in the current week (not shown for past weeks)

When the target is exactly met, a check mark (✓) is shown. When exceeded, the overage appears as `+Xh`. The indicator updates immediately when you add, edit, or delete entries.

## Time Entries

### Creating a Time Entry

Click or drag on any empty time slot in the calendar. The **Add booking** form opens as two always-visible steps on one screen — no wizard, no "confirm ticket" step.

**Step 1 · Select ticket** shows three equal columns so you can pick your ticket whichever way is fastest:

- **Search** — find a Redmine issue by name, ID, or **project** (type a project identifier such as "web-app" or a project name to filter by project, or combine terms like "web-app login"). Type `#1234` to look up a specific ticket by ID. The Search column stays empty until you start typing.
- **Last used** — your recently used issues (up to 20 shown).
- **Favourites** — your favourited issues.

A single click on any row in any column selects that ticket — Step 2 below updates instantly. Long ticket titles and project paths are shortened with an ellipsis; hover a row to see the full text.

> **Note on closed issues:** The issue search returns **open issues only**. Closed or resolved issues do not appear in search results. If you need to book time against a closed issue, enter its ID directly (e.g. `#1234`) — a direct ID lookup bypasses the open-only filter and works regardless of issue status.

**Step 2 · Booking details** is always visible below and pre-filled from your selection:

- The selected ticket (with a favourite-star toggle)
- Date, start time, and end time (pre-filled from where you clicked — all three are required); the duration is computed automatically
- An optional comment

Then save the entry. The ticket ID and title in the form is a clickable link to the Redmine ticket.

**Resizing:** the modal opens wide enough that ticket text isn't cut off, and you can drag its bottom-right corner to make it larger — extra height goes to the ticket lists (more rows). Your chosen size is remembered for next time. You can also drag the modal by its header to reposition it; the position isn't remembered — it re-centers the next time you open it.

**The form does not close on outside clicks.** To close the form without saving, press **Escape** or click **Cancel**. This prevents accidentally losing your typed input.

The entry appears on the calendar immediately after saving. The ticket number on each calendar entry is a clickable link to the Redmine ticket (opens in a new tab). Each entry also shows the **project identifier and name** (e.g., "web-app — Web App") to help distinguish entries across projects.

### Full-text hover

Short entries clip their text to fit the slot. **Hover the pointer over any calendar or planning-view event** (or move keyboard focus to it) to see a tooltip with the event's complete text — issue, project, time range with duration, and the comment when present. The same custom tooltip style is used consistently across the app's buttons and controls.

### Closed-Ticket Warning

If the selected ticket is closed, a **⚠ This ticket is closed.** badge appears in the form. When you click **Save**, a confirmation dialog asks you to confirm before the entry is submitted to Redmine. This applies to all booking paths — the modal form (new and edit), copy-paste pre-fill, AI pre-fill, Planning View drag-to-book, and drag-to-move on the main calendar.

The **⚠ icon also appears inline** next to the ticket title in the **Last Used** and **Favourites** quick-pick lists when the issue has since been closed — so you can spot stale shortcuts before selecting them.

### Future-Date Booking Warning

When you save a time entry dated **in the future**, a confirmation dialog asks you to confirm before the entry is submitted. Future-dated entries are unusual because time entries are normally logged for work already completed. Clicking **Continue anyway** proceeds with the save; clicking **Cancel** returns you to the form so you can correct the date.

**Exemption:** entries booked to the admin-configured holiday ticket or vacation ticket are exempt from this check, because scheduling leave in advance is valid.

### Reporting-Deadline Booking Warning

Your administrator can configure a **reporting deadline** (for example, every Friday at 22:00). When you create, edit, or delete a time entry dated **before the most recent deadline**, a confirmation dialog warns you that the change will not appear in any already-submitted weekly report. The deadline check applies to:

- Saving a new entry or editing an existing one via the time-entry form.
- Deleting a single entry via the form's Delete button.
- Deleting entries via the keyboard shortcut (**Del** in bulk-select mode).
- Dragging an entry to a new time slot or resizing it on the calendar.

Clicking **Continue anyway** applies the change. Clicking **Cancel** leaves the entry unchanged.

If no deadline is configured by the administrator (the default), this warning is never shown.

### Editing a Time Entry

Double-click an existing time entry (or select it and press **Enter**) to open the edit form. Change any field and click **Save**.

### Deleting a Time Entry

Select a time entry by clicking it, then press **Del** to delete it. You will be asked to confirm before the entry is removed.

## Break-Ticket Entries

Your administrator can configure a **break ticket** in `config.json`. Time entries on the break ticket represent non-work blocks (lunch, doctor appointment, gym, overtime compensation, etc.) that you want visible on your calendar without counting them as worked time.

Whenever you select the break ticket — manually in the time-entry form, or because the AI assistant prefilled it from an Outlook event — the modal's duration readout switches to **"0m (break)"** to indicate the entry will be saved at zero hours. The Start and End time inputs stay editable, so the calendar block reflects the real event duration. Switching back to a non-break ticket restores the computed duration display.

Break entries appear on the calendar in a muted gray colour with a small "(0h)" badge. They do not count as work hours toward your weekly or daily booked-hours total. (If your Redmine instance does not accept zero-hour time entries, the app stores 0.01h as a placeholder so the entry can persist; the calendar still treats it as a break.)

## Copy and Paste Time Entries

You can duplicate time entries to quickly fill in similar work:

1. **Select** a time entry by clicking it (it highlights with a blue border)
2. Press **Ctrl+C** to copy it — a banner appears confirming the copy
3. **Click any empty time slot** to paste the entry there
4. The pasted entry keeps the same issue and duration but uses the new time slot

Drag on a range of slots to paste with a custom duration.

## Bulk Select, Move, and Delete

You can select multiple time entries at once and move or delete them all in one step.

### Selecting Multiple Entries

- **Single-click** selects one entry (as before).
- **Shift+click** adds or removes an entry from the multi-selection. Selected entries are highlighted with a blue outline.
- **Click an empty time slot** or navigate to another week to clear the entire selection.

When two or more entries are selected, a **bulk toolbar** appears showing the count of selected entries and the available actions.

### Moving Multiple Entries

Click **+1 day** or **−1 day** in the bulk toolbar to shift all selected entries forward or back by one day. Each entry keeps its original time-of-day and duration.

A banner reports how many entries moved successfully. Any that failed (for example, a locked billing period) remain selected so you can retry.

### Deleting Multiple Entries

Click **Delete** in the bulk toolbar. A confirmation dialog shows the number of entries that will be removed. Confirm to delete them all from Redmine.

> **Note:** Bulk select is only available on desktop. On phones (viewport < 768 px), shift-click has no effect.

## Working Hours View

Toggle the working hours view using the **clock icon** button in the calendar toolbar. When enabled, the calendar only shows time slots within your configured working hours (e.g., 08:00–17:00).

If you have time entries outside the visible range, indicators appear at the top or bottom of the calendar to let you know.

Configure your working hours in **Settings** under the "Working hours" section. Leave both fields empty to disable this view.

## Work Week / Full Week Toggle

Use the **Mo–Fr** toggle button in the toolbar to switch between:

- **Work week**: Shows Monday through Friday only
- **Full week**: Shows all seven days including Saturday and Sunday

If you have time entries on hidden weekend days, an indicator appears at the side of the calendar.

## Planning View

Planning View shows your Redmine time entries, Outlook calendar events, and Microsoft Teams calls & meetings side by side for a single day, making it easy to book time directly from your calendar and communication history.

### Opening Planning View

- Click the **Planning View** button in the header (desktop only — the button is hidden on screens narrower than 768 px).
- Or **double-click** any day column header in the weekly calendar to jump straight to that day in Planning View.

### Day Navigation

Use the **◀** (previous) and **▶** (next) buttons in the Planning View header to move one day at a time. The **Today** button always jumps to the current date. If the **Mo–Fr** toggle is active in the main calendar, day navigation automatically skips weekends.

### Bookings Column (left)

Shows your Redmine time entries for the selected day as a standard FullCalendar time grid. You can:

- **Click and drag** an empty slot to create a new time entry (the standard form opens).
- **Double-click** an existing entry to edit or delete it.
- **Drag** an entry to move it to a different time.

The **Bookings** column header shows the total booked hours for the current day (e.g., `6:30`). The total updates automatically after each booking.

ArbZG compliance overlays (work-hour warnings) appear in the Bookings column exactly as they do in the main calendar.

### Outlook Column (right)

Shows your Outlook / Microsoft 365 calendar appointments for the day. Appointments require Outlook to be connected in Settings. Each appointment has a colour-coded classification:

| Colour | Category     | Meaning                                                          |
| ------ | ------------ | ---------------------------------------------------------------- |
| Green  | Bookable     | Has a matching Redmine issue — drag to create an entry instantly |
| Amber  | Needs ticket | No issue found yet — drag to open the form and pick an issue     |
| Grey   | Excluded     | Break, holiday, vacation, or all-day filler — cannot be booked   |

### Drag-to-Book

Drag any **bookable** or **needs-ticket** card from the Outlook column to the Bookings column:

- **Bookable**: A Redmine time entry is created immediately (no form). Cards for closed tickets show a **⚠** icon in the event title — dragging one shows a confirmation dialog before the entry is submitted. Cards whose ticket ID was not found in Redmine also show a **⚠** icon (tooltip: "Invalid ticket") instead of a separate ticket row.
- **Needs-ticket**: The time-entry form opens pre-filled with the appointment's start time, end time, and hours. A **source-event card** at the top shows which column the event came from plus the original event's `start–end (duration)` — for an all-day or multi-day event this is shown as a date or date range (e.g. `2026-07-08–2026-07-11 (4d)`) rather than a time.

All-day events (holidays, vacation, multi-day blocks) display their **date span** instead of a time range on the planning card — a single date with `(1d)` for a one-day event, or a start–end date range with the total day count (e.g. `(10d)`) for a multi-day event.

When you drag a **multi-day** event (e.g. a holiday or training block spanning several days), the app automatically expands it into one time entry per weekday (Mon–Fri) within the event's date range, skipping weekends. Each entry uses your daily hours (weekly hours ÷ 5). If the event needs a ticket, the form opens **once** with a notice — **"N days will be booked (Mon–Fri) from the following date"** — above the start date, which is **locked** (the run always begins on the event's first day; changing it is not supported). Ticket, activity, and comment are reused for every day, the whole batch is a single undo step, and a toast confirms how many entries were created. Note the booked-day count can be lower than the calendar-day span when the range includes weekends (e.g. a 4-day event over a Saturday books 3 entries).

To book **multiple events at once**: shift-click to select several cards (excluded cards cannot be selected), then drag any selected card. After the batch completes, a toast shows how many entries were created and how many failed. The Outlook and Teams columns share one selection pool — shift-clicking across both columns accumulates a single selection, and dragging any selected card books all selected events from both columns. Clicking a booking in the Bookings column clears the Outlook/Teams selection, and vice versa.

### Time-Covered Greyout

If an Outlook appointment's full time range is already covered by an existing Redmine booking, the card is shown with a semi-transparent overlay. The classification colour remains faintly visible so you can still identify the event type.

### Disabling the Outlook Column

Open **Settings → Planning View Sources** and turn off the Outlook toggle. The column will show a "disabled" message instead of events. Re-enabling the toggle restores it on the next navigation.

### Teams Column (rightmost)

Shows your Microsoft Teams calls and online meetings for the day. The Teams column requires:

1. **Microsoft 365 connected** — your administrator must configure an Azure app registration (`azureClientId` in `config.json`) and you must be signed in via the Outlook integration.
2. **Teams column enabled** — open **Settings → Planning View Sources** and turn on the **Microsoft Teams** toggle (off by default).

Once enabled, the column shows:

- **Calls** — direct and group calls you participated in, showing the other participants' names and the actual call duration (from the moment you joined to the moment you left, rounded to the nearest 15 minutes for booking).
- **Meetings** — scheduled Teams meetings where your actual join/leave times were recorded. The meeting title is shown. If no actual attendance data is available for a meeting, the meeting is omitted from the column (FR-005: only show what you actually attended).

The same colour-coded classification applies as in the Outlook column (green = bookable, amber = needs ticket, grey = excluded).

**Booking a Teams event**: drag a card to the Bookings column. The time-entry form opens pre-filled with the rounded start and end times. A label reading **"Source event from Teams"** confirms the origin. For calls, the comment field is empty (no personal participant data is stored in Redmine). For meetings, the comment is pre-filled with the meeting title.

**Closed-ticket detection**: if a Teams event's issue reference points to a closed Redmine ticket, the card shows a **⚠** icon — dragging it shows the same confirmation dialog as for Outlook bookable events.

**Required Microsoft permissions**: The calls track (`/communications/callRecords`) requires the `CallRecords.Read.All` application permission, which must be granted by a Microsoft 365 administrator. If this permission has not been granted, the calls section shows a "permissions unavailable" notice while meetings continue to work normally. The meetings track only needs your personal delegated `Calendars.Read` permission (same as Outlook).

**Memoisation cache**: Redmine issue lookups are shared across the Outlook and Teams columns. If the same issue number appears in both columns, only one Redmine API call is made per session — the result is cached in memory until you navigate away.

### Returning to the Calendar

Click **Back to Calendar** in the Planning View header (or click the toggle button again). The main calendar resumes at the week that contains the last day you were viewing.

## Mobile

RedmineCalendar adapts to phones and small screens automatically:

- **Day view**: On phones the calendar switches to a single-day view (instead of the weekly grid) so each entry is large enough to read.
- **Swipe navigation**: Swipe left or right anywhere on the calendar to jump to the next or previous day.
- **Tap an empty slot** to open the time-entry form full-screen.
- **Time-entry form**: full-screen on phones, with larger inputs and 44px+ touch targets so it's easy to tap precisely.
- **AI chat panel**: opens as a full-screen overlay on phones (rather than a side panel) for a comfortable typing area.

The Outlook calendar booking flow (under the AI Chat Assistant) is intended for desktop use; on phones, prefer manual time entry or the chat-driven create / edit / delete commands.

## Favourite Issues

Mark frequently used issues as favourites for quick access:

- In the time entry form, click the **star icon** next to any search result, recent issue, or entry in the **Last Used** list to add it to your favourites
- Favourites appear in their own section at the top of the issue picker
- Click the star again to remove an issue from favourites

Favourites are stored locally in your browser and persist across sessions.

The **Last Used** list shows the 20 most recently booked issues. The list scrolls if there are many entries. You can add or remove any Last Used entry from Favourites directly by clicking its star — no need to search first.

## ArbZG Compliance Indicators

The calendar shows warnings when your logged hours may conflict with German working time regulations (Arbeitszeitgesetz):

- **Daily limit**: More than 10 hours worked in a day
- **Weekly limit**: More than 48 hours worked in a week
- **Rest period**: Less than 11 hours between the end of one day and the start of the next
- **Break duration**: At least 30 minutes of break time after 6 hours worked, or 45 minutes after 9 hours
- **Continuous work**: No uninterrupted stretch longer than 6 hours
- **Sunday/holiday work**: Time entries logged on Sundays or public holidays

Warnings appear as colored indicators on the affected day headers. Hover over them for details.

**Vacation and public-holiday entries are exempt from these checks.** Time entries booked to the admin-configured holiday ticket or vacation ticket represent paid leave, not working time, so they don't count toward daily/weekly totals, don't trigger Sunday/holiday warnings on the day they fall, and don't trigger break-time requirements. Regular work entries on the same day are still evaluated normally.

## Anomaly Indicators

The calendar flags time entries that may contain errors with a small **⚠ badge** in the corner of the entry. Hover over the badge (or tap on mobile) to see the reason. The badge disappears as soon as you correct the entry — no page reload needed.

### Very Short Entry

An entry shorter than 6 minutes (0.1 h) on a non-break ticket is flagged as a possible typo. Open the entry and correct the duration.

### Overlapping Entries

If two entries on the same day overlap in time, both are flagged with the start and end time of the conflicting entry. Break-ticket entries are excluded from overlap detection.

A single entry can trigger more than one rule; the tooltip lists every reason.

## AI Chat Assistant

The AI Chat Assistant helps you understand and use RedmineCalendar. Click the **chat icon** (💬) in the calendar header to open the chat panel.

### What you can ask

- How to use any feature ("How do I copy a time entry?")
- What warnings mean ("What is the ArbZG daily limit?")
- Questions about your time entries ("How much did I book last week?", "When did I last work on ticket #123?")
- Questions in German or English — the assistant responds in your language

### Managing time entries via chat

You can create, edit, and delete time entries by typing natural language commands:

- **Create**: "Book 2 hours on ticket #5678 for today" — opens the time entry form pre-filled
- **Edit**: "Change my Monday entry on ticket #5678 to 3 hours" — opens the form with the entry and proposed changes
- **Delete**: "Delete my entry from yesterday on ticket #1234" — opens the form so you can confirm deletion

The assistant always opens the time entry form for you to review and confirm — it never makes changes without your approval.

### Voice Input

You can speak to the AI assistant instead of typing. Click the **microphone button** next to the send button to start voice input.

- **Start**: Tap the mic button to begin recording. You will see your speech transcribed live in the input field.
- **Auto-send**: Recording stops automatically after 2 seconds of silence and your message is sent — fully hands-free.
- **Stop**: You can also tap the stop button to finish immediately.
- **Cancel**: Tap the mic button again before speaking to cancel without sending.
- The mic button is only visible in browsers that support speech recognition (Chrome, Edge, Safari).
- On first use, a privacy notice explains that your browser may send audio to cloud services for processing.
- Recording stops automatically after 60 seconds maximum.

### Outlook Calendar Booking

If your administrator has configured the Azure AD integration, you can book your Outlook meetings as time entries:

1. Say **"Book my time for today"** (or any date)
2. The assistant fetches your Outlook calendar and returns four labelled sections — **Excluded**, **Auto-routed to break ticket**, **Bookable meetings**, **Needs your input** — with each event's proposed Redmine ticket **number AND title**
3. Ticket extraction always wins: meetings with `#1234` in the title route to that ticket regardless of any other classification (e.g. "Lunch Sync #1234" books to #1234, not the break ticket)
4. **Auto-routed to break ticket** — non-work events (lunch, doctor, gym, coffee, Mittagessen, Arzttermin, etc.) and overtime-compensation blocks (Überstundenausgleich, Comp time) are booked to the configured break ticket at 0 hours, preserving the real Outlook event duration as the calendar block
5. **Bookable meetings** — work meetings with extracted tickets, bank-holiday all-day events on the holiday ticket, and vacation/OOO all-day events on the vacation ticket
6. **Needs your input** — meetings without a ticket the tool couldn't classify, sick-leave events (never auto-routed), and any other unclassified all-day event. You pick the ticket or skip
7. **Excluded** — overlapping meetings (already covered by an existing entry) and informational events (birthdays, anniversaries, reminders)

**All-day classification** distinguishes:

- **Bank/public holidays** (Bank Holiday, Feiertag, Christi Himmelfahrt, Christmas Day, Thanksgiving, …) → holiday ticket at daily hours
- **Vacation / OOO** (Urlaub, vacation, day off, OOO, abwesend, annual leave) → vacation ticket at daily hours
- **Overtime compensation** (Überstundenausgleich, Überstundenabbau, Zeitausgleich, Gleittag, comp time, TOIL) → break ticket at 0 hours
- **Sick leave** (krank, sick, Krankmeldung) → never auto-routed; you pick the right ticket
- All-day events marked **Out of Office** in Outlook (no keyword match) → fall back to holiday ticket
- Birthdays / anniversaries / reminders → excluded (never booked)

**Settings for Outlook booking** (in Settings page):

- **Weekly hours**: Your contractual weekly hours. Daily hours (used for holiday/vacation entries and multi-day bookings) = weekly ÷ 5. This field is **required** and defaults to **40** — leaving it empty or entering 0 shows an error and prevents saving. If no value is ever stored, the app falls back to 40.

The **holiday ticket**, **vacation ticket**, and **break ticket** are configured by your administrator in `config.json` — they are deployment-wide and not editable per user. If a ticket is unset, events that would route there fall through to "Needs your input".

The Outlook **Private/Confidential** sensitivity flag has no effect on routing — classification is based on the event subject only. A real-work meeting marked Private will still be proposed as work; a non-work event marked Public will still be proposed as a break. Times are rounded to quarter hours.

When you confirm a break-routed entry, the modal opens with the break-ticket behavior described in [Break-Ticket Entries](#break-ticket-entries).

### Tips

- The assistant knows the app's documentation, feature specifications, and source code
- It will decline questions unrelated to RedmineCalendar
- It will never reveal your API keys or credentials
- The conversation is preserved if you close and reopen the panel (cleared on page reload)
- Drag the left edge of the panel to resize it

## Settings

Open Settings by clicking the **gear icon** in the header.

The Settings page is organised into grouped cards — **Display**, **Working hours**, **Authentication**, **Sources**, and **Data & privacy** — with a section navigation (a rail on desktop, a chip-bar on mobile) that jumps to and highlights the active section as you scroll. Most settings **apply immediately** — there is no global save button. The only explicit actions are **Connect** (authentication) and **Open calendar** (the sticky footer).

### Server configuration

The Redmine URL, AI assistant settings, and proxy URLs are managed by your administrator in `config.json`. These are no longer displayed on the Settings page — contact your admin if changes are needed.

### Authentication

Choose your method with the segmented control:

- **API Key**: Find it in Redmine under _My Account_ then _API access key_. A direct link to your Redmine account page is shown next to the field. Use the **show/hide** toggle to reveal the key without storing it in plain text.
- **Username & Password**: Your Redmine login credentials

Click **Connect** to verify your credentials against Redmine. The status pill shows **Not connected → Checking connection… → Connected**, or a specific error (invalid credentials, network error, or server error). Editing any credential after a successful connection returns the status to **Not connected** with a "Credentials changed — reconnect." hint, so the status pill never shows a stale "Connected".

If a credential is already stored, the connection is verified automatically when you open the Settings page — you don't need to click **Connect** again just to change something like a display preference.

The **Open calendar →** button in the sticky footer is enabled **only when connected**; while disconnected it is disabled with the hint "Connect to Redmine first to open the calendar."

Your credentials are encrypted in your browser and never sent to the web server.

### Working Hours

Set your daily start and end time. These are used by the working hours view toggle on the calendar.

### Auto-refresh interval

Set how often the calendar automatically reloads data from Redmine in the background (in minutes). The default is **5 minutes**. Set to **0** to disable auto-refresh entirely. When the browser tab is hidden, auto-refresh pauses and resumes immediately when you switch back to the tab.

### Theme

Switch between **Light** (default) and **Dark** using the **theme toggle in the Settings header** (there is no longer a dark-mode row in the settings list). The theme is applied instantly across all pages and persists across reloads. On first visit your operating system's colour-scheme preference is honoured. The preference is stored per browser profile.

### Display preferences

The **Display** card holds the calendar view switches — "Work hours only", "Mon–Fri only", and "Fast mode" — as on/off toggles. Each takes effect immediately; no save is needed.

### Planning sources & order

The **Sources** card lists the planning-view sources (Microsoft Outlook, Microsoft Teams). Each row has an enable checkbox and a position badge. **Reorder** the sources to control the order of the columns in the Planning View:

- **Mouse**: drag a row by its grip handle.
- **Keyboard**: focus the grip, press **Space/Enter** to grab, **↑/↓** to move, **Space/Esc** to drop.
- **Mobile**: use the up/down arrow buttons (disabled at the ends).

Every move is announced for screen readers, the bookings column always stays first, and the chosen order is reflected in the Planning View.

### Fast Mode

When **Fast Mode** is on (the default), selecting a ticket from your Favourites or Last Used list closes the booking modal immediately and saves the entry. This is the fastest path for repeat bookings.

Turn **Fast Mode off** if you want to keep the form open after selecting a ticket — for example, when you need to add a comment before saving. With Fast Mode off, selecting a ticket fills in the ticket field but leaves the form open so you can review and edit all fields before clicking **Save**.

### AI Assistant

The AI Chat Assistant is configured centrally by the administrator. No setup is needed on your part — if the admin has configured an AI provider, the chat button (💬) appears automatically. If the button is not visible, AI has not been enabled for your installation — contact your administrator.

### Privacy

#### Privacy Notice

A **Privacy** link in the Settings footer opens the privacy notice page (`privacy.html`). It documents which personal data the application processes, the legal basis, retention periods, your rights under GDPR Art. 13–17, a TTDSG § 25 storage decision, and a works council note. The controller name and DPO email shown on the page are set by your administrator in `config.json`.

#### Delete planning data

The **Delete planning data** section removes all locally stored planning data — your AI consent record, any planning snapshots, and planning source preferences (Outlook / Teams enabled/disabled). Your Redmine credentials and calendar preferences are not affected.

#### AI data-sharing consent

When you first trigger a planning action via the AI assistant (e.g. "Book my Outlook day"), a consent dialog appears. It names the configured AI provider and describes which data categories (Outlook events, Teams activity) will be shared. You must click **Allow** before the action proceeds. Your consent is stored locally and you will not be prompted again on subsequent planning actions.

To withdraw consent at any time, open Settings and click **Withdraw consent** in the _AI Planning Consent_ section. You will be prompted again on the next planning action.

Your stored planning data can be inspected in the **My stored planning data** collapsible section on the Settings page.

### Privacy & AI data

When you use the AI Chat Assistant, your messages and relevant excerpts from the app's source code (used to give the AI context about what the app can do) are sent to the configured AI provider (Anthropic or OpenAI). Your **Redmine API key and personal credentials are never included** — they are encrypted in your browser and are not accessible to the chatbot.

If your organization has not completed a data-protection review of the AI provider, your administrator can disable the chatbot entirely by leaving `aiProxyUrl` empty in `config.json`.

**Voice input**: if you use the microphone button, your speech is processed by your browser's built-in speech recognition service (typically a cloud service operated by your browser vendor). The app does not record or store audio. You can revoke voice consent at any time in **Settings → Voice input privacy consent → Reset consent**.

## Keyboard Shortcuts

| Shortcut     | Action                                |
| ------------ | ------------------------------------- |
| Click        | Select a time entry                   |
| Double-click | Open time entry for editing           |
| Enter        | Open selected time entry for editing  |
| Ctrl+C       | Copy selected time entry              |
| Del          | Delete selected time entry            |
| Escape       | Close dialog or deselect entry        |
| Ctrl+Z       | Undo last time-entry change           |
| Ctrl+Shift+Z | Redo last undone change               |
| Ctrl+Y       | Redo last undone change (alternative) |

### Undo & Redo

Ctrl+Z reverses the most recent time-entry write operation — create, edit, drag-move, resize, delete, bulk delete, or paste. A batch booking (dragging several selected planning events at once) counts as a **single** step, so one Ctrl+Z reverses the whole batch. Ctrl+Shift+Z (or Ctrl+Y) re-applies the last undone action.

- History is limited to the last **20 steps** and resets when the page is reloaded.
- Undo and redo are inactive while the entry form or AI chat panel is open.
- Performing a new data-changing action (e.g. submitting a form) clears the redo history.

## Accessibility

The app is designed to meet **WCAG 2.2 Level AA**:

- Every interactive control is reachable by keyboard with a visible focus indicator (≥3:1 contrast in both light and dark themes).
- The time-entry form, chatbot panel, and docs panel expose their dialog roles to screen readers with accessible names.
- Decorative icons are hidden from assistive technology; meaningful icons carry accessible labels.
- Dynamic content (chatbot responses) is announced via live regions.
- Page language is set automatically from your browser's preferred language (English or German).

If you encounter an accessibility issue, please report it as a GitHub issue with the `a11y` label.

## Give Feedback

A **Give Feedback** button appears in the toolbar when your administrator has configured a feedback channel in `config.json`. Click it to file a bug report or suggestion as a **ticket** — either in Redmine or as a GitHub issue, depending on how your deployment is configured. (Feedback is no longer sent by email.)

The dialog asks for a category, a short **subject**, and a description. The subject is used verbatim as the ticket's subject line, and the description becomes the body of the ticket — so keep the subject brief and put the details in the description.

### Categories

| Category       | What it can include (only when you opt in)                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Bug Report** | Full diagnostic context: screenshot, URL, browser/OS, viewport, JS errors, network log, app log, calendar state, localStorage snapshot |
| **Suggestion** | Lightweight: screenshot, URL, browser/OS, and viewport only                                                                            |

### How sending works

- **Redmine** — the app creates a new issue in the configured project using your stored Redmine API key. The ticket is filed under the tracker your administrator mapped to the category (e.g. a "Problem" tracker for bugs, a "Task"/"Feature" tracker for suggestions); without a mapping the project's default tracker is used. If you opted into diagnostic context, the screenshot is attached and the logs go into the issue description. On success the dialog closes and a toast appears with a clickable link to the new ticket.
- **GitHub** — the app opens GitHub's "new issue" page in a new tab with the title and body pre-filled. The title is prefixed (`[Bug]` or `[Feature]`) and the matching built-in label (`bug` or `enhancement`) is pre-selected. Your own GitHub session authorises it (you may be asked to sign in); the app never stores or transmits a GitHub token. Review the form and click GitHub's **Submit new issue** button to file it. Because the app cannot see whether you submitted, the confirmation only states that the form was _opened_.

### Diagnostic context is opt-in

The dialog has a checkbox (unchecked by default) labelled **"Include diagnostic context (logs)"**. A warning next to it explains that the logs (errors, network requests, app activity, calendar state and stored settings) can contain real issue titles, project names, and time entries, and that the resulting ticket is visible to everyone with access to the feedback project or repository. When the box is left unchecked, only your typed description (and a screenshot, if you added one) is sent. Captured network-log URLs are stripped of their query strings before they are attached, so search terms and record IDs are not exposed. Your Redmine credentials are never included.

### Screenshot

The screenshot is a **separate, optional section** — independent of the diagnostic-context opt-in. It has its own warning, because a screenshot captures whatever is visible on your screen (real issue titles, project names, time entries). Click **Add Screenshot** to capture the current page; once captured you can **Retake Screenshot** or **Remove Screenshot**. If the browser blocks capture (privacy settings, sandboxing), you can still submit without it. On the Redmine path the screenshot is uploaded as an attachment; on the GitHub path it cannot be sent via the prefilled form, so a confirmation popup appears first and copies the screenshot to your clipboard — paste it (Ctrl/Cmd+V) into the GitHub issue editor (which supports paste-to-upload) before submitting.

### Admin setup

Add a `feedback` block to `config.json`. Without it, the button is hidden for all users.

For a Redmine target:

```json
"feedback": {
  "system": "redmine",
  "redmineProjectId": 42,
  "redmineTrackerBug": 3,
  "redmineTrackerSuggestion": 2
}
```

`redmineTrackerBug` / `redmineTrackerSuggestion` are the Redmine tracker IDs used for bug reports and suggestions respectively. Both are optional — omit them to use the project's default tracker.

For a GitHub target:

```json
"feedback": { "system": "github", "githubOwner": "your-org", "githubRepo": "your-repo" }
```

No GitHub token is configured or stored — the GitHub path relies entirely on the user's own browser session. Point `redmineProjectId` (and the GitHub repository) at a target whose visibility is appropriate for personal screenshots and diagnostic data.

## Open-source licenses

This app ships several open-source libraries (FullCalendar, MSAL.js, DOMPurify, marked, vendored Spec Kit tooling, …). For full attribution:

- **In-app**: open the Settings page → at the very bottom, click the "Open-source licenses" link. The page lists every runtime library with its version, SPDX license, homepage, and copyright line.
- **For tooling**: a CycloneDX 1.6 SBoM is published at `/sbom.json` (deployed site) and is also attached as an asset to every GitHub Release.

The dependency inventory is regenerated automatically; per-PR CI gates check for drift and for any disallowed licenses against an SPDX allowlist.
