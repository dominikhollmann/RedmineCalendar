# Contract: Storage Keys & Design Tokens

## Storage keys

Reused as-is (see data-model.md): `redmine_calendar_view_mode`, `redmine_calendar_day_range`, `redmine_calendar_fast_mode`, `redmine_calendar_theme`, `redmine_calendar_working_hours`, `redmine_calendar_weekly_hours`, `redmine_calendar_auto_refresh_interval`, `redmine_calendar_planning_source_outlook`, `redmine_calendar_planning_source_teams`, encrypted `redmine_calendar_credentials`.

**NEW**: `redmine_calendar_planning_source_order` — JSON `string[]`, default `["outlook","teams"]`. Added as `STORAGE_KEY_PLANNING_SOURCE_ORDER` in `js/config.js` with a `DEFAULT_PLANNING_SOURCE_ORDER` export.

## Token contract

**Rule**: No new color/size literals outside the stylelint-disabled `:root` token block in `css/base.css`. `css/settings.css` references `var(--token)` only (enforced by `color-no-hex`/`color-named`/`function-disallowed-list`).

**Reuse mapping**: per plan.md D1 table — README token name → existing `--neutral-*`/`--color-*`/semantic token.

**New tokens to add** (light + dark, in `css/base.css` `:root` / `:root[data-theme='dark']`), each via `var()`/`color-mix` so the CI overlay tracks through:

| Token                       | Light                      | Dark                       | Notes                                                                 |
| --------------------------- | -------------------------- | -------------------------- | --------------------------------------------------------------------- |
| `--neutral-stroke-strong`   | #8a8a8a                    | #858585                    | Fluent underline-emphasis input bottom border                         |
| `--nav-active-bg`           | brand wash                 | brand wash                 | `color-mix(in srgb, var(--color-primary) ~10%, var(--color-surface))` |
| `--switch-on-thumb`         | #ffffff                    | #1a1a1a                    | thumb on ON track                                                     |
| `--switch-off-border`       | #616161                    | #8a8a8a                    | OFF track border                                                      |
| `--switch-off-thumb`        | #616161                    | #8a8a8a                    | OFF thumb                                                             |
| `--status-connected-dot`    | = `--success`              | = `--success`              | reuse semantic                                                        |
| `--status-checking-dot`     | = `--color-primary`        | = `--color-primary`        | reuse brand                                                           |
| `--status-disconnected-dot` | = `--neutral-foreground-3` | = `--neutral-foreground-3` | reuse neutral                                                         |
| `--reorder-grip`            | #b0b0b0                    | #6a6a6a                    | grip glyph color                                                      |

**Dark CI safeguard** (plan D3): in `:root[data-theme='dark']`, set link/focus tokens to a lightened accent so a dark `--ci-primary` keeps ≥3:1, e.g.
`--color-focus-ring: color-mix(in srgb, var(--color-primary) 55%, white);` and a `--color-link-on-dark` used for in-card links. Plain blue default is unaffected (it already passes); the mix only matters when a dark CI accent is set.

## Verification

- `npm run lint` (stylelint) passes — no literals in `settings.css`.
- axe-core dark scan passes with a `brandPrimary: '#6c2bd9'` config fixture (explicit contrast assertion on link + focus ring).
- `npm run sqi` ≥ 80; module-size + function-length caps respected.
