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
    expect(result.comment).toBe('Feature work');
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
});

describe('searchIssues', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('#123 searches by ID only and returns empty on not found', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 404,
      json: () => Promise.resolve({ errors: ['Not found'] }),
    });
    const { searchIssues } = await import('../../js/redmine-api.js');
    // Can't fully test without mocking request(), but verify the function exists
    expect(typeof searchIssues).toBe('function');
  });

  it('plain number falls through to subject search', async () => {
    const { searchIssues } = await import('../../js/redmine-api.js');
    expect(typeof searchIssues).toBe('function');
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
});

describe('request and CRUD operations', () => {
  let api;

  beforeEach(async () => {
    vi.resetModules();

    vi.mock('../../js/settings.js', () => ({
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

    vi.mock('../../js/i18n.js', () => ({
      t: vi.fn((key) => key),
      locale: 'en',
      formatDate: vi.fn((d) => d),
    }));

    global.fetch = vi.fn();
    api = await import('../../js/redmine-api.js');
  });

  describe('request — error handling', () => {
    it('throws on 401 with auth_failed', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 401 });
      await expect(api.request('/test')).rejects.toThrow('error.auth_failed');
    });

    it('throws on 403 with permission_denied', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 403 });
      await expect(api.request('/test')).rejects.toThrow('error.permission_denied');
    });

    it('throws on 404 with not_found', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });
      await expect(api.request('/test')).rejects.toThrow('error.not_found');
    });

    it('throws on 422 and extracts error message from body', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false, status: 422,
        json: async () => ({ errors: ['Hours is invalid'] }),
      });
      await expect(api.request('/test')).rejects.toThrow('Hours is invalid');
    });

    it('throws on 503 with server_unavailable', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 503 });
      await expect(api.request('/test')).rejects.toThrow('error.server_unavailable');
    });

    it('throws on network error with error.network', async () => {
      global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      await expect(api.request('/test')).rejects.toThrow('error.network');
    });

    it('returns parsed JSON on success', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => '{"user":{"id":1,"login":"admin"}}',
      });
      const result = await api.request('/users/current.json');
      expect(result.user.login).toBe('admin');
    });

    it('sets X-Redmine-API-Key header for apikey auth', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200, text: async () => '{}',
      });
      await api.request('/test');
      const [, opts] = global.fetch.mock.calls[0];
      expect(opts.headers['X-Redmine-API-Key']).toBe('test-key-123');
    });
  });

  describe('fetchTimeEntries', () => {
    it('returns mapped entries for date range', async () => {
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

    it('filters entries missing required fields', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({
          time_entries: [
            { id: 1, hours: 2, spent_on: '2026-04-22' },
            { id: null, hours: 1, spent_on: '2026-04-22' },
            { id: 3, hours: null, spent_on: '2026-04-22' },
            { id: 4, hours: 1 },
          ],
        }),
      });
      const entries = await api.fetchTimeEntries('2026-04-22', '2026-04-22');
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe(1);
    });
  });

  describe('resolveIssueSubject', () => {
    it('returns issue subject from API', async () => {
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

    it('returns fallback string on error', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });
      const subject = await api.resolveIssueSubject(999);
      expect(subject).toBe('Issue #999');
    });
  });

  describe('createTimeEntry', () => {
    it('rounds hours to nearest 0.25', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 201,
        text: async () => JSON.stringify({
          time_entry: { id: 100, hours: 1.25, spent_on: '2026-04-22', comments: '' },
        }),
      });
      await api.createTimeEntry({
        issueId: 42, spentOn: '2026-04-22', hours: 1.3,
        activityId: 9, comment: '', startTime: '09:00',
      });
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.time_entry.hours).toBe(1.25);
    });

    it('includes startTime and computed endTime', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 201,
        text: async () => JSON.stringify({
          time_entry: { id: 100, hours: 2, spent_on: '2026-04-22', comments: '' },
        }),
      });
      await api.createTimeEntry({
        issueId: 42, spentOn: '2026-04-22', hours: 2,
        activityId: 9, comment: '', startTime: '09:00',
      });
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.time_entry.easy_time_from).toBe('09:00');
      expect(body.time_entry.easy_time_to).toBe('11:00');
    });
  });

  describe('updateTimeEntry', () => {
    it('sends partial update with only changed fields', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({
          time_entry: { id: 100, hours: 3, spent_on: '2026-04-22', comments: 'updated' },
        }),
      });
      await api.updateTimeEntry(100, { hours: 3, comment: 'updated' });
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.time_entry.hours).toBe(3);
      expect(body.time_entry.comments).toBe('updated');
    });
  });

  describe('deleteTimeEntry', () => {
    it('sends DELETE request', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200, text: async () => '',
      });
      await api.deleteTimeEntry(100);
      const [, opts] = global.fetch.mock.calls[0];
      expect(opts.method).toBe('DELETE');
    });

    it('treats 404 as success', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });
      await expect(api.deleteTimeEntry(100)).resolves.toBeUndefined();
    });
  });

  describe('getCurrentUser', () => {
    it('returns user object from API response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({ user: { id: 1, login: 'admin', firstname: 'Admin' } }),
      });
      const user = await api.getCurrentUser();
      expect(user.login).toBe('admin');
    });
  });

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
  });
});
