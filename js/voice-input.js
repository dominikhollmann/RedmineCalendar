import { t, locale } from './i18n.js';

const PRIVACY_KEY = 'redmine_calendar_voice_privacy_dismissed';
const SILENCE_TIMEOUT = 10000;
const MAX_DURATION = 60000;

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

export function isSupported() {
  return !!getSpeechRecognition();
}

export function isPrivacyDismissed() {
  return localStorage.getItem(PRIVACY_KEY) === 'true';
}

export function dismissPrivacy() {
  localStorage.setItem(PRIVACY_KEY, 'true');
}

export class VoiceInput {
  constructor(callbacks = {}) {
    this.state = 'idle';
    this.interimTranscript = '';
    this.finalTranscript = '';
    this.errorCode = null;
    this._startTime = null;
    this._recognition = null;
    this._maxTimer = null;
    this._silenceTimer = null;
    this._cb = callbacks;
  }

  start() {
    const SR = getSpeechRecognition();
    if (this.state !== 'idle' || !SR) return;

    this._recognition = new SR();
    this._recognition.interimResults = true;
    this._recognition.continuous = true;
    this._recognition.lang = locale === 'de' ? 'de-DE' : 'en-US';

    this._recognition.onresult = (event) => {
      this._clearSilenceTimer();
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      this.finalTranscript = final;
      this.interimTranscript = interim;
      this._cb.onInterim?.(final + interim);
    };

    this._recognition.onspeechend = () => {
      this._silenceTimer = setTimeout(() => {
        if (this.state === 'recording') {
          this._finish('no-speech');
        }
      }, SILENCE_TIMEOUT);
    };

    this._recognition.onerror = (event) => {
      this._cleanup();
      const code = event.error === 'not-allowed' ? 'permission-denied'
        : event.error === 'network' ? 'network'
        : event.error === 'no-speech' ? 'no-speech'
        : event.error;
      this.errorCode = code;
      this.state = 'error';
      this._cb.onError?.(code);
      this.state = 'idle';
    };

    this._recognition.onend = () => {
      if (this.state === 'recording') {
        this._finalize();
      }
    };

    this.interimTranscript = '';
    this.finalTranscript = '';
    this.errorCode = null;
    this.state = 'recording';
    this._startTime = Date.now();
    this._recognition.start();

    this._maxTimer = setTimeout(() => {
      if (this.state === 'recording') {
        this._finish('max-duration');
      }
    }, MAX_DURATION);

    this._cb.onStart?.();
  }

  stop() {
    if (this.state !== 'recording') return;
    this._cleanup();
    this._recognition?.stop();
  }

  cancel() {
    if (this.state !== 'recording') return;
    this._cleanup();
    this._recognition?.abort();
    this.interimTranscript = '';
    this.finalTranscript = '';
    this.state = 'idle';
    this._cb.onCancel?.();
  }

  _finish(reason) {
    this._cleanup();
    this._recognition?.stop();
    if (reason === 'no-speech' && !this.finalTranscript && !this.interimTranscript) {
      this.state = 'idle';
      this._cb.onError?.('no-speech');
      return;
    }
    if (reason === 'max-duration') {
      this._cb.onMaxDuration?.();
    }
  }

  _finalize() {
    const text = (this.finalTranscript + this.interimTranscript).trim();
    this.state = 'idle';
    if (text) {
      this._cb.onFinal?.(text);
    }
  }

  _cleanup() {
    clearTimeout(this._maxTimer);
    this._clearSilenceTimer();
    this._maxTimer = null;
  }

  _clearSilenceTimer() {
    clearTimeout(this._silenceTimer);
    this._silenceTimer = null;
  }
}
