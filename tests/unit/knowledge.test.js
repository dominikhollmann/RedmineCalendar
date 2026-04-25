import { describe, it, expect, vi, beforeEach } from 'vitest';
import { selectRelevantFiles } from '../../js/knowledge.js';

describe('selectRelevantFiles', () => {
  it('returns calendar.js for copy/paste question', () => {
    const files = selectRelevantFiles('How do I copy and paste a time entry?');
    expect(files).toContain('js/calendar.js');
  });

  it('returns arbzg.js for ArbZG question', () => {
    const files = selectRelevantFiles('What is the ArbZG daily limit?');
    expect(files).toContain('js/arbzg.js');
    expect(files).not.toContain('js/calendar.js');
  });

  it('returns settings.js for credential question', () => {
    const files = selectRelevantFiles('How do I change my api key?');
    expect(files).toContain('js/settings.js');
  });

  it('returns time-entry-form.js for form question', () => {
    const files = selectRelevantFiles('How does the time entry form work?');
    expect(files).toContain('js/time-entry-form.js');
  });

  it('returns empty for unrelated question with no keywords', () => {
    const files = selectRelevantFiles('Tell me a joke');
    expect(files).toHaveLength(0);
  });

  it('considers conversation history', () => {
    const history = [
      { role: 'user', content: 'Tell me about ArbZG compliance' },
      { role: 'assistant', content: 'ArbZG is...' },
    ];
    const files = selectRelevantFiles('What are the limits?', history);
    expect(files).toContain('js/arbzg.js');
  });

  it('returns chatbot-tools.js for AI chat question', () => {
    const files = selectRelevantFiles('How does the ai chat work?');
    expect(files).toContain('js/chatbot-tools.js');
  });

  // ── Topic keyword coverage ────────────────────────────────────────

  it('returns calendar.js for calendar view keywords', () => {
    const files = selectRelevantFiles('How do I navigate week view?');
    expect(files).toContain('js/calendar.js');
  });

  it('returns calendar.js for fullcalendar keyword', () => {
    const files = selectRelevantFiles('Is this built with fullcalendar?');
    expect(files).toContain('js/calendar.js');
  });

  it('returns calendar.js for overflow indicator keyword', () => {
    const files = selectRelevantFiles('What does the overflow indicator mean?');
    expect(files).toContain('js/calendar.js');
  });

  it('returns calendar.js for week total keyword', () => {
    const files = selectRelevantFiles('Where is the week total displayed?');
    expect(files).toContain('js/calendar.js');
  });

  it('returns redmine-api.js for API client question', () => {
    const files = selectRelevantFiles('How does the redmine api work?');
    expect(files).toContain('js/redmine-api.js');
  });

  it('returns redmine-api.js for network error question', () => {
    const files = selectRelevantFiles('I am getting a network error');
    expect(files).toContain('js/redmine-api.js');
  });

  it('returns redmine-api.js for cors proxy question', () => {
    const files = selectRelevantFiles('How do I configure the cors proxy?');
    expect(files).toContain('js/redmine-api.js');
  });

  it('returns settings.js and crypto.js for encrypt keyword', () => {
    const files = selectRelevantFiles('How does encrypt work here?');
    expect(files).toContain('js/settings.js');
    expect(files).toContain('js/crypto.js');
    expect(files).toContain('js/config.js');
  });

  it('returns i18n.js for language question', () => {
    const files = selectRelevantFiles('How do I change the language?');
    expect(files).toContain('js/i18n.js');
  });

  it('returns i18n.js for german/deutsch keyword', () => {
    const files = selectRelevantFiles('Kann ich auf deutsch wechseln?');
    expect(files).toContain('js/i18n.js');
  });

  it('returns version.js for version number question', () => {
    const files = selectRelevantFiles('What is the current version number?');
    expect(files).toContain('js/version.js');
  });

  it('returns docs.js for help panel question', () => {
    const files = selectRelevantFiles('How do I open the help panel?');
    expect(files).toContain('js/docs.js');
  });

  it('returns docs.js for documentation panel keyword', () => {
    const files = selectRelevantFiles('Where is the documentation panel?');
    expect(files).toContain('js/docs.js');
  });

  it('returns calendar.js and settings.js for working hours keyword', () => {
    const files = selectRelevantFiles('How do I set my working hours?');
    expect(files).toContain('js/calendar.js');
    expect(files).toContain('js/settings.js');
  });

  it('returns time-entry-form.js for favourite keyword', () => {
    const files = selectRelevantFiles('How do I add a favourite?');
    expect(files).toContain('js/time-entry-form.js');
  });

  it('returns arbzg.js for rest period keyword', () => {
    const files = selectRelevantFiles('What is the minimum rest period?');
    expect(files).toContain('js/arbzg.js');
  });

  it('returns arbzg.js for sunday work keyword', () => {
    const files = selectRelevantFiles('Is sunday work allowed?');
    expect(files).toContain('js/arbzg.js');
  });

  // ── Deduplication and edge cases ──────────────────────────────────

  it('deduplicates files when multiple topics match', () => {
    // "setting" matches settings topic, "working hours" matches working hours topic
    // Both include js/settings.js — it should appear only once
    const files = selectRelevantFiles('How do I change the setting for working hours?');
    const settingsCount = files.filter(f => f === 'js/settings.js').length;
    expect(settingsCount).toBe(1);
    expect(files).toContain('js/settings.js');
    expect(files).toContain('js/calendar.js');
  });

  it('returns empty array for empty message', () => {
    const files = selectRelevantFiles('');
    expect(files).toHaveLength(0);
  });

  it('ignores assistant messages in history', () => {
    const history = [
      { role: 'assistant', content: 'ArbZG compliance is important' },
    ];
    // Only user messages from history are considered, not assistant
    const files = selectRelevantFiles('What are the limits?', history);
    expect(files).not.toContain('js/arbzg.js');
  });
});

