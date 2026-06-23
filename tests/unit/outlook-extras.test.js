import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Tests in this file cover the Outlook auth + Graph fetch paths that the
// main outlook.test.js leaves uncovered:
//   - isOutlookConfigured (false branch)
//   - isDemoMode + generateDemoEvents
//   - getMsalInstance (clientId only, with tenantId, missing config)
//   - acquireToken (silent ok, silent fail → popup, not configured)
//   - fetchCalendarEvents (demo mode, success, error, defaults)
//
// MSAL is exposed on globalThis as `msal` because js/outlook.js refers to the
// bare `msal` identifier (assumed to be loaded via CDN <script>).

let mockedConfig;

const settingsMock = vi.hoisted(() => ({ getCentralConfigSync: vi.fn() }));
vi.mock('../../js/settings.js', () => ({
  readWeeklyHours: vi.fn(() => 40),
  readWorkingHours: vi.fn(() => ({ start: '09:00', end: '17:00' })),
}));

vi.mock('../../js/config-store.js', () => ({
  getCentralConfigSync: settingsMock.getCentralConfigSync,
}));

vi.mock('../../js/i18n.js', () => ({
  t: vi.fn((key, vars) => (vars?.message ? `${key}:${vars.message}` : key)),
  locale: 'en',
}));

const PCA_INSTANCES = [];

class FakePCA {
  constructor(config) {
    this.config = config;
    this.accounts = [];
    this.silentResult = { accessToken: 'silent-token' };
    this.popupResult = { accessToken: 'popup-token' };
    this.silentShouldThrow = false;
    this.popupShouldThrow = false;
    this.silentCalls = 0;
    this.popupCalls = 0;
    PCA_INSTANCES.push(this);
  }
  getAllAccounts() {
    return this.accounts;
  }
  async acquireTokenSilent(req) {
    this.silentCalls++;
    this.lastSilentReq = req;
    if (this.silentShouldThrow) throw new Error('silent failed');
    return this.silentResult;
  }
  async acquireTokenPopup(req) {
    this.popupCalls++;
    this.lastPopupReq = req;
    if (this.popupShouldThrow) throw new Error('popup failed');
    return this.popupResult;
  }
}

beforeEach(() => {
  PCA_INSTANCES.length = 0;
  mockedConfig = { azureClientId: 'test-client-id' };
  settingsMock.getCentralConfigSync.mockImplementation(() => mockedConfig);

  // Provide window.location for MSAL config and a fresh msal global per test.
  global.window = {
    location: {
      href: 'http://localhost:3000/index.html',
      origin: 'http://localhost:3000',
      pathname: '/index.html',
    },
  };
  globalThis.msal = { PublicClientApplication: FakePCA };

  // Deterministic system time (tests aren't time-sensitive but matches harness).
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-09T10:00:00Z'));

  // Reset fetch mock
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
});

async function loadFresh() {
  // Force a fresh module load so the module-level _msalInstance cache resets.
  vi.resetModules();
  return await import('../../js/outlook.js');
}

describe('isOutlookConfigured (false branches)', () => {
  it('returns false when config is null', async () => {
    settingsMock.getCentralConfigSync.mockReturnValue(null);
    const mod = await loadFresh();
    expect(mod.isOutlookConfigured()).toBe(false);
  });

  it('returns false when azureClientId is empty string', async () => {
    settingsMock.getCentralConfigSync.mockReturnValue({ azureClientId: '' });
    const mod = await loadFresh();
    expect(mod.isOutlookConfigured()).toBe(false);
  });

  it('returns false when azureClientId is undefined', async () => {
    settingsMock.getCentralConfigSync.mockReturnValue({});
    const mod = await loadFresh();
    expect(mod.isOutlookConfigured()).toBe(false);
  });
});

