# Feature Specification: Route typography, radii, and modal elevation through design tokens

**Feature Branch**: `052-fluent2-token-migration`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User description: "GitHub issue #271 — Fluent 2: route typography, off-scale radii, and modal elevation through design tokens"

## Clarifications

### Session 2026-06-26

- Q: How faithful must the migration be when a bespoke value doesn't exactly match a token? → A: Snap to nearest token, allowing small reviewed visual shifts (exact-swap where a token already equals the value; favor scale integrity / fewer tokens).
- Q: Which CSS property categories must the enforcement gate cover (and be cleaned up)? → A: font-size, border-radius, box-shadow, transition-timing, AND spacing (padding / margin / gap) — the widest set, using the existing `--space-*` scale for spacing.
- Q: How is "no unintended visual change" verified for acceptance? → A: Manual reviewer walkthrough across every surface in light/dark themes and calendar density levels; no new visual-regression tooling (existing UI/a11y suite still guards behavior).
- Q: How many sub-base caption-level type tokens to add for dense chrome? → A: The minimum the audit shows is genuinely needed (likely 1–2), named per the Fluent 2 convention; exact count finalized during `/speckit-plan`.

## User Scenarios & Testing _(mandatory)_

This is a visual-consistency and quality-hardening feature: a follow-up from the #267 Fluent 2 consistency audit. The user-visible value is a coherent, predictable visual system (text sizes, corner roundings, and elevation that all stay on one design scale), plus a guardrail that stops the visual system from drifting again. The "users" served are both the people viewing the app (consistency) and the maintainers (a single place to tune the look, and a build that refuses silent regressions).

### User Story 1 - Text sizes follow one consistent type scale (Priority: P1)

Across the calendar, time-entry forms, docs panel, settings, and overlays, every text element should draw its size from the shared Fluent 2 type scale rather than a one-off value, so that headings, body text, labels, and dense-chrome captions look consistent and can be retuned in one place.

**Why this priority**: Typography is the largest source of drift (dozens of bespoke sizes) and the most visible. Bringing it onto the scale delivers the bulk of the consistency value and is the precondition for the enforcement gate (Story 4).

**Independent Test**: Can be fully tested by reviewing every surface in both light and dark themes and at each calendar density level, confirming text sizes are visually consistent with the type scale and that no surface regressed in legibility — independent of the radius and elevation work.

**Acceptance Scenarios**:

1. **Given** a component currently using a bespoke text size that matches an existing type-scale step, **When** the migration is applied, **Then** the element draws its size from the corresponding type-scale token and looks unchanged.
2. **Given** a dense calendar-chrome element whose size sits below the smallest existing type-scale step, **When** the migration is applied, **Then** the element draws from a documented caption-level token rather than a raw value, and the rendered size stays within an agreed visual tolerance of the original.
3. **Given** the full app after migration, **When** a reviewer inspects each surface in light and dark themes, **Then** no text element has visibly changed in a way that harms legibility or layout.

---

### User Story 2 - Corner roundings come from the radius scale (Priority: P2)

Every rounded corner should use a radius token (or a documented, intentional exception) instead of an off-scale literal, so corner treatments stay consistent and adjustable from one place.

**Why this priority**: Fewer offenders than typography and lower visual impact, but still part of a coherent Fluent 2 surface. Independent of the typography slice.

**Independent Test**: Can be tested by inspecting each previously off-scale corner (e.g. the working-hours switch track and the docs surfaces) and confirming it now uses a token and looks correct.

**Acceptance Scenarios**:

1. **Given** an off-scale radius that is close to an existing token, **When** the migration is applied, **Then** the element uses the nearest existing radius token and the corner looks visually equivalent.
2. **Given** an off-scale radius that represents a distinct design intent not covered by the existing tokens (e.g. a pill / fully-rounded track), **When** the migration is applied, **Then** a new appropriately-named radius token is introduced and used, rather than keeping a raw literal.

---

### User Story 3 - Modal and panel elevation comes from the shadow scale (Priority: P2)

Modals, panels, and other raised surfaces should express their drop shadows through elevation tokens that follow the Fluent 2 elevation ramp, so raised surfaces read as a consistent set of elevation levels.

**Why this priority**: Smallest set of offenders, but completes the "everything on a scale" goal and is required before the enforcement gate can cover `box-shadow`.

**Independent Test**: Can be tested by opening each modal/panel in both themes and confirming the elevation reads correctly and is driven by a shadow token.

**Acceptance Scenarios**:

1. **Given** a raised surface whose shadow matches an existing elevation token, **When** the migration is applied, **Then** it uses that token.
2. **Given** a modal whose shadow is higher than any existing elevation token (a deep, large-blur shadow), **When** the migration is applied, **Then** a higher-elevation token is added to the ramp and the modal uses it, rather than keeping a raw multi-value literal.
3. **Given** both light and dark themes, **When** a raised surface is shown, **Then** its elevation is theme-appropriate (the elevation tokens already carry per-theme values).