// ── Tests that need fresh module state (cache isolation) ────────────

describe('loadRelevantSource', () => {
  let loadRelevantSource;

  beforeEach(async () => {
    vi.resetModules();
    global.fetch = vi.fn();
    const mod = await import('../../js/knowledge.js');
    loadRelevantSource = mod.loadRelevantSource;
  });

  it('returns a Map of path to content', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => 'console.log("hello");',
    });

    const result = await loadRelevantSource(['js/calendar.js']);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(1);
    expect(result.get('js/calendar.js')).toBe('console.log("hello");');
  });

  it('fetches each file by its path', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: async () => 'content',
    });

    await loadRelevantSource(['js/calendar.js', 'js/config.js']);
    expect(global.fetch).toHaveBeenCalledWith('js/calendar.js');
    expect(global.fetch).toHaveBeenCalledWith('js/config.js');
  });

  it('caches results — second call for same file does not re-fetch', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => 'cached content',
    });

    await loadRelevantSource(['js/config.js']);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Call again with same file
    global.fetch.mockClear();
    const result = await loadRelevantSource(['js/config.js']);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.get('js/config.js')).toBe('cached content');
  });

  it('redacts apiKey assignments with colon syntax', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "const cfg = { apiKey: 'secret123' };",
    });

    const result = await loadRelevantSource(['js/settings.js']);
    expect(result.get('js/settings.js')).not.toContain('secret123');
    expect(result.get('js/settings.js')).toContain('[REDACTED]');
  });

  it('redacts apiKey assignments with equals syntax', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => 'apiKey = "mykey456"',
    });

    const result = await loadRelevantSource(['js/test.js']);
    expect(result.get('js/test.js')).not.toContain('mykey456');
    expect(result.get('js/test.js')).toContain('[REDACTED]');
  });

  it('redacts password assignments', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "password = 'hunter2'",
    });

    const result = await loadRelevantSource(['js/creds.js']);
    expect(result.get('js/creds.js')).not.toContain('hunter2');
    expect(result.get('js/creds.js')).toContain('[REDACTED]');
  });

  it('redacts password with double quotes', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => 'password: "p@ssw0rd!"',
    });

    const result = await loadRelevantSource(['js/x.js']);
    expect(result.get('js/x.js')).not.toContain('p@ssw0rd!');
    expect(result.get('js/x.js')).toContain('[REDACTED]');
  });

  it('redaction is case-insensitive', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => "APIKEY: 'KEY123'\nPassword = 'S3cret!'",
    });

    const result = await loadRelevantSource(['js/upper.js']);
    expect(result.get('js/upper.js')).not.toContain('KEY123');
    expect(result.get('js/upper.js')).not.toContain('S3cret!');
    // Both should be replaced with [REDACTED]
    expect(result.get('js/upper.js')).toContain('[REDACTED]');
  });

  it('skips files that return non-ok response', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });

    const result = await loadRelevantSource(['js/missing.js']);
    expect(result.size).toBe(0);
    expect(result.has('js/missing.js')).toBe(false);
  });

  it('skips files that throw on fetch (no error propagated)', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network failure'));

    const result = await loadRelevantSource(['js/broken.js']);
    expect(result.size).toBe(0);
  });

  it('returns partial results when some files fail', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, text: async () => 'good content' })
      .mockResolvedValueOnce({ ok: false });

    const result = await loadRelevantSource(['js/good.js', 'js/bad.js']);
    expect(result.size).toBe(1);
    expect(result.has('js/good.js')).toBe(true);
    expect(result.has('js/bad.js')).toBe(false);
  });

  it('returns empty Map for empty input array', async () => {
    const result = await loadRelevantSource([]);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('preserves non-sensitive content unchanged', async () => {
    const code = 'function add(a, b) { return a + b; }';
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => code,
    });

    const result = await loadRelevantSource(['js/math.js']);
    expect(result.get('js/math.js')).toBe(code);
  });
});

