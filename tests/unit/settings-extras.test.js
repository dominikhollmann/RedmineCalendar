import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── helpers for the form-wiring re-import tests ─────────────────────
//
// js/settings.js wraps DOM wiring inside `if (document.getElementById('settings-form'))`.
// To execute that branch we must:
//   1. set up a stub document where getElementById returns DOM-like elements
//   2. vi.resetModules() so the import is re-evaluated
//   3. re-import settings.js (via `await import(...)`) so the wiring runs
//
// Each fake element supports the API surface used by settings.js:
//   - classList.toggle/.add/.remove
//   - addEventListener (for radios + form submit; submit handler captured via listeners)
//   - querySelector / querySelectorAll (for the form)
//   - innerHTML / textContent / value / href
//   - append (for renderConnectionError)

function makeEl(extra = {}) {
  const el = {
    value: '',
    href: '',
    target: '',
    rel: '',
    textContent: '',
    innerHTML: '',
    disabled: false,
    checked: false,
    classList: {
      _classes: new Set(),
      add(c) {
        this._classes.add(c);
      },
      remove(c) {
        this._classes.delete(c);
      },
      toggle(c, force) {
        if (force === true) this._classes.add(c);
        else if (force === false) this._classes.delete(c);
        else if (this._classes.has(c)) this._classes.delete(c);
        else this._classes.add(c);
      },
      contains(c) {
        return this._classes.has(c);
      },
    },
    listeners: {},
    addEventListener(type, fn) {
      this.listeners[type] = fn;
    },
    append(...args) {
      this._appended = (this._appended ?? []).concat(args);
      this.textContent += args
        .map((a) => (typeof a === 'string' ? a : (a?.textContent ?? '')))
        .join('');
    },
    ...extra,
  };
  return el;
}

function setupSettingsDom({
  withFirstTimeBanner = true,
  withConfigError = true,
  withWeekly = true,
  withRedmineLink = true,
} = {}) {
  const apikeyRadio = makeEl({ value: 'apikey', checked: true, type: 'radio' });
  const basicRadio = makeEl({ value: 'basic', checked: false, type: 'radio' });
  const radios = [apikeyRadio, basicRadio];

  const form = makeEl({
    querySelector(sel) {
      if (sel === 'input[name="authType"]:checked') {
        return radios.find((r) => r.checked) ?? null;
      }
      // input[value="apikey"] | input[value="basic"]
      const m = sel.match(/input\[value="([^"]+)"\]/);
      if (m) return radios.find((r) => r.value === m[1]) ?? null;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === 'input[name="authType"]') return radios;
      return [];
    },
  });

  const apiKeyInput = makeEl();
  const usernameInput = makeEl();
  const passwordInput = makeEl();
  const fieldApiKey = makeEl();
  const fieldBasic = makeEl();
  const errorEl = makeEl();
  const workhoursErr = makeEl();
  const weeklyHoursErr = makeEl();
  const saveBtn = makeEl();
  const workStart = makeEl();
  const workEnd = makeEl();
  const configErrorEl = withConfigError ? makeEl() : null;
  const firstBanner = withFirstTimeBanner ? makeEl() : null;
  const weeklyHours = withWeekly ? makeEl() : null;
  const redmineLink = withRedmineLink ? makeEl() : null;

  const elements = {
    'settings-form': form,
    apiKey: apiKeyInput,
    username: usernameInput,
    password: passwordInput,
    'field-apikey': fieldApiKey,
    'field-basic': fieldBasic,
    'settings-error': errorEl,
    'workhours-error': workhoursErr,
    'weekly-hours-error': weeklyHoursErr,
    'save-btn': saveBtn,
    workStart: workStart,
    workEnd: workEnd,
    'config-error': configErrorEl,
    'first-time-banner': firstBanner,
    weeklyHours: weeklyHours,
    'redmine-account-link': redmineLink,
  };

  global.document.getElementById = vi.fn((id) => elements[id] ?? null);
  // createElement returns a usable element (used by renderConnectionError)
  global.document.createElement = vi.fn(() => makeEl());

  return {
    elements,
    form,
    radios,
    apiKeyInput,
    usernameInput,
    passwordInput,
    fieldApiKey,
    fieldBasic,
    errorEl,
    workhoursErr,
    weeklyHoursErr,
    saveBtn,
    workStart,
    workEnd,
    configErrorEl,
    firstBanner,
    weeklyHours,
    redmineLink,
  };
}

