# Phase 0 — Research: Small UX & Accessibility Fixes

This document resolves the tooling / approach decisions enumerated in `plan.md` § Phase 0. Feature-level ambiguities were already resolved in `spec.md` § Clarifications and are not re-litigated here.

## Decisions

### R-1: axe integration mechanism — use `@axe-core/playwright`

- **Decision**: Add `@axe-core/playwright` as a dev dependency and use its `AxeBuilder` fluent API inside a single new Playwright test file `tests/ui/a11y.spec.js`.
- **Rationale**: `@axe-core/playwright` is the officially-supported adapter, maintained by Deque (axe-core's authors), and is the de-facto standard for WCAG regression testing in Playwright pipelines. It exposes `analyze()` returning a structured violations array that maps directly to WCAG criterion IDs, which is exactly what FR-015a's CI gate needs. The adapter is small (a thin Playwright fixture around axe-core); SQI module-size and cyclomatic-complexity gates are not at risk.
- **Alternatives considered**:
  - **Roll our own fixture** — calling `axe-core/dist/axe.min.js` via `page.addScriptTag` and `page.evaluate`. Rejected: this is what the adapter already does, and writing it ourselves accepts maintenance cost for zero benefit. Constitution IV ("Simplicity & YAGNI") flags this.
  - **Pa11y or Lighthouse CI** — both run extra browser instances and have different rule sets; they would duplicate Playwright's existing browser context for no rule-coverage gain. Rejected for cost (build minutes) and divergence (different reported rule IDs).
  - **axe-core via Vitest + jsdom** — jsdom does not implement layout, contrast, or focus-order checks; many WCAG criteria are unverifiable. Rejected for coverage gap.

### R-2: ArbZG cfg propagation — pass cfg to `computeArbzgWarnings`, filter inside

- **Decision**: Extend the signature from `computeArbzgWarnings(entries, year)` to `computeArbzgWarnings(entries, year, cfg)`. Inside the function, before the existing `filtered = entries.filter(e => !e._isMidnightContinuation)` line, add a second filter step that drops every entry whose `issueId` matches `cfg.holidayTicket` or `cfg.vacationTicket` (when those are positive integers). Both filters run on the same `filtered` array — exempt entries become invisible to all six downstream category checks (`daily`, `weekly`, `restPeriod`, `sunday`, `holiday`, `breaks`) uniformly. The cfg object is `{ holidayTicket: number|null, vacationTicket: number|null }`; both fields are optional and behave inertly when absent/null/zero/not-a-positive-integer (FR-008).
- **Rationale**: Centralising the filter inside `computeArbzgWarnings` guarantees FR-007 (every category sees the filtered set) by construction — there is no way for a future category check to forget to apply the filter. The alternative (filter at the call site) leaves the rule engine accepting raw input and trusts every caller to filter correctly; this is a recipe for the same correctness regression we are fixing. Pure-logic module; fully testable with Vitest; no DOM coupling introduced.
- **Alternatives considered**:
  - **Filter at the call site in `calendar.js`** — would also pass FR-005/006/007 today, but couples the rule engine's correctness to caller discipline and bakes a precondition into every future call site. Constitutionally weaker.
  - **Add a per-rule check inside each category** — N rules × adding the same `if (cfg.holidayTicket === e.issueId) continue` line is N opportunities to miss a future rule. Rejected for fragility.
  - **Annotate entries upstream with `e._isExemptArbZG = true` then filter on that** — adds an out-of-band field to entries used only by ArbZG; same risk as the call-site filter, plus pollutes the entry shape. Rejected.

### R-3: Dialog pattern for chatbot and docs panels — `role="dialog"` with `aria-modal="true"`

- **Decision**: Convert both the chatbot panel and the in-app docs panel to the **modal dialog** ARIA pattern: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` referencing the panel's heading, focus moved to the first meaningful control on open, full Tab focus trap while open, and focus restored to the triggering element on close. The time-entry modal already needs these attributes (Story 1 + Story 4 acceptance scenarios 3) and gains the same treatment.
- **Rationale**: All three surfaces overlay the main content and demand user attention before the user can return to the calendar — that is the WCAG/WAI-ARIA definition of a modal dialog. Treating them as dialogs unlocks the most-tested screen-reader and keyboard-navigation patterns; treating them as plain landmarks (e.g., `complementary`) requires users to navigate _out_ of the panel with arbitrary keystrokes and confuses assistive tech. The voice-input UI is a smaller affordance inside a panel — it gets an `aria-live` region for state updates, not a separate dialog role (see R-5).
- **Alternatives considered**:
  - **`role="complementary"` (sidebar pattern)** — works for non-blocking side-panels, but our chatbot and docs panels capture focus and dim the main content. Mismatching the pattern misleads assistive-tech users. Rejected.
  - **`role="region"` with `aria-label`** — passes axe but breaks the user expectation that pressing Escape closes a focused overlay. Rejected.
  - **`inert` attribute on the main content while panel is open** — orthogonal; we still use this complementarily (set `inert` on `#calendar` while the dialog is open) but it does not replace the dialog role.

### R-4: Audit-report schema — one Markdown file, one section per surface, with a flat finding table per surface

- **Decision**: The `a11y-audit.md` artefact has the structure:

  ```markdown
  # Accessibility Audit — Feature 033 (WCAG 2.2 Level AA)

  ## Summary

  | Surface       | Findings | Fixed | Deferred | N/A |
  | ------------- | -------- | ----- | -------- | --- |
  | …per surface… |

  ## Calendar (desktop)

  | #      | WCAG criterion | Severity | Finding | Triage | Notes |
  | ------ | -------------- | -------- | ------- | ------ | ----- |
  | …rows… |

  ## Calendar (mobile day-view)

  ## Time-entry modal (open)

  ## Settings

  ## Chatbot panel (open)

  ## In-app docs panel (open)

  ## Voice-input UI
  ```

  Each finding row has WCAG criterion (e.g., `1.3.1 Info and Relationships`), severity (`A` or `AA`), short finding text, triage (`Fixed` / `Deferred:<owner>:<follow-up #>` / `N/A:<reason>`), and free-form notes.

- **Rationale**: A flat per-surface table is the cheapest schema that satisfies FR-014's per-finding triage requirement and is the natural input shape for both `npm run test:ui` (axe outputs are per-surface) and a human reviewer (who reads surface by surface). The Summary table at the top is the executive view; the per-surface tables drive remediation work.
- **Alternatives considered**:
  - **Single flat table covering all surfaces** — loses surface grouping; mixing chatbot + calendar findings in one table makes triage harder. Rejected.
  - **One file per surface in `a11y-audit/`** — adds directory cruft for ~7 small files; the project convention is per-feature single-file Markdown artefacts. Rejected.
  - **JSON output** — the audit is consumed by humans during review; Markdown wins for readability. The axe scan's raw JSON is captured automatically in CI logs already.

### R-5: Focus-restoration & live-region mechanisms — explicit opener tracking + a single `aria-live="polite"` region per dynamic surface

- **Decision**:
  - **Focus restoration**: each dialog (time-entry modal, chatbot panel, docs panel) records the element that triggered its opening in a module-level variable; on close, that element receives `.focus()` synchronously. If the recorded element is no longer in the DOM (rare — e.g., the calendar redrew), focus falls back to `document.body`.
  - **Live regions**: dynamic content gets _one_ `aria-live="polite"` region per surface — not per item. The voice-input UI has its own (state transitions: idle → listening → processing → idle, plus transcript snapshot updates). The chatbot panel has its own (used during streaming responses, tuned to `polite` so it does not interrupt; updates are batched per sentence, not per token, to avoid screen-reader chatter). The calendar uses its existing anomaly-tag rendering location; we add `aria-live="polite"` to the wrapper and ensure ArbZG warning text changes trigger an update.
  - **Streaming chatbot**: aria-live updates are flushed at sentence boundaries (period, question mark, exclamation mark followed by whitespace), not per-token, to avoid making screen readers unusable per the Edge-case note in the spec.
- **Rationale**: Manual opener-tracking is the only reliable way to get focus back to the right element — browsers do not natively restore focus across DOM mutations. Sentence-boundary batching for the chatbot live region is a well-documented pattern that balances "user knows the response is happening" against "screen reader is unusable". Single live region per surface keeps the announce-target stable for assistive tech (multiple competing live regions on one surface cause unpredictable announcement order).
- **Alternatives considered**:
  - **Rely on browser default focus return** — fails whenever the opener is repainted or removed (FullCalendar redraws frequently). Rejected.
  - **Announce every chatbot token via `aria-live`** — verified in user testing (industry consensus) to be unusable with screen readers. Rejected.
  - **Use `aria-live="assertive"`** — interrupts user reading and creates a hostile experience for routine updates; reserved for emergency/error states only. Rejected.

## Open follow-ups deferred to implementation phase

These were considered during Phase 0 but their resolution requires running the audit; they are not blockers for `/speckit-plan` → `/speckit-tasks`:

- **F-1**: Exact contrast failures in the Fluent 2 token layer (feature 031). Whether any default token pair fails AA contrast can only be determined by running axe. Per the spec's edge-case note, fixes land in the token layer (not per-component overrides).
- **F-2**: Whether the voice-input UI's `aria-live` region needs `aria-busy` toggling during processing. Decide during implementation after observing screen-reader behaviour empirically.
- **F-3**: Whether the in-app docs panel's Markdown-rendered headings need explicit `aria-level` adjustments (depends on what `js/docs.js` outputs).
- **F-4**: Whether to add an Escape-key handler to the chatbot and docs panels (the time-entry modal already has one). Strong implementation default: yes — consistent with the dialog ARIA pattern — but we wait for the audit to confirm the existing behaviour.

Each of these turns into a follow-up task during `/speckit-tasks` rather than blocking Phase 1.
