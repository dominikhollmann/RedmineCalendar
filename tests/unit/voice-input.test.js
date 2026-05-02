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
    stop: vi.fn(function () { setTimeout(() => this.onend?.(), 0); }),
    abort: vi.fn(),
  };
  return instance;
}

let mockInstance;

beforeEach(() => {
  mockInstance = null;
  globalThis.window = globalThis.window || {};
  globalThis.window.SpeechRecognition = vi.fn(() => {
    mockInstance = createMockRecognition();
    return mockInstance;
  });
  globalThis.localStorage = {
    _store: {},
    getItem(k) { return this._store[k] ?? null; },
    setItem(k, v) { this._store[k] = String(v); },
    removeItem(k) { delete this._store[k]; },
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
      await new Promise(r => setTimeout(r, 10));
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
        results: [{
          0: { transcript: 'hello' },
          isFinal: false,
          length: 1,
        }],
      });

      expect(vi_instance.interimTranscript).toBe('hello');
      expect(onInterim).toHaveBeenCalledWith('hello');
    });

    it('updates finalTranscript on final results and calls onFinal via onend', async () => {
      const onFinal = vi.fn();
      const vi_instance = new VoiceInput({ onFinal });
      vi_instance.start();

      mockInstance.onresult({
        results: [{
          0: { transcript: 'hello world' },
          isFinal: true,
          length: 1,
        }],
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
  });
});

describe('i18n voice keys', () => {
  it('has all required English voice keys', async () => {
    vi.resetModules();
    const { t } = await import('../../js/i18n.js');
    const keys = [
      'voice.start', 'voice.stop', 'voice.cancel',
      'voice.not_supported', 'voice.permission_denied',
      'voice.no_speech', 'voice.network_error',
      'voice.max_duration', 'voice.privacy_notice', 'voice.privacy_dismiss',
    ];
    for (const key of keys) {
      const val = t(key);
      expect(val, `missing key: ${key}`).not.toBe(key);
      expect(val.length).toBeGreaterThan(0);
    }
  });
});