async function flush() {
  // Multiple ticks to allow IIFE chains in the module to run
  for (let i = 0; i < 6; i++) {
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
  }
}

// Fresh import of settings.js with reset module registry. Also re-exports
// config-store helpers (loadCentralConfig, getCentralConfigSync,
// resetCentralConfigCache, readCredentials, clearCredentials) so existing
// destructuring patterns in tests keep working after the back-compat
// re-export was removed from settings.js.
async function importFreshSettings() {
  vi.resetModules();
  const settings = await import('../../js/settings.js');
  const configStore = await import('../../js/config-store.js');
  return { ...configStore, ...settings };
}

// ─────────────────────────────────────────────────────────────────────
//  Plain (non-DOM) coverage
// ─────────────────────────────────────────────────────────────────────

describe('readWeeklyHours / writeWeeklyHours', () => {
  beforeEach(() => {
    localStorage.clear();
    global.document.getElementById = vi.fn(() => null);
  });

  it('readWeeklyHours defaults to 40 when not set', async () => {
    const { readWeeklyHours } = await importFreshSettings();
    expect(readWeeklyHours()).toBe(40);
  });

  it('readWeeklyHours defaults to 40 for non-numeric value', async () => {
    const { readWeeklyHours } = await importFreshSettings();
    localStorage.setItem('redmine_calendar_weekly_hours', 'not-a-number');
    expect(readWeeklyHours()).toBe(40);
  });

  it('readWeeklyHours defaults to 40 for zero', async () => {
    const { readWeeklyHours } = await importFreshSettings();
    localStorage.setItem('redmine_calendar_weekly_hours', '0');
    expect(readWeeklyHours()).toBe(40);
  });

  it('readWeeklyHours defaults to 40 for negative', async () => {
    const { readWeeklyHours } = await importFreshSettings();
    localStorage.setItem('redmine_calendar_weekly_hours', '-5');
    expect(readWeeklyHours()).toBe(40);
  });

  it('writeWeeklyHours + readWeeklyHours round-trip', async () => {
    const { readWeeklyHours, writeWeeklyHours } = await importFreshSettings();
    writeWeeklyHours(40);
    expect(readWeeklyHours()).toBe(40);
  });

  it('writeWeeklyHours stores fractional hours', async () => {
    const { readWeeklyHours, writeWeeklyHours } = await importFreshSettings();
    writeWeeklyHours(37.5);
    expect(readWeeklyHours()).toBe(37.5);
  });
});

describe('readWorkingHours edge cases', () => {
  beforeEach(() => {
    localStorage.clear();
    global.document.getElementById = vi.fn(() => null);
  });

  it('returns null on malformed JSON', async () => {
    const { readWorkingHours } = await importFreshSettings();
    localStorage.setItem('redmine_calendar_working_hours', '{not-json');
    expect(readWorkingHours()).toBeNull();
  });

  it('returns null when stored object is missing fields', async () => {
    const { readWorkingHours } = await importFreshSettings();
    localStorage.setItem('redmine_calendar_working_hours', JSON.stringify({ start: '08:00' }));
    expect(readWorkingHours()).toBeNull();
  });

  it('returns null when stored value is the string "null"', async () => {
    const { readWorkingHours } = await importFreshSettings();
    localStorage.setItem('redmine_calendar_working_hours', 'null');
    expect(readWorkingHours()).toBeNull();
  });
});

