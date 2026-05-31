import { describe, it, expect, vi, beforeEach } from 'vitest';

// Helper: load a fresh module instance (reset module-level ring buffers and flags)
async function loadFresh() {
  vi.resetModules();
  return await import('../../js/feedback-context.js');
}

// Helpers for unhandledrejection listener tracking
function makeWindowWithListeners() {
  const listeners = {};
  return {
    location: { href: 'https://test.example/' },
    innerWidth: 1280,
    innerHeight: 720,
    fetch: vi.fn(),
    addEventListener: vi.fn((type, fn) => {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    }),
    dispatchEvent: vi.fn((ev) => {
      (listeners[ev.type] || []).forEach((fn) => fn(ev));
    }),
    _listeners: listeners,
  };
}

// ── T005: installFetchLog / getNetworkLog ─────────────────────────

describe('installFetchLog', () => {
  it('wraps window.fetch and records network entries', async () => {
    const win = makeWindowWithListeners();
    win.fetch = vi.fn().mockResolvedValue({ status: 200 });
    global.window = win;
    const mod = await loadFresh();
    mod.installFetchLog();
    await window.fetch('https://example.com/api', { method: 'GET' });
    const log = mod.getNetworkLog();
    expect(log).toHaveLength(1);
    expect(log[0].url).toBe('https://example.com/api');
    expect(log[0].status).toBe(200);
    expect(log[0].method).toBe('GET');
    expect(typeof log[0].ms).toBe('number');
  });

  it('uppercases the method', async () => {
    const win = makeWindowWithListeners();
    win.fetch = vi.fn().mockResolvedValue({ status: 201 });
    global.window = win;
    const mod = await loadFresh();
    mod.installFetchLog();
    await window.fetch('https://api.test', { method: 'post' });
    expect(mod.getNetworkLog()[0].method).toBe('POST');
  });

  it('defaults method to GET when not provided', async () => {
    const win = makeWindowWithListeners();
    win.fetch = vi.fn().mockResolvedValue({ status: 200 });
    global.window = win;
    const mod = await loadFresh();
    mod.installFetchLog();
    await window.fetch('https://api.test');
    expect(mod.getNetworkLog()[0].method).toBe('GET');
  });

  it('records status 0 for failed (thrown) requests', async () => {
    const win = makeWindowWithListeners();
    win.fetch = vi.fn().mockRejectedValue(new TypeError('Network error'));
    global.window = win;
    const mod = await loadFresh();
    mod.installFetchLog();
    await expect(window.fetch('https://fail.example')).rejects.toThrow('Network error');
    const log = mod.getNetworkLog();
    expect(log).toHaveLength(1);
    expect(log[0].status).toBe(0);
  });

  it('is idempotent — second call does not double-wrap', async () => {
    const win = makeWindowWithListeners();
    win.fetch = vi.fn().mockResolvedValue({ status: 200 });
    global.window = win;
    const mod = await loadFresh();
    mod.installFetchLog();
    const wrappedOnce = window.fetch;
    mod.installFetchLog(); // second call — should be a no-op
    expect(window.fetch).toBe(wrappedOnce);
  });

  it('ring buffer drops oldest entry when 21st entry arrives', async () => {
    const win = makeWindowWithListeners();
    win.fetch = vi.fn().mockResolvedValue({ status: 200 });
    global.window = win;
    const mod = await loadFresh();
    mod.installFetchLog();
    for (let i = 0; i < 21; i++) {
      await window.fetch(`https://api.test/${i}`);
    }
    const log = mod.getNetworkLog();
    expect(log).toHaveLength(20);
    expect(log[0].url).toBe('https://api.test/1'); // entry 0 dropped
    expect(log[19].url).toBe('https://api.test/20');
  });
});

// ── T006: installErrorLog + log ───────────────────────────────────