---

### User Story 4 - Spacing comes from the spacing scale (Priority: P3)

Padding, margin, and gap values should draw from the existing `--space-*` spacing scale (or a documented exception) instead of raw lengths, so layout rhythm stays consistent and adjustable from one place.

**Why this priority**: Added to scope per clarification (the gate is to cover spacing too). A bounded set of offenders that, like radius and elevation, completes the "everything on a scale" goal and is a precondition for the gate to cover spacing properties.

**Independent Test**: Can be tested by inspecting each previously raw padding/margin/gap and confirming it now references a spacing token and that layout spacing looks unchanged.

**Acceptance Scenarios**:

1. **Given** a raw spacing value that matches an existing `--space-*` step, **When** the migration is applied, **Then** it references that token and the layout is visually unchanged.
2. **Given** a raw spacing value that falls between steps, **When** the migration is applied, **Then** it snaps to the nearest step (small reviewed shift acceptable) or, if a recurring distinct need is shown, a new spacing step is added per the existing scale convention.

---

### User Story 5 - Future raw literals fail the build (Priority: P1)

When a contributor adds a new text size, corner radius, transition timing, drop shadow, or spacing value (padding / margin / gap) as a raw literal instead of a token, the build must fail with a clear message, the same way raw colors already fail today — so the visual system cannot silently drift again.

**Why this priority**: This is the durable outcome that keeps the cleanup stories (1–4) from regressing. It is coupled to them: turning the gate on before the cleanup would immediately break the build, so the gate and the cleanup must ship together.

**Independent Test**: Can be tested by introducing a raw literal for each gated property and confirming the linting step fails, then reverting and confirming it passes; and by confirming a legitimate, annotated exception passes.

**Acceptance Scenarios**:

1. **Given** the cleanup of Stories 1–4 is complete, **When** the enforcement gate is enabled, **Then** the existing lint/CI run passes with no outstanding raw-literal violations.
2. **Given** the gate is enabled, **When** a contributor adds a raw `font-size`, `border-radius`, transition-timing, `box-shadow`, or spacing (`padding`/`margin`/`gap`) value, **Then** the lint step fails and names the offending declaration.
3. **Given** a genuinely exceptional value that should not be tokenized, **When** the author marks it with the existing inline escape-hatch annotation, **Then** the lint step passes for that line.
4. **Given** the standard zero / structural keyword values (e.g. `0`, `inherit`, `none`, `50%`, `100%`) and computed expressions, **When** the gate runs, **Then** those are allowed without annotation.

### Edge Cases

- A bespoke size sits exactly between two type-scale steps — the migration must choose a step (nearest, with legibility favored) and the choice is captured so reviewers can sanity-check it.
- A literal genuinely cannot or should not be tokenized (e.g. a structural value, a third-party-driven value, or a deliberate one-off) — it must be handled via a documented inline exception, not silently left raw.
- The central token-definition block itself contains raw literals by necessity — the gate must not flag the token definitions while still flagging their use sites.
- A value that looks raw but is structurally required (e.g. `0`, percentages for centering) must remain allowed so the gate does not produce noise.
- Theme switching (light ↔ dark) must keep elevation and typography correct after migration, since some tokens carry different per-theme values.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: All component text-size declarations across every UI surface (calendar, calendar overlays, docs, time-entry, settings, feedback, planning view, and any other component stylesheet) MUST resolve their size from a shared type-scale token or carry a documented inline exception — no bespoke raw text-size literals may remain at use sites.
- **FR-002**: Where dense UI chrome legitimately needs a text size below the smallest existing type-scale step, the system MUST provide one or more documented caption-level type tokens rather than leaving raw values, keeping the number of new tokens to the minimum needed.
- **FR-003**: Every corner-rounding declaration MUST resolve from a radius token or carry a documented inline exception; off-scale radii MUST either be snapped to the nearest existing token (when visually equivalent) or be covered by a newly added, appropriately-named radius token (when they represent a distinct design intent).
- **FR-004**: Every drop-shadow on a raised surface MUST resolve from an elevation token or carry a documented inline exception; shadows deeper than the existing elevation ramp MUST be covered by newly added higher-elevation tokens that extend the ramp consistently.
- **FR-005**: Every spacing declaration (padding / margin / gap) MUST resolve from the existing `--space-*` spacing scale or carry a documented inline exception; values that fall between steps MUST snap to the nearest step (per the fidelity rule in FR-007) unless a recurring distinct need justifies extending the scale per its existing convention.
- **FR-006**: Newly introduced tokens MUST define theme-appropriate values consistent with the existing per-theme token convention (so light and dark themes both render correctly).
- **FR-007**: The migration MUST preserve the existing visual appearance, applying exact-match swaps where a token already equals the current value and snapping non-matching values to the nearest token; the resulting small visual shifts are acceptable only when confirmed by review, and any larger or surprising visual change is out of scope and MUST be flagged rather than introduced silently.
- **FR-008**: The build MUST fail when a raw literal is used for any gated property — text size, corner radius, transition timing, drop shadow, and spacing (padding / margin / gap) — anywhere outside the central token-definition block, reusing the same enforcement mechanism and developer experience already used for colors.
- **FR-009**: The enforcement gate MUST allow standard structural / zero / keyword values and computed expressions without requiring annotation, to avoid false positives.
- **FR-010**: The enforcement gate MUST provide an inline escape-hatch annotation, consistent with the existing pattern, so genuinely exceptional values can be permitted explicitly and visibly.
- **FR-011**: The enforcement gate MUST be enabled in the same change set as the Stories 1–4 cleanup, such that the build is green at completion (the gate is never enabled while violations remain).
- **FR-012**: Every retained exception (annotated raw literal) MUST be intentional and reviewable — the rationale discoverable at or near the exception.
- **FR-013**: Acceptance of "no unintended visual change" MUST be established by a manual reviewer walkthrough covering every UI surface in both light and dark themes and across calendar density levels; no new automated visual-regression tooling is required, and the existing UI/accessibility suite continues to guard behavioral regressions.
- **FR-014**: Any new tooling dependency introduced to power the gate MUST be reflected in the project's dependency manifest and its generated open-source inventory/attribution artifacts, and MUST pass the existing license-allowlist gate.
- **FR-015**: User-facing documentation MUST be reviewed and updated only if the change alters user-visible behavior; a purely visual-consistency migration with no behavioral change may record that no documentation update is required.

