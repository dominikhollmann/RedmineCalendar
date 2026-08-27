# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Code-cleanup, quality, and security hardening on branch `026-backward-compat-cleanup`. No user-visible feature changes; major lift to the developer + CI experience.

### Spec Kit + Claude Code workflow audit (032-speckit-workflow-audit)

Process/tooling changes only — zero application code touched. Lands the Spec Kit upgrade, replaces BACKLOG.md with GitHub Issues, relocates `/speckit.uat` to a project-local extension, and trims the hook chain.

- **Spec Kit upgrade**: vendored Spec Kit bumped from 0.6.1 → 0.8.8 with explicit 3-way merges for every Spec-Kit-managed file (decisions logged in `specs/032-speckit-workflow-audit/upgrade-decisions.md`). Reversibility anchor: tag `pre-speckit-0.8.7-upgrade-032`.
- **BACKLOG.md → GitHub Issues**: deleted `BACKLOG.md`; the canonical tracker is now Issues with `feature` + `status:*` labels + a GitHub Milestone per shipped version. The `after_specify`/`after_clarify`/`after_plan`/`after_tasks`/`after_implement` hooks call into the new `.specify/extensions/feature-tracker/` extension. PR merge fires two workflows: `.github/workflows/issue-lifecycle.yml` (Issue close + `status:done`) and `.github/workflows/release.yml` (version-bump → tag → milestone → Issue assignment → Release notes; skipped for process-only PRs). All ~32 historical features migrated via `scripts/migrate-backlog-to-issues.mjs`; the 11 shipped versions migrated from `version:*` labels to Milestones via `scripts/migrate-versions-to-milestones.mjs`.
- **`/speckit.uat` → `/speckit.uat.run`**: relocated to `.specify/extensions/uat/`. The broken local-merge step is gone; UAT now opens or comments on a PR (with `Closes #N`) and the human merges via the GitHub UI.
- **Hook trim**: `.specify/extensions.yml` reduced from 18 hooks to 7. Dropped every `git.commit` auto-commit between Spec Kit steps; dropped the redundant `bugfix.verify` + `verify.run` post-implement hooks. Kept what earns its place (git.initialize, the GitHub Issues lifecycle wiring, `git.test` as the post-implement test gate).
- **Folder layout**: reverted project-specific `.specify/features/` → vanilla `specs/` per FR-016 (31 feature dirs renamed, all cross-refs swept). Reversibility anchor: tag `pre-folder-rename-032`.
- **`.claude/settings.json` hooks**: dropped the `PreToolUse` git-commit branch lock (GitHub branch protection covers it) and the `PostToolUse` npm-test-after-edit hook (noisy in a team setting). Kept the async post-push CI-status check.
- **Three new extensions installed via `specify extension add`**: `.specify/extensions/feature-tracker/` (originally drafted as `github-issues`, renamed pre-merge to avoid catalog id collision with `Fatima367/spec-kit-github-issues`), `.specify/extensions/uat/`, `.specify/extensions/publish/`. Two extensions removed: `bugfix` and `verify`. Net: 4 installed (git, feature-tracker, uat, publish).
- **Docs**: `CONTRIBUTING.md` rewritten for the new Issues-driven flow + a new "Why these customizations exist" section. `CLAUDE.md` updated for the slash-command rename, the new branch+commit policy, and the project-structure additions.

### Added

- ESLint v9 (flat config) + Prettier + HTMLHint + Husky + lint-staged baseline; pre-commit hook auto-fixes staged files.
- 8-metric Software Quality Index dashboard (`npm run sqi`): cycles, ACD, coverage, module size, function length, complexity, warnings, vulnerabilities.
- Tier 1 + Tier 2 security stack: `npm audit --audit-level=high` CI gate, Dependabot weekly grouped bumps, CodeQL workflow on push/PR/weekly, vulnerabilities surfaced as the 8th SQI metric.
- JSDoc + `tsc --noEmit` type-checking pipeline; shared types live in `js/types.d.ts`; CI runs `npm run typecheck`.
- Per-file unit-coverage thresholds (≥95% lines), Playwright UI coverage capture, and unified line-level merge via `monocart-coverage-reports` (`npm run test:coverage:all`).
- ESLint regression rule that blocks hardcoded `Issue #${id}`-style template strings.

