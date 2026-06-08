import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─────────────────────────────────────────────────────────────────────
// docs.js exercises significant top-level side effects at import time:
//   - reads `locale` from i18n
//   - calls fetch('docs/content.<locale>.md')
//   - registers document keydown / mousemove / mouseup / click listeners
//   - looks up `.docs-panel__resize` via querySelector
//
// To cover the panel + listener branches we must install a richer DOM
// BEFORE importing the module. The shared setup.js exposes
// `global.document` as writable (but not configurable), so we mutate
// its own properties rather than redefining the slot.
// ─────────────────────────────────────────────────────────────────────

vi.mock('../../js/i18n.js', () => ({
  locale: 'en',
  t: vi.fn((k) => `T(${k})`),
}));

// Helper: build a fake panel + body + title + close + help button + resize handle.
function makePanelDom() {
  const listeners = { document: {}, handle: {} };

  const panel = {
    _classes: new Set(),
    _hidden: true,
    _attrs: {},
    style: {},
    classList: {
      add(c) {
        panel._classes.add(c);
      },
      remove(c) {
        panel._classes.delete(c);
      },
      contains(c) {
        return panel._classes.has(c);
      },
    },
    removeAttribute(name) {
      delete panel._attrs[name];
      if (name === 'hidden') panel._hidden = false;
    },
    setAttribute(name, val) {
      panel._attrs[name] = val;
      if (name === 'hidden') panel._hidden = true;
    },
    querySelector: vi.fn((sel) => (sel === '.docs-panel__title' ? panel._title : null)),
    _title: { textContent: '' },
  };
  const body = { innerHTML: '' };
  const handle = {
    addEventListener: vi.fn((evt, fn) => {
      listeners.handle[evt] = fn;
    }),
  };

  return { panel, body, handle, listeners };
}

// Replace document mutators on the existing global.document object.
function installDom(dom) {
  global.document.body = { style: {} };
  global.document.getElementById = vi.fn((id) => {
    if (id === 'docs-panel') return dom.panel;
    if (id === 'docs-panel-body') return dom.body;
    return null;
  });
  global.document.querySelector = vi.fn((sel) => {
    if (sel === '.docs-panel__resize') return dom.handle;
    return null;
  });
  global.document.querySelectorAll = vi.fn(() => []);
  global.document.createElement = vi.fn(() => ({}));
  global.document.addEventListener = vi.fn((evt, fn) => {
    dom.listeners.document[evt] = fn;
  });
  global.document.removeEventListener = vi.fn();
}

