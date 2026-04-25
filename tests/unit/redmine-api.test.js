import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mapTimeEntry, RedmineError } from '../../js/redmine-api.js';

describe('mapTimeEntry', () => {
  it('maps a valid Redmine API time entry', () => {
    const raw = {
      id: 101,
      hours: 2.0,
      spent_on: '2026-04-14',
      comments: 'Feature work',
      easy_time_from: '09:00:00',
      easy_time_to: '11:00:00',
      issue: { id: 42, subject: 'Login page' },
      project: { id: 1, name: 'Web App' },
      activity: { id: 9, name: 'Development' },
    };

    const result = mapTimeEntry(raw);
    expect(result.id).toBe(101);
    expect(result.hours).toBe(2.0);
    expect(result.date).toBe('2026-04-14');
    expect(result.startTime).toBe('09:00');
    expect(result.issueId).toBe(42);
    expect(result.issueSubject).toBe('Login page');
    expect(result.projectName).toBe('Web App');
    expect(result.activityId).toBe(9);
    expect(result.activityName).toBe('Development');
    expect(result.comment).toBe('Feature work');
    expect(result._rawComment).toBe('Feature work');
  });

  it('returns null for entry missing required fields', () => {
    expect(mapTimeEntry({ id: 1 })).toBeNull();
    expect(mapTimeEntry(null)).toBeNull();
    expect(mapTimeEntry({})).toBeNull();
  });

  it('handles entry without easy_time_from', () => {
    const raw = {
      id: 102,
      hours: 1.0,
      spent_on: '2026-04-14',
      comments: '',
      issue: { id: 43, subject: 'Test' },
      project: { id: 1, name: 'Web App' },
      activity: { id: 9, name: 'Dev' },
    };
    const result = mapTimeEntry(raw);
    expect(result.startTime).toBeNull();
  });

  it('handles entry without issue', () => {
    const raw = {
      id: 103,
      hours: 0.5,
      spent_on: '2026-04-14',
      comments: '',
    };
    const result = mapTimeEntry(raw);
    expect(result.issueId).toBeNull();
    expect(result.issueSubject).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(mapTimeEntry(undefined)).toBeNull();
  });

  it('returns null when id is 0 (falsy)', () => {
    expect(mapTimeEntry({ id: 0, hours: 1, spent_on: '2026-04-15' })).toBeNull();
  });

  it('returns null when hours is 0 (falsy)', () => {
    expect(mapTimeEntry({ id: 1, hours: 0, spent_on: '2026-04-15' })).toBeNull();
  });

  it('returns null when spent_on is missing', () => {
    expect(mapTimeEntry({ id: 1, hours: 1 })).toBeNull();
  });

  it('handles entry without project', () => {
    const raw = { id: 104, hours: 1.0, spent_on: '2026-04-15', comments: 'No project' };
    const result = mapTimeEntry(raw);
    expect(result.projectName).toBeNull();
  });

  it('handles entry without activity', () => {
    const raw = { id: 105, hours: 0.75, spent_on: '2026-04-15', comments: '' };
    const result = mapTimeEntry(raw);
    expect(result.activityId).toBeNull();
    expect(result.activityName).toBeNull();
  });

  it('handles entry with null comments', () => {
    const raw = { id: 106, hours: 1.0, spent_on: '2026-04-15', comments: null };
    const result = mapTimeEntry(raw);
    expect(result.comment).toBe('');
    expect(result._rawComment).toBe('');
  });

  it('handles entry with undefined comments', () => {
    const raw = { id: 107, hours: 1.0, spent_on: '2026-04-15' };
    const result = mapTimeEntry(raw);
    expect(result.comment).toBe('');
    expect(result._rawComment).toBe('');
  });

  it('truncates easy_time_from seconds to HH:MM', () => {
    const raw = {
      id: 108, hours: 1.5, spent_on: '2026-04-15',
      easy_time_from: '14:30:59',
    };
    const result = mapTimeEntry(raw);
    expect(result.startTime).toBe('14:30');
  });

  it('handles fractional hours', () => {
    const raw = { id: 109, hours: 0.25, spent_on: '2026-04-15' };
    const result = mapTimeEntry(raw);
    expect(result.hours).toBe(0.25);
  });
});

