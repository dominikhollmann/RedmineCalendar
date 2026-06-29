# Handoff: Settings Redesign — RedmineCalendar

Implements **[#275 — \[feature\] Redesign of Settings](https://github.com/dominikhollmann/RedmineCalendar/issues/275)**
(cross-dependency on #274).

## Overview
The current Settings page is a long, narrow single-column list with flat dividers, an
off-system accent, and checkboxes used for everything. This redesign reorganizes it into a
**grouped, card-based layout with a section nav**, applies the project's **Fluent 2 design
language with the purple corporate accent**, uses the **correct control per setting**
(Switches for on/off prefs, checkboxes only for the multi-select source list), separates
**destructive actions into a danger zone**, and makes the **Redmine connection an explicit,
status-driven action**. It is fully **responsive** (desktop section-rail ↔ mobile chip-bar)
and **dark-mode aware**.

## About the Design Files
The files in this bundle are **design references created in HTML** — a working prototype that
demonstrates the intended look, layout, states, and interactions. **They are not production
code to copy verbatim.** The task is to **recreate this design in the RedmineCalendar codebase
using its existing environment and patterns** (component library, theming, i18n, state, tests).

- `Settings Prototype.dc.html` — the full interactive prototype (open in a browser to click
  through it). It is self-contained except for `support.js` (the prototype runtime — **do not
  port this file**; it only exists to run the `.dc.html` in a browser).
- All UI is built with inline styles driven by the CSS custom properties listed under
  **Design Tokens**. The logic lives in a single `Component` class near the bottom of the file
  — read it as pseudocode for the real component's behavior.

> ⚠️ **Stack: this app is plain JS / CSS / HTML — NOT React. Do not introduce a framework.**
> "Fluent 2" is the *design language* here, not the React library. Build this with vanilla DOM and
> the CSS custom properties under **Design Tokens**. The prototype's `Component` class is only a
> convenience wrapper around *state + a render function* — port it as a small vanilla module (a
> plain state object + event handlers that update the DOM), **not** as a React component.
>
> **Optional:** if you want official Fluent 2 controls without a framework, you may use **Fluent UI
> Web Components** (`@fluentui/web-components`) — standard custom elements like `<fluent-switch>`,
> `<fluent-text-input>`, `<fluent-button>`, `<fluent-badge>` usable straight from HTML, themed to
> the purple brand. This is a good way to get built-in accessibility toward the axe-core gate. If
> you don't adopt them, the prototype's hand-built controls (plain markup + the token CSS) are a
> complete, faithful reference — keep them framework-free.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, and interaction states are final and
exact (see Design Tokens). Recreate the UI faithfully in **vanilla JS/CSS/HTML**. Drop the token
set into a stylesheet as CSS custom properties (the prototype already defines them that way) and
reference `var(--token)` throughout, so the light/dark themes work by swapping `data-theme` on a
root element. The literal hex values here are the source of truth for the look.

## Recommended workflow (speckit / Claude Code)
This repo uses spec-kit flows. Suggested path:

1. **`/specify`** — paste the contents of `SPEC.md` (next to this README). It's written as a
   feature spec with user stories and acceptance criteria.
2. **`/plan`** — point the plan at this README for the component/token/state detail, and at the
   actual repo for conventions (how settings are currently stored/loaded, the existing
   light/dark theming approach, i18n keys, the test setup, and the axe-core CI gate from
   Feature 033). **Constraint:** stay vanilla JS/CSS/HTML — no framework.
3. **`/tasks`** — the **Implementation Checklist** at the bottom of this README is already broken
   into task-sized units; use it to seed or sanity-check the task list.
4. **`/implement`** — build screen-by-screen, validating against the **Accessibility** section
   (the axe-core/WCAG 2.2 AA gate is a hard CI requirement).

## Screens / Views

There is **one screen — the Settings page** — with a **desktop** and a **mobile** layout that
swap at a **640px** breakpoint (`isMobile`). It contains five content sections plus a header and
a sticky footer.

### Header
- **Layout:** horizontal flex, space-between, `align-items:center`. Left cluster = app mark +
  title block; right cluster = icon buttons.
- **App mark:** 30×30 (mobile 28×28), `border-radius:7`, `background:var(--navActiveBg)`,
  `1px solid var(--brand)`, brand-colored monogram **"RC"**, `700 12px`. **Placeholder** — swap
  for the real app icon when available. `aria-hidden`.
- **Title block:** "Redmine Calendar" (`600 22px/26px`, mobile `18px/22px`, `nowrap`, ellipsis on
  overflow) over "Einstellungen" (`400 13px/16px`, `--t3`).
- **Icon buttons (right):** two 36×36 buttons, `border-radius:4`, `1px solid var(--headerBorder)`,
  `background:var(--iconBtnBg)`:
  - **Help** "?" — `aria-label="Hilfe"`.
  - **Theme toggle** — shows ☾ in light / ☀ in dark; toggles `data-theme`. `aria-label`
    "Dunkelmodus aktivieren" / "Hellmodus aktivieren". **This is the only dark-mode control** —
    do not add a "Dark mode" row in settings.

### Section nav
- **Desktop:** 188px-wide sticky vertical rail (`position:sticky; top:16`), one button per
  section. Active item: `borderLeft:3px solid var(--brand)`, `background:var(--navActiveBg)`,
  brand text, `600`. Inactive: transparent, `--t2`, `400`. Driven by **scroll-spy**.
- **Mobile:** sticky **horizontal chip bar** under the header (`position:sticky; top:0;
  z-index:6; overflow-x:auto`). Chips are pill-shaped (`border-radius:16`, `min-height:36`,
  `padding:8px 14px`), bordered, active chip = brand border + `--navActiveBg` + brand text.
  **The active chip auto-scrolls into view** (centered, clamped) on both tap and scroll-spy
  change — use a manual `scrollLeft` animation (`scrollTo({left, behavior:'auto'})`), **not**
  `element.scrollIntoView()` (it scrolls the page vertically) and **not** `behavior:'smooth'` on
  the container (unreliable here).
- **Sections (in order):** Anzeige · Arbeitszeiten · Authentifizierung · Quellen · Daten &
  Datenschutz. Clicking scrolls to the section (offset −96 desktop / −104 mobile).

### Card shell (all sections)
`background:var(--card)`, `1px solid var(--cardBorder)` (danger card uses `--dangerBorder`),
`border-radius:8`, `box-shadow:0 1px 2px var(--shadow), 0 0 2px var(--shadow)`,
`padding:18px 22px` (mobile `16px`). Title = `h2`, `600 16px/22px`, `--t1`, `margin 0 0 14px`.
Cards are separated by a **14px gap** in a vertical flex column (max content width 980px, centered).

### 1. Anzeige (Display)
Three **Switch** rows, each: space-between flex, `padding:11px 0` (mobile `14px`, `min-height:44`),
top border `1px solid var(--rowBorder)`, label `400 14px` (mobile `15px`):
- "Nur Arbeitszeit anzeigen" — on
- "Nur Mo–Fr anzeigen" — on
- "Schnellmodus" — on

**Switch component:** 40×20 track, `border-radius:10`; ON = `background:var(--brand)`, thumb 14×14
white (`--swOnThumb`) at right; OFF = transparent track, `1px solid var(--swOffBorder)`, thumb
`--swOffThumb` at left. Must be `role="switch"` with `aria-checked` and an `aria-label`.

### 2. Arbeitszeiten (Working hours)
- **Desktop:** three equal fields in a row (`gap:12`): **Start** (time, 08:00), **Ende** (time,
  19:00), **Wochenstunden** (number, 39, min 0 max 60).
- **Mobile:** Start + Ende as a 2-up row; **Wochenstunden** becomes its own label-left /
  input-right row (96px input).
- **Field:** label `400 12px`, `--t2`, `margin-bottom:4`; input full-width, `1px solid var(--stroke)`
  with a stronger bottom border `1px solid var(--strokeStrong)` (Fluent's underline-emphasis input),
  `border-radius:4`, `background:var(--inputBg)`, `padding:8px 10px`, `400 14px`, `--t1`.

### 3. Redmine-Authentifizierung (Auth) — the only explicit-save area
- **Card title row:** "Redmine-Authentifizierung" + a **status pill** on the right (stacks below
  on mobile). Pill = `inline-flex`, `gap:5`, `padding:2px 8px`, `border-radius:11`; 6×6 dot +
  label `600 11px/14px`. Three states:
  - `connected` → dot `--successDot`, bg `--successBg`, text `--successText`, **"Verbunden"**
  - `checking` → dot `--brand`, bg `--navActiveBg`, text `--brand`, **"Verbindung wird geprüft…"**
  - `disconnected` → dot `--t3`, bg `--badgeBg`, text `--t2`, **"Nicht verbunden"**
- **Method segmented control** (`role="group"`): two segments "API-Schlüssel" / "Benutzername &
  Passwort". Selected = brand bg + brandText. Desktop = inline auto-width; **mobile = full-width,
  two equal segments**, taller tap target.
- **API-Schlüssel mode:** label + a row of [password/text input] + [Anzeigen/Verbergen toggle
  button]. Helper line `400 12px`, `--t3`: "Zu finden unter Mein Konto → API-Zugriffsschlüssel."
  + a `--link` "Mein Konto öffnen".
- **Benutzername & Passwort mode:** stacked "Benutzername" (text) and "Passwort" (password) fields.
- **Verbinden button:** brand button, label **"Verbinden"** (→ "Verbindung wird geprüft…" +
  `disabled`/`aria-busy` while checking). Full-width on mobile.
- **Critical behavior:** editing the key / username / password **invalidates** a live connection
  → pill returns to "Nicht verbunden", footer CTA disables, and a hint "Zugangsdaten geändert —
  erneut verbinden." appears. Clicking **Verbinden** runs the real Redmine auth call
  (prototype fakes it with an ~1.1s timer that always succeeds — **replace with the real call and
  real error states**: invalid key, network failure, server error, each with a reason on the pill
  or inline).

### 4. Planungsansicht-Quellen (Sources) — reorderable
- Helper line describing activate + reorder.
- A **list** (`role="list"`) of source rows. Each row: `background:var(--rowBg)`,
  `1px solid var(--rowBorder)`, `border-radius:6`, `padding:9px 11px` (mobile `10px 12px`,
  `min-height:48`), `margin-bottom:7`, flex with `gap:12`. Contents: **reorder handle** +
  **checkbox** (enable, `accentColor:var(--brand)`) + **label** (`flex:1`) + **position badge**
  (`600 11px`, `--badgeText` on `--badgeBg`, `border-radius:10`).
  - **Sources:** "Microsoft Outlook (Kalendereinträge)" (on), "Microsoft Teams (Anrufe &
    Besprechungen)" (on).
- **Reordering — two modalities (both required for the a11y gate):**
  - **Desktop:** native HTML5 **drag** of the whole row (grip glyph "⠿") **plus keyboard**: the
    grip is a `<button>`; **Space/Enter** grabs (row highlights: `--navActiveBg` bg + brand
    border + shadow; announce "aufgenommen — mit Pfeiltasten verschieben, Leertaste zum Ablegen"),
    **↑/↓** moves and keeps focus on the moved grip, **Space/Esc** drops.
  - **Mobile:** **up/down arrow buttons** per row (touch-reliable; disabled at the ends). These
    double as the accessibility fallback. (HTML5 drag does not work on touch.)
  - Every move updates the position badges and announces the new position via an `aria-live`
    region (see Accessibility). **This satisfies WCAG 2.2 SC 2.5.7 Dragging Movements** — keep it.
- **Auto-Aktualisierung row:** label "Auto-Aktualisierung" with sublabel "Minuten · 0 = aus"
  (`400 12px`, `--t3`), right-aligned 96px number input (default 5, min 0), separated by a top
  divider.

### Sticky footer — app entry point
- `position:sticky; bottom:0`, full-bleed within the page padding (negative side margins),
  `background:var(--card)`, top border `--headerBorder`, top shadow. Right-aligned (column on
  mobile, full-width button).
- **"Kalender öffnen →"** — **enabled only when `connection === 'connected'`**; otherwise disabled
  (`--badgeBg` bg, `--t3` text, `not-allowed`) with the hint "Zuerst mit Redmine verbinden, um den
  Kalender zu öffnen." This is how the user navigates from Settings into the app.

### 5. Daten & Datenschutz (danger zone)
- Card uses the danger border. First row = **privacy link**: "Datenschutzerklärung & Verarbeitung
  der Planungsdaten" + a `--link` "Ansehen →", separated by a divider from the destructive actions.
- Two destructive rows (label + outline-danger button, `1px solid var(--danger)`, danger text,
  transparent bg): "Alle lokal gespeicherten Planungsdaten löschen" → **Löschen**; "KI-
  Planungseinwilligung widerrufen" → **Widerrufen**. Wire these to real confirm dialogs.
- Footer text under everything: "Version: dev · Open-Source-Lizenzen".

## Interactions & Behavior
- **Instant-apply** for all preferences (switches, working hours, source enable/order,
  auto-refresh) — write to the settings store on change. **No global save button.** The *only*
  explicit action is **Verbinden** (auth), and the only navigation action is **Kalender öffnen**.
- **Connection state machine:** `connected → (edit credentials) → disconnected → (Verbinden) →
  checking → connected | error`. The header had a pill originally; it now lives **inside the auth
  card** next to the control that produces it.
- **Theme:** toggled via header button → `data-theme="light|dark"`. Should respect
  `prefers-color-scheme` on first load and persist the choice.
- **Scroll-spy:** active section/chip follows scroll; threshold `scrollY + 140` desktop /
  `+120` mobile.
- **Responsive:** single `isMobile` flag at 640px, re-evaluated on resize.

## State Management
| State | Type | Notes |
|---|---|---|
| `prefs` | `{ arbeitszeit, mofr, schnell: boolean }` | instant-apply |
| `authMode` | `'apikey' \| 'userpass'` | segmented control |
| `showKey` | `boolean` | reveal toggle |
| `connection` | `'connected' \| 'checking' \| 'disconnected'` | + an `error` state to add |
| `sources` | `[{ id, label, enabled }]` | order is meaningful → persists to app |
| `active` | section id | scroll-spy |
| `grabbed` | index \| null | keyboard drag state (desktop) |
| `isMobile` | boolean | 640px breakpoint |
| working hours / auto-refresh | inputs | the prototype uses uncontrolled `defaultValue` inputs for demo purposes — in the real app, read/write their values on `input`/`change` and **validate** (see Validation) |

**Data:** load current settings on mount (add a loading/skeleton state — the prototype has none);
persist on change; the real Verbinden call replaces the faked timer.

## Design Tokens
All values are CSS custom properties; **light** then **dark**.

**Surfaces:** `--canvas` #f0f0f0 / #141414 · `--card` #ffffff / #2b2b2b · `--cardBorder` #e6e6e6 /
#383838 · `--rowBg` #fafafa / #232323 · `--rowBorder` #e6e6e6 / #383838
**Text:** `--t1` #242424 / #ffffff · `--t2` #424242 / #d6d6d6 · `--t3` #707070 / #a6a6a6 ·
`--footer` #909090 / #7a7a7a
**Brand (purple corporate accent):** `--brand` **#6c2bd9** / **#a78bfa** · `--brandText` #ffffff /
#1a1a1a · `--link` #6c2bd9 / #b69dff · `--navActiveBg` #f1eaff / #3a2d5c · `--focus` #6c2bd9 / #b69dff
**Inputs:** `--stroke` #d1d1d1 / #525252 · `--strokeStrong` #8a8a8a / #858585 · `--inputBg` #ffffff /
#1f1f1f · `--btnSec` #ffffff / #2b2b2b
**Switch:** `--swOffBorder` #616161 / #8a8a8a · `--swOffThumb` #616161 / #8a8a8a · `--swOnThumb`
#ffffff / #1a1a1a
**Status (success/connected):** `--successBg` #dff6dd / rgba(84,176,84,.16) · `--successText`
#0e700e / #6ccb6c · `--successDot` #107c10 / #54b054
**Danger:** `--danger` #c50f1f / #dc626d · `--dangerBorder` #efc7ca / #5c2b2e · `--dangerDiv`
#f3dddd / #4a2a2c
**Badge/grip:** `--badgeBg` #ededed / #1a1a1a · `--badgeText` #909090 / #a6a6a6 · `--grip` #b0b0b0 /
#6a6a6a
**Misc:** `--headerBorder` #e0e0e0 / #383838 · `--icon` #424242 / #d6d6d6 · `--iconBtnBg` #ffffff /
#2b2b2b · `--shadow` rgba(0,0,0,.07) / rgba(0,0,0,.35)

**Type:** family `"Segoe UI Variable","Segoe UI", system-ui, sans-serif`. Sizes: page title 22/18px·600;
card title 16px·600; body/label 14–15px·400; field label 12px·400; helper 12px·400; pill/badge 11px·600.
**Radius:** card/8 · chip/16 · pill/11 · input·button/4 · app-mark/7 · switch/10.
**Spacing:** card gap 14 · card padding 18×22 (mobile 16) · max width 980 centered.
**Breakpoint:** 640px. **Focus:** `2px solid var(--focus)`, offset 2.

## Accessibility (hard CI gate — axe-core / WCAG 2.2 AA, Feature 033)
- **SC 2.5.7 Dragging Movements:** source reorder MUST keep a non-drag path — keyboard
  grab+arrows (desktop) and up/down buttons (mobile). Already designed in; don't drop it.
- **`aria-live="polite"` region** (visually hidden, `role="status"`) announces every reorder
  ("Outlook verschoben — Position 1 von 2"), grab/drop, and connection changes.
- **Switches:** `role="switch"` + `aria-checked` + label. **Segmented:** `role="group"` +
  `aria-pressed`. **Status pill / connection:** announce changes via live region.
- **Focus-visible** ring must meet **≥3:1** contrast in *both* themes (verify the dark `--focus`).
- **Hit targets ≥44px** on mobile (switches, chips, arrow buttons already sized for this).
- Verify with a real screen reader, not just DOM presence, and run the actual axe-core suite.

## i18n
All copy in the prototype is **German**. The app is localized **DE/EN** — route every string
through the existing i18n layer. Strings to key: section titles, all labels/sublabels, switch
labels, the three connection states, button labels (Verbinden / Anzeigen / Verbergen / Kalender
öffnen / Löschen / Widerrufen / Ansehen), helper texts, the "Zugausdaten geändert" hint, the
"Zuerst mit Redmine verbinden…" hint, and all `aria-label`s.

## Assets
- **No image assets.** Icons are placeholder text glyphs (? ☾ ☀ ⠿ ▲ ▼ →) — replace with the
  project's existing icon set. If you adopt Fluent UI Web Components you can use Fluent's icons;
  otherwise inline SVGs are fine (reorder grip, chevron up/down, arrow-right, help, moon/sun).
- **App mark** "RC" is a placeholder monogram — swap for the real logo.

## Files
- `Settings Prototype.dc.html` — the interactive prototype (open in a browser). Tokens are in the
  `<style>` block at the top; behavior is the `Component` class near the bottom.
- `support.js` — prototype runtime only. **Do not port.**
- `SPEC.md` — a paste-ready feature spec for speckit `/specify`.

## Implementation Checklist (seed for `/tasks`)
- [ ] Confirm vanilla JS/CSS/HTML (no framework). Choose: hand-built controls (token CSS) or
      optional Fluent UI **Web Components** for the form controls. Drop tokens into a stylesheet.
- [ ] Page scaffold: header (mark, title, help, theme toggle), responsive nav, card column, sticky footer.
- [ ] Theme: `data-theme` provider, `prefers-color-scheme` default, persisted toggle.
- [ ] Responsive `isMobile` (640px) + mobile chip-bar with auto-scroll-into-view (manual scrollLeft).
- [ ] Scroll-spy for active section/chip.
- [ ] Anzeige: 3 instant-apply Switches (`role="switch"`).
- [ ] Arbeitszeiten: controlled + validated Start/Ende/Wochenstunden (desktop row / mobile split).
- [ ] Auth: segmented control, both modes, show/hide key, **real Verbinden call + error states**,
      status pill in card, invalidate-on-edit.
- [ ] Quellen: enable checkboxes + **drag + keyboard reorder** (desktop) / **arrow buttons** (mobile),
      position badges, persist order to the app, auto-refresh field.
- [ ] Footer "Kalender öffnen" gated on `connected`.
- [ ] Daten & Datenschutz: privacy link + two destructive actions with confirm dialogs.
- [ ] `aria-live` announcements; focus-visible contrast both themes; 44px targets.
- [ ] i18n all strings (DE/EN). Swap placeholder glyphs → Fluent icons; swap "RC" → real logo.
- [ ] Load/persist settings; loading state on open.
- [ ] **Pass the axe-core CI gate** + add tests for reorder, connection state machine, gating.