describe('fetchCalendarEvents — demo mode', () => {
  it('returns generated demo events when azureClientId === "demo"', async () => {
    settingsMock.getCentralConfigSync.mockReturnValue({ azureClientId: 'demo' });
    const mod = await loadFresh();
    // Use today so the date-keyed stub returns the full today set
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const events = await mod.fetchCalendarEvents(today);
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(5);
    // Spot check shape + date interpolation
    const standup = events.find((e) => e.subject === 'Daily Standup #2097');
    expect(standup).toBeDefined();
    expect(standup.start).toBe(`${today}T09:00:00`);
    expect(standup.end).toBe(`${today}T09:15:00`);
    expect(standup.isAllDay).toBe(false);
    expect(standup.showAs).toBe('busy');
    const allDay = events.find((e) => e.isAllDay);
    expect(allDay).toBeDefined();
    expect(allDay.start.startsWith(`${today}T`)).toBe(true);
    // Demo mode must NOT call fetch
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('getMsalInstance (via acquireToken)', () => {
  it('builds MSAL with common authority when no tenantId is present', async () => {
    settingsMock.getCentralConfigSync.mockReturnValue({ azureClientId: 'cid-1' });
    const mod = await loadFresh();
    await mod.acquireToken();
    expect(PCA_INSTANCES).toHaveLength(1);
    expect(PCA_INSTANCES[0].config.auth.clientId).toBe('cid-1');
    expect(PCA_INSTANCES[0].config.auth.authority).toBe('https://login.microsoftonline.com/common');
    expect(PCA_INSTANCES[0].config.auth.redirectUri).toBe('http://localhost:3000/index.html');
    expect(PCA_INSTANCES[0].config.cache.cacheLocation).toBe('localStorage');
  });

  it('uses tenant-scoped authority when azureTenantId is set', async () => {
    settingsMock.getCentralConfigSync.mockReturnValue({
      azureClientId: 'cid-2',
      azureTenantId: 'tenant-xyz',
    });
    const mod = await loadFresh();
    await mod.acquireToken();
    expect(PCA_INSTANCES[0].config.auth.authority).toBe(
      'https://login.microsoftonline.com/tenant-xyz'
    );
  });

  it('caches the MSAL instance across calls (only one PCA constructed)', async () => {
    settingsMock.getCentralConfigSync.mockReturnValue({ azureClientId: 'cid-cache' });
    const mod = await loadFresh();
    await mod.acquireToken();
    await mod.acquireToken();
    await mod.acquireToken();
    expect(PCA_INSTANCES).toHaveLength(1);
  });
});

describe('acquireToken', () => {
  it('throws "outlook.not_configured" when no azureClientId is configured', async () => {
    settingsMock.getCentralConfigSync.mockReturnValue({});
    const mod = await loadFresh();
    await expect(mod.acquireToken()).rejects.toThrow('outlook.not_configured');
  });

  it('returns silent token when no accounts exist (omits account on request)', async () => {
    settingsMock.getCentralConfigSync.mockReturnValue({ azureClientId: 'cid' });
    const mod = await loadFresh();
    const token = await mod.acquireToken();
    expect(token).toBe('silent-token');
    const pca = PCA_INSTANCES[0];
    expect(pca.silentCalls).toBe(1);
    expect(pca.popupCalls).toBe(0);
    expect(pca.lastSilentReq.account).toBeUndefined();
    expect(pca.lastSilentReq.scopes).toEqual(['Calendars.Read']);
  });

  it('passes the first account when getAllAccounts returns one', async () => {
    settingsMock.getCentralConfigSync.mockReturnValue({ azureClientId: 'cid' });
    await loadFresh();
    // Mutate the eventually-cached instance: build it first, then add account before call.
    // Since instance is created lazily inside acquireToken, we override after the
    // constructor runs by capturing it via our PCA_INSTANCES list.
    // Trick: monkey-patch FakePCA so the constructor seeds an account.
    const account = { username: 'u@example.com' };
    const OriginalPCA = globalThis.msal.PublicClientApplication;
    globalThis.msal.PublicClientApplication = class extends OriginalPCA {
      constructor(c) {
        super(c);
        this.accounts = [account];
      }
    };
    // Force fresh load again so getMsalInstance picks up the new class.
    const mod2 = await loadFresh();
    await mod2.acquireToken();
    const pca = PCA_INSTANCES[PCA_INSTANCES.length - 1];
    expect(pca.lastSilentReq.account).toBe(account);
  });

  it('falls back to popup when silent acquisition throws', async () => {
    settingsMock.getCentralConfigSync.mockReturnValue({ azureClientId: 'cid' });
    const OriginalPCA = globalThis.msal.PublicClientApplication;
    globalThis.msal.PublicClientApplication = class extends OriginalPCA {
      constructor(c) {
        super(c);
        this.silentShouldThrow = true;
        this.popupResult = { accessToken: 'fallback-popup-token' };
      }
    };
    const mod = await loadFresh();
    const token = await mod.acquireToken();
    expect(token).toBe('fallback-popup-token');
    const pca = PCA_INSTANCES[PCA_INSTANCES.length - 1];
    expect(pca.silentCalls).toBe(1);
    expect(pca.popupCalls).toBe(1);
  });

  it('propagates popup errors when both silent and popup fail', async () => {
    settingsMock.getCentralConfigSync.mockReturnValue({ azureClientId: 'cid' });
    const OriginalPCA = globalThis.msal.PublicClientApplication;
    globalThis.msal.PublicClientApplication = class extends OriginalPCA {
      constructor(c) {
        super(c);
        this.silentShouldThrow = true;
        this.popupShouldThrow = true;
      }
    };
    const mod = await loadFresh();
    await expect(mod.acquireToken()).rejects.toThrow('popup failed');
  });
});

describe('fetchCalendarEvents — Graph API', () => {
  beforeEach(() => {
    settingsMock.getCentralConfigSync.mockReturnValue({ azureClientId: 'cid' });
  });

  it('builds the correct calendarView URL and returns mapped events', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        value: [
          {
            subject: 'Standup #1',
            start: { dateTime: '2026-05-08T09:00:00.0000000' },
            end: { dateTime: '2026-05-08T09:15:00.0000000' },
            isAllDay: false,
            sensitivity: 'normal',
            showAs: 'busy',
          },
        ],
      }),
    });
    const mod = await loadFresh();
    const events = await mod.fetchCalendarEvents('2026-05-08');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      subject: 'Standup #1',
      start: '2026-05-08T09:00:00.0000000',
      end: '2026-05-08T09:15:00.0000000',
      isAllDay: false,
      sensitivity: 'normal',
      showAs: 'busy',
    });
    // URL + headers assertions
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toContain('https://graph.microsoft.com/v1.0/me/calendarView');
    expect(url).toContain(encodeURIComponent('2026-05-08T00:00:00.000Z'));
    expect(url).toContain(encodeURIComponent('2026-05-08T23:59:59.999Z'));
    expect(url).toContain('$select=subject');
    expect(url).toContain('$top=50');
    expect(url).toContain('$orderby=start/dateTime');
    expect(init.headers.Authorization).toBe('Bearer silent-token');
  });

  it('applies defaults when Graph payload omits optional fields', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        value: [
          // Completely empty event; map() should fill every default.
          {},
          // Partial event with explicit nulls / missing nested dateTime
          { subject: 'Partial', start: {}, end: null },
        ],
      }),
    });
    const mod = await loadFresh();
    const events = await mod.fetchCalendarEvents('2026-05-08');
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({
      subject: '',
      start: '',
      end: '',
      isAllDay: false,
      sensitivity: 'normal',
      showAs: 'busy',
    });
    expect(events[1]).toEqual({
      subject: 'Partial',
      start: '',
      end: '',
      isAllDay: false,
      sensitivity: 'normal',
      showAs: 'busy',
    });
  });

  it('returns empty list when Graph response has no value array', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    const mod = await loadFresh();
    const events = await mod.fetchCalendarEvents('2026-05-08');
    expect(events).toEqual([]);
  });

  it('throws localized fetch error when Graph returns non-OK', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const mod = await loadFresh();
    await expect(mod.fetchCalendarEvents('2026-05-08')).rejects.toThrow(
      'outlook.fetch_error:HTTP 500'
    );
  });

  it('propagates auth failure when token cannot be acquired', async () => {
    settingsMock.getCentralConfigSync.mockReturnValue({}); // not configured
    const mod = await loadFresh();
    await expect(mod.fetchCalendarEvents('2026-05-08')).rejects.toThrow('outlook.not_configured');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ── T010: isMsalSignedIn ───────────────────────────────────────────

describe('isMsalSignedIn', () => {
  it('returns false when no accounts are signed in', async () => {
    const mod = await loadFresh();
    await mod.acquireToken().catch(() => {}); // initialise MSAL instance
    const pca = PCA_INSTANCES[PCA_INSTANCES.length - 1];
    pca.accounts = [];
    expect(mod.isMsalSignedIn()).toBe(false);
  });

  it('returns true when at least one account is signed in', async () => {
    const mod = await loadFresh();
    await mod.acquireToken();
    const pca = PCA_INSTANCES[PCA_INSTANCES.length - 1];
    pca.accounts = [{ homeAccountId: 'user1' }];
    expect(mod.isMsalSignedIn()).toBe(true);
  });

  it('returns false when Outlook is not configured (no MSAL instance)', async () => {
    settingsMock.getCentralConfigSync.mockReturnValue({});
    const mod = await loadFresh();
    expect(mod.isMsalSignedIn()).toBe(false);
  });
});
