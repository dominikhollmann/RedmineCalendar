import { describe, it, expect, beforeEach, vi } from 'vitest';

const STORAGE_KEY = 'redmine_calendar_theme';

// Helper: build a minimal root element stub with a working dataset proxy.
function makeRoot() {
  const attrs = {};
  return {
    dataset: new Proxy(attrs, {
      get: (obj, prop) => obj[prop],
      set: (obj, prop, val) => {
        obj[prop] = val;
        return true;
      },
      deleteProperty: (obj, prop) => {
        delete obj[prop];
        return true;
      },
    }),
    _attrs: attrs,
  };
}

beforeEach(() => {
  // Each test starts with a clean module + a clean localStorage shim.
  vi.resetModules();
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
  };
  // Provide a documentElement so setTheme can apply
  globalThis.document = {
    documentElement: makeRoot(),
  };
});

describe('getTheme', () => {
  it("returns 'light' when localStorage key is missing", async () => {
    const { getTheme } = await import('../../js/theme.js');
    expect(getTheme()).toBe('light');
  });

  it("returns 'light' for invalid values", async () => {
    const { getTheme } = await import('../../js/theme.js');
    for (const v of ['', 'foo', 'DARK', '123']) {
      localStorage.setItem(STORAGE_KEY, v);
      expect(getTheme()).toBe('light');
    }
  });

  it("returns 'dark' when stored value is 'dark'", async () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    const { getTheme } = await import('../../js/theme.js');
    expect(getTheme()).toBe('dark');
  });

  it("returns 'light' when stored value is 'light'", async () => {
    localStorage.setItem(STORAGE_KEY, 'light');
    const { getTheme } = await import('../../js/theme.js');
    expect(getTheme()).toBe('light');
  });

  it('does not crash when localStorage throws', async () => {
    globalThis.localStorage = {
      getItem: () => {
        throw new Error('storage unavailable');
      },
      setItem: () => {
        throw new Error('storage unavailable');
      },
      removeItem: () => {},
      clear: () => {},
    };
    const { getTheme } = await import('../../js/theme.js');
    expect(getTheme()).toBe('light');
  });
});

describe('setTheme', () => {
  it("persists 'dark' to localStorage and sets data-theme='dark' on <html>", async () => {
    const { setTheme } = await import('../../js/theme.js');
    setTheme('dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it("persists 'light' and removes the data-theme attribute", async () => {
    document.documentElement.dataset.theme = 'dark';
    const { setTheme } = await import('../../js/theme.js');
    setTheme('light');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("normalizes any non-'dark' value to 'light'", async () => {
    const { setTheme } = await import('../../js/theme.js');
    setTheme('garbage');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it('does not throw when localStorage write fails (private browsing)', async () => {
    let stored = null;
    globalThis.localStorage = {
      getItem: () => stored,
      setItem: () => {
        throw new Error('storage unavailable');
      },
      removeItem: () => {
        stored = null;
      },
      clear: () => {},
    };
    const { setTheme } = await import('../../js/theme.js');
    expect(() => setTheme('dark')).not.toThrow();
    // The apply path still ran:
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});

describe('applyTheme', () => {
  it("sets dataset.theme='dark' when theme is 'dark'", async () => {
    const { applyTheme } = await import('../../js/theme.js');
    const root = makeRoot();
    applyTheme(root, 'dark');
    expect(root.dataset.theme).toBe('dark');
  });

  it("removes dataset.theme when theme is 'light'", async () => {
    const { applyTheme } = await import('../../js/theme.js');
    const root = makeRoot();
    root.dataset.theme = 'dark';
    applyTheme(root, 'light');
    expect(root.dataset.theme).toBeUndefined();
  });

  it('is idempotent (multiple applies)', async () => {
    const { applyTheme } = await import('../../js/theme.js');
    const root = makeRoot();
    applyTheme(root, 'dark');
    applyTheme(root, 'dark');
    expect(root.dataset.theme).toBe('dark');
  });

  it('does nothing on a null root (defensive)', async () => {
    const { applyTheme } = await import('../../js/theme.js');
    expect(() => applyTheme(null, 'dark')).not.toThrow();
  });
});

describe('subscribeOnChange', () => {
  it('fires the listener after every setTheme', async () => {
    const { setTheme, subscribeOnChange } = await import('../../js/theme.js');
    const calls = [];
    const unsub = subscribeOnChange((t) => calls.push(t));
    setTheme('dark');
    setTheme('light');
    expect(calls).toEqual(['dark', 'light']);
    unsub();
  });

  it('supports multiple listeners; unsubscribe removes a single one', async () => {
    const { setTheme, subscribeOnChange } = await import('../../js/theme.js');
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = subscribeOnChange(a);
    subscribeOnChange(b);
    setTheme('dark');
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    unsubA();
    setTheme('light');
    expect(a).toHaveBeenCalledTimes(1); // no further calls
    expect(b).toHaveBeenCalledTimes(2);
  });

  it('ignores non-function arguments', async () => {
    const { subscribeOnChange } = await import('../../js/theme.js');
    expect(() => subscribeOnChange('not a fn')()).not.toThrow();
  });

  it('unsubscribe is idempotent — calling it twice does not throw (i < 0 branch)', async () => {
    const { subscribeOnChange } = await import('../../js/theme.js');
    const listener = vi.fn();
    const unsub = subscribeOnChange(listener);
    unsub(); // removes from _listeners; i >= 0 branch taken
    expect(() => unsub()).not.toThrow(); // listener already gone; i < 0 branch taken
  });

  it('does not let a throwing listener break other listeners', async () => {
    const { setTheme, subscribeOnChange } = await import('../../js/theme.js');
    subscribeOnChange(() => {
      throw new Error('boom');
    });
    const survivor = vi.fn();
    subscribeOnChange(survivor);
    expect(() => setTheme('dark')).not.toThrow();
    expect(survivor).toHaveBeenCalledWith('dark');
  });
});