describe('installErrorLog', () => {
  it('captures window.onerror events', async () => {
    global.window = makeWindowWithListeners();
    const mod = await loadFresh();
    mod.installErrorLog();
    const err = new Error('Test error');
    err.stack = 'Error: Test error\n  at test.js:1';
    window.onerror('Test error', 'test.js', 1, 1, err);
    const log = mod.getErrorLog();
    expect(log).toHaveLength(1);
    expect(log[0].message).toBe('Test error');
    expect(log[0].stack).toContain('at test.js');
    expect(log[0].timestamp).toMatch(/^\d{4}-/);
  });

  it('captures unhandledrejection events', async () => {
    const win = makeWindowWithListeners();
    global.window = win;
    const mod = await loadFresh();
    mod.installErrorLog();
    const reason = new Error('Promise rejection');
    reason.stack = 'Error: Promise rejection\n  at async.js:2';
    // Fire the synthetic event through the listener tracking
    const ev = { type: 'unhandledrejection', reason };
    win.dispatchEvent(ev);
    const log = mod.getErrorLog();
    expect(log).toHaveLength(1);
    expect(log[0].message).toBe('Promise rejection');
    expect(log[0].stack).toContain('at async.js');
  });

  it('falls back to message string when onerror is called without an error object', async () => {
    global.window = makeWindowWithListeners();
    const mod = await loadFresh();
    mod.installErrorLog();
    window.onerror('plain message', 'file.js', 5, 1, undefined);
    const log = mod.getErrorLog();
    expect(log[0].message).toBe('plain message');
    expect(log[0].stack).toBe('');
  });

  it('falls back to String(reason) when unhandledrejection reason is not an Error', async () => {
    const win = makeWindowWithListeners();
    global.window = win;
    const mod = await loadFresh();
    mod.installErrorLog();
    win.dispatchEvent({ type: 'unhandledrejection', reason: 'string reason' });
    const log = mod.getErrorLog();
    expect(log[0].message).toBe('string reason');
    expect(log[0].stack).toBe('');
  });

  it('respects the 10-entry error log limit', async () => {
    global.window = makeWindowWithListeners();
    const mod = await loadFresh();
    mod.installErrorLog();
    for (let i = 0; i < 12; i++) {
      const e = new Error(`err${i}`);
      e.stack = '';
      window.onerror(`err${i}`, '', 0, 0, e);
    }
    const log = mod.getErrorLog();
    expect(log).toHaveLength(10);
    expect(log[0].message).toBe('err2'); // first two dropped
    expect(log[9].message).toBe('err11');
  });

  it('is idempotent — double installErrorLog does not add extra listeners', async () => {
    global.window = makeWindowWithListeners();
    const mod = await loadFresh();
    mod.installErrorLog();
    mod.installErrorLog(); // second call — should be no-op
    const e = new Error('once');
    e.stack = '';
    window.onerror('once', '', 0, 0, e);
    expect(mod.getErrorLog()).toHaveLength(1);
  });
});

describe('log', () => {
  it('stores entries with level and message', async () => {
    global.window = makeWindowWithListeners();
    const mod = await loadFresh();
    mod.log('warn', 'something happened');
    const log = mod.getAppLog();
    expect(log).toHaveLength(1);
    expect(log[0].level).toBe('warn');
    expect(log[0].message).toBe('something happened');
    expect(log[0].timestamp).toMatch(/^\d{4}-/);
  });

  it('accepts log, warn, and error levels', async () => {
    global.window = makeWindowWithListeners();
    const mod = await loadFresh();
    mod.log('log', 'a');
    mod.log('warn', 'b');
    mod.log('error', 'c');
    const levels = mod.getAppLog().map((e) => e.level);
    expect(levels).toEqual(['log', 'warn', 'error']);
  });

  it('respects the 50-entry app log limit', async () => {
    global.window = makeWindowWithListeners();
    const mod = await loadFresh();
    for (let i = 0; i < 52; i++) mod.log('log', `msg${i}`);
    const log = mod.getAppLog();
    expect(log).toHaveLength(50);
    expect(log[0].message).toBe('msg2'); // first two dropped
  });
});

// ── T007: getLocalStorageSnapshot ────────────────────────────────

describe('getLocalStorageSnapshot', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns all present allowlisted keys', async () => {
    localStorage.setItem('redmine_calendar_theme', 'dark');
    localStorage.setItem('redmine_calendar_view_mode', 'timeGridWeek');
    localStorage.setItem('redmine_calendar_working_hours', '{"start":"09:00","end":"17:00"}');
    localStorage.setItem('redmine_calendar_weekly_hours', '40');
    localStorage.setItem('redmine_calendar_day_range', 'workweek');
    localStorage.setItem('redmine_calendar_voice_privacy_dismissed', 'true');
    global.window = makeWindowWithListeners();
    const mod = await loadFresh();
    const snap = mod.getLocalStorageSnapshot();
    expect(Object.keys(snap)).toHaveLength(6);
    expect(snap['redmine_calendar_theme']).toBe('dark');
  });

  it('returns only keys that are present', async () => {
    localStorage.setItem('redmine_calendar_theme', 'light');
    global.window = makeWindowWithListeners();
    const mod = await loadFresh();
    const snap = mod.getLocalStorageSnapshot();
    expect(Object.keys(snap)).toEqual(['redmine_calendar_theme']);
  });

  it('returns empty object when no allowlisted keys are in storage', async () => {
    global.window = makeWindowWithListeners();
    const mod = await loadFresh();
    const snap = mod.getLocalStorageSnapshot();
    expect(snap).toEqual({});
  });

  it('never includes redmine_calendar_credentials', async () => {
    localStorage.setItem('redmine_calendar_credentials', 'secret');
    global.window = makeWindowWithListeners();
    const mod = await loadFresh();
    const snap = mod.getLocalStorageSnapshot();
    expect('redmine_calendar_credentials' in snap).toBe(false);
  });
});

