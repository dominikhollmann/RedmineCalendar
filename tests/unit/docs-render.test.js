import { describe, it, expect, vi } from 'vitest';

vi.mock('../../js/i18n.js', () => ({
  locale: 'en',
  t: vi.fn((k) => k),
}));

// docs.js has a top-level fetch() for content.<locale>.md and a top-level
// document.addEventListener for the Escape key. Stub both so the import
// doesn't error at load time.
global.fetch = vi.fn(() => Promise.resolve({ ok: false, text: async () => '' }));
global.document = global.document ?? {};
global.document.addEventListener = vi.fn();

const { renderMarkdown, slugify } = await import('../../js/docs.js');

describe('docs.js — slugify', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(slugify('Getting Started')).toBe('getting-started');
  });

  it('preserves Unicode letters (umlauts)', () => {
    expect(slugify('Tastenkürzel')).toBe('tastenkürzel');
    expect(slugify('Mobile Nutzung')).toBe('mobile-nutzung');
    expect(slugify('Kopieren und Einfügen von Zeiteinträgen')).toBe(
      'kopieren-und-einfügen-von-zeiteinträgen'
    );
  });

  it('keeps existing dashes (does not collapse with whitespace)', () => {
    expect(slugify('Break-Ticket Entries')).toBe('break-ticket-entries');
  });

  it('produces double-dash when punctuation sits between words (GitHub convention)', () => {
    expect(slugify('Work Week / Full Week Toggle')).toBe('work-week--full-week-toggle');
  });

  it('drops punctuation at end / standalone', () => {
    expect(slugify('Section!')).toBe('section');
    expect(slugify('AI Chat Assistant')).toBe('ai-chat-assistant');
  });

  it('handles empty input', () => {
    expect(slugify('')).toBe('');
  });
});

describe('docs.js — renderMarkdown', () => {
  it('renders inline links as <a href> tags (the original ToC bug)', () => {
    const html = renderMarkdown('1. [Getting Started](#getting-started)');
    expect(html).toContain('<a href="#getting-started">Getting Started</a>');
    expect(html).not.toContain('](');
  });

  it('renders headings with auto-generated id matching slugify()', () => {
    const html = renderMarkdown('## Getting Started\n\n## Work Week / Full Week Toggle');
    expect(html).toContain('<h2 id="getting-started">Getting Started</h2>');
    expect(html).toContain(
      '<h2 id="work-week--full-week-toggle">Work Week / Full Week Toggle</h2>'
    );
  });

  it('renders a numbered list with links (the actual ToC pattern)', () => {
    const md = '1. [Getting Started](#getting-started)\n2. [Mobile](#mobile)';
    const html = renderMarkdown(md);
    expect(html).toContain('<ol>');
    expect(html).toContain('<li><a href="#getting-started">Getting Started</a></li>');
    expect(html).toContain('<li><a href="#mobile">Mobile</a></li>');
    expect(html).toContain('</ol>');
  });

  it('still handles bold / italic / code', () => {
    const html = renderMarkdown('Some **bold** and *italic* and `code`.');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<code>code</code>');
  });

  it('preserves formatting inside link text', () => {
    const html = renderMarkdown('A [**bold link**](#x) here.');
    expect(html).toContain('<a href="#x"><strong>bold link</strong></a>');
  });

  it('renders heading with German anchor target reachable from a link', () => {
    const md = '1. [Tastenkürzel](#tastenkürzel)\n\n## Tastenkürzel';
    const html = renderMarkdown(md);
    expect(html).toContain('<a href="#tastenkürzel">Tastenkürzel</a>');
    expect(html).toContain('<h2 id="tastenkürzel">Tastenkürzel</h2>');
  });
});
