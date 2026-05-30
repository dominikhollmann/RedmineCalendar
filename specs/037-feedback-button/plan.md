# Implementation Plan: User Feedback Button

**Branch**: `037-feedback-button` | **Date**: 2026-05-30 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/037-feedback-button/spec.md`

## Summary

Add a persistently visible "Give Feedback" floating button (bottom-right corner) to both `index.html` and `settings.html`. Clicking it opens a modal dialog with a mandatory category selector ("Bug Report" / "Suggestion"). Bug Reports auto-collect a full diagnostic bundle: screenshot (html2canvas), recent application errors + stack traces, a network-request log (via fetch proxy), non-sensitive localStorage values, and current FullCalendar state. Suggestions collect a screenshot only. Submission sends a rich HTML email with screenshot attachment via the existing Office 365 / MSAL integration when the user is signed in; falls back to a pre-filled `mailto:` link otherwise. The recipient address is admin-configured in `config.json` (`feedbackEmail`); the button is hidden entirely when that field is absent.

---

## Technical Context

**Language/Version**: JavaScript ES2022, vanilla ES modules, no transpilation, no build step  
**Primary Dependencies**: FullCalendar v6 (CDN, existing); MSAL.js v2 (CDN, existing — extended for `Mail.Send`); `html2canvas` v1.4.1 (CDN, new — jsdelivr.net, already in CSP allowlist); no new npm runtime deps  
**Storage**: In-memory only (session error buffer ≤10, network log ring buffer ≤20, app log ring buffer ≤50); `config.json` admin field `feedbackEmail` (new, read-only)  
**Testing**: Vitest (unit — `feedback-context.js` pure logic); Playwright (UI — dialog flows on `index.html` and `settings.html`)  
**Target Platform**: Modern browser SPA (Chrome, Edge, Firefox, Safari); existing CSP unchanged  
**Performance Goals**: Dialog open (including screenshot capture) in < 2 seconds on typical hardware  
**Constraints**: Each `js/**` function ≤ 60 lines (ESLint gate); each new module ≤ 500 LOC (SQI gate); SQI composite must remain ≥ 80 GREEN  
**Scale/Scope**: Two new modules (`js/feedback.js`, `js/feedback-context.js`); two HTML pages extended; one CSS file extended; one CDN dep added to SBoM

---

## Constitution Check

_GATE: Must pass before implementation begins. Re-checked post-design below._

| Principle               | Status       | Notes                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Redmine API Contract | ✅ Pass      | Feedback feature does not touch the Redmine API at all.                                                                                                                                                                                                                                                                                                                                                                             |
| II. Calendar-First UX   | ✅ Pass      | Floating button (bottom-right, fixed position) does not overlap calendar controls. Dialog is a native `<dialog>` modal — keyboard-dismissable. Screenshot may briefly pause the calendar render thread; html2canvas is async and non-blocking.                                                                                                                                                                                      |
| III. Test-First         | ✅ Required  | Unit tests for all pure logic in `feedback-context.js` (ring buffers, allowlist snapshot, OS extraction, base64 strip, mailto builder). Playwright UI tests for dialog open/category switch/submit flows on both pages. Tests must be written before implementation per TDD mandate.                                                                                                                                                |
| IV. Simplicity & YAGNI  | ⚠️ Justified | `html2canvas` is a new CDN dependency — justified because no native browser API captures the DOM as an image without a user permission prompt (see research R-001). No abstraction layers beyond the two new modules. `window.fetch` wrapping is minimal and idempotent.                                                                                                                                                            |
| V. Security by Default  | ✅ Pass      | localStorage snapshot uses an explicit allowlist (never includes credential keys or MSAL cache). Screenshot contains whatever is on screen — user reviews before submitting (FR-007, FR-008). Graph API token acquired with minimal scope (`Mail.Send` only, separate from `Calendars.Read`). Email body rendered with `textContent` assignment in DOM (no innerHTML from user input) before serialising to string — no XSS vector. |
| VI. Quality Gates       | ✅ Required  | CI must stay green: lint, typecheck, coverage ≥95% for new pure-logic module, SQI ≥ 80. `oss:generate` must be re-run and both `sbom.json` and `attributions.json` committed after adding `html2canvas` to `oss-manifest.json`.                                                                                                                                                                                                     |

**Complexity Tracking** (IV justification):

| Addition              | Why Needed                                        | Simpler Alternative Rejected Because                                                                                                                          |
| --------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `html2canvas` CDN dep | Screenshot capture without user permission prompt | `MediaDevices.getDisplayMedia()` requires permission pop-up every time; DOM serialisation (plain HTML export) is not a useful visual reference for developers |
| `window.fetch` proxy  | Capture network request log transparently         | `PerformanceObserver` resource entries do not expose status codes; patching individual API modules would miss third-party calls (e.g. MSAL, Graph)            |

---

## Project Structure

### Documentation (this feature)

```text
specs/037-feedback-button/
├── plan.md              # This file
├── research.md          # Phase 0: key technical decisions
├── data-model.md        # Phase 1: in-memory entities + config schema extension
├── quickstart.md        # Phase 1: UAT scenarios + developer notes
├── contracts/
│   ├── config-schema.md       # feedbackEmail config.json field
│   ├── graph-mail-api.md      # Graph sendMail request format + error handling
│   └── feedback-module-api.md # Public API of js/feedback.js + js/feedback-context.js
├── checklists/
│   └── requirements.md  # Spec quality checklist (all items pass)
└── tasks.md             # Phase 2 output — generated by /speckit-tasks
```

### Source Code Changes

```text
js/
├── feedback-context.js       # NEW — context collection: fetch proxy, error listener,
│                             #       localStorage snapshot, screenshot capture, app log
├── feedback.js               # NEW — dialog UI, button init, send orchestration
├── outlook.js                # EXTENDED — acquireFeedbackToken(), sendFeedbackEmail(),
│                             #            isMsalSignedIn()
├── calendar.js               # EXTENDED — export getCalendarViewState()
├── types.d.ts                # EXTENDED — FeedbackReport, SessionError, NetworkLogEntry,
│                             #            AppLogEntry, CalendarViewState; CentralConfig.feedbackEmail
└── i18n/
    ├── en.js                 # EXTENDED — feedback.* translation keys
    └── de.js                 # EXTENDED — feedback.* translation keys (German)

index.html                    # EXTENDED — html2canvas CDN script tag; feedback button +
                              #            dialog elements; feedback.js module import
settings.html                 # EXTENDED — html2canvas CDN script tag; feedback button
                              #            element; feedback.js module import

css/style.css                 # EXTENDED — .feedback-fab (floating button),
                              #            .feedback-dialog and child styles

oss-manifest.json             # EXTENDED — html2canvas CDN entry (MIT, jsdelivr.net)
sbom.json                     # REGENERATED via npm run oss:generate
attributions.json             # REGENERATED via npm run oss:generate

tests/unit/
└── feedback-context.test.js  # NEW — unit tests for all pure-logic exports

tests/ui/
└── feedback.spec.js          # NEW — Playwright UI tests (7 UAT scenarios)
```

---

## Implementation Sequence

Tasks are dependency-ordered (see `tasks.md` for atomic task breakdown):

1. **Types + config schema** — extend `types.d.ts` and document `feedbackEmail` in `config-schema.md`
2. **i18n keys** — add `feedback.*` keys to both `en.js` and `de.js`
3. **`feedback-context.js`** — fetch proxy, error listener, app log, localStorage snapshot, calendar state, screenshot capture (pure logic first, then html2canvas integration)
4. **Unit tests for `feedback-context.js`** — written before / alongside step 3 per TDD
5. **`outlook.js` extension** — `acquireFeedbackToken()`, `sendFeedbackEmail()`, `isMsalSignedIn()`
6. **`calendar.js` extension** — `getCalendarViewState()` export
7. **`feedback.js`** — dialog HTML construction, button init, category-switch logic, submit handler, send orchestration
8. **HTML + CSS** — floating button styles, dialog styles, html2canvas CDN tag, module imports in both HTML pages
9. **`oss-manifest.json` + regenerate SBoM** — add html2canvas CDN entry, run `npm run oss:generate`
10. **Playwright UI tests** — 7 UAT scenarios in `tests/ui/feedback.spec.js`
11. **Full quality gate** — `npm run lint && typecheck && test:coverage && sqi && test:ui`
