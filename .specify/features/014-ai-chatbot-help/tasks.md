# Tasks: AI Chatbot Assistant

**Input**: Design documents from `/.specify/features/014-ai-chatbot-help/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No automated tests — Test-First exception invoked (Constitution III). `quickstart.md` is the compensating control.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: New files, CDN dependencies, config constants, cookie schema extension

- [x] T001 [P] Add `marked.js` v12 and `DOMPurify` v3 CDN `<script>` tags to `index.html` (before module scripts)
- [x] T002 [P] Add AI config constants to `js/config.js`: `AI_PROXY_PORT` (default 8011), `AI_DEFAULT_MODEL` ('claude-3-5-sonnet-20241022'), `AI_MAX_TOKENS` (1024)
- [x] T003 [P] Extend cookie read/write in `js/settings.js`: add `aiApiKey`, `aiProxyPort`, `aiModel` fields to the existing `redmine_calendar_config` cookie JSON (backwards compatible — default to null/built-in defaults if absent)
- [x] T004 [P] Add chatbot i18n keys to `js/i18n.js` (EN + DE): `chatbot.open_btn`, `chatbot.panel_title`, `chatbot.input_placeholder`, `chatbot.send_btn`, `chatbot.loading`, `chatbot.error_generic`, `chatbot.error_no_key`, `chatbot.error_proxy`, `chatbot.error_rate_limit`, `chatbot.error_invalid_key`, `chatbot.source_trigger`, `chatbot.welcome`
- [x] T005 Create `js/chatbot.js` module skeleton: exports `openChatPanel()`, `closeChatPanel()`; module-level state for `_session` (ChatSession), `_panelOpen`
- [x] T006 [P] Create `js/chatbot-api.js` module skeleton: export `sendMessage(messages, systemPrompt, config)` returning a Promise<string>
- [x] T007 [P] Create `js/knowledge.js` module skeleton: exports `loadDocs(locale)`, `loadSpecSummary()`, `loadSourceFiles()`, `buildSystemPrompt(cache)`; module-level `_cache` (KnowledgeCache)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Panel HTML/CSS, AI API client, knowledge loader — needed by ALL user stories

- [x] T008 Add `#chatbot-panel` HTML structure to `index.html`: slide-in panel from right with header (title + close button), message list container, input area (textarea + send button), per plan.md panel structure
- [x] T009 Add chatbot panel CSS to `css/style.css`: `#chatbot-panel` fixed-position right overlay (370px wide), `.chatbot-panel--open` transition, message bubbles (`.chatbot-msg--user`, `.chatbot-msg--assistant`), input area styles, send button, loading indicator
- [x] T010 Implement `sendMessage()` in `js/chatbot-api.js`: build request body per contracts/ai-chat-api.md (POST to `http://localhost:{aiProxyPort}/proxy/v1/messages` with `X-API-Key`, `anthropic-version`, model, max_tokens, system prompt, messages array); parse response `content[0].text`; handle HTTP 401/429/500/503 and fetch errors with localised error messages per contract error table
- [x] T011 Implement `loadDocs(locale)` in `js/knowledge.js`: fetch `docs/content.{locale}.md` via same-origin fetch, cache in `_cache.docs`; return cached value on subsequent calls
- [x] T012 Implement `loadSpecSummary()` in `js/knowledge.js`: fetch all `.specify/features/*/spec.md` files by first fetching a directory listing or a known manifest, extract FR-* lines from each spec, compile into a summary string, cache in `_cache.specSummary`
- [x] T013 Implement `buildSystemPrompt(cache)` in `js/knowledge.js`: assemble system prompt string per contracts/ai-chat-api.md System Prompt Contract: preamble + `<docs>` section (always) + `<specs>` section (if loaded) + `<source>` section (if loaded)

**Checkpoint**: API client can send messages to Claude proxy, knowledge sources load and cache correctly

---

## Phase 3: User Story 1 — Get Help Using the Application (Priority: P1) 🎯 MVP

**Goal**: User opens chatbot, asks a question about the app, gets a correct answer from user documentation

**Independent Test**: Open chatbot, ask "How do I copy a time entry?", verify correct response describing the copy-paste workflow

### Implementation for User Story 1

- [x] T014 [US1] Implement `openChatPanel()` in `js/chatbot.js`: show panel, create session if none exists, display welcome message, load docs knowledge (Tier 1) via `loadDocs(locale)`, load spec summary (Tier 2) via `loadSpecSummary()`
- [x] T015 [US1] Implement `closeChatPanel()` in `js/chatbot.js`: hide panel with CSS transition, preserve session in memory (do NOT destroy on close per clarification)
- [x] T016 [US1] Implement message submission flow in `js/chatbot.js`: on send button click or Enter key, read input, append user message to `_session.messages`, render user bubble in panel, call `sendMessage()` with full history + system prompt, render assistant response bubble (parse Markdown via `marked.parse()` + sanitise with `DOMPurify.sanitize()`), auto-scroll to bottom
- [x] T017 [US1] Implement conversation context (FR-006): send full `_session.messages` array on each API call so the AI has prior turns; verify follow-up questions reference prior context
- [x] T018 [US1] Implement out-of-scope deflection (FR-008): system prompt instructs AI to decline unrelated questions; no client-side filtering needed — relies on system prompt preamble
- [x] T019 [US1] Implement error display (FR-009): show localised error messages in the chat as a system-style bubble when API calls fail; user can retry by sending another message
- [x] T020 [US1] Wire chatbot trigger button in `index.html` header: add chat icon button to `.app-header`, attach click handler to call `openChatPanel()` from `js/chatbot.js`
- [x] T021 [US1] Add AI Assistant settings section to `settings.html`: add form fields for AI API key (password input), AI proxy port (number input, default 8011), AI model (text input, default claude-3-5-sonnet-20241022); wire save/load to the extended cookie via `js/settings.js`