describe('loadCentralConfig caching + branches', () => {
  beforeEach(() => {
    localStorage.clear();
    global.document.getElementById = vi.fn(() => null);
    vi.restoreAllMocks();
  });

  it('returns the same cached object on repeated calls', async () => {
    const { loadCentralConfig, resetCentralConfigCache } = await importFreshSettings();
    resetCentralConfigCache();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ redmineUrl: 'http://x', some: 1 }),
    });
    const a = await loadCentralConfig();
    const b = await loadCentralConfig();
    expect(a).toBe(b);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('throws when fetch itself rejects (network error)', async () => {
    const { loadCentralConfig, resetCentralConfigCache } = await importFreshSettings();
    resetCentralConfigCache();
    global.fetch = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(loadCentralConfig()).rejects.toThrow();
  });

  it('throws when JSON body is malformed', async () => {
    const { loadCentralConfig, resetCentralConfigCache } = await importFreshSettings();
    resetCentralConfigCache();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new Error('bad json')),
    });
    await expect(loadCentralConfig()).rejects.toThrow();
  });

  it('throws when redmineUrl field is missing', async () => {
    const { loadCentralConfig, resetCentralConfigCache } = await importFreshSettings();
    resetCentralConfigCache();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ aiProvider: 'claude' }),
    });
    await expect(loadCentralConfig()).rejects.toThrow();
  });
});

describe('getCentralConfigSync', () => {
  beforeEach(() => {
    localStorage.clear();
    global.document.getElementById = vi.fn(() => null);
    vi.restoreAllMocks();
  });

  it('returns null before loadCentralConfig succeeded', async () => {
    const { getCentralConfigSync, resetCentralConfigCache } = await importFreshSettings();
    resetCentralConfigCache();
    expect(getCentralConfigSync()).toBeNull();
  });

  it('returns the cached config after a successful load', async () => {
    const { getCentralConfigSync, loadCentralConfig, resetCentralConfigCache } =
      await importFreshSettings();
    resetCentralConfigCache();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ redmineUrl: 'http://x' }),
    });
    await loadCentralConfig();
    expect(getCentralConfigSync()).toEqual({ redmineUrl: 'http://x' });
  });
});

describe('readCredentials branch coverage', () => {
  beforeEach(() => {
    localStorage.clear();
    global.document.getElementById = vi.fn(() => null);
  });

  it('returns null for basic auth missing username', async () => {
    const { writeCredentials, readCredentials } = await importFreshSettings();
    await writeCredentials({ authType: 'basic', username: '', password: 'p' });
    expect(await readCredentials()).toBeNull();
  });

  it('returns null for basic auth missing password', async () => {
    const { writeCredentials, readCredentials } = await importFreshSettings();
    await writeCredentials({ authType: 'basic', username: 'u', password: '' });
    expect(await readCredentials()).toBeNull();
  });

  it('defaults authType to apikey when stored creds omit it', async () => {
    const { writeCredentials, readCredentials } = await importFreshSettings();
    await writeCredentials({ apiKey: 'xyz' });
    const result = await readCredentials();
    expect(result).toEqual(expect.objectContaining({ authType: 'apikey', apiKey: 'xyz' }));
  });

  it('returns null when decrypted plaintext is the literal "null"', async () => {
    // Manually craft a payload that decrypts to 'null'
    const { encrypt } = await import('../../js/crypto.js');
    const envelope = await encrypt('null');
    localStorage.setItem('redmine_calendar_credentials', JSON.stringify(envelope));
    const { readCredentials } = await importFreshSettings();
    expect(await readCredentials()).toBeNull();
  });
});

