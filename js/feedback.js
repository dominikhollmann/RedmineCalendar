// @ts-nocheck — DOM-heavy module; wire-up and rendering only.
import { getCentralConfigSync, loadCentralConfig } from './config-store.js';
import { t } from './i18n.js';
import { showToast } from './notify.js';
import {
  installFetchLog,
  installErrorLog,
  collectBaseContext,
  collectBugContext,
} from './feedback-context.js';
import { isMsalSignedIn, sendFeedbackEmail } from './outlook.js';

// Install network + error logging immediately (before any fetches run)
installFetchLog();
installErrorLog();

// ── State ─────────────────────────────────────────────────────────

let _dialog = null;
let _form = null;
let _categorySelect = null;
let _descriptionTextarea = null;
let _errorEl = null;
let _contextBody = null;
let _submitBtn = null;

// ── XSS-safe escape helper ────────────────────────────────────────

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── HTML body builder helpers (T017) ─────────────────────────────

function _sectionHeader(title) {
  return `<h3 style="margin:1em 0 .3em;font-size:.9em;color:#666;border-bottom:1px solid #ddd">${_esc(title)}</h3>`;
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
    return `<p style="font-style:italic;color:#888">${_esc(t('feedback.screenshot_unavailable'))}</p>`;
  }
  return `<img src="${_esc(screenshotDataUrl)}" style="max-width:100%;border:1px solid #ddd;border-radius:4px" alt="screenshot">`;
}

