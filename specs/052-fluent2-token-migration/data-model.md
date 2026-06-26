# Phase 1 Data Model: Tokens & mapping

**Feature**: 052-fluent2-token-migration · **Date**: 2026-06-26

The "data" here is the design-token vocabulary and the deterministic literal→token mapping rules that drive the migration. No runtime entities, no storage.

## 1. New tokens to add (in `css/base.css` `:root`)

| Token | Value (light) | Value (dark) | Companion | Purpose |
|---|---|---|---|---|
| `--font-caption-size` | `12px` | — | `--font-caption-line-height: 16px` | Caption1 — badges, chips, secondary labels (~12px band) |
| `--font-caption-small-size` | `10px` | — | `--font-caption-small-line-height: 14px` | Caption2 — dense calendar event meta (~10–11px band) |
| `--radius-circular` | `9999px` | — | — | Fully-rounded controls (switch track, pill button) |
| `--radius-xlarge` | `12px` | — | — | Large-surface corner (mobile bottom-sheet top) |
| `--shadow-16` | `0 8px 16px rgb(0 0 0 / 14%)` | `0 8px 16px rgb(0 0 0 / 50%)` | — | Elevation 16 (panels) |
| `--shadow-28` | `0 14px 28px rgb(0 0 0 / 14%)` | `0 14px 28px rgb(0 0 0 / 50%)` | — | Elevation 28 (modals/sheets) |

Font/radius tokens are theme-invariant (single definition). Shadow tokens get a dark-theme override alongside the existing `--shadow-2/4/8` overrides. All new token lines live inside the existing `:root` block that is already `color-no-hex`-disabled, and will likewise be inside the strict-value `disable` region (see contract).

## 2. Type-scale mapping (px @ 16px root → token)

Reconcile each literal to px, snap to nearest by px distance, never below 10px.

| px range | Token |
|---|---|
| ≤ 11 | `--font-caption-small-size` (10px) |
| 11.1 – 13 | `--font-caption-size` (12px) |
| 13.1 – 15 | `--font-base-size` (14px) |
| 15.1 – 18 | `--font-large-size` (16px) |
| 18.1 – 24 | `--font-title-size` (20px) |
| > 24 | `--font-display-size` (28px) |

Worked examples (covers every observed literal): `0.65/0.68rem`→caption-small; `0.7/0.72/0.73/0.75/0.76/0.78rem`→caption; `0.8/0.82/0.83/0.84/0.85/0.88/0.9/0.92rem`→base; `0.95/1rem/1.1rem`→large; `1.2/1.3/1.4rem`→title; `1.75em`→display. Each `font-size` declaration also gets its matching `line-height` token where the element sets one.

## 3. Radius mapping

| Literal | Token |
|---|---|
| `3px` (docs ×2) | `--radius-medium` |
| `10px` (switch track) | `--radius-circular` |
| `2rem` (pill button) | `--radius-circular` |
| `12px 12px 0 0` (sheet) | `var(--radius-xlarge) var(--radius-xlarge) 0 0` |

## 4. Elevation mapping

Color portion already uses overlay tokens; replace the whole declaration with the elevation token (its fixed `rgb(0 0 0 / …)` color is verified equivalent in both themes during the walkthrough; preserve the overlay color via escape hatch only if a specific case demands it).

| Literal (blur/offset) | Sites | Token |
|---|---|---|
| `0 8px 32px …` | time-entry.css:19,130,161; feedback.css:31 | `--shadow-28` |
| `0 4px 12px …` | planning-view.css:45 | `--shadow-16` |
| `-4px 0 16px …` (docs side panel) | docs.css:36,206 | `--shadow-16` (horizontal panel; offset-direction acceptable) |
| `0 2px 8px …` | calendar-overlays.css:51 | `--shadow-8` |
| `0 2px 6px …` | calendar-overlays.css:97 | `--shadow-4` |
| `0 0 0 2px …` / `0 0 0 6px …` (focus rings) | time-entry.css:235,527,532; docs.css:446 | **Exception** — focus-ring outlines, not elevation; escape-hatch with rationale (these encode a ring width, not a shadow level) |

## 5. Transition mapping

| Literal | Token |
|---|---|
| `0.3s` / `300ms` | `--duration-slow` |
| `0.2s` / `200ms` | `--duration-normal` |
| `0.1s`–`0.15s` | `--duration-fast` |

Easing inline → `--curve-decelerate-mid`.

## 6. Spacing mapping

See research D6. Band A exact swap (`0.25/0.5/0.75/1/1.25/1.5/2rem` and `4/8/12/16/20/24/32px` → `--space-1..8`); Band B snap-to-nearest; Band C (1–3px dense calendar micro-padding, `gap: 0.1rem`) → documented escape-hatch exception (no `--space-0` token added).

## 7. Validation rules (invariants the migration must hold)

- **INV-1**: No `font-size`, `border-radius`, `box-shadow`, `transition*`, `padding*`, `margin*`, or `*gap` declaration at a use site contains a raw literal unless it carries an inline strict-value disable + rationale comment.
- **INV-2**: Every newly added token defines a dark-theme value where the category is theme-variant (shadows) and a single value where it is not (font/radius).
- **INV-3**: The `:root` token-definition blocks (light + dark) are exempt from the gate via block-level disable; nowhere else uses a block-level disable.
- **INV-4**: Rendered output is visually equivalent to pre-migration within the snap tolerance, confirmed by the quickstart walkthrough across 7 surfaces × 2 themes × calendar density levels.
- **INV-5**: `npm run lint`, `npm run oss:drift`, `npm run oss:licenses`, `npm run sqi:json`, and `npm run test:ui` all pass at completion.
