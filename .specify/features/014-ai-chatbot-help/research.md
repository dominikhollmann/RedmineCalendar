# Research: AI Chatbot Assistant (014)

**Date**: 2026-04-17 | **Phase**: 0

---

## Decision 1: AI Provider

**Decision**: Provider-agnostic implementation with Claude 3.5 Sonnet as the recommended default.

**Rationale**: The spec deferred provider choice to planning. Claude offers the best quality-to-context ratio for documentation understanding, a clean system-prompt API (`system` parameter separate from the messages array), and a 200K token context window — far more than needed for ~30–50KB of docs + spec content. The implementation is designed so the user can substitute any OpenAI-compatible provider by changing the base URL and API key in settings.

**Alternatives considered**:
- **Gemini 2.0 Flash**: Largest context (1M tokens), cheapest per token, CORS-capable. Rejected as default because its message format (`contents[].parts[]`) diverges from the OpenAI-compatible pattern, making the abstraction harder. Could be supported as a future provider option.
- **OpenAI GPT-4o-mini**: Smaller context (128K), higher cost per token than Gemini. Compatible API format. Suitable drop-in alternative for users who prefer OpenAI.

---

## Decision 2: Browser → AI API Routing

**Decision**: Second `local-cors-proxy` instance on port 8011, targeting the AI provider's base URL. User configures this in Settings (same pattern as the existing Redmine proxy on port 8010).

**Rationale**: Both Claude and OpenAI block direct browser-to-API calls (no CORS headers). The app already uses `lcp` for Redmine; adding a second instance on a separate port is the minimal change. The Settings page already explains how to run the proxy command — the same pattern will be replicated for the AI proxy.

**Alternatives considered**:
- **Gemini direct CORS**: Gemini supports browser-direct calls. Rejected: would hard-code the provider choice and expose the API key in the request URL.
- **Single multi-target proxy**: `lcp` supports only one target URL per instance. Two instances are the simplest solution.
- **Custom backend server**: Rejected per FR-006 and constitution IV (YAGNI — no backend server requirement exists).

---

## Decision 3: Knowledge Injection Strategy

**Decision**: Two-tier system prompt loading. Tier 1 (always loaded): user documentation Markdown. Tier 2 (loaded once on first question): compressed functional requirements from all spec files. Source code (Tier 3) fetched on explicit user request via a special trigger phrase or button.

**Rationale**: Docs + spec FR sections total ~30–50KB (~10K tokens), well within any provider's context window. Including them upfront is simpler, faster, and avoids per-query fetch overhead. Source code is 7 JS files (~10–30KB total) and only needed for rare technical edge cases — fetching on demand avoids bloating every request.

**Alternatives considered**:
- **All content in system prompt upfront (including source code)**: Simpler logic but ~60–100KB per request; non-trivial cost increase per conversation.
- **RAG / vector search**: Overkill for a single-user app with <100KB of content total.
- **Docs only**: Would fail for questions only answerable from specs (violates FR-003).

---

## Decision 4: API Key Storage

**Decision**: AI API key stored in the existing `redmine_calendar_config` cookie alongside the Redmine URL and API key (JSON object extended with `aiApiKey` and `aiProxyPort` fields).

**Rationale**: Reuses the existing cookie read/write helpers in `js/settings.js` with zero new infrastructure. The cookie is already `SameSite=Strict`; the Constitution V local-tool exception explicitly permits this for localhost usage.

**Alternatives considered**:
- **Separate cookie**: Adds cookie complexity for no benefit.
- **localStorage**: Less secure (accessible to any JS on the page); cookie is already the established pattern.
- **Environment variable**: Not viable for a no-backend browser app.

---

## Decision 5: Markdown Rendering

**Decision**: Use `marked.js` v12 via CDN for Markdown-to-HTML conversion of the docs content in the panel. Sanitize rendered HTML with `DOMPurify` v3 via CDN to prevent XSS from malicious AI responses.

**Rationale**: Feature 013 (user docs) stores content as Markdown (FR-008). The chatbot panel also renders AI responses in Markdown. Both require a parser. `marked.js` is the de-facto lightweight browser Markdown parser; `DOMPurify` is standard for sanitizing untrusted HTML (Constitution V: AI responses are untrusted external data).

**Alternatives considered**:
- **Hand-rolled HTML in docs content**: Forces the docs author to write HTML; makes the Markdown source less readable. Rejected.
- **innerHTML with raw AI response**: XSS risk. Rejected categorically.
- **Showdown.js**: Similar capability to marked.js but larger bundle. Rejected.

---

## Proxy Port Convention

| Service | Port | `lcp` command |
|---------|------|---------------|
| Redmine API | 8010 | `npx lcp --proxyUrl <redmineUrl> --port 8010` |
| AI API | 8011 | `npx lcp --proxyUrl https://api.anthropic.com --port 8011` |

The AI proxy URL is configurable in Settings so users can point to any OpenAI-compatible endpoint (Gemini via a proxy, self-hosted Ollama, etc.).
