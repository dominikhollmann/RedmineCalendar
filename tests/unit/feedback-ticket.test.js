import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────

const apiMock = vi.hoisted(() => ({
  request: vi.fn(),
}));

class FakeRedmineError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'RedmineError';
    this.status = status ?? 0;
  }
}

vi.mock('../../js/redmine-api.js', () => ({
  request: apiMock.request,
  RedmineError: FakeRedmineError,
}));

vi.mock('../../js/i18n.js', () => ({
  t: vi.fn((key) => key),
}));

const configMock = vi.hoisted(() => ({
  getCentralConfigSync: vi.fn(() => ({
    redmineUrl: 'https://proxy.example',
    redmineServerUrl: 'https://redmine.example.com',
  })),
}));

vi.mock('../../js/config-store.js', () => ({
  getCentralConfigSync: configMock.getCentralConfigSync,
}));

// feedback-context's sanitizeNetworkUrl is used for real (pure function).

async function loadFresh() {
  vi.resetModules();
  return await import('../../js/feedback-ticket.js');
}

function makeReport(overrides = {}) {
  return {
    category: 'bug',
    description: 'Something is broken\non the calendar',
    contextEnabled: false,
    pageUrl: 'https://app.example/index.html',
    userAgent: 'UA/1.0',
    os: 'Linux',
    viewportWidth: 1280,
    viewportHeight: 720,
    screenshotDataUrl: null,
    timestamp: '2026-06-23T10:00:00.000Z',
    ...overrides,
  };
}

const bugContext = {
  errors: [{ message: 'TypeError: x', stack: 'at a.js:1', timestamp: 't' }],
  networkLog: [
    {
      url: 'https://redmine.example.com/issues.json?key=SECRET&q=foo',
      method: 'GET',
      status: 200,
      ms: 42,
    },
  ],
  appLog: [{ level: 'warn', message: 'careful', timestamp: 't' }],
  calendarState: { view: 'timeGridWeek', start: '2026-06-22', end: '2026-06-29' },
  localStorageSnapshot: { redmine_calendar_theme: 'dark' },
};

beforeEach(() => {
  apiMock.request.mockReset();
  configMock.getCentralConfigSync.mockReturnValue({
    redmineUrl: 'https://proxy.example',
    redmineServerUrl: 'https://redmine.example.com',
  });
  global.window = { open: vi.fn() };
});

// ── buildRedmineIssueBody ──────────────────────────────────────────

