// @ts-nocheck — DOM-heavy module; runtime checks suffice. Tag pure helpers per-export with /** @type */ when they grow.
import { t } from './i18n.js';
import { getCentralConfigSync, loadCentralConfig } from './config-store.js';
import { sendMessage } from './chatbot-api.js';
import { executeTool } from './chatbot-tools.js';
import {
  loadDocs,
  selectRelevantFiles,
  loadRelevantSource,
  buildSystemPrompt,
} from './knowledge.js';
import {
  VoiceInput,
  isSupported as voiceSupported,
  isPrivacyDismissed,
  dismissPrivacy,
} from './voice-input.js';

const DEFAULT_AI_MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOOL_ROUNDS = 10;

let _session = null;
let _panelOpen = false;
let _loading = false;
let _voiceInput = null;

/** @typedef {import('./types').AiConfig} AiConfig */
/** @typedef {import('./types').CentralConfig} CentralConfig */
/**
 * @typedef {{messages: Array<any>, createdAt: Date}} ChatSession
 */

// ── Pure helpers (DOM-independent, exported for testability) ──────────────

/**
 * Create a fresh empty chat session.
 * @returns {ChatSession}
 */
export function createSession() {
  return { messages: [], createdAt: new Date() };
}

/**
 * Append a message (with a `timestamp`) to the session and return the session.
 * @param {ChatSession} session
 * @param {Record<string, any>} message
 * @returns {ChatSession}
 */
export function appendMessage(session, message) {
  session.messages.push({ ...message, timestamp: new Date() });
  return session;
}

/**
 * Project the central config into the minimum AI config needed by chatbot-api.
 * Missing fields default to empty strings or the hard-coded default model.
 * @param {CentralConfig|null|undefined} centralCfg
 * @returns {AiConfig}
 */
export function buildAiConfig(centralCfg) {
  const cfg = centralCfg || {};
  // No aiApiKey: the AI proxy injects the company key server-side (issue #114).
  return {
    aiProxyUrl: cfg.aiProxyUrl || '',
    aiModel: cfg.aiModel || DEFAULT_AI_MODEL,
  };
}

/**
 * Whether the tool-call loop should continue (not over the round limit AND
 * the latest reply is a tool_use).
 * @param {{type:string}|null|undefined} reply
 * @param {number} round
 * @param {number} [maxRounds]
 * @returns {boolean}
 */
export function shouldContinueToolLoop(reply, round, maxRounds = MAX_TOOL_ROUNDS) {
  return round < maxRounds && !!reply && reply.type === 'tool_use';
}

/**
 * Split an error's message into render-friendly parts. When `err.proxyUrl` is
 * embedded in the message, the URL is returned separately so the caller can
 * wrap it in an `<a>` tag.
 * @param {(Error & {proxyUrl?: string}) | null | undefined} err
 * @returns {{before:string, url:string, after:string} | {text:string}}
 */
export function buildErrorMessageParts(err) {
  const message = (err && err.message) || '';
  const url = err && err.proxyUrl;
  if (url) {
    return { before: message + ' ', url, after: '' };
  }
  return { text: message };
}

/**
 * Map a Web Speech API error code to a translation key.
 * @param {string} code
 * @returns {string}
 */
export function mapVoiceErrorToKey(code) {
  switch (code) {
    case 'permission-denied':
      return 'voice.permission_denied';
    case 'no-speech':
      return 'voice.no_speech';
    case 'network':
      return 'voice.network_error';
    default:
      return 'voice.not_supported';
  }
}

/**
 * Whether `marked` and `DOMPurify` are loaded (CDN scripts on index.html).
 * @returns {boolean}
 */
export function canRenderMarkdown() {
  return typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined';
}

// ── DOM helpers ───────────────────────────────────────────────────────────

function getPanel() {
  return document.getElementById('chatbot-panel');
}
function getBody() {
  return document.getElementById('chatbot-messages');
}
function getInput() {
  return document.getElementById('chatbot-input');
}

function ensureSession() {
  if (!_session) _session = createSession();
  return _session;
}

/**
 * Append a message bubble to the chat body. The HTML is sanitized internally
 * with DOMPurify (defense in depth — FR-009): a caller cannot bypass the
 * sanitizer by passing raw markup straight through.
 * @param {string} role
 * @param {string} html
 */