### Changed

- Extracted `js/config-store.js` to break the `settings.js` ↔ `redmine-api.js` import cycle.
- Wave 1 architecture refactor: explicit module sectioning, pure-logic exports, smaller modules.
- Reduced cyclomatic complexity and function length to zero violations under the new lint config.
- Translated SQI dashboard labels from German to English.
- README and `CLAUDE.md` reorganised: audience pointer, quality + security pipeline section, deploy schema kept in sync.
- Markdown rendering in the in-app docs panel now turns links into anchors and auto-IDs headings (TOC was previously raw text).

### Fixed

- 16 hardcoded user-visible strings replaced with `t()` lookups (i18n hygiene).
- Dropped the hardcoded "today"/"Heute" toolbar label and let FullCalendar's locale handle it.
- Silenced Firefox fcicons font warnings and the dev-server `version.json` 404.
- Mobile booking modal (#280): the Save/Cancel footer no longer gets pushed off-screen by the on-screen keyboard (`90dvh` with a `90vh` fallback); booking-guard and other confirm dialogs no longer render behind the modal (z-index fix); Planning View — a desktop-only feature — no longer auto-restores into its broken mobile layout when reopening the app on a phone.

## [1.15.4] - 2026-05-09

### Changed

- User documentation audit pass: added a mobile section, fixed structural issues, and corrected several accuracy gaps.

### Fixed

- Speckit-verify findings F1, F3, F4, F7, F8 (spec/backlog drift across done features).
- Verified all 24 done features against v1.15.2; corrected feature 012 task bookkeeping.

## [1.15.3] - 2026-05-09

### Changed

- Feature 026 (Code Cleanup & Simplification) implementation work merged.
- Removed `cleanupLegacyKeys()` and `STORAGE_KEY_HOLIDAY_TICKET` legacy storage path.
- Dropped null-startTime / null-endTime fallback paths now that the fields are mandatory.
- Removed obsolete `.input--locked` CSS rule.
- Removed dead code in `chatbot-tools.js` and unreachable `doSave` fallbacks flagged by the simplifier.

## [1.15.2] - 2026-05-08

### Added

- Feature 025 — Break-Ticket Booking for Non-Work Calendar Events: Outlook break/holiday/vacation events can now be booked against admin-configured break and holiday tickets.

### Changed

- UAT-driven redesign of feature 025: holiday and vacation handling split, real end-time on breaks, classifier folded into the tool call.
- Aligned spec, plan, contracts, and user docs with the UAT-driven changes.

### Fixed

- Playwright UI tests stabilised for feature 025 (config + modal-lock spec + `open()` ordering).

## [1.15.1] - 2026-05-07

### Added

- Implementation plan for feature 025 (break-ticket booking) committed.

### Fixed

- Speckit `before_specify` hook now auto-implies `--no-branch` when disabled.

## [1.15.0] - 2026-05-03

### Added

- Feature 019 — Agentic AI Time-Booking, Phase 1 (Outlook Calendar): the AI assistant can read your Outlook day via MSAL/Graph and book it as time entries.
- Outlook demo mode for development without M365 access; demo dataset extended with all-day events.
- `book_outlook_day` tool in the chatbot; multi-turn tool-calling loop in the assistant.

### Changed

- Modal cancel during the booking walkthrough is treated as "skip", not "are you sure?".
- AI proxy and network error messages now include the proxy URL for easier debugging.

### Fixed

- UAT bugs B1, B2, B3 in the Outlook booking flow.
- Booking summary no longer leaks LLM instructions; summary text renders before the booking modal opens.
- Follow-up tool calls re-enabled after `book_outlook_day`.
- Added `favicon.ico` to suppress browser console 404.

## [1.14.0] - 2026-05-02

### Fixed

- Deploy workflow now sets the version for any deployed feature with `implement` done (previously some completed features were skipped).

## [1.13.0] - 2026-05-02

### Fixed

- Deploy workflow handles a BACKLOG.md race condition that could leave the version column blank.

## [1.12.0] - 2026-05-02

### Fixed

- Upgraded GitHub Actions to v5 for Node.js 24 compatibility (CI deprecation fix).

## [1.11.0] - 2026-05-02

### Added

- Feature 021 — Audio Input for AI Assistant: voice input via the Web Speech API, with auto-stop and cancel.

### Changed

- Voice input UAT fixes: cancel button, auto-stop, mobile layout.
- User documentation updated for voice input behaviour.

## [1.10.0] - 2026-04-25

### Added

- Feature 023 — Enhanced Project Display and Search: project name surfaced more prominently across the UI and search.

### Changed

- Refactored: deduplicated enrichment, entry lookup, and stale-ticket patterns; split `searchIssues`; parallelised fetches; cleaned up `openForm`.

### Fixed

- Production-scale handling for ~200 projects and ~20k tickets.

## [1.9.2] - 2026-04-25

### Fixed

- Mobile UI tests stabilised by pinning the test date to avoid day-of-week flakiness.

## [1.9.1] - 2026-04-22

### Added

- Feature 012 — Mobile Calendar View: responsive layout for smartphones.

### Changed

- UAT improvements to the mobile calendar.

### Fixed

- UI tests made independent of CDN availability and the current date.
- Stale `last-used`/`favourites` entries now enriched with the missing project name.

## [1.9.0] - 2026-04-19

### Added

- Feature 020 — Smart AI Context Loading: keyword-driven selective loading of source files into the AI context.

### Changed

- Reduced AI history window to the previous user message only (latency + cost).
- Switched FullCalendar CSS to unpkg CDN to dodge a jsdelivr MIME issue; pinned version.

### Removed

- Removed unused FullCalendar CSS link (styles bundled in JS).

## [1.8.3] - 2026-04-19

### Fixed

- Deploy `awk` uses the correct field index for the BACKLOG version column.

## [1.8.2] - 2026-04-19

### Fixed

- Deploy workflow uses `awk` (Unicode-safe) instead of `sed` for the BACKLOG version update.

## [1.8.1] - 2026-04-19

### Added

- Tests for features 016, 018, and the AI chat improvements.

## [1.8.0] - 2026-04-19

### Added

- Feature 018 — Mandatory Time Entry Fields: date, start time, and end time are now required on every time entry.

### Fixed

- Save button stays enabled; validation runs on submit and shows errors before changing button state.
- Validation errors now shown when saving without a ticket.

## [1.7.4] - 2026-04-19

### Fixed

- Skip the follow-up API call for write tools; improve edit description.

## [1.7.3] - 2026-04-19

### Fixed

- Clear AI highlight classes when the time-entry modal reopens.

## [1.7.2] - 2026-04-19

### Fixed

- Only highlight fields the AI actually changed, not pre-existing values.

## [1.7.1] - 2026-04-19

### Fixed

- Prevent orphaned `tool_use` messages in chat history.

## [1.7.0] - 2026-04-19

### Added

- AI UI improvements: sparkle icon, purple highlights for AI-changed fields, Retry icon on errors.

## [1.6.1] - 2026-04-19

### Fixed

- Removed leftover fallback message and debug logging from the chatbot.

## [1.6.0] - 2026-04-19

### Added

- Feature 015 — AI Chat Calendar Actions: tool calling for query, create, edit, and delete of time entries from chat.
- Date field added to the time-entry modal.
- 60-second safety timeout for chat API calls.
- Retry button on chat error messages.

### Fixed

- Correct date interpretation and day names in chat queries.
- `tool_use` message format aligned with the Claude API.
- Edit/delete tools accept date + ticket as an alternative to entry ID.
- Calendar refresh callback wired for chatbot tool actions.
- AI-created entries require `start_time`; default falls back to working-hours start (or 09:00).

## [1.5.2] - 2026-04-18

### Fixed

- Deploy workflow auto-fills the BACKLOG version column.

## [1.5.1] - 2026-04-18

### Changed

- User documentation updated for feature 016.

## [1.5.0] - 2026-04-18

### Added

- Feature 016 — Entry UX Improvements: `#NNN` ticket-ID search, ticket hyperlink in the modal, dedicated comment field.

### Fixed

- Enter inside the comment field submits the form (matches the lean UX flow).
- Removed an `eventClick` guard that blocked all event interaction.

## [1.4.1] - 2026-04-18

### Removed

- Reverted the `#123` ID-only ticket-search experiment from v1.4.0 (re-introduced cleanly in feature 016 / v1.5.0).

## [1.4.0] - 2026-04-18

### Added

- `#123` syntax for ID-only ticket search.

## [1.3.0] - 2026-04-18

### Added

- Resizable docs panel matching the chatbot panel.

## [1.2.0] - 2026-04-18

### Added

- Feature 017 — App Versioning: version surfaced on the settings page; auto-versioning + path filters in CI/deploy; Version column added to BACKLOG.

## [1.1.0] - 2026-04-18

### Fixed

- `version.json` fetched via a relative path so the GitHub Pages subdirectory deploy works.

## [1.0.0] and earlier (pre-1.0)

The pre-1.0 history is the full first wave of Spec Kit features that built the product. Versions were assigned retroactively by the deploy pipeline once it existed; the work is grouped here by feature rather than by tagged release.

### Added

- Feature 001 — Calendar Time Entries: weekly calendar view backed by the Redmine time-entries API.
- Feature 002 — Calendar View & Week Totals: week total in the header; workweek vs full-week toggle persisted in localStorage.
- Feature 003 — German/English Localization: inline `js/i18n.js` with locale auto-detection.
- Feature 004 — Copy and Paste Time Entries: select event, double-click or Ctrl+C, paste into a target slot.
- Feature 005 — Working Hours View: per-user working-hours range and view-mode toggle.
- Feature 006 — Improve Settings: settings page rework; bundled `local-cors-proxy` for dev.
- Feature 007 — Super Lean Time Entry UX: favourites, last-used ticket, faster entry flow.
- Feature 008 — Multi-User Deployment: encrypted localStorage credentials (Web Crypto + IndexedDB key), admin-managed `config.json`, setup view in settings.
- Feature 009 — Automated Testing: Vitest unit tests, Playwright UI tests, GitHub Actions CI/CD; constitution updated to drop the test exception.
- Feature 010 — ArbZG Compliance Warnings: badges and tooltips for German working-time-law checks.
- Feature 011 — Visual Appearance Improvements: card hierarchy, row height, hourly banding, modal typography aligned with calendar event cards.
- Feature 013 — User Documentation: in-app docs panel with EN + DE content.
- Feature 014 — AI Chatbot Assistant: chat panel, Claude + OpenAI dispatch, system prompt, model + auth from `config.json`.

### Security

- Removed `config.json` from version control; added it to `.gitignore`.

### Changed

- Constitution v1.2.0 (drop test exception), v1.3.0 (drop cookie exception), v1.4.0 (Easy Redmine target platform).

[Unreleased]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.15.4...HEAD
[1.15.4]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.15.3...v1.15.4
[1.15.3]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.15.2...v1.15.3
[1.15.2]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.15.1...v1.15.2
[1.15.1]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.15.0...v1.15.1
[1.15.0]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.14.0...v1.15.0
[1.14.0]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.13.0...v1.14.0
[1.13.0]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.12.0...v1.13.0
[1.12.0]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.11.0...v1.12.0
[1.11.0]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.10.0...v1.11.0
[1.10.0]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.9.2...v1.10.0
[1.9.2]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.9.1...v1.9.2
[1.9.1]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.9.0...v1.9.1
[1.9.0]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.8.3...v1.9.0
[1.8.3]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.8.2...v1.8.3
[1.8.2]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.8.1...v1.8.2
[1.8.1]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.8.0...v1.8.1
[1.8.0]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.7.4...v1.8.0
[1.7.4]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.7.3...v1.7.4
[1.7.3]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.7.2...v1.7.3
[1.7.2]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.7.1...v1.7.2
[1.7.1]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.7.0...v1.7.1
[1.7.0]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.6.1...v1.7.0
[1.6.1]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.5.2...v1.6.0
[1.5.2]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.5.1...v1.5.2
[1.5.1]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.4.1...v1.5.0
[1.4.1]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/dominikhollmann/RedmineCalendar/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/dominikhollmann/RedmineCalendar/releases/tag/v1.1.0