describe('buildSystemPrompt', () => {
  let buildSystemPrompt;

  beforeEach(async () => {
    vi.resetModules();
    global.fetch = vi.fn();
    const mod = await import('../../js/knowledge.js');
    buildSystemPrompt = mod.buildSystemPrompt;
  });

  it('returns a string', () => {
    const prompt = buildSystemPrompt(null);
    expect(typeof prompt).toBe('string');
  });

  it('includes the assistant role description', () => {
    const prompt = buildSystemPrompt(null);
    expect(prompt).toContain('RedmineCalendar');
    expect(prompt).toContain('helpful assistant');
  });

  it('includes today date info', () => {
    const prompt = buildSystemPrompt(null);
    const today = new Date().toISOString().slice(0, 10);
    expect(prompt).toContain(today);
  });

  it('includes relative date guide', () => {
    const prompt = buildSystemPrompt(null);
    expect(prompt).toContain('"today"');
    expect(prompt).toContain('"yesterday"');
    expect(prompt).toContain('"this week"');
    expect(prompt).toContain('"last week"');
    expect(prompt).toContain('"this month"');
    expect(prompt).toContain('"last month"');
  });

  it('includes tool usage notes', () => {
    const prompt = buildSystemPrompt(null);
    expect(prompt).toContain('Never reveal API keys');
    expect(prompt).toContain('confirm the action');
  });

  it('includes start_time guidance for creating entries', () => {
    const prompt = buildSystemPrompt(null);
    expect(prompt).toContain('start_time');
  });

  it('does not include source code section when called with null', () => {
    const prompt = buildSystemPrompt(null);
    expect(prompt).not.toContain('RELEVANT SOURCE CODE');
    expect(prompt).not.toContain('<source>');
  });

  it('does not include source code section when called with empty Map', () => {
    const prompt = buildSystemPrompt(new Map());
    expect(prompt).not.toContain('RELEVANT SOURCE CODE');
    expect(prompt).not.toContain('<source>');
  });

  it('includes source code when given a non-empty Map', () => {
    const source = new Map([['js/calendar.js', 'function init() {}']]);
    const prompt = buildSystemPrompt(source);
    expect(prompt).toContain('RELEVANT SOURCE CODE');
    expect(prompt).toContain('<source>');
    expect(prompt).toContain('--- js/calendar.js ---');
    expect(prompt).toContain('function init() {}');
    expect(prompt).toContain('</source>');
  });

  it('includes multiple source files', () => {
    const source = new Map([
      ['js/a.js', 'const a = 1;'],
      ['js/b.js', 'const b = 2;'],
    ]);
    const prompt = buildSystemPrompt(source);
    expect(prompt).toContain('--- js/a.js ---');
    expect(prompt).toContain('const a = 1;');
    expect(prompt).toContain('--- js/b.js ---');
    expect(prompt).toContain('const b = 2;');
  });

  it('does not include docs section when loadDocs was not called', () => {
    const prompt = buildSystemPrompt(null);
    expect(prompt).not.toContain('USER DOCUMENTATION');
    expect(prompt).not.toContain('<docs>');
  });

  it('includes docs section after loadDocs is called', async () => {
    vi.resetModules();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => '# User Guide\nWelcome to the app.',
    });
    const mod = await import('../../js/knowledge.js');
    await mod.loadDocs();
    const prompt = mod.buildSystemPrompt(null);
    expect(prompt).toContain('USER DOCUMENTATION');
    expect(prompt).toContain('<docs>');
    expect(prompt).toContain('# User Guide');
    expect(prompt).toContain('Welcome to the app.');
    expect(prompt).toContain('</docs>');
  });

  it('includes both docs and source code when both are present', async () => {
    vi.resetModules();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => 'Documentation text here',
    });
    const mod = await import('../../js/knowledge.js');
    await mod.loadDocs();
    const source = new Map([['js/test.js', 'test code']]);
    const prompt = mod.buildSystemPrompt(source);
    expect(prompt).toContain('USER DOCUMENTATION');
    expect(prompt).toContain('RELEVANT SOURCE CODE');
    // Docs should appear before source code
    const docsIndex = prompt.indexOf('USER DOCUMENTATION');
    const sourceIndex = prompt.indexOf('RELEVANT SOURCE CODE');
    expect(docsIndex).toBeLessThan(sourceIndex);
  });

  it('works when called with no arguments (default)', () => {
    const prompt = buildSystemPrompt();
    expect(typeof prompt).toBe('string');
    expect(prompt).toContain('helpful assistant');
    expect(prompt).not.toContain('RELEVANT SOURCE CODE');
  });
});

