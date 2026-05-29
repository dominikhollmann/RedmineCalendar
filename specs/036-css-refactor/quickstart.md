# Quickstart: Feature 036 — CSS-Refaktorierung

## Überblick

Dieses Feature wird in drei sequenziellen Phasen umgesetzt. Jede Phase kann unabhängig geprüft werden.

## Entwicklungssetup

```bash
git checkout 036-css-refactor
npm install   # stylelint + stylelint-config-standard werden in Phase 3 hinzugefügt
npm run dev   # HTTPS Dev-Server + CORS-Proxy starten
```

## Phase 1: Hardcodierte Farben ersetzen

**Ziel**: `grep -rE '#[0-9a-fA-F]{3,8}' css/` → 0 Treffer in Property-Werten

**Vorgehen**:
1. Neue Variablen aus `data-model.md` Abschnitt "Neue Variablen" in den `:root`-Block von `css/style.css` einfügen
2. Dark-Mode-Gegenstücke in `:root[data-theme='dark']`-Block ergänzen
3. Jeden hardcodierten Farbwert (Tabelle in `research.md`) durch sein `var(--)` Gegenstück ersetzen
4. Verifizieren: `grep -rE 'color:|background:|border:|outline:|box-shadow:' css/ | grep -E '#[0-9a-fA-F]{3,8}|rgb\(|rgba\('` → 0 Treffer

**Manuelle Prüfung**: App starten, Dark Mode aktivieren, alle UI-Bereiche sichten → keine hellen Farbinseln auf dunklem Hintergrund.

## Phase 2: Datei-Aufteilung

**Ziel**: 6 CSS-Dateien, jede ≤ 400 Zeilen; `css/style.css` entfernt

**Vorgehen** (genauer Inhalt in `contracts/css-architecture.md`):
1. `css/base.css` erstellen — `:root` Variablen + dark-mode Variablen + Reset
2. `css/calendar.css` erstellen — Kalender-Komponenten
3. `css/time-entry.css` erstellen — Time-Entry-Modal + Formular
4. `css/docs.css` erstellen — Chatbot + Docs-Panel + Help
5. `css/settings.css` erstellen — Settings-Seite + Lizenzen
6. `index.html`: 1 `<link>` → 5 `<link>`-Tags (Reihenfolge aus `contracts/css-architecture.md`)
7. `settings.html`: 1 `<link>` → 3 `<link>`-Tags
8. `css/style.css` löschen (oder Stub-Kommentar)
9. Playwright-Tests ausführen: `npm run test:ui` → alle grün

**Verifizierung der Dateigrößen**:
```bash
wc -l css/*.css
```
Kein File > 400 Zeilen.

## Phase 3: Stylelint + HTMLHint

**Ziel**: `npm run lint` erzwingt CSS-Qualität in CI

**Schritte**:

### 3a — Stylelint installieren
```bash
npm install --save-dev stylelint stylelint-config-standard
npm run oss:generate   # sbom.json + attributions.json regenerieren
```

### 3b — `.stylelintrc.json` anlegen
```json
{
  "extends": ["stylelint-config-standard"],
  "rules": {
    "color-no-hex": true,
    "color-named": "never",
    "function-disallowed-list": ["rgb", "rgba", "hsl", "hsla"]
  },
  "ignoreFiles": ["node_modules/**"]
}
```

### 3c — `package.json` lint-Script erweitern
```json
"lint": "eslint . && stylelint 'css/**/*.css'"
```

### 3d — HTMLHint `no-style-tag` aktivieren
In `.htmlhintrc` hinzufügen:
```json
"no-style-tag": true
```

### 3e — Alle stylelint-Verstöße beheben
```bash
npx stylelint --fix 'css/**/*.css'   # auto-fixbare Probleme (Leerzeilen, Spacing)
npx stylelint 'css/**/*.css'          # verbleibende manuelle Fixes anzeigen
```

### 3f — CI-Integration prüfen
```bash
npm run lint        # ESLint + Stylelint
npm run htmlhint    # HTMLHint inkl. no-style-tag
```

### 3g — SC-004 verifizieren
```bash
echo ".test { color: #ff0000; }" > /tmp/test-bad.css
npx stylelint /tmp/test-bad.css   # → Exit-Code 1 erwartet
rm /tmp/test-bad.css
npm run lint                       # → Exit-Code 0 erwartet
```

## Commit-Strategie

| Phase | Commit-Nachricht |
|---|---|
| Phase 1 vollständig | `T001: replace hardcoded colors with CSS custom properties` |
| Phase 2 vollständig | `T002: split style.css into per-component files` |
| Phase 3 vollständig | `T003: add stylelint + htmlhint no-style-tag CI gate` |

## Wichtige Dateipfade

| Datei | Beschreibung |
|---|---|
| `specs/036-css-refactor/data-model.md` | Vollständige Variable-Taxonomie + neue Variablen |
| `specs/036-css-refactor/research.md` | Mapping hardcodierter Werte → CSS-Variablen |
| `specs/036-css-refactor/contracts/css-architecture.md` | Komponenten-zu-Datei-Mapping + link-Reihenfolge |
| `css/style.css` | Ausgangsdatei (wird in Phase 2 aufgeteilt) |
| `.stylelintrc.json` | Stylelint-Config (wird in Phase 3 angelegt) |
| `.htmlhintrc` | HTMLHint-Config (wird in Phase 3 erweitert) |