describe('docs.js — panel + listeners (success-path import)', () => {
  let mod, panel, body, listeners, dom, fetchMock;

  beforeEach(async () => {
    vi.resetModules();
    dom = makePanelDom();
    panel = dom.panel;
    body = dom.body;
    listeners = dom.listeners;
    installDom(dom);
    globalThis.window = { innerWidth: 1000, location: { href: '' } };

    fetchMock = vi.fn(() => Promise.resolve({ ok: true, text: async () => '# Hello\n\nWorld' }));
    globalThis.fetch = fetchMock;

    mod = await import('../../js/docs.js');
    // Allow the top-level fetch().then() chain to settle.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

  it('top-level fetch fires for docs/content.<locale>.md and result is cached', () => {
    expect(fetchMock).toHaveBeenCalledWith('docs/content.en.md');
    mod.openDocsPanel();
    expect(body.innerHTML).toContain('<h1 id="hello">Hello</h1>');
    expect(panel._classes.has('docs-panel--open')).toBe(true);
    expect(panel._hidden).toBe(false);
    expect(panel._title.textContent).toBe('T(docs.panel_title)');
  });

  it('openDocsPanel uses the rendered cache on subsequent opens (no re-render)', () => {
    mod.openDocsPanel();
    const first = body.innerHTML;
    body.innerHTML = '';
    mod.openDocsPanel();
    expect(body.innerHTML).toBe(first);
  });

  it('closeDocsPanel removes the open class and hides the panel after the timeout', () => {
    vi.useFakeTimers();
    mod.openDocsPanel();
    mod.closeDocsPanel();
    expect(panel._classes.has('docs-panel--open')).toBe(false);
    vi.advanceTimersByTime(350);
    expect(panel._hidden).toBe(true);
    vi.useRealTimers();
  });

  it('closeDocsPanel keeps panel visible if openDocsPanel is called within the 300ms window', () => {
    vi.useFakeTimers();
    mod.openDocsPanel();
    mod.closeDocsPanel();
    mod.openDocsPanel();
    vi.advanceTimersByTime(350);
    expect(panel._hidden).toBe(false);
    vi.useRealTimers();
  });

  it('Escape keydown while panel is open invokes closeDocsPanel', () => {
    mod.openDocsPanel();
    const keydown = listeners.document.keydown;
    expect(keydown).toBeTypeOf('function');
    keydown({ key: 'Escape' });
    expect(panel._classes.has('docs-panel--open')).toBe(false);
  });

  it('Escape keydown while panel is closed is a no-op', () => {
    const keydown = listeners.document.keydown;
    keydown({ key: 'Escape' });
    expect(panel._classes.has('docs-panel--open')).toBe(false);
  });

  it('non-Escape keydown is ignored', () => {
    mod.openDocsPanel();
    const keydown = listeners.document.keydown;
    keydown({ key: 'Enter' });
    expect(panel._classes.has('docs-panel--open')).toBe(true);
  });

  it('click delegate opens the panel when target is the help button', () => {
    const click = listeners.document.click;
    expect(click).toBeTypeOf('function');
    const helpTarget = { closest: (sel) => (sel === '.docs-help-btn' ? {} : null) };
    click({ target: helpTarget });
    expect(panel._classes.has('docs-panel--open')).toBe(true);
  });

  it('click delegate closes the panel when target is the close button', () => {
    mod.openDocsPanel();
    const click = listeners.document.click;
    const closeTarget = { closest: (sel) => (sel === '.docs-panel__close' ? {} : null) };
    click({ target: closeTarget });
    expect(panel._classes.has('docs-panel--open')).toBe(false);
  });

  it('click delegate ignores unrelated targets', () => {
    const click = listeners.document.click;
    const noop = { closest: () => null };
    click({ target: noop });
    expect(panel._classes.has('docs-panel--open')).toBe(false);
  });

  it('resize: mousedown + mousemove sets panel.style.width within bounds', () => {
    const mousedown = listeners.handle.mousedown;
    const mousemove = listeners.document.mousemove;
    expect(mousedown).toBeTypeOf('function');
    expect(mousemove).toBeTypeOf('function');

    const e = { preventDefault: vi.fn() };
    mousedown(e);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(global.document.body.style.cursor).toBe('col-resize');
    expect(global.document.body.style.userSelect).toBe('none');

    // window.innerWidth=1000, clientX=600 → desired 400, clamped to [280, 900].
    mousemove({ clientX: 600 });
    expect(panel.style.width).toBe('400px');

    // clientX=999 → desired 1, clamped up to 280.
    mousemove({ clientX: 999 });
    expect(panel.style.width).toBe('280px');

    // clientX=-100 → desired 1100, clamped down to 900 (90% of 1000).
    mousemove({ clientX: -100 });
    expect(panel.style.width).toBe('900px');
  });

  it('resize: mousemove without prior mousedown is a no-op', () => {
    const mousemove = listeners.document.mousemove;
    panel.style.width = 'untouched';
    mousemove({ clientX: 500 });
    expect(panel.style.width).toBe('untouched');
  });

  it('resize: mouseup without prior mousedown is a no-op (early return)', () => {
    const mouseup = listeners.document.mouseup;
    global.document.body.style.cursor = 'preserved';
    mouseup({});
    expect(global.document.body.style.cursor).toBe('preserved');
  });

  it('resize: mouseup after mousedown clears cursor + userSelect', () => {
    const mousedown = listeners.handle.mousedown;
    const mouseup = listeners.document.mouseup;
    mousedown({ preventDefault: vi.fn() });
    mouseup({});
    expect(global.document.body.style.cursor).toBe('');
    expect(global.document.body.style.userSelect).toBe('');
  });

  it('resize: after mouseup, subsequent mousemove no longer adjusts width', () => {
    const mousedown = listeners.handle.mousedown;
    const mousemove = listeners.document.mousemove;
    const mouseup = listeners.document.mouseup;
    mousedown({ preventDefault: vi.fn() });
    mouseup({});
    panel.style.width = 'frozen';
    mousemove({ clientX: 500 });
    expect(panel.style.width).toBe('frozen');
  });

  it('resize: mousemove gracefully returns when #docs-panel disappears mid-drag', () => {
    const mousedown = listeners.handle.mousedown;
    const mousemove = listeners.document.mousemove;
    mousedown({ preventDefault: vi.fn() });
    global.document.getElementById = vi.fn(() => null);
    expect(() => mousemove({ clientX: 500 })).not.toThrow();
  });

  it('closeDocsPanel returns early when #docs-panel is missing', () => {
    global.document.getElementById = vi.fn(() => null);
    expect(() => mod.closeDocsPanel()).not.toThrow();
  });

  it('openDocsPanel returns early when #docs-panel is missing', () => {
    global.document.getElementById = vi.fn(() => null);
    expect(() => mod.openDocsPanel()).not.toThrow();
    expect(body.innerHTML).toBe('');
  });

  it('openDocsPanel skips the title text update when .docs-panel__title is missing', () => {
    panel.querySelector = vi.fn(() => null);
    expect(() => mod.openDocsPanel()).not.toThrow();
    expect(panel._classes.has('docs-panel--open')).toBe(true);
  });
});

describe('docs.js — fetch failure path (load-error message)', () => {
  it('shows the docs.load_error message when the fetch responds with !ok', async () => {
    vi.resetModules();
    const dom = makePanelDom();
    installDom(dom);
    globalThis.window = { innerWidth: 800, location: { href: '' } };
    // ok:false → null is propagated, so _contentCache[locale] becomes null.
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, text: async () => '' }));

    const mod = await import('../../js/docs.js');
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    mod.openDocsPanel();
    expect(dom.body.innerHTML).toContain('docs-panel__error');
    expect(dom.body.innerHTML).toContain('T(docs.load_error)');
  });
});

