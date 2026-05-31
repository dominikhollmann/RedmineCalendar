# RedmineCalendar Help

**Contents**

1. [Getting Started](#getting-started)
2. [Calendar Navigation](#calendar-navigation)
3. [Time Entries](#time-entries)
4. [Break-Ticket Entries](#break-ticket-entries)
5. [Copy and Paste Time Entries](#copy-and-paste-time-entries)
6. [Working Hours View](#working-hours-view)
7. [Work Week / Full Week Toggle](#work-week--full-week-toggle)
8. [Mobile](#mobile)
9. [Favourite Issues](#favourite-issues)
10. [ArbZG Compliance Indicators](#arbzg-compliance-indicators)
11. [AI Chat Assistant](#ai-chat-assistant)
12. [Settings](#settings)
13. [Keyboard Shortcuts](#keyboard-shortcuts)

## Getting Started

RedmineCalendar is a weekly calendar view for your Redmine time entries. It connects to your Redmine server and displays all your time entries in a familiar calendar layout.

To get started, open **Settings** (gear icon in the header) and enter your personal Redmine API key. The Redmine server URL and other shared settings are configured by your administrator in `config.json`.

## Calendar Navigation

The calendar shows one week at a time. Use the navigation buttons in the toolbar:

- **Previous / Next** arrows move one week back or forward
- **Today** button jumps to the current week
- The **week total** is displayed in the header, showing the sum of all hours for the visible week

## Time Entries

### Creating a Time Entry

Click or drag on any empty time slot in the calendar. A form opens where you can:

- Search for a Redmine issue by name, ID, or **project** — type a project identifier (e.g., "web-app") or project name to filter tickets by project, or combine with ticket terms (e.g., "web-app login")
- Type `#1234` to look up a specific ticket directly by ID
- Select from your recently used issues or favourites (also filterable by project)
- Set the date, start time, and end time (pre-filled from where you clicked — all three are required)
- Add an optional comment
- Save the entry

The ticket ID and title in the form is a clickable link to the Redmine ticket.

**The form does not close on outside clicks.** To close the form without saving, press **Escape** or click **Cancel**. This prevents accidentally losing your typed input.

The entry appears on the calendar immediately after saving. The ticket number on each calendar entry is a clickable link to the Redmine ticket (opens in a new tab). Each entry also shows the **project identifier and name** (e.g., "web-app — Web App") to help distinguish entries across projects.

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

## Working Hours View

Toggle the working hours view using the **clock icon** button in the calendar toolbar. When enabled, the calendar only shows time slots within your configured working hours (e.g., 08:00–17:00).

If you have time entries outside the visible range, indicators appear at the top or bottom of the calendar to let you know.

Configure your working hours in **Settings** under the "Working hours" section. Leave both fields empty to disable this view.

## Work Week / Full Week Toggle

Use the **Mo–Fr** toggle button in the toolbar to switch between:

- **Work week**: Shows Monday through Friday only
- **Full week**: Shows all seven days including Saturday and Sunday

If you have time entries on hidden weekend days, an indicator appears at the side of the calendar.

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

- In the time entry form, click the **star icon** next to any search result or recent issue to add it to your favourites
- Favourites appear in their own section at the top of the issue picker
- Click the star again to remove an issue from favourites

Favourites are stored locally in your browser and persist across sessions.

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

- **Weekly hours**: Your contractual weekly hours (used to calculate daily hours for holiday/vacation entries = weekly ÷ 5)

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

### Server configuration

The Redmine URL, AI assistant settings, and proxy URLs are managed by your administrator in `config.json`. These are no longer displayed on the Settings page — contact your admin if changes are needed.

### Authentication

Choose between:

- **API Key**: Find it in Redmine under _My Account_ then _API access key_. A direct link to your Redmine account page is shown next to the field.
- **Username & Password**: Your Redmine login credentials

Your credentials are encrypted in your browser and never sent to the web server.

### Working Hours

Set your daily start and end time. These are used by the working hours view toggle on the calendar.

### AI Assistant

The AI Chat Assistant is configured centrally by the administrator. No setup is needed on your part — if the admin has configured an AI provider in `config.json`, the chat feature is available automatically.

## Keyboard Shortcuts

| Shortcut     | Action                               |
| ------------ | ------------------------------------ |
| Click        | Select a time entry                  |
| Double-click | Open time entry for editing          |
| Enter        | Open selected time entry for editing |
| Ctrl+C       | Copy selected time entry             |
| Del          | Delete selected time entry           |
| Escape       | Close dialog or deselect entry       |

## Accessibility

The app is designed to meet **WCAG 2.2 Level AA**:

- Every interactive control is reachable by keyboard with a visible focus indicator (≥3:1 contrast in both light and dark themes).
- The time-entry form, chatbot panel, and docs panel expose their dialog roles to screen readers with accessible names.
- Decorative icons are hidden from assistive technology; meaningful icons carry accessible labels.
- Dynamic content (chatbot responses) is announced via live regions.
- Page language is set automatically from your browser's preferred language (English or German).

If you encounter an accessibility issue, please report it as a GitHub issue with the `a11y` label.

## Give Feedback

A **Give Feedback** button appears fixed in the bottom-right corner of every page when your administrator has configured a `feedbackEmail` in `config.json`. Click it to send a bug report or suggestion.

### Categories

| Category       | What it sends                                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Bug Report** | Full diagnostic context: screenshot, URL, browser/OS, viewport, JS errors, network log, app log, calendar state, localStorage snapshot |
| **Suggestion** | Lightweight: screenshot, URL, browser/OS, and viewport only                                                                            |

### How sending works

- **Office 365 (signed in via MSAL)** — feedback is sent directly as a rich HTML email with the screenshot attached. The dialog closes on success and a toast confirms delivery.
- **Mailto fallback (not signed in)** — your default mail client opens with the subject and description pre-filled. Close the dialog to review before sending. The body is limited to 1 800 characters to avoid URL truncation.

### Screenshot

The app captures a screenshot of the current page automatically when you open the dialog. If the browser blocks capture (privacy settings, sandboxing), the screenshot section shows "Screenshot unavailable" — you can still submit.

### Admin setup

Add `"feedbackEmail": "helpdesk@example.com"` to `config.json`. Without it, the button is hidden for all users.

## Open-source licenses

This app ships several open-source libraries (FullCalendar, MSAL.js, DOMPurify, marked, vendored Spec Kit tooling, …). For full attribution:

- **In-app**: open the Settings page → at the very bottom, click the "Open-source licenses" link. The page lists every runtime library with its version, SPDX license, homepage, and copyright line.
- **For tooling**: a CycloneDX 1.6 SBoM is published at `/sbom.json` (deployed site) and is also attached as an asset to every GitHub Release.

The dependency inventory is regenerated automatically; per-PR CI gates check for drift and for any disallowed licenses against an SPDX allowlist.
