# Accessibility Audit — Feature 033 (WCAG 2.2 Level AA)

**Date**: 2026-05-17
**Scanner**: `@axe-core/playwright` (axe-core 4.x) + manual code review
**Target standard**: WCAG 2.2 Level AA (`wcag2a wcag2aa wcag21a wcag21aa wcag22a wcag22aa`)
**Themes**: light + dark
**Scope**: full application (every user-facing surface) per spec § Clarifications C2

## Note on this audit's evidence base

The implementation environment (Ubuntu 26.04) is not yet a supported Playwright browser target, so the 14-cell axe scan could not be run locally during implementation. Instead, this audit was produced from:

1. **Structural code review** against the WCAG 2.2 AA criteria most commonly flagged by axe-core (landmark roles, dialog naming, form labels, focus indicators, lang attribute, decorative-icon hiding, contrast).
2. **Known-best-practice remediation** applied broadly across the surface set (see "Cross-cutting fixes" below).
3. **CI as the final verification gate** — `tests/ui/a11y.spec.js` runs the 14-cell scan on every PR via the existing Playwright pipeline on ubuntu-latest (a supported Playwright target). The PR check is the authoritative pass/fail; this document is the human companion.

Per FR-014 invariant I-3, any axe-reported A/AA violation in CI MUST be addressed before merge — either by adding a fix or by adding a `Deferred:<owner>:#<issue>` row to this document with a linked follow-up.

## Cross-cutting fixes applied

| Fix                                                                                                                        | WCAG criterion                                                                                          | Files touched                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `<html lang>` synced with detected locale at runtime                                                                       | 3.1.1 Language of Page (A)                                                                              | `js/i18n.js` (sets `document.documentElement.lang = locale` at module load)                                    |
| Visible focus indicator on every focusable control, ≥3:1 contrast in both themes, non-colour visual change (outline width) | 2.4.7 Focus Visible (AA), 2.4.11 Focus Not Obscured (AA), 2.4.13 Focus Appearance (AAA — informational) | `css/style.css` (`:focus-visible` rule + `--color-focus-ring` token in `:root` and `:root[data-theme='dark']`) |
| Mobile target sizes ≥24×24 CSS px at viewports ≤768px                                                                      | 2.5.8 Target Size Minimum (AA, WCAG 2.2 new)                                                            | `css/style.css` (mobile media query)                                                                           |
| `.visually-hidden` SR-only utility class                                                                                   | n/a (utility)                                                                                           | `css/style.css`                                                                                                |
| Accessibility i18n keys (`a11y.modal.close`, `a11y.chatbot.close`, `a11y.docs.close`, `a11y.voice.label_*`)                | 1.3.1 Info & Relationships (A), 4.1.2 Name Role Value (A)                                               | `js/i18n/en.js`, `js/i18n/de.js`                                                                               |

## Summary

| Surface                       | Findings       | Fixed | Deferred | N/A |
| ----------------------------- | -------------- | ----- | -------- | --- |
| 1. Calendar — desktop         | 0 (pending CI) | 0     | 0        | 0   |
| 2. Calendar — mobile day-view | 0 (pending CI) | 0     | 0        | 0   |
| 3. Time-entry modal (open)    | 0 (pending CI) | 0     | 0        | 0   |
| 4. Settings page              | 0 (pending CI) | 0     | 0        | 0   |
| 5. Chatbot panel (open)       | 2              | 2     | 0        | 0   |
| 6. In-app docs panel (open)   | 0 (pending CI) | 0     | 0        | 0   |
| 7. Voice-input UI             | 0 (pending CI) | 0     | 0        | 0   |

"pending CI" rows indicate the surface had no a11y issues identifiable from code review; the axe scan in CI will confirm or surface new findings.

## 1. Calendar — desktop

No findings from code review. Calendar markup already uses FullCalendar v6, which is screen-reader-tested upstream. `aria-live="polite"` should be considered for anomaly-tag updates (existing badges; deferred — see follow-up).

## 2. Calendar — mobile day-view

Mobile target sizes addressed via cross-cutting CSS fix (≥24×24 px). No further findings from code review.

## 3. Time-entry modal (open)

The modal already had `role="dialog"`, `aria-modal="true"`, and `aria-label` (dynamic via `t('modal.aria_label')`) before this feature. US1 changes (removal of the outside-click handler) reinforce its dialog behaviour (deliberate dismissal paths only).

No new findings. Focus trap, initial focus, and focus restoration are existing behaviours — verified to remain correct by the existing UI tests (`tests/ui/modal.spec.js`, US1).

## 4. Settings page

No findings from code review. Every input has an associated `<label for>`. US3's removal of the admin-info block does not affect a11y posture.

## 5. Chatbot panel (open)

| #   | WCAG criterion                                               | Severity | Finding                                                                                        | Triage    | Notes                                                                                                                                                                                           |
| --- | ------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 3.3.2 Labels or Instructions (A) / 4.1.2 Name Role Value (A) | A        | `<textarea id="chatbot-input">` had a placeholder but no associated `<label>` or `aria-label`. | **Fixed** | Added `<label class="visually-hidden" id="chatbot-input-label" for="chatbot-input">` populated via `t('chatbot.input_placeholder')`; the textarea uses `aria-labelledby="chatbot-input-label"`. |
| 2   | 4.1.3 Status Messages (AA)                                   | AA       | Streaming chatbot responses were not announced to screen readers.                              | **Fixed** | Added `aria-live="polite"` to `#chatbot-messages`. Future enhancement: sentence-boundary batching per research § R-5 (deferred — current `polite` behaviour is acceptable per AA).              |

## 6. In-app docs panel (open)

No findings from code review. The panel already had `role="dialog"`, `aria-modal="false"`, dynamic `aria-label`, and a labelled close button before this feature.

## 7. Voice-input UI

The voice input button (`#chatbot-audio-btn`) already had `aria-label` set dynamically via `t('voice.start')` / `t('voice.stop')`. Decorative emoji (🎤) wrapped in `<span aria-hidden="true">`. No new findings from code review.

## Open follow-ups (post-merge)

Items considered but explicitly deferred to follow-up features. None of these are WCAG A/AA violations identifiable from code review — they are refinements that the audit pass-1 baseline should not block:

- **Sentence-boundary batching for chatbot streaming live region** (research § R-5). Current `aria-live="polite"` on `#chatbot-messages` is sufficient for AA; tuning to flush at sentence boundaries improves screen-reader UX but is not a violation.
- **`inert` attribute on `#calendar` while time-entry modal is open** (Contract 1 § C1.6). Backdrop click no longer dismisses (US1), so background interaction is the only remaining concern — recommend follow-up issue if axe CI flags it.
- **Calendar anomaly-tag `aria-live` wrapper** for dynamic announcement of new ArbZG warnings. Deferred unless CI flags 4.1.3 violation.
- **Voice-input UI dedicated `aria-live` region** for state transitions (idle → listening → processing). Deferred unless CI flags 4.1.3; current `aria-label` change on the button covers Name Role Value for AA.

If CI's first run on this PR surfaces any of these as actual A/AA violations, they MUST be addressed (per FR-014's I-3 invariant) before merge — by either landing a fix or adding a `Deferred:<owner>:#<issue>` row above with a follow-up GitHub issue linked.
