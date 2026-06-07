# Implementation Plan: CSS-Refaktorierung — Konsistenz, Aufteilung, Linting

**Branch**: `036-css-refactor` | **Date**: 2026-05-29 | **Spec**: [spec.md](spec.md)

## Summary

`css/style.css` (2 088 Zeilen) wird in drei Phasen refaktoriert: (1) alle 85 hardcodierten Hex-Werte + 24 rgb/rgba/hsl-Instanzen werden durch CSS Custom Properties ersetzt, sodass Dark Mode und Admin-Theming lückenlos funktionieren; (2) die monolithische Datei wird in fünf komponentenspezifische Dateien aufgeteilt, jede mit ihren Dark-Mode-Überschreibungen am Ende; (3) Stylelint (`stylelint-config-standard` + Farb-Verbot-Regel) und HTMLHint `no-style-tag` werden als dauerhafte CI-Gates eingebaut, damit keine hardcodierten Farben zurückkehren.

## Technical Context

**Language/Version**: CSS3, HTML5, JavaScript ES2022 (package.json / CI-Skripte)
**Primary Dependencies**: `stylelint` + `stylelint-config-standard` (NEW, dev-only); `htmlhint` (existing dev); `@cyclonedx/cyclonedx-npm` (existing, SBoM-Regeneration nach neuem dep)
**Storage**: N/A
**Testing**: Playwright (existing UI tests als visuelle Regressionsgate); Vitest (keine neuen Unit-Tests nötig — reine CSS-Änderungen)
**Target Platform**: Moderne Browser (Chrome, Firefox, Safari) auf HTTP/2-Intranet
**Project Type**: Static SPA (kein Build-Step, kein Bundler)
**Performance Goals**: Page-Load-Delta durch `<link>`-Aufteilung < 50 ms (SC-005); messbar im Netzwerk-Wasserfall
**Constraints**: Kein `@import`, kein Build-Step; alle Stile in dedizierten CSS-Dateien; `<style>`-Blöcke in HTML verboten
**Scale/Scope**: 1 CSS-Datei → 5 CSS-Dateien; 85 Hex + 24 rgb/rgba/hsl → 0 hardcodierte Farbwerte; 0 Stylelint-Verstöße nach Phase 3

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Prinzip                 | Status  | Begründung                                                                                                                                                               |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I. Redmine API Contract | ✅ PASS | Keine API-Änderungen — rein CSS/Build-seitig                                                                                                                             |
| II. Calendar-First UX   | ✅ PASS | SC-006: Playwright-UI-Tests sind Regressionsgate; pixel-identische Ausgabe ist harter Blocker                                                                            |
| III. Test-First         | ✅ PASS | CSS-Migration hat keine testbare Business-Logik; Playwright-Screenshots sind die Regressionsharness. Stylelint-Regel SC-004 ist durch temporäre Testdatei verifizierbar. |
| IV. Simplicity & YAGNI  | ✅ PASS | `stylelint` + `stylelint-config-standard` sind eine einzige gerechtfertigte Abhängigkeit für einen dauerhaften CI-Gate. Complexity-Tracking-Eintrag folgt unten.         |
| V. Security by Default  | ✅ PASS | HTMLHint `no-style-tag` verhindert `<style>`-Blöcke, die CSP-Header umgehen könnten; keine neuen Sicherheitsrisiken eingebracht                                          |
| VI. Quality Gates       | ✅ PASS | Stylelint wird dem Quality-Gate _hinzugefügt_ (nicht umgangen); SQI-Metriken (JS-spezifisch) bleiben unverändert; htmlhint-Gate erhält eine neue Regel                   |

## Project Structure

### Documentation (this feature)

```text
specs/036-css-refactor/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (CSS-Variablen-Taxonomie)
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── css-architecture.md   # Phase 1 output (Komponenten-zu-Datei-Mapping)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
css/
├── base.css             # :root-Variablen, dark-mode-Variablen, html/body/a-Reset, Typografie
├── calendar.css         # FullCalendar-Overrides, .app-header, Wochen-Totals, Anomalie-Badges + Dark-Mode-Overrides
├── time-entry.css       # Time-Entry-Modal, Formular, Issue-Suche, Activity-Dropdown + Dark-Mode-Overrides
├── chatbot.css          # Chat-Panel, Nachrichten, AI-Typing, Voice-Input + Dark-Mode-Overrides
├── settings.css         # Settings-Seite, Konfig-Formular, Credentials-Block + Dark-Mode-Overrides
└── style.css            # DELETED (oder einzeiliger Stub mit Migrationshinweis)

index.html               # 1 <link> → 5 <link>-Tags (base, calendar, time-entry, chatbot, settings — in dieser Reihenfolge)
settings.html            # 1 <link> → 3 <link>-Tags (base, chatbot [für Toast], settings)
.htmlhintrc              # + "no-style-tag": true
package.json             # + stylelint dev-dep; lint-Script: eslint + stylelint
.stylelintrc.json        # NEU: stylelint-config-standard + color-no-hex + custom-property-pattern
.github/workflows/ci.yml # lint-Step: npm run lint && stylelint
sbom.json                # Regeneriert nach dep-Änderung
attributions.json        # Regeneriert nach dep-Änderung
```

**Structure Decision**: Option 1 (Single project) — statische SPA ohne Backend-Split. Alle Änderungen im Repo-Root.

## Complexity Tracking

| Violation                                                          | Why Needed                                                             | Simpler Alternative Rejected Because                                                                                                                |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stylelint-config-standard` (volles Preset) statt minimaler Config | Dauerhafte CSS-Qualität sicherstellen; Klarify-Entscheidung (Option B) | Minimale Config würde nur das Farb-Verbot erzwingen — alle anderen CSS-Fehler (Duplikate, ungültige Werte) blieben stumm und akkumulieren über Zeit |
