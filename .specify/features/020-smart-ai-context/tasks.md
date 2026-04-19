# Tasks: Smart AI Context Loading

## Phase 1: Remove Unnecessary Context

- [ ] T001 Remove `loadSpecSummary()` and all spec loading from `js/knowledge.js` — specs are developer artifacts, not needed for user chat
- [ ] T002 Remove `SPEC_FEATURES` array and `_cache.specSummary` from `js/knowledge.js`
- [ ] T003 Update `buildSystemPrompt()` — remove the specs section entirely

## Phase 2: Selective Source Code Loading

- [ ] T004 Create a topic-to-files mapping in `js/knowledge.js` — map keywords to relevant source files (e.g., "copy"/"paste"/"clipboard" → calendar.js, "arbzg"/"working time"/"overtime" → arbzg.js, "settings"/"config"/"api key" → settings.js)
- [ ] T005 Add `selectRelevantSource(message, history)` function — given a user message and conversation history, return only the source files that match by keyword
- [ ] T006 Update `buildSystemPrompt()` — accept a `relevantFiles` parameter instead of boolean `includeSource`, include only those files
- [ ] T007 Add prompt size logging — log total prompt character count to console for debugging

## Phase 3: Wire Up

- [ ] T008 Update `js/chatbot.js` `handleSend()` — call `selectRelevantSource()` with the user's message and session history, pass result to `buildSystemPrompt()`
- [ ] T009 Stop calling `loadSpecSummary()` and `loadSourceFiles()` eagerly in `openChatPanel()` — load source files on demand when needed

## Phase 4: Tests & Polish

- [ ] T010 Add unit test `tests/unit/knowledge.test.js` — test `selectRelevantSource()` keyword matching
- [ ] T011 Update user docs if needed (EN + DE)
- [ ] T012 Run quickstart.md acceptance tests