describe('buildRedmineIssueBody', () => {
  it('omits diagnostic sections when contextEnabled is false', async () => {
    const { buildRedmineIssueBody } = await loadFresh();
    const body = buildRedmineIssueBody(makeReport({ contextEnabled: false }));
    expect(body).toContain('Something is broken');
    expect(body).not.toContain('<h2>Environment</h2>');
    expect(body).not.toContain('<h2>Error Log</h2>');
    expect(body).not.toContain('<h2>Network Log</h2>');
    expect(body).not.toContain('<h2>App Log</h2>');
  });

  it('includes all sections when contextEnabled is true', async () => {
    const { buildRedmineIssueBody } = await loadFresh();
    const body = buildRedmineIssueBody(makeReport({ contextEnabled: true, ...bugContext }));
    expect(body).toContain('<h2>Environment</h2>');
    expect(body).toContain('<h2>Error Log</h2>');
    expect(body).toContain('<h2>Network Log</h2>');
    expect(body).toContain('<h2>App Log</h2>');
    expect(body).toContain('<h2>Calendar State</h2>');
    expect(body).toContain('<h2>Storage Snapshot</h2>');
  });

  it('sanitizes network log URLs (strips query string)', async () => {
    const { buildRedmineIssueBody } = await loadFresh();
    const body = buildRedmineIssueBody(makeReport({ contextEnabled: true, ...bugContext }));
    expect(body).toContain('https://redmine.example.com/issues.json');
    expect(body).not.toContain('SECRET');
    expect(body).not.toContain('q=foo');
  });

  it('renders "None" for empty logs and skips empty calendar/storage sections', async () => {
    const { buildRedmineIssueBody } = await loadFresh();
    const body = buildRedmineIssueBody(
      makeReport({
        contextEnabled: true,
        errors: [],
        networkLog: [],
        appLog: [],
        calendarState: null,
        localStorageSnapshot: {},
      })
    );
    expect(body).toContain('<h2>Error Log</h2>\n<p>None</p>');
    expect(body).toContain('<h2>Network Log</h2>\n<p>None</p>');
    expect(body).not.toContain('<h2>Calendar State</h2>');
    expect(body).not.toContain('<h2>Storage Snapshot</h2>');
  });

  it('labels the body as Suggestion for the suggestion category', async () => {
    const { buildRedmineIssueBody } = await loadFresh();
    const body = buildRedmineIssueBody(makeReport({ category: 'suggestion' }));
    expect(body).toContain('<strong>Category:</strong> Suggestion');
  });

  it('preserves the user description line breaks as HTML <br> within a paragraph', async () => {
    const { buildRedmineIssueBody } = await loadFresh();
    const body = buildRedmineIssueBody(makeReport({ description: 'line one\nline two' }));
    expect(body).toContain('<p>line one<br>line two</p>');
  });

  it('renders blank-line-separated text as distinct HTML paragraphs', async () => {
    const { buildRedmineIssueBody } = await loadFresh();
    const body = buildRedmineIssueBody(makeReport({ description: 'para one\n\npara two' }));
    expect(body).toContain('<p>para one</p>\n<p>para two</p>');
  });

  it('HTML-escapes user-provided description text', async () => {
    const { buildRedmineIssueBody } = await loadFresh();
    const body = buildRedmineIssueBody(makeReport({ description: '<script>x</script> & <b>' }));
    expect(body).toContain('&lt;script&gt;x&lt;/script&gt; &amp; &lt;b&gt;');
    expect(body).not.toContain('<script>x</script>');
  });

  it('uses the fallback title when the description is empty (issue subject)', async () => {
    apiMock.request.mockResolvedValueOnce({ issue: { id: 1 } });
    const { createRedmineTicket } = await loadFresh();
    await createRedmineTicket(makeReport({ description: '   ' }), {
      system: 'redmine',
      redmineProjectId: 1,
    });
    const sent = JSON.parse(apiMock.request.mock.calls[0][1].body);
    expect(sent.issue.subject).toBe('feedback.fallback_title');
  });

  it('uses the subject field verbatim as the issue subject when present', async () => {
    apiMock.request.mockResolvedValueOnce({ issue: { id: 1 } });
    const { createRedmineTicket } = await loadFresh();
    await createRedmineTicket(
      makeReport({ subject: 'Calendar crashes on save', description: 'Long body…\nmore lines' }),
      { system: 'redmine', redmineProjectId: 1 }
    );
    const sent = JSON.parse(apiMock.request.mock.calls[0][1].body);
    expect(sent.issue.subject).toBe('Calendar crashes on save');
    // The description still forms the body, not the title.
    expect(sent.issue.description).toContain('Long body…');
  });
});

// ── createRedmineTicket ────────────────────────────────────────────