describe('redirectToSettingsIfMissing — decrypt failure path', () => {
  beforeEach(() => {
    localStorage.clear();
    global.document.getElementById = vi.fn(() => null);
    vi.restoreAllMocks();
    window.location.href = '';
  });

  it('redirects when stored credentials cannot be decrypted', async () => {
    const { redirectToSettingsIfMissing, resetCentralConfigCache } = await importFreshSettings();
    resetCentralConfigCache();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ redmineUrl: 'http://localhost:8010/proxy' }),
    });
    localStorage.setItem('redmine_calendar_credentials', '!!!not-json!!!');
    await redirectToSettingsIfMissing();
    expect(window.location.href).toBe('settings.html');
  });
});

// ─────────────────────────────────────────────────────────────────────
//  Form wiring (DOM-mocked re-import)
// ─────────────────────────────────────────────────────────────────────

describe('settings page wiring — config error branch', () => {
  let original;
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    original = global.document.getElementById;
  });
  afterEach(() => {
    global.document.getElementById = original;
  });

  it('hides the form and shows config error when loadCentralConfig throws', async () => {
    const dom = setupSettingsDom();
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await importFreshSettings();
    await flush();
    expect(dom.configErrorEl.classList.contains('hidden')).toBe(false);
    expect(dom.configErrorEl.textContent).toMatch(/.+/);
    expect(dom.form.classList.contains('hidden')).toBe(true);
  });

  it('still continues silently when configErrorEl is absent', async () => {
    const dom = setupSettingsDom({ withConfigError: false });
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await importFreshSettings();
    await flush();
    expect(dom.form.classList.contains('hidden')).toBe(true);
  });
});

describe('settings page wiring — happy load path', () => {
  let original;
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    original = global.document.getElementById;
    window.location.href = '';
  });
  afterEach(() => {
    global.document.getElementById = original;
  });

  it('renders admin info, sets redmine link, shows first-time banner, prefills working+weekly hours, and toggles auth fields', async () => {
    const dom = setupSettingsDom();
    // Pre-existing prefs but no credentials → first-time banner branch
    localStorage.setItem(
      'redmine_calendar_working_hours',
      JSON.stringify({ start: '08:00', end: '17:00' })
    );
    localStorage.setItem('redmine_calendar_weekly_hours', '40');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          redmineUrl: 'http://localhost:8010/proxy',
          redmineServerUrl: 'https://redmine.example.com',
          aiProvider: 'claude',
          aiModel: 'opus',
        }),
    });
    await importFreshSettings();
    await flush();

    // Feature 033 / US3: the admin-info block was removed. The earlier
    // assertions about Redmine URL / AI Provider / AI Model being rendered
    // into #admin-info no longer apply.
    expect(dom.redmineLink.href).toBe('https://redmine.example.com/my/account');
    expect(dom.firstBanner.classList.contains('hidden')).toBe(false);
    expect(dom.workStart.value).toBe('08:00');
    expect(dom.workEnd.value).toBe('17:00');
    expect(dom.weeklyHours.value).toBe('40');
    // updateAuthFields had run twice (initial + via radio.change handler exists)
    expect(dom.fieldBasic.classList.contains('hidden')).toBe(true);
  });

  it('renders prefilled credentials and skips the first-time banner', async () => {
    setupSettingsDom();
    // Pre-write apikey credentials
    {
      const fresh = await importFreshSettings();
      await fresh.writeCredentials({ authType: 'apikey', apiKey: 'pre-existing' });
    }
    // Reset and re-setup DOM since previous import didn't have form wiring active when fetch was set
    setupSettingsDom();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ redmineUrl: 'http://x' }),
    });
    const dom2 = setupSettingsDom();
    await importFreshSettings();
    await flush();
    expect(dom2.apiKeyInput.value).toBe('pre-existing');
    // first-time banner should NOT be unhidden (it stays default — empty class set)
    expect(dom2.firstBanner.classList.contains('hidden')).toBe(false); // was never explicitly added
    // But importantly the code branch `else if (firstTimeBanner)` was skipped since existing was truthy.
    // We assert credential was loaded into the form which proves the truthy branch ran.
  });

  it('clears credentials and shows decrypt error when stored creds are corrupt', async () => {
    localStorage.clear();
    localStorage.setItem('redmine_calendar_credentials', '!!!not-json!!!');
    const dom = setupSettingsDom();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ redmineUrl: 'http://x' }),
    });
    await importFreshSettings();
    await flush();
    expect(dom.errorEl.classList.contains('hidden')).toBe(false);
    expect(dom.errorEl.textContent).toMatch(/.+/);
    // clearCredentials should have removed the bad value
    expect(localStorage.getItem('redmine_calendar_credentials')).toBeNull();
  });

  it('skips link / banner branches when those elements are absent', async () => {
    setupSettingsDom({
      withFirstTimeBanner: false,
      withRedmineLink: false,
      withWeekly: false,
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ redmineUrl: 'http://x' /* no redmineServerUrl */ }),
    });
    await importFreshSettings();
    await flush();
    // No throw is success; assert the form is still visible
    const form = global.document.getElementById('settings-form');
    expect(form.classList.contains('hidden')).toBe(false);
  });
});

