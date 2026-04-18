import { getCentralConfigSync, readCredentials } from './settings.js';
import { t }               from './i18n.js';

let _cachedCredentials = null;

export async function loadCredentials() {
  _cachedCredentials = await readCredentials();
  return _cachedCredentials;
}

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
  const centralCfg = getCentralConfigSync();
  if (!centralCfg) throw new RedmineError(t('error.not_configured'), 0);

  const creds = _cachedCredentials;
  if (!creds) throw new RedmineError(t('error.not_configured'), 0);

  const url = `${centralCfg.redmineUrl}${path}`;

  let authHeader;
  if (creds.authType === 'basic') {
    authHeader = { 'Authorization': 'Basic ' + btoa(`${creds.username}:${creds.password}`) };
  } else {
    authHeader = { 'X-Redmine-API-Key': creds.apiKey };
  }

  const headers = {
    ...authHeader,
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers ?? {}),
  };

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new RedmineError(t('error.network'), 0);
  }

  if (response.status === 401) {
    throw new RedmineError(t('error.auth_failed'), 401);
  }

  if (response.status === 403) throw new RedmineError(t('error.permission_denied'), 403);
  if (response.status === 404) throw new RedmineError(t('error.not_found'), 404);

  if (response.status === 422) {
    let body;
    try { body = await response.json(); } catch { body = {}; }
    const msg = body.errors?.[0] ?? t('error.validation');
    throw new RedmineError(msg, 422);
  }

  if (response.status === 503) {
    throw new RedmineError(t('error.server_unavailable'), 503);
  }

  if (!response.ok) {
    throw new RedmineError(t('error.unexpected', { status: String(response.status) }), response.status);
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
  const data = await request(`/time_entries.json?user_id=me&from=${from}&to=${to}&limit=100`);
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
    // Try exact ID lookup first; fall back to subject search if nothing found
    try {
      const data = await request(`/issues/${q}.json`);
      const issue = data?.issue;
      if (issue) return [{ id: issue.id, subject: issue.subject, projectName: issue.project?.name ?? '', status: issue.status?.name ?? '' }];
    } catch { /* fall through to subject search */ }
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
      comments:    comment ?? '',
      ...(startTime ? { easy_time_from: startTime, easy_time_to: calcEndTime(startTime, hours) } : {}),
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
  body.time_entry.comments    = comment ?? '';
  body.time_entry.easy_time_from = startTime ?? null;
  body.time_entry.easy_time_to   = startTime ? calcEndTime(startTime, hours ?? 0) : null;

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

// ── Time helpers ─────────────────────────────────────────────────

/** Calculate end time (HH:MM) from start time and duration in hours. */
function calcEndTime(startTime, hours) {
  const [h, m] = startTime.split(':').map(Number);
  const totalMins = h * 60 + m + Math.round(hours * 60);
  const endH = Math.floor(totalMins / 60) % 24;
  const endM = totalMins % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

// ── Mapping ───────────────────────────────────────────────────────

/**
 * Convert raw Redmine API time entry to local TimeEntry shape.
 * Validates required fields; returns null for invalid entries.
 */
export function mapTimeEntry(raw) {
  if (!raw || !raw.id || !raw.hours || !raw.spent_on) return null;

  const comment = raw.comments ?? '';
  const startTime = raw.easy_time_from
    ? raw.easy_time_from.slice(0, 5)
    : null;

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
    _rawComment:  raw.comments ?? '',
  };
}
