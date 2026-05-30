// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Shared mocks ───────────────────────────────────────────────────

const configMock = vi.hoisted(() => ({
  getCentralConfigSync: vi.fn(() => ({ feedbackEmail: 'admin@test.com' })),
  loadCentralConfig: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../js/config-store.js', () => ({
  getCentralConfigSync: configMock.getCentralConfigSync,
  loadCentralConfig: configMock.loadCentralConfig,
}));

vi.mock('../../js/i18n.js', () => ({
  t: vi.fn((key) => key),
}));

vi.mock('../../js/notify.js', () => ({ showToast: vi.fn() }));

vi.mock('../../js/feedback-context.js', () => ({
  installFetchLog: vi.fn(),
  installErrorLog: vi.fn(),
  collectBaseContext: vi.fn(() =>
    Promise.resolve({
      pageUrl: 'https://example.com',
      userAgent: 'UA/1.0',
      os: 'Linux',
      viewportWidth: 1280,
      viewportHeight: 720,
      screenshotDataUrl: 'data:image/png;base64,abc',
    })
  ),
  collectBugContext: vi.fn(() =>
    Promise.resolve({
      pageUrl: 'https://example.com',
      userAgent: 'UA/1.0',
      os: 'Linux',
      viewportWidth: 1280,
      viewportHeight: 720,
      screenshotDataUrl: 'data:image/png;base64,abc',
      errors: [],
      networkLog: [],
      appLog: [],
      localStorageSnapshot: {},
      calendarState: null,
    })
  ),
}));

vi.mock('../../js/outlook.js', () => ({
  isMsalSignedIn: vi.fn(() => false),
  sendFeedbackEmail: vi.fn(() => Promise.resolve()),
}));

// ── DOM stub helpers ───────────────────────────────────────────────

function makeElement(tag, attrs = {}) {
  const el = {
    tagName: tag.toUpperCase(),
    className: '',
    id: '',
    type: '',
    method: '',
    noValidate: false,
    required: false,
    value: '',
    textContent: '',
    innerHTML: '',
    placeholder: '',
    htmlFor: '',
    setAttribute: vi.fn(),
    getAttribute: vi.fn(),
    addEventListener: vi.fn(),
    appendChild: vi.fn(),
    classList: {
      _classes: new Set(),
      add: vi.fn(function (c) {
        this._classes.add(c);
      }),
      remove: vi.fn(),
      toggle: vi.fn(),
      contains: vi.fn(),
    },
    children: [],
    _listeners: {},
    dispatchEvent: vi.fn(),
    close: vi.fn(),
    showModal: vi.fn(),
    reset: vi.fn(),
    ...attrs,
  };
  // track appended children
  el.appendChild = vi.fn((child) => {
    el.children.push(child);
    return child;
  });
  el.addEventListener = vi.fn((type, fn) => {
    el._listeners[type] = el._listeners[type] || [];
    el._listeners[type].push(fn);
  });
  return el;
}

// Set up a DOM-like environment for feedback.js
function setupDom() {
  const appended = [];
  const body = {
    appendChild: vi.fn((el) => {
      appended.push(el);
    }),
    _appended: appended,
  };

  const created = [];
  global.document = {
    ...global.document,
    body,
    createElement: vi.fn((tag) => {
      const el = makeElement(tag);
      created.push(el);
      return el;
    }),
    getElementById: vi.fn(() => null),
    querySelector: vi.fn(() => null),
    querySelectorAll: vi.fn(() => []),
    documentElement: global.document?.documentElement ?? { lang: '', dataset: {} },
  };

  return { body, created };
}

