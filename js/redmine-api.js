import { readConfig }                  from './settings.js';
import { parseStartTag, applyStartTag } from './config.js';

// ── Typed error ───────────────────────────────────────────────────
export class RedmineError extends Error {
  constructor(message, status) {
    super(message);
    this.name    = 'RedmineError';
    this.status  = status ?? 0;
  }
}

// ── Base request ──────────────────────────────────────────────────

/**
 * Send a request through the configured proxy to Redmine.
 * Throws RedmineError on HTTP errors or network failures.
 */
export async function request(path, options = {}) {
  const cfg = readConfig();
  if (!cfg) throw new RedmineError('Not configured — please set your API key.', 0);

  const url = `${cfg.redmineUrl}${path}`;
  const headers = {
    'X-Redmine-API-Key': cfg.apiKey,
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers ?? {}),
  };

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new RedmineError('Network error — is the CORS proxy running?', 0);
  }

  // 401 → session expired, redirect to settings
  if (response.status === 401) {
    window.location.href = 'settings.html?expired=1';
    throw new RedmineError('Authentication expired.', 401);
  }

  if (response.status === 403) throw new RedmineError('Permission denied.', 403);
  if (response.status === 404) throw new RedmineError('Resource not found.', 404);

  if (response.status === 422) {
    let body;
    try { body = await response.json(); } catch { body = {}; }
    const msg = body.errors?.[0] ?? 'Validation error.';
    throw new RedmineError(msg, 422);
  }

  if (!response.ok) {
    throw new RedmineError(`Unexpected error (${response.status}).`, response.status);
  }

  // 200/201 with body
  if (response.status !== 200 && response.status !== 201) return null;
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

// ── User ──────────────────────────────────────────────────────────

/** Verify credentials and return current user info. */
export async function getCurrentUser() {
  const data = await request('/users/current.json');
  return data.user;
}

// ── Activities ────────────────────────────────────────────────────

let _activitiesCache = null;

/** Fetch time entry activities once per session, cache result. */
export async function getTimeEntryActivities() {
  if (_activitiesCache) return _activitiesCache;
  const data = await request('/enumerations/time_entry_activities.json');
  _activitiesCache = (data.time_entry_activities ?? []).map(a => ({
    id:        a.id,
    name:      a.name,
    isDefault: a.is_default ?? false,
  }));
  return _activitiesCache;
}

// ── Time entries ──────────────────────────────────────────────────

/** Fetch raw time entries for a date range. */
export async function fetchTimeEntries(from, to) {
  const data = await request(
    `/time_entries.json?user_id=me&from=${from}&to=${to}&limit=100`
  );
  const entries = data?.time_entries ?? [];
  // Validate minimal required fields
  return entries.filter(e => e.id && e.hours && e.spent_on);
}

// ── Issue subject resolution ───────────────────────────────────────
const _subjectCache = new Map();

/** Resolve issue subject by ID (cached). Returns fallback string on error. */
export async function resolveIssueSubject(issueId) {
  if (_subjectCache.has(issueId)) return _subjectCache.get(issueId);
  try {
    const data = await request(`/issues/${issueId}.json`);
    const subject = data?.issue?.subject ?? `Issue #${issueId}`;
    _subjectCache.set(issueId, subject);
    return subject;
  } catch {
    const fallback = `Issue #${issueId}`;
    _subjectCache.set(issueId, fallback);
    return fallback;
  }
}

// ── Issue search ──────────────────────────────────────────────────

/** Search Redmine issues by ID or title text. */
export async function searchIssues(query) {
  const q = String(query).trim();
  if (/^\d+$/.test(q)) {
    try {
      const data = await request(`/issues/${q}.json`);
      const issue = data?.issue;
      if (!issue) return [];
      return [{ id: issue.id, subject: issue.subject, projectName: issue.project?.name ?? '', status: issue.status?.name ?? '' }];
    } catch { return []; }
  }
  const encoded = encodeURIComponent(q);
  const data = await request(
    `/issues.json?subject=~${encoded}&status_id=open&limit=25&sort=updated_on:desc`
  );
  return (data?.issues ?? []).map(i => ({
    id:          i.id,
    subject:     i.subject,
    projectName: i.project?.name ?? '',
    status:      i.status?.name ?? '',
  }));
}

// ── CRUD ──────────────────────────────────────────────────────────

/** Create a new time entry in Redmine. Returns mapped TimeEntry. */
export async function createTimeEntry({ issueId, spentOn, hours, activityId, comment, startTime }) {
  const body = {
    time_entry: {
      issue_id:    issueId,
      spent_on:    spentOn,
      hours:       Math.round(hours * 4) / 4, // round to 0.25
      activity_id: activityId,
      comments:    applyStartTag(comment, startTime),
    },
  };
  const data = await request('/time_entries.json', {
    method: 'POST',
    body:   JSON.stringify(body),
  });
  return mapTimeEntry(data.time_entry);
}

/** Update an existing time entry. Returns mapped TimeEntry. */
export async function updateTimeEntry(id, { hours, activityId, comment, startTime, issueId, spentOn }) {
  const body = { time_entry: {} };
  if (hours       != null) body.time_entry.hours       = Math.round(hours * 4) / 4;
  if (activityId  != null) body.time_entry.activity_id = activityId;
  if (issueId     != null) body.time_entry.issue_id    = issueId;
  if (spentOn     != null) body.time_entry.spent_on    = spentOn;
  body.time_entry.comments = applyStartTag(comment ?? '', startTime ?? null);

  const data = await request(`/time_entries/${id}.json`, {
    method: 'PUT',
    body:   JSON.stringify(body),
  });
  // PUT returns 200 with updated entry
  return mapTimeEntry(data?.time_entry ?? { id });
}

/** Delete a time entry. Treats 404 as success. */
export async function deleteTimeEntry(id) {
  try {
    await request(`/time_entries/${id}.json`, { method: 'DELETE' });
  } catch (err) {
    if (err.status !== 404) throw err;
  }
}

// ── Mapping ───────────────────────────────────────────────────────

/**
 * Convert raw Redmine API time entry to local TimeEntry shape.
 * Validates required fields; returns null for invalid entries.
 */
export function mapTimeEntry(raw) {
  if (!raw || !raw.id || !raw.hours || !raw.spent_on) return null;

  const rawComment = raw.comments ?? '';
  const { startTime, comment } = parseStartTag(rawComment);

  return {
    id:           raw.id,
    date:         raw.spent_on,           // YYYY-MM-DD
    startTime,                            // HH:MM | null
    hours:        raw.hours,
    issueId:      raw.issue?.id ?? null,
    issueSubject: raw.issue?.subject ?? null,
    projectName:  raw.project?.name ?? null,
    activityId:   raw.activity?.id ?? null,
    activityName: raw.activity?.name ?? null,
    comment,
    _rawComment:  rawComment,
  };
}
