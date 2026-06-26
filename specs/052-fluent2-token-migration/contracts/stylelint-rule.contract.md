# Contract: Enforcement gate (`stylelint-declaration-strict-value`)

**Feature**: 052-fluent2-token-migration

This is the durable interface the feature adds: a lint rule that defines which CSS properties must reference a design token. It lives in `.stylelintrc.json` and runs inside `npm run lint` (CI gate).

## Plugin registration

`package.json` devDependency: `stylelint-declaration-strict-value` (MIT). Registered in `.stylelintrc.json`:

```json
{
  "plugins": ["stylelint-declaration-strict-value"]
}
```

## Rule configuration

```json
"scale-unlimited/declaration-strict-value": [
  ["font-size", "border-radius", "/^transition/", "box-shadow", "/^padding/", "/^margin/", "gap", "row-gap", "column-gap"],
  {
    "ignoreValues": [
      "0", "inherit", "initial", "unset", "none", "auto",
      "transparent", "currentColor", "50%", "100%",
      "fit-content", "max-content", "min-content"
    ],
    "ignoreFunctions": ["calc", "clamp", "min", "max", "env", "color-mix"],
    "disableFix": true,
    "message": "Use a design token (var(--…)) for \"${property}\" instead of \"${value}\""
  }
]
```

## Gated properties

| Property pattern | Required token family |
|---|---|
| `font-size` | `--font-*-size` (incl. new `--font-caption*-size`) |
| `border-radius` | `--radius-*` (incl. new `--radius-circular`, `--radius-xlarge`) |
| `/^transition/` (shorthand + `transition-duration`) | `--duration-*`, `--curve-*` |
| `box-shadow` | `--shadow-*` (incl. new `--shadow-16/28`) |
| `/^padding/`, `/^margin/`, `gap`/`row-gap`/`column-gap` | `--space-*` |

## Behavioral contract

- **C1 (fail on literal)**: a declaration of a gated property whose value is a non-ignored literal with no `var()` and no ignored-function call → **lint error** naming property + value. CI (`npm run lint`) exits non-zero.
- **C2 (pass on token)**: a declaration whose value contains a `var(--…)` reference → pass.
- **C3 (pass on ignored)**: value is exactly an `ignoreValues` entry (e.g. `0`, `auto`, `100%`) → pass without annotation.
- **C4 (pass on computed)**: value uses an `ignoreFunctions` call (e.g. `calc(100% - 8px)`) → pass.
- **C5 (escape hatch)**: a line with `/* stylelint-disable-line scale-unlimited/declaration-strict-value */` (or within a `disable`/`enable` block) → pass. Used for: the `:root` token-definition blocks, focus-ring `box-shadow` outlines, and Band-C sub-`--space-1` dense calendar micro-padding. Each escape-hatch site carries an adjacent one-line rationale.
- **C6 (green at completion)**: after the §1–4 migration, the full `css/**` tree produces **zero** strict-value errors. The gate is enabled in the same change set (FR-011) — never before the cleanup.

## Known limitation (documented)

The rule passes a declaration if *any* `var()` appears in its value, so a partially-tokenized shorthand (`padding: var(--space-2) 12px`) is not caught. Mitigation: all shorthands are reviewed during migration and written as full per-axis token tuples. `expandShorthand` is intentionally **not** enabled (brittle parsing of multi-layer `box-shadow`/`transition`).

## Acceptance (red→green proof)

1. With the rule added but before cleanup: `npm run lint` fails listing the existing literals (red).
2. After cleanup + annotations: `npm run lint` passes (green).
3. Re-introducing any single raw literal for a gated property turns it red again; removing it returns green (per-category, see quickstart).
