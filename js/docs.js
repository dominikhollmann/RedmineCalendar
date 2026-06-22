import { locale, t } from './i18n.js';
import { hidePanelAfterClose, wireEscapeToClose, installPanelResizer } from './panel-controller.js';

/** @type {{ en: string | null | undefined, de: string | null | undefined }} */
const _contentCache = { en: undefined, de: undefined };
/** @type {{ en: string | null, de: string | null }} */
const _renderedCache = { en: null, de: null };
let _panelOpen = false;
/** @type {ReturnType<typeof setInterval> | 0} */
let _pollInterval = 0;
/** @type {ReturnType<typeof setTimeout> | 0} */
let _pollTimeout = 0;

// ── Markdown renderer (subset: h1–h3 with anchors, bold, italic, code, links, lists, tables, hr, paragraphs) ──
// Exported for unit testing.
export function slugify(text) {
  // GitHub-style: lowercase, drop punctuation (keep unicode letters/digits/spaces/dashes),
  // replace EACH whitespace char with a single dash so adjacency is preserved
  // ("A / B" → "a--b" because "/" is dropped, leaving two spaces → two dashes).
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s/g, '-');
}

function safeHref(url) {
  return /^(https?:\/\/|#)/.test(url) ? url : '#';
}

function inlineMarkdown(text) {
  return text
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_, label, url) => `<a href="${safeHref(url)}">${label}</a>`
    )
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

function renderHeading(line, ctx) {
  const m = /^(#{1,3})\s+(.*)/.exec(line);
  if (!m) return false;
  ctx.flushList();
  ctx.flushTable();
  const level = m[1].length;
  const text = m[2];
  ctx.html += `<h${level} id="${slugify(text)}">${inlineMarkdown(text)}</h${level}>\n`;
  return true;
}

function renderTableLine(line, ctx) {
  ctx.flushList();
  const cells = line
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim());
  if (!ctx.inTable) {
    ctx.html += '<table><thead><tr>';
    cells.forEach((c) => {
      ctx.html += `<th>${inlineMarkdown(c)}</th>`;
    });
    ctx.html += '</tr></thead><tbody>\n';
    ctx.inTable = true;
    return true; // signals: skip separator row
  }
  ctx.html += '<tr>';
  cells.forEach((c) => {
    ctx.html += `<td>${inlineMarkdown(c)}</td>`;
  });
  ctx.html += '</tr>\n';
  return false;
}

function renderListItem(line, ctx) {
  const ul = /^[-*]\s+(.*)/.exec(line);
  const ol = ul ? null : /^\d+\.\s+(.*)/.exec(line);
  if (!ul && !ol) return false;
  ctx.flushTable();
  const ordered = !!ol;
  const flagKey = ordered ? 'inOl' : 'inUl';
  if (!ctx[flagKey]) {
    ctx.flushList();
    ctx.html += ordered ? '<ol>\n' : '<ul>\n';
    ctx[flagKey] = true;
  }
  ctx.html += `<li>${inlineMarkdown(/** @type {RegExpExecArray} */ (ul || ol)[1])}</li>\n`;
  return true;
}

function makeRenderCtx() {
  const ctx = { html: '', inUl: false, inOl: false, inTable: false };
  ctx.flushList = () => {
    if (ctx.inUl) {
      ctx.html += '</ul>\n';
      ctx.inUl = false;
    }
    if (ctx.inOl) {
      ctx.html += '</ol>\n';
      ctx.inOl = false;
    }
  };
  ctx.flushTable = () => {
    if (ctx.inTable) {
      ctx.html += '</tbody></table>\n';
      ctx.inTable = false;
    }
  };
  return ctx;
}

export function renderMarkdown(src) {
  const lines = src.split('\n');
  const ctx = makeRenderCtx();

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (renderHeading(line, ctx)) {
      // handled
    } else if (/^---\s*$/.test(line)) {
      ctx.flushList();
      ctx.flushTable();
      ctx.html += '<hr>\n';
    } else if (/^\|(.+)\|/.test(line)) {
      const skipSep = renderTableLine(line, ctx);
      if (skipSep) i++;
    } else if (renderListItem(line, ctx)) {
      // handled
    } else if (line.trim() === '') {
      ctx.flushList();
      ctx.flushTable();
    } else {
      ctx.flushList();
      ctx.flushTable();
      ctx.html += `<p>${inlineMarkdown(line)}</p>\n`;
    }
    i++;
  }
  ctx.flushList();
  ctx.flushTable();
  return ctx.html;
}

// ── Prefetch content on module init ──
const _docLocale = locale === 'de' ? 'de' : 'en';

fetch(`docs/content.${_docLocale}.md`)
  .then((r) => (r.ok ? r.text() : null))
  .then((text) => {
    _contentCache[_docLocale] = text;
  })
  .catch(() => {});

// ── Panel open/close ──
export function openDocsPanel() {
  const panel = document.getElementById('docs-panel');
  const body = document.getElementById('docs-panel-body');
  if (!panel || !body) return;

  if (!_renderedCache[_docLocale] && _contentCache[_docLocale]) {
    _renderedCache[_docLocale] = renderMarkdown(_contentCache[_docLocale]);
  }

  if (_renderedCache[_docLocale]) {
    body.innerHTML = _renderedCache[_docLocale];
  } else if (_contentCache[_docLocale] === null) {
    body.innerHTML = `<p class="docs-panel__error">${t('docs.load_error')}</p>`;
  } else {
    body.innerHTML = `<p class="docs-panel__loading">${t('docs.loading')}</p>`;
    _pollInterval = setInterval(() => {
      if (_contentCache[_docLocale]) {
        clearInterval(_pollInterval);
        clearTimeout(_pollTimeout);
        _pollInterval = 0;
        _pollTimeout = 0;
        _renderedCache[_docLocale] = renderMarkdown(_contentCache[_docLocale]);
        body.innerHTML = _renderedCache[_docLocale];
      }
    }, 100);
    _pollTimeout = setTimeout(() => {
      clearInterval(_pollInterval);
      _pollInterval = 0;
      _pollTimeout = 0;
      body.innerHTML = `<p class="docs-panel__error">${t('docs.load_error')}</p>`;
    }, 10_000);
  }

  const title = panel.querySelector('.docs-panel__title');
  if (title) title.textContent = t('docs.panel_title');

  panel.classList.add('docs-panel--open');
  panel.removeAttribute('hidden');
  _panelOpen = true;
}

export function closeDocsPanel() {
  clearInterval(_pollInterval);
  clearTimeout(_pollTimeout);
  _pollInterval = 0;
  _pollTimeout = 0;
  const panel = document.getElementById('docs-panel');
  if (!panel) return;
  _panelOpen = false;
  hidePanelAfterClose(panel, 'docs-panel--open', () => _panelOpen);
}

wireEscapeToClose(
  () => _panelOpen,
  () => closeDocsPanel()
);
installPanelResizer({
  handleSelector: '.docs-panel__resize',
  getPanel: () => document.getElementById('docs-panel'),
});

document.addEventListener('click', (e) => {
  const target = /** @type {Element} */ (e.target);
  if (target.closest('.docs-panel__close')) closeDocsPanel();
  if (target.closest('.docs-help-btn')) openDocsPanel();
});