describe('createRedmineTicket', () => {
  const cfg = { system: 'redmine', redmineProjectId: 42 };

  it('creates an issue and returns the ticket URL (success path)', async () => {
    apiMock.request.mockResolvedValueOnce({ issue: { id: 1234 } });
    const { createRedmineTicket } = await loadFresh();
    const outcome = await createRedmineTicket(makeReport(), cfg);
    expect(outcome).toEqual({ ok: true, ticketUrl: 'https://redmine.example.com/issues/1234' });
    expect(apiMock.request).toHaveBeenCalledTimes(1);
    const [path, opts] = apiMock.request.mock.calls[0];
    expect(path).toBe('/issues.json');
    const sent = JSON.parse(opts.body);
    expect(sent.issue.project_id).toBe(42);
    expect(sent.issue.uploads).toBeUndefined();
  });

  it('sets tracker_id from the configured bug tracker for a bug report', async () => {
    apiMock.request.mockResolvedValueOnce({ issue: { id: 1 } });
    const { createRedmineTicket } = await loadFresh();
    await createRedmineTicket(makeReport({ category: 'bug' }), {
      system: 'redmine',
      redmineProjectId: 42,
      redmineTrackerBug: 7,
      redmineTrackerSuggestion: 3,
    });
    const sent = JSON.parse(apiMock.request.mock.calls[0][1].body);
    expect(sent.issue.tracker_id).toBe(7);
  });

  it('sets tracker_id from the configured suggestion tracker for a suggestion', async () => {
    apiMock.request.mockResolvedValueOnce({ issue: { id: 1 } });
    const { createRedmineTicket } = await loadFresh();
    await createRedmineTicket(makeReport({ category: 'suggestion' }), {
      system: 'redmine',
      redmineProjectId: 42,
      redmineTrackerBug: 7,
      redmineTrackerSuggestion: 3,
    });
    const sent = JSON.parse(apiMock.request.mock.calls[0][1].body);
    expect(sent.issue.tracker_id).toBe(3);
  });

  it('omits tracker_id when no tracker is configured (project default applies)', async () => {
    apiMock.request.mockResolvedValueOnce({ issue: { id: 1 } });
    const { createRedmineTicket } = await loadFresh();
    await createRedmineTicket(makeReport({ category: 'bug' }), cfg);
    const sent = JSON.parse(apiMock.request.mock.calls[0][1].body);
    expect(sent.issue.tracker_id).toBeUndefined();
  });

  it('uploads the screenshot then references the token in the issue', async () => {
    apiMock.request
      .mockResolvedValueOnce({ upload: { token: 'tok-abc' } }) // upload
      .mockResolvedValueOnce({ issue: { id: 99 } }); // create
    const { createRedmineTicket } = await loadFresh();
    const report = makeReport({
      contextEnabled: true,
      screenshotDataUrl: 'data:image/png;base64,QUJD',
    });
    const outcome = await createRedmineTicket(report, cfg);
    expect(outcome.ok).toBe(true);
    expect(apiMock.request).toHaveBeenCalledTimes(2);
    const uploadCall = apiMock.request.mock.calls[0];
    expect(uploadCall[0]).toBe('/uploads.json');
    expect(uploadCall[1].headers['Content-Type']).toBe('application/octet-stream');
    const issueBody = JSON.parse(apiMock.request.mock.calls[1][1].body);
    expect(issueBody.issue.uploads[0].token).toBe('tok-abc');
  });

  it('uploads the screenshot even when diagnostic context is off (decoupled)', async () => {
    apiMock.request
      .mockResolvedValueOnce({ upload: { token: 'tok-xyz' } }) // upload
      .mockResolvedValueOnce({ issue: { id: 100 } }); // create
    const { createRedmineTicket } = await loadFresh();
    const report = makeReport({
      contextEnabled: false,
      screenshotDataUrl: 'data:image/png;base64,QUJD',
    });
    await createRedmineTicket(report, cfg);
    expect(apiMock.request).toHaveBeenCalledTimes(2);
    expect(apiMock.request.mock.calls[0][0]).toBe('/uploads.json');
    const issueBody = JSON.parse(apiMock.request.mock.calls[1][1].body);
    expect(issueBody.issue.uploads[0].token).toBe('tok-xyz');
  });

  it('does not upload when no screenshot was captured', async () => {
    apiMock.request.mockResolvedValueOnce({ issue: { id: 101 } });
    const { createRedmineTicket } = await loadFresh();
    await createRedmineTicket(makeReport({ screenshotDataUrl: null }), cfg);
    expect(apiMock.request).toHaveBeenCalledTimes(1);
    expect(apiMock.request.mock.calls[0][0]).toBe('/issues.json');
  });

  it('still creates the ticket when the screenshot upload fails (partial success)', async () => {
    apiMock.request
      .mockRejectedValueOnce(new FakeRedmineError('upload boom', 500)) // upload fails
      .mockResolvedValueOnce({ issue: { id: 7 } }); // create succeeds
    const { createRedmineTicket } = await loadFresh();
    const report = makeReport({
      contextEnabled: true,
      screenshotDataUrl: 'data:image/png;base64,QUJD',
    });
    const outcome = await createRedmineTicket(report, cfg);
    expect(outcome).toEqual({ ok: true, ticketUrl: 'https://redmine.example.com/issues/7' });
    const issueBody = JSON.parse(apiMock.request.mock.calls[1][1].body);
    expect(issueBody.issue.uploads).toBeUndefined();
  });

  it('returns a failure outcome when issue creation fails', async () => {
    apiMock.request.mockRejectedValueOnce(new FakeRedmineError('validation failed', 422));
    const { createRedmineTicket } = await loadFresh();
    const outcome = await createRedmineTicket(makeReport(), cfg);
    expect(outcome).toEqual({ ok: false, message: 'validation failed' });
  });

  it('maps a 404 to a project-not-found hint (not the generic API message)', async () => {
    apiMock.request.mockRejectedValueOnce(new FakeRedmineError('Not found', 404));
    const { createRedmineTicket } = await loadFresh();
    const outcome = await createRedmineTicket(makeReport(), cfg);
    expect(outcome).toEqual({ ok: false, message: 'feedback.project_not_found' });
  });

  it('falls back to redmineUrl when redmineServerUrl is unset', async () => {
    configMock.getCentralConfigSync.mockReturnValue({ redmineUrl: 'https://proxy.example' });
    apiMock.request.mockResolvedValueOnce({ issue: { id: 5 } });
    const { createRedmineTicket } = await loadFresh();
    const outcome = await createRedmineTicket(makeReport(), cfg);
    expect(outcome.ticketUrl).toBe('https://proxy.example/issues/5');
  });

  it('maps a non-RedmineError thrown during creation to a failure outcome', async () => {
    apiMock.request.mockRejectedValueOnce(new TypeError('boom'));
    const { createRedmineTicket } = await loadFresh();
    const outcome = await createRedmineTicket(makeReport(), cfg);
    expect(outcome).toEqual({ ok: false, message: 'boom' });
  });

  it('uses an empty link base when no central config is cached', async () => {
    configMock.getCentralConfigSync.mockReturnValue(null);
    apiMock.request.mockResolvedValueOnce({ issue: { id: 8 } });
    const { createRedmineTicket } = await loadFresh();
    const outcome = await createRedmineTicket(makeReport(), cfg);
    expect(outcome).toEqual({ ok: true, ticketUrl: '/issues/8' });
  });

  it('stringifies a thrown value with no message', async () => {
    apiMock.request.mockRejectedValueOnce('plain string error');
    const { createRedmineTicket } = await loadFresh();
    const outcome = await createRedmineTicket(makeReport(), cfg);
    expect(outcome.ok).toBe(false);
    expect(outcome.message).toBe('plain string error');
  });
});