function _errorsSection(errors) {
  if (!errors || errors.length === 0) return '';
  const items = errors
    .map(
      (e) =>
        `<li><strong>${_esc(e.message)}</strong><br><small style="color:#666">${_esc(e.timestamp)}</small>` +
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
      const color = fail ? ' style="color:#c00"' : '';
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
    `<thead><tr style="background:#f5f5f5"><th style="padding:2px 4px;text-align:left">URL</th><th>Method</th><th>Status</th><th>ms</th></tr></thead>` +
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
    `<pre style="font-size:.75em;overflow:auto;max-height:100px;background:#f5f5f5;padding:.4em">${lines}</pre>`
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
  const badgeColor = isBug ? '#c0392b' : '#2980b9';

  let html =
    `<html><body style="font-family:sans-serif;font-size:14px;color:#222;max-width:700px">` +
    `<p><span style="background:${badgeColor};color:#fff;padding:2px 8px;border-radius:12px;font-size:.88em">${_esc(categoryLabel)}</span> ` +
    `<span style="color:#888;font-size:.82em">${_esc(report.timestamp)}</span></p>` +
    _sectionHeader(t('feedback.description_placeholder').replace('…', '')) +
    `<blockquote style="border-left:3px solid #ddd;margin:0;padding:0 1em;color:#333">${_esc(report.description)}</blockquote>` +
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

// ── mailto fallback (T016) ────────────────────────────────────────

/** Build and open a pre-filled mailto: link. Closes the dialog after opening. */
function _openMailto(report) {
  const cfg = getCentralConfigSync() ?? {};
  const subjectPrefix = report.category === 'bug' ? 'Bug Report' : 'Suggestion';
  const subject = `${subjectPrefix} — RedmineCalendar`;
  let body =
    `Category: ${report.category === 'bug' ? 'Bug Report' : 'Suggestion'}\n` +
    `Description: ${report.description}\n\n` +
    `URL: ${report.pageUrl}\n` +
    `User Agent: ${report.userAgent}\n` +
    `OS: ${report.os}\n` +
    `Viewport: ${report.viewportWidth} × ${report.viewportHeight}\n`;
  const LIMIT = 1800;
  if (body.length > LIMIT) {
    body = body.slice(0, LIMIT) + '\n[…truncated]';
  }
  const mailto = `mailto:${encodeURIComponent(cfg.feedbackEmail ?? report.feedbackEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(mailto, '_blank');
  _dialog.close();
}

// ── Context rendering (T013 + T014 + T019) ───────────────────────

function _screenshotEl(screenshotDataUrl) {
  const div = document.createElement('div');
  div.className = 'feedback-dialog__screenshot';
  if (screenshotDataUrl) {
    const img = document.createElement('img');
    img.src = screenshotDataUrl;
    img.alt = 'screenshot';
    div.appendChild(img);
  } else {
    const p = document.createElement('p');
    p.className = 'screenshot-unavailable';
    p.textContent = t('feedback.screenshot_unavailable');
    div.appendChild(p);
  }
  return div;
}

function _renderSuggestionContext(baseCtx) {
  _contextBody.innerHTML = '';
  const h = document.createElement('h4');
  h.textContent = t('feedback.section_screenshot');
  _contextBody.appendChild(h);
  _contextBody.appendChild(_screenshotEl(baseCtx.screenshotDataUrl));
  _appendEnvTable(baseCtx);
}

function _appendEnvTable(ctx) {
  const h = document.createElement('h4');
  h.textContent = t('feedback.section_environment');
  _contextBody.appendChild(h);
  const table = document.createElement('table');
  table.className = 'feedback-context__table';
  [
    ['URL', ctx.pageUrl],
    ['User Agent', ctx.userAgent],
    ['OS', ctx.os],
    ['Viewport', `${ctx.viewportWidth} × ${ctx.viewportHeight}`],
  ].forEach(([k, v]) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = k;
    const td = document.createElement('td');
    td.textContent = v;
    tr.appendChild(th);
    tr.appendChild(td);
    table.appendChild(tr);
  });
  _contextBody.appendChild(table);
}

function _appendSection(titleKey, node) {
  if (!node) return;
  const h = document.createElement('h4');
  h.textContent = t(titleKey);
  _contextBody.appendChild(h);
  _contextBody.appendChild(node);
}

function _makeKvTable(pairs) {
  const table = document.createElement('table');
  table.className = 'feedback-context__table';
  pairs.forEach(([k, v]) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = k;
    const td = document.createElement('td');
    td.textContent = v;
    tr.appendChild(th);
    tr.appendChild(td);
    table.appendChild(tr);
  });
  return table;
}

function _makeErrorsList(errors) {
  if (!errors?.length) return null;
  const ol = document.createElement('ol');
  errors.forEach((e) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = e.message;
    li.appendChild(strong);
    if (e.stack) {
      const pre = document.createElement('pre');
      pre.className = 'feedback-context__pre';
      pre.textContent = e.stack;
      li.appendChild(pre);
    }
    ol.appendChild(li);
  });
  return ol;
}

function _makeNetworkTable(networkLog) {
  if (!networkLog?.length) return null;
  const table = document.createElement('table');
  table.className = 'feedback-context__table';
  networkLog.forEach((e) => {
    const tr = document.createElement('tr');
    if (e.status === 0 || e.status >= 400) tr.classList.add('net-fail');
    ['url', 'method', 'status', 'ms'].forEach((key) => {
      const td = document.createElement('td');
      td.textContent = key === 'ms' ? `${e[key]}ms` : String(e[key]);
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
  return table;
}

function _renderBugContext(bugCtx) {
  _contextBody.innerHTML = '';
  const hshot = document.createElement('h4');
  hshot.textContent = t('feedback.section_screenshot');
  _contextBody.appendChild(hshot);
  _contextBody.appendChild(_screenshotEl(bugCtx.screenshotDataUrl));
  _appendEnvTable(bugCtx);
  _appendSection('feedback.section_errors', _makeErrorsList(bugCtx.errors));
  _appendSection('feedback.section_network', _makeNetworkTable(bugCtx.networkLog));
  if (bugCtx.appLog?.length) {
    const pre = document.createElement('pre');
    pre.className = 'feedback-context__pre';
    pre.textContent = bugCtx.appLog
      .map((e) => `[${e.level.toUpperCase()}] ${e.timestamp} ${e.message}`)
      .join('\n');
    _appendSection('feedback.section_app_log', pre);
  }
  if (bugCtx.calendarState) {
    const { view, start, end } = bugCtx.calendarState;
    _appendSection(
      'feedback.section_calendar',
      _makeKvTable([
        ['View', view],
        ['Start', start],
        ['End', end],
      ])
    );
  }
  const snapEntries = Object.entries(bugCtx.localStorageSnapshot ?? {});
  if (snapEntries.length) _appendSection('feedback.section_storage', _makeKvTable(snapEntries));
}

// ── Submit handler (T015) ─────────────────────────────────────────

async function _handleSubmit(e) {
  e.preventDefault();
  const category = _categorySelect.value;
  const description = _descriptionTextarea.value.trim();
  _errorEl.textContent = '';

  if (!category) {
    _errorEl.textContent = t('feedback.category_required');
    return;
  }
  if (!description) {
    _errorEl.textContent = t('feedback.description_required');
    return;
  }

  const cfg = getCentralConfigSync() ?? {};
  const isBug = category === 'bug';
  const ctx = isBug ? await collectBugContext() : await collectBaseContext();

  /** @type {import('./types').FeedbackReport} */
  const report = {
    category: isBug ? 'bug' : 'suggestion',
    description,
    feedbackEmail: cfg.feedbackEmail ?? '',
    pageUrl: ctx.pageUrl,
    userAgent: ctx.userAgent,
    os: ctx.os,
    viewportWidth: ctx.viewportWidth,
    viewportHeight: ctx.viewportHeight,
    screenshotDataUrl: ctx.screenshotDataUrl,
    ...(isBug
      ? {
          errors: ctx.errors,
          networkLog: ctx.networkLog,
          appLog: ctx.appLog,
          calendarState: ctx.calendarState,
          localStorageSnapshot: ctx.localStorageSnapshot,
        }
      : {}),
    timestamp: new Date().toISOString(),
  };

  if (isMsalSignedIn()) {
    _submitBtn.textContent = t('feedback.sending');
    _submitBtn.disabled = true;
    try {
      const htmlBody = _buildHtmlBody(report, ctx);
      await sendFeedbackEmail(report, htmlBody);
      _dialog.close();
      showToast(t('feedback.sent'));
    } catch (err) {
      _errorEl.textContent = err.message || t('feedback.send_failed');
      _descriptionTextarea.value = description;
    } finally {
      _submitBtn.textContent = t('feedback.submit_btn');
      _submitBtn.disabled = false;
    }
  } else {
    _openMailto(report);
  }
}

// ── Dialog construction (T013) ────────────────────────────────────

function _buildCategorySelect() {
  const label = document.createElement('label');
  label.htmlFor = 'feedback-category';
  label.textContent = t('feedback.category_label');
  const sel = document.createElement('select');
  sel.id = 'feedback-category';
  sel.required = true;
  [
    ['', '—'],
    ['bug', t('feedback.category_bug')],
    ['suggestion', t('feedback.category_suggestion')],
  ].forEach(([val, text]) => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = text;
    sel.appendChild(opt);
  });
  return { label, sel };
}

function _buildDescriptionField() {
  const label = document.createElement('label');
  label.htmlFor = 'feedback-description';
  label.textContent = t('feedback.description_placeholder');
  const textarea = document.createElement('textarea');
  textarea.id = 'feedback-description';
  textarea.placeholder = t('feedback.description_placeholder');
  textarea.required = true;
  return { label, textarea };
}

function _buildContextDetails() {
  const details = document.createElement('details');
  details.className = 'feedback-dialog__context';
  const summary = document.createElement('summary');
  summary.textContent = t('feedback.context_heading');
  const body = document.createElement('div');
  body.className = 'feedback-dialog__context-body';
  details.appendChild(summary);
  details.appendChild(body);
  return { details, body };
}

function _buildDialogActions() {
  const actions = document.createElement('div');
  actions.className = 'modal-actions';
  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn-primary';
  submitBtn.textContent = t('feedback.submit_btn');
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn-secondary';
  cancelBtn.textContent = t('feedback.cancel_btn');
  actions.appendChild(submitBtn);
  actions.appendChild(cancelBtn);
  return { actions, submitBtn, cancelBtn };
}

function _buildDialog() {
  const dialog = document.createElement('dialog');
  dialog.className = 'feedback-dialog';
  dialog.setAttribute('aria-modal', 'true');
  const h2 = document.createElement('h2');
  h2.textContent = t('feedback.dialog_title');
  dialog.appendChild(h2);
  const form = document.createElement('form');
  form.method = 'dialog';
  form.noValidate = true;
  const { label: catLabel, sel: catSelect } = _buildCategorySelect();
  form.appendChild(catLabel);
  form.appendChild(catSelect);
  const { label: descLabel, textarea: descTextarea } = _buildDescriptionField();
  form.appendChild(descLabel);
  form.appendChild(descTextarea);
  const errorP = document.createElement('p');
  errorP.className = 'feedback-dialog__error';
  errorP.setAttribute('aria-live', 'polite');
  form.appendChild(errorP);
  const { details, body: contextBody } = _buildContextDetails();
  form.appendChild(details);
  const { actions, submitBtn, cancelBtn } = _buildDialogActions();
  form.appendChild(actions);
  dialog.appendChild(form);
  document.body.appendChild(dialog);
  _dialog = dialog;
  _form = form;
  _categorySelect = catSelect;
  _descriptionTextarea = descTextarea;
  _errorEl = errorP;
  _contextBody = contextBody;
  _submitBtn = submitBtn;
  cancelBtn.addEventListener('click', () => {
    _dialog.close();
    _form.reset();
    _errorEl.textContent = '';
    _contextBody.innerHTML = '';
  });
  catSelect.addEventListener('change', () => _updateContext(catSelect.value));
  form.addEventListener('submit', _handleSubmit);
  return dialog;
}

async function _updateContext(category) {
  if (category === 'suggestion') {
    const ctx = await collectBaseContext();
    _renderSuggestionContext(ctx);
  } else if (category === 'bug') {
    const ctx = await collectBugContext();
    _renderBugContext(ctx);
  }
}

// ── Public API ────────────────────────────────────────────────────

/** Open the feedback dialog programmatically. */
export async function openFeedbackDialog() {
  if (!_dialog) return;
  _form.reset();
  _errorEl.textContent = '';
  _contextBody.innerHTML = '';
  _dialog.showModal();
  // Capture screenshot immediately on open and render base context
  const category = _categorySelect.value;
  if (!category) {
    const ctx = await collectBaseContext();
    _renderSuggestionContext(ctx);
  } else {
    await _updateContext(category);
  }
}

/**
 * Initialize the feedback button and dialog.
 * No-ops when feedbackEmail is not configured.
 */
export function initFeedback() {
  const cfg = getCentralConfigSync();
  if (!cfg?.feedbackEmail) return;

  // Build dialog
  _buildDialog();

  // Build FAB
  const btn = document.createElement('button');
  btn.className = 'feedback-fab';
  btn.textContent = t('feedback.button_label');
  btn.setAttribute('aria-label', t('feedback.button_label'));
  btn.addEventListener('click', openFeedbackDialog);
  document.body.appendChild(btn);
}

// ── Auto-init (called when this module is loaded as a <script type="module">) ──
try {
  await loadCentralConfig();
} catch {
  /* config already loaded or settings page — continue */
}
initFeedback();
