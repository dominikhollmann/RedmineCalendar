import { t } from './i18n.js';
import { readAiConfig } from './settings.js';
import { sendMessage } from './chatbot-api.js';
import { loadDocs, loadSpecSummary, loadSourceFiles, buildSystemPrompt } from './knowledge.js';

let _session = null;
let _panelOpen = false;
let _loading = false;

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

  if (_session.messages.length === 0 && getBody()?.children.length === 0) {
    renderText('assistant', t('chatbot.welcome'));
  }

  await loadDocs();
  await loadSpecSummary();
  await loadSourceFiles();
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

  try {
    const systemPrompt = buildSystemPrompt(true);
    const config = readAiConfig();
    const reply = await sendMessage(session.messages, systemPrompt, config);
    session.messages.push({ role: 'assistant', content: reply, timestamp: new Date() });
    loadingDiv.remove();
    renderText('assistant', reply);
  } catch (err) {
    loadingDiv.remove();
    renderMessage('assistant', `<p class="chatbot-error">${err.message}</p>`);
  } finally {
    _loading = false;
  }
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
  if (e.target.closest('.chatbot-source-btn')) {
    _includeSource = !_includeSource;
    e.target.closest('.chatbot-source-btn')?.classList.toggle('active', _includeSource);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && document.activeElement === getInput()) {
    e.preventDefault();
    handleSend();
  }
});
