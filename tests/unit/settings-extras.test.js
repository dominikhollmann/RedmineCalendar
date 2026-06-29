import { describe, it, expect, vi, beforeEach } from 'vitest';

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

  it('returns factory default on malformed JSON', async () => {
    const { readWorkingHours } = await importFreshSettings();
    localStorage.setItem('redmine_calendar_working_hours', '{not-json');
    expect(readWorkingHours()).toEqual({ start: '08:00', end: '18:00' });
  });

  it('returns factory default when stored object is missing fields', async () => {
    const { readWorkingHours } = await importFreshSettings();
    localStorage.setItem('redmine_calendar_working_hours', JSON.stringify({ start: '08:00' }));
    expect(readWorkingHours()).toEqual({ start: '08:00', end: '18:00' });
  });

  it('returns factory default when stored value is the string "null"', async () => {
    const { readWorkingHours } = await importFreshSettings();
    localStorage.setItem('redmine_calendar_working_hours', 'null');
    expect(readWorkingHours()).toEqual({ start: '08:00', end: '18:00' });
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
//  Feature 054 redesign: settings.js is now a helper library (no self-init).
//  These tests cover the exported helpers consumed by settings-page.js.
// ─────────────────────────────────────────────────────────────────────

// Install a document stub keyed by id + selector. `radios` is a [apikey, basic]
// pair so getAuthType()/fillCredentialFields()/updateAuthFields() resolve.
function installDoc({ ids = {}, sections = [], stickyFooter = null } = {}) {
  const apikeyRadio = makeEl({ value: 'apikey', checked: true });
  const basicRadio = makeEl({ value: 'basic', checked: false });
  const radios = [apikeyRadio, basicRadio];
  global.document.getElementById = vi.fn((id) => ids[id] ?? null);
  global.document.querySelector = vi.fn((sel) => {
    if (sel === 'input[name="authType"]:checked') return radios.find((r) => r.checked) ?? null;
    const m = sel.match(/input\[name="authType"\]\[value="([^"]+)"\]/);
    if (m) return radios.find((r) => r.value === m[1]) ?? null;
    if (sel === '.settings-sticky-footer') return stickyFooter;
    return null;
  });
  global.document.querySelectorAll = vi.fn((sel) => {
    if (sel === '.settings-section') return sections;
    if (sel === 'input[name="authType"]') return radios;
    return [];
  });
  return { radios };
}

describe('validateWorkingHours', () => {
  beforeEach(() => localStorage.clear());

  it('accepts both-empty (disables the working-hours view)', async () => {
    const { validateWorkingHours } = await importFreshSettings();
    expect(validateWorkingHours('', '', makeEl())).toEqual({ bothEmpty: true, bothFilled: '' });
  });

  it('rejects when only one of start/end is filled', async () => {
    const { validateWorkingHours } = await importFreshSettings();
    const err = makeEl();
    expect(validateWorkingHours('08:00', '', err)).toBeNull();
    expect(err.classList.contains('hidden')).toBe(false);
  });

  it('rejects end <= start', async () => {
    const { validateWorkingHours } = await importFreshSettings();
    const err = makeEl();
    expect(validateWorkingHours('17:00', '08:00', err)).toBeNull();
    expect(err.textContent).toMatch(/.+/);
  });

  it('accepts a valid filled range', async () => {
    const { validateWorkingHours } = await importFreshSettings();
    expect(validateWorkingHours('08:00', '17:00', makeEl())).toEqual({
      bothEmpty: false,
      bothFilled: '17:00',
    });
  });
});

describe('validateWeeklyHours', () => {
  beforeEach(() => localStorage.clear());

  function setWeeklyValue(v) {
    const input = makeEl({ value: v });
    global.document.getElementById = vi.fn((id) => (id === 'weeklyHours' ? input : null));
  }

  it('returns the parsed value for a valid number', async () => {
    const { validateWeeklyHours } = await importFreshSettings();
    setWeeklyValue('37.5');
    expect(validateWeeklyHours(makeEl())).toBe(37.5);
  });

  it('rejects empty / zero / non-numeric / >60 with an inline error', async () => {
    const { validateWeeklyHours } = await importFreshSettings();
    for (const bad of ['', '0', 'abc', '61']) {
      setWeeklyValue(bad);
      const err = makeEl();
      expect(validateWeeklyHours(err)).toBeNull();
      expect(err.classList.contains('hidden')).toBe(false);
    }
  });

  it('is silent when the error element is absent', async () => {
    const { validateWeeklyHours } = await importFreshSettings();
    setWeeklyValue('');
    expect(validateWeeklyHours(null)).toBeNull();
  });
});

describe('persistWorkingHours', () => {
  beforeEach(() => {
    localStorage.clear();
    global.document.getElementById = vi.fn(() => null);
  });

  it('clears working hours when bothEmpty and stores weekly hours', async () => {
    const { persistWorkingHours } = await importFreshSettings();
    localStorage.setItem(
      'redmine_calendar_working_hours',
      JSON.stringify({ start: '1', end: '2' })
    );
    persistWorkingHours(true, '', '', 40);
    expect(localStorage.getItem('redmine_calendar_working_hours')).toBeNull();
    expect(localStorage.getItem('redmine_calendar_weekly_hours')).toBe('40');
  });

  it('writes working hours when filled and leaves weekly untouched when null', async () => {
    const { persistWorkingHours } = await importFreshSettings();
    persistWorkingHours(false, '08:00', '17:00', null);
    expect(localStorage.getItem('redmine_calendar_working_hours')).toBe(
      JSON.stringify({ start: '08:00', end: '17:00' })
    );
    expect(localStorage.getItem('redmine_calendar_weekly_hours')).toBeNull();
  });
});

describe('credential-field helpers', () => {
  beforeEach(() => localStorage.clear());

  it('getAuthType + readCredsFromForm reflect the checked radio + inputs', async () => {
    const { getAuthType, readCredsFromForm } = await importFreshSettings();
    installDoc();
    const els = {
      apiKeyInput: makeEl({ value: ' key ' }),
      usernameInput: makeEl({ value: ' u ' }),
      passwordInput: makeEl({ value: 'pw' }),
    };
    expect(getAuthType()).toBe('apikey');
    expect(readCredsFromForm(els)).toEqual({
      authType: 'apikey',
      apiKey: 'key',
      username: 'u',
      password: 'pw',
    });
  });

  it('hasRequiredCreds enforces the active method', async () => {
    const { hasRequiredCreds } = await importFreshSettings();
    const { radios } = installDoc();
    const els = {
      apiKeyInput: makeEl({ value: '' }),
      usernameInput: makeEl({ value: 'u' }),
      passwordInput: makeEl({ value: 'p' }),
    };
    expect(hasRequiredCreds(els)).toBe(false); // apikey empty
    radios[0].checked = false;
    radios[1].checked = true; // basic
    expect(hasRequiredCreds(els)).toBe(true);
  });

  it('updateAuthFields toggles the field groups', async () => {
    const { updateAuthFields } = await importFreshSettings();
    const { radios } = installDoc();
    const els = { fieldApiKey: makeEl(), fieldBasic: makeEl() };
    updateAuthFields(els);
    expect(els.fieldApiKey.classList.contains('hidden')).toBe(false);
    expect(els.fieldBasic.classList.contains('hidden')).toBe(true);
    radios[0].checked = false;
    radios[1].checked = true;
    updateAuthFields(els);
    expect(els.fieldApiKey.classList.contains('hidden')).toBe(true);
    expect(els.fieldBasic.classList.contains('hidden')).toBe(false);
  });

  it('fillCredentialFields populates inputs and selects the auth radio', async () => {
    const { fillCredentialFields } = await importFreshSettings();
    const { radios } = installDoc();
    const els = { apiKeyInput: makeEl(), usernameInput: makeEl(), passwordInput: makeEl() };
    fillCredentialFields(els, { authType: 'basic', username: 'bob', password: 'pw' });
    expect(els.usernameInput.value).toBe('bob');
    expect(radios[1].checked).toBe(true);
  });
});

describe('loadInitialSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    window.location.href = '';
  });

  it('shows the config error and hides sections + footer when config load fails', async () => {
    const { loadInitialSettings, resetCentralConfigCache } = await importFreshSettings();
    resetCentralConfigCache();
    const configErrorEl = makeEl();
    const section = makeEl();
    const footer = makeEl();
    installDoc({ sections: [section], stickyFooter: footer });
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const res = await loadInitialSettings({ configErrorEl }, vi.fn());
    expect(res.ok).toBe(false);
    expect(configErrorEl.classList.contains('hidden')).toBe(false);
    expect(section.classList.contains('hidden')).toBe(true);
    expect(footer.classList.contains('hidden')).toBe(true);
  });

  it('prefills working hours + shows the first-time banner when no creds exist', async () => {
    const { loadInitialSettings, resetCentralConfigCache } = await importFreshSettings();
    resetCentralConfigCache();
    localStorage.setItem(
      'redmine_calendar_working_hours',
      JSON.stringify({ start: '08:00', end: '17:00' })
    );
    const redmineLink = makeEl();
    const weeklyInput = makeEl();
    installDoc({ ids: { 'redmine-account-link': redmineLink, weeklyHours: weeklyInput } });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          redmineUrl: 'http://x',
          redmineServerUrl: 'https://redmine.example.com',
        }),
    });
    const els = {
      apiKeyInput: makeEl(),
      usernameInput: makeEl(),
      passwordInput: makeEl(),
      fieldApiKey: makeEl(),
      fieldBasic: makeEl(),
      workStartInput: makeEl(),
      workEndInput: makeEl(),
      firstTimeBanner: makeEl(),
    };
    const res = await loadInitialSettings(els, vi.fn());
    expect(res).toEqual({ ok: true, hasCreds: false });
    expect(redmineLink.href).toBe('https://redmine.example.com/my/account');
    expect(els.firstTimeBanner.classList.contains('hidden')).toBe(false);
    expect(els.workStartInput.value).toBe('08:00');
    expect(weeklyInput.value).toBe('40');
  });

  it('prefills stored credentials and reports hasCreds=true', async () => {
    // Pre-write credentials in a first import, then load with a fresh DOM.
    {
      const fresh = await importFreshSettings();
      await fresh.writeCredentials({ authType: 'apikey', apiKey: 'pre-existing' });
    }
    const { loadInitialSettings, resetCentralConfigCache } = await importFreshSettings();
    resetCentralConfigCache();
    installDoc({ ids: { weeklyHours: makeEl() } });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ redmineUrl: 'http://x' }),
    });
    const els = {
      apiKeyInput: makeEl(),
      usernameInput: makeEl(),
      passwordInput: makeEl(),
      fieldApiKey: makeEl(),
      fieldBasic: makeEl(),
      workStartInput: makeEl(),
      workEndInput: makeEl(),
      firstTimeBanner: makeEl(),
    };
    const res = await loadInitialSettings(els, vi.fn());
    expect(res.hasCreds).toBe(true);
    expect(els.apiKeyInput.value).toBe('pre-existing');
  });

  it('clears creds + reports a decrypt error when stored creds are corrupt', async () => {
    const { loadInitialSettings, resetCentralConfigCache } = await importFreshSettings();
    resetCentralConfigCache();
    localStorage.setItem('redmine_calendar_credentials', '!!!not-json!!!');
    installDoc({ ids: { weeklyHours: makeEl() } });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ redmineUrl: 'http://x' }),
    });
    const showError = vi.fn();
    const els = {
      apiKeyInput: makeEl(),
      usernameInput: makeEl(),
      passwordInput: makeEl(),
      fieldApiKey: makeEl(),
      fieldBasic: makeEl(),
      workStartInput: makeEl(),
      workEndInput: makeEl(),
      firstTimeBanner: makeEl(),
    };
    await loadInitialSettings(els, showError);
    expect(showError).toHaveBeenCalled();
    expect(localStorage.getItem('redmine_calendar_credentials')).toBeNull();
  });
});
