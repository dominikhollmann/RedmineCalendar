// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Shared mocks ───────────────────────────────────────────────────

const configMock = vi.hoisted(() => ({
  getCentralConfigSync: vi.fn(() => ({ feedback: { system: 'redmine', redmineProjectId: 1 } })),
  loadCentralConfig: vi.fn(() => Promise.resolve()),
}));

const ticketMock = vi.hoisted(() => ({
  createRedmineTicket: vi.fn(() => Promise.resolve({ ok: true, ticketUrl: 'https://r/issues/1' })),
  openGithubForm: vi.fn(),
}));

const notifyMock = vi.hoisted(() => ({ showToast: vi.fn() }));

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
    checked: false,
    hidden: false,
    disabled: false,
    value: '',
    textContent: '',
    innerHTML: '',
    placeholder: '',
    htmlFor: '',
    setAttribute: vi.fn(),
    getAttribute: vi.fn(),
    addEventListener: vi.fn(),
    appendChild: vi.fn(),
    insertAdjacentElement: vi.fn(),
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

function setupDom() {
  const appended = [];
  const body = {
    appendChild: vi.fn((el) => {
      appended.push(el);
    }),
    _appended: appended,
  };

  const appHeaderChildren = [];
  const appHeader = makeElement('div');
  appHeader.insertBefore = vi.fn((el) => {
    appHeaderChildren.push(el);
  });
  appHeader.appendChild = vi.fn((el) => {
    appHeaderChildren.push(el);
  });
  appHeader.querySelector = vi.fn(() => null);
  appHeader._children = appHeaderChildren;

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
    querySelector: vi.fn((sel) => {
      if (sel === '.app-header') return appHeader;
      return null;
    }),
    querySelectorAll: vi.fn(() => []),
    documentElement: global.document?.documentElement ?? { lang: '', dataset: {} },
    _appHeader: appHeader,
    _appHeaderChildren: appHeaderChildren,
    _created: created,
  };

  return { body, created, appHeader, appHeaderChildren };
}

// Helper: load a fresh module
async function loadFresh() {
  vi.resetModules();
  vi.doMock('../../js/config-store.js', () => ({
    getCentralConfigSync: configMock.getCentralConfigSync,
    loadCentralConfig: configMock.loadCentralConfig,
  }));
  vi.doMock('../../js/i18n.js', () => ({ t: vi.fn((key) => key) }));
  vi.doMock('../../js/notify.js', () => ({ showToast: notifyMock.showToast }));
  vi.doMock('../../js/feedback-context.js', () => ({
    installFetchLog: vi.fn(),
    installErrorLog: vi.fn(),
    captureScreenshotTab: vi.fn(() => Promise.resolve(null)),
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
  vi.doMock('../../js/feedback-ticket.js', () => ({
    createRedmineTicket: ticketMock.createRedmineTicket,
    openGithubForm: ticketMock.openGithubForm,
  }));
  return await import('../../js/feedback.js');
}

beforeEach(() => {
  ticketMock.createRedmineTicket.mockClear();
  ticketMock.openGithubForm.mockClear();
  notifyMock.showToast.mockClear();
});

// ── initFeedback ───────────────────────────────────────────────────

describe('initFeedback', () => {
  beforeEach(() => {
    setupDom();
  });

  it('creates button and dialog when a feedback block is configured', async () => {
    configMock.getCentralConfigSync.mockReturnValue({ feedback: { system: 'redmine' } });
    await loadFresh();
    const headerChildren = document._appHeaderChildren ?? [];
    const button = headerChildren.find((el) => el.className === 'feedback-toolbar-btn');
    expect(button).toBeDefined();
  });

  it('does nothing when no feedback block is present', async () => {
    configMock.getCentralConfigSync.mockReturnValue({});
    await loadFresh();
    const headerChildren = document._appHeaderChildren ?? [];
    const button = headerChildren.find((el) => el.className === 'feedback-toolbar-btn');
    expect(button).toBeUndefined();
  });

  it('button has correct aria-label', async () => {
    configMock.getCentralConfigSync.mockReturnValue({ feedback: { system: 'redmine' } });
    await loadFresh();
    const headerChildren = document._appHeaderChildren ?? [];
    const button = headerChildren.find((el) => el.className === 'feedback-toolbar-btn');
    expect(button?.setAttribute).toHaveBeenCalledWith('aria-label', 'feedback.toolbar_label');
  });
});

// ── dialog construction ────────────────────────────────────────────

describe('dialog construction', () => {
  it('appends a dialog with a consent checkbox to document.body', async () => {
    setupDom();
    configMock.getCentralConfigSync.mockReturnValue({ feedback: { system: 'redmine' } });
    await loadFresh();
    const appended = document.body._appended ?? [];
    const dialog = appended.find((el) => el.tagName === 'DIALOG');
    expect(dialog).toBeDefined();
    // A checkbox input was created for consent
    const checkbox = document._created.find((el) => el.type === 'checkbox');
    expect(checkbox).toBeDefined();
    expect(checkbox.checked).toBe(false); // unchecked by default
  });

  it('context details element starts hidden', async () => {
    setupDom();
    configMock.getCentralConfigSync.mockReturnValue({ feedback: { system: 'redmine' } });
    await loadFresh();
    const details = document._created.find((el) => el.tagName === 'DETAILS');
    expect(details).toBeDefined();
    expect(details.hidden).toBe(true);
  });
});