### Key Entities _(include if feature involves data)_

- **Design token**: A named, centrally-defined visual value (text size, corner radius, elevation/shadow, spacing, plus existing color/transition tokens). Has a single definition point, optional per-theme variants, and many use sites. New tokens introduced here: caption-level type size(s) (minimum needed, count finalized in planning), optional additional radius (e.g. pill), higher-elevation shadow steps, and — only if a recurring need is shown — an additional spacing step.
- **Token use site**: A component-level style declaration that should reference a token rather than a raw value. The migration converts use sites; the gate protects them going forward.
- **Documented exception**: A use site that intentionally keeps a raw value, marked with the standard inline annotation and a discoverable rationale.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of text-size, corner-radius, drop-shadow, transition-timing, and spacing (padding/margin/gap) declarations at component use sites either reference a design token or are covered by a documented inline exception (zero un-annotated raw literals remain).
- **SC-002**: Introducing a new raw literal for any gated property (text size, radius, transition timing, shadow, spacing) causes the linting/CI step to fail; removing it makes the step pass — demonstrated for each gated property category.
- **SC-003**: The number of newly introduced tokens is minimal and justified — each new token maps to a real, recurring design need that the existing scale did not cover.
- **SC-004**: A manual reviewer walkthrough comparing every surface before and after, in both light and dark themes and across calendar density levels, finds no unintended visual change to text, corners, elevation, or spacing.
- **SC-005**: The full existing quality pipeline (lint, formatting, the open-source inventory/drift and license gates, and the UI checks) passes at completion with the new gate active.
- **SC-006**: A maintainer can change the visual treatment of a category (e.g. bump caption size or modal elevation) by editing a single token definition and see it apply everywhere that uses it.

## Assumptions

- **Visual fidelity** (clarified): The intent is to preserve the current look. Where a bespoke value matches a token it is swapped exactly; where it does not, it is snapped to the nearest token (legibility favored for type), accepting small reviewed visual shifts in favor of scale integrity / fewer new tokens. Large or surprising visual changes are out of scope and must be flagged.
- **New tokens are expected**: Based on the audit, a minimal set of caption-level type token(s) (for sub-base dense chrome — likely 1–2, finalized in planning), at least one additional radius token (e.g. a pill/fully-rounded track), and one or more higher-elevation shadow tokens are anticipated; an extra spacing step only if a recurring need is shown. The principle is "minimum new tokens needed, named to fit the existing convention."
- **Enforcement mechanism**: The same class of styling-lint enforcement already used for colors is extended to the additional property categories, integrated into the existing lint CI step, with the same inline escape-hatch convention. A new dev-only dependency to power this is accepted per the issue.
- **Coupling / sequencing**: Cleanup and gate-enable land together so CI is never left red. This is a hard constraint, not a preference.
- **Scope boundary** (clarified): This feature covers tokenization + enforcement for typography, radius, elevation, transition-timing, and spacing (padding/margin/gap, onto the existing `--space-*` scale). Colors are already enforced and out of scope. Acceptance is verified by manual reviewer walkthrough — no new automated visual-regression tooling is introduced.
- **No behavioral change**: This is a styling/quality change with no change to data handled, stored, or transmitted, so no privacy/data-inventory impact is expected; the standard impact check is still run.
- **Existing structure reused**: The work edits existing component stylesheets and the central token block; it introduces no new application modules and reuses the existing CI gates and generated open-source inventory tooling.
