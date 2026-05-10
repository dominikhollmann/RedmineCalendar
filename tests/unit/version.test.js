import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getVersion, resetVersionCache, displayVersion } from '../../js/version.js';

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

  it('falls back to "dev" when version field is missing in JSON', async () => {
    resetVersionCache();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    const version = await getVersion();
    expect(version).toBe('dev');
  });

  it('returns cached version on subsequent calls without re-fetching', async () => {
    resetVersionCache();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: '9.9.9' }),
    });
    global.fetch = fetchMock;
    expect(await getVersion()).toBe('9.9.9');
    expect(await getVersion()).toBe('9.9.9');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns "dev" when fetch rejects', async () => {
    resetVersionCache();
    global.fetch = vi.fn().mockRejectedValue(new Error('network'));
    const version = await getVersion();
    expect(version).toBe('dev');
  });
});

describe('displayVersion', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetVersionCache();
  });

  it('returns silently when element is null', async () => {
    await expect(displayVersion(null)).resolves.toBeUndefined();
  });

  it('returns silently when element is undefined', async () => {
    await expect(displayVersion(undefined)).resolves.toBeUndefined();
  });

  it('writes "<label>: <version>" to element.textContent', async () => {
    resetVersionCache();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: '4.2.0' }),
    });
    const el = { textContent: '' };
    await displayVersion(el);
    expect(el.textContent).toMatch(/4\.2\.0$/);
    expect(el.textContent).toMatch(/:\s/);
  });

  it('writes "dev" when fetch fails', async () => {
    resetVersionCache();
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const el = { textContent: '' };
    await displayVersion(el);
    expect(el.textContent).toMatch(/dev$/);
  });
});