describe('loadDocs', () => {
  let loadDocs;

  beforeEach(async () => {
    vi.resetModules();
    global.fetch = vi.fn();
    const mod = await import('../../js/knowledge.js');
    loadDocs = mod.loadDocs;
  });

  it('fetches the english docs file based on locale', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '# Docs',
    });

    await loadDocs();
    // navigator.languages[0] is 'en' from setup.js, so _docLocale = 'en'
    expect(global.fetch).toHaveBeenCalledWith('docs/content.en.md');
  });

  it('returns the documentation content', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => '# Help\nSome documentation.',
    });

    const result = await loadDocs();
    expect(result).toBe('# Help\nSome documentation.');
  });

  it('caches result — second call does not re-fetch', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      text: async () => 'cached docs',
    });

    const first = await loadDocs();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    global.fetch.mockClear();
    const second = await loadDocs();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(second).toBe(first);
    expect(second).toBe('cached docs');
  });

  it('returns empty string on non-ok response', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });

    const result = await loadDocs();
    expect(result).toBe('');
  });

  it('returns empty string on fetch error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network down'));

    const result = await loadDocs();
    expect(result).toBe('');
  });

  it('caches empty string result from failed fetch', async () => {
    global.fetch.mockRejectedValueOnce(new Error('fail'));

    const first = await loadDocs();
    expect(first).toBe('');

    global.fetch.mockClear();
    const second = await loadDocs();
    // Should not re-fetch because '' was cached (cache checks for !== null)
    expect(global.fetch).not.toHaveBeenCalled();
    expect(second).toBe('');
  });

  it('fetches german docs when locale is de', async () => {
    vi.resetModules();
    global.navigator = { languages: ['de'], language: 'de' };
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => '# Hilfe',
    });

    const mod = await import('../../js/knowledge.js');
    const result = await mod.loadDocs();
    expect(global.fetch).toHaveBeenCalledWith('docs/content.de.md');
    expect(result).toBe('# Hilfe');

    // Restore navigator for other tests
    global.navigator = { languages: ['en'], language: 'en' };
  });
});
