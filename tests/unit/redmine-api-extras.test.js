// Additional tests targeting gaps in js/redmine-api.js coverage:
//   - httpsOrigin catch branch (invalid URL)
//   - fetchTimeEntryById (success / error swallow)
//   - fetchAllProjects pagination loop + resolveProjectIdentifier
//   - enrichEntry / enrichEntries
//   - searchIssues path that exercises findProjectIdsByWord + project-scoped fetch
//   - mapTimeEntry projectIdentifier fallback (issue.project.identifier vs project.identifier)
//   - createTimeEntry response missing endTime fallback
//   - updateTimeEntry response missing endTime fallback
//   - formatProject (with/without name, long identifier truncation)
//   - dedup branch in fetchCandidates collect()
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Each test resets the module so internal caches (_projectCache,
// _projectNameCache, _subjectCache, _activitiesCache, _projectsPromise) start
// empty and we can deterministically order fetch responses.
async function loadFreshApi({ centralCfg = { redmineUrl: 'http://mock-proxy' }, credentials = { authType: 'apikey', apiKey: 'k' } } = {}) {
  vi.resetModules();
  vi.doMock('../../js/settings.js', () => ({
    getCentralConfigSync: vi.fn(() => centralCfg),
    readCredentials: vi.fn(async () => credentials),
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
    t: vi.fn((key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key)),
    locale: 'en',
    formatDate: vi.fn((d) => d),
  }));
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, status: 200, text: async () => '{}' }));
  const api = await import('../../js/redmine-api.js');
  api.invalidateCredentialsCache();
  return api;
}

function jsonResponse(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(payload) };
}

describe('httpsOrigin (network error proxyUrl)', () => {
  it('falls back to raw redmineUrl when URL constructor throws', async () => {
    // 'not a url' is not a parseable URL — httpsOrigin's catch returns it verbatim.
    const api = await loadFreshApi({ centralCfg: { redmineUrl: 'not a url' } });
    global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    try {
      await api.request('/test');
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(api.RedmineError);
      expect(e.status).toBe(0);
      // proxyUrl is attached to the error; should equal the raw input
      expect(e.proxyUrl).toBe('not a url');
    }
  });

  it('derives https origin from a valid http URL on network error', async () => {
    const api = await loadFreshApi({ centralCfg: { redmineUrl: 'http://my-redmine.example.com:8080' } });
    global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    try {
      await api.request('/test');
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e.proxyUrl).toBe('https://my-redmine.example.com:8080/');
    }
  });
});

describe('fetchTimeEntryById', () => {
  it('returns the raw entry on success', async () => {
    const api = await loadFreshApi();
    global.fetch.mockResolvedValueOnce(jsonResponse({
      time_entry: { id: 77, hours: 1, spent_on: '2026-04-22' },
    }));
    const entry = await api.fetchTimeEntryById(77);
    expect(entry).toEqual({ id: 77, hours: 1, spent_on: '2026-04-22' });
    expect(global.fetch.mock.calls[0][0]).toContain('/time_entries/77.json');
  });

  it('returns null on 404 (error is swallowed)', async () => {
    const api = await loadFreshApi();
    global.fetch.mockResolvedValueOnce({ ok: false, status: 404 });
    const entry = await api.fetchTimeEntryById(404);
    expect(entry).toBeNull();
  });

  it('returns null when response has no time_entry field', async () => {
    const api = await loadFreshApi();
    global.fetch.mockResolvedValueOnce(jsonResponse({}));
    const entry = await api.fetchTimeEntryById(1);
    expect(entry).toBeNull();
  });

  it('returns null on network error (caught)', async () => {
    const api = await loadFreshApi();
    global.fetch.mockRejectedValueOnce(new TypeError('boom'));
    const entry = await api.fetchTimeEntryById(99);
    expect(entry).toBeNull();
  });
});

