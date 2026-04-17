# Research: User Documentation (013)

**Date**: 2026-04-17 | **Phase**: 0

---

## Decision 1: Markdown Rendering Strategy

**Decision**: Custom lightweight Markdown renderer (~80 lines of vanilla JS) included in `js/docs.js`. Handles the subset needed for documentation content: headings (h1–h3), bold, italic, unordered/ordered lists, tables, paragraphs, and horizontal rules.

**Rationale**: The documentation content is structured and author-controlled — no need for a full-featured parser. A small custom renderer avoids any CDN dependency, keeps 013 self-contained and independently implementable, and produces no risk of over-rendering unexpected Markdown syntax. `marked.js` will be introduced by feature 014 (chatbot) if needed there; adding it here for 013 alone would violate YAGNI.

**Alternatives considered**:
- **`marked.js` via CDN**: Full-featured, well-tested. Rejected for 013 alone — constitutes an unjustified new dependency (Constitution IV) for a well-bounded content subset. Feature 014 may re-evaluate.
- **Pre-rendering to HTML at build time**: Requires a build step. Rejected — the project has no build step and must stay transpilation-free.
- **Authoring content directly as HTML**: Violates FR-008 (must be Markdown source). Rejected.

---

## Decision 2: Content File Strategy and Loading

**Decision**: Two separate Markdown files — `docs/content.en.md` and `docs/content.de.md` — fetched via `fetch()` from the same origin and cached in-memory. Content is prefetched eagerly and non-blocking immediately after `DOMContentLoaded`, so it is ready in memory before the user can open the panel.

**Rationale**: SC-004 requires the panel to open within 500ms "without network requests beyond those already required." Prefetching on page load means the panel open is always served from memory cache — no blocking fetch in the critical path. On localhost (the typical deployment), the fetch completes in <20ms, well before any user interaction.

**Alternatives considered**:
- **Inline content in a JS object**: Eliminates fetch entirely, but embeds bilingual prose (~5–10KB) in a JS file, mixing content and code. Makes the Markdown source less useful as a standalone file for feature 014 (chatbot). Rejected.
- **Single bilingual file with language sections**: Simplifies file management but requires a custom parser to split sections. Rejected for added complexity.
- **Fetch on panel open (lazy)**: Simple but risks a visible loading state if content isn't cached. Rejected because SC-004 requires <500ms opening.

---

## Decision 3: Panel Architecture

**Decision**: The docs panel is a fixed-position overlay element injected once into `index.html` and `settings.html`. It slides in from the right using CSS transitions. The panel lives in the DOM at all times (hidden/shown via CSS class); a single `js/docs.js` module manages it independently of `calendar.js`.

**Rationale**: Independence from `calendar.js` is important because the panel must also work on `settings.html` (which does not load `calendar.js`). A self-contained module with its own DOM setup is the simplest design.

**Alternatives considered**:
- **Dynamic DOM injection on first open**: Avoids idle DOM weight, but risks flash of unstyled content. For a small panel, always-present is simpler. Rejected.
- **iframe with a separate docs page**: Isolated but introduces navigation and cross-frame complexity. Rejected.

---

## Decision 4: Settings Page Entry Point

**Decision**: `settings.html` gets the same "?" help button in its header. Clicking it dynamically loads and shows the docs panel. The panel JS is loaded via a `<script type="module">` tag added to `settings.html`, the same way `calendar.js` is added to `index.html`.

**Rationale**: FR-001 and FR-007 both require the entry point to be visible without scrolling on the settings page. Reusing `js/docs.js` on both pages is zero additional code.

---

## File Naming Convention

| File | Purpose |
|------|---------|
| `docs/content.en.md` | English documentation — canonical source |
| `docs/content.de.md` | German documentation — canonical source |
| `js/docs.js` | Panel UI, content loading, Markdown rendering |
