# RedmineCalendar Help

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

- Search for a Redmine issue by name or ID — type `#123` to search by ticket number only
- Select from your recently used issues or favourites
- Set the date, start time, and end time (pre-filled from where you clicked — all three are required)
- Add an optional comment
- Save the entry

The ticket ID and title in the form is a clickable link to the Redmine ticket.

The entry appears on the calendar immediately after saving. The ticket number on each calendar entry is a clickable link to the Redmine ticket (opens in a new tab).

### Editing a Time Entry

Double-click an existing time entry (or select it and press **Enter**) to open the edit form. Change any field and click **Save**.

### Deleting a Time Entry

Select a time entry by clicking it, then press **Del** to delete it. You will be asked to confirm before the entry is removed.

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
- **Break requirements**: More than 6 hours continuous work without a break
- **Sunday/holiday work**: Time entries logged on Sundays or public holidays

Warnings appear as colored indicators on the affected day headers. Hover over them for details.

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

### Tips

- The assistant knows the app's documentation, feature specifications, and source code
- It will decline questions unrelated to RedmineCalendar
- It will never reveal your API keys or credentials
- The conversation is preserved if you close and reopen the panel (cleared on page reload)
- Drag the left edge of the panel to resize it

## Settings

Open Settings by clicking the **gear icon** in the header.

### Server Configuration (read-only)

The Redmine URL, AI assistant settings, and proxy URLs are managed by your administrator in `config.json`. These are shown as read-only information at the top of the settings page. If you need changes, contact your admin.

### Authentication

Choose between:

- **API Key**: Find it in Redmine under *My Account* then *API access key*. A direct link to your Redmine account page is shown next to the field.
- **Username & Password**: Your Redmine login credentials

Your credentials are encrypted in your browser and never sent to the web server.

### Working Hours

Set your daily start and end time. These are used by the working hours view toggle on the calendar.

### AI Assistant

The AI Chat Assistant is configured centrally by the administrator. No setup is needed on your part — if the admin has configured an AI provider in `config.json`, the chat feature is available automatically.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Click | Select a time entry |
| Double-click | Open time entry for editing |
| Enter | Open selected time entry for editing |
| Ctrl+C | Copy selected time entry |
| Del | Delete selected time entry |
| Escape | Close dialog or deselect entry |
