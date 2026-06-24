// Feedback ticket delivery (feature 049). Pure-logic module — no DOM access.
// Two channels: a Redmine REST path (reuses the stored API key via the shared
// `request()` client) and a GitHub prefilled-URL path (rides the user's own
// browser session — no GitHub credential is ever stored or transmitted).
//
// All diagnostic context is gated on `report.contextEnabled`; when false, only
// the feedback description and a minimal title reach the ticket. Network-log
// URLs are sanitized (FR-013) before they appear in any payload.

import { getCentralConfigSync } from './config-store.js';
import { request, RedmineError } from './redmine-api.js';
import { sanitizeNetworkUrl, buildEnvPairs } from './feedback-context.js';
import { t } from './i18n.js';

/** @typedef {import('./types').FeedbackReport} FeedbackReport */
/** @typedef {import('./types').FeedbackConfig} FeedbackConfig */
/** @typedef {import('./types').TicketOutcome} TicketOutcome */

/**
 * Maximum total length (characters) for the GitHub prefilled new-issue URL.
 * GitHub + browsers tolerate ~8 000; we keep a safety margin.
 */
const MAX_GITHUB_URL = 7800;

/**
 * GitHub issue etiquette per feedback category: a title prefix plus a default
 * label. `bug` / `enhancement` are GitHub's built-in default labels, so they
 * exist in every repository out of the box.
 */
const GITHUB_TITLE_PREFIX = { bug: '[Bug] ', suggestion: '[Feature] ' };
const GITHUB_LABEL = { bug: 'bug', suggestion: 'enhancement' };

// Re-export so callers (and tests) can reach the sanitizer through this module.
export { sanitizeNetworkUrl } from './feedback-context.js';

// ── Title + body builders (pure, testable) ────────────────────────

/**
 * Derive the ticket title from the feedback subject (≤ 255 chars), falling back
 * to the first description line and finally a localized generic title. The
 * subject is a mandatory dialog field, so the fallbacks only cover programmatic
 * callers and legacy reports.
 * @param {FeedbackReport} report
 * @returns {string}
 */
function _buildTitle(report) {
  const subject = (report.subject ?? '').trim();
  if (subject) return subject.slice(0, 255);
  const firstLine = (report.description ?? '').trim().split('\n')[0].trim();
  if (!firstLine) return t('feedback.fallback_title');
  return firstLine.slice(0, 255);
}

/**
 * HTML-escape user-provided text so it is safe to embed in the HTML issue body.
 * @param {*} text
 * @returns {string}
 */
function _esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Render the user description as HTML paragraphs: blank lines split paragraphs,
 * single newlines become `<br>`. Easy Redmine stores/renders descriptions as
 * HTML (its WYSIWYG editor), and standard Redmine's Markdown/Textile formatters
 * pass through these whitelisted tags — so HTML renders correctly on both.
 * @param {string} text
 * @returns {string}
 */