describe('resolveProjectIdentifier + fetchAllProjects pagination', () => {
  it('returns null for falsy projectId without hitting the network', async () => {
    const api = await loadFreshApi();
    const result = await api.resolveProjectIdentifier(null);
    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('paginates projects until a short page is returned, then resolves', async () => {
    const api = await loadFreshApi();
    // Page 1: full (100) — must trigger a second request
    const fullPage = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, identifier: `proj-${i + 1}`, name: `Project ${i + 1}` }));
    global.fetch.mockResolvedValueOnce(jsonResponse({ projects: fullPage }));
    // Page 2: short (less than limit) — terminates loop
    global.fetch.mockResolvedValueOnce(jsonResponse({
      projects: [{ id: 200, identifier: 'last-proj', name: 'Last' }],
    }));
    const id = await api.resolveProjectIdentifier(200);
    expect(id).toBe('last-proj');
    // Verify pagination offset in second call
    const urls = global.fetch.mock.calls.map(c => c[0]);
    expect(urls[0]).toContain('offset=0');
    expect(urls[1]).toContain('offset=100');
  });

  it('caches projects across calls (single network round-trip)', async () => {
    const api = await loadFreshApi();
    global.fetch.mockResolvedValueOnce(jsonResponse({
      projects: [{ id: 1, identifier: 'alpha', name: 'Alpha' }],
    }));
    await api.resolveProjectIdentifier(1);
    const callsBefore = global.fetch.mock.calls.length;
    await api.resolveProjectIdentifier(1);
    expect(global.fetch.mock.calls.length).toBe(callsBefore);
  });

  it('returns null for unknown project id after fetch', async () => {
    const api = await loadFreshApi();
    global.fetch.mockResolvedValueOnce(jsonResponse({
      projects: [{ id: 1, identifier: 'alpha', name: 'Alpha' }],
    }));
    const id = await api.resolveProjectIdentifier(999);
    expect(id).toBeNull();
  });

  it('resets the pending promise when fetch fails so a retry can succeed', async () => {
    const api = await loadFreshApi();
    // First call: projects fetch fails — promise is reset in the catch handler.
    global.fetch.mockRejectedValueOnce(new TypeError('net'));
    const first = await api.resolveProjectIdentifier(1);
    expect(first).toBeNull();
    // Second call: succeeds — proves _projectsPromise was cleared.
    global.fetch.mockResolvedValueOnce(jsonResponse({
      projects: [{ id: 1, identifier: 'retry-ok', name: 'Retry' }],
    }));
    const second = await api.resolveProjectIdentifier(1);
    expect(second).toBe('retry-ok');
  });

  it('handles project rows without identifier or name', async () => {
    const api = await loadFreshApi();
    global.fetch.mockResolvedValueOnce(jsonResponse({
      projects: [{ id: 1 }, { id: 2, identifier: 'has-id' }],
    }));
    expect(await api.resolveProjectIdentifier(1)).toBeNull();
    expect(await api.resolveProjectIdentifier(2)).toBe('has-id');
  });
});

