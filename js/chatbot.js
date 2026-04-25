import { t } from './i18n.js';
import { getCentralConfigSync } from './settings.js';
import { sendMessage } from './chatbot-api.js';
import { executeTool, setCalendarRefreshCallback } from './chatbot-tools.js';
import { loadDocs, selectRelevantFiles, loadRelevantSource, buildSystemPrompt } from './knowledge.js';
import { VoiceInput, isSupported as voiceSupported, isPrivacyDismissed, dismissPrivacy } from './voice-input.js';

let _session = null;
let _panelOpen = false;
let _loading = false;
let _voiceInput = null;

function getPanel()  { return document.getElementById('chatbot-panel'); }
function getBody()   { return document.getElementById('chatbot-messages'); }
function getInput()  { return document.getElementById('chatbot-input'); }

function ensureSession() {
  if (!_session) _session = { messages: [], createdAt: new Date() };
  return _session;
}

function renderMessage(role, html) {
  const body = getBody();
  if (!body) return;
  const div = document.createElement('div');
  div.className = `chatbot-msg chatbot-msg--${role}`;
  div.innerHTML = html;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

function renderText(role, text) {
  if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
    renderMessage(role, DOMPurify.sanitize(marked.parse(text)));
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
  setTimeout(() => { if (!_panelOpen) panel.setAttribute('hidden', ''); }, 300);
  _panelOpen = false;
}

async function handleSend() {
  if (_loading) return;
  const input = getInput();
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  const session = ensureSession();
  input.value = '';

  session.messages.push({ role: 'user', content: text, timestamp: new Date() });
  renderText('user', text);

  _loading = true;
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'chatbot-msg chatbot-msg--loading';
  loadingDiv.textContent = t('chatbot.loading');
  getBody()?.appendChild(loadingDiv);

  const safetyTimeout = setTimeout(() => {
    if (_loading) {
      _loading = false;
      loadingDiv.remove();
      renderMessage('assistant', `<p class="chatbot-error">${t('chatbot.error_generic')}</p>`);
    }
  }, 60000);

  try {
    const relevantFiles = selectRelevantFiles(text, session.messages);
    const relevantSource = relevantFiles.length > 0 ? await loadRelevantSource(relevantFiles) : null;
    const systemPrompt = buildSystemPrompt(relevantSource);
    const centralCfg = getCentralConfigSync() || {};
    const aiConfig = {
      aiApiKey: centralCfg.aiApiKey || '',
      aiProxyUrl: centralCfg.aiProxyUrl || '',
      aiModel: centralCfg.aiModel || 'claude-haiku-4-5-20251001',
    };

    let reply = await sendMessage(session.messages, systemPrompt, aiConfig);

    if (reply.type === 'tool_use') {
      loadingDiv.textContent = t('chatbot.looking_up');
      session.messages.push({
        role: 'assistant',
        content: [{ type: 'tool_use', id: reply.id, name: reply.name, input: reply.input }],
        timestamp: new Date(),
      });

      let toolResultText;
      try {
        const toolResult = await executeTool(reply.name, reply.input);
        toolResultText = toolResult.result;
      } catch (toolErr) {
        toolResultText = `Tool error: ${toolErr.message}`;
      }

      session.messages.push({ role: 'tool_result', tool_use_id: reply.id, content: toolResultText, timestamp: new Date() });

      let finalText;
      if (reply.name === 'query_time_entries') {
        try {
          const followUp = await sendMessage(session.messages, systemPrompt, aiConfig);
          finalText = followUp.type === 'text' ? followUp.content : toolResultText;
        } catch {
          finalText = toolResultText;
        }
      } else {
        finalText = toolResultText;
      }
      session.messages.push({ role: 'assistant', content: finalText, timestamp: new Date() });
      loadingDiv.remove();
      renderText('assistant', finalText);
    } else {
      session.messages.push({ role: 'assistant', content: reply.content, timestamp: new Date() });
      loadingDiv.remove();
      renderText('assistant', reply.content);
    }
  } catch (err) {
    loadingDiv.remove();
    const errorDiv = document.createElement('div');
    errorDiv.className = 'chatbot-msg chatbot-msg--assistant';
    errorDiv.innerHTML = `<p class="chatbot-error">${err.message}</p>`;
    const retryBtn = document.createElement('button');
    retryBtn.className = 'chatbot-retry-btn';
    retryBtn.textContent = t('chatbot.retry_btn');
    retryBtn.onclick = () => {
      errorDiv.remove();
      session.messages.pop();
      const retryInput = getInput();
      if (retryInput) retryInput.value = text;
      handleSend();
    };
    errorDiv.appendChild(retryBtn);
    getBody()?.appendChild(errorDiv);
    getBody().scrollTop = getBody().scrollHeight;
  } finally {
    clearTimeout(safetyTimeout);
    _loading = false;
  }
}

function showVoiceError(code) {
  const key = code === 'permission-denied' ? 'voice.permission_denied'
    : code === 'no-speech' ? 'voice.no_speech'
    : code === 'network' ? 'voice.network_error'
    : 'voice.not_supported';
  renderMessage('assistant', `<p class="chatbot-error">${t(key)}</p>`);
}

function showPrivacyNotice() {
  return new Promise((resolve) => {
    const panel = getPanel();
    if (!panel) { resolve(false); return; }
    const notice = document.createElement('div');
    notice.className = 'chatbot-privacy-notice';
    notice.textContent = t('voice.privacy_notice');
    const btn = document.createElement('button');
    btn.textContent = t('voice.privacy_dismiss');
    btn.onclick = () => { notice.remove(); dismissPrivacy(); resolve(true); };
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
      if (input) { input.value = input.dataset.preVoiceText || ''; delete input.dataset.preVoiceText; }
      showVoiceError(code);
    },
    onCancel() {
      const input = getInput();
      if (input) { input.value = input.dataset.preVoiceText || ''; delete input.dataset.preVoiceText; }
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
    vi.stop();
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

// ── Panel resize ──
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
      panel.style.width = Math.max(280, Math.min(width, window.innerWidth * 0.9)) + 'px';
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
  if (e.target.closest('.chatbot-source-btn')) {
    _includeSource = !_includeSource;
    e.target.closest('.chatbot-source-btn')?.classList.toggle('active', _includeSource);
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && _voiceInput?.state === 'recording') _voiceInput.stop();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && document.activeElement === getInput()) {
    e.preventDefault();
    handleSend();
  }
});
