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
import { sanitizeNetworkUrl } from './feedback-context.js';
import { t } from './i18n.js';

/** @typedef {import('./types').FeedbackReport} FeedbackReport */
/** @typedef {import('./types').FeedbackConfig} FeedbackConfig */
/** @typedef {import('./types').TicketOutcome} TicketOutcome */

/**
 * Maximum total length (characters) for the GitHub prefilled new-issue URL.
 * GitHub + browsers tolerate ~8 000; we keep a safety margin.
 */
const MAX_GITHUB_URL = 7800;

// Re-export so callers (and tests) can reach the sanitizer through this module.
export { sanitizeNetworkUrl } from './feedback-context.js';

// ── Title + body builders (pure, testable) ────────────────────────

/**
 * Derive a ticket title from the feedback description (first line, ≤ 255 chars),
 * falling back to a localized generic title when the description is empty.
 * @param {FeedbackReport} report
 * @returns {string}
 */
function _buildTitle(report) {
  const firstLine = (report.description ?? '').trim().split('\n')[0].trim();
  if (!firstLine) return t('feedback.fallback_title');
  return firstLine.slice(0, 255);
}

/**
 * Build the textual environment block shared by both channels.
 * @param {FeedbackReport} report
 * @returns {string}
 */
function _envLines(report) {
  return [
    `- App URL: ${report.pageUrl}`,
    `- User Agent: ${report.userAgent}`,
    `- OS: ${report.os}`,
    `- Viewport: ${report.viewportWidth} × ${report.viewportHeight}`,
  ].join('\n');
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
 * Build the Redmine issue description (Markdown). Diagnostic sections are
 * included only when `report.contextEnabled` is true.
 * @param {FeedbackReport} report
 * @returns {string}
 */
export function buildRedmineIssueBody(report) {
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
      ? report.errors.map((e) => `- ${e.message}${e.stack ? `\n  ${e.stack}` : ''}`).join('\n')
      : 'None';
    parts.push('', '---', '', '## Error Log', '', errorText);

    parts.push('', '---', '', '## Network Log', '', _networkLines(report.networkLog));

    const appLogText = report.appLog?.length
      ? report.appLog
          .map((e) => `[${e.level.toUpperCase()}] ${e.timestamp} ${e.message}`)
          .join('\n')
      : 'None';
    parts.push('', '---', '', '## App Log', '', '```', appLogText, '```');

    if (report.calendarState) {
      const { view, start, end } = report.calendarState;
      parts.push(
        '',
        '---',
        '',
        '## Calendar State',
        '',
        `- View: ${view}`,
        `- Start: ${start}`,
        `- End: ${end}`
      );
    }

    const snap = Object.entries(report.localStorageSnapshot ?? {});
    if (snap.length) {
      parts.push('', '---', '', '## Storage Snapshot', '', ...snap.map(([k, v]) => `- ${k}: ${v}`));
    }
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
  const title = _buildTitle(report);
  const encodedTitle = encodeURIComponent(title);
  let body = _buildGithubBody(report);

  const urlLength = (b) => `${base}?title=${encodedTitle}&body=${encodeURIComponent(b)}`.length;

  if (urlLength(body) > MAX_GITHUB_URL) {
    const marker = '\n[…truncated]';
    // Shrink the body until the whole URL (with the marker) fits the budget.
    while (body.length > 0 && urlLength(body + marker) > MAX_GITHUB_URL) {
      body = body.slice(0, Math.max(0, body.length - 100));
    }
    body += marker;
  }

  return `${base}?title=${encodedTitle}&body=${encodeURIComponent(body)}`;
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
  if (report.contextEnabled && report.screenshotDataUrl) {
    uploadToken = await _uploadScreenshot(report.screenshotDataUrl);
  }

  const issue = {
    project_id: cfg.redmineProjectId,
    subject: _buildTitle(report),
    description: buildRedmineIssueBody(report),
  };
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
    const message = err instanceof RedmineError ? err.message : (err?.message ?? String(err));
    return { ok: false, message };
  }
}
