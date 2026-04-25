# UAT: Audio Input for AI Assistant (Speech-to-Text)

**Feature**: 021-audio-input-assistant
**Prerequisites**: Chrome or Edge browser, working microphone

## Test Scenarios

### T1: Mic Button Visibility (P1)
- [ ] Open the AI assistant chat panel
- [ ] Verify a microphone button is visible next to the send button
- [ ] Verify the button has a microphone icon

### T2: Privacy Notice on First Use (P2)
- [ ] Clear localStorage (`redmine_calendar_voice_privacy_dismissed`)
- [ ] Tap the microphone button for the first time
- [ ] Verify a privacy notice appears explaining browser speech recognition may use cloud services
- [ ] Dismiss the notice
- [ ] Tap the mic button again — verify the notice does NOT appear a second time

### T3: Basic Voice Recording and Auto-Send (P1)
- [ ] Tap the mic button to start recording
- [ ] Verify a visual recording indicator appears (pulsing animation)
- [ ] Speak a short phrase (e.g., "What time entries do I have today?")
- [ ] Verify live interim transcription appears in the input field as you speak
- [ ] Tap the stop button
- [ ] Verify the final transcription is auto-sent as a chat message
- [ ] Verify the AI assistant responds to the message

### T4: Append to Existing Text (P1)
- [ ] Type some text in the chat input field (e.g., "Hello")
- [ ] Tap the mic button and speak a phrase
- [ ] Tap stop
- [ ] Verify the transcription is appended after the existing text with a space separator
- [ ] Verify the combined message is auto-sent

### T5: Cancel Recording (P2)
- [ ] Start recording by tapping the mic button
- [ ] Tap the cancel/mic button again before speaking
- [ ] Verify recording stops and no text is inserted or sent

### T6: Silence Timeout (P2)
- [ ] Start recording by tapping the mic button
- [ ] Do NOT speak for 10+ seconds
- [ ] Verify recording stops automatically
- [ ] Verify a message indicates no speech was detected

### T7: Maximum Duration (P2)
- [ ] Start recording and speak continuously
- [ ] After 60 seconds, verify recording stops automatically
- [ ] Verify the transcription up to that point is auto-sent
- [ ] Verify a notification about max duration is shown

### T8: Permission Denied (P2)
- [ ] Revoke microphone permission for the site in browser settings
- [ ] Tap the mic button
- [ ] Verify an error message explains microphone access is required
- [ ] Verify the error message includes guidance on how to enable it

### T9: Unsupported Browser (P2)
- [ ] Open the app in Firefox (which lacks SpeechRecognition support)
- [ ] Verify the microphone button is NOT visible in the chat panel

### T10: Mobile Layout (P3)
- [ ] Open the app on a mobile device or use browser DevTools mobile emulation (375px)
- [ ] Open the AI assistant chat panel
- [ ] Verify the mic button is visible and has adequate touch target size (≥44px)
- [ ] Complete the full voice-to-send flow on mobile

### T11: Localization (P2)
- [ ] Switch browser locale to German
- [ ] Verify all voice-input UI strings (button labels, error messages, privacy notice) appear in German
- [ ] Start a recording and speak in German
- [ ] Verify transcription works with German speech

### T12: Tab Switch During Recording (Edge Case)
- [ ] Start recording
- [ ] Switch to another browser tab
- [ ] Return to the app tab
- [ ] Verify recording has stopped and any captured audio was handled gracefully