describe('docs.js — fetch pending path (loading message + interval)', () => {
  // The loading branch fires when _contentCache[locale] is falsy but not
  // strictly === null. The .then chain does `_contentCache[locale] = text`
  // where text is either the resolved string or null (for !ok). To reach
  // the loading branch we resolve fetch with ok:true and an empty string —
  // that empty string is falsy yet not null, so the condition `=== null`
  // is false and the loading branch is taken. Then we transition the
  // cache to a real value to exercise the setInterval polling path.
  it('shows loading message and renders once content arrives via interval', async () => {
    vi.resetModules();
    const dom = makePanelDom();
    installDom(dom);
    globalThis.window = { innerWidth: 800, location: { href: '' } };

    // First fetch resolves with an empty body — _contentCache becomes ''.
    let pendingResolver;
    globalThis.fetch = vi.fn(
      () =>
        new Promise((res) => {
          pendingResolver = res;
        })
    );
    const mod = await import('../../js/docs.js');
    pendingResolver({ ok: true, text: async () => '' });
    // Drain the microtask queue thoroughly: r.text() is async so we need
    // multiple turns for the chained .then handlers to settle.
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    vi.useFakeTimers();
    mod.openDocsPanel();
    expect(dom.body.innerHTML).toContain('docs-panel__loading');
    expect(dom.body.innerHTML).toContain('T(docs.loading)');

    vi.advanceTimersByTime(150); // interval ticks but cache still ''
    vi.useRealTimers();
    // Sanity: still loading because cache value '' is falsy.
    expect(dom.body.innerHTML).toContain('docs-panel__loading');
  });
});

