import { describe, it, expect, vi, afterEach } from 'vitest';

async function loadFreshApi() {
  vi.resetModules();
  vi.doMock('../../js/config-store.js', () => ({
    getCentralConfigSync: vi.fn(() => ({ redmineUrl: 'http://mock-proxy' })),
    readCredentials: vi.fn(async () => ({ authType: 'apikey', apiKey: 'k' })),
    loadCentralConfig: vi.fn(),
    resetCentralConfigCache: vi.fn(),
    readWorkingHours: vi.fn(() => null),
    writeWorkingHours: vi.fn(),
    clearWorkingHours: vi.fn(),
    writeCredentials: vi.fn(),
    clearCredentials: vi.fn(),
    redirectToSettingsIfMissing: vi.fn(),
    invalidateCredentialsCache: vi.fn(),
  }));
  vi.doMock('../../js/i18n.js', () => ({
    t: vi.fn((key) => key),
    locale: 'en',
    formatDate: vi.fn((d) => d),
  }));
  global.fetch = vi.fn();
  const api = await import('../../js/redmine-api.js');
  api.invalidateCredentialsCache();
  return api;
}

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    text: async () => JSON.stringify(payload),
  };
}

afterEach(() => vi.restoreAllMocks());

describe('fetchIssueStatus', () => {
  it('returns { is_closed: true } for a closed issue', async () => {
    const api = await loadFreshApi();
    global.fetch.mockResolvedValue(
      jsonResponse({ issue: { id: 1, status: { name: 'Closed', is_closed: true } } })
    );
    const result = await api.fetchIssueStatus(1);
    expect(result).toEqual({ is_closed: true });
  });

  it('returns { is_closed: false } for an open issue', async () => {
    const api = await loadFreshApi();
    global.fetch.mockResolvedValue(
      jsonResponse({ issue: { id: 2, status: { name: 'In Progress', is_closed: false } } })
    );
    const result = await api.fetchIssueStatus(2);
    expect(result).toEqual({ is_closed: false });
  });

  it('returns null on network error', async () => {
    const api = await loadFreshApi();
    global.fetch.mockRejectedValue(new Error('network fail'));
    const result = await api.fetchIssueStatus(99);
    expect(result).toBeNull();
  });

  it('returns null when is_closed field is absent from response', async () => {
    const api = await loadFreshApi();
    global.fetch.mockResolvedValue(jsonResponse({ issue: { id: 3, status: { name: 'Open' } } }));
    const result = await api.fetchIssueStatus(3);
    expect(result).toBeNull();
  });

  it('returns null on 404', async () => {
    const api = await loadFreshApi();
    global.fetch.mockResolvedValue(jsonResponse({}, 404));
    const result = await api.fetchIssueStatus(404);
    expect(result).toBeNull();
  });
});

describe('fetchIssueStatuses', () => {
  it('returns Map with is_closed values from batch response', async () => {
    const api = await loadFreshApi();
    global.fetch.mockResolvedValue(
      jsonResponse({
        issues: [
          { id: 1, status: { is_closed: false } },
          { id: 2, status: { is_closed: true } },
        ],
      })
    );
    const map = await api.fetchIssueStatuses([1, 2]);
    expect(map.get(1)).toBe(false);
    expect(map.get(2)).toBe(true);
    expect(map.size).toBe(2);
  });

  it('returns empty Map on network error', async () => {
    const api = await loadFreshApi();
    global.fetch.mockRejectedValue(new Error('network fail'));
    const map = await api.fetchIssueStatuses([1, 2]);
    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(0);
  });

  it('returns empty Map for empty input', async () => {
    const api = await loadFreshApi();
    const map = await api.fetchIssueStatuses([]);
    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('omits entries where is_closed is not boolean', async () => {
    const api = await loadFreshApi();
    global.fetch.mockResolvedValue(
      jsonResponse({
        issues: [
          { id: 1, status: { is_closed: true } },
          { id: 2, status: {} },
          { id: 3, status: { is_closed: false } },
        ],
      })
    );
    const map = await api.fetchIssueStatuses([1, 2, 3]);
    expect(map.has(1)).toBe(true);
    expect(map.has(2)).toBe(false);
    expect(map.has(3)).toBe(true);
  });

  it('treats missing issue IDs (deleted) as absent from Map (caller skips gate)', async () => {
    const api = await loadFreshApi();
    global.fetch.mockResolvedValue(
      jsonResponse({ issues: [{ id: 1, status: { is_closed: false } }] })
    );
    const map = await api.fetchIssueStatuses([1, 999]);
    expect(map.has(999)).toBe(false);
    expect(map.has(1)).toBe(true);
  });
});
