# RedmineCalendar Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-05-17

## Active Technologies

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
css/style.css           # Global styles + FullCalendar overrides

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
.specify/extensions/uat/            # /speckit.uat.run — interactive UAT walkthrough + flip draft → ready
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
npm run test:ui          # Playwright UI tests
npm run test:coverage    # Vitest with per-file coverage thresholds (≥95% lines)
npm run test:coverage:all # Full pipeline: unit + UI + unified line-level merge

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

## Quality + security pipeline

CI runs (in order, fails on any step): `npm audit --audit-level=high` → `npm run lint && format:check && htmlhint && typecheck` → `npm run test:coverage` → `npm run sqi:json` → `npm run test:ui`. CodeQL runs as a separate workflow on every push + PR + weekly. Dependabot opens grouped weekly bump PRs.

The Software Quality Index (`npm run sqi`) is a single 0-100 composite from 8 metrics (cycles, ACD, coverage, module size, function length, complexity, warnings, vulnerabilities). Bands: ≥60 GREEN · 30-60 YELLOW · 10-30 RED · <10 BLACK. Weights + bands are tunable constants in `scripts/sqi.mjs`.

## Branch + commit policy

- **Every change goes on a feature branch.** `/speckit.specify` creates the branch (`NNN-short-kebab-name`) via the `before_specify` → `speckit.git.feature` hook. GitHub branch protection rejects direct pushes to `main`; merges only via the GitHub UI after `/speckit.uat.run` passes + the user explicitly clicks merge.
- Spec Kit feature work goes through `/speckit.specify` → `clarify` → `plan` → `tasks` → `implement` → `uat.run` → PR → merge. Each `after_<step>` fires two hooks: `speckit.feature-tracker.update-status` (transitions the Issue's `status:*` label) and `speckit.publish.run` (commits the phase output, pushes the branch, opens/updates a **draft** PR). UAT flips the draft to ready-for-review on user confirmation. PR merge fires two workflows: `.github/workflows/issue-lifecycle.yml` (closes linked Issues with `status:done`) and `.github/workflows/release.yml` (cuts next version tag, creates milestone, assigns Issues, publishes Release with auto-generated notes — skipped for process-only PRs).

## Recent Changes

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
<!-- MANUAL ADDITIONS END -->
