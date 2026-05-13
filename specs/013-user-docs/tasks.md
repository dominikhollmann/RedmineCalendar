# Tasks: User Documentation

**Input**: Design documents from `/.specify/features/013-user-docs/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No automated tests — Test-First exception invoked (Constitution III). `quickstart.md` is the compensating control.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create the docs infrastructure — new files and module skeleton

- [x] T001 Create `docs/` directory at repository root
- [x] T002 [P] Create `js/docs.js` module skeleton with exports: `openDocsPanel()`, `closeDocsPanel()`, prefetch function, and module-level state variables (`_contentCache`, `_renderedCache`, `_panelOpen`) per data-model.md
- [x] T003 [P] Add i18n keys to `js/i18n.js`: `docs.open_btn`, `docs.panel_title`, `docs.close_btn`, `docs.loading`, `docs.load_error` with English and German translations per data-model.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Panel HTML/CSS and Markdown renderer — needed by ALL user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Add `#docs-panel` HTML structure to `index.html` per plan.md (panel div with header, close button, body container); add "?" help button to `.app-header`
- [x] T005 [P] Add the same `#docs-panel` HTML structure and "?" help button to `settings.html` header; add `<script type="module">` importing `js/docs.js`
- [x] T006 Add slide-in panel CSS to `css/style.css`: `#docs-panel` fixed-position overlay from right, `.docs-panel--open` transition, panel header/body/close-button styles, and responsive width (~350px)
- [x] T007 Implement the custom Markdown renderer function in `js/docs.js` (~80 lines) supporting the subset defined in data-model.md: h1–h3 headings, bold, italic, unordered/ordered lists, tables (pipe syntax with header separator), paragraphs (blank-line-separated), and horizontal rules (`---`)

**Checkpoint**: Panel shell renders and Markdown parser works — content loading and wiring next

---

## Phase 3: User Story 1 — Access In-App Help (Priority: P1) 🎯 MVP

**Goal**: A user clicks "?" and sees a slide-in panel with documentation covering all core features

**Independent Test**: Open the app, click "?", verify panel slides in with readable documentation for all features listed in FR-002

### Implementation for User Story 1

- [x] T008 [US1] Implement content prefetch in `js/docs.js`: on module init, fetch `docs/content.{locale}.md` (using `locale` from `js/i18n.js`) into `_contentCache`; handle fetch errors by storing `null`
- [x] T009 [US1] Implement `openDocsPanel()` in `js/docs.js`: check `_contentCache`, render Markdown to HTML (cache in `_renderedCache`), inject into `#docs-panel-body` via `innerHTML`, toggle `.docs-panel--open` class, set `_panelOpen = true`; show loading spinner if content not yet fetched; show `docs.load_error` on failure
- [x] T010 [US1] Implement `closeDocsPanel()` in `js/docs.js`: remove `.docs-panel--open` class, set `_panelOpen = false`; wire close button click and Escape key listener
- [x] T011 [US1] Wire "?" button click handler in `js/calendar.js`: import `openDocsPanel` from `js/docs.js`, attach click listener to the help button in `.app-header`
- [x] T012 [US1] Author `docs/content.en.md` covering all 10 required sections per contracts/docs-content-format.md: Getting Started, Calendar Navigation, Time Entries, Copy and Paste, Working Hours View, Work Week / Full Week Toggle, Favourite Issues, ArbZG Compliance Indicators, Settings, Keyboard Shortcuts (with table)
- [x] T013 [US1] Verify panel opens on `settings.html` by wiring the "?" button to `openDocsPanel()` via the inline module script added in T005

**Checkpoint**: User Story 1 fully functional — panel opens on both pages with English documentation

---

## Phase 4: User Story 2 — Discover Feature-Specific Help (Priority: P2)

**Goal**: Documentation covers all major features with clear, self-contained explanations; keyboard shortcuts are listed completely

**Independent Test**: Open documentation, verify each feature from FR-002 has its own section with a clear explanation; verify the Keyboard Shortcuts section lists all shortcuts in a table

### Implementation for User Story 2

- [x] T014 [US2] Review and refine `docs/content.en.md` to ensure each feature section is self-contained: copy-paste workflow explains single-click → Ctrl+C → slot-click/drag; working-hours explains the toggle and slot range; ArbZG explains indicator colors and thresholds; keyboard shortcuts table lists Click, Double-click/Enter, Ctrl+C, Del, Escape at minimum

**Checkpoint**: All feature descriptions are complete, self-contained, and accurate

---

## Phase 5: User Story 3 — Language-Appropriate Documentation (Priority: P3)

**Goal**: German-locale users see documentation in German

**Independent Test**: Set browser locale to `de`, open the docs panel, verify all content is in German

### Implementation for User Story 3

- [x] T015 [US3] Author `docs/content.de.md` covering the same 10 required sections as the English file per contracts/docs-content-format.md, with identical structure but fully translated German content
- [x] T016 [US3] Verify locale fallback in `js/docs.js`: when locale is neither `en` nor `de`, ensure `content.en.md` is loaded (English fallback per FR-004)

**Checkpoint**: Documentation displays correctly in both English and German; non-en/de locales fall back to English

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [x] T017 Run full `quickstart.md` acceptance checklist (all FR and SC items) and mark each checkbox; fix any failures before closing the feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T002, T003 from Setup
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion (panel + renderer must exist)
- **User Story 2 (Phase 4)**: Depends on T012 (English content must exist to refine)
- **User Story 3 (Phase 5)**: Depends on T012 (English content as reference for translation)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **US2 (P2)**: Depends on US1 (refines content created in US1) — sequentially after US1
- **US3 (P3)**: Depends on US1 (needs English content as translation reference) — can start after T012

### Parallel Opportunities

- T002 and T003 can run in parallel (different files: `js/docs.js` vs `js/i18n.js`)
- T004 and T005 can run in parallel (different files: `index.html` vs `settings.html`)
- T015 (German content) can start as soon as T012 (English content) is complete, even while US2 refines English content

---

## Parallel Example: Phase 1 Setup

```bash
# These two tasks touch different files and can run simultaneously:
Task T002: "Create js/docs.js module skeleton"
Task T003: "Add i18n keys to js/i18n.js"
```

## Parallel Example: Phase 2 Foundational

```bash
# These two tasks touch different files:
Task T004: "Add #docs-panel HTML to index.html"
Task T005: "Add #docs-panel HTML to settings.html"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T007)
3. Complete Phase 3: User Story 1 (T008–T013)
4. **STOP and VALIDATE**: Open app, click "?", verify panel with English docs
5. This alone is a usable feature

### Incremental Delivery

1. Setup + Foundational → Panel infrastructure ready
2. US1 → English docs readable in slide-in panel (MVP!)
3. US2 → Content quality pass — all features described clearly
4. US3 → German translation complete
5. Polish → Quickstart checklist passes

---

## Notes

- No automated tests — `quickstart.md` is the sole acceptance gate
- Custom Markdown renderer handles only the subset in data-model.md — not a general-purpose parser
- Content files follow the contract in `contracts/docs-content-format.md`
- All UI strings go through `t('key')` from `js/i18n.js` — no hardcoded text
