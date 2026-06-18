// T004: Unit tests for stampClosedStatus — written before T005 implementation.
// These tests MUST FAIL until T005 adds the export to redmine-api.js.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../js/config-store.js', () => ({
  getCentralConfigSync: vi.fn(() => ({ redmineUrl: 'http://mock-proxy' })),
  readCredentials: vi.fn(async () => ({ authType: 'apikey', apiKey: 'k' })),
}));
vi.mock('../../js/i18n.js', () => ({
  t: vi.fn((key) => key),
  locale: 'en',
}));

async function loadFreshApi() {
  vi.resetModules();
  vi.doMock('../../js/config-store.js', () => ({
    getCentralConfigSync: vi.fn(() => ({ redmineUrl: 'http://mock-proxy' })),
    readCredentials: vi.fn(async () => ({ authType: 'apikey', apiKey: 'k' })),
  }));
  vi.doMock('../../js/i18n.js', () => ({
    t: vi.fn((key) => key),
    locale: 'en',
  }));
  global.fetch = vi.fn();
  const api = await import('../../js/redmine-api.js');
  api.invalidateCredentialsCache();
  return api;
}

function issueResponse(id, isClosed) {
  return {
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({
        issue: {
          id,
          subject: `Issue ${id}`,
          status: { id: isClosed ? 5 : 1, name: isClosed ? 'Closed' : 'Open', is_closed: isClosed },
          project: { id: 1, name: 'Test', identifier: 'test' },
        },
      }),
  };
}

describe('stampClosedStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stamps is_closed=true for a closed ticket', async () => {
    const api = await loadFreshApi();
    global.fetch.mockResolvedValueOnce(issueResponse(42, true));
    const proposals = [{ ticketId: 42 }];
    await api.stampClosedStatus(proposals);
    expect(proposals[0].is_closed).toBe(true);
  });

  it('stamps is_closed=false for an open ticket', async () => {
    const api = await loadFreshApi();
    global.fetch.mockResolvedValueOnce(issueResponse(10, false));
    const proposals = [{ ticketId: 10 }];
    await api.stampClosedStatus(proposals);
    expect(proposals[0].is_closed).toBe(false);
  });

  it('deduplicates: same ticket ID across two proposals fetched once', async () => {
    const api = await loadFreshApi();
    global.fetch.mockResolvedValueOnce(issueResponse(5, true));
    const proposals = [{ ticketId: 5 }, { ticketId: 5 }];
    await api.stampClosedStatus(proposals);
    // fetchIssueStatuses dedups — fetch called exactly once for ticket 5
    const issueCalls = global.fetch.mock.calls.filter((c) => c[0].includes('/issues/5.json'));
    expect(issueCalls.length).toBe(1);
    expect(proposals[0].is_closed).toBe(true);
    expect(proposals[1].is_closed).toBe(true);
  });

  it('skips proposals with ticketId=null (does not stamp is_closed)', async () => {
    const api = await loadFreshApi();
    const proposals = [{ ticketId: null }];
    await api.stampClosedStatus(proposals);
    expect(proposals[0].is_closed).toBeUndefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('defaults is_closed to false when API returns null (transient failure)', async () => {
    const api = await loadFreshApi();
    // Simulate a network error → fetchIssueStatuses skips that ID
    global.fetch.mockRejectedValueOnce(new TypeError('network'));
    // The api has retry logic — fast-forward by making all retries fail
    global.fetch.mockRejectedValueOnce(new TypeError('network'));
    global.fetch.mockRejectedValueOnce(new TypeError('network'));
    const proposals = [{ ticketId: 7 }];
    await api.stampClosedStatus(proposals);
    // map.get(7) is undefined → ?? false → is_closed = false
    expect(proposals[0].is_closed).toBe(false);
  });

  it('handles mixed proposals: some with tickets, some without', async () => {
    const api = await loadFreshApi();
    global.fetch.mockResolvedValueOnce(issueResponse(1, false));
    global.fetch.mockResolvedValueOnce(issueResponse(2, true));
    const proposals = [{ ticketId: null }, { ticketId: 1 }, { ticketId: 2 }];
    await api.stampClosedStatus(proposals);
    expect(proposals[0].is_closed).toBeUndefined();
    expect(proposals[1].is_closed).toBe(false);
    expect(proposals[2].is_closed).toBe(true);
  });
});
