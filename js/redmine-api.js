import { getCentralConfigSync, readCredentials } from './config-store.js';
import { t } from './i18n.js';

/** @typedef {import('./types').Credentials} Credentials */
/** @typedef {import('./types').TimeEntry} TimeEntry */
/** @typedef {import('./types').IssueResult} IssueResult */
/** @typedef {import('./types').Activity} Activity */

/** @type {Credentials|null} */
let _cachedCredentials = null;

/**
 * Decrypt and cache the user's credentials. Subsequent calls hit the cache.
 * @returns {Promise<Credentials|null>}
 */
export async function loadCredentials() {
  _cachedCredentials = await readCredentials();
  return _cachedCredentials;
}

/**
 * Drop the cached credentials so the next call re-reads from storage.
 * @returns {void}
 */
export function invalidateCredentialsCache() {
  _cachedCredentials = null;
}

// ── Typed error ───────────────────────────────────────────────────
/**
 * Error subclass for Redmine API failures. Carries the HTTP status (or 0 for
 * network failures) and an optional `proxyUrl` set by `performFetch()` for
 * UI link rendering.
 */
export class RedmineError extends Error {
  /**
   * @param {string} message
   * @param {number} [status]
   */
  constructor(message, status) {
    super(message);
    this.name = 'RedmineError';
    /** @type {number} */
    this.status = status ?? 0;
    /** @type {string|undefined} */
    this.proxyUrl = undefined;
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

function buildAuthHeader(creds) {
  if (creds.authType === 'basic') {
    return { Authorization: 'Basic ' + btoa(`${creds.username}:${creds.password}`) };
  }
  return { 'X-Redmine-API-Key': creds.apiKey };
}

async function performFetch(url, options, headers, redmineUrl) {
  try {
    return await fetch(url, { ...options, headers });
  } catch {
    const proxyUrl = httpsOrigin(redmineUrl);
    const err = new RedmineError(t('error.network', { proxyUrl }), 0);
    err.proxyUrl = proxyUrl;
    throw err;
  }
}

async function build422Error(response) {
  let body;
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  return new RedmineError(body.errors?.[0] ?? t('error.validation'), 422);
}

const _simpleStatusErrors = {
  401: () => new RedmineError(t('error.auth_failed'), 401),
  403: () => new RedmineError(t('error.permission_denied'), 403),
  404: () => new RedmineError(t('error.not_found'), 404),
  503: () => new RedmineError(t('error.server_unavailable'), 503),
};

async function throwForErrorStatus(response) {
  const simple = _simpleStatusErrors[response.status];
  if (simple) throw simple();
  if (response.status === 422) throw await build422Error(response);
  if (!response.ok) {
    throw new RedmineError(
      t('error.unexpected', { status: String(response.status) }),
      response.status
    );
  }
}

async function parseSuccessBody(response) {
  if (response.status !== 200 && response.status !== 201) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Send a request through the configured proxy to Redmine.
 * @param {string} path                    URL path (relative to `centralConfig.redmineUrl`).
 * @param {RequestInit} [options]          Fetch options. JSON `Content-Type` is added when body is present.
 * @returns {Promise<any>}                 Parsed JSON body, or `null` for 204/empty responses.
 * @throws {RedmineError}                  On HTTP errors or network failures.
 */
export async function request(path, options = {}) {
  const centralCfg = getCentralConfigSync();
  if (!centralCfg) throw new RedmineError(t('error.not_configured'), 0);

  if (!_cachedCredentials) await loadCredentials();
  const creds = _cachedCredentials;
  if (!creds) throw new RedmineError(t('error.not_configured'), 0);

  const headers = {
    ...buildAuthHeader(creds),
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers ?? {}),
  };

  const response = await performFetch(
    `${centralCfg.redmineUrl}${path}`,
    options,
    headers,
    centralCfg.redmineUrl
  );

  await throwForErrorStatus(response);
  return parseSuccessBody(response);
}

// ── User ──────────────────────────────────────────────────────────

/**
 * Verify credentials and return current user info from `/users/current.json`.
 * @returns {Promise<any>} The Redmine `user` object.
 * @throws {RedmineError}
 */
export async function getCurrentUser() {
  const data = await request('/users/current.json');
  return data.user;
}

// ── Activities ────────────────────────────────────────────────────

/** @type {Activity[]|null} */
let _activitiesCache = null;

/**
 * Fetch time-entry activities once per session and cache the result.
 * @returns {Promise<Activity[]>}
 */
export async function getTimeEntryActivities() {
  if (_activitiesCache) return _activitiesCache;
  const data = await request('/enumerations/time_entry_activities.json');
  _activitiesCache = (data.time_entry_activities ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    isDefault: a.is_default ?? false,
  }));
  return /** @type {Activity[]} */ (_activitiesCache);
}

// ── Time entries ──────────────────────────────────────────────────