export function renderMessage(role, html) {
  const body = getBody();
  if (!body) return;
  const div = document.createElement('div');
  div.className = `chatbot-msg chatbot-msg--${role}`;
  div.innerHTML = DOMPurify.sanitize(html);
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

function renderText(role, text) {
  if (canRenderMarkdown()) {
    renderMessage(role, marked.parse(text));
  } else {
    const div = document.createElement('div');
    div.className = `chatbot-msg chatbot-msg--${role}`;
    div.textContent = text;
    getBody()?.appendChild(div);
  }
}

export async function openChatPanel() {
  const panel = getPanel();
  if (!panel) return;

  ensureSession();

  const title = panel.querySelector('.chatbot-panel__title');
  if (title) title.textContent = t('chatbot.panel_title');

  panel.classList.add('chatbot-panel--open');
  panel.removeAttribute('hidden');
  _panelOpen = true;
  document.documentElement.style?.setProperty?.('--chatbot-panel-w', panel.offsetWidth + 'px');

  const input = getInput();
  if (input) {
    input.placeholder = t('chatbot.input_placeholder');
    input.focus();
  }

  const sendBtn = panel.querySelector('.chatbot-send-btn');
  if (sendBtn) sendBtn.textContent = t('chatbot.send_btn');

  const audioBtn = document.getElementById('chatbot-audio-btn');
  if (audioBtn) {
    if (voiceSupported()) {
      audioBtn.removeAttribute('hidden');
      audioBtn.setAttribute('aria-label', t('voice.start'));
    } else {
      audioBtn.setAttribute('hidden', '');
    }
  }

  if (_session.messages.length === 0 && getBody()?.children.length === 0) {
    renderText('assistant', t('chatbot.welcome'));
  }

  await loadDocs();
}

export function closeChatPanel() {
  const panel = getPanel();
  if (!panel) return;
  panel.classList.remove('chatbot-panel--open');
  document.documentElement.style?.setProperty?.('--chatbot-panel-w', '0px');
  setTimeout(() => {
    if (!_panelOpen) panel.setAttribute('hidden', '');
  }, 300);
  _panelOpen = false;
}

function createLoadingIndicator() {
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'chatbot-msg chatbot-msg--loading';
  loadingDiv.textContent = t('chatbot.loading');
  getBody()?.appendChild(loadingDiv);
  return loadingDiv;
}

async function buildAiContext(text, session) {
  const relevantFiles = selectRelevantFiles(text, session.messages);
  const relevantSource = relevantFiles.length > 0 ? await loadRelevantSource(relevantFiles) : null;
  const systemPrompt = buildSystemPrompt(relevantSource);
  const aiConfig = buildAiConfig(getCentralConfigSync());
  return { systemPrompt, aiConfig };
}

async function runToolRound(reply, session, systemPrompt, aiConfig, loadingDiv, state) {
  loadingDiv.textContent = t('chatbot.looking_up');

  if (reply.text) {
    if (!state.loadingRemoved) {
      loadingDiv.remove();
      state.loadingRemoved = true;
    }
    appendMessage(session, { role: 'assistant', content: reply.text });
    renderText('assistant', reply.text);
  }

  appendMessage(session, {
    role: 'assistant',
    content: [{ type: 'tool_use', id: reply.id, name: reply.name, input: reply.input }],
  });

  let toolResultText;
  try {
    const toolResult = await executeTool(reply.name, reply.input);
    toolResultText = toolResult.result;
  } catch (toolErr) {
    toolResultText = `Tool error: ${toolErr.message}`;
  }

  appendMessage(session, {
    role: 'tool_result',
    tool_use_id: reply.id,
    content: toolResultText,
  });

  try {
    return await sendMessage(session.messages, systemPrompt, aiConfig);
  } catch {
    return { type: 'text', content: toolResultText };
  }
}

async function runToolLoop(initialReply, session, systemPrompt, aiConfig, loadingDiv) {
  const state = { loadingRemoved: false };
  let reply = initialReply;
  let round = 0;
  while (shouldContinueToolLoop(reply, round, MAX_TOOL_ROUNDS)) {
    reply = await runToolRound(reply, session, systemPrompt, aiConfig, loadingDiv, state);
    round++;
  }
  if (!state.loadingRemoved) loadingDiv.remove();
  return reply;
}

function appendErrorParagraph(errorDiv, err) {
  const errorP = document.createElement('p');
  errorP.className = 'chatbot-error';
  const parts = buildErrorMessageParts(err);
  if ('url' in parts) {
    errorP.append(parts.before);
    const a = document.createElement('a');
    a.href = parts.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = parts.url;
    errorP.append(a);
    errorP.append(parts.after);
  } else {
    errorP.textContent = parts.text;
  }
  errorDiv.append(errorP);
}

function renderErrorWithRetry(err, session, originalText) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'chatbot-msg chatbot-msg--assistant';
  appendErrorParagraph(errorDiv, err);
  const retryBtn = document.createElement('button');
  retryBtn.className = 'chatbot-retry-btn';
  retryBtn.textContent = t('chatbot.retry_btn');
  retryBtn.onclick = () => {
    errorDiv.remove();
    session.messages.pop();
    const retryInput = getInput();
    if (retryInput) retryInput.value = originalText;
    handleSend();
  };
  errorDiv.appendChild(retryBtn);
  getBody()?.appendChild(errorDiv);
  getBody().scrollTop = getBody().scrollHeight;
}

