# Redmine Calendar

Outlook-style weekly time-tracking calendar for Redmine/Easy Redmine.

See **[quickstart.md](specs/001-calendar-time-entries/quickstart.md)** for setup instructions and the acceptance checklist.

## Quick start

### 1. Install dependencies (one-time)
```bash
npm install
```

### 2. Serve the app
```bash
npm run serve           # port 3000
```

### 3. Configure the app 
Open http://localhost:3000 and go to **Settings** (⚙ icon, top right). Enter your Redmine server URL and API key.

### 4. Run CORS proxy
Run the CORS proxy command shown on the Settings page in a second terminal.

### 5. Run AI proxy (optional)
To use the AI Chat Assistant, run the AI proxy command shown on the Settings page in a third terminal. This proxies requests to the configured AI provider (e.g. Anthropic).