// ── buildGithubUrl ─────────────────────────────────────────────────

describe('buildGithubUrl', () => {
  const cfg = { system: 'github', githubOwner: 'acme', githubRepo: 'cal' };

  it('builds a prefilled new-issue URL with title and body', async () => {
    const { buildGithubUrl } = await loadFresh();
    const url = buildGithubUrl(makeReport(), cfg);
    expect(url.startsWith('https://github.com/acme/cal/issues/new?title=')).toBe(true);
    expect(url).toContain('&body=');
  });

  it('falls back to the first line of the description as the title when no subject', async () => {
    const { buildGithubUrl } = await loadFresh();
    const url = buildGithubUrl(makeReport({ description: 'My title here\nmore' }), cfg);
    expect(url).toContain(encodeURIComponent('My title here'));
  });

  it('uses the subject field as the title when present', async () => {
    const { buildGithubUrl } = await loadFresh();
    const url = buildGithubUrl(
      makeReport({ subject: 'Crash on save', description: 'long body' }),
      cfg
    );
    expect(url).toContain(encodeURIComponent('Crash on save'));
  });

  it('prefixes the title and adds the "bug" label for a bug report', async () => {
    const { buildGithubUrl } = await loadFresh();
    const url = buildGithubUrl(makeReport({ category: 'bug', subject: 'Crash on save' }), cfg);
    expect(url).toContain(encodeURIComponent('[Bug] Crash on save'));
    expect(url).toContain('&labels=bug');
  });

  it('prefixes the title and adds the "enhancement" label for a suggestion', async () => {
    const { buildGithubUrl } = await loadFresh();
    const url = buildGithubUrl(makeReport({ category: 'suggestion', subject: 'Add export' }), cfg);
    expect(url).toContain(encodeURIComponent('[Feature] Add export'));
    expect(url).toContain('&labels=enhancement');
  });

  it('omits log sections when contextEnabled is false', async () => {
    const { buildGithubUrl } = await loadFresh();
    const url = buildGithubUrl(makeReport({ contextEnabled: false }), cfg);
    const body = decodeURIComponent(url.split('&body=')[1]);
    expect(body).not.toContain('## Errors');
    expect(body).not.toContain('## Network');
  });

  it('includes the screenshot-paste note when a screenshot was captured', async () => {
    const { buildGithubUrl } = await loadFresh();
    const url = buildGithubUrl(
      makeReport({ screenshotDataUrl: 'data:image/png;base64,QUJD' }),
      cfg
    );
    const body = decodeURIComponent(url.split('&body=')[1]);
    expect(body).toContain('feedback.screenshot_manual_note');
  });

  it('omits the screenshot-paste note when no screenshot was captured', async () => {
    const { buildGithubUrl } = await loadFresh();
    const url = buildGithubUrl(makeReport({ contextEnabled: true, ...bugContext }), cfg);
    const body = decodeURIComponent(url.split('&body=')[1]);
    expect(body).not.toContain('feedback.screenshot_manual_note');
  });

  it('truncates an overlong body and keeps the URL within budget', async () => {
    const { buildGithubUrl } = await loadFresh();
    const hugeDescription = 'x'.repeat(20000);
    const url = buildGithubUrl(makeReport({ description: hugeDescription }), cfg);
    expect(url.length).toBeLessThanOrEqual(7800);
    const body = decodeURIComponent(url.split('&body=')[1]);
    expect(body).toContain('[…truncated]');
  });

  it('never contains a token or credential string', async () => {
    const { buildGithubUrl } = await loadFresh();
    const url = buildGithubUrl(makeReport(), cfg);
    expect(url.toLowerCase()).not.toContain('token');
    expect(url).not.toContain('X-Redmine-API-Key');
  });

  it('labels the body as Suggestion for the suggestion category', async () => {
    const { buildGithubUrl } = await loadFresh();
    const url = buildGithubUrl(makeReport({ category: 'suggestion' }), cfg);
    const body = decodeURIComponent(url.split('&body=')[1]);
    expect(body).toContain('**Category**: Suggestion');
  });

  it('renders "None" for empty error/network/app logs when context is enabled', async () => {
    const { buildGithubUrl } = await loadFresh();
    const url = buildGithubUrl(
      makeReport({ contextEnabled: true, errors: [], networkLog: [], appLog: [] }),
      cfg
    );
    const body = decodeURIComponent(url.split('&body=')[1]);
    expect(body).toContain('## Errors\n\nNone');
    expect(body).toContain('## Network\n\nNone');
    expect(body).toContain('## App Log\n\nNone');
  });
});

// ── openGithubForm ─────────────────────────────────────────────────

describe('openGithubForm', () => {
  it('opens the prefilled URL in a new tab', async () => {
    const { openGithubForm } = await loadFresh();
    const cfg = { system: 'github', githubOwner: 'acme', githubRepo: 'cal' };
    openGithubForm(makeReport(), cfg);
    expect(window.open).toHaveBeenCalledTimes(1);
    const [url, target] = window.open.mock.calls[0];
    expect(url).toContain('https://github.com/acme/cal/issues/new');
    expect(target).toBe('_blank');
  });
});
