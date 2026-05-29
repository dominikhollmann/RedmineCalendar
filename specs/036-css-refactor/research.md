# Research: CSS-Refaktorierung

## 1. Hardcodierte Farbwerte — vollständige Bestandsaufnahme

### Entscheidung
85 hardcodierte Hex-Werte und 24 rgb/rgba-Instanzen in `css/style.css` werden durch `var(--*)` ersetzt. Die meisten Werte sind **direkte Duplikate bereits definierter Variablen**; ~10 Werte benötigen neue Variablen im `:root`-Block.

### Bestandsaufnahme: hardcodierte Werte → bestehende Variablen

| Hardcodierter Wert | Häufigkeit | Ersetzt durch |
|---|---|---|
| `#fff` / `#ffffff` | 12 | `var(--neutral-background-1)` oder `var(--color-on-primary)` je Kontext |
| `#0f6cbd` | 2 | `var(--brand-primary)` |
| `#115ea3` | 3 | `var(--brand-primary-hover)` |
| `#f5f5f5` | 2 | `var(--neutral-background-3)` |
| `#f0f0f0` | 1 | `var(--neutral-background-4)` |
| `#e6e6e6` | 1 | `var(--neutral-background-5)` |
| `#242424` | 1 | `var(--neutral-foreground-1)` |
| `#424242` | 1 | `var(--neutral-foreground-2)` |
| `#707070` | 1 | `var(--neutral-foreground-3)` |
| `#d1d1d1` | 1 | `var(--neutral-stroke-1)` |
| `#e0e0e0` | 1 | `var(--neutral-stroke-2)` |
| `#d6d6d6` | 1 | `var(--neutral-foreground-2)` (dark mode value) |
| `#a0a0a0` | 1 | `var(--neutral-foreground-3)` (dark mode value) |
| `#525252` | 2 | `var(--neutral-background-5)` (dark mode) |
| `#3d3d3d` | 2 | `var(--neutral-background-4)` (dark mode) |
| `#333333` | 1 | `var(--neutral-background-3)` (dark mode) |
| `#292929` | 1 | `var(--neutral-background-2)` (dark mode) |
| `#1f1f1f` | 2 | `var(--neutral-background-1)` (dark mode) |
| `#ef4444` | 2 | `var(--danger)` |
| `#c50f1f` | 1 | `var(--danger)` |
| `#107c10` | 1 | `var(--success)` |
| `#b07c0d` | 1 | `var(--warning)` |
| `#fff4ce` | 2 | `var(--warning-background)` |
| `#4a3a0a` | 2 | `var(--warning-background)` (dark mode value) |
| `#1b5bab` | 1 | `var(--accent)` |
| `#4cc2ff` | 2 | `var(--brand-primary)` (dark mode value) |
| `#62d3ff` | 1 | `var(--brand-primary-hover)` (dark mode value) |
| `#62a8ff` | 1 | `var(--accent)` (dark mode value) |
| `#0c3b5e` | 1 | `var(--brand-primary-pressed)` |
| `#0091f8` | 1 | `var(--brand-primary-pressed)` (dark mode value) |
| `#442020` | 1 | `var(--color-danger-soft-bg)` |
| `#ffb4b4` | 1 | `var(--color-danger-soft-text)` |
| `#1a3320` | 1 | `var(--color-success-soft-bg)` |
| `#3f6f4d` | 1 | `var(--color-success-soft-border)` |
| `#1e2f4a` | 1 | `var(--color-info-soft-bg)` |
| `#2c4773` | 1 | `var(--color-info-soft-border)` |
| `#bfdbfe` | 2 | `var(--color-info-soft-text)` |
| `#ffe79e` | 1 | `var(--color-warning-soft-text)` |
| `#4a3a0a` | 1 | `var(--color-warning-soft-bg)` |
| `#b8860b` | 1 | `var(--color-warning-soft-border)` |
| `rgba(0, 0, 0, 0.6)` | 1 | `var(--color-modal-backdrop)` — NEU in `:root` |
| `rgba(0, 0, 0, 0.5)` | 3 | `var(--shadow-*)` Schattenopazität; Shadows bereits als `--shadow-2/4/8` → verwenden |
| `rgba(0, 0, 0, 0.2)` | 3 | `var(--color-overlay-light)` — NEU in `:root` |
| `rgba(0, 0, 0, 0.14)` | 3 | `var(--shadow-2)` etc. — schon als Variable vorhanden; direkt verwenden |
| `rgba(0, 0, 0, 0.1)` | 2 | `var(--color-overlay-subtle)` — NEU in `:root` |
| `rgba(0, 0, 0, 0.045)` | 1 | `var(--color-overlay-subtle)` — NEU in `:root` |
| `rgba(0, 0, 0, 0.45)` | 1 | `var(--color-overlay-medium)` — NEU in `:root` |
| `rgba(0, 0, 0, 0.35)` | 1 | `var(--color-overlay-medium)` — NEU in `:root` |
| `rgba(0, 0, 0, 0.30)` | 1 | `var(--color-overlay-medium)` — NEU in `:root` |
| `rgba(0, 0, 0, 0.25)` | 1 | `var(--color-overlay-subtle)` — NEU in `:root` |
| `rgba(255, 255, 255, 0.6)` | 1 | `var(--color-on-primary-muted)` — NEU in `:root` |
| `rgba(59, 130, 246, 0.15)` | 1 | `var(--color-info-soft-bg)` (light variant) |
| `rgba(239, 68, 68, 0.4)` | 1 | `var(--color-danger-soft-bg)` (light variant, höhere Opazität) → `var(--color-danger-glow)` — NEU |
| `rgba(239, 68, 68, 0)` | 1 | transparent (Animation end-state) → `transparent` literal |
| `rgba(168, 85, 247, 0.25)` | 2 | `var(--color-anomaly-soft-bg)` — NEU |
| `#a855f7` | 2 | `var(--color-anomaly)` — NEU |
| `#64748b` | 2 | `var(--color-text-muted)` — NEU (slate-500) |
| `#94a3b8` | 1 | `var(--color-text-placeholder)` — NEU (slate-400) |
| `#1e293b` | 2 | `var(--color-surface-inverse)` — NEU (slate-900) |
| `#475569` | 1 | `var(--color-text-muted)` (slate-600) |
| `#f1f5f9` | 2 | `var(--color-surface-subtle)` — NEU (slate-100) |
| `#eff6ff` | 1 | `var(--color-info-bg)` — NEU |
| `#e6f4e6` | 1 | `var(--color-success-bg)` — NEU |
| `#fde7e9` | 1 | `var(--color-danger-bg)` — NEU |
| `#fafafa` | 1 | `var(--neutral-background-2)` |
| `#f59e0b` | 2 | `var(--color-warning-amber)` — NEU (distinct from `--warning: #b07c0d`) |
| `#f0a500` | 1 | `var(--color-warning-amber)` — NEU |
| `#e67e22` | 1 | `var(--color-warning-amber-hover)` — NEU |
| `#ca6510` | 1 | `var(--color-warning-amber-pressed)` — NEU |
| `#b15a00` | 1 | `var(--color-warning-amber-pressed)` — NEU |
| `#835c0d` | 1 | `var(--color-warning-amber-pressed)` (dark variant) |
| `#6cbb6c` | 1 | `var(--color-success-text)` — NEU |
| `#8a1c2a` | 1 | `var(--color-danger-text)` — NEU |

