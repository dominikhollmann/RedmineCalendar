import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function createMockRecognition() {
  const instance = {
    interimResults: false,
    continuous: false,
    lang: '',
    onresult: null,
    onspeechend: null,
    onerror: null,
    onend: null,
    start: vi.fn(),
    stop: vi.fn(function () {
      setTimeout(() => this.onend?.(), 0);
    }),
    abort: vi.fn(),
  };
  return instance;
}

let mockInstance;

beforeEach(() => {
  mockInstance = null;
  globalThis.window = globalThis.window || {};
  // vitest 4 dropped support for vi.fn() factories used as constructors.
  // Use a real class whose constructor explicitly returns the mock instance.
  globalThis.window.SpeechRecognition = class MockSpeechRecognition {
    constructor() {
      mockInstance = createMockRecognition();
      return mockInstance;
    }
  };
  globalThis.localStorage = {
    _store: {},
    getItem(k) {
      return this._store[k] ?? null;
    },
    setItem(k, v) {
      this._store[k] = String(v);
    },
    removeItem(k) {
      delete this._store[k];
    },
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  delete globalThis.window.SpeechRecognition;
});

describe('VoiceInput', () => {
  let VoiceInput, isSupported, isPrivacyDismissed, dismissPrivacy;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../js/voice-input.js');
    VoiceInput = mod.VoiceInput;
    isSupported = mod.isSupported;
    isPrivacyDismissed = mod.isPrivacyDismissed;
    dismissPrivacy = mod.dismissPrivacy;
  });

  describe('isSupported', () => {
    it('returns true when SpeechRecognition exists', () => {
      expect(isSupported()).toBe(true);
    });

    it('returns false when SpeechRecognition is absent', async () => {
      delete globalThis.window.SpeechRecognition;
      delete globalThis.window.webkitSpeechRecognition;
      vi.resetModules();
      const mod = await import('../../js/voice-input.js');
      expect(mod.isSupported()).toBe(false);
    });
  });

  describe('privacy', () => {
    it('isPrivacyDismissed returns false initially', () => {
      expect(isPrivacyDismissed()).toBe(false);
    });

    it('dismissPrivacy sets localStorage key', () => {
      dismissPrivacy();
      expect(isPrivacyDismissed()).toBe(true);
    });
  });

  describe('state machine', () => {
    it('starts in idle state', () => {
      const vi_instance = new VoiceInput();
      expect(vi_instance.state).toBe('idle');
    });

    it('transitions to recording on start()', () => {
      const vi_instance = new VoiceInput();
      vi_instance.start();
      expect(vi_instance.state).toBe('recording');
      expect(mockInstance.start).toHaveBeenCalled();
    });

    it('sets interimResults and continuous on recognition', () => {
      const vi_instance = new VoiceInput();
      vi_instance.start();
      expect(mockInstance.interimResults).toBe(true);
      expect(mockInstance.continuous).toBe(false);
    });

    it('does not start if already recording', () => {
      const vi_instance = new VoiceInput();
      vi_instance.start();
      const firstInstance = mockInstance;
      vi_instance.start();
      expect(mockInstance).toBe(firstInstance);
    });

    it('calls onStart callback', () => {
      const onStart = vi.fn();
      const vi_instance = new VoiceInput({ onStart });
      vi_instance.start();
      expect(onStart).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('calls recognition.stop()', () => {
      const vi_instance = new VoiceInput();
      vi_instance.start();
      vi_instance.stop();
      expect(mockInstance.stop).toHaveBeenCalled();
    });

    it('is a no-op if not recording', () => {
      const vi_instance = new VoiceInput();
      vi_instance.stop();
      expect(vi_instance.state).toBe('idle');
    });

    it('calls onCancel when stopped with no transcript', async () => {
      const onCancel = vi.fn();
      const onFinal = vi.fn();
      const vi_instance = new VoiceInput({ onCancel, onFinal });
      vi_instance.start();
      vi_instance.stop();
      await new Promise((r) => setTimeout(r, 10));
      expect(onCancel).toHaveBeenCalled();
      expect(onFinal).not.toHaveBeenCalled();
      expect(vi_instance.state).toBe('idle');
    });
  });

  describe('cancel', () => {
    it('aborts recognition and clears transcript', () => {
      const onCancel = vi.fn();
      const vi_instance = new VoiceInput({ onCancel });
      vi_instance.start();
      vi_instance.interimTranscript = 'partial';
      vi_instance.cancel();
      expect(mockInstance.abort).toHaveBeenCalled();
      expect(vi_instance.state).toBe('idle');
      expect(vi_instance.interimTranscript).toBe('');
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('onresult', () => {
    it('updates interimTranscript on interim results', () => {
      const onInterim = vi.fn();
      const vi_instance = new VoiceInput({ onInterim });
      vi_instance.start();

      mockInstance.onresult({
        results: [
          {
            0: { transcript: 'hello' },
            isFinal: false,
            length: 1,
          },
        ],
      });

      expect(vi_instance.interimTranscript).toBe('hello');
      expect(onInterim).toHaveBeenCalledWith('hello');
    });

    it('updates finalTranscript on final results and calls onFinal via onend', async () => {
      const onFinal = vi.fn();
      const vi_instance = new VoiceInput({ onFinal });
      vi_instance.start();

      mockInstance.onresult({
        results: [
          {
            0: { transcript: 'hello world' },
            isFinal: true,
            length: 1,
          },
        ],
      });

      expect(vi_instance.finalTranscript).toBe('hello world');

      mockInstance.onend();
      expect(onFinal).toHaveBeenCalledWith('hello world');
      expect(vi_instance.state).toBe('idle');
    });
  });

  describe('errors', () => {
    it('maps not-allowed to permission-denied', () => {
      const onError = vi.fn();
      const vi_instance = new VoiceInput({ onError });
      vi_instance.start();
      mockInstance.onerror({ error: 'not-allowed' });
      expect(onError).toHaveBeenCalledWith('permission-denied');
      expect(vi_instance.state).toBe('idle');
    });

    it('maps network error', () => {
      const onError = vi.fn();
      const vi_instance = new VoiceInput({ onError });
      vi_instance.start();
      mockInstance.onerror({ error: 'network' });
      expect(onError).toHaveBeenCalledWith('network');
    });

    it('maps no-speech error from onerror', () => {
      const onError = vi.fn();
      const vi_instance = new VoiceInput({ onError });
      vi_instance.start();
      mockInstance.onerror({ error: 'no-speech' });
      expect(onError).toHaveBeenCalledWith('no-speech');
      expect(vi_instance.state).toBe('idle');
    });

    it('passes through unknown error codes verbatim', () => {
      const onError = vi.fn();
      const vi_instance = new VoiceInput({ onError });
      vi_instance.start();
      mockInstance.onerror({ error: 'audio-capture' });
      expect(onError).toHaveBeenCalledWith('audio-capture');
      expect(vi_instance.errorCode).toBe('audio-capture');
    });

    it('ignores aborted error (treated as cancel)', () => {
      const onError = vi.fn();
      const vi_instance = new VoiceInput({ onError });
      vi_instance.start();
      mockInstance.onerror({ error: 'aborted' });
      expect(onError).not.toHaveBeenCalled();
      // state remains recording because the handler short-circuits
      expect(vi_instance.state).toBe('recording');
    });
  });

  describe('start() guard when unsupported', () => {
    it('does not transition state if SpeechRecognition is missing', async () => {
      delete globalThis.window.SpeechRecognition;
      delete globalThis.window.webkitSpeechRecognition;
      vi.resetModules();
      const mod = await import('../../js/voice-input.js');
      const vi_instance = new mod.VoiceInput();
      vi_instance.start();
      expect(vi_instance.state).toBe('idle');
      expect(vi_instance._recognition).toBe(null);
    });
  });

  describe('webkitSpeechRecognition fallback', () => {
    it('uses webkit-prefixed class when standard is missing', async () => {
      delete globalThis.window.SpeechRecognition;
      // Same vitest-4-constructor-fix as the standard SpeechRecognition mock above.
      let webkitCalled = false;
      globalThis.window.webkitSpeechRecognition = class MockWebkitSpeechRecognition {
        constructor() {
          webkitCalled = true;
          return createMockRecognition();
        }
      };
      vi.resetModules();
      const mod = await import('../../js/voice-input.js');
      expect(mod.isSupported()).toBe(true);
      const vi_instance = new mod.VoiceInput();
      vi_instance.start();
      expect(webkitCalled).toBe(true);
      delete globalThis.window.webkitSpeechRecognition;
    });
  });

  describe('cancel guard', () => {
    it('is a no-op when not recording', () => {
      const onCancel = vi.fn();
      const vi_instance = new VoiceInput({ onCancel });
      vi_instance.cancel();
      expect(onCancel).not.toHaveBeenCalled();
      expect(vi_instance.state).toBe('idle');
    });
  });

  describe('silence timer (auto-stop after pause)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('auto-stops after silence when transcript exists', () => {
      const onFinal = vi.fn();
      const vi_instance = new VoiceInput({ onFinal });
      vi_instance.start();

      // Deliver a final result, then let the silence timer fire.
      mockInstance.onresult({
        results: [{ 0: { transcript: 'recorded text' }, isFinal: true, length: 1 }],
      });

      // Advance past SILENCE_TIMEOUT (2000ms) — should call stop()
      vi.advanceTimersByTime(2001);
      expect(mockInstance.stop).toHaveBeenCalled();

      // Drain the setTimeout(()=>onend) inside the mocked stop() to finalize.
      vi.advanceTimersByTime(1);
      expect(onFinal).toHaveBeenCalledWith('recorded text');
      expect(vi_instance.state).toBe('idle');
    });

    it('emits no-speech when silence elapses with empty transcript', () => {
      const onError = vi.fn();
      const vi_instance = new VoiceInput({ onError });
      vi_instance.start();

      // Deliver an empty interim result so onresult sets up the silence timer
      // but neither finalTranscript nor interimTranscript ends up populated.
      mockInstance.onresult({
        results: [{ 0: { transcript: '' }, isFinal: false, length: 1 }],
      });

      vi.advanceTimersByTime(2001);
      expect(onError).toHaveBeenCalledWith('no-speech');
      expect(vi_instance.state).toBe('idle');
    });

    it('does nothing if state changed before silence fires', () => {
      const onError = vi.fn();
      const onFinal = vi.fn();
      const vi_instance = new VoiceInput({ onError, onFinal });
      vi_instance.start();

      mockInstance.onresult({
        results: [{ 0: { transcript: '' }, isFinal: false, length: 1 }],
      });
      // Cancel first — silence timer should be cleared and never fire.
      vi_instance.cancel();
      vi.advanceTimersByTime(5000);
      expect(onError).not.toHaveBeenCalled();
      expect(onFinal).not.toHaveBeenCalled();
    });
  });

  describe('max-duration timer', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('fires onMaxDuration after MAX_DURATION (60s)', () => {
      const onMaxDuration = vi.fn();
      const onFinal = vi.fn();
      const vi_instance = new VoiceInput({ onMaxDuration, onFinal });
      vi_instance.start();

      // Provide some transcript so _finish('max-duration') won't no-speech-bail.
      mockInstance.onresult({
        results: [{ 0: { transcript: 'long talk' }, isFinal: true, length: 1 }],
      });
      // Clear silence timer so only the max-duration timer remains.
      vi_instance._clearSilenceTimer();

      vi.advanceTimersByTime(60001);
      expect(onMaxDuration).toHaveBeenCalled();
      expect(mockInstance.stop).toHaveBeenCalled();

      // Drain mocked stop()'s queued onend.
      vi.advanceTimersByTime(1);
      expect(onFinal).toHaveBeenCalledWith('long talk');
    });

    it('does not fire onMaxDuration if state changed before timeout', () => {
      const onMaxDuration = vi.fn();
      const vi_instance = new VoiceInput({ onMaxDuration });
      vi_instance.start();
      vi_instance.cancel();
      vi.advanceTimersByTime(60001);
      expect(onMaxDuration).not.toHaveBeenCalled();
    });
  });

  describe('_finish edge cases', () => {
    it('no-speech with empty transcript routes through onError and stays idle', () => {
      const onError = vi.fn();
      const vi_instance = new VoiceInput({ onError });
      vi_instance.start();
      // Directly invoke _finish with no transcript to exercise the early-return branch.
      vi_instance._finish('no-speech');
      expect(onError).toHaveBeenCalledWith('no-speech');
      expect(vi_instance.state).toBe('idle');
    });

    it('reasons other than max-duration / no-speech do not invoke onMaxDuration', () => {
      const onMaxDuration = vi.fn();
      const onError = vi.fn();
      const vi_instance = new VoiceInput({ onMaxDuration, onError });
      vi_instance.start();
      vi_instance.finalTranscript = 'something';
      vi_instance._finish('other-reason');
      expect(onMaxDuration).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('_finalize empty transcript path', () => {
    it('calls onCancel when onend fires with no transcript', () => {
      const onCancel = vi.fn();
      const onFinal = vi.fn();
      const vi_instance = new VoiceInput({ onCancel, onFinal });
      vi_instance.start();
      // No onresult delivered — finalize with empty buffers.
      mockInstance.onend();
      expect(onCancel).toHaveBeenCalled();
      expect(onFinal).not.toHaveBeenCalled();
      expect(vi_instance.state).toBe('idle');
    });

    it('trims whitespace and calls onFinal with trimmed text', () => {
      const onFinal = vi.fn();
      const vi_instance = new VoiceInput({ onFinal });
      vi_instance.start();
      mockInstance.onresult({
        results: [{ 0: { transcript: '   spaced   ' }, isFinal: true, length: 1 }],
      });
      mockInstance.onend();
      expect(onFinal).toHaveBeenCalledWith('spaced');
    });
  });

  describe('language selection', () => {
    // These tests reset navigator inside themselves, then re-import the module,
    // because i18n.js captures `locale` at import time. We restore navigator
    // afterwards so the outer beforeEach's `await import(...)` (which is the
    // first thing each test sees) keeps consistent behaviour for siblings.
    afterEach(() => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['en'], language: 'en' },
        writable: true,
        configurable: true,
      });
    });

    it('uses en-US when locale is en', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['en-US'], language: 'en-US' },
        writable: true,
        configurable: true,
      });
      vi.resetModules();
      const mod = await import('../../js/voice-input.js');
      const vi_instance = new mod.VoiceInput();
      vi_instance.start();
      expect(mockInstance.lang).toBe('en-US');
    });

    it('uses de-DE when navigator language is German', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['de-DE'], language: 'de-DE' },
        writable: true,
        configurable: true,
      });
      vi.resetModules();
      const mod = await import('../../js/voice-input.js');
      const vi_instance = new mod.VoiceInput();
      vi_instance.start();
      expect(mockInstance.lang).toBe('de-DE');
    });
  });
});

describe('i18n voice keys', () => {
  it('has all required English voice keys', async () => {
    vi.resetModules();
    const { t } = await import('../../js/i18n.js');
    const keys = [
      'voice.start',
      'voice.stop',
      'voice.max_duration',
      'voice.privacy_notice',
      'voice.privacy_dismiss',
    ];
    for (const key of keys) {
      const val = t(key);
      expect(val, `missing key: ${key}`).not.toBe(key);
      expect(val.length).toBeGreaterThan(0);
    }
  });
});