// ── T009: _extractOs + collectBaseContext + collectBugContext ─────

describe('_extractOs', () => {
  it('detects Windows', async () => {
    const { _extractOs } = await loadFresh();
    expect(_extractOs('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Windows');
  });

  it('detects Mac OS', async () => {
    const { _extractOs } = await loadFresh();
    expect(_extractOs('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('Mac OS');
  });

  it('detects Linux', async () => {
    const { _extractOs } = await loadFresh();
    expect(_extractOs('Mozilla/5.0 (X11; Linux x86_64)')).toBe('Linux');
  });

  it('detects iOS', async () => {
    const { _extractOs } = await loadFresh();
    expect(_extractOs('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0')).toBe('iOS');
  });

  it('detects Android', async () => {
    const { _extractOs } = await loadFresh();
    expect(_extractOs('Mozilla/5.0 (Linux; Android 11; Pixel 5)')).toBe('Android');
  });

  it('returns Unknown for unrecognized UA', async () => {
    const { _extractOs } = await loadFresh();
    expect(_extractOs('SomeUnknownBrowser/1.0')).toBe('Unknown');
  });
});

describe('collectBaseContext', () => {
  it('returns the expected shape with a pre-captured screenshot', async () => {
    const win = makeWindowWithListeners();
    win.innerWidth = 1920;
    win.innerHeight = 1080;
    win.location = { href: 'https://example.com/index.html' };
    global.window = win;
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0)' },
      writable: true,
      configurable: true,
    });
    const mod = await loadFresh();
    const ctx = await mod.collectBaseContext('data:image/png;base64,abc');
    expect(ctx).toHaveProperty('pageUrl', 'https://example.com/index.html');
    expect(ctx).toHaveProperty('userAgent');
    expect(ctx).toHaveProperty('os', 'Windows');
    expect(ctx).toHaveProperty('viewportWidth', 1920);
    expect(ctx).toHaveProperty('viewportHeight', 1080);
    expect(ctx).toHaveProperty('screenshotDataUrl', 'data:image/png;base64,abc');
  });

  it('returns null screenshotDataUrl when no screenshot provided', async () => {
    const win = makeWindowWithListeners();
    global.window = win;
    const mod = await loadFresh();
    const ctx = await mod.collectBaseContext(null);
    expect(ctx.screenshotDataUrl).toBeNull();
  });

  it('returns null screenshotDataUrl when called with no argument', async () => {
    const win = makeWindowWithListeners();
    global.window = win;
    const mod = await loadFresh();
    const ctx = await mod.collectBaseContext();
    expect(ctx.screenshotDataUrl).toBeNull();
  });
});

