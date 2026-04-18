import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getVersion, resetVersionCache } from '../../js/version.js';

describe('getVersion', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetVersionCache();
  });

  it('returns "dev" when version.json is not found', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const version = await getVersion();
    expect(version).toBe('dev');
  });

  it('returns version from version.json when available', async () => {
    resetVersionCache();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: '1.2.3' }),
    });
    const version = await getVersion();
    expect(version).toBe('1.2.3');
  });
});
