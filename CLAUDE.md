# RedmineCalendar Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-05-19

## Active Technologies

- JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) — unchanged + `@types/node` (NEW, dev-only — enables removal of the last `@ts-ignore` in `js/knowledge.js` per FR-010). Plan: [`specs/035-handover-readiness/plan.md`](specs/035-handover-readiness/plan.md). (035-handover-readiness)
- ESLint v9 flat config tightened: `max-lines-per-function: 60` on `js/**` (down from 80); new `max-lines: 600` + `complexity: 20` warnings on `scripts/**`. SQI `moduleSize` band redesigned to factor in the worst-file LOC-overage ratio (not violation count only). SQI composite gate raised from `≥ 60` to `≥ 80` GREEN — hard CI failure below threshold. Constitution PATCH bump 1.5.0 → 1.5.1 captures the threshold change. (035-handover-readiness)
- JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) — unchanged + FullCalendar v6 (CDN, existing), MSAL.js v2 (CDN, existing); `@cyclonedx/cyclonedx-npm` (NEW, dev-only — CycloneDX 1.6 JSON SBoM generator) + `spdx-expression-parse` (NEW, dev-only — SPDX license-expression parser for the per-PR license-allowlist gate). Plan: [`specs/034-sbom-and-attributions/plan.md`](specs/034-sbom-and-attributions/plan.md). (034-sbom-and-attributions)
- Committed static artifacts: `sbom.json` (CycloneDX 1.6, full tree), `attributions.json` (runtime-only UI projection), `oss-manifest.json` (hand-maintained CDN + vendored inventory), `oss-allowlist.json` (SPDX allowlist + per-`name@version` exemptions). New page `licenses.html` reachable from Settings footer; per-PR CI gates `oss:drift` + `oss:licenses`; release-pipeline schema validation blocks tag/Release creation on failure (FR-020). (034-sbom-and-attributions)
- JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) — unchanged + FullCalendar v6 (CDN, existing), MSAL.js v2 (CDN, existing); `@axe-core/playwright` (NEW, dev-only — accessibility CI regression gate over the 7-surface × 2-theme matrix). Plan: [`specs/033-small-ux-a11y-fixes/plan.md`](specs/033-small-ux-a11y-fixes/plan.md). (033-small-ux-a11y-fixes)
- existing admin `config.json` fields `holidayTicket` and `vacationTicket` (read-only — used by `computeArbzgWarnings` input filter for the exemption); no new storage keys. (033-small-ux-a11y-fixes)
- Markdown (Spec Kit + audit docs); Bash 5+ (migration script, Spec Kit shell scripts); YAML (`.specify/extensions.yml`, `.github/workflows/`, dependabot.yml); JSON (Claude Code `.claude/settings.json`, `.specify/init-options.json`). No application source-code changes. + Spec Kit (vendored, currently 0.6.1, target ≥0.8.7); Claude Code CLI (host runtime); GitHub CLI (`gh` ≥ 2.x for migration script); `git` ≥ 2.30 (for `git merge-file` 3-way merges). Optionally: `spec-kit-github-issues` plugin (decision in Phase 0); a UAT/QA plugin TBD (Phase 0). (032-speckit-workflow-audit)
- GitHub Issues become the canonical feature tracker (replacing `BACKLOG.md`). Issue labels encode lifecycle (`status:specify`, `status:plan`, …, `status:done`) and shipped version (`version:v1.15.4`). No new local persistence; the project already uses git history for feature artifacts (`spec.md`, `plan.md`, `tasks.md`, `quickstart.md`). (032-speckit-workflow-audit)

