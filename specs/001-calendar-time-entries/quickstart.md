# Quickstart: Weekly Calendar Time Tracking

**Branch**: `001-calendar-time-entries` | **Date**: 2026-03-31

This guide explains how to run the app locally for the first time and verify it works.

---

## Prerequisites

- A modern desktop browser (Chrome, Firefox, or Safari latest)
- Node.js ≥ 18 installed (`node --version`)
- Your Easy Redmine instance URL (e.g., `https://yourcompany.easyredmine.com`)
- Your Redmine API key (find it at: Redmine → My Account → API access key)

---

## Step 1: Install the CORS proxy (one-time setup)

Because the app runs on `localhost` but calls your remote Redmine instance, a local CORS
proxy is required to bridge the cross-origin restriction.

```bash
npm install -g local-cors-proxy
```

---

## Step 2: Start the CORS proxy

Replace `https://yourcompany.easyredmine.com` with your actual Redmine URL.

```bash
lcp --proxyUrl https://yourcompany.easyredmine.com --port 8010
```

Leave this terminal window open. The proxy must be running whenever you use the app.

> **Tip**: You can add this as a script in `package.json` so you don't have to remember
> the full command:
> ```json
> { "scripts": { "proxy": "lcp --proxyUrl https://yourcompany.easyredmine.com --port 8010" } }
> ```
> Then just run `npm run proxy`.

---

## Step 3: Serve the app

Open a second terminal window in the repository root:

```bash
npx serve .
```

This will print something like:
```
Serving!
- Local: http://localhost:3000
```

Open that URL in your browser.

---

## Step 4: Configure the app (first run only)

On first load, the app will show the **Settings** screen because no API key cookie exists.

Enter:
- **Redmine URL**: `http://localhost:8010` ← this is the proxy URL, NOT your Redmine URL
- **API Key**: your Redmine API key

Click **Save**. The app will verify the key by calling `/users/current.json`.
If successful, it redirects to the calendar.

> **Why `localhost:8010` and not your Redmine URL?**
> The proxy forwards all requests from `localhost:8010` to your Redmine instance and adds
> the CORS headers the browser requires. The app only ever talks to the proxy.

---

## Step 5: Verify the calendar

You should see the current week's calendar grid. If you have any time entries logged
this week in Redmine, they will appear as coloured blocks.

**Validation checklist (acceptance test)**:

- [x] Calendar shows Monday–Sunday columns with today highlighted
- [x] Quarter-hour slot lines are visible (rows every 15 minutes)
- [ ] Existing Redmine time entries appear as blocks with ticket subject and duration
- [ ] Day column headers show total logged hours per day
- [x] "Previous week" / "Next week" / "Today" buttons navigate correctly
- [x] Clicking an empty slot opens the new-entry form with start time pre-filled
- [x] Dragging across slots opens the form with correct start + duration
- [x] Searching for a ticket (≥ 2 chars) returns results within 2 seconds
- [ ] Submitting a new entry creates it in Redmine and shows it in the calendar
- [ ] Clicking an existing entry opens the edit form pre-filled
- [ ] Saving edits updates the block and the Redmine record
- [ ] Deleting an entry (with confirmation) removes it from calendar and Redmine
- [ ] Dragging an entry's bottom edge resizes it and saves immediately

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---------|-------------|-----|
| "API key invalid" on settings | Wrong API key | Re-check under Redmine → My Account → API access key |
| Calendar loads but no entries | CORS proxy not running | Start `lcp` in a terminal (Step 2) |
| Network error on every action | Wrong proxy URL | Check that `lcp` is running on port 8010 |
| Entries appear at top of day with "?" | Entry created directly in Redmine (no `[start:HH:MM]` tag) | Normal behaviour — tag is only added by this app |
| Redmine returns 403 on create | Time tracking disabled for that project | Check project settings in Redmine admin |

---

## Resetting settings

To clear your stored API key and URL, open browser DevTools → Application → Cookies →
delete the `redmine_calendar_config` cookie, then reload the page.
