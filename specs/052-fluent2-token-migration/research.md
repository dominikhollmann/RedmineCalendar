# Phase 0 Research: Token migration + enforcement

**Feature**: 052-fluent2-token-migration · **Date**: 2026-06-26

All four spec-level clarifications were resolved in `/speckit-clarify` (snap-to-nearest fidelity, spacing in scope, manual-walkthrough QA, minimum caption tokens). This document resolves the remaining _implementation_ unknowns.

---

## D1 — rem/em ↔ px reconciliation for the type scale

**Decision**: Treat the root font-size as the browser default **16px** (confirmed: no `html { font-size }` is set anywhere in `css/`). The type-scale tokens are defined in **px** (`--font-base-size: 14px` … `--font-display-size: 28px`). Component literals are mostly `rem`/`em`. Convert each literal to px at 16px root, then snap to the nearest token by px distance.

**Rationale**: Without a reconciliation rule the mapping is ambiguous (a `rem` literal and a `px` token can't be compared directly). 16px root is the actual rendering base, so px-distance snapping reflects what users see.

**Conversion of the observed literals** (16px root):

| Literal              | ≈ px        | Nearest token                     | Result                              |
| -------------------- | ----------- | --------------------------------- | ----------------------------------- |
| `0.65rem`            | 10.4        | caption-small (10)                | `--font-caption-small-size`         |
| `0.68rem`            | 10.9        | caption-small (10) / caption (12) | nearest, legibility-favored (≥10px) |
| `0.7rem`             | 11.2        | caption (12)                      | `--font-caption-size`               |
| `0.75rem`            | 12          | caption (12)                      | `--font-caption-size` (exact)       |
| `0.78rem`            | 12.5        | caption (12)                      | `--font-caption-size`               |
| `0.82rem`            | 13.1        | base (14)                         | `--font-base-size`                  |
| `0.85rem`            | 13.6        | base (14)                         | `--font-base-size`                  |
| `0.9rem` / `0.92rem` | 14.4 / 14.7 | base (14)                         | `--font-base-size`                  |
| `0.95rem`            | 15.2        | large (16)                        | `--font-large-size`                 |
| `1.1rem`             | 17.6        | large (16)                        | `--font-large-size`                 |
| `1.4rem`             | 22.4        | title (20)                        | `--font-title-size`                 |
| `1.75em`             | 28          | display (28)                      | `--font-display-size` (exact)       |

**Alternatives considered**: (a) keep micro-sizes as raw rem — rejected, defeats the feature. (b) Add a token per distinct literal — rejected, violates "minimum tokens" (FR-002) and YAGNI. (c) Snap everything ≤ base up to 14px — rejected, would visibly enlarge dense calendar chrome (the issue explicitly anticipates sub-base caption tokens).

---

## D2 — New caption-level type tokens (count = 2)

**Decision**: Add exactly **two** sub-base tokens, matching Fluent 2's lower ramp:

- `--font-caption-size: 12px;` / `--font-caption-line-height: 16px;` (Fluent "Caption1")
- `--font-caption-small-size: 10px;` / `--font-caption-small-line-height: 14px;` (Fluent "Caption2")

**Rationale**: The sub-base literals cluster into two bands — ~12px (badges, chips, secondary labels) and ~10–11px (dense calendar event meta). Two tokens cover both without lossy 14px snapping. Legibility floor: never map below 10px.

**Alternatives**: one token (12px only) → would force 10–11px dense chrome up to 12px, a visible enlargement of the calendar event meta; rejected. Three+ → unjustified granularity.

---

## D3 — New radius tokens (count = 2) + one snap

**Decision**:

- Add `--radius-circular: 9999px;` — for fully-rounded controls: the working-hours switch **track** (`10px`) and the feedback **pill button** (`2rem`). These are semantically pills, not 10px/32px corners.
- Add `--radius-xlarge: 12px;` — for the mobile bottom-sheet top corners (`12px 12px 0 0`); a distinct large-surface corner that 8px would visibly sharpen.
- Snap the two docs `3px` radii to the existing **`--radius-medium` (4px)** (1px delta, visually negligible).

**Rationale**: The pill/circular cases are a real recurring design intent (a switch track and a pill button) that no existing token expresses — adding `--radius-circular` is reuse-correct, not duplication. The 12px sheet corner is large enough that snapping to 8px is a noticeable 33% reduction, so a dedicated `--radius-xlarge` preserves fidelity. `3px` is equidistant between 2 and 4 → choose the softer 4px.

**Alternatives**: snap `10px`/`2rem`→`--radius-large` (8px) — rejected, a switch track and pill button read wrong when not fully rounded. Snap `12px`→8px — rejected on fidelity grounds.

---

## D4 — Extend the elevation ramp (add --shadow-16, --shadow-28)

**Decision**: Add two higher-elevation tokens to continue the Fluent ramp, with light + dark variants mirroring the existing `--shadow-2/4/8` opacity convention (14% light / 50% dark):

```css
/* light :root */
--shadow-16: 0 8px 16px rgb(0 0 0 / 14%);
--shadow-28: 0 14px 28px rgb(0 0 0 / 14%);
/* dark theme override */
--shadow-16: 0 8px 16px rgb(0 0 0 / 50%);
--shadow-28: 0 14px 28px rgb(0 0 0 / 50%);
```

**Mapping of observed modal/panel shadows** (color portions already use overlay tokens; only the blur/offset triples are migrated, snap-to-nearest):

| Literal blur/offset       | Maps to                 |
| ------------------------- | ----------------------- |
| `0 8px 32px` (deep modal) | `--shadow-28`           |
| `0 4px 12px` (panel)      | `--shadow-16`           |
| `0 2px 8px` (raised)      | `--shadow-8` (existing) |
| `0 2px 6px` (subtle)      | `--shadow-4` (existing) |

**Rationale**: The issue explicitly calls for `--shadow-16`/`--shadow-28` to complete the Fluent elevation ramp. Two new tokens absorb the two deepest literals; the two shallow ones snap to existing tokens.

**Note on color portions**: where a shadow currently combines an overlay-token color with a raw blur (e.g. `0 8px 32px var(--color-overlay-medium)`), the migration replaces the whole declaration with the token (`var(--shadow-28)`), accepting the token's fixed `rgb(0 0 0 / …)` color — confirmed visually equivalent in both themes during the walkthrough. Any case that genuinely needs the overlay color preserved uses the escape hatch.

---

## D5 — Transition-timing mapping

**Decision**: Map raw durations to `--duration-*` (100/200/300ms):

| Literal          | Maps to                                                               |
| ---------------- | --------------------------------------------------------------------- |
| `0.3s` / `300ms` | `--duration-slow`                                                     |
| `0.2s` / `200ms` | `--duration-normal`                                                   |
| `0.15s` / `0.1s` | `--duration-fast` (150ms ties resolved to fast for UI responsiveness) |

Easing, where present inline, uses the existing `--curve-decelerate-mid`. No new motion tokens.

**Rationale**: The motion scale already covers the observed range; only the shorthand `transition` declarations need a `var()` reference to satisfy the gate.

---

## D6 — Spacing mapping (onto existing `--space-*`)

Spacing is the **highest-volume and highest-friction** category (~60 use sites, mixed `rem` and `px` units, shorthands, and sub-scale micro-values). It splits into three bands:

**Band A — exact matches (most cases)**: the `--space-*` scale is `0.25 / 0.5 / 0.75 / 1 / 1.25 / 1.5 / 2 rem` (4/8/12/16/20/24/32px). The bulk of literals already equal a step exactly:

| Literal            | Token       |
| ------------------ | ----------- |
| `0.25rem` / `4px`  | `--space-1` |
| `0.5rem` / `8px`   | `--space-2` |
| `0.75rem` / `12px` | `--space-3` |
| `1rem` / `16px`    | `--space-4` |
| `1.25rem` / `20px` | `--space-5` |
| `1.5rem` / `24px`  | `--space-6` |
| `2rem` / `32px`    | `--space-8` |

**Band B — between-step values → snap to nearest** (small reviewed shift): `0.6rem`→`--space-2`, `0.45rem`/`0.4rem`→`--space-2`, `0.65rem`→`--space-3`, `0.3rem`→`--space-1`, `1.2rem`→`--space-5`, `6px 10px`→`--space-2 --space-3`, etc.

**Band C — sub-`--space-1` micro-padding (1–3px) in dense calendar chrome** (e.g. `padding: 2px 4px`, `1px 3px 0`, `margin-right: 3px`, `gap: 0.1rem`): these are **kept as documented escape-hatch exceptions**, _not_ snapped to 4px. Rationale: rounding a 1–2px dense event padding up to 4px visibly bloats the calendar grid (a real, not cosmetic, layout change) — exactly the "larger/surprising visual change is out of scope" case from FR-007. Adding a speculative `--space-0: 2px` token is rejected (YAGNI; it would invite more sub-scale drift). Each Band-C site gets `/* stylelint-disable-line scale-unlimited/declaration-strict-value */` with a "dense calendar chrome — sub-token by design" comment.

**Decision**: Band A = exact swap; Band B = snap-to-nearest `--space-*`; Band C = documented exception. Add **no** new spacing token. `0` and `auto` stay raw (gate-ignored). Shorthands become per-axis token tuples (e.g. `padding: var(--space-2) var(--space-3)`).

**Rationale**: Preserves dense-calendar fidelity (Constitution II) while tokenizing everything that can be tokenized without visible harm. The escape-hatch count for Band C is bounded (single-digit sites) and reviewer-visible.

---

## D7 — Enforcement rule configuration (`stylelint-declaration-strict-value`)

**Decision**: Add the `scale-unlimited/declaration-strict-value` rule to `.stylelintrc.json`:

```json
"scale-unlimited/declaration-strict-value": [
  ["font-size", "border-radius", "/^transition/", "box-shadow", "/^padding/", "/^margin/", "gap", "row-gap", "column-gap"],
  {
    "ignoreValues": ["0", "inherit", "initial", "unset", "none", "auto", "transparent", "currentColor", "50%", "100%", "fit-content", "max-content", "min-content"],
    "ignoreFunctions": ["calc", "clamp", "min", "max", "env", "color-mix"],
    "disableFix": true,
    "message": "Use a design token (var(--…)) for \"${property}\" instead of the literal \"${value}\""
  }
]
```

Property list uses regex (`/^padding/`, `/^margin/`, `/^transition/`) to catch longhands (`padding-top`, `transition-duration`, …). The plugin is registered in the `plugins` array.

**Rationale**: Mirrors the issue's sketch, extended with spacing per the clarification and with a richer `ignoreValues` set to avoid false positives on structural keywords. `ignoreFunctions` lets genuinely computed values (`calc(...)`) pass without a var. `disableFix: true` because there is no safe automatic literal→token substitution (the mapping is a design judgement) — fixes are manual.

**Shorthand nuance**: by default the rule passes a declaration if _any_ `var()` is present in its value, so `padding: var(--space-2) 12px` would slip through. We mitigate by (a) reviewing all shorthands during migration and (b) preferring per-axis tokens. We do **not** enable `expandShorthand` (its shorthand parsing is brittle for `transition`/`box-shadow`); the residual risk is acceptable and documented in the contract.

**Alternatives**: a custom regex-based stylelint rule — rejected (reinvents an existing MIT plugin, Constitution VII). `expandShorthand: true` — rejected (brittle on multi-layer `box-shadow`/`transition`).

---

## D8 — New dependency + OSS artifact regeneration

**Decision**: Add `stylelint-declaration-strict-value` to `devDependencies` only. After `npm install`, run `npm run oss:generate` to regenerate `sbom.json` + `attributions.json`, then confirm `npm run oss:drift` and `npm run oss:licenses` pass (the package is **MIT**, on the allowlist).

**Rationale**: Required by the project's SBoM/attribution policy (FR-014). Dev-only → it appears in the full-tree `sbom.json` but not the runtime `attributions.json` projection; `oss:generate` handles both deterministically.

---

## D9 — Escape-hatch convention

**Decision**: Genuine exceptions use the existing inline `/* stylelint-disable-line scale-unlimited/declaration-strict-value */` (or block `disable`/`enable`) annotation — the same pattern already used for the `:root` hex token block with `color-no-hex`. Each exception carries a one-line rationale comment adjacent to it.

**Rationale**: Reuses the established, reviewer-visible mechanism; no new convention to learn (Constitution VII). The central `:root` token block (which defines the literals by necessity) is covered by a block-level disable so definitions are never flagged while use sites are.

---

## Open questions

None. All NEEDS CLARIFICATION resolved; ready for Phase 1 design.
