# Feature Specification: Audio Input for AI Assistant (Speech-to-Text)

**Feature Branch**: `021-audio-input-assistant`  
**Created**: 2026-04-21  
**Status**: Draft  
**Input**: User description: "Include Audio-input in the AI Assistant (speech to text)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Voice Message Input (Priority: P1)

A user wants to ask the AI assistant a question or give a command without typing. They tap a microphone button in the chat input area, speak their message, and the transcribed text appears in the chat input field. The user can review and edit the transcription before sending.

**Why this priority**: This is the core value of the feature -- enabling hands-free or faster interaction with the AI assistant via voice, which is especially valuable on mobile devices.

**Independent Test**: Can be fully tested by tapping the mic button, speaking a phrase, and verifying the transcribed text appears in the input field ready to send.

**Acceptance Scenarios**:

1. **Given** the chat panel is open and the user has not started recording, **When** the user taps the microphone button, **Then** the browser requests microphone permission (if not already granted) and recording begins with a visible recording indicator.
2. **Given** recording is active, **When** the user speaks, **Then** live interim transcription results are shown in the input field in real time, updating as recognition progresses.
3. **Given** recording is active, **When** the user taps the stop button, **Then** recording stops, the final transcription replaces interim results, and the message is automatically sent to the AI assistant.
4. **Given** the input field already contains text when recording starts, **When** transcription completes, **Then** the transcribed text is appended after the existing text (with a space separator) before auto-sending.

---

### User Story 2 - Recording Feedback and Status (Priority: P2)

While recording, the user sees clear visual feedback that the microphone is active. If transcription is in progress, the user sees a loading indicator. If an error occurs (e.g., microphone denied, no speech detected), the user receives a helpful message.

**Why this priority**: Without clear feedback, users won't know if the system is listening or if something went wrong. This is essential for a usable experience but secondary to the core transcription flow.

**Independent Test**: Can be tested by starting a recording and observing visual indicators, then denying microphone access and verifying error messaging.

**Acceptance Scenarios**:

1. **Given** recording is active, **When** the user looks at the chat input area, **Then** a pulsing or animated indicator shows that the microphone is listening.
2. **Given** recording is active and the user is speaking, **When** the system receives interim results, **Then** partial transcription text is displayed in real time in the input area, visually distinguished from finalized text.
3. **Given** the user has denied microphone permission, **When** they tap the microphone button, **Then** a message explains that microphone access is required and how to enable it.
4. **Given** recording is active but no speech is detected for 10 seconds, **When** the timeout elapses, **Then** recording stops automatically and the user is informed that no speech was detected.
5. **Given** recording has been active for 60 seconds, **When** the maximum duration elapses, **Then** recording stops automatically, the transcription is finalized and auto-sent, and the user is notified that the maximum duration was reached.
6. **Given** the user taps the microphone button for the first time ever, **When** before recording starts, **Then** a one-time dismissible privacy notice is shown explaining that the browser's speech recognition may process audio via cloud services. The notice is not shown again after dismissal (stored in localStorage).

---

### User Story 3 - Mobile-Optimized Voice Input (Priority: P3)

On mobile devices, the microphone button is prominently placed and easy to tap. The voice input workflow works well with touch interactions and the mobile layout of the chat panel.

**Why this priority**: The existing feature 012 added mobile calendar support, and voice input is particularly valuable on mobile where typing is slower. However, the feature must work on desktop first.

**Independent Test**: Can be tested by opening the chat panel on a mobile device, tapping the mic button, speaking, and verifying the full flow works within the mobile layout.

**Acceptance Scenarios**:

1. **Given** the user is on a mobile device with the chat panel open, **When** they look at the input area, **Then** the microphone button is clearly visible and has an adequate touch target size.
2. **Given** the user is on a mobile device and recording, **When** they speak, **Then** the recording and transcription flow works identically to desktop.

---

### Edge Cases

