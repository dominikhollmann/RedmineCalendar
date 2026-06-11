// @ts-nocheck — DOM-heavy module; wire-up and rendering only.
import { getCentralConfigSync, loadCentralConfig } from './config-store.js';
import { t } from './i18n.js';
import { showToast } from './notify.js';
import {
  installFetchLog,
  installErrorLog,
  captureScreenshotTab,
  collectBaseContext,
  collectBugContext,
} from './feedback-context.js';
import { isMsalSignedIn, sendFeedbackEmail } from './outlook.js';
import { _buildHtmlBody } from './feedback-email.js';
export { _buildHtmlBody } from './feedback-email.js';

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
let _contextGen = 0;
let _screenshotCache = null;

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

  function render(dataUrl) {
    div.innerHTML = '';
    if (dataUrl) {
      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = 'screenshot';
      div.appendChild(img);
    } else {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-secondary';
      btn.textContent = t('feedback.add_screenshot_btn');
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = t('feedback.screenshot_capturing');
        _dialog.close();
        const dataUrl = await captureScreenshotTab();
        _screenshotCache = dataUrl;
        _dialog.showModal();
        render(dataUrl);
      });
      div.appendChild(btn);
    }
  }

  render(screenshotDataUrl);
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
  const scroll = document.createElement('div');
  scroll.className = 'feedback-dialog__scroll';
  const { label: catLabel, sel: catSelect } = _buildCategorySelect();
  scroll.appendChild(catLabel);
  scroll.appendChild(catSelect);
  const { label: descLabel, textarea: descTextarea } = _buildDescriptionField();
  scroll.appendChild(descLabel);
  scroll.appendChild(descTextarea);
  const errorP = document.createElement('p');
  errorP.className = 'feedback-dialog__error';
  errorP.setAttribute('aria-live', 'polite');
  scroll.appendChild(errorP);
  const { details, body: contextBody } = _buildContextDetails();
  scroll.appendChild(details);
  form.appendChild(scroll);
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
  const gen = ++_contextGen;
  if (category === 'suggestion') {
    const ctx = await collectBaseContext(_screenshotCache);
    if (gen !== _contextGen) return;
    _renderSuggestionContext(ctx);
  } else if (category === 'bug') {
    const ctx = await collectBugContext(_screenshotCache);
    if (gen !== _contextGen) return;
    _renderBugContext(ctx);
  }
}

// ── Public API ────────────────────────────────────────────────────

/** Open the feedback dialog programmatically. */
export async function openFeedbackDialog() {
  if (!_dialog) return;
  _screenshotCache = null;
  _form.reset();
  _errorEl.textContent = '';
  _contextBody.innerHTML = '';
  _contextGen = 0;
  _dialog.showModal();
  const category = _categorySelect.value;
  if (!category) {
    await _updateContext('suggestion');
  } else {
    await _updateContext(category);
  }
}

/**
 * Initialize the feedback button and dialog.
 * Injects a toolbar button into .app-header (before the settings link).
 * No-ops when feedbackEmail is not configured.
 */
export function initFeedback() {
  const cfg = getCentralConfigSync();
  if (!cfg?.feedbackEmail) return;

  // Build dialog
  _buildDialog();

  // Build toolbar button (replaces the former FAB — Decision 6)
  const btn = document.createElement('button');
  btn.className = 'feedback-toolbar-btn';
  btn.innerHTML = '&#128172;';
  btn.setAttribute('aria-label', t('feedback.toolbar_label'));
  btn.title = t('feedback.toolbar_label');
  btn.addEventListener('click', openFeedbackDialog);

  const header =
    document.querySelector('.app-header') ?? document.querySelector('.settings-card-header');
  if (!header) {
    document.body.appendChild(btn);
    return;
  }
  const settingsLink = header.querySelector('.settings-link');
  if (settingsLink) {
    header.insertBefore(btn, settingsLink);
  } else {
    const docsBtn = header.querySelector('.docs-help-btn');
    if (docsBtn) {
      docsBtn.insertAdjacentElement('afterend', btn);
    } else {
      header.appendChild(btn);
    }
  }
}

// ── Auto-init (called when this module is loaded as a <script type="module">) ──
try {
  await loadCentralConfig();
} catch {
  /* config already loaded or settings page — continue */
}
initFeedback();
