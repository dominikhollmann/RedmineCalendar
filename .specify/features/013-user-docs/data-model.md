# Data Model: User Documentation (013)

**Date**: 2026-04-17 | **Phase**: 1

This feature has no persistent data entities. All state is in-memory and page-scoped.

---

## In-Memory State (module-level in `js/docs.js`)

| Variable | Type | Description |
|----------|------|-------------|
| `_contentCache` | `{ en: string\|null, de: string\|null }` | Prefetched raw Markdown per locale; `null` until fetch completes |
| `_renderedCache` | `{ en: string\|null, de: string\|null }` | Parsed HTML string; populated on first panel open per locale |
| `_panelOpen` | `boolean` | Whether the panel is currently visible |

No localStorage keys. No cookies. No server-side state.

---

## Documentation Source File Format (Contract)

The canonical documentation content is two Markdown files: `docs/content.en.md` and `docs/content.de.md`. Both MUST follow this structure so that feature 014 (AI chatbot) can reliably parse them.

### Required Structure

```markdown
# RedmineCalendar Help

## [Feature Name]

[Feature description — 1–4 paragraphs or bullet list]

## [Next Feature Name]

...

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+C   | Copy selected time entry |
| ...      | ... |
```

### Rules

| Rule | Detail |
|------|--------|
| Top-level heading | Exactly one `# ` heading per file (the document title) |
| Feature sections | Each feature has exactly one `## ` heading; heading text is the feature name |
| Sub-sections | `### ` headings allowed within a feature section for grouping |
| Keyboard shortcuts | MUST be in a table under a `## Keyboard Shortcuts` section |
| No HTML | Raw HTML is not permitted in content files |
| No images | Screenshots and GIFs are out of scope (see Assumptions in spec) |
| Encoding | UTF-8 |

### Supported Markdown Subset (rendered by `js/docs.js`)

| Syntax | Output |
|--------|--------|
| `# Heading 1` | `<h1>` |
| `## Heading 2` | `<h2>` |
| `### Heading 3` | `<h3>` |
| `**bold**` | `<strong>` |
| `*italic*` | `<em>` |
| `- item` / `* item` | `<ul><li>` |
| `1. item` | `<ol><li>` |
| `\| col \| col \|` tables | `<table>` |
| `---` | `<hr>` |
| Blank-line-separated text | `<p>` |

---

## Locale Resolution

```
navigator.languages[0]
    │
    ├── starts with 'de' ──▶ load docs/content.de.md
    │
    └── anything else   ──▶ load docs/content.en.md
```

The `locale` value exported by `js/i18n.js` (`'en' | 'de'`) is reused directly — no new locale detection logic.

---

## Panel Lifecycle

```
[page load]
    │
    └──▶ prefetch docs/content.{locale}.md (async, non-blocking)
              │
              └──▶ _contentCache[locale] = rawMarkdown

[user clicks "?" button]
    │
    ├── _contentCache[locale] ready?
    │       ├── yes ──▶ render to HTML (if not cached) ──▶ show panel
    │       └── no  ──▶ show loading spinner ──▶ wait for fetch ──▶ show panel
    │
    └──▶ _panelOpen = true

[user clicks close / presses Escape]
    │
    └──▶ _panelOpen = false  (content stays cached)

[page reload]
    │
    └──▶ all in-memory state cleared
```

---

## New i18n Keys

The following keys MUST be added to `js/i18n.js` (English + German translations):

| Key | English | German |
|-----|---------|--------|
| `docs.open_btn` | `Help` | `Hilfe` |
| `docs.panel_title` | `Help` | `Hilfe` |
| `docs.close_btn` | `Close` | `Schließen` |
| `docs.loading` | `Loading…` | `Wird geladen…` |
| `docs.load_error` | `Could not load documentation.` | `Dokumentation konnte nicht geladen werden.` |