describe('docs.js — i18n locale=de selects German content', () => {
  it('top-level fetch requests docs/content.de.md when locale === "de"', async () => {
    vi.resetModules();
    vi.doMock('../../js/i18n.js', () => ({
      locale: 'de',
      t: vi.fn((k) => k),
    }));
    const dom = makePanelDom();
    installDom(dom);
    globalThis.window = { innerWidth: 800, location: { href: '' } };
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, text: async () => '# DE' }));
    globalThis.fetch = fetchMock;

    await import('../../js/docs.js');
    expect(fetchMock).toHaveBeenCalledWith('docs/content.de.md');

    vi.doUnmock('../../js/i18n.js');
  });
});

describe('docs.js — renderMarkdown extras (branches not covered by base tests)', () => {
  let renderMarkdown;
  beforeEach(async () => {
    vi.resetModules();
    const dom = makePanelDom();
    installDom(dom);
    globalThis.window = { innerWidth: 800, location: { href: '' } };
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, text: async () => '' }));
    const mod = await import('../../js/docs.js');
    renderMarkdown = mod.renderMarkdown;
  });

  it('renders h1 and h3 (in addition to h2 already covered)', () => {
    const html = renderMarkdown('# Title\n### Sub');
    expect(html).toContain('<h1 id="title">Title</h1>');
    expect(html).toContain('<h3 id="sub">Sub</h3>');
  });

  it('renders a horizontal rule for "---" lines', () => {
    const html = renderMarkdown('Above\n\n---\n\nBelow');
    expect(html).toContain('<hr>');
    expect(html).toContain('<p>Above</p>');
    expect(html).toContain('<p>Below</p>');
  });

  it('renders unordered lists with * marker', () => {
    const html = renderMarkdown('* one\n* two');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('<li>two</li>');
    expect(html).toContain('</ul>');
  });

  it('renders unordered lists with - marker', () => {
    const html = renderMarkdown('- a\n- b');
    expect(html.match(/<ul>/g).length).toBe(1);
    expect(html.match(/<li>/g).length).toBe(2);
  });

  it('closes an open <ul> when a heading follows', () => {
    const html = renderMarkdown('- item\n## Next');
    expect(html.indexOf('</ul>')).toBeLessThan(html.indexOf('<h2'));
  });

  it('closes an open <ol> when a heading follows', () => {
    const html = renderMarkdown('1. one\n## Next');
    expect(html.indexOf('</ol>')).toBeLessThan(html.indexOf('<h2'));
  });

  it('switches from <ul> to <ol> by closing the first list before opening the next', () => {
    const html = renderMarkdown('- a\n1. b');
    expect(html).toContain('</ul>');
    expect(html).toContain('<ol>');
  });

  it('switches from <ol> to <ul> by closing the first list before opening the next', () => {
    const html = renderMarkdown('1. a\n- b');
    expect(html).toContain('</ol>');
    expect(html).toContain('<ul>');
  });

  it('renders a table with header + body rows (skips the separator row)', () => {
    const md = [
      '| Col A | Col B |',
      '| ----- | ----- |',
      '| a1    | b1    |',
      '| a2    | b2    |',
    ].join('\n');
    const html = renderMarkdown(md);
    expect(html).toContain('<table>');
    expect(html).toContain('<thead>');
    expect(html).toContain('<th>Col A</th>');
    expect(html).toContain('<th>Col B</th>');
    expect(html).toContain('<tbody>');
    expect(html).toContain('<td>a1</td>');
    expect(html).toContain('<td>b2</td>');
    expect(html).toContain('</tbody></table>');
  });

  it('closes an open table when a heading follows', () => {
    const md = '| A | B |\n| - | - |\n| 1 | 2 |\n## Next';
    const html = renderMarkdown(md);
    expect(html.indexOf('</tbody></table>')).toBeLessThan(html.indexOf('<h2'));
  });

  it('flushes lists when an hr is encountered', () => {
    const html = renderMarkdown('- a\n---\n');
    expect(html.indexOf('</ul>')).toBeLessThan(html.indexOf('<hr>'));
  });

  it('flushes a table when a list begins', () => {
    const md = '| A | B |\n| - | - |\n- bullet';
    const html = renderMarkdown(md);
    expect(html.indexOf('</tbody></table>')).toBeLessThan(html.indexOf('<ul>'));
  });

  it('treats a non-matching line as a paragraph', () => {
    const html = renderMarkdown('plain sentence');
    expect(html).toContain('<p>plain sentence</p>');
  });

  it('blank lines are absorbed and do not produce empty <p> tags', () => {
    const html = renderMarkdown('\n\n');
    expect(html).toBe('');
  });

  it('flushes a list at end of input (no trailing newline)', () => {
    const html = renderMarkdown('- only');
    expect(html.endsWith('</ul>\n')).toBe(true);
  });

  it('flushes a table at end of input (no trailing newline)', () => {
    const md = '| A |\n| - |\n| x |';
    const html = renderMarkdown(md);
    expect(html).toContain('</tbody></table>');
  });
});