- What happens when the browser does not support speech recognition? The system shows a message that voice input is not available in the current browser and hides the microphone button.
- What happens when the user switches tabs or minimizes the browser during recording? Recording stops and any captured audio is transcribed if possible, otherwise discarded with a notification.
- What happens when network connectivity is lost during transcription? The user is informed that transcription failed and can try again.
- What happens when the user speaks in a language different from the app locale? Transcription uses the current app locale as a hint but processes whatever audio is captured; accuracy may vary.
- What happens when the user rapidly taps the mic button multiple times? Only one recording session is active at a time; additional taps toggle stop/start.

## Clarifications

### Session 2026-04-25

- Q: Should transcription results appear live as the user speaks or only after stopping? → A: Live interim results shown while speaking, finalized on stop.
- Q: If the input field already contains text, should transcription append or replace? → A: Append transcribed text after existing text (with a space separator).
- Q: Should there be a maximum recording duration cap? → A: 60-second maximum, then auto-stop with notification.
- Q: Should the app display a privacy notice about browser speech recognition potentially using cloud services? → A: One-time dismissible notice on first mic button tap, stored in localStorage.
- Q: After transcription finalizes, should the message auto-send or require manual send? → A: Auto-send immediately; data-changing actions already require user confirmation via modal, so a send-confirm step would be redundant friction.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a microphone button in the AI assistant chat input area that initiates voice recording when activated.
- **FR-002**: System MUST request microphone permission from the browser before first recording and handle permission denial gracefully.
- **FR-003**: System MUST convert recorded speech to text using browser-native speech recognition capabilities, displaying live interim results in real time as the user speaks.
- **FR-004**: System MUST auto-send the finalized transcription as a chat message immediately after recording stops. If the input field contained existing text, the transcription MUST be appended after it with a space separator.
- **FR-005**: System MUST display a visual recording indicator while the microphone is active.
- **FR-006**: System MUST automatically stop recording after a configurable silence timeout (default: 10 seconds of no speech detected) or after a maximum recording duration of 60 seconds, whichever comes first.
- **FR-007**: System MUST display appropriate error messages when voice input is unavailable (unsupported browser, denied permission, no speech detected, max duration reached).
- **FR-012**: System MUST display a one-time dismissible privacy notice on first microphone button activation, informing the user that the browser's speech recognition may use cloud services. Dismissal state MUST be persisted in localStorage.
- **FR-008**: All user-visible strings related to voice input MUST be localized via the existing i18n system (English and German).
- **FR-009**: System MUST allow the user to cancel an active recording without inserting any text.
- **FR-010**: The microphone button MUST be accessible on both desktop and mobile layouts with adequate touch target sizes on mobile.
- **FR-011**: System MUST hide the microphone button entirely when the browser does not support speech recognition.

### Key Entities

- **Voice Recording Session**: Represents an active recording from start to stop/cancel, including state (idle, recording, transcribing, error) and the resulting transcript text.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can initiate voice recording, speak a message, and see transcribed text in the input field within 3 seconds of stopping recording.
- **SC-002**: Voice input is available and functional on the majority of modern desktop and mobile browsers.
- **SC-003**: 90% of clearly spoken single-sentence messages in English or German are transcribed accurately enough to be understood without editing.
- **SC-004**: The full voice-to-send flow (tap mic, speak, stop) completes automatically with no additional user action required beyond stopping the recording.
- **SC-005**: Error states (permission denied, no speech, unsupported browser) are communicated to the user within 2 seconds of detection.

## Assumptions

- The browser's built-in speech recognition capabilities are used for transcription -- no external speech-to-text service or API key is required from the user.
- Users have a working microphone connected to their device.
- The existing AI assistant chat panel (features 014/015) is implemented and functional.
- Voice input supplements but does not replace keyboard text input.
- The app locale (English/German) is used as the recognition language hint.
- Recording and transcription happen client-side; no audio data is sent to the application server (though the browser's speech recognition may use cloud services internally). A one-time privacy notice informs the user of this on first use.
- `redmine_calendar_voice_privacy_dismissed` localStorage key tracks whether the privacy notice has been dismissed.
- Continuous dictation (long-form multi-paragraph input) is out of scope; the feature targets short messages and commands typical of chat interactions.
