# Research: DSGVO / GDPR Privacy Compliance for Planning Features

**Feature**: 044-dsgvo-privacy-compliance | **Date**: 2026-06-18

All technical decisions below were resolved during the Specify and Clarify phases. No NEEDS CLARIFICATION items remain.

---

## Decision 1 — Privacy notice delivery

**Decision**: Dedicated static HTML page `privacy.html`, linked from the Settings footer adjacent to the existing `licenses.html` link.

**Rationale**: Directly mirrors the `licenses.html` pattern already in the codebase (feature 034). Same CSP, same CSS imports (`css/base.css` + `css/settings.css`), same dark-theme inline script, same `data-i18n` footer link in `settings.html`. Zero additional infrastructure.

**Alternatives considered**: Inline panel (like the docs panel in `js/docs.js`) — rejected because it would add a new panel component with its own open/close state and z-index stacking, while `licenses.html` proves a separate page is sufficient and simpler.

---

## Decision 2 — Consent gate placement

**Decision**: The AI data-sharing consent gate is enforced in `js/chatbot-tools.js`'s `executeTool()` dispatcher, before any tool tagged as involving personal planning data (currently `book_outlook_day`; extendable to Teams tools).

**Rationale**: `executeTool()` is the single dispatch point for all AI tool calls. A `PLANNING_TOOLS` Set defined at the top of the module makes the tagging explicit and auditable. The gate returns `{ requiresConsent: true }` when consent is absent; `js/chatbot.js` detects this sentinel and shows the consent modal. The AI API call has already happened by the time tools execute — but planning data is returned _in the tool result_ back to the AI, so blocking tool execution prevents planning data from being incorporated into the AI's reasoning and response.

**Alternatives considered**: Intercepting in `js/chatbot-api.js` before the HTTP request — rejected because at that layer we cannot distinguish whether the payload contains planning data without parsing the message body, which is fragile.

---

## Decision 3 — Consent record storage format

**Decision**: Single localStorage key `redmine_calendar_ai_consent` holding `{ consentedAt: ISO8601 | null, withdrawnAt: ISO8601 | null }` JSON object.

**Rationale**: Simple, inspectable, satisfies Art. 5(2) accountability (timestamped). Withdrawal sets `withdrawnAt` to the current timestamp and leaves `consentedAt` intact (audit trail preserved). Active consent = `consentedAt` is set AND (`withdrawnAt` is null OR `withdrawnAt` < `consentedAt`).

**Alternatives considered**: Boolean flag — rejected because it loses the audit timestamp. Server-side log — rejected because this is a browser-local app with no always-on backend.

---

## Decision 4 — Planning data namespace convention

**Decision**: Future planning data cached to localStorage MUST use keys matching `redmine_calendar_planning_snapshot_*`. Each value MUST be a JSON object with a top-level `_writtenAt` ISO 8601 field. The startup retention cleanup in `js/privacy-store.js` enumerates all matching keys and removes those where `Date.now() - Date.parse(_writtenAt) > retentionMs`.

**Rationale**: Currently no planning snapshots are persisted (all data is fetched fresh). The convention is pre-defined so future planning features can start caching without needing to re-engineer the retention mechanism. The `_writtenAt` field is self-describing and survives key-value storage opaqueness.

**Alternatives considered**: Storing a separate `redmine_calendar_planning_index` key listing all snapshot keys — rejected because it adds a coordination problem (index can drift from actual keys if a write fails midway).

---

## Decision 5 — Reuse audit

**Touched modules** (existing):
| Module | How touched |
|--------|-------------|
| `js/chatbot-tools.js` | Add `PLANNING_TOOLS` Set + consent gate in `executeTool()` |
| `js/chatbot.js` | Detect `requiresConsent` sentinel, show consent modal |
| `js/settings-page.js` | Wire delete button, data viewer, consent withdrawal toggle |
| `js/config.js` | Add new `STORAGE_KEY_*` constants for consent + snapshot namespace |
| `js/config-store.js` | Expose `planningDataRetentionDays` + `privacy*` fields from config.json |
| `js/i18n/en.js` + `js/i18n/de.js` | Add privacy UI chrome keys |
| `css/settings.css` | Add styles for privacy page + settings additions |
| `settings.html` | Add footer link, delete section, data viewer, consent withdrawal |
| `CLAUDE.md` | Add DSGVO checklist reference to Housekeeping |
| `docs/content.en.md` + `docs/content.de.md` | Document privacy features |

**New modules**:
| Module | Justification |
|--------|--------------|
| `privacy.html` | New page (parallel to `licenses.html`); no shared HTML template system exists to avoid this |
| `js/privacy.js` | Page script for `privacy.html`; analogous to `js/licenses.js` but serves different content (locale-switching privacy notice with config injection) — no shared logic worth extracting |
| `js/privacy-store.js` | Pure-logic module for consent record management, retention expiry check, planning data enumeration, deletion. Genuinely new capability with no existing analog in the codebase |

**No parallel-capability risk**: `js/privacy-store.js` is the single point for all privacy/consent state. No second privacy module will be needed; future features add their snapshot keys under the established `redmine_calendar_planning_snapshot_*` namespace and the existing cleanup handles them.
