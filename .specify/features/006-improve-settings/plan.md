# Implementation Plan: Improve Settings Page

**Branch**: `006-improve-settings` | **Date**: 2026-04-01 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/006-improve-settings/spec.md`

## Summary

Extend the settings page to (1) store the real Redmine server URL separately from the proxy URL so users never need to edit `package.json`, (2) show only the credential fields relevant to the selected auth mode while persisting all stored credentials, (3) add an "Anonymous Mode" auth option, and (4) show an inline error when API-key or username/password authentication fails, without falling back to anonymous.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla, no transpilation)  
**Primary Dependencies**: FullCalendar v6 (CDN) — unchanged; `local-cors-proxy` (npm, CLI only)  
**Storage**: SameSite=Strict browser cookie (`redmine_calendar_config`, JSON) — existing pattern  
**Testing**: Manual acceptance checklist (`quickstart.md`) — Test-First exception applies (see Constitution Check)  
**Target Platform**: Browser (static HTML/JS, served via `npx serve .`)  
**Project Type**: Web application (static SPA, no backend)  
**Performance Goals**: Field visibility toggle ≤ 100 ms; credential verification feedback ≤ 5 s  
**Constraints**: No build step; no bundler; must work as-is with `npx serve .`  
**Scale/Scope**: Single-user local tool; settings page only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design. ✅ Post-design re-evaluation complete — all principles still pass.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Redmine API Contract | ✅ PASS | Credentials remain configurable at runtime via settings UI; never hardcoded |
| II. Calendar-First UX | ✅ PASS | Changes are settings-page-only; calendar view is unaffected |
| III. Test-First | ⚠️ EXCEPTION | Personal single-user tool, no CI. Compensating control: `quickstart.md` manual checklist covering all FR + acceptance scenarios. Justified in Complexity Tracking. |
| IV. Simplicity & YAGNI | ✅ PASS | No new abstractions; extends existing `readConfig`/`writeConfig`; one new field added to cookie schema |
| V. Security by Default | ⚠️ EXCEPTION | Credentials stored in SameSite=Strict cookie scoped to localhost origin (never transmitted to third parties, never written to console/logs). Documented in Complexity Tracking. |

## Project Structure

### Documentation (this feature)

```text
specs/006-improve-settings/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output (manual test checklist)
├── contracts/           # N/A — internal UI feature, no external API surface
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
index.html              # Unchanged
settings.html           # Add Redmine Server URL field; add Anonymous Mode radio; rename proxy URL label
css/style.css           # Minor: style updates for new radio option if needed
js/config.js            # Add COOKIE_NAME shape doc comment (no code change needed)
js/settings.js          # readConfig(), writeConfig(), submit handler, pre-fill logic
js/redmine-api.js       # request(): add anonymous mode (no auth headers); update 401 handling
```

**Structure Decision**: Single project (existing layout). No new files in `js/` — all changes extend existing modules.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Test-First exception (III) | No CI, personal tool, single user | Full TDD cycle requires test harness setup; no existing test infrastructure; manual checklist is the documented compensating control per Constitution §III exception |
| Cookie credential storage (V) | App runs on localhost; no server component; cookies are the existing approved storage mechanism | localStorage would expose credentials to any JS on the page; environment variables require a server; cookie with SameSite=Strict is the least-bad option for a static SPA |