function _descHtml(text) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => `<p>${_esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

/**
 * Render the environment block as an HTML list (Redmine path).
 * @param {FeedbackReport} report
 * @returns {string}
 */
function _envHtml(report) {
  const items = buildEnvPairs(report).map(([k, v]) => `<li>${_esc(k)}: ${_esc(v)}</li>`);
  return `<ul>${items.join('')}</ul>`;
}

/**
 * Render the sanitized network log as an HTML table (Redmine path).
 * @param {import('./types').NetworkLogEntry[]} [networkLog]
 * @returns {string}
 */
function _networkHtml(networkLog) {
  if (!networkLog?.length) return '<p>None</p>';
  const rows = networkLog
    .map(
      (e) =>
        `<tr><td>${_esc(sanitizeNetworkUrl(e.url))}</td><td>${_esc(e.method)}</td>` +
        `<td>${e.status}</td><td>${e.ms}ms</td></tr>`
    )
    .join('');
  return (
    '<table><thead><tr><th>URL</th><th>Method</th><th>Status</th><th>Duration</th></tr></thead>' +
    `<tbody>${rows}</tbody></table>`
  );
}

/**
 * Build the textual environment block shared by both channels.
 * @param {FeedbackReport} report
 * @returns {string}
 */
function _envLines(report) {
  return buildEnvPairs(report)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');
}

/**
 * Render the sanitized network log as plain-text lines.
 * @param {import('./types').NetworkLogEntry[]} [networkLog]
 * @returns {string}
 */
function _networkLines(networkLog) {
  if (!networkLog?.length) return 'None';
  return networkLog
    .map((e) => `${sanitizeNetworkUrl(e.url)} | ${e.method} | ${e.status} | ${e.ms}ms`)
    .join('\n');
}

/**
 * Build the diagnostic-context sections (HTML) appended to a Redmine issue when
 * the user opts in.
 * @param {FeedbackReport} report
 * @returns {string[]}
 */
function _redmineContextHtml(report) {
  const parts = ['<hr>', '<h2>Environment</h2>', _envHtml(report)];

  const errorHtml = report.errors?.length
    ? `<ul>${report.errors
        .map(
          (e) => `<li>${_esc(e.message)}${e.stack ? `<br><code>${_esc(e.stack)}</code>` : ''}</li>`
        )
        .join('')}</ul>`
    : '<p>None</p>';
  parts.push('<hr>', '<h2>Error Log</h2>', errorHtml);

  parts.push('<hr>', '<h2>Network Log</h2>', _networkHtml(report.networkLog));

  const appLogHtml = report.appLog?.length
    ? `<pre>${_esc(
        report.appLog
          .map((e) => `[${e.level.toUpperCase()}] ${e.timestamp} ${e.message}`)
          .join('\n')
      )}</pre>`
    : '<p>None</p>';
  parts.push('<hr>', '<h2>App Log</h2>', appLogHtml);

  if (report.calendarState) {
    const { view, start, end } = report.calendarState;
    parts.push(
      '<hr>',
      '<h2>Calendar State</h2>',
      `<ul><li>View: ${_esc(view)}</li><li>Start: ${_esc(start)}</li><li>End: ${_esc(end)}</li></ul>`
    );
  }

  const snap = Object.entries(report.localStorageSnapshot ?? {});
  if (snap.length) {
    parts.push(
      '<hr>',
      '<h2>Storage Snapshot</h2>',
      `<ul>${snap.map(([k, v]) => `<li>${_esc(k)}: ${_esc(v)}</li>`).join('')}</ul>`
    );
  }
  return parts;
}

/**
 * Build the Redmine issue description (HTML). Easy Redmine renders descriptions
 * as HTML and standard Redmine passes whitelisted HTML tags through its
 * formatter, so HTML is the portable choice. Diagnostic sections are included
 * only when `report.contextEnabled` is true.
 * @param {FeedbackReport} report
 * @returns {string}
 */
export function buildRedmineIssueBody(report) {
  const category = report.category === 'bug' ? 'Bug Report' : 'Suggestion';
  const parts = [
    '<h2>Feedback</h2>',
    `<p><strong>Category:</strong> ${category}<br>`,
    `<strong>Submitted:</strong> ${_esc(report.timestamp)}</p>`,
    _descHtml(report.description),
  ];

  if (report.contextEnabled) {
    parts.push(..._redmineContextHtml(report));
  }

  return parts.join('\n');
}

/**
 * Build the GitHub prefilled-issue body (plain text). Includes diagnostic
 * context only when opted in; appends a manual-screenshot note in that case.
 * @param {FeedbackReport} report
 * @returns {string}
 */
function _buildGithubBody(report) {
  const category = report.category === 'bug' ? 'Bug Report' : 'Suggestion';
  const parts = [
    '## Feedback',
    '',
    `**Category**: ${category}`,
    `**Submitted**: ${report.timestamp}`,
    '',
    report.description,
  ];

  if (report.contextEnabled) {
    parts.push('', '---', '', '## Environment', '', _envLines(report));
    const errorText = report.errors?.length
      ? report.errors.map((e) => `- ${e.message}`).join('\n')
      : 'None';
    parts.push('', '## Errors', '', errorText);
    parts.push('', '## Network', '', _networkLines(report.networkLog));
    const appLogText = report.appLog?.length
      ? report.appLog.map((e) => `[${e.level.toUpperCase()}] ${e.message}`).join('\n')
      : 'None';
    parts.push('', '## App Log', '', appLogText);
  }

  // The screenshot is independent of the diagnostic-context opt-in: GitHub
  // cannot receive the binary via a prefilled URL, so prompt a manual paste
  // whenever the user captured one.
  if (report.screenshotDataUrl) {
    parts.push('', '---', '', `*(${t('feedback.screenshot_manual_note')})*`);
  }

  return parts.join('\n');
}

// ── GitHub prefilled URL (pure, testable) ─────────────────────────

/**
 * Build the GitHub prefilled "new issue" URL. The body is truncated with a
 * clear marker when the encoded URL would exceed the safe length budget.
 * @param {FeedbackReport} report
 * @param {FeedbackConfig} cfg
 * @returns {string}
 */
export function buildGithubUrl(report, cfg) {
  const base = `https://github.com/${cfg.githubOwner}/${cfg.githubRepo}/issues/new`;
  const prefix = GITHUB_TITLE_PREFIX[report.category] ?? '';
  const encodedTitle = encodeURIComponent(prefix + _buildTitle(report));
  const label = GITHUB_LABEL[report.category];
  const labelSuffix = label ? `&labels=${encodeURIComponent(label)}` : '';
  let body = _buildGithubBody(report);

  const urlLength = (b) =>
    `${base}?title=${encodedTitle}&body=${encodeURIComponent(b)}${labelSuffix}`.length;

  if (urlLength(body) > MAX_GITHUB_URL) {
    const marker = '\n[…truncated]';
    // Shrink the body until the whole URL (with the marker) fits the budget.
    while (body.length > 0 && urlLength(body + marker) > MAX_GITHUB_URL) {
      body = body.slice(0, Math.max(0, body.length - 100));
    }
    body += marker;
  }

  return `${base}?title=${encodedTitle}&body=${encodeURIComponent(body)}${labelSuffix}`;
}