- JavaScript ES2022 (vanilla, no transpilation) + FullCalendar v6 (CDN) — `calendar.setOption('slotMinTime', …)` / `setOption('slotMaxTime', …)` for dynamic range switching; `customButtons` for the toolbar toggle (005-working-hours-view)
- `localStorage` — keys `redmine_calendar_working_hours` (JSON) and `redmine_calendar_view_mode` (string). Credentials stored in encrypted localStorage. (005-working-hours-view)
- FullCalendar v6 `hiddenDays` option for day-column switching; `redmine_calendar_day_range` localStorage key (`'workweek'`|`'full-week'`). Week total displayed in `.app-header`. (002-calendar-view-totals)
- JavaScript ES2022 (vanilla, no transpilation) + FullCalendar v6 (CDN) — unchanged; `local-cors-proxy` (npm, CLI only) (006-improve-settings)
- Encrypted localStorage (`redmine_calendar_credentials`) — credential storage pattern (006-improve-settings)
- JavaScript ES2022 (vanilla, no transpilation) + FullCalendar v6 (CDN) — unchanged; no new dependencies (007-lean-time-entry)
- `localStorage` — keys `redmine_calendar_favourites`, `redmine_calendar_last_used` (007-lean-time-entry)
- `js/i18n.js` — inline ES module; exports `t(key, vars?)`, `locale` (`'en'|'de'`), `formatDate(dateStr)`; locale detected via `navigator.languages[0]`; no external library (003-entry-form-ux)
- In-memory clipboard (`_clipboard` module var in `calendar.js`) + `_selectedEvent` selection state; no new storage keys; double-click detected via timing in `eventClick` (FullCalendar v6 has no native dblclick callback); clipboard banner `#clipboard-banner` in `index.html` (004-copy-paste-time-entries)
- CSS3, JavaScript ES2022 (no changes to JS) + FullCalendar v6 (CDN) — existing; no new dependencies (011-visual-appearance)
- JavaScript ES2022 (vanilla, no transpilation) + FullCalendar v6 (CDN) — already present; no new dependencies (010-arbzg-compliance)
- N/A (computed at render time from `window._calendarDayTotals` and time-entry events) (010-arbzg-compliance)
- JavaScript ES2022 (vanilla, no transpilation) + FullCalendar v6 (CDN), Web Crypto API (browser-native), IndexedDB (browser-native) (008-multi-user-deployment)
- localStorage (encrypted credentials + plain-text preferences), IndexedDB (non-exportable encryption key), config.json (admin-managed, server-side) (008-multi-user-deployment)
- JavaScript ES2022 (vanilla ES modules, no transpilation) + Vitest (unit tests), Playwright (UI tests), GitHub Actions (CI/CD) (009-automated-testing)
- N/A (test fixtures only) (009-automated-testing)
- JavaScript ES2022 (vanilla ES modules) + Claude API (tool calling), OpenAI API (tool calling), existing chatbot infrastructure (feature 014) (015-chat-calendar-actions)
- CSS3 media queries + JavaScript ES2022 (touch events) + FullCalendar v6 (already has timeGridDay view), existing CSS (012-mobile-calendar)
- JavaScript ES2022 (vanilla, no transpilation) + Web Speech API (browser-native), FullCalendar v6 (existing, unchanged) (main)
- localStorage — key `redmine_calendar_voice_privacy_dismissed` (boolean) (main)
- JavaScript ES2022 (vanilla, no transpilation) + FullCalendar v6 (existing, unchanged) (main)
- localStorage — existing keys `redmine_calendar_favourites`, `redmine_calendar_last_used` (enriched with project identifier) (main)
- JavaScript ES2022 (vanilla, no transpilation) + FullCalendar v6 (existing), MSAL.js v2 (new — CDN, Microsoft Authentication Library for browser) (main)
- localStorage — existing keys + new `redmine_calendar_weekly_hours`, `redmine_calendar_holiday_ticket` (main)
- JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) + FullCalendar v6 (CDN, existing), MSAL.js v2 (CDN, existing — for Outlook Graph), existing chatbot infrastructure from features 014/015/019 (Claude/OpenAI tool-calling APIs via the dev-server CORS proxy) (main)
- localStorage (existing keys — `redmine_calendar_working_hours`, `redmine_calendar_weekly_hours`; legacy `redmine_calendar_holiday_ticket` removed per FR-007); `config.json` (admin-managed, server-side — new field `breakTicket: number`, existing field `holidayTicket: number` retained but no longer read from per-user settings) (main)
- JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) — unchanged + FullCalendar v6 (CDN), MSAL.js v2 (CDN) — unchanged. No new dependencies. (main)
- N/A — the cleanup itself touches `js/settings.js`'s localStorage key handling but does not introduce new storage. (main)
- JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) + FullCalendar v6 (CDN, existing); no new dependencies (027-weekly-target-tracking)
- existing `localStorage` key `redmine_calendar_weekly_hours` (read-only for this feature); admin-managed `config.json` for `holidayTicket` (027-weekly-target-tracking)
- JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) + FullCalendar v6 (CDN, existing); existing `js/redmine-api.js` (`updateTimeEntry`, `deleteTimeEntry`); no new deps (028-bulk-select-move-delete)
- in-memory `Set<entryId>` only — no localStorage, no IndexedDB (028-bulk-select-move-delete)
- JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) + FullCalendar v6 (CDN, existing); no new deps (029-anomaly-detection)
- none — anomaly tags are transient, recomputed on every render (029-anomaly-detection)
- JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) + existing CSS variables in `css/style.css`; no new deps (030-dark-mode-settings)
- `localStorage` — new key `redmine_calendar_theme` (`'light'` | `'dark'`) (030-dark-mode-settings)
- JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) + existing CSS variables from 030; FullCalendar v6 (CDN, existing); no new runtime deps (031-fluent2-ui-redesign)
- existing 030 keys; new admin-managed CI block in `config.json` (`brandPrimary`, `brandAccent`, `brandLogoUrl`, `brandFontFamily` — all strings, all optional) (031-fluent2-ui-redesign)

