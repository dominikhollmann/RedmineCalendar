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
import { createRedmineTicket, openGithubForm } from './feedback-ticket.js';

// Install network + error logging immediately (before any fetches run)
installFetchLog();
installErrorLog();

// ── State ─────────────────────────────────────────────────────────

let _dialog = null;
let _form = null;
let _categorySelect = null;
let _descriptionTextarea = null;
let _errorEl = null;
let _contextDetails = null;
let _contextBody = null;
let _consentCheckbox = null;
let _submitBtn = null;
let _contextGen = 0;
let _screenshotCache = null;

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
  const table = _makeKvTable([
    ['URL', ctx.pageUrl],
    ['User Agent', ctx.userAgent],
    ['OS', ctx.os],
    ['Viewport', `${ctx.viewportWidth} × ${ctx.viewportHeight}`],
  ]);
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

// ── Submit handler (T009 + T013 + T017) ───────────────────────────

/**
 * Assemble the FeedbackReport. When the user has not opted into diagnostic
 * context, only the description + minimal metadata is collected — no screenshot,
 * no logs (SC-008).
 */
async function _buildReport(category, description, contextEnabled) {
  const isBug = category === 'bug';
  if (!contextEnabled) {
    const base = await collectBaseContext(null);
    return {
      category: isBug ? 'bug' : 'suggestion',
      description,
      contextEnabled: false,
      pageUrl: base.pageUrl,
      userAgent: base.userAgent,
      os: base.os,
      viewportWidth: base.viewportWidth,
      viewportHeight: base.viewportHeight,
      screenshotDataUrl: null,
      timestamp: new Date().toISOString(),
    };
  }

  const ctx = isBug
    ? await collectBugContext(_screenshotCache)
    : await collectBaseContext(_screenshotCache);
  return {
    category: isBug ? 'bug' : 'suggestion',
    description,
    contextEnabled: true,
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
}

async function _submitToRedmine(report, feedback, description) {
  _submitBtn.textContent = t('feedback.creating_ticket');
  _submitBtn.disabled = true;
  try {
    const outcome = await createRedmineTicket(report, feedback);
    if (outcome.ok === true) {
      _dialog.close();
      showToast(t('feedback.ticket_created'), { href: outcome.ticketUrl });
    } else {
      _errorEl.textContent = outcome.message || t('feedback.send_failed');
      _descriptionTextarea.value = description;
    }
  } finally {
    _submitBtn.textContent = t('feedback.submit_btn');
    _submitBtn.disabled = false;
  }
}

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
  const feedback = cfg.feedback;
  if (!feedback || !feedback.system) {
    _errorEl.textContent = t('feedback.config_missing');
    return;
  }

  const report = await _buildReport(category, description, _consentCheckbox.checked);

  if (feedback.system === 'github') {
    openGithubForm(report, feedback);
    _dialog.close();
    showToast(t('feedback.github_form_opened'));
    return;
  }

  await _submitToRedmine(report, feedback, description);
}

// ── Dialog construction (T013 + T015) ─────────────────────────────

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

function _buildConsentCheckbox() {
  const wrapper = document.createElement('div');
  wrapper.className = 'feedback-dialog__consent';
  const label = document.createElement('label');
  label.className = 'feedback-dialog__consent-label';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'feedback-consent';
  checkbox.checked = false;
  const span = document.createElement('span');
  span.textContent = t('feedback.consent_checkbox');
  label.appendChild(checkbox);
  label.appendChild(span);
  const warning = document.createElement('p');
  warning.className = 'feedback-dialog__consent-warning';
  warning.textContent = t('feedback.consent_warning');
  wrapper.appendChild(label);
  wrapper.appendChild(warning);
  return { wrapper, checkbox };
}

function _buildContextDetails() {
  const details = document.createElement('details');
  details.className = 'feedback-dialog__context';
  details.hidden = true;
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

function _onConsentToggle() {
  const enabled = _consentCheckbox.checked;
  _contextDetails.hidden = !enabled;
  if (enabled) {
    _updateContext(_categorySelect.value || 'suggestion');
  } else {
    _contextBody.innerHTML = '';
  }
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
  const { wrapper: consentWrapper, checkbox: consentCheckbox } = _buildConsentCheckbox();
  scroll.appendChild(consentWrapper);
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
  _consentCheckbox = consentCheckbox;
  _contextDetails = details;
  _contextBody = contextBody;
  _submitBtn = submitBtn;
  cancelBtn.addEventListener('click', () => {
    _dialog.close();
    _resetDialogState();
  });
  consentCheckbox.addEventListener('change', _onConsentToggle);
  catSelect.addEventListener('change', () => {
    if (_consentCheckbox.checked) _updateContext(catSelect.value);
  });
  form.addEventListener('submit', _handleSubmit);
  return dialog;
}

function _resetDialogState() {
  _form.reset();
  _errorEl.textContent = '';
  _consentCheckbox.checked = false;
  _contextDetails.hidden = true;
  _contextBody.innerHTML = '';
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
  _resetDialogState();
  _contextGen = 0;
  _dialog.showModal();
}

/**
 * Initialize the feedback button and dialog.
 * Injects a toolbar button into .app-header (before the settings link).
 * No-ops when no feedback channel is configured. The legacy `feedbackEmail`
 * field keeps the button visible for backward compatibility, but submission
 * then surfaces a config-missing toast until the admin adds a `feedback` block.
 */
export function initFeedback() {
  const cfg = getCentralConfigSync();
  if (!cfg?.feedback && !cfg?.feedbackEmail) return;

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
    (settingsLink.parentElement ?? header).insertBefore(btn, settingsLink);
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
