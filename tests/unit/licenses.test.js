import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderAttributionsTable, escapeHtml, bootstrapLicensesPage } from '../../js/licenses.js';

describe('escapeHtml — security (T010)', () => {
  it('escapes the five HTML metacharacters', () => {
    expect(escapeHtml('<script>alert("a&b")</script>')).toBe(
      '&lt;script&gt;alert(&quot;a&amp;b&quot;)&lt;/script&gt;'
    );
    expect(escapeHtml("o'reilly")).toBe('o&#39;reilly');
  });
  it('returns empty string for null / undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('renderAttributionsTable (T010)', () => {
  it('renders an empty <tbody> when given an empty entries list', () => {
    const html = renderAttributionsTable({ entries: [] });
    expect(html).toContain('<table');
    expect(html).toContain('<tbody></tbody>');
    expect(html).toContain('Library'); // english header default
  });

  it('renders a single entry with the expected cells', () => {
    const html = renderAttributionsTable({
      entries: [
        {
          name: 'fullcalendar',
          version: '6.1.0',
          license: 'MIT',
          homepageUrl: 'https://fullcalendar.io/',
          copyright: 'Copyright (c) Adam Shaw',
          supplier: 'cdn',
        },
      ],
    });
    expect(html).toContain('fullcalendar');
    expect(html).toContain('6.1.0');
    expect(html).toContain('MIT');
    expect(html).toContain('https://fullcalendar.io/');
    expect(html).toContain('Copyright (c) Adam Shaw');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it('omits the copyright column entirely when every entry has null copyright', () => {
    const html = renderAttributionsTable({
      entries: [
        {
          name: 'a',
          version: '1.0',
          license: 'MIT',
          homepageUrl: 'https://a.example/',
          copyright: null,
          supplier: 'npm',
        },
      ],
    });
    // Header column for Copyright must be absent
    expect(html).not.toContain('Copyright</th>');
    // No 5th <td> in a single row
    expect(html.match(/<td>/g).length).toBe(4);
  });

  it('shows the copyright column when ANY entry has a non-null copyright', () => {
    const html = renderAttributionsTable({
      entries: [
        {
          name: 'a',
          version: '1.0',
          license: 'MIT',
          homepageUrl: 'https://a.example/',
          copyright: null,
          supplier: 'npm',
        },
        {
          name: 'b',
          version: '1.0',
          license: 'MIT',
          homepageUrl: 'https://b.example/',
          copyright: '(c) 2025 b',
          supplier: 'npm',
        },
      ],
    });
    expect(html).toContain('Copyright</th>');
    expect(html).toContain('(c) 2025 b');
  });

  it('escapes name / homepageUrl / copyright (XSS guard)', () => {
    const html = renderAttributionsTable({
      entries: [
        {
          name: '<script>n</script>',
          version: '1.0',
          license: 'MIT',
          homepageUrl: 'javascript:alert(1)',
          copyright: '<img src=x onerror=1>',
          supplier: 'npm',
        },
      ],
    });
    expect(html).not.toMatch(/<script>n<\/script>/);
    expect(html).toContain('&lt;script&gt;n&lt;/script&gt;');
    // href is still set to the (escaped) value; the URL escape catches the
    // characters that would break out of the attribute quote.
    expect(html).toContain('href="javascript:alert(1)"');
    // copyright cell escaped
    expect(html).toContain('&lt;img src=x onerror=1&gt;');
  });

  it('renders a homepage cell as an anchor element', () => {
    const html = renderAttributionsTable({
      entries: [
        {
          name: 'a',
          version: '1.0',
          license: 'MIT',
          homepageUrl: 'https://a.example/',
          copyright: null,
          supplier: 'npm',
        },
      ],
    });
    expect(html).toContain('<a href="https://a.example/"');
  });
});

describe('bootstrapLicensesPage — DOM wiring (T010)', () => {
  let elements;

  beforeEach(() => {
    elements = {
      'licenses-heading': { textContent: '' },
      'licenses-back': { textContent: '' },
      'licenses-intro': { textContent: '' },
      'licenses-table-wrap': { innerHTML: '' },
      'licenses-error': {
        textContent: '',
        classList: {
          _set: new Set(['hidden']),
          add(c) {
            this._set.add(c);
          },
          remove(c) {
            this._set.delete(c);
          },
          contains(c) {
            return this._set.has(c);
          },
        },
      },
    };
    const titleEl = { textContent: '' };
    document.getElementById = vi.fn((id) => elements[id] || null);
    document.querySelector = vi.fn((s) => (s === 'title' ? titleEl : null));
    elements._title = titleEl;
  });

  it('renders the table on a successful fetch', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        entries: [
          {
            name: 'x',
            version: '1',
            license: 'MIT',
            homepageUrl: 'https://x/',
            copyright: null,
            supplier: 'npm',
          },
        ],
      }),
    }));
    await bootstrapLicensesPage();
    expect(elements['licenses-table-wrap'].innerHTML).toContain('<table');
    expect(elements['licenses-table-wrap'].innerHTML).toContain('https://x/');
    expect(elements['licenses-heading'].textContent).toBeTruthy();
  });

  it('surfaces the i18n error message on fetch failure', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('network down');
    });
    await bootstrapLicensesPage();
    expect(elements['licenses-error'].classList.contains('hidden')).toBe(false);
    expect(elements['licenses-error'].textContent.length).toBeGreaterThan(0);
  });

  it('surfaces the i18n error message on non-OK response', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 404 }));
    await bootstrapLicensesPage();
    expect(elements['licenses-error'].classList.contains('hidden')).toBe(false);
  });
});
