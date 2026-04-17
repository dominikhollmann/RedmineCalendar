# Implementation Plan: AI Chatbot Assistant

**Branch**: `014-ai-chatbot-help` | **Date**: 2026-04-17 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `.specify/features/014-ai-chatbot-help/spec.md`

---

## Summary

Embed a conversational AI assistant in the existing single-page application as a slide-in panel. The chatbot answers questions about the app by injecting user documentation (Markdown, Tier 1) and feature spec summaries (Tier 2) into its system prompt, with optional source-code lookup (Tier 3) on demand. All AI calls are routed through a second `local-cors-proxy` instance (port 8011). The AI API key is stored in the existing `SameSite=Strict` cookie alongside the Redmine credentials.

---

## Technical Context

**Language/Version**: JavaScript ES2022, vanilla, no transpilation (consistent with all existing features)  
**Primary Dependencies**:
- `marked.js` v12 (CDN) — Markdown-to-HTML for docs panel and AI responses
- `DOMPurify` v3 (CDN) — sanitise AI-generated HTML before rendering
- `local-cors-proxy` (already in devDependencies) — second instance on port 8011 for AI API
- External AI provider API (Claude 3.5 Sonnet recommended default; OpenAI-compatible)

**Storage**: In-memory only (chat session, knowledge cache). No new localStorage keys. Cookie JSON extended with `aiApiKey`, `aiProxyPort`, `aiModel`.  
**Testing**: Manual acceptance checklist (`quickstart.md`) — Test-First exception invoked (see Constitution Check).  
**Target Platform**: Desktop browser, same as existing application.  
**Project Type**: Browser SPA feature addition.  
**Performance Goals**: AI response begins streaming within 10 seconds (SC-002); panel opens within 500ms (SC-004).  
**Constraints**: No backend server; all AI access read-only; credentials never exposed in AI responses.  
**Scale/Scope**: Single-user, self-hosted; session-scoped state only.

---

## Constitution Check

*GATE: All five principles checked. Re-checked post-design below.*

### I. Redmine API Contract ✅
This feature does not interact with the Redmine REST API. No Redmine API calls are added or modified. Pass.

### II. Calendar-First UX ✅
The chatbot panel slides in as a sidebar overlay. It does not navigate away from the calendar, does not modify FullCalendar state, and does not delay calendar rendering (panel JS is loaded asynchronously). The calendar remains visible and interactive while the panel is open. The 300ms calendar render constraint is unaffected. Pass.

### III. Test-First — **Exception invoked**
**Deviation**: No automated tests written. This is a personal single-user tool with no CI pipeline and a single intended user.  
**Compensating control**: `quickstart.md` covers all 10 Functional Requirements and all 3 User Story acceptance scenarios. The checklist must be executed in full before the feature is merged.  
Justified in Complexity Tracking below.

### IV. Simplicity & YAGNI ✅
Two new CDN dependencies (`marked.js`, `DOMPurify`) and one new proxy port are the minimum required. No caching layer, no background workers, no plugin architecture. All three new JS modules (`chatbot.js`, `chatbot-api.js`, `knowledge.js`) have a single, clear responsibility. Justified in Complexity Tracking below.

### V. Security by Default ✅ (exception applies)
- AI API key stored in `SameSite=Strict` cookie — local single-user tool exception applies (same rationale as existing Redmine key).
- All AI response HTML sanitised with `DOMPurify` before `innerHTML` assignment (XSS prevention).
- System prompt instructs the AI to admit when it cannot answer rather than guessing, and to direct users to the docs panel or Settings (FR-011).
- System prompt explicitly instructs the AI never to reveal credential values (FR-010).
- The `<source>` code block passed to the AI contains only application logic files, not the cookie/config values themselves.
- Exception documented in Complexity Tracking below.

**Post-design re-check**: All five principles remain satisfied after Phase 1 design. ✅

---

## Project Structure

### Documentation (this feature)

```text
.specify/features/014-ai-chatbot-help/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output (manual acceptance checklist)
├── contracts/
│   └── ai-chat-api.md   ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code Changes

```text
js/
├── chatbot.js           # NEW — panel UI, session management, message rendering
├── chatbot-api.js       # NEW — AI provider API client (Claude + OpenAI-compatible)
├── knowledge.js         # NEW — knowledge source loading (docs → specs → source)
├── config.js            # MODIFIED — add AI_PROXY_PORT, AI_DEFAULT_MODEL constants
├── settings.js          # MODIFIED — add aiApiKey/aiProxyPort/aiModel cookie helpers
├── i18n.js              # MODIFIED — add chatbot UI strings (EN + DE)
├── calendar.js          # MODIFIED — wire chatbot panel open/close toggle
└── redmine-api.js       # UNMODIFIED

docs/
├── content.en.md        # NEW (feature 013) — English user documentation source
└── content.de.md        # NEW (feature 013) — German user documentation source

index.html               # MODIFIED — add chatbot panel HTML, trigger button, CDN scripts
settings.html            # MODIFIED — add AI Assistant settings section
css/style.css            # MODIFIED — chatbot panel styles
```

**Dependency on feature 013**: `docs/content.en.md` and `docs/content.de.md` must exist before this feature can be fully tested. The chatbot gracefully degrades if docs files are not found (spec summary only).

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Test-First exception (Constitution III) | No CI pipeline; personal single-user tool | Automated tests require a browser test harness (Playwright/Puppeteer) which would be the only thing it's used for — YAGNI; `quickstart.md` checklist is the compensating control |
| New CDN dependency: `marked.js` | Parse Markdown from `docs/content.{locale}.md` (FR-008 requires Markdown source format) | Hand-authoring HTML docs would violate FR-008 and make the docs unreadable as plain text for the chatbot |
| New CDN dependency: `DOMPurify` | Sanitise AI-generated HTML (Constitution V: AI responses are untrusted external data) | Using `textContent` instead of `innerHTML` would prevent Markdown rendering; using raw `innerHTML` is a XSS vector |
| AI API key in cookie (Constitution V exception) | No backend server; local single-user tool | A backend proxy would introduce a server dependency, violating FR-006 and Constitution IV (YAGNI) |
| Second `lcp` proxy instance (port 8011) | Claude/OpenAI APIs do not support browser-direct CORS calls | Embedding the AI API key as a query parameter (Gemini approach) would expose it in network logs and browser history |