describe('enrichEntry / enrichEntries', () => {
  it('returns the entry as-is when null/undefined', async () => {
    const api = await loadFreshApi();
    expect(await api.enrichEntry(null)).toBeNull();
    expect(await api.enrichEntry(undefined)).toBeUndefined();
  });

  it('fills in issueSubject when missing', async () => {
    const api = await loadFreshApi();
    global.fetch.mockResolvedValueOnce(jsonResponse({ issue: { id: 5, subject: 'Resolved subj' } }));
    const entry = { issueId: 5 };
    const result = await api.enrichEntry(entry);
    expect(result.issueSubject).toBe('Resolved subj');
  });

  it('fills in projectIdentifier when missing', async () => {
    const api = await loadFreshApi();
    // enrichEntry will trigger fetchAllProjects if projectIdentifier missing.
    global.fetch.mockResolvedValueOnce(jsonResponse({
      projects: [{ id: 7, identifier: 'web-app', name: 'Web' }],
    }));
    const result = await api.enrichEntry({ projectId: 7 });
    expect(result.projectIdentifier).toBe('web-app');
  });

  it('does not overwrite an existing issueSubject or projectIdentifier', async () => {
    const api = await loadFreshApi();
    const entry = { issueId: 5, issueSubject: 'kept', projectId: 1, projectIdentifier: 'kept-ident' };
    const result = await api.enrichEntry(entry);
    expect(result.issueSubject).toBe('kept');
    expect(result.projectIdentifier).toBe('kept-ident');
    // No fetch needed — both fields already set.
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('enrichEntries enriches every entry in the array and returns it', async () => {
    const api = await loadFreshApi();
    // enrichEntries runs entries in parallel via Promise.all. Each entry:
    //   1) await resolveIssueSubject (fires /issues/<id>.json immediately)
    //   2) await resolveProjectIdentifier (awaits the shared fetchAllProjects)
    // So the request order on the wire is:
    //   issue 10 lookup, issue 20 lookup, projects.json (deduped — single call).
    // Use a default mock so any unexpected call won't crash, then queue specific
    // responses by URL so order doesn't matter.
    global.fetch.mockImplementation(async (url) => {
      if (url.includes('/issues/10.json')) return jsonResponse({ issue: { id: 10, subject: 'Subj 10' } });
      if (url.includes('/issues/20.json')) return jsonResponse({ issue: { id: 20, subject: 'Subj 20' } });
      if (url.includes('/projects.json')) return jsonResponse({
        projects: [{ id: 1, identifier: 'p1', name: 'P1' }, { id: 2, identifier: 'p2', name: 'P2' }],
      });
      return jsonResponse({});
    });

    const entries = [
      { issueId: 10, projectId: 1 },
      { issueId: 20, projectId: 2 },
    ];
    const result = await api.enrichEntries(entries);
    expect(result).toBe(entries);
    expect(entries[0].issueSubject).toBe('Subj 10');
    expect(entries[0].projectIdentifier).toBe('p1');
    expect(entries[1].issueSubject).toBe('Subj 20');
    expect(entries[1].projectIdentifier).toBe('p2');
  });
});

describe('searchIssues — project-scoped fetch via findProjectIdsByWord', () => {
  it('fetches project-scoped issues when a word matches a known project identifier', async () => {
    const api = await loadFreshApi();

    // 1: fetchAllProjects — caches one project named/identified "alpha".
    global.fetch.mockResolvedValueOnce(jsonResponse({
      projects: [{ id: 11, identifier: 'alpha', name: 'Alpha Project' }],
    }));
    // 2: subject search — returns one issue.
    global.fetch.mockResolvedValueOnce(jsonResponse({
      issues: [{ id: 1, subject: 'alpha bug', project: { id: 11, name: 'Alpha Project', identifier: 'alpha' }, status: { name: 'Open' } }],
    }));
    // 3: project-scoped search — returns the SAME issue (tests dedup) plus a new one.
    global.fetch.mockResolvedValueOnce(jsonResponse({
      issues: [
        { id: 1, subject: 'alpha bug', project: { id: 11, name: 'Alpha Project', identifier: 'alpha' }, status: { name: 'Open' } },
        { id: 2, subject: 'alpha redesign', project: { id: 11, name: 'Alpha Project', identifier: 'alpha' }, status: { name: 'New' } },
      ],
    }));

    const results = await api.searchIssues('alpha');
    // dedup branch: id=1 should appear only once
    expect(results.map(r => r.id).sort()).toEqual([1, 2]);
    const projectScopedCall = global.fetch.mock.calls.find(c => c[0].includes('project_id=11'));
    expect(projectScopedCall).toBeTruthy();
  });

  it('matches a project by name (not just identifier)', async () => {
    const api = await loadFreshApi();
    // First call inside searchIssues is fetchAllProjects.
    global.fetch.mockResolvedValueOnce(jsonResponse({
      projects: [{ id: 22, identifier: 'unrelated-id', name: 'Beta Platform' }],
    }));
    // Subject search.
    global.fetch.mockResolvedValueOnce(jsonResponse({ issues: [] }));
    // Project-scoped search for project 22.
    global.fetch.mockResolvedValueOnce(jsonResponse({
      issues: [{ id: 99, subject: 'feat', project: { id: 22, name: 'Beta Platform', identifier: 'unrelated-id' }, status: { name: 'Open' } }],
    }));

    const results = await api.searchIssues('beta');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(99);
  });

  it('skips project-scoped fetch when more than 3 projects match', async () => {
    const api = await loadFreshApi();
    // Four projects all containing the word "shared" in their name.
    global.fetch.mockResolvedValueOnce(jsonResponse({
      projects: [
        { id: 1, identifier: 'a', name: 'shared one' },
        { id: 2, identifier: 'b', name: 'shared two' },
        { id: 3, identifier: 'c', name: 'shared three' },
        { id: 4, identifier: 'd', name: 'shared four' },
      ],
    }));
    // Only the subject search should run after project listing.
    global.fetch.mockResolvedValueOnce(jsonResponse({ issues: [] }));

    const results = await api.searchIssues('shared');
    expect(results).toEqual([]);
    // Exactly 2 fetches: projects + subject search (no per-project fetches).
    expect(global.fetch.mock.calls.length).toBe(2);
  });

  it('back-fills projectIdentifier on search results from the project cache', async () => {
    const api = await loadFreshApi();
    // 1: fetchAllProjects caches identifier for project id 33.
    global.fetch.mockResolvedValueOnce(jsonResponse({
      projects: [{ id: 33, identifier: 'cached-ident', name: 'Cached' }],
    }));
    // 2: subject search returns an issue WITHOUT project.identifier (but with project.id).
    global.fetch.mockResolvedValueOnce(jsonResponse({
      issues: [
        { id: 7, subject: 'Cached match', project: { id: 33, name: 'Cached' }, status: { name: 'Open' } },
      ],
    }));
    const results = await api.searchIssues('cached');
    expect(results).toHaveLength(1);
    // enrichProjectIdentifiers populated this from the cache (lines 226-227).
    expect(results[0].projectIdentifier).toBe('cached-ident');
  });

  it('filters out issues that do not match every word in the query', async () => {
    const api = await loadFreshApi();
    global.fetch.mockResolvedValueOnce(jsonResponse({ projects: [] }));
    global.fetch.mockResolvedValueOnce(jsonResponse({
      issues: [
        { id: 1, subject: 'login bug', project: { name: 'Web', identifier: 'web' }, status: { name: 'Open' } },
        { id: 2, subject: 'logout bug', project: { name: 'Web', identifier: 'web' }, status: { name: 'Open' } },
      ],
    }));
    // Query has two words; only the first issue matches BOTH "login" and "bug".
    const results = await api.searchIssues('login bug');
    expect(results.map(r => r.id)).toEqual([1]);
  });
});

describe('mapTimeEntry — projectIdentifier source fallback', () => {
  it('prefers issue.project.identifier when present', async () => {
    const api = await loadFreshApi();
    const result = api.mapTimeEntry({
      id: 1, hours: 1, spent_on: '2026-04-22',
      issue: { id: 5, project: { identifier: 'from-issue' } },
      project: { id: 5, identifier: 'from-top' },
    });
    expect(result.projectIdentifier).toBe('from-issue');
  });

  it('falls back to top-level project.identifier when issue.project missing', async () => {
    const api = await loadFreshApi();
    const result = api.mapTimeEntry({
      id: 1, hours: 1, spent_on: '2026-04-22',
      issue: { id: 5 },
      project: { id: 5, identifier: 'from-top' },
    });
    expect(result.projectIdentifier).toBe('from-top');
  });

  it('returns null projectIdentifier when neither source has it', async () => {
    const api = await loadFreshApi();
    const result = api.mapTimeEntry({
      id: 1, hours: 1, spent_on: '2026-04-22',
    });
    expect(result.projectIdentifier).toBeNull();
  });
});

describe('createTimeEntry — endTime fallback when response omits easy_time_to', () => {
  it('keeps the explicit endTime we sent if response omits easy_time_to', async () => {
    const api = await loadFreshApi();
    // Response intentionally omits easy_time_to to exercise the fallback.
    global.fetch.mockResolvedValueOnce(jsonResponse({
      time_entry: {
        id: 500, hours: 1, spent_on: '2026-04-22',
        easy_time_from: '09:00:00',
        // easy_time_to deliberately missing
      },
    }, 201));
    const result = await api.createTimeEntry({
      issueId: 1, spentOn: '2026-04-22', hours: 1, activityId: 9, comment: '',
      startTime: '09:00', endTime: '10:30',
    });
    expect(result.endTime).toBe('10:30');
  });

  it('computes end time from hours when no explicit endTime and response omits it', async () => {
    const api = await loadFreshApi();
    global.fetch.mockResolvedValueOnce(jsonResponse({
      time_entry: { id: 501, hours: 2, spent_on: '2026-04-22', easy_time_from: '08:00:00' },
    }, 201));
    const result = await api.createTimeEntry({
      issueId: 1, spentOn: '2026-04-22', hours: 2, activityId: 9, comment: '',
      startTime: '08:00',
    });
    expect(result.endTime).toBe('10:00');
  });
});

describe('updateTimeEntry — endTime fallback when response omits easy_time_to', () => {
  it('falls back to explicit endTime when response omits easy_time_to', async () => {
    const api = await loadFreshApi();
    global.fetch.mockResolvedValueOnce(jsonResponse({
      time_entry: {
        id: 600, hours: 1, spent_on: '2026-04-22',
        easy_time_from: '13:00:00',
      },
    }));
    const result = await api.updateTimeEntry(600, {
      hours: 1, startTime: '13:00', endTime: '14:00', comment: '',
    });
    expect(result.endTime).toBe('14:00');
  });

  it('computes end time from hours when no explicit endTime', async () => {
    const api = await loadFreshApi();
    global.fetch.mockResolvedValueOnce(jsonResponse({
      time_entry: { id: 601, hours: 0.5, spent_on: '2026-04-22', easy_time_from: '15:00:00' },
    }));
    const result = await api.updateTimeEntry(601, {
      hours: 0.5, startTime: '15:00', comment: '',
    });
    expect(result.endTime).toBe('15:30');
  });

  it('uses hours=0 when computing endTime fallback and hours not supplied', async () => {
    // Exercises the `hours ?? 0` branch in updateTimeEntry's easy_time_to fallback.
    const api = await loadFreshApi();
    global.fetch.mockResolvedValueOnce(jsonResponse({
      time_entry: { id: 602, hours: 1, spent_on: '2026-04-22', easy_time_from: '10:00:00' },
    }));
    const result = await api.updateTimeEntry(602, {
      startTime: '10:00', comment: '',
    });
    expect(result.endTime).toBe('10:00');
  });
});

describe('formatProject', () => {
  it('returns name when identifier is empty', async () => {
    const api = await loadFreshApi();
    expect(api.formatProject(null, 'My Project')).toBe('My Project');
    expect(api.formatProject('', 'My Project')).toBe('My Project');
  });

  it('returns empty string when both identifier and name are empty', async () => {
    const api = await loadFreshApi();
    expect(api.formatProject('', '')).toBe('');
    expect(api.formatProject(null, undefined)).toBe('');
  });

  it('returns identifier alone when name is missing', async () => {
    const api = await loadFreshApi();
    expect(api.formatProject('short-id', '')).toBe('short-id');
    expect(api.formatProject('short-id', null)).toBe('short-id');
  });

  it('joins identifier and name with em-dash when both present', async () => {
    const api = await loadFreshApi();
    expect(api.formatProject('proj-id', 'My Name')).toBe('proj-id — My Name');
  });

  it('truncates an identifier longer than 20 chars with ellipsis', async () => {
    const api = await loadFreshApi();
    const longId = 'abcdefghijklmnopqrstuvwxyz';
    const formatted = api.formatProject(longId, 'Friendly');
    // First 20 chars + ellipsis + em-dash + name.
    expect(formatted).toBe(`${longId.slice(0, 20)}… — Friendly`);
  });

  it('does not truncate identifiers exactly 20 chars long', async () => {
    const api = await loadFreshApi();
    const id = 'a'.repeat(20);
    expect(api.formatProject(id, '')).toBe(id);
  });
});