/**
 * Fetch raw time entries for a date range. `hours=0` is preserved (feature 025
 * break entries); only structurally invalid rows are filtered out.
 * @param {string} from  YYYY-MM-DD inclusive
 * @param {string} to    YYYY-MM-DD inclusive
 * @returns {Promise<any[]>} Raw API entries (use `mapTimeEntry()` to convert).
 */
export async function fetchTimeEntries(from, to) {
  let offset = 0;
  const limit = 100;
  const all = [];
  while (true) {
    const data = await request(
      `/time_entries.json?user_id=me&from=${from}&to=${to}&limit=${limit}&offset=${offset}`
    );
    const entries = data?.time_entries ?? [];
    all.push(...entries);
    if (entries.length < limit) break;
    offset += limit;
  }
  // hours=0 is valid (feature 025 break entries); filter only structurally invalid rows.
  return all.filter((e) => e.id && e.hours != null && e.spent_on);
}

/**
 * Fetch a single time entry by ID.
 * @param {number|string} id
 * @returns {Promise<any>} The raw Redmine time entry.
 * @throws {RedmineError} On any HTTP or network failure — notably status 404
 *   when no entry with that ID exists. Consistent with every other public
 *   method in this module; callers branch on `error.status` as needed.
 */
export async function fetchTimeEntryById(id) {
  const { time_entry } = await request(`/time_entries/${id}.json`);
  return time_entry;
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
    })().catch(() => {
      _projectsPromise = null;
    });
  }
  return _projectsPromise;
}

/**
 * Look up the project identifier (`'my-project-x'`) for a numeric project ID.
 * Loads the projects index lazily on first call and caches it.
 * @param {number|null|undefined} projectId
 * @returns {Promise<string|null>}
 */
export async function resolveProjectIdentifier(projectId) {
  if (!projectId) return null;
  await fetchAllProjects();
  return _projectCache.get(projectId) ?? null;
}

// ── Issue subject resolution ───────────────────────────────────────
/** @type {Map<number, string>} */
const _subjectCache = new Map();

/**
 * Resolve a Redmine issue subject by ID. Cached per session; returns the
 * `entry.fallback_subject` translation on lookup failure.
 * @param {number} issueId
 * @returns {Promise<string>}
 */
