import { vi } from 'vitest';

// ── localStorage ──────────────────────────────────────────────────────────────
// Only install the fake stub in Node environments — jsdom provides a real localStorage.
if (typeof localStorage === 'undefined') {
  const store = {};
  global.localStorage = {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, val) => {
      store[key] = String(val);
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
  };
}

// Mock navigator — Node 25+ defines a read-only globalThis.navigator, so use defineProperty.
// jsdom sets navigator.languages; we still override to force a predictable 'en' locale
// so that i18n.js module-level code always resolves the English locale in all test envs.
Object.defineProperty(globalThis, 'navigator', {
  value: { languages: ['en'], language: 'en' },
  writable: true,
  configurable: true,
});

// ── document ──────────────────────────────────────────────────────────────────
// Only install the fake stub in Node environments — jsdom provides a real document.
if (typeof document === 'undefined') {
  let cookieStr = '';
  const documentElementStub = { lang: '', dataset: {} };
  Object.defineProperty(global, 'document', {
    value: {
      get cookie() {
        return cookieStr;
      },
      set cookie(v) {
        cookieStr = v;
      },
      getElementById: vi.fn(() => null),
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
      createElement: vi.fn(() => ({})),
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      // Feature 033 / US4: documentElement is read by i18n.js to set <html lang>.
      documentElement: documentElementStub,
    },
    writable: true,
    configurable: true,
  });
}

// Mock fetch — keep unconditional so no test makes real network calls.
// In jsdom environments this overrides jsdom's built-in fetch (acceptable because
// all API calls are made through mocked module helpers, not raw fetch).
global.fetch = vi.fn();

// Mock crypto.subtle for Node.js environment
// Node 20+ has crypto as a read-only global, so we mock subtle methods via vi.spyOn
if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
  vi.spyOn(globalThis.crypto.subtle, 'generateKey').mockImplementation(async () => ({
    type: 'secret',
    algorithm: 'AES-GCM',
  }));
  vi.spyOn(globalThis.crypto.subtle, 'encrypt').mockImplementation(async (algo, key, data) => {
    return new Uint8Array([...new Uint8Array(data)].map((b) => b ^ 0x42)).buffer;
  });
  vi.spyOn(globalThis.crypto.subtle, 'decrypt').mockImplementation(async (algo, key, data) => {
    return new Uint8Array([...new Uint8Array(data)].map((b) => b ^ 0x42)).buffer;
  });
} else {
  globalThis.crypto = {
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
      return arr;
    },
    subtle: {
      generateKey: vi.fn(async () => ({ type: 'secret', algorithm: 'AES-GCM' })),
      encrypt: vi.fn(async (algo, key, data) => {
        return new Uint8Array([...new Uint8Array(data)].map((b) => b ^ 0x42)).buffer;
      }),
      decrypt: vi.fn(async (algo, key, data) => {
        return new Uint8Array([...new Uint8Array(data)].map((b) => b ^ 0x42)).buffer;
      }),
    },
  };
}

// ── indexedDB ─────────────────────────────────────────────────────────────────
// jsdom does not implement indexedDB; install the fake in all test environments.
if (!globalThis.indexedDB) {
  const idbStore = {};
  globalThis.indexedDB = {
    open: vi.fn(() => {
      const req = {
        result: {
          createObjectStore: vi.fn(),
          transaction: vi.fn(() => ({
            objectStore: vi.fn(() => ({
              get: vi.fn((key) => {
                const r = { onsuccess: null, onerror: null, result: idbStore[key] ?? null };
                setTimeout(() => r.onsuccess?.());
                return r;
              }),
              put: vi.fn((val, key) => {
                idbStore[key] = val;
                const r = { onsuccess: null, onerror: null };
                setTimeout(() => r.onsuccess?.());
                return r;
              }),
            })),
          })),
        },
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };
      setTimeout(() => {
        req.onupgradeneeded?.();
        req.onsuccess?.();
      });
      return req;
    }),
  };
}

// ── window ────────────────────────────────────────────────────────────────────
// Only install the stub in Node environments — jsdom provides a real window object.
if (typeof window === 'undefined') {
  global.window = { location: { href: '' } };
}
