import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('getVersion', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Reset cached version by re-importing
    vi.resetModules();
  });

  it('returns "dev" when version.json is not found', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const { getVersion: gv } = await import('../../js/version.js');
    const version = await gv();
    expect(version).toBe('dev');
  });

  it('returns version from version.json when available', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: '1.2.3' }),
    });
    const { getVersion: gv } = await import('../../js/version.js');
    const version = await gv();
    expect(version).toBe('1.2.3');
  });
});