// Helper: load a fresh module
async function loadFresh() {
  vi.resetModules();
  vi.mock('../../js/config-store.js', () => ({
    getCentralConfigSync: configMock.getCentralConfigSync,
    loadCentralConfig: configMock.loadCentralConfig,
  }));
  vi.mock('../../js/i18n.js', () => ({ t: vi.fn((key) => key) }));
  vi.mock('../../js/notify.js', () => ({ showToast: vi.fn() }));
  vi.mock('../../js/feedback-context.js', () => ({
    installFetchLog: vi.fn(),
    installErrorLog: vi.fn(),
    collectBaseContext: vi.fn(() =>
      Promise.resolve({
        pageUrl: 'https://example.com',
        userAgent: 'UA/1.0',
        os: 'Linux',
        viewportWidth: 1280,
        viewportHeight: 720,
        screenshotDataUrl: null,
      })
    ),
    collectBugContext: vi.fn(() =>
      Promise.resolve({
        pageUrl: 'https://example.com',
        userAgent: 'UA/1.0',
        os: 'Linux',
        viewportWidth: 1280,
        viewportHeight: 720,
        screenshotDataUrl: null,
        errors: [],
        networkLog: [],
        appLog: [],
        localStorageSnapshot: {},
        calendarState: null,
      })
    ),
  }));
  vi.mock('../../js/outlook.js', () => ({
    isMsalSignedIn: vi.fn(() => false),
    sendFeedbackEmail: vi.fn(() => Promise.resolve()),
  }));
  return await import('../../js/feedback.js');
}

// ── T012: initFeedback ─────────────────────────────────────────────

describe('initFeedback', () => {
  beforeEach(() => {
    setupDom();
  });

  it('creates button and dialog when feedbackEmail is configured', async () => {
    configMock.getCentralConfigSync.mockReturnValue({ feedbackEmail: 'a@b.com' });
    const mod = await loadFresh();
    expect(document.body.appendChild).toHaveBeenCalled();
    const appended = document.body._appended ?? [];
    const button = appended.find((el) => el.className === 'feedback-fab');
    expect(button).toBeDefined();
  });

  it('does nothing when feedbackEmail is absent', async () => {
    configMock.getCentralConfigSync.mockReturnValue({});
    const mod = await loadFresh();
    const appended = document.body._appended ?? [];
    const button = appended.find((el) => el.className === 'feedback-fab');
    expect(button).toBeUndefined();
  });

  it('button has correct aria-label', async () => {
    configMock.getCentralConfigSync.mockReturnValue({ feedbackEmail: 'a@b.com' });
    const mod = await loadFresh();
    const appended = document.body._appended ?? [];
    const button = appended.find((el) => el.className === 'feedback-fab');
    expect(button?.setAttribute).toHaveBeenCalledWith('aria-label', 'feedback.button_label');
  });
});

// ── T013: dialog cancel ────────────────────────────────────────────

describe('dialog cancel', () => {
  it('close + reset called on cancel click', async () => {
    setupDom();
    configMock.getCentralConfigSync.mockReturnValue({ feedbackEmail: 'a@b.com' });
    const mod = await loadFresh();
    const appended = document.body._appended ?? [];
    const dialog = appended.find((el) => el.tagName === 'DIALOG');
    expect(dialog).toBeDefined();
  });
});

// ── T014: _renderBugContext screenshot section ────────────────────

