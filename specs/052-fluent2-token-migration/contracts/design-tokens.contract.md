# Contract: Design-token API surface

**Feature**: 052-fluent2-token-migration

The CSS custom properties components may consume for the gated categories. Components MUST reference these and MUST NOT introduce raw literals (enforced by the strict-value gate).

## Type scale

| Token | Size | Line-height token |
|---|---|---|
| `--font-caption-small-size` *(new)* | 10px | `--font-caption-small-line-height` (14px) |
| `--font-caption-size` *(new)* | 12px | `--font-caption-line-height` (16px) |
| `--font-base-size` | 14px | `--font-base-line-height` (20px) |
| `--font-large-size` | 16px | `--font-large-line-height` (22px) |
| `--font-title-size` | 20px | `--font-title-line-height` (28px) |
| `--font-display-size` | 28px | `--font-display-line-height` (36px) |

## Radius scale

| Token | Value |
|---|---|
| `--radius-small` | 2px |
| `--radius-medium` | 4px |
| `--radius-large` | 8px |
| `--radius-xlarge` *(new)* | 12px |
| `--radius-circular` *(new)* | 9999px |

## Elevation ramp

| Token | Light | Dark |
|---|---|---|
| `--shadow-2` | `0 1px 2px /14%` | `/50%` |
| `--shadow-4` | `0 2px 4px /14%` | `/50%` |
| `--shadow-8` | `0 4px 8px /14%` | `/50%` |
| `--shadow-16` *(new)* | `0 8px 16px /14%` | `/50%` |
| `--shadow-28` *(new)* | `0 14px 28px /14%` | `/50%` |

## Motion

| Token | Value |
|---|---|
| `--duration-fast` | 100ms |
| `--duration-normal` | 200ms |
| `--duration-slow` | 300ms |
| `--curve-decelerate-mid` | `cubic-bezier(0.1, 0.9, 0.2, 1)` |

## Spacing rhythm

| Token | Value |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |

**Stability**: new tokens follow the existing naming/format convention; no existing token's value changes. Adding tokens is backward-compatible (purely additive).
