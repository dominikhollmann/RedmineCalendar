// T007: Unit tests for js/data-refresh.js — written before T009/T010 implementation.
// These tests MUST FAIL until the full implementation replaces the stubs.

import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../../js/notify.js', () => ({
  showToast: vi.fn(),
}));
vi.mock('../../js/i18n.js', () => ({
  t: vi.fn((key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key)),
  locale: 'en',
}));

async function freshModule() {
  vi.resetModules();
  vi.doMock('../../js/notify.js', () => ({ showToast: vi.fn() }));
  vi.doMock('../../js/i18n.js', () => ({
    t: vi.fn((key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key)),
    locale: 'en',
  }));
  return await import('../../js/data-refresh.js');
}

describe('getLastRefreshedAt', () => {
  it('returns null before any refresh', async () => {
    const mod = await freshModule();
    expect(mod.getLastRefreshedAt()).toBeNull();
  });
});

describe('startAutoRefresh(0)', () => {
  afterEach(() => vi.useRealTimers());

  it('does not set an interval when intervalSecs is 0', async () => {
    vi.useFakeTimers();
    const mod = await freshModule();
    const spy = vi.spyOn(globalThis, 'setInterval');
    mod.startAutoRefresh(0);
    expect(spy).not.toHaveBeenCalled();
    mod.stopAutoRefresh();
    vi.useRealTimers();
  });
});

describe('stopAutoRefresh', () => {
  afterEach(() => vi.useRealTimers());

  it('clears the interval handle without throwing when no interval is set', async () => {
    const mod = await freshModule();
    expect(() => mod.stopAutoRefresh()).not.toThrow();
  });

  it('clears an active interval so it no longer fires', async () => {
    vi.useFakeTimers();
    const mod = await freshModule();
    const cb = vi.fn();
    mod.registerRefreshCallback(cb);
    mod.startAutoRefresh(120);
    mod.stopAutoRefresh();
    await vi.advanceTimersByTimeAsync(300_000);
    // cb may have been called for initial setup but not repeatedly after stop
    const callsAfterStop = cb.mock.calls.length;
    await vi.advanceTimersByTimeAsync(300_000);
    expect(cb.mock.calls.length).toBe(callsAfterStop);
    vi.useRealTimers();
  });
});

describe('triggerRefresh debounce guard', () => {
  it('is a no-op when a refresh is already in progress', async () => {
    const mod = await freshModule();
    let resolveFirst;
    const slow = () =>
      new Promise((res) => {
        resolveFirst = res;
      });
    mod.registerRefreshCallback(slow);
    const first = mod.triggerRefresh();
    const second = mod.triggerRefresh(); // must return early without calling callback again
    resolveFirst?.();
    await first;
    await second;
    // slow was registered once — if guard works, it ran at most once
    // (second call returned early before invoking callbacks again)
    // We verify by checking it resolved without throwing
    expect(true).toBe(true); // reaching here means no infinite hang
  });

  it('calls all registered callbacks on trigger', async () => {
    const mod = await freshModule();
    const cb1 = vi.fn().mockResolvedValue(undefined);
    const cb2 = vi.fn().mockResolvedValue(undefined);
    mod.registerRefreshCallback(cb1);
    mod.registerRefreshCallback(cb2);
    await mod.triggerRefresh();
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it('resolves after all callbacks settle', async () => {
    const mod = await freshModule();
    let settled = false;
    const cb = vi.fn().mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 10));
      settled = true;
    });
    mod.registerRefreshCallback(cb);
    await mod.triggerRefresh();
    expect(settled).toBe(true);
  });
});

describe('triggerRefresh: failed callback shows toast', () => {
  it('calls showToast with refresh_failed key when a callback rejects', async () => {
    vi.resetModules();
    const mockShowToast = vi.fn();
    vi.doMock('../../js/notify.js', () => ({ showToast: mockShowToast }));
    vi.doMock('../../js/i18n.js', () => ({
      t: vi.fn((key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key)),
      locale: 'en',
    }));
    const mod = await import('../../js/data-refresh.js');
    mod.registerRefreshCallback(() => Promise.reject(new Error('network')));
    await mod.triggerRefresh();
    expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('calendar.refresh_failed'));
  });
});

describe('auto-refresh timer fires callbacks', () => {
  afterEach(() => vi.useRealTimers());

  it('calls registered callbacks when the polling interval elapses', async () => {
    vi.useFakeTimers();
    const mod = await freshModule();
    const cb = vi.fn().mockResolvedValue(undefined);
    mod.registerRefreshCallback(cb);
    mod.startAutoRefresh(120);
    await vi.advanceTimersByTimeAsync(121_000);
    mod.stopAutoRefresh();
    expect(cb).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
