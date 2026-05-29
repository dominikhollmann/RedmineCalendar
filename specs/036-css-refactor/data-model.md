# Data Model: CSS Custom Property Taxonomy

Feature 036 führt keine neuen Datenbankentitäten ein. Das "Datenmodell" ist die **vollständige Taxonomie der CSS Custom Properties**, die nach dieser Migration den einzigen Weg für Farbwerte darstellt.

## Variablen-Hierarchie

```
:root (light defaults)
  └── :root[data-theme='dark']     ← überschreibt alle Farb-Variablen
        └── .fc-root (admin CI)    ← überschreibt --ci-primary, --ci-font-family
```

## Kategorien und vollständige Variablenliste

### 1. Neutrale Hintergründe (Fluent 2 Neutral Ramp)

| Variable | Light | Dark | Semantik |
|---|---|---|---|
| `--neutral-background-1` | `#ffffff` | `#1f1f1f` | Haupthintergrund |
| `--neutral-background-2` | `#fafafa` | `#292929` | Sekundärhintergrund |
| `--neutral-background-3` | `#f5f5f5` | `#333333` | Tertiärhintergrund |
| `--neutral-background-4` | `#f0f0f0` | `#3d3d3d` | Subtiler Hintergrund |
| `--neutral-background-5` | `#e6e6e6` | `#525252` | Hover-Hintergrund |

### 2. Neutrale Vordergründe (Text/Icons)

| Variable | Light | Dark | Semantik |
|---|---|---|---|
| `--neutral-foreground-1` | `#242424` | `#f5f5f5` | Primärtext |
| `--neutral-foreground-2` | `#424242` | `#d6d6d6` | Sekundärtext |
| `--neutral-foreground-3` | `#707070` | `#a0a0a0` | Dezenter Text |

### 3. Neutrale Konturen (Borders/Dividers)

| Variable | Light | Dark | Semantik |
|---|---|---|---|
| `--neutral-stroke-1` | `#d1d1d1` | `#525252` | Primärkontur |
| `--neutral-stroke-2` | `#e0e0e0` | `#3d3d3d` | Subtile Kontur |

### 4. Brand / Primary (Admin-überschreibbar via `--ci-primary`)

| Variable | Light | Dark | Semantik |
|---|---|---|---|
| `--brand-primary` | `#0f6cbd` | `#4cc2ff` | Primärfarbe |
| `--brand-primary-hover` | `#115ea3` | `#62d3ff` | Hover-Zustand |
| `--brand-primary-pressed` | `#0c3b5e` | `#0091f8` | Pressed-Zustand |
| `--color-primary-bg` | `var(--ci-primary, #0f6cbd)` | `var(--ci-primary, #115ea3)` | Farbiger Hintergrund (Events) |
| `--color-on-primary` | `#ffffff` | `#ffffff` | Text auf Primärfarbe |
| `--color-on-primary-muted` | `rgba(255,255,255,0.6)` | `rgba(255,255,255,0.4)` | Dezenter Text auf Primärfarbe (NEU) |

### 5. Semantische Statusfarben

| Variable | Light | Dark | Semantik |
|---|---|---|---|
| `--accent` | `#1b5bab` | `#62a8ff` | Akzentfarbe |
| `--success` | `#107c10` | `#54b354` | Erfolg |
| `--warning` | `#b07c0d` | `#fce100` | Warnung (text) |
| `--danger` | `#c50f1f` | `#f1707b` | Fehler |
| `--warning-background` | `#fff4ce` | `#4a3a0a` | Warnungshintergrund |
| `--color-focus-ring` | `var(--brand-primary)` | `var(--brand-primary)` | Fokus-Indikator (WCAG 2.2) |

### 6. Weiche Status-Varianten (Badges, Alert-Boxen)

| Variable | Light | Dark | Semantik |
|---|---|---|---|
| `--color-danger-soft-bg` | `#442020` | `#442020` | Danger-Badge Hintergrund |
| `--color-danger-soft-text` | `#ffb4b4` | `#ffb4b4` | Danger-Badge Text |
| `--color-success-soft-bg` | `#1a3320` | `#1a3320` | Erfolg-Badge Hintergrund |
| `--color-success-soft-border` | `#3f6f4d` | `#3f6f4d` | Erfolg-Badge Kontur |
| `--color-info-soft-bg` | `#1e2f4a` | `#1e2f4a` | Info-Badge Hintergrund |
| `--color-info-soft-border` | `#2c4773` | `#2c4773` | Info-Badge Kontur |
| `--color-info-soft-text` | `#bfdbfe` | `#bfdbfe` | Info-Badge Text |
| `--color-warning-soft-bg` | `#4a3a0a` | `#4a3a0a` | Warnung-Badge Hintergrund |
| `--color-warning-soft-border` | `#b8860b` | `#b8860b` | Warnung-Badge Kontur |
| `--color-warning-soft-text` | `#ffe79e` | `#ffe79e` | Warnung-Badge Text |
| `--color-danger-bg` | `#fde7e9` | `#3a1a1a` | Danger Alert (light-mode NEU) |
| `--color-success-bg` | `#e6f4e6` | `#1a2e1a` | Erfolg Alert (light-mode NEU) |
| `--color-info-bg` | `#eff6ff` | `#1a2540` | Info Alert (light-mode NEU) |
| `--color-danger-glow` | `rgba(239,68,68,0.4)` | `rgba(239,68,68,0.3)` | Danger-Animation-Glow (NEU) |

