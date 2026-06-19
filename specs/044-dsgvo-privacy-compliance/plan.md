# Implementation Plan: DSGVO / GDPR Privacy Compliance for Planning Features

**Branch**: `044-dsgvo-privacy-compliance` | **Date**: 2026-06-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/044-dsgvo-privacy-compliance/spec.md`

## Summary

Add GDPR/DSGVO compliance infrastructure for planning features: a privacy notice page (`privacy.html`), an explicit AI data-sharing consent gate in the chatbot tool dispatcher, per-user consent record storage, a user-triggered "Delete planning data" action, an in-app Art. 15 data view, startup retention cleanup for planning snapshots, and a reusable DSGVO impact checklist that future features must consult. See `research.md` for all technical decisions and `data-model.md` for entities and the `js/privacy-store.js` API.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules, no transpilation, no build step)

**Primary Dependencies**: FullCalendar v6 (CDN, existing), MSAL.js v2 (CDN, existing); no new runtime dependencies. Vitest + Playwright (existing test tooling).

**Storage**: `localStorage` — new key `redmine_calendar_ai_consent` (ConsentRecord JSON); existing planning preference flags included in data view and deletion scope. `config.json` — four new admin-configurable fields (`privacyControllerName`, `privacyControllerEmail`, `privacyDpoEmail`, `planningDataRetentionDays`).

**Testing**: Vitest (unit — `js/privacy-store.js` is pure logic, fully testable in Node environment); Playwright (UI — consent modal flow, deletion button, data viewer, `privacy.html` content and locale switch).

**Target Platform**: Static SPA, desktop browsers on company intranet.

**Project Type**: Web application (browser-only SPA, no backend).

**Performance Goals**: Startup retention cleanup must not block render; runs asynchronously and fails-open via a toast on error.

**Constraints**: All new modules ≤500 LOC soft / ≤600 LOC hard; functions ≤60 LOC; SQI composite ≥80 GREEN; no hardcoded UI strings (i18n required).

**Scale/Scope**: Single-user browser sessions; localStorage-only persistence; no server-side changes required beyond `config.json` field additions.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                      | Status | Notes                                                                                                                           |
| ------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| I — Single Responsibility      | PASS   | `js/privacy-store.js` is pure logic only; DOM wiring stays in `js/settings-page.js`; no mixing                                  |
| II — Module Size               | PASS   | All new modules projected ≤250 LOC; existing touched modules within limits                                                      |
| III — No Duplication           | PASS   | Reuse `licenses.html` page pattern, existing i18n system, existing toast from `js/notify.js`; no second privacy module          |
| IV — Separation of Concerns    | PASS   | Consent gate in `executeTool()` only; UI detection in `js/chatbot.js` only; storage logic in `js/privacy-store.js` only         |
| V — Testing                    | PASS   | `js/privacy-store.js` testable in Node (pure logic); UI flows in Playwright                                                     |
| VI — Quality Gate              | PASS   | SQI ≥80 not at risk; adding ≤600 LOC total across new + touched modules                                                         |
| VII — No Premature Abstraction | PASS   | No shared component introduced; `privacy.html` / `js/privacy.js` are standalone analogues of `licenses.html` / `js/licenses.js` |

Post-design re-check: All gates still pass. No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/044-dsgvo-privacy-compliance/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: technical decisions
├── data-model.md        # Phase 1: entities, ConsentRecord, module API
├── quickstart.md        # Phase 1: UAT validation guide
├── contracts/
│   └── config-schema.md # Phase 1: admin config.json new fields contract
└── checklists/
    ├── requirements.md  # Specification quality checklist (already exists)
    └── dsgvo-impact.md  # FR-014: reusable DSGVO impact checklist (new)
```

### Source Code (repository root)

```text
# New files
privacy.html                         # Privacy notice page (parallel to licenses.html)
js/privacy.js                        # Page script for privacy.html (parallel to js/licenses.js)
js/privacy-store.js                  # Pure-logic consent / retention / deletion module

tests/unit/privacy-store.test.js     # Vitest unit tests for js/privacy-store.js

# Modified files
js/chatbot-tools.js                  # Add PLANNING_TOOLS Set + consent gate in executeTool()
js/chatbot.js                        # Detect requiresConsent sentinel; show consent modal
js/settings-page.js                  # Wire: delete button, data viewer, consent withdrawal toggle
js/config.js                         # Add STORAGE_KEY_AI_CONSENT + STORAGE_KEY_PLANNING_SNAPSHOT_PREFIX
js/config-store.js                   # Expose planningDataRetentionDays + privacy* fields
js/i18n/en.js                        # Add privacy UI chrome keys
js/i18n/de.js                        # Add German privacy UI chrome keys
js/knowledge.topics.json             # Add privacy-store.js to relevant topic
css/settings.css                     # Add styles: privacy-page card, data-viewer, consent toggle
settings.html                        # Add footer link; delete section; data viewer; consent toggle
CLAUDE.md                            # Add DSGVO checklist reference to Housekeeping section
docs/content.en.md                   # Document privacy features (FR per CLAUDE.md housekeeping rule)
docs/content.de.md                   # German documentation update
tests/fixtures/config.json           # Add new admin config fields with placeholder values
```

**Structure Decision**: Single-project flat layout matching the existing repo. New page `privacy.html` follows the `licenses.html` pattern verbatim. New module `js/privacy-store.js` is a pure-logic sibling with no DOM dependency. No new directories are needed beyond the existing `js/` and `tests/unit/` trees.

## Complexity Tracking

No Constitution violations. No entries required.
