import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock dependencies before importing chatbot.js ───────────────────────────
// vi.mock factories are hoisted; use vi.hoisted() for shared refs.

const mocks = vi.hoisted(() => {
  const _voiceInstances = [];
  // Resolved later (after vi is imported in the eager top-level body).
  // The constructor will swap plain stubs for vi.fn() once the resolver runs.
  let spyFactory = null;

  class MockVoiceInput {
    constructor(callbacks) {
      this.callbacks = callbacks;
      this.state = 'idle';
      this.interimTranscript = '';
      this.finalTranscript = '';
      if (spyFactory) {
        this.start = spyFactory();
        this.stop = spyFactory();
        this.cancel = spyFactory();
      } else {
        this.start = () => {};
        this.stop = () => {};
        this.cancel = () => {};
      }
      _voiceInstances.push(this);
    }
  }

  return {
    _voiceInstances,
    MockVoiceInput,
    setSpyFactory: (f) => {
      spyFactory = f;
    },
  };
});

// Re-bindable function refs we control from the test body
let voiceSupportedImpl = () => true;
let isPrivacyDismissedImpl = () => true;

vi.mock('../../js/i18n.js', () => ({
  t: (key) => key,
  locale: 'en',
  formatDate: (d) => d,
}));

vi.mock('../../js/settings.js', () => ({
  getCentralConfigSync: vi.fn(() => ({})),
  readWorkingHours: vi.fn(() => ({ start: '08:00', end: '17:00' })),
  readWeeklyHours: vi.fn(() => 40),
  readConfig: vi.fn(() => ({})),
}));

vi.mock('../../js/config-store.js', () => ({
  getCentralConfigSync: vi.fn(() => ({})),
}));

vi.mock('../../js/chatbot-api.js', () => ({
  sendMessage: vi.fn(),
}));

vi.mock('../../js/chatbot-tools.js', () => ({
  executeTool: vi.fn(),
  setCalendarRefreshCallback: vi.fn(),
  getToolSchemas: vi.fn(() => []),
}));

vi.mock('../../js/knowledge.js', () => ({
  loadDocs: vi.fn(async () => ''),
  selectRelevantFiles: vi.fn(() => []),
  loadRelevantSource: vi.fn(async () => null),
  buildSystemPrompt: vi.fn(() => 'system prompt'),
}));

vi.mock('../../js/voice-input.js', () => ({
  VoiceInput: mocks.MockVoiceInput,
  isSupported: () => voiceSupportedImpl(),
  isPrivacyDismissed: () => isPrivacyDismissedImpl(),
  dismissPrivacy: vi.fn(),
}));

mocks.setSpyFactory(() => vi.fn());
const _voiceInstances = mocks._voiceInstances;
const lastVoice = () => _voiceInstances[_voiceInstances.length - 1];

// ─── DOM stub registry ───────────────────────────────────────────────────────

// Map of capturing the document's event listeners so tests can invoke them.
const docListeners = {};

// Per-test element registry. Tests can populate this to control what
// document.getElementById / querySelector return.
let elementsById = {};
let elementsBySelector = {};

const makeStubElement = (overrides = {}) => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
    toggle: vi.fn(),
    contains: vi.fn(() => false),
  },
  appendChild: vi.fn(),
  removeChild: vi.fn(),
  append: vi.fn(),
  setAttribute: vi.fn(),
  removeAttribute: vi.fn(),
  hasAttribute: vi.fn(() => false),
  focus: vi.fn(),
  click: vi.fn(),
  remove: vi.fn(),
  closest: vi.fn(() => null),
  contains: vi.fn(() => false),
  querySelector: vi.fn(() => null),
  querySelectorAll: vi.fn(() => []),
  getAttribute: vi.fn(() => null),
  textContent: '',
  innerHTML: '',
  value: '',
  placeholder: '',
  scrollTop: 0,
  scrollHeight: 100,
  style: {},
  dataset: {},
  children: [],
  parentNode: { insertBefore: vi.fn() },
  ...overrides,
});

global.document.getElementById = vi.fn((id) => elementsById[id] ?? null);
global.document.querySelector = vi.fn((sel) => elementsBySelector[sel] ?? null);
global.document.querySelectorAll = vi.fn(() => []);
global.document.createElement = vi.fn((tag) => makeStubElement({ tagName: tag }));
global.document.addEventListener = vi.fn((event, handler) => {
  if (!docListeners[event]) docListeners[event] = [];
  docListeners[event].push(handler);
});
global.document.body = makeStubElement();
global.document.documentElement = makeStubElement();
global.document.hidden = false;
global.document.activeElement = null;

global.window = {
  ...(global.window || {}),
  innerWidth: 1024,
  innerHeight: 768,
  addEventListener: vi.fn(),
  visualViewport: null,
  location: { href: '' },
};

// `marked` stays undefined so renderText takes the plain-text fallback (the
// markdown branch is covered by Playwright UI tests). DOMPurify is an identity
// fake — it is never the real sanitizer under test (the app ships the real
// DOMPurify library). The FR-009 test below installs its own fake to assert
// that renderMessage delegates to it; a regex HTML filter here would be both
// pointless and a CodeQL "bad tag filter" false-positive.
global.marked = undefined;
global.DOMPurify = {
  sanitize: vi.fn((html) => String(html)),
};

