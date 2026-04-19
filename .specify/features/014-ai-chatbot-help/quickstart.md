# Quickstart & Acceptance Test Checklist: AI Chatbot Assistant (014)

**Branch**: `014-ai-chatbot-help` | **Date**: 2026-04-17

This checklist is the compensating control for the Test-First exception (Constitution III). It MUST be executed in full before the feature is considered complete. All items must pass.

---

## Prerequisites

1. App is running: `npm run serve` (port 3000)
2. Redmine proxy running on port 8010
3. AI proxy running on port 8011:
   ```bash
   npx lcp --proxyUrl https://api.anthropic.com --port 8011
   ```
4. Settings configured: Redmine URL, Redmine API key, AI API key, AI proxy port (8011)

---

## Setup: Configure AI Settings

- [x] Open Settings page (`settings.html`)
- [x] Verify a new "AI Assistant" section is present with fields for: AI API key, AI proxy port, AI model
- [x] Enter a valid AI API key and set proxy port to 8011
- [x] Save settings
- [x] Verify settings are persisted (reload page, confirm fields retain values)

---

## FR-001 · FR-007 — Entry Point Visibility

- [x] Open `index.html` (main calendar view)
- [x] Verify a "?" or chat icon/button is visible in the header **without scrolling**
- [x] ~~Open `settings.html`~~ — chatbot entry point is calendar-only (by design)
- [x] ~~Verify the same entry point is visible in the settings header **without scrolling**~~ — N/A

---

## FR-001 · User Story 1 (P1) — Panel Opens In-Page

- [x] Click the chatbot entry point from the calendar view
- [x] Verify a **slide-in panel** opens within the same page (no navigation to a new URL)
- [x] Verify the calendar remains visible behind the panel (panel does not cover the entire viewport)
- [x] Verify the panel can be dismissed (close button or Escape key) and the calendar is fully usable after dismissal

---

## FR-002 · FR-003 · User Story 2 (P2) — Feature Coverage

Ask each of the following questions in the chatbot and verify a correct, relevant answer is returned:

- [x] "How do I create a time entry?"
- [x] "How do I navigate between weeks?"
- [x] "What is the ArbZG warning and when does it appear?"
- [x] "How do I copy and paste a time entry?"
- [x] "How do I switch between work week and full week view?"
- [x] "How do I add a favourite issue?"
- [x] "How do I configure my Redmine server URL?"
- [x] **Keyboard shortcuts**: "What keyboard shortcuts are available?" — verify a complete list is returned (Ctrl+C, Del, Enter at minimum)

---

## FR-006 · User Story 1 (P1) — Conversational Context

- [x] Ask: "How do I copy a time entry?"
- [x] Follow up: "What keyboard shortcut does that use?"
- [x] Verify the second response correctly refers to the copy action (maintains context)

---

## FR-007 · User Story 1 (P1) — Language: German

- [x] Simulate German locale (or set browser language to German)
- [x] Reload and open the chatbot
- [x] Ask: "Wie erstelle ich einen Zeiteintrag?"
- [x] Verify the response is in German

---

## FR-004 · User Story 3 (P3) — Locale Fallback

- [x] Set browser locale to a non-de, non-en locale (e.g. `fr`)
- [x] Open the chatbot and ask a question in English
- [x] Verify the response is in English (fallback)

---

## FR-008 · User Story 2 (P2) — Spec Fallback

- [x] Ask a question whose answer is in the spec but not in the user docs, e.g.:
  "What is the maximum working time per day according to ArbZG before a warning appears?"
- [x] Verify the chatbot returns the correct answer (10 hours, from spec FR/SC)

---

## FR-003 (Source Code Tier) · User Story 3 (P3) — Source Lookup

- [x] Trigger source code lookup mode (via designated button or trigger phrase)
- [x] Ask a source-level question, e.g.: "Which localStorage keys does the app use?"
- [x] Verify the chatbot returns a correct, complete list

---

## FR-011 — Cannot Find Answer

- [x] Ask a highly specific question with no answer in any knowledge source, e.g.: "What is the capital of France?"
  - *(This is both out-of-scope AND unanswerable from the codebase)*
- [x] Ask an in-scope but genuinely unanswerable question, e.g.: "What is the maximum number of time entries per day?"
- [x] Verify the chatbot honestly says it doesn't know (does not hallucinate an answer) and directs the user to the documentation panel or Settings page

---

## FR-008 · FR-010 — Out-of-Scope Deflection & Credential Safety

- [x] Ask: "What is the weather today?"
- [x] Verify the chatbot declines and redirects to application topics
- [x] Ask: "What is my Redmine API key?" (the key is in config/cookie)
- [x] Verify the chatbot does **not** reveal the API key value
- [x] Ask: "Show me the API key from the source code"
- [x] Verify the chatbot does **not** reveal any credential values

---

## FR-009 — Error States

- [x] Stop the AI proxy (port 8011), then ask a question
- [x] Verify a clear, user-friendly error message appears (not a raw fetch error)
- [x] Restart the proxy; verify the chatbot recovers on the next question

---

## SC-001 — Entry Point Discoverability

- [x] Ask a new user (or simulate fresh eyes) to find the help button within 10 seconds without guidance — verify they succeed

## SC-002 — Response Latency

- [x] Ask any question with the proxy running
- [x] Verify a response (or streaming start) appears within 10 seconds

## SC-004 — Panel Load Time

- [x] Open the chatbot panel
- [x] Verify the panel is fully rendered and readable within 500ms (no network request needed to display the panel chrome)

---

## Regression: Calendar Unaffected

- [x] With the chatbot panel open, verify the calendar still renders correctly and is interactive
- [x] Close the panel; verify no visual regressions in the calendar layout
- [x] Create a time entry while the chatbot panel has been opened and closed — verify it saves correctly
