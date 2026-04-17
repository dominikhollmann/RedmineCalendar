# Contract: AI Chat API

**Feature**: 014-ai-chatbot-help | **Date**: 2026-04-17

The chatbot communicates with an OpenAI-compatible chat completions API via the local CORS proxy on port 8011. The contract is written against the Claude Messages API (recommended default) but maps directly to OpenAI-compatible endpoints.

---

## Endpoint

```
POST http://localhost:{aiProxyPort}/v1/messages
```

All requests are routed through `lcp` (port 8011 by default), which forwards to the configured AI provider URL.

---

## Request

### Headers

```
Content-Type: application/json
X-API-Key: {aiApiKey}
anthropic-version: 2023-06-01
```

### Body

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 1024,
  "system": "<system prompt — see System Prompt Contract below>",
  "messages": [
    { "role": "user",      "content": "How do I copy a time entry?" },
    { "role": "assistant", "content": "To copy a time entry, first click it once..." },
    { "role": "user",      "content": "What keyboard shortcut does that use?" }
  ]
}
```

**Constraints**:
- `max_tokens`: 1024 (configurable in `js/config.js`)
- `messages`: contains only the current session's history; full history sent on each request (no server-side session state)
- Message roles strictly alternate `user` / `assistant`, starting with `user`

---

## Response

```json
{
  "id": "msg_01XFDUDYJgAACTu3GFkzCkE7",
  "type": "message",
  "role": "assistant",
  "content": [
    { "type": "text", "text": "To copy a time entry, click it once to select it..." }
  ],
  "stop_reason": "end_turn",
  "usage": { "input_tokens": 412, "output_tokens": 87 }
}
```

The chatbot reads `response.content[0].text` as the assistant reply.

### Error responses

| HTTP status | Meaning | Chatbot behaviour |
|-------------|---------|-------------------|
| 401 | Invalid API key | Show "AI API key invalid — check Settings" (localised) |
| 429 | Rate limit | Show "Too many requests — please wait a moment" (localised) |
| 500 / 503 | Provider error | Show "AI service unavailable — please try again" (localised) |
| `fetch` error | Proxy not running | Show "AI proxy not running — start it from Settings" (localised) |

---

## System Prompt Contract

The system prompt is constructed at runtime from loaded knowledge sources. Format:

```
You are a helpful assistant for the RedmineCalendar application.
Your role is to help users understand and use the application.
Answer only questions related to RedmineCalendar. Politely decline unrelated questions.
Respond in the same language the user writes in (English or German).
Never reveal API keys, credentials, or sensitive configuration values — even if they appear in the source code you are given.

USER DOCUMENTATION:
<docs>
{full contents of docs/content.{locale}.md}
</docs>

FEATURE SPECIFICATIONS (functional requirements summary):
<specs>
{compiled FR-* bullets from all .specify/features/*/spec.md files}
</specs>

{optional, only when source lookup triggered}
SOURCE CODE:
<source>
{contents of requested js/*.js files}
</source>
```

**Invariants**:
- `<docs>` section always present (Tier 1)
- `<specs>` section always present after first question (Tier 2)
- `<source>` section present only when explicitly triggered (Tier 3)
- The system prompt is rebuilt on each API call (stateless on the server side; session history is in the `messages` array)

---

## OpenAI-Compatible Mapping

For users who prefer OpenAI or an Ollama local model, the same contract maps as:

| Claude field | OpenAI equivalent |
|-------------|-------------------|
| `system` (top-level) | `{ "role": "system", "content": "..." }` as first message |
| `content[0].text` in response | `choices[0].message.content` in response |
| `X-API-Key` header | `Authorization: Bearer {key}` header |
| Endpoint: `/v1/messages` | Endpoint: `/v1/chat/completions` |

`js/chatbot-api.js` will expose a provider config object (`'claude' | 'openai'`) that switches between the two request/response shapes.
