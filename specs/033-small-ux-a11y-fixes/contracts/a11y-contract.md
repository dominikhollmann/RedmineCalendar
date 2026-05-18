# UI Contracts — Accessibility & Dialog Pattern

This feature has no HTTP / REST contracts. It introduces two UI contracts that bind the implementation and the regression tests.

---

## Contract 1: Modal Dialog ARIA Pattern

Every "modal-like" overlay in the application — currently three: **time-entry modal**, **chatbot panel** (when open), **in-app docs panel** (when open) — MUST satisfy every clause below. Test `tests/ui/a11y.spec.js` enforces clauses C1.1–C1.5; clauses C1.6–C1.8 are enforced by axe-core rule IDs as noted.

### C1.1 — Roles & names

- The overlay root element MUST carry `role="dialog"` and `aria-modal="true"`.
- The overlay MUST have an accessible name via one of:
  - `aria-labelledby="<id>"` pointing to a visible heading element inside the overlay (preferred), or
  - `aria-label="<localised string>"` when no visible heading exists.
- Axe rule covering this: `aria-dialog-name`.

### C1.2 — Focus management on open

- When the overlay opens, focus MUST be moved into the overlay within the same task tick (before any animation).
- The initial focus target MUST be a meaningful interactive control — preferably the primary input (e.g., the issue-search box in the time-entry modal, the chat composer in the chatbot panel). It MUST NOT be the close (X) button (that is a back-out, not a meaningful entry point).
- The element that triggered the overlay (the _opener_) MUST be recorded at open time so it can be focused on close.

### C1.3 — Focus trap while open

- While the overlay is open, Tab and Shift-Tab MUST cycle focus only among the focusable descendants of the overlay root.
- Focus MUST NOT escape to elements outside the overlay (calendar, header, anywhere else in the body).
- This is the **only** clause that distinguishes a modal dialog from a non-modal landmark; getting it wrong is a Level A failure (WCAG 2.1.2 No Keyboard Trap and 2.4.3 Focus Order).

### C1.4 — Dismiss paths

- **Escape** key — closes the overlay. (For the time-entry modal: this is preserved by Story 1's FR-002 explicitly.)
- **Close (X) button** — closes the overlay.
- **Cancel button** (where present) — closes the overlay.
- **Outside / backdrop click** — Story 1 (FR-001) forbids this for the time-entry modal. For chatbot and docs panels, Story 4's research R-3 establishes the dialog pattern; outside-click handling is implementation-defined per panel but MUST NOT be the _only_ dismiss path. Whatever each panel chooses, it MUST consistently move focus back to the opener (C1.5).

### C1.5 — Focus restoration on close

- On any dismiss path, focus MUST return synchronously to the recorded opener element.
- If the opener is no longer in the DOM (e.g., the calendar redrew), focus MUST fall back to `document.body`.
- Visible focus indicator MUST be present on the restored element (verified by C2.4 below).

### C1.6 — Background inertness

- While the overlay is open, the main content underneath (e.g., `#calendar`) SHOULD have the `inert` attribute applied, OR each focusable element underneath MUST be made unfocusable some other way.
- This is complementary to C1.3 (focus trap) — the trap stops Tab from escaping; `inert` stops other interactions (clicks, screen-reader virtual cursor) from reaching the inert subtree.

### C1.7 — Visible focus indicator

- Every focusable element inside the overlay MUST show a focus indicator with contrast ratio ≥ 3:1 against its adjacent background in both light and dark themes (WCAG 2.4.7 + 2.4.11 Focus Not Obscured + 2.4.13 Focus Appearance).
- Indicator MUST NOT be solely a colour change — at least one of: outline width change, outline style change, or a non-colour visual change.

### C1.8 — Drag-from-inside-to-outside (FR-003)

- A mousedown that originates **inside** the overlay's content box and a mouseup that lands **outside** it (e.g., a text-selection drag that overshoots) MUST NOT be treated as an outside-click. This is verified for the time-entry modal specifically; it applies to other dialogs if they implement any outside-click dismissal at all.

---

## Contract 2: axe-core CI Scan Surface Matrix

Test `tests/ui/a11y.spec.js` MUST iterate over the full Cartesian product below and assert zero violations per cell. **14 cells total.** A future change that causes any cell to report a Level A or Level AA violation fails CI.

| #   | Surface                    | Path / state                                                | Theme |
| --- | -------------------------- | ----------------------------------------------------------- | ----- |
| 1   | Calendar — desktop         | `index.html`                                                | light |
| 2   | Calendar — desktop         | `index.html`                                                | dark  |
| 3   | Calendar — mobile day-view | `index.html`, mobile viewport (≤ 768 px), day-view selected | light |
| 4   | Calendar — mobile day-view | same                                                        | dark  |
| 5   | Time-entry modal (open)    | `index.html` → click an empty calendar slot → modal opens   | light |
| 6   | Time-entry modal (open)    | same                                                        | dark  |
| 7   | Settings                   | `settings.html`                                             | light |
| 8   | Settings                   | `settings.html`                                             | dark  |
| 9   | Chatbot panel (open)       | `index.html` → open chatbot panel                           | light |
| 10  | Chatbot panel (open)       | same                                                        | dark  |
| 11  | In-app docs panel (open)   | `index.html` → click `?` (docs help button)                 | light |
| 12  | In-app docs panel (open)   | same                                                        | dark  |
| 13  | Voice-input UI             | `index.html` → open chatbot panel → activate voice input    | light |
| 14  | Voice-input UI             | same                                                        | dark  |

### Axe configuration applied to every cell

- `withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'])` — scope to A + AA across WCAG 2.0, 2.1, and 2.2 (we target 2.2 AA per Clarification C2; including the lower-version tags catches strict subsets that 2.2 inherits).
- Rules NOT disabled. (Disabling a rule to make CI green is a constitutional anti-pattern per Principle VI.)
- One axe analyse call per cell; assert `results.violations` is an empty array.

### Acceptance failure mode

When CI fails, the test MUST emit a structured table (cell number, surface, theme, rule ID, target selector, help URL) so a reviewer can triage from CI logs without re-running locally. axe's default reporter produces this — preserve it; do not summarise.

---

## How these contracts interact

- Contract 1 is the **specification** every dialog MUST meet.
- Contract 2 is the **verification** that runs in CI.
- A failure in Contract 2 indicates either (a) the implementation diverged from Contract 1, or (b) a regression in unrelated code (e.g., a new icon added without `aria-hidden`).
- Both are stable across the feature lifetime: future features may _add_ surfaces to Contract 2 but MUST NOT remove any, and MUST NOT lower the rule set.
