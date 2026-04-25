# Data Model: Audio Input for AI Assistant

## Entities

### VoiceInputSession

In-memory state object managed by the `VoiceInput` class. Not persisted.

| Field | Type | Description |
|-------|------|-------------|
| state | `'idle' \| 'recording' \| 'transcribing' \| 'error'` | Current session state |
| interimTranscript | `string` | Live partial transcription (updated during recording) |
| finalTranscript | `string` | Finalized transcription text (set on stop) |
| errorCode | `string \| null` | Error identifier: `'not-supported'`, `'permission-denied'`, `'no-speech'`, `'network'`, `'max-duration'` |
| startTime | `number \| null` | `Date.now()` when recording started (for max duration tracking) |

### State Transitions

```
idle ──[start()]──→ recording
recording ──[onresult(final)]──→ idle (auto-send)
recording ──[stop()]──→ idle (auto-send with current results)
recording ──[silence timeout]──→ idle (error: no-speech)
recording ──[max duration]──→ idle (auto-send + notification)
recording ──[onerror]──→ error
idle ←──[dismiss/auto-clear]── error
```

### Validation Rules

- `start()` is a no-op if `state !== 'idle'`
- `stop()` is a no-op if `state !== 'recording'`
- Max duration timer (60s) starts with `start()`, cleared on `stop()` or state change
- Silence timeout (10s) is handled by SpeechRecognition's built-in `onspeechend`

## Storage

### localStorage Keys

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `redmine_calendar_voice_privacy_dismissed` | `'true' \| absent` | absent | Set to `'true'` after user dismisses the privacy notice |
