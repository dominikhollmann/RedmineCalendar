import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readWorkingHours, writeWorkingHours, clearWorkingHours,
         loadCentralConfig, resetCentralConfigCache } from '../../js/settings.js';

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