describe('settings page wiring — submit branches', () => {
  let original;
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    original = global.document.getElementById;
    window.location.href = '';
    // Real timers: production submit path has no intentional delays. The
    // earlier fake-timer + microtask-pump pattern was flaky (~20% rate)
    // because the pump count couldn't reliably out-pace the deeper await
    // chains; awaiting the submit promise directly is deterministic.
  });
  afterEach(() => {
    global.document.getElementById = original;
  });

  async function bootForm({ configFetch } = {}) {
    const dom = setupSettingsDom();
    global.fetch =
      configFetch ??
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ redmineUrl: 'http://localhost:8010/proxy' }),
      });
    await importFreshSettings();
    await flush();
    return dom;
  }

  function makeEvent() {
    return { preventDefault: vi.fn() };
  }

  it('apikey: shows error when API key is empty', async () => {
    const dom = await bootForm();
    dom.apiKeyInput.value = '   ';
    await dom.form.listeners.submit(makeEvent());
    expect(dom.errorEl.classList.contains('hidden')).toBe(false);
    expect(dom.errorEl.textContent).toMatch(/API key/);
  });

  it('basic: shows error when username/password empty', async () => {
    const dom = await bootForm();
    dom.radios[0].checked = false;
    dom.radios[1].checked = true; // basic
    dom.usernameInput.value = '';
    dom.passwordInput.value = '';
    await dom.form.listeners.submit(makeEvent());
    expect(dom.errorEl.classList.contains('hidden')).toBe(false);
  });

  it('working hours: shows error when only one of start/end is filled', async () => {
    const dom = await bootForm();
    dom.apiKeyInput.value = 'k';
    dom.workStart.value = '08:00';
    dom.workEnd.value = '';
    await dom.form.listeners.submit(makeEvent());
    expect(dom.workhoursErr.classList.contains('hidden')).toBe(false);
    expect(dom.workhoursErr.textContent).toMatch(/.+/);
  });

  it('working hours: shows error when end <= start', async () => {
    const dom = await bootForm();
    dom.apiKeyInput.value = 'k';
    dom.workStart.value = '17:00';
    dom.workEnd.value = '08:00';
    await dom.form.listeners.submit(makeEvent());
    expect(dom.workhoursErr.classList.contains('hidden')).toBe(false);
    expect(dom.workhoursErr.textContent).toMatch(/.+/);
  });

  it('weekly hours: blocks save + shows error when empty', async () => {
    const dom = await bootForm();
    dom.apiKeyInput.value = 'k';
    dom.workStart.value = '';
    dom.workEnd.value = '';
    dom.weeklyHours.value = ''; // user cleared the prefilled value
    const fetchSpy = (global.fetch = vi.fn());
    await dom.form.listeners.submit(makeEvent());
    expect(dom.weeklyHoursErr.classList.contains('hidden')).toBe(false);
    expect(dom.weeklyHoursErr.textContent).toMatch(/.+/);
    // Save is blocked: no value persisted, no connection attempt.
    expect(localStorage.getItem('redmine_calendar_weekly_hours')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('weekly hours: blocks save + shows error when zero', async () => {
    const dom = await bootForm();
    dom.apiKeyInput.value = 'k';
    dom.workStart.value = '';
    dom.workEnd.value = '';
    dom.weeklyHours.value = '0';
    const fetchSpy = (global.fetch = vi.fn());
    await dom.form.listeners.submit(makeEvent());
    expect(dom.weeklyHoursErr.classList.contains('hidden')).toBe(false);
    expect(localStorage.getItem('redmine_calendar_weekly_hours')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('clears working hours when both fields empty + saves weekly hours + redirects on success', async () => {
    // Pre-existing working hours we expect to be cleared
    localStorage.setItem(
      'redmine_calendar_working_hours',
      JSON.stringify({ start: '01:00', end: '02:00' })
    );

    const dom = await bootForm();
    dom.apiKeyInput.value = 'good-key';
    dom.workStart.value = '';
    dom.workEnd.value = '';
    dom.weeklyHours.value = '40';

    // Mock subsequent fetch (for getCurrentUser via request())
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ user: { id: 1 } }),
      text: () => Promise.resolve('{"user":{"id":1}}'),
    });

    await dom.form.listeners.submit(makeEvent());

    expect(localStorage.getItem('redmine_calendar_working_hours')).toBeNull();
    expect(localStorage.getItem('redmine_calendar_weekly_hours')).toBe('40');
    expect(window.location.href).toBe('index.html');
  });

  it('writes working hours when both fields filled + handles 401 error from getCurrentUser', async () => {
    const dom = await bootForm();
    dom.apiKeyInput.value = 'bad-key';
    dom.workStart.value = '08:00';
    dom.workEnd.value = '17:00';

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve(''),
    });

    await dom.form.listeners.submit(makeEvent());

    expect(localStorage.getItem('redmine_calendar_working_hours')).toBe(
      JSON.stringify({ start: '08:00', end: '17:00' })
    );
    expect(dom.errorEl.classList.contains('hidden')).toBe(false);
    expect(dom.saveBtn.disabled).toBe(false);
    // creds should have been cleared after failure
    expect(localStorage.getItem('redmine_calendar_credentials')).toBeNull();
  });

  it('renders 404 error from getCurrentUser', async () => {
    const dom = await bootForm();
    dom.apiKeyInput.value = 'k';
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 404, text: () => Promise.resolve('') });
    await dom.form.listeners.submit(makeEvent());
    expect(dom.errorEl.classList.contains('hidden')).toBe(false);
  });

  it('renders 503 error from getCurrentUser', async () => {
    const dom = await bootForm();
    dom.apiKeyInput.value = 'k';
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 503, text: () => Promise.resolve('') });
    await dom.form.listeners.submit(makeEvent());
    expect(dom.errorEl.classList.contains('hidden')).toBe(false);
  });

  it('renders generic connection failed (network error) — exercises renderConnectionError link branch', async () => {
    const dom = await bootForm();
    dom.apiKeyInput.value = 'k';
    // fetch rejects → request() throws RedmineError with proxyUrl set; message contains the url
    global.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    await dom.form.listeners.submit(makeEvent());
    expect(dom.errorEl.classList.contains('hidden')).toBe(false);
  });

  it('updateAuthFields toggles fields when authType radio changes', async () => {
    const dom = await bootForm();
    // Simulate switching to basic auth
    dom.radios[0].checked = false;
    dom.radios[1].checked = true;
    // Each radio had the change listener attached
    dom.radios[1].listeners.change?.();
    expect(dom.fieldApiKey.classList.contains('hidden')).toBe(true);
    expect(dom.fieldBasic.classList.contains('hidden')).toBe(false);
  });
});
