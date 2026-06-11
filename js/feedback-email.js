// Pure HTML-email body builder for the feedback feature.
// No DOM access — inputs in, HTML string out.
import { t } from './i18n.js';

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Central email-body palette. The feedback email is a standalone HTML document
// rendered in the recipient's mail client, so it cannot reference CSS classes
// or resolve custom properties — inline literal colors are required.
// Per the 036 policy, all literals live in this single block.
const EMAIL_COLORS = {
  text: '#222',
  textSoft: '#333',
  muted: '#666',
  faint: '#888',
  border: '#ddd',
  headerBg: '#f5f5f5',
  danger: '#c00',
  onBadge: '#fff',
  bugBadge: '#c0392b',
  suggestionBadge: '#2980b9',
};

function _sectionHeader(title) {
  return `<h3 style="margin:1em 0 .3em;font-size:.9em;color:${EMAIL_COLORS.muted};border-bottom:1px solid ${EMAIL_COLORS.border}">${_esc(title)}</h3>`;
}

function _envTable(ctx) {
  return (
    `<table style="width:100%;font-size:.82em;border-collapse:collapse">` +
    `<tr><th style="text-align:left;padding:2px 4px;width:120px">URL</th><td style="padding:2px 4px;word-break:break-all">${_esc(ctx.pageUrl)}</td></tr>` +
    `<tr><th style="text-align:left;padding:2px 4px">User Agent</th><td style="padding:2px 4px;word-break:break-all">${_esc(ctx.userAgent)}</td></tr>` +
    `<tr><th style="text-align:left;padding:2px 4px">OS</th><td style="padding:2px 4px">${_esc(ctx.os)}</td></tr>` +
    `<tr><th style="text-align:left;padding:2px 4px">Viewport</th><td style="padding:2px 4px">${_esc(String(ctx.viewportWidth))} × ${_esc(String(ctx.viewportHeight))}</td></tr>` +
    `</table>`
  );
}

function _screenshotSection(screenshotDataUrl) {
  if (!screenshotDataUrl) {
    return `<p style="font-style:italic;color:${EMAIL_COLORS.faint}">${_esc(t('feedback.screenshot_unavailable'))}</p>`;
  }
  return `<img src="${_esc(screenshotDataUrl)}" style="max-width:100%;border:1px solid ${EMAIL_COLORS.border};border-radius:4px" alt="screenshot">`;
}

function _errorsSection(errors) {
  if (!errors || errors.length === 0) return '';
  const items = errors
    .map(
      (e) =>
        `<li><strong>${_esc(e.message)}</strong><br><small style="color:${EMAIL_COLORS.muted}">${_esc(e.timestamp)}</small>` +
        (e.stack
          ? `<pre style="font-size:.75em;overflow:auto;max-height:80px">${_esc(e.stack)}</pre>`
          : '') +
        '</li>'
    )
    .join('');
  return (
    _sectionHeader(t('feedback.section_errors')) +
    `<ol style="margin:0;padding-left:1.2em;font-size:.82em">${items}</ol>`
  );
}

function _networkSection(networkLog) {
  if (!networkLog || networkLog.length === 0) return '';
  const rows = networkLog
    .map((e) => {
      const fail = e.status === 0 || e.status >= 400;
      const color = fail ? ` style="color:${EMAIL_COLORS.danger}"` : '';
      return (
        `<tr${color}>` +
        `<td style="padding:2px 4px;word-break:break-all">${_esc(e.url)}</td>` +
        `<td style="padding:2px 4px">${_esc(e.method)}</td>` +
        `<td style="padding:2px 4px">${_esc(String(e.status))}</td>` +
        `<td style="padding:2px 4px">${_esc(String(e.ms))}ms</td>` +
        `</tr>`
      );
    })
    .join('');
  return (
    _sectionHeader(t('feedback.section_network')) +
    `<table style="width:100%;font-size:.78em;border-collapse:collapse">` +
    `<thead><tr style="background:${EMAIL_COLORS.headerBg}"><th style="padding:2px 4px;text-align:left">URL</th><th>Method</th><th>Status</th><th>ms</th></tr></thead>` +
    `<tbody>${rows}</tbody></table>`
  );
}

function _appLogSection(appLog) {
  if (!appLog || appLog.length === 0) return '';
  const lines = appLog
    .map((e) => `[${_esc(e.level.toUpperCase())}] ${_esc(e.timestamp)} ${_esc(e.message)}`)
    .join('\n');
  return (
    _sectionHeader(t('feedback.section_app_log')) +
    `<pre style="font-size:.75em;overflow:auto;max-height:100px;background:${EMAIL_COLORS.headerBg};padding:.4em">${lines}</pre>`
  );
}

function _calendarSection(calendarState) {
  if (!calendarState) return '';
  return (
    _sectionHeader(t('feedback.section_calendar')) +
    `<table style="width:100%;font-size:.82em;border-collapse:collapse">` +
    `<tr><td style="padding:2px 4px;width:80px"><strong>View</strong></td><td>${_esc(calendarState.view)}</td></tr>` +
    `<tr><td style="padding:2px 4px"><strong>Start</strong></td><td>${_esc(calendarState.start)}</td></tr>` +
    `<tr><td style="padding:2px 4px"><strong>End</strong></td><td>${_esc(calendarState.end)}</td></tr>` +
    `</table>`
  );
}

function _storageSection(snap) {
  if (!snap || Object.keys(snap).length === 0) return '';
  const rows = Object.entries(snap)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:2px 4px;word-break:break-all">${_esc(k)}</td><td style="padding:2px 4px;word-break:break-all">${_esc(v)}</td></tr>`
    )
    .join('');
  return (
    _sectionHeader(t('feedback.section_storage')) +
    `<table style="width:100%;font-size:.78em;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:2px 4px">Key</th><th style="text-align:left;padding:2px 4px">Value</th></tr></thead><tbody>${rows}</tbody></table>`
  );
}

/** Build the full HTML email body for a FeedbackReport. */
export function _buildHtmlBody(report, ctx) {
  const isBug = report.category === 'bug';
  const categoryLabel = isBug ? t('feedback.category_bug') : t('feedback.category_suggestion');
  const badgeColor = isBug ? EMAIL_COLORS.bugBadge : EMAIL_COLORS.suggestionBadge;

  let html =
    `<html><body style="font-family:sans-serif;font-size:14px;color:${EMAIL_COLORS.text};max-width:700px">` +
    `<p><span style="background:${badgeColor};color:${EMAIL_COLORS.onBadge};padding:2px 8px;border-radius:12px;font-size:.88em">${_esc(categoryLabel)}</span> ` +
    `<span style="color:${EMAIL_COLORS.faint};font-size:.82em">${_esc(report.timestamp)}</span></p>` +
    _sectionHeader(t('feedback.description_placeholder').replace('…', '')) +
    `<blockquote style="border-left:3px solid ${EMAIL_COLORS.border};margin:0;padding:0 1em;color:${EMAIL_COLORS.textSoft}">${_esc(report.description)}</blockquote>` +
    _sectionHeader(t('feedback.section_environment')) +
    _envTable(ctx) +
    _sectionHeader(t('feedback.section_screenshot')) +
    _screenshotSection(ctx.screenshotDataUrl);

  if (isBug) {
    html += _errorsSection(ctx.errors);
    html += _networkSection(ctx.networkLog);
    html += _appLogSection(ctx.appLog);
    html += _calendarSection(ctx.calendarState);
    html += _storageSection(ctx.localStorageSnapshot);
  }

  html += `</body></html>`;
  return html;
}