- HTML5, CSS3, JavaScript ES2022 (no transpilation) (001-calendar-time-entries)

## Project Structure

```text
index.html              # Calendar view (main entry point)
settings.html           # Settings screen (markup only; logic in js/settings-page.js)
css/base.css            # Design tokens (:root variables), resets, a11y utilities
css/calendar.css        # App-header, FullCalendar overrides, toolbar, ArbZG, anomaly badge
css/time-entry.css      # Time-entry modal, confirmation dialog, lean form, AI highlights
css/docs.css            # Help button, docs panel, chatbot button + panel
css/settings.css        # Settings page, welcome banner, auth toggle, licenses page

js/calendar.js          # FullCalendar init, event mapping, callbacks
js/time-entry-form.js   # Entry form: issue search, activity, submit
js/redmine-api.js       # Redmine REST API client (fetch wrapper)
js/config-store.js      # Shared config + credential state (broke settings ↔ redmine-api cycle)
js/settings.js          # Working-hours / weekly-hours / writeCredentials helpers
js/settings-page.js     # Settings page DOM wiring (i18n + form binding)
js/config.js            # Constants (storage keys, slot duration)
js/crypto.js            # AES-GCM encrypt/decrypt + IndexedDB key store
js/i18n.js              # Locale detection + t() loader (~98 LOC)
js/i18n/en.js           # English translations
js/i18n/de.js           # German translations
js/notify.js            # showToast helper (extracted from calendar.js)
js/arbzg.js             # ArbZG compliance checks (pure logic, no DOM)
js/outlook.js           # Outlook Graph integration via MSAL.js
js/chatbot.js           # AI chat panel UI + handlers
js/chatbot-api.js       # AI provider HTTP (Claude + OpenAI dispatch)
js/chatbot-tools.js     # Tool schemas + tool execution for the chatbot
js/knowledge.js         # System prompt assembly + topic-to-files routing
js/knowledge.topics.json # Keyword → relevant-file mapping (data, not code)
js/docs.js              # In-app docs panel + markdown rendering
js/voice-input.js       # Web Speech API wrapper for chatbot voice input
js/version.js           # version.json loader + display
js/types.d.ts           # Shared TypeScript types (consumed only by tsc --noEmit)

scripts/dev-server.mjs   # HTTPS dev server + bundled CORS proxies
scripts/sqi.mjs          # Software Quality Index dashboard (8-metric composite)
scripts/coverage-merge.mjs # Unifies vitest unit + Playwright UI coverage
package.json            # npm scripts: serve / dev / test / lint / format / sqi / typecheck
eslint.config.js        # ESLint v9 flat config
tsconfig.json           # tsc --noEmit JSDoc/type-checking config
.prettierrc.json        # Prettier formatting rules
.htmlhintrc             # HTMLHint rules
.husky/pre-commit       # lint-staged trigger
.github/dependabot.yml  # Weekly dep + actions bump PRs
.github/workflows/      # CI: deploy.yml (lint+test+sqi+deploy), codeql.yml (security), issue-lifecycle.yml (PR-merge → Issue close), release.yml (PR-merge → version tag + milestone + release notes)

.specify/extensions/feature-tracker/  # Auto-create/lifecycle-label GitHub Issues per Spec Kit step (after_* hooks)
.specify/extensions/publish/        # Commit + push + draft-PR open/update at every Spec Kit phase boundary
.specify/extensions/uat/            # /speckit-uat-run — interactive UAT walkthrough + flip draft → ready
```