// ─── Import under test ───────────────────────────────────────────────────────

const chatbot = await import('../../js/chatbot.js');
const { openChatPanel, closeChatPanel } = chatbot;

const { sendMessage } = await import('../../js/chatbot-api.js');
const { executeTool } = await import('../../js/chatbot-tools.js');
const { selectRelevantFiles, loadRelevantSource } = await import('../../js/knowledge.js');
const { getCentralConfigSync } = await import('../../js/config-store.js');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fireDoc(event, e) {
  const list = docListeners[event] || [];
  for (const fn of list) fn(e);
}

function makeBody() {
  // Body needs `children.length` and `appendChild`
  const body = makeStubElement();
  body.children = [];
  const origAppend = body.appendChild;
  body.appendChild = vi.fn((child) => {
    body.children.push(child);
    return origAppend(child);
  });
  return body;
}

function setupBasicPanel({ withMessages = true, withInput = true } = {}) {
  const panel = makeStubElement();
  const title = makeStubElement();
  const sendBtn = makeStubElement();
  const inputArea = makeStubElement();

  panel.querySelector = vi.fn((sel) => {
    if (sel === '.chatbot-panel__title') return title;
    if (sel === '.chatbot-send-btn') return sendBtn;
    if (sel === '.chatbot-input-area') return inputArea;
    return null;
  });

  elementsById['chatbot-panel'] = panel;
  if (withMessages) elementsById['chatbot-messages'] = makeBody();
  if (withInput) elementsById['chatbot-input'] = makeStubElement();

  return { panel, title, sendBtn, inputArea };
}

// Reset per-test state
beforeEach(() => {
  vi.clearAllMocks();
  elementsById = {};
  elementsBySelector = {};
  // Note: do NOT clear _voiceInstances — chatbot.js keeps a module-level
  // _voiceInput cache that's reused across clicks; the latest instance is
  // always _voiceInstances[_voiceInstances.length - 1].
  // Reset module-level `_session` and `_panelOpen` indirectly: we cannot easily,
  // so each test should be tolerant of carry-over state. The module
  // initialises a fresh session lazily; we explicitly close the panel between
  // tests using the API to restore the closed state.
  // Default supported / dismissed
  voiceSupportedImpl = () => true;
  isPrivacyDismissedImpl = () => true;
  // Default sendMessage / executeTool resolutions
  sendMessage.mockResolvedValue({ type: 'text', content: 'ok' });
  executeTool.mockResolvedValue({ result: 'ok' });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('renderMessage sanitization (FR-009)', () => {
  it('routes caller-supplied HTML through DOMPurify.sanitize before insertion', () => {
    const body = makeBody();
    elementsById['chatbot-messages'] = body;

    // Install a fake that returns a fixed, script-free result. renderMessage
    // must insert THIS — proving the raw HTML reached sanitize untouched and
    // that sanitize's output (not the caller input) is what gets inserted.
    const priorDOMPurify = global.DOMPurify;
    global.DOMPurify = { sanitize: vi.fn(() => '<p>safe</p>') };
    try {
      chatbot.renderMessage('assistant', '<script>alert(1)</script><p>safe</p>');

      expect(global.DOMPurify.sanitize).toHaveBeenCalledWith(
        '<script>alert(1)</script><p>safe</p>'
      );
      expect(body.children).toHaveLength(1);
      const div = body.children[0];
      expect(div.innerHTML).toBe('<p>safe</p>');
      expect(div.innerHTML).not.toContain('<script>');
    } finally {
      global.DOMPurify = priorDOMPurify;
    }
  });

  it('is a no-op when the chat body is absent', () => {
    expect(() => chatbot.renderMessage('assistant', '<b>x</b>')).not.toThrow();
  });
});

describe('openChatPanel', () => {
  it('returns silently when panel element is missing', async () => {
    elementsById['chatbot-panel'] = null;
    await expect(openChatPanel()).resolves.toBeUndefined();
  });

  it('opens panel, sets title/placeholder, focuses input', async () => {
    const { panel, title, sendBtn } = setupBasicPanel();
    const input = elementsById['chatbot-input'];
    elementsById['chatbot-audio-btn'] = makeStubElement();

    await openChatPanel();

    expect(panel.classList.add).toHaveBeenCalledWith('chatbot-panel--open');
    expect(panel.removeAttribute).toHaveBeenCalledWith('hidden');
    expect(title.textContent).toBe('chatbot.panel_title');
    expect(input.placeholder).toBe('chatbot.input_placeholder');
    expect(input.focus).toHaveBeenCalled();
    expect(sendBtn.textContent).toBe('chatbot.send_btn');
  });

  it('hides audio button when voice not supported', async () => {
    voiceSupportedImpl = () => false;
    setupBasicPanel();
    const audioBtn = makeStubElement();
    elementsById['chatbot-audio-btn'] = audioBtn;

    await openChatPanel();

    expect(audioBtn.setAttribute).toHaveBeenCalledWith('hidden', '');
  });

  it('shows audio button + sets aria-label when voice supported', async () => {
    voiceSupportedImpl = () => true;
    setupBasicPanel();
    const audioBtn = makeStubElement();
    elementsById['chatbot-audio-btn'] = audioBtn;

    await openChatPanel();

    expect(audioBtn.removeAttribute).toHaveBeenCalledWith('hidden');
    expect(audioBtn.setAttribute).toHaveBeenCalledWith('aria-label', 'voice.start');
  });

  it('does not crash when input or send button or audio button are absent', async () => {
    const panel = makeStubElement();
    panel.querySelector = vi.fn(() => null);
    elementsById['chatbot-panel'] = panel;
    elementsById['chatbot-messages'] = makeBody();
    // no chatbot-input, no audio btn

    await expect(openChatPanel()).resolves.toBeUndefined();
  });
});

describe('closeChatPanel', () => {
  it('returns silently when panel element is missing', () => {
    elementsById['chatbot-panel'] = null;
    expect(() => closeChatPanel()).not.toThrow();
  });

  it('removes the open class and hides after timeout when still closed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-09T10:00:00Z'));
    const { panel } = setupBasicPanel();
    await openChatPanel();
    closeChatPanel();
    expect(panel.classList.remove).toHaveBeenCalledWith('chatbot-panel--open');
    // Fast-forward the 300ms timer
    vi.advanceTimersByTime(400);
    expect(panel.setAttribute).toHaveBeenCalledWith('hidden', '');
    vi.useRealTimers();
  });
});