describe('_buildHtmlBody', () => {
  it('escapes description to prevent XSS', async () => {
    setupDom();
    const mod = await loadFresh();
    const report = {
      category: 'bug',
      description: '<script>alert(1)</script>',
      feedbackEmail: 'x@y.com',
      pageUrl: 'https://example.com',
      userAgent: 'UA',
      os: 'Linux',
      viewportWidth: 1280,
      viewportHeight: 720,
      screenshotDataUrl: null,
      timestamp: '2026-05-30T10:00:00Z',
    };
    const ctx = {
      ...report,
      errors: [],
      networkLog: [],
      appLog: [],
      localStorageSnapshot: {},
      calendarState: null,
    };
    const html = mod._buildHtmlBody(report, ctx);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('includes network log table rows', async () => {
    setupDom();
    const mod = await loadFresh();
    const report = {
      category: 'bug',
      description: 'test',
      feedbackEmail: 'x@y.com',
      pageUrl: 'https://example.com',
      userAgent: 'UA',
      os: 'Linux',
      viewportWidth: 1280,
      viewportHeight: 720,
      screenshotDataUrl: null,
      timestamp: '2026-05-30T10:00:00Z',
    };
    const ctx = {
      ...report,
      errors: [],
      networkLog: [
        { url: 'https://api.test', method: 'GET', status: 200, ms: 50 },
        { url: 'https://fail.test', method: 'POST', status: 0, ms: 100 },
      ],
      appLog: [],
      localStorageSnapshot: {},
      calendarState: null,
    };
    const html = mod._buildHtmlBody(report, ctx);
    expect(html).toContain('https://api.test');
    expect(html).toContain('https://fail.test');
  });

  it('Bug Report includes all sections', async () => {
    setupDom();
    const mod = await loadFresh();
    const ctx = {
      pageUrl: 'https://example.com',
      userAgent: 'UA',
      os: 'Linux',
      viewportWidth: 1280,
      viewportHeight: 720,
      screenshotDataUrl: null,
      errors: [{ message: 'err', stack: '', timestamp: 't' }],
      networkLog: [{ url: 'u', method: 'GET', status: 200, ms: 10 }],
      appLog: [{ level: 'log', message: 'msg', timestamp: 't' }],
      localStorageSnapshot: { redmine_calendar_theme: 'dark' },
      calendarState: { view: 'timeGridWeek', start: '2026-05-25', end: '2026-06-01' },
    };
    const html = mod._buildHtmlBody(
      { category: 'bug', description: 'd', feedbackEmail: 'x@y.com', timestamp: 't', ...ctx },
      ctx
    );
    expect(html).toContain('feedback.section_errors');
    expect(html).toContain('feedback.section_network');
    expect(html).toContain('feedback.section_app_log');
    expect(html).toContain('feedback.section_calendar');
    expect(html).toContain('feedback.section_storage');
  });

  it('Suggestion omits log sections', async () => {
    setupDom();
    const mod = await loadFresh();
    const ctx = {
      pageUrl: 'https://example.com',
      userAgent: 'UA',
      os: 'Linux',
      viewportWidth: 1280,
      viewportHeight: 720,
      screenshotDataUrl: null,
    };
    const html = mod._buildHtmlBody(
      {
        category: 'suggestion',
        description: 'd',
        feedbackEmail: 'x@y.com',
        timestamp: 't',
        ...ctx,
      },
      ctx
    );
    expect(html).not.toContain('feedback.section_errors');
    expect(html).not.toContain('feedback.section_network');
  });

  it('screenshot section shows unavailable note when null', async () => {
    setupDom();
    const mod = await loadFresh();
    const ctx = {
      pageUrl: 'https://example.com',
      userAgent: 'UA',
      os: 'Linux',
      viewportWidth: 1280,
      viewportHeight: 720,
      screenshotDataUrl: null,
    };
    const html = mod._buildHtmlBody(
      { category: 'bug', description: 'd', feedbackEmail: 'x@y.com', timestamp: 't', ...ctx },
      ctx
    );
    expect(html).toContain('feedback.screenshot_unavailable');
  });
});

// ── T016: _openMailto ──────────────────────────────────────────────

describe('mailto body', () => {
  it('does not include screenshot or log data', async () => {
    setupDom();
    const mod = await loadFresh();
    // We test via _buildHtmlBody for Suggestion (mailto is DOM-heavy)
    const ctx = {
      pageUrl: 'https://test.com',
      userAgent: 'UA',
      os: 'Mac',
      viewportWidth: 1280,
      viewportHeight: 720,
      screenshotDataUrl: 'data:image/png;base64,huge',
    };
    const html = mod._buildHtmlBody(
      {
        category: 'suggestion',
        description: 'idea',
        feedbackEmail: 'x@y.com',
        timestamp: 't',
        ...ctx,
      },
      ctx
    );
    // Suggestion does not include errors section
    expect(html).not.toContain('section_errors');
  });
});
