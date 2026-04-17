# Implementation Plan: User Documentation

**Branch**: `013-user-docs` | **Date**: 2026-04-17 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `.specify/features/013-user-docs/spec.md`

---

## Summary

Add a slide-in documentation panel to both `index.html` and `settings.html`. Documentation content is authored as two Markdown source files (`docs/content.en.md`, `docs/content.de.md`) prefetched on page load and rendered in-panel by a lightweight custom Markdown renderer in `js/docs.js`. No new CDN dependencies. Locale selection reuses the existing `locale` export from `js/i18n.js`.

---

## Technical Context

**Language/Version**: JavaScript ES2022, vanilla, no transpilation (consistent with all existing features)  
**Primary Dependencies**: None new — custom Markdown renderer (~80 lines) included in `js/docs.js`; no CDN additions  
**Storage**: None — all state in-memory (content cache, render cache, panel open state); no new localStorage keys or cookies  
**Testing**: Manual acceptance checklist (`quickstart.md`) — Test-First exception invoked (see Constitution Check)  
**Target Platform**: Desktop browser; same as existing application  
**Project Type**: Browser SPA feature addition  
**Performance Goals**: Panel opens within 500ms (SC-004); content prefetched non-blocking on module init  
**Constraints**: No external dependencies; offline-capable after initial page load; no build step  
**Scale/Scope**: Single-user, self-hosted; static content only

---

## Constitution Check

*GATE: All five principles checked before Phase 1 design. Re-checked post-design below.*

### I. Redmine API Contract ✅
This feature does not interact with the Redmine REST API. No API calls added or modified. Pass.

### II. Calendar-First UX ✅
The docs panel slides in as a fixed-position overlay from the right. The calendar is not hidden, not resized, and remains interactive while the panel is open. Panel JS is a separate module that does not touch FullCalendar. Perceived calendar render time is unaffected. Pass.

### III. Test-First — **Exception invoked**
**Deviation**: No automated tests. Single-user personal tool with no CI pipeline.  
**Compensating control**: `quickstart.md` covers all 8 Functional Requirements and all 3 User Story acceptance scenarios. Must be executed before merge.  
Justified in Complexity Tracking below.

### IV. Simplicity & YAGNI ✅
One new JS module (`js/docs.js`), two Markdown content files, minor additions to `index.html`, `settings.html`, `css/style.css`, and `js/i18n.js`. No new CDN dependencies. Custom Markdown renderer handles only the subset of syntax required. Pass.

### V. Security by Default ✅
Documentation content is developer-authored and controlled — not user input or an external API response. Rendering it via `innerHTML` after parsing controlled Markdown is safe. No credentials or user data involved. All fetches are same-origin. Pass.

**Post-design re-check**: All five principles remain satisfied. ✅

---

## Project Structure

### Documentation (this feature)

```text
.specify/features/013-user-docs/
├── plan.md                         ← this file
├── research.md                     ← Phase 0 output
├── data-model.md                   ← Phase 1 output
├── quickstart.md                   ← Phase 1 output (manual acceptance checklist)
├── contracts/
│   └── docs-content-format.md      ← Phase 1 output (Markdown file contract)
└── tasks.md                        ← Phase 2 output (/speckit.tasks — not yet created)
```

### Source Code Changes

```text
docs/                    # NEW directory
├── content.en.md        # NEW — English user documentation (Markdown source)
└── content.de.md        # NEW — German user documentation (Markdown source)

js/
├── docs.js              # NEW — panel open/close, content prefetch, Markdown renderer
├── i18n.js              # MODIFIED — add docs.* i18n keys (5 keys × 2 locales)
├── calendar.js          # MODIFIED — import docs.js, wire "?" button click handler
└── [all others]         # UNMODIFIED

index.html               # MODIFIED — add "?" button to .app-header; add #docs-panel HTML
settings.html            # MODIFIED — add "?" button to header; add <script type="module"> for docs.js
css/style.css            # MODIFIED — slide-in panel styles (#docs-panel, open/closed states)
```

### `js/docs.js` Responsibilities

1. **Prefetch** `docs/content.{locale}.md` on module init (non-blocking `fetch()`)
2. **Render** Markdown to HTML via inline renderer (called once per locale; result cached)
3. **Panel open/close**: toggle `.docs-panel--open` CSS class on `#docs-panel`; trap Escape key globally
4. **Export** `openDocsPanel()` — called by calendar.js and settings page inline script

### `#docs-panel` HTML Structure

```html
<div id="docs-panel" class="docs-panel" role="dialog"
     aria-modal="false" aria-label="Help" hidden>
  <div class="docs-panel__header">
    <h2 class="docs-panel__title"></h2>
    <button class="docs-panel__close" aria-label="Close">✕</button>
  </div>
  <div class="docs-panel__body" id="docs-panel-body">
    <!-- rendered Markdown HTML injected here -->
  </div>
</div>
```

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Test-First exception (Constitution III) | No CI pipeline; personal single-user tool | Browser integration tests (Playwright) would be the only test infrastructure in the project — disproportionate to this feature's complexity and scope; `quickstart.md` is the compensating control |