describe('keydown — Escape closes the panel', () => {
  it('invokes closeChatPanel when Escape pressed and panel open', async () => {
    const { panel } = setupBasicPanel();
    await openChatPanel();
    fireDoc('keydown', { key: 'Escape' });
    expect(panel.classList.remove).toHaveBeenCalledWith('chatbot-panel--open');
  });

  it('does nothing when other key pressed', async () => {
    const { panel } = setupBasicPanel();
    await openChatPanel();
    panel.classList.remove.mockClear();
    fireDoc('keydown', { key: 'a' });
    expect(panel.classList.remove).not.toHaveBeenCalledWith('chatbot-panel--open');
  });
});

describe('click delegation', () => {
  it('close button click triggers closeChatPanel', async () => {
    const { panel } = setupBasicPanel();
    await openChatPanel();
    const target = makeStubElement();
    target.closest = vi.fn((sel) => (sel === '.chatbot-panel__close' ? target : null));
    fireDoc('click', { target });
    expect(panel.classList.remove).toHaveBeenCalledWith('chatbot-panel--open');
  });

  it('open button click triggers openChatPanel', async () => {
    const { panel } = setupBasicPanel();
    const target = makeStubElement();
    target.closest = vi.fn((sel) => (sel === '.chatbot-open-btn' ? target : null));
    fireDoc('click', { target });
    // Wait microtasks for the async openChatPanel to apply DOM changes
    await Promise.resolve();
    await Promise.resolve();
    expect(panel.classList.add).toHaveBeenCalledWith('chatbot-panel--open');
  });

  it('does nothing when target.closest returns null for all selectors', async () => {
    setupBasicPanel();
    const target = makeStubElement();
    target.closest = vi.fn(() => null);
    expect(() => fireDoc('click', { target })).not.toThrow();
  });
});

