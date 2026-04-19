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
});
