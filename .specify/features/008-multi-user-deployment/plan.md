# Implementation Plan: Multi-User Deployment & Security Hardening

**Branch**: `008-multi-user-deployment` | **Date**: 2026-04-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `.specify/features/008-multi-user-deployment/spec.md`

## Summary

Transform the tool from a single-user local app into a multi-user company deployment. Admin configures shared settings (Redmine URL, CORS proxy, AI assistant) via a static `config.json`. Each employee only needs to provide their personal Redmine API key. All credentials are encrypted in the browser using the Web Crypto API (AES-GCM) with a non-exportable key in IndexedDB. The existing cookie-based config is replaced entirely (no backward compatibility needed). Deployment requires only a static file server.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla, no transpilation)
**Primary Dependencies**: FullCalendar v6 (CDN), Web Crypto API (browser-native), IndexedDB (browser-native)
**Storage**: localStorage (encrypted credentials + plain-text preferences), IndexedDB (non-exportable encryption key), config.json (admin-managed, server-side)
**Testing**: Manual acceptance test checklist (quickstart.md) — see Constitution Check
**Target Platform**: Modern browsers (Chrome, Firefox, Edge — all support Web Crypto API and IndexedDB)
**Project Type**: Static web application (SPA)
**Performance Goals**: Page load + config fetch under 300ms on broadband
**Constraints**: No server-side runtime, no build step, no database. Static files only.
**Scale/Scope**: 50–100 concurrent users, single Redmine instance (on-premise, VPN access)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Redmine API Contract | PASS | All API access through Redmine REST API via CORS proxy. Credentials from config.json (admin) and encrypted localStorage (user). No hard-coded credentials. |
| II. Calendar-First UX | PASS | No calendar UX changes. Settings page simplified (fewer fields for user). |
| III. Test-First | DEVIATION | No CI pipeline, single developer, personal tool. Manual acceptance checklist in quickstart.md covers all FRs and user stories. See Complexity Tracking. |
| IV. Simplicity & YAGNI | PASS | config.json is the simplest central config mechanism. Web Crypto API is browser-native (no new dependencies). No new abstractions beyond a crypto helper module. |
| V. Security by Default | PASS | Credentials encrypted at rest via AES-GCM. Non-exportable key in IndexedDB. Cookie storage replaced with encrypted localStorage. HTTPS enforced for Redmine server URL. No credentials in logs or console. |

**Post-Phase 1 re-check**: All gates still pass. Data model adds no unjustified complexity.

## Project Structure

### Documentation (this feature)

```text
.specify/features/008-multi-user-deployment/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
index.html              # Calendar view — add config.json loading
settings.html           # Settings screen — split admin/user fields
config.json.example     # Example config for administrators
css/style.css           # Minor styling for read-only admin fields
js/config.js            # Constants — remove hardcoded proxy ports
js/crypto.js            # NEW: Web Crypto API helpers (encrypt/decrypt/key management)
js/settings.js          # Rewrite: config.json loading, encrypted credential storage
js/redmine-api.js       # Update: read config from new settings module
js/calendar.js          # Update: config.json loading at startup
js/chatbot.js           # Update: AI config from config.json
js/i18n.js              # Add new translation keys (setup screen, errors)
package.json            # npm scripts unchanged
README.md               # Deployment instructions (local + company hosting)
```

**Structure Decision**: Existing flat structure preserved. One new file (`js/crypto.js`) for encryption helpers. No new directories needed.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Test-First deviation (Principle III) | No CI pipeline, single developer, personal tool. Manual acceptance checklist covers all scenarios. | Automated tests would require a test framework dependency (currently none) and add complexity disproportionate to the project's scope and user base. |