describe('captureScreenshotTab', () => {
  beforeEach(() => {
    global.requestAnimationFrame = (cb) => {
      cb(0);
      return 0;
    };
  });

  it('returns a data URL on success', async () => {
    const mockTrack = { stop: vi.fn() };
    const mockStream = { getTracks: () => [mockTrack] };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: vi.fn() }),
      toDataURL: () => 'data:image/png;base64,test',
    };
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'video') {
        const v = {
          srcObject: null,
          muted: false,
          videoWidth: 100,
          videoHeight: 80,
          play: vi.fn().mockResolvedValue(undefined),
          set onloadedmetadata(fn) {
            fn();
          },
        };
        return v;
      }
      if (tag === 'canvas') return mockCanvas;
      return document.createElement.wrappedMethod?.(tag) ?? {};
    });
    Object.defineProperty(globalThis, 'navigator', {
      value: { mediaDevices: { getDisplayMedia: vi.fn().mockResolvedValue(mockStream) } },
      writable: true,
      configurable: true,
    });
    const mod = await loadFresh();
    const result = await mod.captureScreenshotTab();
    expect(result).toBe('data:image/png;base64,test');
    expect(mockTrack.stop).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('returns null when getDisplayMedia is rejected (user cancelled)', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        mediaDevices: { getDisplayMedia: vi.fn().mockRejectedValue(new DOMException('cancelled')) },
      },
      writable: true,
      configurable: true,
    });
    const mod = await loadFresh();
    const result = await mod.captureScreenshotTab();
    expect(result).toBeNull();
  });

  it('still returns a data URL when getContext returns null (no 2d support)', async () => {
    const mockTrack = { stop: vi.fn() };
    const mockStream = { getTracks: () => [mockTrack] };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: () => null,
      toDataURL: () => 'data:image/png;base64,noctx',
    };
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'video') {
        return {
          srcObject: null,
          muted: false,
          videoWidth: 0,
          videoHeight: 0,
          play: vi.fn().mockResolvedValue(undefined),
          set onloadedmetadata(fn) {
            fn();
          },
        };
      }
      if (tag === 'canvas') return mockCanvas;
      return {};
    });
    Object.defineProperty(globalThis, 'navigator', {
      value: { mediaDevices: { getDisplayMedia: vi.fn().mockResolvedValue(mockStream) } },
      writable: true,
      configurable: true,
    });
    const mod = await loadFresh();
    const result = await mod.captureScreenshotTab();
    expect(result).toBe('data:image/png;base64,noctx');
    vi.restoreAllMocks();
  });
});

describe('collectBugContext', () => {
  it('returns base context plus error/network/app log fields', async () => {
    const win = makeWindowWithListeners();
    // html2canvas removed; screenshot is now on-demand via getDisplayMedia
    global.window = win;
    const mod = await loadFresh();
    const ctx = await mod.collectBugContext();
    expect(ctx).toHaveProperty('pageUrl');
    expect(ctx).toHaveProperty('errors');
    expect(ctx).toHaveProperty('networkLog');
    expect(ctx).toHaveProperty('appLog');
    expect(ctx).toHaveProperty('localStorageSnapshot');
    expect(ctx).toHaveProperty('calendarState');
    expect(Array.isArray(ctx.errors)).toBe(true);
    expect(Array.isArray(ctx.networkLog)).toBe(true);
    expect(Array.isArray(ctx.appLog)).toBe(true);
  });

  it('sets calendarState to null when calendar.js is not loaded', async () => {
    const win = makeWindowWithListeners();
    // html2canvas removed; screenshot is now on-demand via getDisplayMedia
    global.window = win;
    const mod = await loadFresh();
    const ctx = await mod.collectBugContext();
    expect(ctx.calendarState).toBeNull();
  });
});

describe('no-DOM environment branches', () => {
  it('installFetchLog returns early when window is undefined', async () => {
    const saved = global.window;
    global.window = undefined;
    const mod = await loadFresh();
    expect(() => mod.installFetchLog()).not.toThrow();
    global.window = saved;
  });

  it('installErrorLog returns early when window is undefined', async () => {
    const saved = global.window;
    global.window = undefined;
    const mod = await loadFresh();
    expect(() => mod.installErrorLog()).not.toThrow();
    global.window = saved;
  });

  it('getLocalStorageSnapshot returns empty object when localStorage is undefined', async () => {
    const saved = global.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const mod = await loadFresh();
    expect(mod.getLocalStorageSnapshot()).toEqual({});
    Object.defineProperty(globalThis, 'localStorage', {
      value: saved,
      writable: true,
      configurable: true,
    });
  });

  it('collectBaseContext returns zero dimensions and empty URL when window is undefined', async () => {
    const savedW = global.window;
    const savedN = globalThis.navigator;
    global.window = undefined;
    Object.defineProperty(globalThis, 'navigator', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const mod = await loadFresh();
    const ctx = await mod.collectBaseContext(null);
    expect(ctx.pageUrl).toBe('');
    expect(ctx.userAgent).toBe('');
    expect(ctx.viewportWidth).toBe(0);
    expect(ctx.viewportHeight).toBe(0);
    global.window = savedW;
    Object.defineProperty(globalThis, 'navigator', {
      value: savedN,
      writable: true,
      configurable: true,
    });
  });

  it('collectBaseContext handles window.location being null', async () => {
    const win = makeWindowWithListeners();
    win.location = null;
    global.window = win;
    const mod = await loadFresh();
    const ctx = await mod.collectBaseContext(null);
    expect(ctx.pageUrl).toBe('');
  });
});