async function handleSend() {
  if (_loading) return;
  const input = getInput();
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  const session = ensureSession();
  input.value = '';
  appendMessage(session, { role: 'user', content: text });
  renderText('user', text);

  _loading = true;
  const loadingDiv = createLoadingIndicator();
  const safetyTimeout = setTimeout(() => {
    /* c8 ignore next 1 — FALSE branch unreachable: the finally block always
       calls clearTimeout(safetyTimeout), cancelling the timer before it can
       fire on a completed request, so _loading is never false at this point. */
    if (_loading) {
      _loading = false;
      loadingDiv.remove();
      renderMessage('assistant', `<p class="chatbot-error">${t('chatbot.error_generic')}</p>`);
    }
  }, 60000);

  try {
    const { systemPrompt, aiConfig } = await buildAiContext(text, session);
    const initialReply = await sendMessage(session.messages, systemPrompt, aiConfig);
    const reply = await runToolLoop(initialReply, session, systemPrompt, aiConfig, loadingDiv);
    const finalText = reply.type === 'text' ? reply.content : (reply.text ?? '');
    if (finalText) {
      appendMessage(session, { role: 'assistant', content: finalText });
      renderText('assistant', finalText);
    }
  } catch (err) {
    loadingDiv.remove();
    renderErrorWithRetry(err, session, text);
  } finally {
    clearTimeout(safetyTimeout);
    _loading = false;
  }
}

function showVoiceError(code) {
  renderMessage('assistant', `<p class="chatbot-error">${t(mapVoiceErrorToKey(code))}</p>`);
}

function showPrivacyNotice() {
  return new Promise((resolve) => {
    const panel = getPanel();
    if (!panel) {
      resolve(false);
      return;
    }
    const notice = document.createElement('div');
    notice.className = 'chatbot-privacy-notice';
    notice.textContent = t('voice.privacy_notice');
    const btn = document.createElement('button');
    btn.textContent = t('voice.privacy_dismiss');
    btn.onclick = () => {
      notice.remove();
      dismissPrivacy();
      resolve(true);
    };
    notice.appendChild(btn);
    const inputArea = panel.querySelector('.chatbot-input-area');
    inputArea?.parentNode.insertBefore(notice, inputArea);
  });
}