### 7. Anomalie-Farben (Feature 029)

| Variable | Light | Dark | Semantik |
|---|---|---|---|
| `--color-anomaly` | `#a855f7` | `#c084fc` | Anomalie-Akzentfarbe (NEU) |
| `--color-anomaly-soft-bg` | `rgba(168,85,247,0.25)` | `rgba(168,85,247,0.2)` | Anomalie-Badge Hintergrund (NEU) |

### 8. Warning-Amber (FullCalendar Today + ArbZG-Badge)

| Variable | Light | Dark | Semantik |
|---|---|---|---|
| `--color-warning-amber` | `#f59e0b` | `#fbbf24` | Amber-Warnton (NEU) |
| `--color-warning-amber-hover` | `#e67e22` | `#f59e0b` | Amber Hover (NEU) |
| `--color-warning-amber-pressed` | `#ca6510` | `#e67e22` | Amber Pressed (NEU) |

### 9. Slate-Neutrale (für sekundäre Oberflächen)

| Variable | Light | Dark | Semantik |
|---|---|---|---|
| `--color-surface-subtle` | `#f1f5f9` | `#1e293b` | Subtile Oberfläche (slate-100/900, NEU) |
| `--color-surface-inverse` | `#1e293b` | `#f1f5f9` | Invertierte Oberfläche (NEU) |
| `--color-text-muted` | `#64748b` | `#94a3b8` | Dezenter Text (slate-500, NEU) |
| `--color-text-placeholder` | `#94a3b8` | `#64748b` | Platzhaltertext (slate-400, NEU) |

### 10. Transparenz-Overlays

| Variable | Light | Dark | Semantik |
|---|---|---|---|
| `--color-modal-backdrop` | `rgba(0,0,0,0.6)` | `rgba(0,0,0,0.6)` | Modal-Backdrop (in dark `:root` vorhanden → in light `:root` NEU) |
| `--color-overlay-medium` | `rgba(0,0,0,0.35)` | `rgba(0,0,0,0.45)` | Mittleres Overlay (NEU) |
| `--color-overlay-light` | `rgba(0,0,0,0.2)` | `rgba(0,0,0,0.3)` | Leichtes Overlay (NEU) |
| `--color-overlay-subtle` | `rgba(0,0,0,0.1)` | `rgba(0,0,0,0.15)` | Subtiles Overlay (NEU) |

### 11. Schatten (bestehend, ggf. Syntax-Update)

| Variable | Light | Dark | Semantik |
|---|---|---|---|
| `--shadow-2` | `0 1px 2px rgba(0,0,0,0.14)` | `0 1px 2px rgba(0,0,0,0.5)` | Kleiner Schatten |
| `--shadow-4` | `0 2px 4px rgba(0,0,0,0.14)` | `0 2px 4px rgba(0,0,0,0.5)` | Mittlerer Schatten |
| `--shadow-8` | `0 4px 8px rgba(0,0,0,0.14)` | `0 4px 8px rgba(0,0,0,0.5)` | Großer Schatten |

### 12. Semantic Aliases (bestehend — aus Feature 031)

Die bestehenden `--color-bg`, `--color-text`, `--color-primary` etc. werden **nicht verändert** — sie sind Admin-CI-Einstiegspunkte.

### 13. Spacing, Typografie, Border Radius (bestehend, keine Farbwerte)

Unveränderter Bestand: `--space-1..8`, `--radius-small/medium/large`, `--font-base-*`, `--font-large-*`, `--font-title-*`, `--font-display-*`

---

## Validierungsregel für Phase 1

Nach der Migration gilt: `grep -rE '#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(' css/` darf ausschließlich Treffer **innerhalb von `var(--*)` Definitionen** in `base.css` `:root`-Blöcken liefern — also in den Zeilen, die eine Variable *definieren*, nicht in Property-Wert-Zuweisungen.

Praktisch: `grep -rE 'color:|background:|border:|outline:|box-shadow:|fill:|stroke:' css/ | grep -E '#[0-9a-fA-F]{3,8}|rgb\(|rgba\('` → 0 Treffer.