describe('handleSend (via send button click)', () => {
  beforeEach(() => {
    setupBasicPanel();
    elementsById['chatbot-input'].value = 'hello world';
    // Default config
    getCentralConfigSync.mockReturnValue({
      aiApiKey: 'k',
      aiProxyUrl: 'p',
      aiModel: 'claude-3-haiku',
    });
  });

  function clickSend() {
    const target = makeStubElement();
    target.closest = vi.fn((sel) => (sel === '.chatbot-send-btn' ? target : null));
    fireDoc('click', { target });
  }

  it('does nothing when input is empty', async () => {
    elementsById['chatbot-input'].value = '   ';
    clickSend();
    await Promise.resolve();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('does nothing when input element missing', async () => {
    elementsById['chatbot-input'] = null;
    clickSend();
    await Promise.resolve();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('sends message and renders assistant text reply', async () => {
    sendMessage.mockResolvedValueOnce({ type: 'text', content: 'hi back' });
    selectRelevantFiles.mockReturnValue([]);

    clickSend();
    // wait microtasks for awaits
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(sendMessage).toHaveBeenCalled();
    // Input cleared
    expect(elementsById['chatbot-input'].value).toBe('');
  });

  it('loads relevant source files when knowledge picks them', async () => {
    sendMessage.mockResolvedValueOnce({ type: 'text', content: 'ok' });
    selectRelevantFiles.mockReturnValue(['js/foo.js']);
    loadRelevantSource.mockResolvedValueOnce('source');

    clickSend();
    for (let i = 0; i < 6; i++) await Promise.resolve();

    expect(loadRelevantSource).toHaveBeenCalledWith(['js/foo.js']);
  });

  it('uses default model when central config has no aiModel', async () => {
    getCentralConfigSync.mockReturnValue({ aiProxyUrl: 'p' });
    sendMessage.mockResolvedValueOnce({ type: 'text', content: 'ok' });

    clickSend();
    for (let i = 0; i < 6; i++) await Promise.resolve();

    const cfgArg = sendMessage.mock.calls[0][2];
    expect(cfgArg.aiModel).toBe('claude-haiku-4-5-20251001');
    expect(cfgArg.aiProxyUrl).toBe('p');
    // The key is never projected into the browser-side AI config (issue #114).
    expect(cfgArg.aiApiKey).toBeUndefined();
  });

  it('falls back to empty config object when getCentralConfigSync returns null', async () => {
    getCentralConfigSync.mockReturnValue(null);
    sendMessage.mockResolvedValueOnce({ type: 'text', content: 'ok' });

    clickSend();
    for (let i = 0; i < 6; i++) await Promise.resolve();

    const cfgArg = sendMessage.mock.calls[0][2];
    expect(cfgArg.aiProxyUrl).toBe('');
    expect(cfgArg.aiApiKey).toBeUndefined();
  });

  it('handles tool_use loop and re-queries assistant', async () => {
    sendMessage
      .mockResolvedValueOnce({
        type: 'tool_use',
        id: 'tu1',
        name: 'search',
        input: { q: 'x' },
        text: null,
      })
      .mockResolvedValueOnce({ type: 'text', content: 'final answer' });
    executeTool.mockResolvedValueOnce({ result: 'tool data' });

    clickSend();
    for (let i = 0; i < 10; i++) await Promise.resolve();

    expect(executeTool).toHaveBeenCalledWith('search', { q: 'x' });
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it('captures interim text on tool_use replies', async () => {
    sendMessage
      .mockResolvedValueOnce({
        type: 'tool_use',
        id: 'tu1',
        name: 'search',
        input: {},
        text: 'thinking...',
      })
      .mockResolvedValueOnce({ type: 'text', content: 'done' });
    executeTool.mockResolvedValueOnce({ result: 'data' });

    clickSend();
    for (let i = 0; i < 12; i++) await Promise.resolve();

    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it('handles tool execution failure by stuffing error into tool_result', async () => {
    sendMessage
      .mockResolvedValueOnce({ type: 'tool_use', id: 'tu1', name: 'search', input: {}, text: null })
      .mockResolvedValueOnce({ type: 'text', content: 'sorry' });
    executeTool.mockRejectedValueOnce(new Error('boom'));

    clickSend();
    for (let i = 0; i < 12; i++) await Promise.resolve();

    expect(executeTool).toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it('falls back to tool result text when sendMessage throws inside loop', async () => {
    sendMessage
      .mockResolvedValueOnce({ type: 'tool_use', id: 'tu1', name: 'search', input: {}, text: null })
      .mockRejectedValueOnce(new Error('network'));
    executeTool.mockResolvedValueOnce({ result: 'fallback' });

    clickSend();
    for (let i = 0; i < 14; i++) await Promise.resolve();

    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it('renders error block when sendMessage rejects on first call', async () => {
    sendMessage.mockRejectedValueOnce(new Error('boom'));

    clickSend();
    for (let i = 0; i < 8; i++) await Promise.resolve();

    // The body should have received an error appendChild
    expect(elementsById['chatbot-messages'].appendChild).toHaveBeenCalled();
  });

  it('retry button click re-submits the failed input', async () => {
    sendMessage.mockRejectedValueOnce(new Error('boom'));

    // Capture the retryBtn created via document.createElement('button')
    let createdRetryBtn;
    const origCreate = global.document.createElement;
    global.document.createElement = vi.fn((tag) => {
      const el = makeStubElement({ tagName: tag });
      if (tag === 'button') createdRetryBtn = el;
      return el;
    });

    clickSend();
    for (let i = 0; i < 8; i++) await Promise.resolve();

    expect(createdRetryBtn).toBeDefined();
    expect(typeof createdRetryBtn.onclick).toBe('function');

    // Set up second send to succeed
    sendMessage.mockResolvedValueOnce({ type: 'text', content: 'recovered' });

    // Trigger the retry: invoke the button's onclick handler
    createdRetryBtn.onclick();
    for (let i = 0; i < 8; i++) await Promise.resolve();

    // sendMessage should have been called again (retry)
    expect(sendMessage).toHaveBeenCalledTimes(2);

    global.document.createElement = origCreate;
  });

  it('renders error with proxyUrl link when error references the URL', async () => {
    const err = new Error('Cannot reach http://proxy.example/v1/messages right now');
    err.proxyUrl = 'http://proxy.example/v1/messages';
    sendMessage.mockRejectedValueOnce(err);

    clickSend();
    for (let i = 0; i < 8; i++) await Promise.resolve();

    // createElement was called for the anchor (a) tag
    const calls = global.document.createElement.mock.calls.map((c) => c[0]);
    expect(calls).toContain('a');
  });

  it('ignores re-entrant clicks while loading', async () => {
    let resolveSend;
    sendMessage.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolveSend = r;
        })
    );

    clickSend();
    await Promise.resolve();
    // Now press again while loading
    elementsById['chatbot-input'].value = 'second';
    clickSend();
    await Promise.resolve();
    // Only the first call queued
    expect(sendMessage).toHaveBeenCalledTimes(1);

    // Clean up so the safety timeout doesn't dangle
    resolveSend({ type: 'text', content: 'ok' });
    for (let i = 0; i < 6; i++) await Promise.resolve();
  });
});

// The chatbot module caches a single _voiceInput instance forever; the
// audioBtn referenced inside that VoiceInput's callbacks is captured once
// and never refreshed. So all voice tests must share the SAME audioBtn
// element instance. We freeze it on first use.
let _sharedAudioBtn = null;
function getSharedAudioBtn() {
  if (!_sharedAudioBtn) _sharedAudioBtn = makeStubElement();
  // Reset its mock spies between tests
  _sharedAudioBtn.classList.add.mockClear?.();
  _sharedAudioBtn.classList.remove.mockClear?.();
  _sharedAudioBtn.setAttribute.mockClear?.();
  _sharedAudioBtn.removeAttribute.mockClear?.();
  return _sharedAudioBtn;
}

describe('audio button (handleAudioClick)', () => {
  // Reset cached voice input state at the start of each test (its module-level
  // singleton lives across tests).
  beforeEach(() => {
    const v = lastVoice();
    if (v) {
      v.state = 'idle';
      v.interimTranscript = '';
      v.finalTranscript = '';
      v.start.mockClear?.();
      v.stop.mockClear?.();
      v.cancel.mockClear?.();
    }
  });

  it('starts voice input when idle and privacy already dismissed', async () => {
    isPrivacyDismissedImpl = () => true;
    setupBasicPanel();
    const audioBtn = getSharedAudioBtn();
    elementsById['chatbot-audio-btn'] = audioBtn;
    await openChatPanel();

    const target = makeStubElement();
    target.closest = vi.fn((sel) => (sel === '#chatbot-audio-btn' ? audioBtn : null));
    fireDoc('click', { target });
    for (let i = 0; i < 4; i++) await Promise.resolve();

    expect(_voiceInstances.length).toBe(1);
    expect(_voiceInstances[0].start).toHaveBeenCalled();
  });

  it('reuses voice input instance across clicks', async () => {
    isPrivacyDismissedImpl = () => true;
    setupBasicPanel();
    const audioBtn = getSharedAudioBtn();
    elementsById['chatbot-audio-btn'] = audioBtn;
    await openChatPanel();

    const target = makeStubElement();
    target.closest = vi.fn((sel) => (sel === '#chatbot-audio-btn' ? audioBtn : null));

    fireDoc('click', { target });
    for (let i = 0; i < 4; i++) await Promise.resolve();
    fireDoc('click', { target });
    for (let i = 0; i < 4; i++) await Promise.resolve();

    // _voiceInput reused; only one instance
    expect(_voiceInstances.length).toBeLessThanOrEqual(2);
  });

  it('stops recording when state is recording and finalTranscript present', async () => {
    setupBasicPanel();
    const audioBtn = getSharedAudioBtn();
    elementsById['chatbot-audio-btn'] = audioBtn;
    await openChatPanel();

    const target = makeStubElement();
    target.closest = vi.fn((sel) => (sel === '#chatbot-audio-btn' ? audioBtn : null));
    // First click creates the instance
    fireDoc('click', { target });
    for (let i = 0; i < 4; i++) await Promise.resolve();

    const vi1 = lastVoice();
    vi1.state = 'recording';
    vi1.finalTranscript = 'spoken';

    // Need closest to match #chatbot-audio-btn for the second click too
    const target2 = makeStubElement();
    target2.closest = vi.fn((sel) => (sel === '#chatbot-audio-btn' ? audioBtn : null));
    fireDoc('click', { target: target2 });
    for (let i = 0; i < 4; i++) await Promise.resolve();

    expect(vi1.stop).toHaveBeenCalled();
  });

  it('cancels recording when state is recording but no transcript', async () => {
    setupBasicPanel();
    const audioBtn = getSharedAudioBtn();
    elementsById['chatbot-audio-btn'] = audioBtn;
    await openChatPanel();

    const target = makeStubElement();
    target.closest = vi.fn((sel) => (sel === '#chatbot-audio-btn' ? audioBtn : null));
    fireDoc('click', { target });
    for (let i = 0; i < 4; i++) await Promise.resolve();

    const vi1 = lastVoice();
    vi1.state = 'recording';
    vi1.finalTranscript = '';
    vi1.interimTranscript = '';

    fireDoc('click', { target });
    for (let i = 0; i < 4; i++) await Promise.resolve();

    expect(vi1.cancel).toHaveBeenCalled();
  });

  it('shows privacy notice when not yet dismissed; aborts when not accepted', async () => {
    isPrivacyDismissedImpl = () => false;
    setupBasicPanel();
    const audioBtn = getSharedAudioBtn();
    elementsById['chatbot-audio-btn'] = audioBtn;
    await openChatPanel();

    const target = makeStubElement();
    target.closest = vi.fn((sel) => (sel === '#chatbot-audio-btn' ? audioBtn : null));
    fireDoc('click', { target });
    for (let i = 0; i < 4; i++) await Promise.resolve();

    // Privacy notice was created (a div + a button)
    const created = global.document.createElement.mock.calls.map((c) => c[0]);
    expect(created).toContain('div');
    expect(created).toContain('button');
  });

  it('returns false from showPrivacyNotice when panel missing', async () => {
    // Force getPanel to return null
    isPrivacyDismissedImpl = () => false;
    elementsById['chatbot-panel'] = null;
    elementsById['chatbot-audio-btn'] = makeStubElement();
    // Set up an idle voice input so the click reaches the privacy branch
    const audioBtn = elementsById['chatbot-audio-btn'];
    const target = makeStubElement();
    target.closest = vi.fn((sel) => (sel === '#chatbot-audio-btn' ? audioBtn : null));
    fireDoc('click', { target });
    for (let i = 0; i < 4; i++) await Promise.resolve();

    // Either privacy notice fails (no panel) and start is not called,
    // or start is not called because privacy was rejected. Either way:
    const lastInstance = _voiceInstances[_voiceInstances.length - 1];
    if (lastInstance) {
      expect(lastInstance.start).not.toHaveBeenCalled();
    }
  });

  it('VoiceInput callbacks: onStart adds recording class to audio btn', async () => {
    setupBasicPanel();
    const audioBtn = getSharedAudioBtn();
    elementsById['chatbot-audio-btn'] = audioBtn;
    await openChatPanel();

    const target = makeStubElement();
    target.closest = vi.fn((sel) => (sel === '#chatbot-audio-btn' ? audioBtn : null));
    fireDoc('click', { target });
    for (let i = 0; i < 4; i++) await Promise.resolve();

    const vi1 = lastVoice();
    vi1.callbacks.onStart();
    expect(audioBtn.classList.add).toHaveBeenCalledWith('recording');
    expect(audioBtn.textContent).toBe('⏹');
  });

  it('VoiceInput callbacks: onInterim updates input value with prefix', async () => {
    setupBasicPanel();
    const audioBtn = getSharedAudioBtn();
    elementsById['chatbot-audio-btn'] = audioBtn;
    await openChatPanel();

    const input = elementsById['chatbot-input'];
    // handleAudioClick captures input.value into dataset.preVoiceText, so set
    // the value BEFORE clicking — then the callback prepends it.
    input.value = 'pre';

    const target = makeStubElement();
    target.closest = vi.fn((sel) => (sel === '#chatbot-audio-btn' ? audioBtn : null));
    fireDoc('click', { target });
    for (let i = 0; i < 4; i++) await Promise.resolve();

    const vi1 = lastVoice();
    vi1.callbacks.onInterim('hello');
    expect(input.value).toBe('pre hello');
  });

  it('VoiceInput callbacks: onInterim with no prefix sets text directly', async () => {
    setupBasicPanel();
    elementsById['chatbot-audio-btn'] = getSharedAudioBtn();
    await openChatPanel();
    const input = elementsById['chatbot-input'];
    input.dataset = {};

    const target = makeStubElement();
    target.closest = vi.fn((sel) =>
      sel === '#chatbot-audio-btn' ? elementsById['chatbot-audio-btn'] : null
    );
    fireDoc('click', { target });
    for (let i = 0; i < 4; i++) await Promise.resolve();

    const vi1 = lastVoice();
    vi1.callbacks.onInterim('hi');
    expect(input.value).toBe('hi');
  });

  it('VoiceInput callbacks: onInterim returns early when input missing', async () => {
    setupBasicPanel();
    elementsById['chatbot-audio-btn'] = getSharedAudioBtn();
    await openChatPanel();

    const target = makeStubElement();
    target.closest = vi.fn((sel) =>
      sel === '#chatbot-audio-btn' ? elementsById['chatbot-audio-btn'] : null
    );
    fireDoc('click', { target });
    for (let i = 0; i < 4; i++) await Promise.resolve();

    elementsById['chatbot-input'] = null;
    const vi1 = lastVoice();
    expect(() => vi1.callbacks.onInterim('hi')).not.toThrow();
  });

  it('VoiceInput callbacks: onFinal sets input + triggers handleSend', async () => {
    setupBasicPanel();
    elementsById['chatbot-audio-btn'] = getSharedAudioBtn();
    await openChatPanel();
    const input = elementsById['chatbot-input'];
    input.value = '';
    input.dataset = { preVoiceText: '' };

    const target = makeStubElement();
    target.closest = vi.fn((sel) =>
      sel === '#chatbot-audio-btn' ? elementsById['chatbot-audio-btn'] : null
    );
    fireDoc('click', { target });
    for (let i = 0; i < 4; i++) await Promise.resolve();

    sendMessage.mockResolvedValueOnce({ type: 'text', content: 'ok' });
    const vi1 = lastVoice();
    vi1.callbacks.onFinal('typed via voice');
    for (let i = 0; i < 8; i++) await Promise.resolve();

    expect(input.value).toBe('');
    expect(sendMessage).toHaveBeenCalled();
  });

  it('VoiceInput callbacks: onFinal returns early when input missing', async () => {
    setupBasicPanel();
    elementsById['chatbot-audio-btn'] = getSharedAudioBtn();
    await openChatPanel();

    const target = makeStubElement();
    target.closest = vi.fn((sel) =>
      sel === '#chatbot-audio-btn' ? elementsById['chatbot-audio-btn'] : null
    );
    fireDoc('click', { target });
    for (let i = 0; i < 4; i++) await Promise.resolve();

    elementsById['chatbot-input'] = null;
    const vi1 = lastVoice();
    expect(() => vi1.callbacks.onFinal('hi')).not.toThrow();
  });

  it('VoiceInput callbacks: onError shows error + restores input', async () => {
    setupBasicPanel();
    elementsById['chatbot-audio-btn'] = getSharedAudioBtn();
    await openChatPanel();
    const input = elementsById['chatbot-input'];
    input.value = 'restored';

    const target = makeStubElement();
    target.closest = vi.fn((sel) =>
      sel === '#chatbot-audio-btn' ? elementsById['chatbot-audio-btn'] : null
    );
    fireDoc('click', { target });
    for (let i = 0; i < 4; i++) await Promise.resolve();

    // After click, dataset.preVoiceText='restored' and input.value='restored'.
    // Simulate transcript captured: input.value mutated by recognition.
    input.value = 'recognized text';
    const vi1 = lastVoice();
    vi1.callbacks.onError('permission-denied');
    expect(input.value).toBe('restored');
  });

  it('VoiceInput callbacks: onError handles all known codes', async () => {
    setupBasicPanel();
    elementsById['chatbot-audio-btn'] = getSharedAudioBtn();
    await openChatPanel();

    const target = makeStubElement();
    target.closest = vi.fn((sel) =>
      sel === '#chatbot-audio-btn' ? elementsById['chatbot-audio-btn'] : null
    );
    fireDoc('click', { target });
    for (let i = 0; i < 4; i++) await Promise.resolve();

    const vi1 = lastVoice();
    expect(() => vi1.callbacks.onError('no-speech')).not.toThrow();
    expect(() => vi1.callbacks.onError('network')).not.toThrow();
    expect(() => vi1.callbacks.onError('unknown-code')).not.toThrow();
  });

  it('VoiceInput callbacks: onCancel restores input value', async () => {
    setupBasicPanel();
    elementsById['chatbot-audio-btn'] = getSharedAudioBtn();
    await openChatPanel();
    const input = elementsById['chatbot-input'];
    input.value = 'before-voice';

    const target = makeStubElement();
    target.closest = vi.fn((sel) =>
      sel === '#chatbot-audio-btn' ? elementsById['chatbot-audio-btn'] : null
    );
    fireDoc('click', { target });
    for (let i = 0; i < 4; i++) await Promise.resolve();

    // Simulate recognition mutating input.value
    input.value = 'partial transcript';
    const vi1 = lastVoice();
    vi1.callbacks.onCancel();
    expect(input.value).toBe('before-voice');
  });

  it('VoiceInput callbacks: onMaxDuration renders error message', async () => {
    setupBasicPanel();
    elementsById['chatbot-audio-btn'] = getSharedAudioBtn();
    await openChatPanel();

    const target = makeStubElement();
    target.closest = vi.fn((sel) =>
      sel === '#chatbot-audio-btn' ? elementsById['chatbot-audio-btn'] : null
    );
    fireDoc('click', { target });
    for (let i = 0; i < 4; i++) await Promise.resolve();

    const vi1 = lastVoice();
    expect(() => vi1.callbacks.onMaxDuration()).not.toThrow();
  });
});

describe('visibilitychange listener', () => {
  beforeEach(() => {
    const v = lastVoice();
    if (v) {
      v.state = 'idle';
      v.start.mockClear?.();
      v.stop.mockClear?.();
      v.cancel.mockClear?.();
    }
  });

  it('stops voice input when document is hidden during recording', async () => {
    setupBasicPanel();
    elementsById['chatbot-audio-btn'] = getSharedAudioBtn();
    await openChatPanel();

    const target = makeStubElement();
    target.closest = vi.fn((sel) =>
      sel === '#chatbot-audio-btn' ? elementsById['chatbot-audio-btn'] : null
    );
    fireDoc('click', { target });
    for (let i = 0; i < 4; i++) await Promise.resolve();

    const vi1 = lastVoice();
    vi1.state = 'recording';
    global.document.hidden = true;
    fireDoc('visibilitychange', {});

    expect(vi1.stop).toHaveBeenCalled();
    global.document.hidden = false;
  });

  it('does nothing when document not hidden', () => {
    global.document.hidden = false;
    expect(() => fireDoc('visibilitychange', {})).not.toThrow();
  });

  it('does nothing when no voice input exists', () => {
    global.document.hidden = true;
    // Note: _voiceInput state is module-level. After previous tests it may exist.
    // This still validates the guard branch executes safely.
    expect(() => fireDoc('visibilitychange', {})).not.toThrow();
    global.document.hidden = false;
  });
});

describe('Enter key submits input', () => {
  it('sends message on Enter when input is focused', async () => {
    setupBasicPanel();
    elementsById['chatbot-input'].value = 'hello';
    global.document.activeElement = elementsById['chatbot-input'];
    getCentralConfigSync.mockReturnValue({ aiApiKey: 'k', aiProxyUrl: 'p', aiModel: 'claude-3' });
    sendMessage.mockResolvedValueOnce({ type: 'text', content: 'ok' });

    const e = { key: 'Enter', shiftKey: false, preventDefault: vi.fn() };
    fireDoc('keydown', e);
    for (let i = 0; i < 6; i++) await Promise.resolve();

    expect(e.preventDefault).toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalled();

    global.document.activeElement = null;
  });

  it('does not submit on Shift+Enter', () => {
    setupBasicPanel();
    global.document.activeElement = elementsById['chatbot-input'];
    const e = { key: 'Enter', shiftKey: true, preventDefault: vi.fn() };
    fireDoc('keydown', e);
    expect(e.preventDefault).not.toHaveBeenCalled();
    global.document.activeElement = null;
  });

  it('does not submit on Enter when input not focused', () => {
    setupBasicPanel();
    global.document.activeElement = null;
    const e = { key: 'Enter', shiftKey: false, preventDefault: vi.fn() };
    fireDoc('keydown', e);
    expect(e.preventDefault).not.toHaveBeenCalled();
  });
});

describe('module re-import: panel resize handle', () => {
  it('attaches mousedown handler when .chatbot-panel__resize exists', async () => {
    // Reset modules and re-import with the resize handle present.
    const handle = makeStubElement();
    elementsBySelector['.chatbot-panel__resize'] = handle;

    vi.resetModules();
    await import('../../js/chatbot.js');

    // The module attached a mousedown listener to the handle.
    expect(handle.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));

    // Invoke the mousedown to begin dragging
    const mdHandler = handle.addEventListener.mock.calls.find((c) => c[0] === 'mousedown')[1];
    const e = { preventDefault: vi.fn() };
    mdHandler(e);
    expect(e.preventDefault).toHaveBeenCalled();

    // Now find the doc 'mousemove' listener (newly registered after reset)
    // The new docListeners now have a fresh 'mousemove' entry
    const mmList = docListeners['mousemove'] || [];
    expect(mmList.length).toBeGreaterThan(0);

    // Set up a panel for the move handler
    const panel = makeStubElement();
    elementsById['chatbot-panel'] = panel;

    // Invoke move with a clientX
    mmList[mmList.length - 1]({ clientX: 200 });
    expect(panel.style.width).toBeDefined();

    // Mouseup ends drag
    const muList = docListeners['mouseup'] || [];
    expect(muList.length).toBeGreaterThan(0);
    muList[muList.length - 1]({});

    // Subsequent mousemove should be a no-op (dragging=false)
    panel.style.width = 'unchanged';
    mmList[mmList.length - 1]({ clientX: 999 });
    expect(panel.style.width).toBe('unchanged');
  });

  it('mousemove no-ops when not dragging', async () => {
    // After previous test ended drag, fire a fresh mousemove without a prior mousedown
    const mmList = docListeners['mousemove'] || [];
    expect(() => mmList[mmList.length - 1]?.({ clientX: 100 })).not.toThrow();
  });

  it('mousemove no-ops when panel missing during drag', async () => {
    // Reset modules and re-import again with handle present
    elementsById = {};
    elementsBySelector = {};
    const handle = makeStubElement();
    elementsBySelector['.chatbot-panel__resize'] = handle;
    vi.resetModules();
    await import('../../js/chatbot.js');

    // Begin dragging
    const mdHandler = handle.addEventListener.mock.calls.find((c) => c[0] === 'mousedown')[1];
    mdHandler({ preventDefault: vi.fn() });

    // No panel registered → mousemove path returns early
    elementsById['chatbot-panel'] = null;
    const mmList = docListeners['mousemove'];
    expect(() => mmList[mmList.length - 1]({ clientX: 200 })).not.toThrow();
  });
});

describe('module re-import: visualViewport adjustment', () => {
  it('attaches resize+scroll listeners and sets CSS vars when visualViewport present', async () => {
    const setProperty = vi.fn();
    global.document.documentElement = makeStubElement({
      style: { setProperty },
    });
    const vvAddListener = vi.fn();
    global.window.visualViewport = {
      height: 800,
      offsetTop: 10,
      addEventListener: vvAddListener,
    };

    vi.resetModules();
    await import('../../js/chatbot.js');

    // adjustPanelHeight ran once at load → setProperty called for both vars
    expect(setProperty).toHaveBeenCalledWith('--vv-height', '800px');
    expect(setProperty).toHaveBeenCalledWith('--vv-offset', '10px');
    // resize + scroll listeners attached
    expect(vvAddListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(vvAddListener).toHaveBeenCalledWith('scroll', expect.any(Function));

    global.window.visualViewport = null;
  });
});

describe('renderText markdown branch', () => {
  it('uses marked + DOMPurify when both globals present', async () => {
    global.marked = { parse: vi.fn((text) => `<p>${text}</p>`) };
    global.DOMPurify = { sanitize: vi.fn((html) => html) };

    setupBasicPanel();
    elementsById['chatbot-input'].value = 'render me';
    getCentralConfigSync.mockReturnValue({ aiApiKey: 'k', aiProxyUrl: 'p', aiModel: 'claude-3' });
    sendMessage.mockResolvedValueOnce({ type: 'text', content: 'reply' });

    const target = makeStubElement();
    target.closest = vi.fn((sel) => (sel === '.chatbot-send-btn' ? target : null));
    fireDoc('click', { target });
    for (let i = 0; i < 8; i++) await Promise.resolve();

    expect(global.marked.parse).toHaveBeenCalled();
    expect(global.DOMPurify.sanitize).toHaveBeenCalled();

    global.marked = undefined;
    global.DOMPurify = undefined;
  });
});