/**
 * Open GitHub's prefilled new-issue form in a new tab. The user's own GitHub
 * session authorises the eventual submission — the app holds no GitHub token.
 * @param {FeedbackReport} report
 * @param {FeedbackConfig} cfg
 * @returns {void}
 */
export function openGithubForm(report, cfg) {
  window.open(buildGithubUrl(report, cfg), '_blank', 'noopener');
}

// ── Redmine ticket creation ───────────────────────────────────────

/**
 * Resolve the Redmine tracker_id for a report's category from the feedback
 * config. Returns `undefined` when no tracker is configured (the project's
 * default tracker then applies).
 * @param {FeedbackReport} report
 * @param {FeedbackConfig} cfg
 * @returns {number|undefined}
 */
function _redmineTrackerId(report, cfg) {
  return report.category === 'bug' ? cfg.redmineTrackerBug : cfg.redmineTrackerSuggestion;
}

/**
 * Decode a `data:image/png;base64,…` URL into a binary Blob for upload.
 * @param {string} dataUrl
 * @returns {Blob}
 */
function _dataUrlToBlob(dataUrl) {
  const b64 = dataUrl.split(',')[1] ?? '';
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: 'application/octet-stream' });
}

/**
 * Upload the screenshot to Redmine and return its upload token, or `null` on
 * failure (the ticket is still created without the attachment in that case).
 * Reuses the shared `request()` client, overriding the content type to binary.
 * @param {string} dataUrl
 * @returns {Promise<string|null>}
 */
async function _uploadScreenshot(dataUrl) {
  try {
    const blob = _dataUrlToBlob(dataUrl);
    const result = await request('/uploads.json', {
      method: 'POST',
      body: blob,
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    return result?.upload?.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Create a Redmine issue from a feedback report. Uploads the screenshot first
 * (when context is opted in) and references it in the issue payload; a failed
 * upload degrades gracefully to a text-only ticket.
 * @param {FeedbackReport} report
 * @param {FeedbackConfig} cfg
 * @returns {Promise<TicketOutcome>}
 */
export async function createRedmineTicket(report, cfg) {
  let uploadToken = null;
  if (report.screenshotDataUrl) {
    uploadToken = await _uploadScreenshot(report.screenshotDataUrl);
  }

  const issue = {
    project_id: cfg.redmineProjectId,
    subject: _buildTitle(report),
    description: buildRedmineIssueBody(report),
  };
  const trackerId = _redmineTrackerId(report, cfg);
  if (trackerId != null) issue.tracker_id = trackerId;
  if (uploadToken) {
    issue.uploads = [{ token: uploadToken, filename: 'screenshot.png', content_type: 'image/png' }];
  }

  try {
    const created = await request('/issues.json', {
      method: 'POST',
      body: JSON.stringify({ issue }),
    });
    const id = created?.issue?.id;
    const central = getCentralConfigSync();
    const linkBase = central?.redmineServerUrl ?? central?.redmineUrl ?? '';
    return { ok: true, ticketUrl: `${linkBase}/issues/${id}` };
  } catch (err) {
    return { ok: false, message: _creationErrorMessage(err) };
  }
}

/**
 * Map an issue-creation error to a user-facing message. A 404 almost always
 * means the configured feedback project_id is invalid, so it gets a project
 * specific hint instead of the generic "API disabled / check proxy" message.
 * @param {*} err
 * @returns {string}
 */
function _creationErrorMessage(err) {
  if (err instanceof RedmineError) {
    return err.status === 404 ? t('feedback.project_not_found') : err.message;
  }
  return err?.message ?? String(err);
}