### Neue Variablen (zusammengefasst, 14 neue Properties im `:root`)

```css
/* Transparenz-Overlays (schwarz) */
--color-modal-backdrop: rgba(0, 0, 0, 0.6);
--color-overlay-medium: rgba(0, 0, 0, 0.35);
--color-overlay-light: rgba(0, 0, 0, 0.2);
--color-overlay-subtle: rgba(0, 0, 0, 0.1);

/* Auf primärfarbigem Hintergrund */
--color-on-primary-muted: rgba(255, 255, 255, 0.6);

/* Anomalie (Feature 029 — Purple) */
--color-anomaly: #a855f7;
--color-anomaly-soft-bg: rgba(168, 85, 247, 0.25);

/* Danger-Glow (Animation) */
--color-danger-glow: rgba(239, 68, 68, 0.4);

/* Slate-Neutrale (slate-100/400/500/600/900) */
--color-surface-subtle: #f1f5f9;
--color-text-muted: #64748b;
--color-text-placeholder: #94a3b8;
--color-surface-inverse: #1e293b;

/* Weiche Hintergründe (light-mode-Versionen) */
--color-info-bg: #eff6ff;
--color-success-bg: #e6f4e6;
--color-danger-bg: #fde7e9;

/* Warning-Amber (FullCalendar today + ArbZG-Badge) */
--color-warning-amber: #f59e0b;
--color-warning-amber-hover: #e67e22;
--color-warning-amber-pressed: #ca6510;
```

**Dark-Mode-Gegenstücke** für neue Variablen (werden in `:root[data-theme='dark']`-Block ergänzt):
- `--color-modal-backdrop` → bereits vorhanden (`rgba(0, 0, 0, 0.6)`)
- `--color-anomaly` → `#c084fc` (heller purple für dunklen Hintergrund)
- `--color-anomaly-soft-bg` → `rgba(168, 85, 247, 0.2)`
- Slate-Variablen → invertierte Slate-Entsprechungen
- Warning-Amber → `#fbbf24` (heller für dark bg)

---

## 2. Dateiaufteilungs-Grenzen

### Entscheidung
6 CSS-Dateien. Dark-Mode-Überschreibungen auf Komponentenebene werden ans Ende jeder Datei platziert. Der `:root[data-theme='dark']`-Block (Variablen-Overrides) bleibt in `base.css`, da er root-scope ist.

### Rationale
5 Dateien würden calendar.css > 400 Zeilen produzieren. 6 Dateien halten alle unter 400.

### Sektions-Mapping

