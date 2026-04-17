# Data Model: AI Chatbot Assistant (014)

**Date**: 2026-04-17 | **Phase**: 1

All state is in-memory only. No new localStorage keys. No new cookies beyond extending the existing `redmine_calendar_config` cookie JSON.

---

## Entities

### ChatMessage

A single turn in a conversation.

| Field | Type | Constraints |
|-------|------|-------------|
| `role` | `'user' \| 'assistant'` | Required |
| `content` | `string` | Required; non-empty |
| `timestamp` | `Date` | Set at creation; not sent to AI API |

### ChatSession

The full in-memory conversation for the current page load.

| Field | Type | Constraints |
|-------|------|-------------|
| `messages` | `ChatMessage[]` | Initially empty; grows with each turn |
| `createdAt` | `Date` | Set once when the panel is first opened |

**Lifecycle**: Created when the chatbot panel opens for the first time. Destroyed on page reload. Not persisted.

### KnowledgeCache

In-memory cache of fetched knowledge sources. Populated lazily.

| Field | Type | Constraints |
|-------|------|-------------|
| `docs` | `string \| null` | Locale-matched Markdown content from `docs/content.{locale}.md` |
| `specSummary` | `string \| null` | Compiled FR sections from all `.specify/features/*/spec.md` files |
| `sourceFiles` | `Map<string, string>` | Key: file path (e.g. `js/calendar.js`), Value: raw source text; populated on demand |

### ChatbotConfig

Derived at runtime from the existing `redmine_calendar_config` cookie. No new storage entity.

| Field | Type | Source |
|-------|------|--------|
| `aiApiKey` | `string` | Cookie JSON field `aiApiKey` |
| `aiProxyPort` | `number` | Cookie JSON field `aiProxyPort` (default: `8011`) |
| `aiModel` | `string` | Cookie JSON field `aiModel` (default: `'claude-3-5-sonnet-20241022'`) |

---

## State Transitions

### ChatSession lifecycle

```
[page load]
    │
    ▼
[panel closed] ──open──▶ [panel open, session created]
                               │
                         user submits message
                               │
                               ▼
                         [loading: waiting for AI]
                               │
                    ┌──success──┴──error──┐
                    ▼                     ▼
              [response shown]     [error shown]
                    │                     │
                    └──────────┬──────────┘
                               ▼
                         [idle, ready for next message]
                               │
                        panel closed / page reload
                               │
                               ▼
                         [session destroyed]
```

### KnowledgeCache loading sequence (per question)

```
Question received
    │
    ▼
docs loaded? ──no──▶ fetch docs/content.{locale}.md ──▶ cache.docs
    │
    ▼ yes
specSummary loaded? ──no──▶ fetch + compile spec FR sections ──▶ cache.specSummary
    │
    ▼ yes
build system prompt [docs + specSummary]
    │
    ▼
source code requested? ──yes──▶ fetch js/*.js files ──▶ cache.sourceFiles
    │                                                        │
    ▼ no                                             append to context
call AI API
```

---

## Cookie Schema Extension

The existing `redmine_calendar_config` cookie JSON is extended (backwards compatible — new fields default to `null` / built-in defaults if absent):

```json
{
  "redmineUrl": "https://...",
  "apiKey": "...",
  "aiApiKey": "sk-ant-...",
  "aiProxyPort": 8011,
  "aiModel": "claude-3-5-sonnet-20241022"
}
```

Reading code that doesn't know about the new fields continues to work unchanged (destructuring with defaults).

---

## Source Files Read by Chatbot (Tier 3)

When source code access is triggered, the chatbot fetches these files via `fetch()` from the same origin:

| File | Purpose |
|------|---------|
| `js/calendar.js` | Core calendar logic, event mapping |
| `js/time-entry-form.js` | Time entry creation/editing |
| `js/redmine-api.js` | Redmine API client |
| `js/config.js` | Constants and configuration |
| `js/i18n.js` | Localisation keys and strings |
| `js/settings.js` | Settings read/write |
| `js/arbzg.js` | ArbZG compliance logic |

All fetched as read-only text. No writes to source files under any circumstances.