function ensureVoiceInput() {
  if (_voiceInput) return _voiceInput;
  const audioBtn = document.getElementById('chatbot-audio-btn');
  _voiceInput = new VoiceInput({
    onStart() {
      if (audioBtn) {
        audioBtn.classList.add('recording');
        audioBtn.textContent = '⏹';
        audioBtn.setAttribute('aria-label', t('voice.stop'));
      }
      const inputArea = getPanel()?.querySelector('.chatbot-input-area');
      inputArea?.classList.add('recording');
    },
    onInterim(text) {
      const input = getInput();
      if (!input) return;
      const existing = input.dataset.preVoiceText || '';
      input.value = existing ? existing + ' ' + text : text;
    },
    onFinal(text) {
      const input = getInput();
      if (!input) return;
      const existing = input.dataset.preVoiceText || '';
      input.value = existing ? existing + ' ' + text : text;
      delete input.dataset.preVoiceText;
      resetAudioBtn();
      handleSend();
    },
    onError(code) {
      resetAudioBtn();
      const input = getInput();
      if (input) {
        input.value = input.dataset.preVoiceText || '';
        delete input.dataset.preVoiceText;
      }
      showVoiceError(code);
    },
    onCancel() {
      const input = getInput();
      if (input) {
        input.value = input.dataset.preVoiceText || '';
        delete input.dataset.preVoiceText;
      }
      resetAudioBtn();
    },
    onMaxDuration() {
      renderMessage('assistant', `<p class="chatbot-error">${t('voice.max_duration')}</p>`);
    },
  });
  return _voiceInput;
}

function resetAudioBtn() {
  const audioBtn = document.getElementById('chatbot-audio-btn');
  if (audioBtn) {
    audioBtn.classList.remove('recording');
    audioBtn.textContent = '🎤';
    audioBtn.setAttribute('aria-label', t('voice.start'));
  }
  const inputArea = getPanel()?.querySelector('.chatbot-input-area');
  inputArea?.classList.remove('recording');
}

async function handleAudioClick() {
  const vi = ensureVoiceInput();
  if (vi.state === 'recording') {
    if (vi.finalTranscript || vi.interimTranscript) {
      vi.stop();
    } else {
      vi.cancel();
    }
    return;
  }
  if (!isPrivacyDismissed()) {
    const accepted = await showPrivacyNotice();
    if (!accepted) return;
  }
  const input = getInput();
  if (input) input.dataset.preVoiceText = input.value;
  vi.start();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && _panelOpen) closeChatPanel();
});

{
  const handle = document.querySelector('.chatbot-panel__resize');
  if (handle) {
    let dragging = false;
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      dragging = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const panel = getPanel();
      if (!panel) return;
      const width = window.innerWidth - e.clientX;
      const w = Math.max(280, Math.min(width, window.innerWidth * 0.9));
      panel.style.width = w + 'px';
      document.documentElement.style?.setProperty?.('--chatbot-panel-w', w + 'px');
    });
    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }
}

document.addEventListener('click', (e) => {
  if (e.target.closest('.chatbot-panel__close')) closeChatPanel();
  if (e.target.closest('.chatbot-open-btn')) openChatPanel();
  if (e.target.closest('.chatbot-send-btn')) handleSend();
  if (e.target.closest('#chatbot-audio-btn')) handleAudioClick();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && _voiceInput?.state === 'recording') _voiceInput.stop();
});

if (window.visualViewport) {
  const adjustPanelHeight = () => {
    const vh = window.visualViewport.height;
    const offset = window.visualViewport.offsetTop;
    document.documentElement.style?.setProperty?.('--vv-height', `${vh}px`);
    document.documentElement.style?.setProperty?.('--vv-offset', `${offset}px`);
  };
  window.visualViewport.addEventListener('resize', adjustPanelHeight);
  window.visualViewport.addEventListener('scroll', adjustPanelHeight);
  adjustPanelHeight();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && document.activeElement === getInput()) {
    e.preventDefault();
    handleSend();
  }
});

/**
 * Whether the AI proxy is configured (aiProxyUrl present in the served config).
 * In dev the server strips aiProxyUrl when AI_API_KEY is not set, so this
 * correctly returns false without any browser-side env-var access.
 * @returns {boolean}
 */
export function isAiConfigured() {
  return !!getCentralConfigSync()?.aiProxyUrl;
}

// Hide the open button when no AI proxy is configured.
// loadCentralConfig is idempotent — it returns the in-memory cache after the
// first call (calendar.js loads it first; chatbot.js uses the cached value).
// The panel itself starts hidden in HTML and is toggled by openChatPanel /
// closeChatPanel — we never force-show it here.
try {
  await loadCentralConfig();
} catch {
  // config load failures are handled by calendar.js; treat as unconfigured
}
const _chatBtn = document.querySelector('.chatbot-open-btn');
if (_chatBtn) _chatBtn.hidden = !isAiConfigured();