export async function resolveIssueSubject(issueId) {
  if (_subjectCache.has(issueId)) return /** @type {string} */ (_subjectCache.get(issueId));
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

/**
 * Fill in `issueSubject` and `projectIdentifier` on a TimeEntry (mutating).
 * @template {TimeEntry|null|undefined} T
 * @param {T} entry
 * @returns {Promise<T>}
 */
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

/**
 * Enrich all entries in parallel.
 * @param {TimeEntry[]} entries
 * @returns {Promise<TimeEntry[]>}
 */
export async function enrichEntries(entries) {
  await Promise.all(entries.map(enrichEntry));
  return entries;
}

// ── Issue search ──────────────────────────────────────────────────

function mapIssueResult(issue) {
  return {
    id: issue.id,
    subject: issue.subject,
    projectId: issue.project?.id ?? null,
    projectName: issue.project?.name ?? '',
    projectIdentifier: issue.project?.identifier ?? null,
    status: issue.status?.name ?? '',
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
  const haystack = [issue.subject, issue.projectName, issue.projectIdentifier]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return words.every((w) => haystack.includes(w.toLowerCase()));
}

async function searchById(q) {
  const id = q.startsWith('#') ? q.slice(1) : q;
  try {
    const data = await request(`/issues/${id}.json`);
    if (data?.issue) return enrichProjectIdentifiers([mapIssueResult(data.issue)]);
  } catch {
    /* not found */
  }
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

  const fetches = [request(subjectUrl).then((d) => collect(d?.issues))];
  if (projectIds.size > 0 && projectIds.size <= 3) {
    for (const pid of projectIds) {
      fetches.push(
        request(`/issues.json?project_id=${pid}&status_id=open&limit=25&sort=updated_on:desc`).then(
          (d) => collect(d?.issues)
        )
      );
    }
  }
  await Promise.all(fetches);

  return candidates;
}

/**
 * Search Redmine issues. Each space-separated word is AND-matched against the
 * issue subject, project name, or project identifier.
 * @param {string} query
 * @returns {Promise<IssueResult[]>}
 */
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
  return enriched.filter((issue) => matchesAllWords(issue, words));
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

/**
 * Create a new time entry in Redmine.
 * @param {{issueId:number, spentOn:string, hours:number, activityId?:number, comment?:string, startTime?:string|null, endTime?:string|null}} payload
 * @returns {Promise<TimeEntry|null>} Mapped TimeEntry, or `null` if Redmine returns an unparsable body.
 * @throws {RedmineError}
 */
export async function createTimeEntry({
  issueId,
  spentOn,
  hours,
  activityId,
  comment,
  startTime,
  endTime,
}) {
  const body = {
    time_entry: {
      issue_id: issueId,
      spent_on: spentOn,
      hours: roundHours(hours),
      activity_id: activityId,
      comments: comment ?? '',
      ...(startTime
        ? {
            easy_time_from: startTime,
            easy_time_to: endTime ?? calcEndTime(startTime, hours),
          }
        : {}),
    },
  };
  const data = await request('/time_entries.json', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const saved = mapTimeEntry(data.time_entry);
  // Easy Redmine occasionally omits easy_time_to in the POST response; fall
  // back to the value we sent so the calendar render gets the right end.
  if (saved && startTime && !saved.endTime) {
    saved.endTime = endTime ?? calcEndTime(startTime, hours);
  }
  return saved;
}

/**
 * @param {{hours?: number, activityId?: number, comment?: string|null, startTime?: string|null, endTime?: string|null, issueId?: number, spentOn?: string}} fields
 */
function buildUpdateBody({ hours, activityId, comment, startTime, endTime, issueId, spentOn }) {
  /** @type {Record<string, any>} */
  const te = {};
  if (hours != null) te.hours = roundHours(hours);
  if (activityId != null) te.activity_id = activityId;
  if (issueId != null) te.issue_id = issueId;
  if (spentOn != null) te.spent_on = spentOn;
  te.comments = comment ?? '';
  te.easy_time_from = startTime ?? null;
  te.easy_time_to = startTime ? (endTime ?? calcEndTime(startTime, hours ?? 0)) : null;
  return { time_entry: te };
}

/**
 * Update an existing time entry. Only the supplied fields are sent.
 * @param {number} id
 * @param {{hours?:number, activityId?:number, comment?:string|null, startTime?:string|null, endTime?:string|null, issueId?:number, spentOn?:string}} fields
 * @returns {Promise<TimeEntry|null>}
 * @throws {RedmineError}
 */
export async function updateTimeEntry(id, fields) {
  const body = buildUpdateBody(fields);
  const data = await request(`/time_entries/${id}.json`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  // PUT returns 200 with updated entry
  const saved = mapTimeEntry(data?.time_entry ?? { id });
  // Same fallback as createTimeEntry: persist the end time we sent if the
  // response omits easy_time_to.
  const { hours, startTime, endTime } = fields;
  if (saved && startTime && !saved.endTime) {
    saved.endTime = endTime ?? calcEndTime(startTime, hours ?? 0);
  }
  return saved;
}

/**
 * Delete a time entry. A 404 response is treated as success (idempotent delete).
 * @param {number} id
 * @returns {Promise<void>}
 * @throws {RedmineError} for non-404 errors.
 */
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

/**
 * Build the project display string used throughout the UI: `'identifier — Name'`,
 * or just the name if no identifier exists. Long identifiers are truncated with
 * an ellipsis.
 * @param {string|null|undefined} identifier
 * @param {string|null|undefined} name
 * @returns {string}
 */
export function formatProject(identifier, name) {
  if (!identifier) return name ?? '';
  const display =
    identifier.length > PROJECT_ID_MAX_LEN
      ? identifier.slice(0, PROJECT_ID_MAX_LEN) + '\u2026'
      : identifier;
  return name ? `${display} \u2014 ${name}` : display;
}

// ── Mapping ───────────────────────────────────────────────────────

function isValidRawEntry(raw) {
  return !!(raw && raw.id && raw.hours != null && raw.spent_on);
}

function extractIssueFields(raw) {
  return {
    issueId: raw.issue?.id ?? null,
    issueSubject: raw.issue?.subject ?? null,
  };
}

function extractProjectFields(raw) {
  return {
    projectId: raw.project?.id ?? null,
    projectName: raw.project?.name ?? null,
    projectIdentifier: raw.issue?.project?.identifier ?? raw.project?.identifier ?? null,
  };
}

function extractActivityFields(raw) {
  return {
    activityId: raw.activity?.id ?? null,
    activityName: raw.activity?.name ?? null,
  };
}

function extractTimeFields(raw) {
  return {
    startTime: raw.easy_time_from ? raw.easy_time_from.slice(0, 5) : null,
    endTime: raw.easy_time_to ? raw.easy_time_to.slice(0, 5) : null,
  };
}

/**
 * Convert a raw Redmine API time entry to the local TimeEntry shape. Returns
 * `null` if required fields (`id`, `hours`, `spent_on`) are missing. Note that
 * `hours=0` is valid for break entries (feature 025).
 * @param {any} raw
 * @returns {(TimeEntry & {date:string, _rawComment:string})|null}
 */
export function mapTimeEntry(raw) {
  // hours=0 is valid for break entries (feature 025); only filter on truly
  // missing required fields.
  if (!isValidRawEntry(raw)) return null;

  const comment = raw.comments ?? '';
  return {
    id: raw.id,
    date: raw.spent_on, // YYYY-MM-DD
    ...extractTimeFields(raw),
    hours: raw.hours,
    ...extractIssueFields(raw),
    ...extractProjectFields(raw),
    ...extractActivityFields(raw),
    comment,
    _rawComment: comment,
  };
}