## Deployment Model

- **Production**: Static SPA served from a shared web server (company intranet or cloud hosting). Admin configures `config.json` with Redmine URL, CORS proxy URL, AI settings. Users only need a browser — no local server, no repo access, no build step.
- **CORS proxy**: Shared reverse proxy managed by admin in production. For local development, `npm run dev` bundles HTTPS + Redmine/AI proxies in one process (see `scripts/dev-server.mjs`).
- **Credentials**: Per-user Redmine API key stored in encrypted localStorage. AI API key is admin-managed (company-wide) in `config.json`.

## Commands

```bash
# Run / serve
npm run dev              # HTTPS dev server + bundled CORS proxies (Redmine + AI)
npm run serve            # HTTP-only static server on port 3000 (no proxies)

# Test
npm test                 # Vitest unit tests
npm run test:ui          # Playwright UI tests (full suite, ~5 min)
npm run test:ui:failed   # Playwright: rerun only the tests that failed last run (fast iteration)
npm run test:coverage    # Vitest unit run — per-file ≥95% line threshold (unit-tested modules)
npm run test:coverage:all # Full pipeline: unit + UI + unified line-level merge (union total ≈88%)

# Quality + security
npm run lint             # ESLint v9
npm run lint:fix         # ESLint with --fix
npm run format           # Prettier --write
npm run format:check     # Prettier --check (CI gate)
npm run htmlhint         # HTMLHint on *.html
npm run typecheck        # tsc --noEmit (JSDoc + js/types.d.ts)
npm run sqi              # Software Quality Index dashboard (8-metric composite)
```

## Code Style

- Vanilla ES2022 modules (`<script type="module">`); no build step, no bundler
- FullCalendar v6 loaded via CDN `<script>` tag
- `fetch()` for all HTTP calls; always include `X-Redmine-API-Key` header
- **Localization**: ALL user-visible strings MUST be added to `js/i18n/{en,de}.js` and accessed via `t('key')`. Hardcoded English strings in UI code are not allowed. This applies to every feature, including error messages, tooltips, labels, and warnings. ESLint enforces a no-hardcoded-`Issue #${id}`-template rule as a regression catch.
- **Formatting**: Prettier handles all formatting; don't hand-format. Pre-commit hook auto-runs `eslint --fix` + `prettier --write` on staged files.
- **Type checking**: JSDoc + `tsc --noEmit` runs in CI. Pure-logic modules carry full JSDoc on public exports; DOM-heavy modules opt out with `// @ts-nocheck`. New shared types go in `js/types.d.ts`.

## UI Test Workflow (during implementation)

The full Playwright suite (`npm run test:ui`) runs 128 tests and takes ~5 minutes. During active implementation, iterate with the fast path instead:

1. **First run**: `npm run test:ui` — establishes the baseline failure list.
2. **Fix & iterate**: `npm run test:ui:failed` — reruns only the tests that failed last run (seconds, not minutes).
3. **Final verify**: `npm run test:ui` — full suite once all known failures are fixed, before the last commit.

The pre-push hook is smart: pushes that only touch `specs/`, `docs/`, `*.md` (plan/spec/tasks commits) run only lint + format + typecheck (~10 s). Pushes that touch `.js`, `.css`, or `.html` run the full `ci:local` pipeline (~1 min). UI tests are not part of the pre-push hook — they run in GitHub CI on every PR.

## Housekeeping (applies to every change, with or without Spec Kit)

These rules apply every time you touch the codebase — not only during `/speckit-implement`.

- **AI knowledge routing**: Whenever a new `js/*.js` module is added or an existing one is split/renamed, update `js/knowledge.topics.json` to include it in a relevant topic (or add it to the `IGNORE` set in `scripts/knowledge-check.mjs` if it is intentionally excluded). `npm run knowledge:check` enforces this as a CI gate — the build fails on uncovered modules.
- **User documentation**: Whenever a feature adds, changes, or removes user-facing behaviour, update `docs/content.en.md` **and** `docs/content.de.md` before marking the work as done. Only skip this for purely internal changes (refactoring, infra, tests with no UX impact).

## quickstart.md format (enforced by `/speckit-uat-run`)