| Sektion (style.css-Zeilen) | Zieldatei |
|---|---|
| `:root` Variablen (1–116) | `base.css` |
| `:root[data-theme='dark']` (117–186) | `base.css` |
| html/body/a (187–196) | `base.css` |
| Brand logo (187–197) | `base.css` |
| Error banner (240–271) | `base.css` |
| Loading overlay (272–298) | `base.css` |
| Toast (299–316) | `base.css` |
| A11y utilities (1947–1993) | `base.css` |
| **Gesamt base.css** | **~280 Zeilen** |
| App header (198–232) | `calendar.css` |
| Calendar container (233–239) | `calendar.css` |
| Overflow indicators (317–357) | `calendar.css` |
| FullCalendar overrides (358–483) | `calendar.css` |
| Toolbar right (805–812) | `calendar.css` |
| View mode switch (813–876) | `calendar.css` |
| Working hours modal row (877–888) | `calendar.css` |
| Clipboard banner (889–916) | `calendar.css` |
| ArbZG warnings (1202–1235) | `calendar.css` |
| Break-ticket (1847–1866) | `calendar.css` |
| Anomaly badge (1867–1946) | `calendar.css` |
| Mobile responsive — Kalender-Anteil (1664–1780) | `calendar.css` |
| **Gesamt calendar.css** | **~380 Zeilen** |
| Modal (484–630) | `time-entry.css` |
| Confirmation dialog (631–660) | `time-entry.css` |
| Lean time entry form (917–1201) | `time-entry.css` |
| AI-highlighted fields (1560–1663) | `time-entry.css` |
| Mobile responsive — Formular-Anteil (1780–1846) | `time-entry.css` |
| **Gesamt time-entry.css** | **~400 Zeilen** |
| Help button (1236–1256) | `docs.css` |
| Docs panel (1257–1389) | `docs.css` |
| Chatbot button (1390–1409) | `docs.css` |
| Chatbot panel (1410–1559) | `docs.css` |
| **Gesamt docs.css** | **~282 Zeilen** |
| Settings page (661–737) | `settings.css` |
| Welcome banner (738–752) | `settings.css` |
| Config error (753–763) | `settings.css` |
| Password toggle (764–782) | `settings.css` |
| Version display (783–790) | `settings.css` |
| Auth method toggle (791–804) | `settings.css` |
| Licenses page (1994–2088) | `settings.css` |
| **Gesamt settings.css** | **~230 Zeilen** |

**Hinweis**: Mobile-responsive-Regeln werden auf `calendar.css` und `time-entry.css` aufgeteilt (nach betroffener Komponente), da es sich um @media-Blöcke für spezifische Selektoren handelt. Diese landen jeweils am Ende der Komponenten-Datei, VOR den Dark-Mode-Regeln.

---

## 3. Stylelint-Config-Standard — erwartete Verstöße

### Entscheidung
`stylelint-config-standard` als Basis. Alle Verstöße werden in Phase 3 behoben — kein Grandfathering. Geschätzte Verstöße im aktuellen `style.css`: ~80–150 (hauptsächlich Property-Reihenfolge, Leerzeichen in Farb-Funktionen, fehlende leere Zeilen zwischen Regeln).

### Rationale
- **`declaration-block-single-line-max-declarations`**: Unwahrscheinlich in unserem CSS (kein Inline-Stil)
- **`color-function-notation`**: `rgba(0, 0, 0, 0.14)` → `rgb(0 0 0 / 0.14)` (moderne Notation) — betrifft alle Shadow-Variablen und neue Overlay-Variablen → Variablen werden von Anfang an in moderner Notation definiert
- **`declaration-property-value-no-unknown`**: Unwahrscheinlich
- **Property ordering** (`order/properties-alphabetical-order`): Das Standard-Preset erzwingt dies NICHT — erfordert `stylelint-config-standard` + `stylelint-order` plugin. Wir verwenden KEIN order-Plugin (YAGNI).
- **Leerzeilen zwischen Regeln**: Häufigster Verstoß — automatisch behebbar mit `stylelint --fix`

### Alternatives considered
- Nur Farb-Verbot ohne Standard-Preset → abgelehnt (Klarify-Entscheidung Option B)
- `stylelint-config-standard` + `stylelint-order` Plugin → abgelehnt (YAGNI, erhöht Verstöße um Faktor 5–10)

---

## 4. HTMLHint `no-style-tag` — Verfügbarkeit

### Entscheidung
Die Regel `"no-style-tag": true` ist in HTMLHint v1.x verfügbar. Sie ist in `.htmlhintrc` hinzuzufügen. Aktuell gibt es keine `<style>`-Blöcke in HTML-Dateien — 0 neue Verstöße beim Aktivieren.

### Rationale
Bestehende `"inline-style-disabled": true` deckt `style=""`-Attribute ab. `no-style-tag` ergänzt dies für `<style>`-Blöcke.

---

## 5. SBoM-Regeneration nach dep-Änderung

### Entscheidung
Nach `npm install stylelint stylelint-config-standard --save-dev` ist `npm run oss:generate` auszuführen, um `sbom.json` + `attributions.json` zu regenerieren. Die CI-`oss:drift`-Gate schlägt sonst fehl.

### Alternatives considered
Manuelle Aktualisierung → abgelehnt (fehleranfällig; Generator ist Single Source of Truth per Feature 034).
