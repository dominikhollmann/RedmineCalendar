# Tasks: Audio Input for AI Assistant (Speech-to-Text)

**Input**: Design documents from `.specify/features/021-audio-input-assistant/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, quickstart.md

**Tests**: Every implementation task that adds or changes behavior MUST include its own unit and/or UI tests. Tests are not a separate phase — they are part of completing each task. A task is not done until its tests exist and pass.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create the new voice-input module and add i18n keys

- [x] T001 Create VoiceInput class skeleton with state machine (idle/recording/transcribing/error) and feature detection in js/voice-input.js (with unit tests in tests/unit/voice-input.test.js)
- [x] T002 [P] Add voice-input i18n keys (en + de) to js/i18n.js: `voice.start`, `voice.stop`, `voice.cancel`, `voice.not_supported`, `voice.permission_denied`, `voice.no_speech`, `voice.network_error`, `voice.max_duration`, `voice.privacy_notice`, `voice.privacy_dismiss` (with unit tests verifying keys exist in both locales)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the mic button to the chat panel HTML and CSS — required before any user story can be tested

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Add microphone button element (`#chatbot-audio-btn`) next to send button in `.chatbot-input-area` in index.html. Hide button by default; shown only when SpeechRecognition is available (with UI test verifying button presence in tests/ui/voice-input.spec.js)
- [x] T004 [P] Add CSS styles for mic button (idle, recording, disabled states), pulsing recording indicator animation, and privacy notice banner in css/style.css. Include mobile-responsive styles (min touch target 44px)

**Checkpoint**: Mic button visible in chat panel on supported browsers, hidden on unsupported ones

---

## Phase 3: User Story 1 — Voice Message Input (Priority: P1) 🎯 MVP

**Goal**: User taps mic, speaks, sees live transcription, and message auto-sends on stop

**Independent Test**: Tap mic button, speak a phrase, verify transcription appears live, tap stop, verify message is auto-sent to AI assistant

- [x] T005 [US1] Implement SpeechRecognition start/stop in VoiceInput class: `start()` creates SpeechRecognition instance with `interimResults: true`, `continuous: true`, `lang` from app locale; `stop()` calls `recognition.stop()` — in js/voice-input.js (with unit tests mocking SpeechRecognition)
- [x] T006 [US1] Implement `onresult` handler in VoiceInput: update `interimTranscript` on interim results, set `finalTranscript` on final results, emit events (`interim`, `final`, `error`) via callback — in js/voice-input.js (with unit tests)
- [x] T007 [US1] Wire VoiceInput into chatbot.js: on mic button click call `voiceInput.start()`/`stop()`, on `interim` event update `#chatbot-input` textarea value, on `final` event append to existing text (space separator) and call `handleSend()` — in js/chatbot.js (with UI test in tests/ui/voice-input.spec.js verifying full flow with mocked SpeechRecognition)
- [x] T008 [US1] Toggle mic button icon between microphone (idle) and stop (recording) states, update aria-label accordingly — in js/chatbot.js (with UI test)

**Checkpoint**: Full voice-to-send flow works — tap mic, speak, see live text, stop, message auto-sends

---

## Phase 4: User Story 2 — Recording Feedback and Status (Priority: P2)

**Goal**: Clear visual feedback during recording, helpful error messages for all failure modes

**Independent Test**: Start recording and verify pulsing indicator; deny mic permission and verify error message; wait 10s silent and verify timeout message

- [x] T009 [US2] Add recording state CSS class toggle: when recording starts add `.recording` class to `#chatbot-audio-btn` and `.chatbot-input-area`, triggering pulse animation; remove on stop — in js/chatbot.js and css/style.css (with UI test)
- [x] T010 [US2] Style interim transcription text distinctly in textarea (e.g., lighter color or italic placeholder) to distinguish from finalized text — in js/chatbot.js and css/style.css
- [x] T011 [US2] Implement silence timeout: if `onspeechend` fires and no final result within 10 seconds, auto-stop and show localized "no speech detected" message via chat system message — in js/voice-input.js (with unit test)
- [x] T012 [US2] Implement max duration timeout: start 60-second timer on recording start, auto-stop and auto-send on expiry with notification — in js/voice-input.js (with unit test)
- [x] T013 [US2] Handle permission denied error: on `onerror` with `error === 'not-allowed'`, display localized message explaining how to enable microphone access — in js/voice-input.js and js/chatbot.js (with unit test)
- [x] T014 [US2] Implement privacy notice: on first mic button tap, check `redmine_calendar_voice_privacy_dismissed` localStorage key; if absent, show dismissible notice banner above input area; on dismiss set key to `'true'` and proceed with recording — in js/chatbot.js (with UI test)
- [x] T015 [US2] Handle cancel: if user taps mic button during recording without speaking, stop recording and discard any partial transcript without sending — in js/voice-input.js and js/chatbot.js (with unit test)

**Checkpoint**: All error states handled, visual feedback clear during recording, privacy notice works

---

## Phase 5: User Story 3 — Mobile-Optimized Voice Input (Priority: P3)

**Goal**: Mic button works well on mobile with adequate touch targets and layout

**Independent Test**: Open chat panel at 375px viewport, tap mic, speak, verify full flow works within mobile layout

- [x] T016 [US3] Verify and adjust mic button touch target size (≥44px) and positioning in mobile layout via CSS media queries in css/style.css (with UI test at 375px viewport in tests/ui/voice-input.spec.js)
- [x] T017 [US3] Handle visibility change: add `visibilitychange` event listener — when page becomes hidden during recording, stop recording and handle partial transcript gracefully — in js/voice-input.js (with unit test)

**Checkpoint**: Voice input fully functional on mobile viewport

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, cleanup, and final validation

- [x] T018 [P] Update user documentation in docs/content.en.md and docs/content.de.md with voice input feature description, supported browsers, and usage instructions
- [x] T019 Run quickstart.md UAT scenarios (T1–T12) and verify all pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001 (VoiceInput class) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion
- **User Story 2 (Phase 4)**: Depends on Phase 3 (builds on working recording flow)
- **User Story 3 (Phase 5)**: Depends on Phase 3 (needs working desktop flow first)
- **Polish (Phase 6)**: Depends on all user stories complete

### Within Each User Story

- VoiceInput class logic before chatbot.js integration
- Core flow before error handling
- Each task includes its own tests — a task is not done until tests pass

### Parallel Opportunities

- T001 and T002 can run in parallel (different files)
- T003 and T004 can run in parallel (HTML vs CSS)
- US2 and US3 could run in parallel after US1 completes (US3 is independent of US2)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T004)
3. Complete Phase 3: User Story 1 (T005–T008)
4. **STOP and VALIDATE**: Test voice-to-send flow end-to-end
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Mic button visible
2. User Story 1 → Basic voice input works → MVP!
3. User Story 2 → Full error handling + feedback
4. User Story 3 → Mobile optimized
5. Polish → Documentation + final validation