Every UAT scenario in a `quickstart.md` file **must** be written as a `- [ ]` checkbox item. The UAT runner scans exclusively for this pattern — prose steps or heading-based scenarios without checkboxes will not be picked up and the UAT will report "no open tests found".

Note: Spec Kit skills use the `/speckit-<name>` naming convention (e.g. `/speckit-specify`, `/speckit-plan`, `/speckit-uat-run`). The dot-style names (`/speckit.specify`) were deprecated in v0.7.1 and removed in v0.9.

Correct format:

```markdown
## Scenario 1 — Feature X

- [ ] Open the calendar and verify Y is visible.
- [ ] Click Z and confirm the modal opens.
- [ ] Submit the form and check that the success toast appears.
```

## Quality + security pipeline

CI (`.github/workflows/ci.yml`) runs per-PR (in order, fails on any step): `npm audit --audit-level=high` → `npm run lint && format:check && htmlhint && typecheck` → `npm run oss:drift` → `npm run oss:licenses` → `npm run test:coverage` → `npm run sqi:json` → `npm run test:ui`. CodeQL runs as a separate workflow on every push + PR + weekly. Dependabot opens grouped weekly bump PRs. `.github/workflows/deploy.yml` re-runs the `oss:drift` / `oss:licenses` / `test:coverage` / `sqi:json` / `test:ui` gates post-merge as a defense-in-depth backstop (rationale documented inline in that workflow).

The Software Quality Index (`npm run sqi`) is a single 0-100 composite from 8 metrics (cycles, ACD, coverage, module size, function length, complexity, warnings, vulnerabilities). Bands: ≥80 GREEN · 50-80 YELLOW · 10-50 RED · <10 BLACK. A composite below 80 is a hard CI failure — `scripts/sqi.mjs` exits non-zero. Weights + bands are tunable constants in `scripts/sqi.mjs`.

`sbom.json` + `attributions.json` are committed generated files (NOT hand-edited). Regenerate via `npm run oss:generate` after any dependency change (npm install/update, `oss-manifest.json` edit). Per-PR drift check (`oss:drift`) byte-compares the regenerated outputs against the committed copies; per-PR license gate (`oss:licenses`) enforces an SPDX allowlist over npm + CDN + vendored channels. Release pipeline validates the SBoM against the CycloneDX 1.6 schema before tagging — schema failure blocks the release.

## Branch + commit policy