**Checkpoint**: MVP functional — user can chat with AI about the app using docs + spec knowledge

---

## Phase 4: User Story 2 — Get Clarification on Feature Behaviour (Priority: P2)

**Goal**: Chatbot answers questions using spec file details beyond what user docs cover

**Independent Test**: Ask "What is the exact format of the start time tag stored in time entry comments?" — verify correct answer `[start:HH:MM]` (from spec, not in user docs)

### Implementation for User Story 2

- [x] T022 [US2] Verify `loadSpecSummary()` in `js/knowledge.js` correctly fetches and compiles FR-* sections from all `.specify/features/*/spec.md` files; ensure the compiled summary is injected into the `<specs>` section of the system prompt
- [x] T023 [US2] Test that the system prompt includes both `<docs>` and `<specs>` sections and that the AI can answer questions from either source; adjust prompt wording if responses don't cite spec information when docs are insufficient

**Checkpoint**: Chatbot answers spec-level questions that aren't in user docs

---

## Phase 5: User Story 3 — Source Code Lookup for Edge Cases (Priority: P3)

**Goal**: Chatbot can fetch and use source code as a last-resort knowledge tier

**Independent Test**: Trigger source mode, ask "Which localStorage keys does the app use?" — verify correct, complete list

### Implementation for User Story 3

- [x] T024 [US3] Implement `loadSourceFiles()` in `js/knowledge.js`: fetch the 7 JS files listed in data-model.md (`js/calendar.js`, `js/time-entry-form.js`, `js/redmine-api.js`, `js/config.js`, `js/i18n.js`, `js/settings.js`, `js/arbzg.js`) via same-origin fetch, cache each in `_cache.sourceFiles` Map
- [x] T025 [US3] Add source code trigger UI in `js/chatbot.js`: a button or toggle in the chatbot input area labelled with `chatbot.source_trigger` i18n key; when activated, call `loadSourceFiles()` and rebuild the system prompt to include the `<source>` section
- [x] T026 [US3] Implement credential filtering (FR-010): before injecting source code into the system prompt, strip or redact any lines containing `apiKey`, `password`, `cookie` assignment values from the source text; system prompt preamble also instructs AI to never reveal credentials

**Checkpoint**: Source code tier works; credentials are filtered from source context

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation updates, cleanup

- [x] T027 [P] Update `docs/content.en.md` and `docs/content.de.md` to add a section about the AI Chatbot Assistant: how to configure the AI API key, how to start the AI proxy, how to use the chatbot panel
- [x] T028 Run full `quickstart.md` acceptance checklist (all FR, SC, and regression items) and mark each checkbox; fix any failures before closing the feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T002, T003, T004, T005, T006, T007 from Setup
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion (API client + knowledge loader + panel)
- **User Story 2 (Phase 4)**: Depends on US1 (spec loading is wired in US1, US2 verifies it works)
- **User Story 3 (Phase 5)**: Depends on US1 (base chatbot must work first)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **US2 (P2)**: Depends on US1 (verifies spec tier already wired in US1) — sequential after US1
- **US3 (P3)**: Depends on US1 (base chatbot) — can start after Phase 3

### Parallel Opportunities

- T001, T002, T003, T004, T005, T006, T007 — all touch different files, can run in parallel
- T011 and T012 can run in parallel (different knowledge sources)
- T024 and T025 can run in parallel within US3

---

## Parallel Example: Phase 1 Setup

```bash
# All seven tasks touch different files:
Task T001: "Add CDN scripts to index.html"
Task T002: "Add AI constants to js/config.js"
Task T003: "Extend cookie schema in js/settings.js"
Task T004: "Add chatbot i18n keys to js/i18n.js"
Task T005: "Create js/chatbot.js skeleton"
Task T006: "Create js/chatbot-api.js skeleton"
Task T007: "Create js/knowledge.js skeleton"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T007)
2. Complete Phase 2: Foundational (T008–T013)
3. Complete Phase 3: User Story 1 (T014–T021)
4. **STOP and VALIDATE**: Open chatbot, ask about any documented feature, verify correct answer
5. This alone is a usable feature

### Incremental Delivery

1. Setup + Foundational → AI infrastructure ready
2. US1 → Chatbot answers from docs + specs (MVP!)
3. US2 → Verify spec-tier answers work for detailed questions
4. US3 → Source code lookup for edge cases
5. Polish → Docs updated, quickstart checklist passes

---

## Notes

- No automated tests — `quickstart.md` is the sole acceptance gate
- AI responses are untrusted external data — always sanitise with DOMPurify before innerHTML
- System prompt rebuilt on each API call (stateless server-side; history in messages array)
- Credential values must never appear in AI context or responses (FR-010)
- The `loadSpecSummary()` implementation needs a way to discover spec files; consider a known list or fetching a directory index
