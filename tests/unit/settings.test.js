// @ts-check
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock crypto + config-store so writeCredentials is unit-testable in isolation.
vi.mock('../../js/crypto.js', () => ({
  encrypt: vi.fn(async (s) => `enc:${s}`),
  decrypt: vi.fn(async (s) => s.replace(/^enc:/, '')),
}));

const setConfigMock = vi.fn();
vi.mock('../../js/config-store.js', () => ({
  setConfig: (...args) => setConfigMock(...args),
}));

import {
  writeWorkingHours,
  readWorkingHours,
  writeCredentials,
  normalizeRedmineUrl,
} from '../../js/settings.js';

beforeEach(() => {
  localStorage.clear();
  setConfigMock.mockClear();
});

describe('settings persistence', () => {
  it('round-trips working hours', () => {
    writeWorkingHours({ start: '08:00', end: '17:00' });
    expect(readWorkingHours()).toEqual({ start: '08:00', end: '17:00' });
  });

  it('writes encrypted credentials', async () => {
    await writeCredentials({ redmineUrl: 'https://r.example.com', apiKey: 'k' });
    expect(setConfigMock).toHaveBeenCalledWith({
      redmineUrl: 'https://r.example.com',
      apiKey: 'k',
    });
  });
});

describe('normalizeRedmineUrl', () => {
  it('accepts a clean https URL unchanged', () => {
    expect(normalizeRedmineUrl('https://redmine.example.com')).toEqual({
      url: 'https://redmine.example.com',
      normalized: false,
    });
  });

  it('prepends https:// when no scheme is present', () => {
    expect(normalizeRedmineUrl('redmine.example.com')).toEqual({
      url: 'https://redmine.example.com',
      normalized: true,
    });
  });

  it('strips trailing slashes', () => {
    expect(normalizeRedmineUrl('https://redmine.example.com/')).toEqual({
      url: 'https://redmine.example.com',
      normalized: true,
    });
    expect(normalizeRedmineUrl('https://redmine.example.com///')).toEqual({
      url: 'https://redmine.example.com',
      normalized: true,
    });
  });

  it('preserves an explicit http scheme', () => {
    expect(normalizeRedmineUrl('http://intranet.local')).toEqual({
      url: 'http://intranet.local',
      normalized: false,
    });
  });

  it('keeps a sub-path but flags it as normalized (warn, do not strip)', () => {
    expect(normalizeRedmineUrl('https://redmine.example.com/projects')).toEqual({
      url: 'https://redmine.example.com/projects',
      normalized: true,
    });
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeRedmineUrl('  https://redmine.example.com  ')).toEqual({
      url: 'https://redmine.example.com',
      normalized: false,
    });
  });

  it('rejects empty input', () => {
    expect(() => normalizeRedmineUrl('')).toThrow();
    expect(() => normalizeRedmineUrl('   ')).toThrow();
  });

  it('rejects non-http(s) schemes', () => {
    expect(() => normalizeRedmineUrl('ftp://redmine.example.com')).toThrow();
    expect(() => normalizeRedmineUrl('javascript:alert(1)')).toThrow();
  });

  it('rejects unparseable input', () => {
    expect(() => normalizeRedmineUrl('http://')).toThrow();
  });
});

describe('writeCredentials URL handling', () => {
  it('normalizes the stored URL and reports normalization', async () => {
    const result = await writeCredentials({
      redmineUrl: 'redmine.example.com/',
      apiKey: 'k',
    });
    expect(result).toEqual({
      url: 'https://redmine.example.com',
      normalized: true,
    });
    expect(setConfigMock).toHaveBeenCalledWith({
      redmineUrl: 'https://redmine.example.com',
      apiKey: 'k',
    });
  });

  it('throws on a malformed URL before persisting', async () => {
    await expect(writeCredentials({ redmineUrl: 'ftp://nope', apiKey: 'k' })).rejects.toThrow();
    expect(setConfigMock).not.toHaveBeenCalled();
  });

  it('throws when credentials are missing', async () => {
    await expect(writeCredentials({ redmineUrl: '', apiKey: 'k' })).rejects.toThrow(
      'Missing credentials'
    );
  });
});
