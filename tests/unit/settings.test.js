import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readWorkingHours, writeWorkingHours, clearWorkingHours,
         loadCentralConfig, resetCentralConfigCache,
         readCredentials, writeCredentials, clearCredentials,
         redirectToSettingsIfMissing } from '../../js/settings.js';

describe('working hours', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('readWorkingHours returns null when not set', () => {
    expect(readWorkingHours()).toBeNull();
  });

  it('writeWorkingHours + readWorkingHours round-trip', () => {
    writeWorkingHours('08:00', '17:00');
    const result = readWorkingHours();
    expect(result).toEqual({ start: '08:00', end: '17:00' });
  });

  it('clearWorkingHours removes stored value', () => {
    writeWorkingHours('09:00', '18:00');
    clearWorkingHours();
    expect(readWorkingHours()).toBeNull();
  });
});

describe('loadCentralConfig', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetCentralConfigCache();
  });

  it('fetches and returns config.json', async () => {
    const mockConfig = { redmineUrl: 'http://localhost:8010/proxy', redmineServerUrl: 'https://redmine.test.com' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockConfig),
    });

    const result = await loadCentralConfig();
    expect(result.redmineUrl).toBe('http://localhost:8010/proxy');
  });

  it('throws on 404', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(loadCentralConfig()).rejects.toThrow();
  });
});

describe('readCredentials', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no stored credentials', async () => {
    const result = await readCredentials();
    expect(result).toBeNull();
  });

  it('returns null if apiKey is empty for apikey authType', async () => {
    await writeCredentials({ authType: 'apikey', apiKey: '' });
    const result = await readCredentials();
    expect(result).toBeNull();
  });

  it('returns credentials object with authType and apiKey for valid apikey data', async () => {
    await writeCredentials({ authType: 'apikey', apiKey: 'abc123' });
    const result = await readCredentials();
    expect(result).toEqual(expect.objectContaining({
      authType: 'apikey',
      apiKey: 'abc123',
    }));
  });

  it('returns credentials with username/password for basic auth', async () => {
    await writeCredentials({ authType: 'basic', username: 'admin', password: 's3cret' });
    const result = await readCredentials();
    expect(result).toEqual(expect.objectContaining({
      authType: 'basic',
      username: 'admin',
      password: 's3cret',
    }));
  });

  it('throws on decrypt failure (corrupted localStorage data)', async () => {
    localStorage.setItem('redmine_calendar_credentials', '!!!not-json!!!');
    await expect(readCredentials()).rejects.toThrow();
  });
});

describe('writeCredentials', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores encrypted envelope in localStorage', async () => {
    await writeCredentials({ authType: 'apikey', apiKey: 'test-key' });
    const raw = localStorage.getItem('redmine_calendar_credentials');
    expect(raw).not.toBeNull();
    const envelope = JSON.parse(raw);
    expect(envelope).toHaveProperty('iv');
    expect(envelope).toHaveProperty('ciphertext');
    // Ciphertext should not contain the plaintext apiKey
    expect(envelope.ciphertext).not.toContain('test-key');
  });

  it('round-trip: write then read returns same data', async () => {
    const creds = { authType: 'apikey', apiKey: 'round-trip-key', username: '', password: '' };
    await writeCredentials(creds);
    const result = await readCredentials();
    expect(result.authType).toBe('apikey');
    expect(result.apiKey).toBe('round-trip-key');
  });
});

describe('clearCredentials', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes credentials from localStorage', async () => {
    await writeCredentials({ authType: 'apikey', apiKey: 'to-be-cleared' });
    expect(localStorage.getItem('redmine_calendar_credentials')).not.toBeNull();
    clearCredentials();
    expect(localStorage.getItem('redmine_calendar_credentials')).toBeNull();
  });

  it('readCredentials returns null after clearCredentials', async () => {
    await writeCredentials({ authType: 'apikey', apiKey: 'to-be-cleared' });
    clearCredentials();
    const result = await readCredentials();
    expect(result).toBeNull();
  });
});

describe('redirectToSettingsIfMissing', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    resetCentralConfigCache();
    window.location.href = '';
  });

  it('redirects to settings.html when config.json fails to load', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await redirectToSettingsIfMissing();
    expect(window.location.href).toBe('settings.html');
  });

  it('redirects to settings.html when no credentials are stored', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ redmineUrl: 'http://localhost:8010/proxy' }),
    });
    await redirectToSettingsIfMissing();
    expect(window.location.href).toBe('settings.html');
  });

  it('does not redirect when config and credentials are present', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ redmineUrl: 'http://localhost:8010/proxy' }),
    });
    await writeCredentials({ authType: 'apikey', apiKey: 'valid-key' });
    await redirectToSettingsIfMissing();
    expect(window.location.href).not.toBe('settings.html');
  });
});
