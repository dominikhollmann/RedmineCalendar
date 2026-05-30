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
  it('returns the expected shape', async () => {
    const win = makeWindowWithListeners();
    win.innerWidth = 1920;
    win.innerHeight = 1080;
    win.location = { href: 'https://example.com/index.html' };
    win.html2canvas = vi.fn().mockResolvedValue({
      toDataURL: () => 'data:image/png;base64,abc',
    });
    global.window = win;
    Object.defineProperty(globalThis, 'navigator', {
      value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0)' },
      writable: true,
      configurable: true,
    });
    const mod = await loadFresh();
    const ctx = await mod.collectBaseContext();
    expect(ctx).toHaveProperty('pageUrl', 'https://example.com/index.html');
    expect(ctx).toHaveProperty('userAgent');
    expect(ctx).toHaveProperty('os', 'Windows');
    expect(ctx).toHaveProperty('viewportWidth', 1920);
    expect(ctx).toHaveProperty('viewportHeight', 1080);
    expect(ctx).toHaveProperty('screenshotDataUrl', 'data:image/png;base64,abc');
  });

  it('returns null screenshotDataUrl when html2canvas throws', async () => {
    const win = makeWindowWithListeners();
    win.html2canvas = vi.fn().mockRejectedValue(new Error('canvas fail'));
    global.window = win;
    const mod = await loadFresh();
    const ctx = await mod.collectBaseContext();
    expect(ctx.screenshotDataUrl).toBeNull();
  });

  it('returns null screenshotDataUrl when html2canvas is unavailable', async () => {
    const win = makeWindowWithListeners();
    delete win.html2canvas;
    global.window = win;
    const mod = await loadFresh();
    const ctx = await mod.collectBaseContext();
    expect(ctx.screenshotDataUrl).toBeNull();
  });
});

describe('collectBugContext', () => {
  it('returns base context plus error/network/app log fields', async () => {
    const win = makeWindowWithListeners();
    win.html2canvas = vi.fn().mockResolvedValue({ toDataURL: () => null });
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
    win.html2canvas = vi.fn().mockResolvedValue({ toDataURL: () => null });
    global.window = win;
    const mod = await loadFresh();
    const ctx = await mod.collectBugContext();
    expect(ctx.calendarState).toBeNull();
  });
});