describe('docs.js — bounded poll timeout + cancel on close', () => {
  it('shows error state after 10 s when content never arrives', async () => {
    vi.resetModules();
    const dom = makePanelDom();
    installDom(dom);
    globalThis.window = { innerWidth: 800, location: { href: '' } };
    globalThis.fetch = vi.fn(() => new Promise(() => {}));
    const mod = await import('../../js/docs.js');

    vi.useFakeTimers();
    mod.openDocsPanel();
    expect(dom.body.innerHTML).toContain('docs-panel__loading');
    vi.advanceTimersByTime(10_000);
    expect(dom.body.innerHTML).toContain('docs-panel__error');
    vi.useRealTimers();
  });

  it('renders content and clears both timers when fetch resolves before the timeout', async () => {
    vi.resetModules();
    const dom = makePanelDom();
    installDom(dom);
    globalThis.window = { innerWidth: 800, location: { href: '' } };
    let pendingResolver;
    globalThis.fetch = vi.fn(
      () =>
        new Promise((res) => {
          pendingResolver = res;
        })
    );
    const mod = await import('../../js/docs.js');

    vi.useFakeTimers();
    mod.openDocsPanel();
    expect(dom.body.innerHTML).toContain('docs-panel__loading');
    pendingResolver({ ok: true, text: () => Promise.resolve('# Ready') });
    await vi.advanceTimersByTimeAsync(200);
    vi.useRealTimers();
    expect(dom.body.innerHTML).toContain('<h1 id="ready">Ready</h1>');
  });

  it('closeDocsPanel cancels the poll so a late fetch resolution does not overwrite body', async () => {
    vi.resetModules();
    const dom = makePanelDom();
    installDom(dom);
    globalThis.window = { innerWidth: 800, location: { href: '' } };
    let pendingResolver;
    globalThis.fetch = vi.fn(
      () =>
        new Promise((res) => {
          pendingResolver = res;
        })
    );
    const mod = await import('../../js/docs.js');

    vi.useFakeTimers();
    mod.openDocsPanel();
    mod.closeDocsPanel();
    const snapshot = dom.body.innerHTML;
    pendingResolver({ ok: true, text: () => Promise.resolve('# Ready') });
    await vi.advanceTimersByTimeAsync(200);
    vi.useRealTimers();
    expect(dom.body.innerHTML).toBe(snapshot);
    expect(dom.body.innerHTML).not.toContain('Ready');
  });
});