describe('RedmineError', () => {
  it('has name, message, and status', () => {
    const err = new RedmineError('Test error', 401);
    expect(err.name).toBe('RedmineError');
    expect(err.message).toBe('Test error');
    expect(err.status).toBe(401);
  });

  it('defaults status to 0 when not provided', () => {
    const err = new RedmineError('No status');
    expect(err.status).toBe(0);
  });

  it('is an instance of Error', () => {
    const err = new RedmineError('test', 500);
    expect(err).toBeInstanceOf(Error);
  });
});

describe('request and CRUD operations', () => {
  let api;

  beforeEach(async () => {
    vi.resetModules();

    vi.doMock('../../js/settings.js', () => ({
      getCentralConfigSync: vi.fn(() => ({ redmineUrl: 'http://mock-proxy' })),
      readCredentials: vi.fn(async () => ({ authType: 'apikey', apiKey: 'test-key-123' })),
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

    global.fetch = vi.fn(() => Promise.resolve({
      ok: true, status: 200,
      text: async () => '{}',
    }));
    api = await import('../../js/redmine-api.js');
    api.invalidateCredentialsCache();
  });

  // ── request() — auth headers ───────────────────────────────────

  describe('request — API key auth', () => {
    it('sets X-Redmine-API-Key header', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200, text: async () => '{}',
      });
      await api.request('/test');
      const [url, opts] = global.fetch.mock.calls[0];
      expect(url).toBe('http://mock-proxy/test');
      expect(opts.headers['X-Redmine-API-Key']).toBe('test-key-123');
      expect(opts.headers['Authorization']).toBeUndefined();
    });
  });

  describe('request — Basic auth', () => {
    it('sets Authorization header for basic auth', async () => {
      vi.resetModules();
      vi.doMock('../../js/settings.js', () => ({
        getCentralConfigSync: vi.fn(() => ({ redmineUrl: 'http://mock-proxy' })),
        readCredentials: vi.fn(async () => ({ authType: 'basic', username: 'alice', password: 's3cret' })),
        loadCentralConfig: vi.fn(), resetCentralConfigCache: vi.fn(),
        readWorkingHours: vi.fn(() => null), writeWorkingHours: vi.fn(),
        clearWorkingHours: vi.fn(), writeCredentials: vi.fn(),
        clearCredentials: vi.fn(), redirectToSettingsIfMissing: vi.fn(),
        invalidateCredentialsCache: vi.fn(),
      }));
      vi.doMock('../../js/i18n.js', () => ({
        t: vi.fn((key) => key), locale: 'en', formatDate: vi.fn((d) => d),
      }));
      global.fetch = vi.fn(() => Promise.resolve({
      ok: true, status: 200,
      text: async () => '{}',
    }));
      api = await import('../../js/redmine-api.js');
      api.invalidateCredentialsCache();

      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200, text: async () => '{}',
      });
      await api.request('/test');
      const [, opts] = global.fetch.mock.calls[0];
      const expected = 'Basic ' + btoa('alice:s3cret');
      expect(opts.headers['Authorization']).toBe(expected);
      expect(opts.headers['X-Redmine-API-Key']).toBeUndefined();
    });
  });

  describe('request — Content-Type header', () => {
    it('includes Content-Type when body is present', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200, text: async () => '{}',
      });
      await api.request('/test', { body: '{"a":1}' });
      const [, opts] = global.fetch.mock.calls[0];
      expect(opts.headers['Content-Type']).toBe('application/json');
    });

    it('does not include Content-Type when no body', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200, text: async () => '{}',
      });
      await api.request('/test');
      const [, opts] = global.fetch.mock.calls[0];
      expect(opts.headers['Content-Type']).toBeUndefined();
    });
  });

  // ── request() — error handling ─────────────────────────────────

  describe('request — error handling', () => {
    it('throws on 401 with error.auth_failed', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 401 });
      try {
        await api.request('/test');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(api.RedmineError);
        expect(e.status).toBe(401);
        expect(e.message).toBe('error.auth_failed');
      }
    });

    it('throws on 403 with permission_denied', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 403 });
      try {
        await api.request('/test');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(api.RedmineError);
        expect(e.status).toBe(403);
        expect(e.message).toBe('error.permission_denied');
      }
    });

    it('throws on 404 with not_found', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });
      try {
        await api.request('/test');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(api.RedmineError);
        expect(e.status).toBe(404);
        expect(e.message).toBe('error.not_found');
      }
    });

    it('throws on 422 and extracts first error message from body', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false, status: 422,
        json: async () => ({ errors: ['Hours is invalid'] }),
      });
      try {
        await api.request('/test');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(api.RedmineError);
        expect(e.status).toBe(422);
        expect(e.message).toBe('Hours is invalid');
      }
    });

    it('throws on 422 with fallback when errors array is empty', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false, status: 422,
        json: async () => ({ errors: [] }),
      });
      try {
        await api.request('/test');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e.status).toBe(422);
        expect(e.message).toBe('error.validation');
      }
    });

    it('throws on 422 with fallback when body has no errors key', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false, status: 422,
        json: async () => ({}),
      });
      try {
        await api.request('/test');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e.status).toBe(422);
        expect(e.message).toBe('error.validation');
      }
    });

    it('throws on 422 with fallback when json() rejects', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false, status: 422,
        json: async () => { throw new Error('parse fail'); },
      });
      try {
        await api.request('/test');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e.status).toBe(422);
        expect(e.message).toBe('error.validation');
      }
    });

    it('throws on 503 with server_unavailable', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 503 });
      try {
        await api.request('/test');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(api.RedmineError);
        expect(e.status).toBe(503);
        expect(e.message).toBe('error.server_unavailable');
      }
    });

    it('throws on network error (fetch rejection) with error.network', async () => {
      global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      try {
        await api.request('/test');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(api.RedmineError);
        expect(e.status).toBe(0);
        expect(e.message).toBe('error.network');
      }
    });

    it('throws error.not_configured when no central config', async () => {
      vi.resetModules();
      vi.doMock('../../js/settings.js', () => ({
        getCentralConfigSync: vi.fn(() => null),
        readCredentials: vi.fn(async () => ({ authType: 'apikey', apiKey: 'k' })),
        loadCentralConfig: vi.fn(), resetCentralConfigCache: vi.fn(),
        readWorkingHours: vi.fn(() => null), writeWorkingHours: vi.fn(),
        clearWorkingHours: vi.fn(), writeCredentials: vi.fn(),
        clearCredentials: vi.fn(), redirectToSettingsIfMissing: vi.fn(),
        invalidateCredentialsCache: vi.fn(),
      }));
      vi.doMock('../../js/i18n.js', () => ({
        t: vi.fn((key) => key), locale: 'en', formatDate: vi.fn((d) => d),
      }));
      api = await import('../../js/redmine-api.js');

      try {
        await api.request('/test');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(api.RedmineError);
        expect(e.status).toBe(0);
        expect(e.message).toBe('error.not_configured');
      }
    });

    it('throws error.not_configured when credentials are null', async () => {
      vi.resetModules();
      vi.doMock('../../js/settings.js', () => ({
        getCentralConfigSync: vi.fn(() => ({ redmineUrl: 'http://mock-proxy' })),
        readCredentials: vi.fn(async () => null),
        loadCentralConfig: vi.fn(), resetCentralConfigCache: vi.fn(),
        readWorkingHours: vi.fn(() => null), writeWorkingHours: vi.fn(),
        clearWorkingHours: vi.fn(), writeCredentials: vi.fn(),
        clearCredentials: vi.fn(), redirectToSettingsIfMissing: vi.fn(),
        invalidateCredentialsCache: vi.fn(),
      }));
      vi.doMock('../../js/i18n.js', () => ({
        t: vi.fn((key) => key), locale: 'en', formatDate: vi.fn((d) => d),
      }));
      global.fetch = vi.fn(() => Promise.resolve({
      ok: true, status: 200,
      text: async () => '{}',
    }));
      api = await import('../../js/redmine-api.js');
      api.invalidateCredentialsCache();

      try {
        await api.request('/test');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(api.RedmineError);
        expect(e.status).toBe(0);
        expect(e.message).toBe('error.not_configured');
      }
    });

    it('throws error.unexpected on unhandled status code (e.g. 500)', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });
      try {
        await api.request('/test');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(api.RedmineError);
        expect(e.status).toBe(500);
        expect(e.message).toBe('error.unexpected');
      }
    });
  });

  // ── request() — success responses ──────────────────────────────

  describe('request — success responses', () => {
    it('returns parsed JSON on 200', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => '{"user":{"id":1,"login":"admin"}}',
      });
      const result = await api.request('/users/current.json');
      expect(result).toEqual({ user: { id: 1, login: 'admin' } });
    });

    it('returns parsed JSON on 201', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 201,
        text: async () => '{"time_entry":{"id":99}}',
      });
      const result = await api.request('/time_entries.json', { method: 'POST', body: '{}' });
      expect(result).toEqual({ time_entry: { id: 99 } });
    });

    it('returns null on 204 (no content)', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 204,
        text: async () => '',
      });
      const result = await api.request('/time_entries/1.json', { method: 'DELETE' });
      expect(result).toBeNull();
    });

    it('returns null when response text is empty on 200', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => '',
      });
      const result = await api.request('/test');
      expect(result).toBeNull();
    });

    it('returns null when response text is not valid JSON', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => 'not json at all',
      });
      const result = await api.request('/test');
      expect(result).toBeNull();
    });
  });

  // ── getCurrentUser ─────────────────────────────────────────────

  describe('getCurrentUser', () => {
    it('returns user object from API response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({ user: { id: 1, login: 'admin', firstname: 'Admin' } }),
      });
      const user = await api.getCurrentUser();
      expect(user).toEqual({ id: 1, login: 'admin', firstname: 'Admin' });
    });

    it('calls /users/current.json', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({ user: { id: 1 } }),
      });
      await api.getCurrentUser();
      const [url] = global.fetch.mock.calls[0];
      expect(url).toContain('/users/current.json');
    });
  });

  // ── getTimeEntryActivities ─────────────────────────────────────

  describe('getTimeEntryActivities', () => {
    it('fetches and maps activities', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({
          time_entry_activities: [
            { id: 9, name: 'Development', is_default: true },
            { id: 10, name: 'Review' },
          ],
        }),
      });
      const activities = await api.getTimeEntryActivities();
      expect(activities).toHaveLength(2);
      expect(activities[0]).toEqual({ id: 9, name: 'Development', isDefault: true });
      expect(activities[1]).toEqual({ id: 10, name: 'Review', isDefault: false });
    });

    it('caches activities after first call', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({
          time_entry_activities: [{ id: 9, name: 'Dev', is_default: true }],
        }),
      });
      const first = await api.getTimeEntryActivities();
      global.fetch.mockClear();

      const second = await api.getTimeEntryActivities();
      expect(second).toBe(first);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('handles empty activities list', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({ time_entry_activities: [] }),
      });
      vi.resetModules();
      vi.doMock('../../js/settings.js', () => ({
        getCentralConfigSync: vi.fn(() => ({ redmineUrl: 'http://mock-proxy' })),
        readCredentials: vi.fn(async () => ({ authType: 'apikey', apiKey: 'test-key-123' })),
        loadCentralConfig: vi.fn(), resetCentralConfigCache: vi.fn(),
        readWorkingHours: vi.fn(() => null), writeWorkingHours: vi.fn(),
        clearWorkingHours: vi.fn(), writeCredentials: vi.fn(),
        clearCredentials: vi.fn(), redirectToSettingsIfMissing: vi.fn(),
        invalidateCredentialsCache: vi.fn(),
      }));
      vi.doMock('../../js/i18n.js', () => ({
        t: vi.fn((key) => key), locale: 'en', formatDate: vi.fn((d) => d),
      }));
      global.fetch = vi.fn(() => Promise.resolve({
      ok: true, status: 200,
      text: async () => '{}',
    }));
      const freshApi = await import('../../js/redmine-api.js');
      freshApi.invalidateCredentialsCache();

      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({ time_entry_activities: [] }),
      });
      const activities = await freshApi.getTimeEntryActivities();
      expect(activities).toEqual([]);
    });
  });

  // ── fetchTimeEntries ───────────────────────────────────────────

  describe('fetchTimeEntries', () => {
    it('returns valid entries for date range', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({
          time_entries: [
            { id: 1, hours: 2, spent_on: '2026-04-22' },
            { id: 2, hours: 3, spent_on: '2026-04-22' },
          ],
        }),
      });
      const entries = await api.fetchTimeEntries('2026-04-22', '2026-04-22');
      expect(entries).toHaveLength(2);
    });

    it('filters entries missing id', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({
          time_entries: [
            { id: 1, hours: 2, spent_on: '2026-04-22' },
            { id: null, hours: 1, spent_on: '2026-04-22' },
            { id: 0, hours: 1, spent_on: '2026-04-22' },
          ],
        }),
      });
      const entries = await api.fetchTimeEntries('2026-04-22', '2026-04-22');
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe(1);
    });

    it('filters entries missing hours', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({
          time_entries: [
            { id: 1, hours: 2, spent_on: '2026-04-22' },
            { id: 2, hours: null, spent_on: '2026-04-22' },
            { id: 3, hours: 0, spent_on: '2026-04-22' },
          ],
        }),
      });
      const entries = await api.fetchTimeEntries('2026-04-22', '2026-04-22');
      expect(entries).toHaveLength(1);
    });

    it('filters entries missing spent_on', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({
          time_entries: [
            { id: 1, hours: 2, spent_on: '2026-04-22' },
            { id: 2, hours: 1 },
            { id: 3, hours: 1, spent_on: null },
          ],
        }),
      });
      const entries = await api.fetchTimeEntries('2026-04-22', '2026-04-22');
      expect(entries).toHaveLength(1);
    });

    it('returns empty array when response has no time_entries key', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => '{}',
      });
      const entries = await api.fetchTimeEntries('2026-04-22', '2026-04-22');
      expect(entries).toEqual([]);
    });

    it('constructs URL with from, to, user_id, and limit params', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({ time_entries: [] }),
      });
      await api.fetchTimeEntries('2026-04-01', '2026-04-30');
      const [url] = global.fetch.mock.calls[0];
      expect(url).toContain('from=2026-04-01');
      expect(url).toContain('to=2026-04-30');
      expect(url).toContain('user_id=me');
      expect(url).toContain('limit=100');
    });
  });

  // ── resolveIssueSubject ────────────────────────────────────────

  describe('resolveIssueSubject', () => {
    it('returns subject from API', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({ issue: { id: 42, subject: 'Login page' } }),
      });
      const subject = await api.resolveIssueSubject(42);
      expect(subject).toBe('Login page');
    });

    it('caches result for subsequent calls', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({ issue: { id: 42, subject: 'Cached' } }),
      });
      await api.resolveIssueSubject(42);
      global.fetch.mockClear();
      const subject = await api.resolveIssueSubject(42);
      expect(subject).toBe('Cached');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns fallback string on API error', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });
      const subject = await api.resolveIssueSubject(999);
      expect(subject).toBe('Issue #999');
    });

    it('caches fallback after error', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });
      await api.resolveIssueSubject(888);
      global.fetch.mockClear();
      const subject = await api.resolveIssueSubject(888);
      expect(subject).toBe('Issue #888');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns fallback when issue.subject is missing', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({ issue: { id: 50 } }),
      });
      const subject = await api.resolveIssueSubject(50);
      expect(subject).toBe('Issue #50');
    });

    it('returns fallback on network error', async () => {
      global.fetch.mockRejectedValueOnce(new TypeError('network down'));
      const subject = await api.resolveIssueSubject(777);
      expect(subject).toBe('Issue #777');
    });
  });

  // ── searchIssues ───────────────────────────────────────────────

  const emptyProjectsResponse = {
    ok: true, status: 200,
    text: async () => JSON.stringify({ projects: [] }),
  };

  describe('searchIssues', () => {
    it('#123 format searches by ID and returns single result', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({
          issue: {
            id: 123, subject: 'Bug fix',
            project: { name: 'MyProject' }, status: { name: 'Open' },
          },
        }),
      });
      const results = await api.searchIssues('#123');
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        id: 123, subject: 'Bug fix', projectId: null, projectName: 'MyProject', projectIdentifier: null, status: 'Open',
      });
      const [url] = global.fetch.mock.calls[0];
      expect(url).toContain('/issues/123.json');
    });

    it('#123 format returns empty array when not found', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });
      const results = await api.searchIssues('#456');
      expect(results).toEqual([]);
    });

    it('#123 format does NOT fall through to text search', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });
      await api.searchIssues('#789');
      // Only one fetch call (ID lookup), no text search fallthrough
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('plain number tries ID first, returns if found', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({
          issue: {
            id: 789, subject: 'Direct match',
            project: { name: 'P1' }, status: { name: 'Closed' },
          },
        }),
      });
      const results = await api.searchIssues('789');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(789);
      expect(global.fetch.mock.calls[0][0]).toContain('/issues/789.json');
    });

    it('plain number falls through to text search on ID not found', async () => {
      // First: ID lookup fails
      global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });
      // Second: projects fetch (fetchAllProjects)
      global.fetch.mockResolvedValueOnce(emptyProjectsResponse);
      // Third: text search returns results
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({
          issues: [
            { id: 10, subject: 'Item 789', project: { name: 'P' }, status: { name: 'Open' } },
          ],
        }),
      });
      const results = await api.searchIssues('789');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(10);
    });

    it('text query calls subject search endpoint', async () => {
      global.fetch.mockResolvedValueOnce(emptyProjectsResponse);
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({
          issues: [
            { id: 1, subject: 'Login bug', project: { name: 'Web' }, status: { name: 'Open' } },
            { id: 2, subject: 'Login redesign', project: { name: 'Web' }, status: { name: 'New' } },
          ],
        }),
      });
      const results = await api.searchIssues('Login');
      expect(results).toHaveLength(2);
      const subjectCall = global.fetch.mock.calls.find(c => c[0].includes('subject=~'));
      expect(subjectCall).toBeTruthy();
      expect(subjectCall[0]).toContain('subject=~Login');
      expect(subjectCall[0]).toContain('status_id=open');
      expect(subjectCall[0]).toContain('limit=25');
      expect(subjectCall[0]).toContain('sort=updated_on:desc');
    });

    it('text query returns empty array when no issues found', async () => {
      global.fetch.mockResolvedValueOnce(emptyProjectsResponse);
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({ issues: [] }),
      });
      const results = await api.searchIssues('nonexistent');
      expect(results).toEqual([]);
    });

    it('handles missing project and status in search results', async () => {
      global.fetch.mockResolvedValueOnce(emptyProjectsResponse);
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({
          issues: [{ id: 5, subject: 'Minimal issue' }],
        }),
      });
      const results = await api.searchIssues('Minimal');
      expect(results[0].projectName).toBe('');
      expect(results[0].status).toBe('');
    });

    it('trims whitespace from query', async () => {
      global.fetch.mockResolvedValueOnce(emptyProjectsResponse);
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({ issues: [] }),
      });
      await api.searchIssues('  hello  ');
      const subjectCall = global.fetch.mock.calls.find(c => c[0].includes('subject=~'));
      expect(subjectCall[0]).toContain('subject=~hello');
    });

    it('encodes special characters in text query', async () => {
      global.fetch.mockResolvedValueOnce(emptyProjectsResponse);
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({ issues: [] }),
      });
      await api.searchIssues('foo bar');
      const subjectCall = global.fetch.mock.calls.find(c => c[0].includes('subject=~'));
      expect(subjectCall[0]).toContain('subject=~foo');
    });

    it('#123 handles missing project/status in result', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({
          issue: { id: 123, subject: 'Bare issue' },
        }),
      });
      const results = await api.searchIssues('#123');
      expect(results[0].projectName).toBe('');
      expect(results[0].status).toBe('');
    });
  });

  // ── createTimeEntry ────────────────────────────────────────────

  describe('createTimeEntry', () => {
    function mockCreateResponse(overrides = {}) {
      const entry = {
        id: 200, hours: 1.0, spent_on: '2026-04-22', comments: '',
        issue: { id: 1, subject: 'T' }, project: { id: 1, name: 'P' },
        activity: { id: 9, name: 'Dev' },
        ...overrides,
      };
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 201,
        text: async () => JSON.stringify({ time_entry: entry }),
      });
    }

    it('sends POST to /time_entries.json', async () => {
      mockCreateResponse();
      await api.createTimeEntry({
        issueId: 1, spentOn: '2026-04-22', hours: 1.0,
        activityId: 9, comment: '',
      });
      const [url, opts] = global.fetch.mock.calls[0];
      expect(url).toContain('/time_entries.json');
      expect(opts.method).toBe('POST');
    });

    it('rounds 1.3 hours to 1.25', async () => {
      mockCreateResponse({ hours: 1.25 });
      await api.createTimeEntry({
        issueId: 1, spentOn: '2026-04-22', hours: 1.3,
        activityId: 9, comment: '', startTime: '09:00',
      });
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.time_entry.hours).toBe(1.25);
    });

    it('rounds 1.1 hours to 1.0', async () => {
      mockCreateResponse({ hours: 1.0 });
      await api.createTimeEntry({
        issueId: 1, spentOn: '2026-04-22', hours: 1.1,
        activityId: 9, comment: '',
      });
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.time_entry.hours).toBe(1.0);
    });

    it('rounds 1.9 hours to 2.0', async () => {
      mockCreateResponse({ hours: 2.0 });
      await api.createTimeEntry({
        issueId: 1, spentOn: '2026-04-22', hours: 1.9,
        activityId: 9, comment: '',
      });
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.time_entry.hours).toBe(2.0);
    });

    it('keeps exact 0.25 increment unchanged', async () => {
      mockCreateResponse({ hours: 1.75 });
      await api.createTimeEntry({
        issueId: 1, spentOn: '2026-04-22', hours: 1.75,
        activityId: 9, comment: '',
      });
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.time_entry.hours).toBe(1.75);
    });

    it('includes easy_time_from and computed easy_time_to when startTime provided', async () => {
      mockCreateResponse({ hours: 2.0 });
      await api.createTimeEntry({
        issueId: 1, spentOn: '2026-04-22', hours: 2.0,
        activityId: 9, comment: '', startTime: '09:00',
      });
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.time_entry.easy_time_from).toBe('09:00');
      expect(body.time_entry.easy_time_to).toBe('11:00');
    });

    it('calculates endTime crossing hour boundary', async () => {
      mockCreateResponse({ hours: 1.5 });
      await api.createTimeEntry({
        issueId: 1, spentOn: '2026-04-22', hours: 1.5,
        activityId: 9, comment: '', startTime: '09:45',
      });
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.time_entry.easy_time_from).toBe('09:45');
      expect(body.time_entry.easy_time_to).toBe('11:15');
    });

    it('omits easy_time fields when startTime is not provided', async () => {
      mockCreateResponse();
      await api.createTimeEntry({
        issueId: 1, spentOn: '2026-04-22', hours: 1.0,
        activityId: 9, comment: '',
      });
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.time_entry.easy_time_from).toBeUndefined();
      expect(body.time_entry.easy_time_to).toBeUndefined();
    });

    it('defaults comment to empty string when null', async () => {
      mockCreateResponse();
      await api.createTimeEntry({
        issueId: 1, spentOn: '2026-04-22', hours: 1.0,
        activityId: 9, comment: null,
      });
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.time_entry.comments).toBe('');
    });

    it('returns mapped time entry from response', async () => {
      mockCreateResponse({
        id: 206, hours: 1.5, spent_on: '2026-04-14',
        comments: 'Work', issue: { id: 10, subject: 'Task' },
      });
      const result = await api.createTimeEntry({
        issueId: 10, spentOn: '2026-04-14', hours: 1.5,
        activityId: 9, comment: 'Work',
      });
      expect(result.id).toBe(206);
      expect(result.hours).toBe(1.5);
      expect(result.issueId).toBe(10);
    });

    it('sends correct issue_id, spent_on, activity_id', async () => {
      mockCreateResponse();
      await api.createTimeEntry({
        issueId: 42, spentOn: '2026-04-22', hours: 1.0,
        activityId: 10, comment: 'test comment',
      });
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.time_entry.issue_id).toBe(42);
      expect(body.time_entry.spent_on).toBe('2026-04-22');
      expect(body.time_entry.activity_id).toBe(10);
      expect(body.time_entry.comments).toBe('test comment');
    });
  });

  // ── updateTimeEntry ────────────────────────────────────────────

  describe('updateTimeEntry', () => {
    function mockUpdateResponse(overrides = {}) {
      const entry = {
        id: 300, hours: 1.0, spent_on: '2026-04-22', comments: '',
        ...overrides,
      };
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({ time_entry: entry }),
      });
    }

    it('sends PUT to /time_entries/:id.json', async () => {
      mockUpdateResponse();
      await api.updateTimeEntry(300, { comment: 'updated' });
      const [url, opts] = global.fetch.mock.calls[0];
      expect(url).toContain('/time_entries/300.json');
      expect(opts.method).toBe('PUT');
    });

    it('includes hours when provided and rounds to 0.25', async () => {
      mockUpdateResponse({ hours: 1.5 });
      await api.updateTimeEntry(300, { hours: 1.6, comment: '' });
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.time_entry.hours).toBe(1.5);
    });

    it('does not include hours key when not provided', async () => {
      mockUpdateResponse();
      await api.updateTimeEntry(300, { comment: 'only comment' });
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.time_entry.hours).toBeUndefined();
    });

    it('includes activityId when provided', async () => {
      mockUpdateResponse();
      await api.updateTimeEntry(300, { activityId: 10, comment: '' });
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.time_entry.activity_id).toBe(10);
    });

    it('includes issueId when provided', async () => {
      mockUpdateResponse();
      await api.updateTimeEntry(300, { issueId: 42, comment: '' });
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.time_entry.issue_id).toBe(42);
    });

    it('includes spentOn when provided', async () => {
      mockUpdateResponse();
      await api.updateTimeEntry(300, { spentOn: '2026-04-23', comment: '' });
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.time_entry.spent_on).toBe('2026-04-23');
    });

    it('sets easy_time_from and calculates easy_time_to from startTime', async () => {
      mockUpdateResponse({ hours: 2.0 });
      await api.updateTimeEntry(300, {
        hours: 2.0, startTime: '14:00', comment: '',
      });
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.time_entry.easy_time_from).toBe('14:00');
      expect(body.time_entry.easy_time_to).toBe('16:00');
    });

    it('sets easy_time fields to null when no startTime', async () => {
      mockUpdateResponse();
      await api.updateTimeEntry(300, { hours: 1.0, comment: '' });
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.time_entry.easy_time_from).toBeNull();
      expect(body.time_entry.easy_time_to).toBeNull();
    });

    it('always sets comments (defaults to empty string)', async () => {
      mockUpdateResponse();
      await api.updateTimeEntry(300, {});
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.time_entry.comments).toBe('');
    });

    it('returns mapped time entry from response', async () => {
      mockUpdateResponse({
        id: 306, hours: 1.0, spent_on: '2026-04-14',
        comments: 'done', issue: { id: 5, subject: 'Task' },
        project: { id: 1, name: 'P' }, activity: { id: 9, name: 'Dev' },
      });
      const result = await api.updateTimeEntry(306, { hours: 1.0, comment: 'done' });
      expect(result.id).toBe(306);
      expect(result.comment).toBe('done');
    });

    it('handles response without time_entry (empty body)', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => '',
      });
      const result = await api.updateTimeEntry(307, { comment: 'test' });
      // mapTimeEntry({ id: 307 }) returns null since hours/spent_on missing
      expect(result).toBeNull();
    });
  });

  // ── deleteTimeEntry ────────────────────────────────────────────

  describe('deleteTimeEntry', () => {
    it('sends DELETE request to /time_entries/:id.json', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200, text: async () => '',
      });
      await api.deleteTimeEntry(400);
      const [url, opts] = global.fetch.mock.calls[0];
      expect(url).toContain('/time_entries/400.json');
      expect(opts.method).toBe('DELETE');
    });

    it('treats 404 as success (does not throw)', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });
      await expect(api.deleteTimeEntry(401)).resolves.toBeUndefined();
    });

    it('re-throws 403 errors', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 403 });
      try {
        await api.deleteTimeEntry(402);
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e.status).toBe(403);
        expect(e.message).toBe('error.permission_denied');
      }
    });

    it('re-throws 500 errors', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });
      await expect(api.deleteTimeEntry(403)).rejects.toThrow(api.RedmineError);
    });

    it('re-throws 401 errors', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 401 });
      try {
        await api.deleteTimeEntry(404);
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e.status).toBe(401);
      }
    });
  });
});
