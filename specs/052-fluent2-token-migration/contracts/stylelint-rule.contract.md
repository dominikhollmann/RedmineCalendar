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
      "fit-content", "max-content", "min-content",
      "/^[a-z][a-z-]*$/"
    ],
    "ignoreFunctions": true,
    "disableFix": true,
    "message": "Use a design token (var(--…)) for \"${property}\" instead of \"${value}\""
  }
]
```

**As-built notes** (plugin `stylelint-declaration-strict-value` v1.11.1):

- `ignoreFunctions` takes a **boolean** (or per-property hash), not a list — `true` ignores any function-valued part (`calc()`, `clamp()`, `min()`, `max()`, `env()`, `color-mix()`).
- The plugin validates **every** space-separated value part, not "is a `var()` present somewhere". That would flag legitimate bare keywords in `transition` (the transition-property name like `opacity`, easing keywords like `ease-in-out`) and `box-shadow` (`inset`). The `"/^[a-z][a-z-]*$/"` `ignoreValues` regex ignores pure-alphabetic identifiers (keywords) while still catching `0.3s` / `16px`.
- A companion `comment-empty-line-before` config (`{ "except": ["first-nested"], "ignore": ["stylelint-commands"] }`) lets inline disable comments sit directly above a declaration without tripping stylelint-config-standard.

## Gated properties

| Property pattern                                        | Required token family                                           |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `font-size`                                             | `--font-*-size` (incl. new `--font-caption*-size`)              |
| `border-radius`                                         | `--radius-*` (incl. new `--radius-circular`, `--radius-xlarge`) |
| `/^transition/` (shorthand + `transition-duration`)     | `--duration-*`, `--curve-*`                                     |
| `box-shadow`                                            | `--shadow-*` (incl. new `--shadow-16/28`)                       |
| `/^padding/`, `/^margin/`, `gap`/`row-gap`/`column-gap` | `--space-*`                                                     |

## Behavioral contract

- **C1 (fail on literal)**: a declaration of a gated property whose value is a non-ignored literal with no `var()` and no ignored-function call → **lint error** naming property + value. CI (`npm run lint`) exits non-zero.
- **C2 (pass on token)**: every non-ignored value part is a `var(--…)` reference → pass. (Each part is checked independently — a partially-tokenized shorthand like `padding: 2px var(--space-1)` still fails on the `2px` part, which is stricter and better than "any var present".)
- **C3 (pass on ignored)**: a value part is an `ignoreValues` entry (`0`, `auto`, `100%`, or a pure-keyword via the regex) → that part passes without annotation.
- **C4 (pass on computed)**: a value part is a function call (`calc(100% - 8px)`, `clamp(…)`) → passes (`ignoreFunctions: true`).
- **C5 (escape hatch)**: a `/* stylelint-disable-next-line scale-unlimited/declaration-strict-value -- rationale */` comment above the declaration → pass. Used for: focus-/pulse-ring `box-shadow` widths, the two directional drawer-panel shadows, Band-C sub-`--space-1` dense micro-padding, and one comma-joined multi-value `transition` the plugin can't parse. Each carries an inline `-- rationale`. (The `:root` token blocks need **no** disable — they define `--font-*`/`--radius-*`/`--shadow-*`/`--space-*` custom properties, which are not the gated `font-size`/`border-radius`/`box-shadow`/spacing properties.)
- **C6 (green at completion)**: after the §1–6 migration, the full `css/**` tree produces **zero** strict-value errors. The gate is enabled in the same change set (FR-011) — never before the cleanup.

## Known limitation (documented)

`expandShorthand` is intentionally **not** enabled (brittle parsing of multi-layer `box-shadow`/`transition`). One consequence: a comma-separated multi-value `transition` (`background var(--duration-normal), border-color var(--duration-normal)`) is mis-parsed (the plugin sees `var(--duration-normal),` with a trailing comma) and must carry an escape-hatch even though it is fully tokenized — one such site exists (`docs.css`).

## Acceptance (red→green proof)

1. With the rule added but before cleanup: `npm run lint` fails listing the existing literals (red).
2. After cleanup + annotations: `npm run lint` passes (green).
3. Re-introducing any single raw literal for a gated property turns it red again; removing it returns green (per-category, see quickstart).