- **Every change goes on a feature branch.** `/speckit-specify` creates the branch (`NNN-short-kebab-name`) via the `before_specify` → `speckit.git.feature` hook. GitHub branch protection rejects direct pushes to `main`; merges only via the GitHub UI after `/speckit-uat-run` passes + the user explicitly clicks merge.
- Spec Kit feature work goes through `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement` → `/speckit-uat-run` → PR → merge. Alternatively, run the full pipeline in one go with `specify workflow run speckit --input spec="..."` (includes review gates between phases). Each `after_<step>` fires hooks: `speckit.feature-tracker.update-status` (transitions the Issue's `status:*` label), `speckit.publish.run` (commits the phase output, pushes the branch, opens/updates a **draft** PR), and `speckit.agent-context.update` (refreshes CLAUDE.md active-feature block). UAT flips the draft to ready-for-review on user confirmation. PR merge fires two workflows: `.github/workflows/issue-lifecycle.yml` (closes linked Issues with `status:done`) and `.github/workflows/release.yml` (cuts next version tag, creates milestone, assigns Issues, publishes Release with auto-generated notes — skipped for process-only PRs).

## Recent Changes

- 036-css-refactor: Added `stylelint` + `stylelint-config-standard` (both dev-only). Replaced monolithic `css/style.css` with 6 component files (`css/base.css`, `css/calendar.css`, `css/time-entry.css`, `css/docs.css`, `css/feedback.css`, `css/settings.css`). All hardcoded hex/rgb color values in CSS rules replaced with `var(--*)` references; the only hex literals remaining live in the central `:root` token block in `base.css` (stylelint-disabled). Stylelint gate (`color-no-hex`, `color-named`, `function-disallowed-list`) + HTMLHint `style-disabled` rule enforced in `npm run lint`. **Unified module-size policy** across `js/**` + `scripts/**` + `css/**`: effective-LOC (blank+comment-excluded) with a soft 500 threshold (SQI `moduleSize`, via shared `effectiveLoc()` in `scripts/sqi.mjs`) and a hard 600 threshold (CI/test failure via `tests/unit/module-size.test.js`); eslint `scripts/**` `max-lines` aligned 600 → 500. Merged `main` (feature 037 feedback button + chatbot-tools split); feedback styles ported into `css/feedback.css`. `sbom.json` + `attributions.json` regenerated. Plan: `specs/036-css-refactor/plan.md`.
- 035-handover-readiness: Pre-handover cleanup + permanent quality-bar tightening. Eleven cleanup items (stale comments, dead branches, `js/calendar.js` god-module split to ≤500 LOC across two new siblings, removal of `window._calendar*` cross-callback globals, `fetchTimeEntryById` returns `RedmineError` instead of silent `null`, internal-sanitize chatbot `renderMessage`, drop `@ts-ignore` via `@types/node`, fresh coverage artifacts) and four guardrails (`max-lines-per-function` 80 → 60 on `js/**`; new `max-lines` + `complexity` on `scripts/**`; SQI `moduleSize` band scores worst-file LOC overage; composite SQI gate raised `≥ 60` → `≥ 80`, hard CI failure). Constitution PATCH bump 1.5.0 → 1.5.1. Plan: `specs/035-handover-readiness/plan.md`.
- 034-sbom-and-attributions: Added `@cyclonedx/cyclonedx-npm` + `spdx-expression-parse` (both dev-only). Ships an in-app Open-Source Licenses page (`licenses.html` reached from Settings footer), a CycloneDX 1.6 JSON SBoM attached to every GitHub Release and served at `/sbom.json`, a per-PR drift gate that regenerates both files and diffs, a per-PR license-allowlist gate spanning npm + CDN + vendored channels (FR-014), and a release-pipeline schema-validation step that blocks tag/Release creation on failure (FR-020). One generator (`scripts/oss-generate.mjs`) is the single source of truth for both committed outputs. Plan: `specs/034-sbom-and-attributions/plan.md`.
- 033-small-ux-a11y-fixes: Added `@axe-core/playwright` (dev-only) for a permanent WCAG 2.2 AA CI regression gate over 7 surfaces × 2 themes (14 scans). Bundles four stories: time-entry modal no-close-on-outside-click, ArbZG exemption for vacation/holiday tickets (all 6 warning categories), settings server-config block removal, full-app a11y remediation. Plan: `specs/033-small-ux-a11y-fixes/plan.md`.
- 032-speckit-workflow-audit: Added Markdown (Spec Kit + audit docs); Bash 5+ (migration script, Spec Kit shell scripts); YAML + JSON (config). Spec Kit (vendored, target ≥0.8.7); Claude Code CLI; GitHub CLI (`gh` ≥ 2.x). No application source-code changes.
- 031-fluent2-ui-redesign: Added JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) + existing CSS variables from 030; FullCalendar v6 (CDN, existing); no new runtime deps
- 030-dark-mode-settings: Added JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) + existing CSS variables in `css/style.css`; no new deps
- 029-anomaly-detection: Added JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) + FullCalendar v6 (CDN, existing); no new deps
- 028-bulk-select-move-delete: Added JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) + FullCalendar v6 (CDN, existing); existing `js/redmine-api.js` (`updateTimeEntry`, `deleteTimeEntry`); no new deps
- 027-weekly-target-tracking: Added JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) + FullCalendar v6 (CDN, existing); no new dependencies
- main: Added JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) — unchanged + FullCalendar v6 (CDN), MSAL.js v2 (CDN) — unchanged. No new dependencies.
- main: Added JavaScript ES2022 (vanilla ES modules, no transpilation, no build step) + FullCalendar v6 (CDN, existing), MSAL.js v2 (CDN, existing — for Outlook Graph), existing chatbot infrastructure from features 014/015/019 (Claude/OpenAI tool-calling APIs via the dev-server CORS proxy)

<!-- MANUAL ADDITIONS START -->
<!-- SPECKIT START -->

## Active Feature Plan

**Feature 038 — Planning View**
Plan: [`specs/038-planning-view/plan.md`](specs/038-planning-view/plan.md)
Branch: `038-planning-view`

<!-- SPECKIT END -->
<!-- MANUAL ADDITIONS END -->

<!-- SPECKIT START -->

For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan

<!-- SPECKIT END -->
