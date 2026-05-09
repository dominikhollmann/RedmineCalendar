import { getCentralConfigSync, readCredentials } from './settings.js';
import { t }               from './i18n.js';

let _cachedCredentials = null;

export async function loadCredentials() {
  _cachedCredentials = await readCredentials();
  return _cachedCredentials;
}

export function invalidateCredentialsCache() {
  _cachedCredentials = null;
}

// ── Typed error ───────────────────────────────────────────────────
export class RedmineError extends Error {
  constructor(message, status) {
    super(message);
    this.name    = 'RedmineError';
    this.status  = status ?? 0;
  }
}

function httpsOrigin(url) {
  try {
    return `https://${new URL(url).host}/`;
  } catch {
    return url;
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

  if (!_cachedCredentials) await loadCredentials();
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
    const proxyUrl = httpsOrigin(centralCfg.redmineUrl);
    const err = new RedmineError(t('error.network', { proxyUrl }), 0);
    err.proxyUrl = proxyUrl;
    throw err;
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
  // hours=0 is valid (feature 025 break entries); filter only structurally invalid rows.
  return entries.filter(e => e.id && e.hours != null && e.spent_on);
}

/** Fetch a single time entry by ID. Returns raw entry or null. */
export async function fetchTimeEntryById(id) {
  try {
    const data = await request(`/time_entries/${id}.json`);
    return data?.time_entry ?? null;
  } catch { return null; }
}

// ── Project identifier resolution ──────────────────────────────────
const _projectCache = new Map();
const _projectNameCache = new Map();
let _projectsPromise = null;

function fetchAllProjects() {
  if (!_projectsPromise) {
    _projectsPromise = (async () => {
      let offset = 0;
      const limit = 100;
      while (true) {
        const data = await request(`/projects.json?limit=${limit}&offset=${offset}`);
        const projects = data?.projects ?? [];
        for (const p of projects) {
          _projectCache.set(p.id, p.identifier ?? null);
          if (p.name) _projectNameCache.set(p.id, p.name);
        }
        if (projects.length < limit) break;
        offset += limit;
      }
    })().catch(() => { _projectsPromise = null; });
  }
  return _projectsPromise;
}

export async function resolveProjectIdentifier(projectId) {
  if (!projectId) return null;
  await fetchAllProjects();
  return _projectCache.get(projectId) ?? null;
}

// ── Issue subject resolution ───────────────────────────────────────
const _subjectCache = new Map();

/** Resolve issue subject by ID (cached). Returns fallback string on error. */
export async function resolveIssueSubject(issueId) {
  if (_subjectCache.has(issueId)) return _subjectCache.get(issueId);
  try {
    const data = await request(`/issues/${issueId}.json`);
    const subject = data?.issue?.subject ?? t('entry.fallback_subject', { id: issueId });
    _subjectCache.set(issueId, subject);
    return subject;
  } catch {
    const fallback = t('entry.fallback_subject', { id: issueId });
    _subjectCache.set(issueId, fallback);
    return fallback;
  }
}

// ── Entry enrichment ─────────────────────────────────────────────

export async function enrichEntry(entry) {
  if (!entry) return entry;
  if (!entry.issueSubject && entry.issueId) {
    entry.issueSubject = await resolveIssueSubject(entry.issueId);
  }
  if (!entry.projectIdentifier && entry.projectId) {
    entry.projectIdentifier = await resolveProjectIdentifier(entry.projectId);
  }
  return entry;
}

export async function enrichEntries(entries) {
  await Promise.all(entries.map(enrichEntry));
  return entries;
}

// ── Issue search ──────────────────────────────────────────────────

function mapIssueResult(issue) {
  return {
    id:                issue.id,
    subject:           issue.subject,
    projectId:         issue.project?.id ?? null,
    projectName:       issue.project?.name ?? '',
    projectIdentifier: issue.project?.identifier ?? null,
    status:            issue.status?.name ?? '',
  };
}

async function enrichProjectIdentifiers(results) {
  await fetchAllProjects();
  for (const r of results) {
    if (!r.projectIdentifier && r.projectId) {
      r.projectIdentifier = _projectCache.get(r.projectId) ?? null;
    }
  }
  return results;
}

function findProjectIdsByWord(word) {
  const lower = word.toLowerCase();
  const ids = new Set();
  for (const [id, identifier] of _projectCache.entries()) {
    if (identifier && identifier.toLowerCase().includes(lower)) ids.add(id);
  }
  for (const [id, name] of _projectNameCache.entries()) {
    if (name.toLowerCase().includes(lower)) ids.add(id);
  }
  return ids;
}

function matchesAllWords(issue, words) {
  const haystack = [
    issue.subject,
    issue.projectName,
    issue.projectIdentifier,
  ].filter(Boolean).join(' ').toLowerCase();
  return words.every(w => haystack.includes(w.toLowerCase()));
}

async function searchById(q) {
  const id = q.startsWith('#') ? q.slice(1) : q;
  try {
    const data = await request(`/issues/${id}.json`);
    if (data?.issue) return enrichProjectIdentifiers([mapIssueResult(data.issue)]);
  } catch { /* not found */ }
  return /^#/.test(q) ? [] : null;
}

async function fetchCandidates(words) {
  const seen = new Set();
  const candidates = [];

  function collect(issues) {
    for (const issue of issues ?? []) {
      if (!seen.has(issue.id)) {
        seen.add(issue.id);
        candidates.push(mapIssueResult(issue));
      }
    }
  }

  const subjectUrl = `/issues.json?subject=~${encodeURIComponent(words[0])}&status_id=open&limit=25&sort=updated_on:desc`;

  const projectIds = new Set();
  for (const w of words) {
    for (const pid of findProjectIdsByWord(w)) projectIds.add(pid);
  }

  const fetches = [request(subjectUrl).then(d => collect(d?.issues))];
  if (projectIds.size > 0 && projectIds.size <= 3) {
    for (const pid of projectIds) {
      fetches.push(
        request(`/issues.json?project_id=${pid}&status_id=open&limit=25&sort=updated_on:desc`)
          .then(d => collect(d?.issues))
      );
    }
  }
  await Promise.all(fetches);

  return candidates;
}

/** Search Redmine issues. Each space-separated word is AND-matched against subject, project name, or identifier. */
export async function searchIssues(query) {
  const q = String(query).trim();

  if (/^#?\d+$/.test(q)) {
    const result = await searchById(q);
    if (result) return result;
  }

  await fetchAllProjects();
  const words = q.split(/\s+/).filter(Boolean);
  const candidates = await fetchCandidates(words);
  const enriched = await enrichProjectIdentifiers(candidates);
  return enriched.filter(issue => matchesAllWords(issue, words));
}

// ── CRUD ──────────────────────────────────────────────────────────

// Round to 0.25 except for sub-quarter break placeholders (e.g. 0.01h when
// Redmine rejects hours=0). Values <= 0 stay 0; 0 < h < 0.25 is preserved
// verbatim; everything else rounds to the nearest 0.25.
function roundHours(h) {
  if (h <= 0) return 0;
  if (h < 0.25) return h;
  return Math.round(h * 4) / 4;
}

/** Create a new time entry in Redmine. Returns mapped TimeEntry. */
export async function createTimeEntry({ issueId, spentOn, hours, activityId, comment, startTime, endTime }) {
  const body = {
    time_entry: {
      issue_id:    issueId,
      spent_on:    spentOn,
      hours:       roundHours(hours),
      activity_id: activityId,
      comments:    comment ?? '',
      ...(startTime ? {
        easy_time_from: startTime,
        easy_time_to:   endTime ?? calcEndTime(startTime, hours),
      } : {}),
    },
  };
  const data = await request('/time_entries.json', {
    method: 'POST',
    body:   JSON.stringify(body),
  });
  const saved = mapTimeEntry(data.time_entry);
  // Easy Redmine occasionally omits easy_time_to in the POST response; fall
  // back to the value we sent so the calendar render gets the right end.
  if (saved && startTime && !saved.endTime) {
    saved.endTime = endTime ?? calcEndTime(startTime, hours);
  }
  return saved;
}

/** Update an existing time entry. Returns mapped TimeEntry. */
export async function updateTimeEntry(id, { hours, activityId, comment, startTime, endTime, issueId, spentOn }) {
  const body = { time_entry: {} };
  if (hours       != null) body.time_entry.hours       = roundHours(hours);
  if (activityId  != null) body.time_entry.activity_id = activityId;
  if (issueId     != null) body.time_entry.issue_id    = issueId;
  if (spentOn     != null) body.time_entry.spent_on    = spentOn;
  body.time_entry.comments    = comment ?? '';
  body.time_entry.easy_time_from = startTime ?? null;
  body.time_entry.easy_time_to   = startTime ? (endTime ?? calcEndTime(startTime, hours ?? 0)) : null;

  const data = await request(`/time_entries/${id}.json`, {
    method: 'PUT',
    body:   JSON.stringify(body),
  });
  // PUT returns 200 with updated entry
  const saved = mapTimeEntry(data?.time_entry ?? { id });
  // Same fallback as createTimeEntry: persist the end time we sent if the
  // response omits easy_time_to.
  if (saved && startTime && !saved.endTime) {
    saved.endTime = endTime ?? calcEndTime(startTime, hours ?? 0);
  }
  return saved;
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

// ── Project display ──────────────────────────────────────────────
const PROJECT_ID_MAX_LEN = 20;

export function formatProject(identifier, name) {
  if (!identifier) return name ?? '';
  const display = identifier.length > PROJECT_ID_MAX_LEN
    ? identifier.slice(0, PROJECT_ID_MAX_LEN) + '\u2026'
    : identifier;
  return name ? `${display} \u2014 ${name}` : display;
}

// ── Mapping ───────────────────────────────────────────────────────

/**
 * Convert raw Redmine API time entry to local TimeEntry shape.
 * Validates required fields; returns null for invalid entries.
 */
export function mapTimeEntry(raw) {
  // hours=0 is valid for break entries (feature 025); only filter on truly
  // missing required fields.
  if (!raw || !raw.id || raw.hours == null || !raw.spent_on) return null;

  const comment = raw.comments ?? '';
  const startTime = raw.easy_time_from
    ? raw.easy_time_from.slice(0, 5)
    : null;
  const endTime = raw.easy_time_to
    ? raw.easy_time_to.slice(0, 5)
    : null;

  return {
    id:           raw.id,
    date:         raw.spent_on,           // YYYY-MM-DD
    startTime,                            // HH:MM | null
    endTime,                              // HH:MM | null
    hours:        raw.hours,
    issueId:      raw.issue?.id ?? null,
    issueSubject: raw.issue?.subject ?? null,
    projectId:         raw.project?.id ?? null,
    projectName:       raw.project?.name ?? null,
    projectIdentifier: raw.issue?.project?.identifier ?? raw.project?.identifier ?? null,
    activityId:   raw.activity?.id ?? null,
    activityName: raw.activity?.name ?? null,
    comment,
    _rawComment:  raw.comments ?? '',
  };
}
