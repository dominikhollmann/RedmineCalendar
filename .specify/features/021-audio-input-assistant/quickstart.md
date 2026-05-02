# UAT: Audio Input for AI Assistant (Speech-to-Text)

**Feature**: 021-audio-input-assistant
**Prerequisites**: Chrome or Edge browser, working microphone

## Test Scenarios

### T1: Mic Button Visibility (P1)
- [x] Open the AI assistant chat panel
- [x] Verify a microphone button is visible next to the send button
- [x] Verify the button has a microphone icon

### T2: Privacy Notice on First Use (P2)
- [x] Clear localStorage (`redmine_calendar_voice_privacy_dismissed`)
- [x] Tap the microphone button for the first time
- [x] Verify a privacy notice appears explaining browser speech recognition may use cloud services
- [x] Dismiss the notice
- [x] Tap the mic button again — verify the notice does NOT appear a second time

### T3: Basic Voice Recording and Auto-Send (P1)
- [x] Tap the mic button to start recording
- [x] Verify a visual recording indicator appears (pulsing animation)
- [x] Speak a short phrase (e.g., "What time entries do I have today?")
- [x] Verify live interim transcription appears in the input field as you speak
- [x] Tap the stop button
- [x] Verify the final transcription is auto-sent as a chat message
- [x] Verify the AI assistant responds to the message

### T4: Append to Existing Text (P1)
- [x] Type some text in the chat input field (e.g., "Hello")
- [x] Tap the mic button and speak a phrase
- [x] Tap stop
- [x] Verify the transcription is appended after the existing text with a space separator
- [x] Verify the combined message is auto-sent

### T5: Cancel Recording (P2)
- [x] Start recording by tapping the mic button
- [x] Tap the cancel/mic button again before speaking
- [x] Verify recording stops and no text is inserted or sent

### T6: Silence Timeout (P2)
- [x] Start recording by tapping the mic button
- [x] Do NOT speak for 10+ seconds
- [x] Verify recording stops automatically
- [x] Verify a message indicates no speech was detected

### T7: Maximum Duration (P2)
- [x] Start recording and speak continuously
- [x] After 60 seconds, verify recording stops automatically
- [x] Verify the transcription up to that point is auto-sent
- [x] Verify a notification about max duration is shown
  - Note: 2s auto-stop on silence pre-empts the 60s max timer in practice; max-duration notification only appears if speaking continuously for 60s without any 2s pause

### T8: Permission Denied (P2)
- [x] Revoke microphone permission for the site in browser settings
- [x] Tap the mic button
- [x] Verify an error message explains microphone access is required
- [x] Verify the error message includes guidance on how to enable it

### T9: Unsupported Browser (P2)
- [x] Open the app in Firefox (which lacks SpeechRecognition support)
- [x] Verify the microphone button is NOT visible in the chat panel

### T10: Mobile Layout (P3)
- [x] Open the app on a mobile device or use browser DevTools mobile emulation (375px)
- [x] Open the AI assistant chat panel
- [x] Verify the mic button is visible and has adequate touch target size (≥44px)
- [x] Complete the full voice-to-send flow on mobile

### T11: Localization (P2)
- [x] Switch browser locale to German
- [x] Verify all voice-input UI strings (button labels, error messages, privacy notice) appear in German
- [x] Start a recording and speak in German
- [x] Verify transcription works with German speech

### T12: Tab Switch During Recording (Edge Case)
- [x] Start recording
- [x] Switch to another browser tab
- [x] Return to the app tab
- [x] Verify recording has stopped and any captured audio was handled gracefully
