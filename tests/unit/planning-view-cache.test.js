// T007: Unit tests for js/planning-view-cache.js
// These tests must FAIL before T008 implements the module.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// planning-view-cache.js has no external imports — no mocks needed.
import { cachedLookupIssue, clearCache } from '../../js/planning-view-cache.js';

function makeIssueInfo(subject = 'Test issue') {
  return { issueSubject: subject, projectName: 'MyProject', projectIdentifier: 'myproject' };
}

describe('cachedLookupIssue', () => {
  beforeEach(() => clearCache());

  it('calls fetchFn on cache miss and returns result', async () => {
    const fetchFn = vi.fn(async () => makeIssueInfo('Issue A'));
    const result = await cachedLookupIssue(42, fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result?.issueSubject).toBe('Issue A');
  });

  it('returns cached result on second call without invoking fetchFn again', async () => {
    const fetchFn = vi.fn(async () => makeIssueInfo('Issue B'));
    const r1 = await cachedLookupIssue(99, fetchFn);
    const r2 = await cachedLookupIssue(99, fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(r1?.issueSubject).toBe('Issue B');
    expect(r2?.issueSubject).toBe('Issue B');
  });

  it('caches null (issue-not-found) as a valid result', async () => {
    const fetchFn = vi.fn(async () => null);
    const r1 = await cachedLookupIssue(404, fetchFn);
    const r2 = await cachedLookupIssue(404, fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(r1).toBeNull();
    expect(r2).toBeNull();
  });

  it('does NOT cache on fetchFn throwing — second call retries (FR-017)', async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue(makeIssueInfo('Retry success'));

    await expect(cachedLookupIssue(77, fetchFn)).rejects.toThrow('network error');
    const result = await cachedLookupIssue(77, fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(result?.issueSubject).toBe('Retry success');
  });

  it('caches different ticketIds independently', async () => {
    const fetchFn = vi.fn(async (id) => makeIssueInfo(`Issue ${id}`));
    // Inject the id through a closure workaround since cachedLookupIssue doesn't pass id to fetchFn
    const result1 = await cachedLookupIssue(1, () => makeIssueInfo('Issue 1'));
    const result2 = await cachedLookupIssue(2, () => makeIssueInfo('Issue 2'));
    const result3 = await cachedLookupIssue(1, fetchFn); // cache hit for 1
    expect(result1?.issueSubject).toBe('Issue 1');
    expect(result2?.issueSubject).toBe('Issue 2');
    expect(result3?.issueSubject).toBe('Issue 1');
    expect(fetchFn).not.toHaveBeenCalled(); // third call was a cache hit
  });

  it('clearCache() resets all entries so next call re-fetches', async () => {
    const fetchFn = vi.fn(async () => makeIssueInfo('Before clear'));
    await cachedLookupIssue(42, fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    clearCache();

    const fetchFn2 = vi.fn(async () => makeIssueInfo('After clear'));
    await cachedLookupIssue(42, fetchFn2);
    expect(fetchFn2).toHaveBeenCalledTimes(1);
  });
});

// T027: Cross-column deduplication integration — simulates Outlook and Teams
// both requesting the same issue in the same planning session.
describe('cachedLookupIssue — cross-column deduplication (US4)', () => {
  beforeEach(() => clearCache());

  it('after either column caches the result, the other column gets it for free', async () => {
    const sharedFetch = vi.fn(async () => makeIssueInfo('Shared issue'));

    // Simulate Outlook column resolving first
    const outlookResult = await cachedLookupIssue(42, sharedFetch);
    // Simulate Teams column resolving second (cache should already be warm)
    const teamsResult = await cachedLookupIssue(42, sharedFetch);

    expect(sharedFetch).toHaveBeenCalledTimes(1);
    expect(outlookResult?.issueSubject).toBe('Shared issue');
    expect(teamsResult?.issueSubject).toBe('Shared issue');
  });
});
