import { locale, t } from './i18n.js';

const _contentCache  = { en: null, de: null };
const _renderedCache = { en: null, de: null };
let _panelOpen = false;

// ── Markdown renderer (subset: h1–h3, bold, italic, lists, tables, hr, paragraphs) ──
function renderMarkdown(src) {
  const lines = src.split('\n');
  let html = '';
  let inUl = false, inOl = false, inTable = false;

  const flushList = () => {
    if (inUl) { html += '</ul>\n'; inUl = false; }
    if (inOl) { html += '</ol>\n'; inOl = false; }
  };
  const flushTable = () => {
    if (inTable) { html += '</tbody></table>\n'; inTable = false; }
  };

  const inline = (text) =>
    text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (/^###\s+(.*)/.test(line)) {
      flushList(); flushTable();
      html += `<h3>${inline(RegExp.$1)}</h3>\n`;
    } else if (/^##\s+(.*)/.test(line)) {
      flushList(); flushTable();
      html += `<h2>${inline(RegExp.$1)}</h2>\n`;
    } else if (/^#\s+(.*)/.test(line)) {
      flushList(); flushTable();
      html += `<h1>${inline(RegExp.$1)}</h1>\n`;
    } else if (/^---\s*$/.test(line)) {
      flushList(); flushTable();
      html += '<hr>\n';
    } else if (/^\|(.+)\|/.test(line)) {
      flushList();
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      if (!inTable) {
        html += '<table><thead><tr>';
        cells.forEach(c => { html += `<th>${inline(c)}</th>`; });
        html += '</tr></thead><tbody>\n';
        i++; // skip separator row
        inTable = true;
      } else {
        html += '<tr>';
        cells.forEach(c => { html += `<td>${inline(c)}</td>`; });
        html += '</tr>\n';
      }
    } else if (/^[-*]\s+(.*)/.test(line)) {
      flushTable();
      if (!inUl) { flushList(); html += '<ul>\n'; inUl = true; }
      html += `<li>${inline(RegExp.$1)}</li>\n`;
    } else if (/^\d+\.\s+(.*)/.test(line)) {
      flushTable();
      if (!inOl) { flushList(); html += '<ol>\n'; inOl = true; }
      html += `<li>${inline(RegExp.$1)}</li>\n`;
    } else if (line.trim() === '') {
      flushList(); flushTable();
    } else {
      flushList(); flushTable();
      html += `<p>${inline(line)}</p>\n`;
    }
    i++;
  }
  flushList(); flushTable();
  return html;
}

// ── Prefetch content on module init ──
const _docLocale = (locale === 'de') ? 'de' : 'en';

fetch(`docs/content.${_docLocale}.md`)
  .then(r => r.ok ? r.text() : null)
  .then(text => { _contentCache[_docLocale] = text; })
  .catch(() => {});

// ── Panel open/close ──
export function openDocsPanel() {
  const panel = document.getElementById('docs-panel');
  const body  = document.getElementById('docs-panel-body');
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
    const wait = setInterval(() => {
      if (_contentCache[_docLocale]) {
        clearInterval(wait);
        _renderedCache[_docLocale] = renderMarkdown(_contentCache[_docLocale]);
        body.innerHTML = _renderedCache[_docLocale];
      }
    }, 100);
  }

  const title = panel.querySelector('.docs-panel__title');
  if (title) title.textContent = t('docs.panel_title');

  panel.classList.add('docs-panel--open');
  panel.removeAttribute('hidden');
  _panelOpen = true;
}

export function closeDocsPanel() {
  const panel = document.getElementById('docs-panel');
  if (!panel) return;
  panel.classList.remove('docs-panel--open');
  setTimeout(() => { if (!_panelOpen) panel.setAttribute('hidden', ''); }, 300);
  _panelOpen = false;
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && _panelOpen) closeDocsPanel();
});

// ── Panel resize ──
{
  const handle = document.querySelector('.docs-panel__resize');
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
      const panel = document.getElementById('docs-panel');
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
  if (e.target.closest('.docs-panel__close')) closeDocsPanel();
  if (e.target.closest('.docs-help-btn')) openDocsPanel();
});
