# Tasks: CSS-Refaktorierung — Konsistenz, Aufteilung, Linting

**Input**: Design documents from `specs/036-css-refactor/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: Jede Phase schließt mit einem Verifikationsschritt ab. CSS-Änderungen werden durch Playwright-UI-Tests (visuelle Regression) und `grep`-Prüfungen (SC-001) gesichert. Stylelint-Regel wird per SC-004-Szenario (Testdatei mit Fehler → lint fails) verifiziert.

**Organisation**: 3 User Stories → 3 unabhängig testbare Phasen, aufbauend auf einer gemeinsamen Fundament-Phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelisierbar (verschiedene Dateien, keine Abhängigkeit auf laufende Tasks)
- **[Story]**: User Story aus spec.md (US1 = Theme-Konsistenz, US2 = Datei-Aufteilung, US3 = Linter)

---

## Phase 1: Setup

**Purpose**: Baseline dokumentieren und neue CSS-Variablen definieren, die alle User Stories benötigen

- [ ] T001 Baseline erfassen: `grep -rE '#[0-9a-fA-F]{3,8}|rgb\(|rgba\(' css/style.css | wc -l` ausführen und Ergebnis festhalten (Soll: 109 Instanzen); Screenshot Dark Mode + Light Mode als Vorher-Referenz
- [ ] T002 Neue CSS Custom Properties aus `specs/036-css-refactor/data-model.md` Abschnitt "Neue Variablen" in den `:root`-Block von `css/style.css` (nach Zeile 116) einfügen — 14 neue `--color-*`-Variablen (Overlays, Anomalie, Slate-Neutrale, Warning-Amber, soft-bg Light-Mode-Varianten)
- [ ] T003 Dark-Mode-Gegenstücke für alle 14 neuen Variablen in den `:root[data-theme='dark']`-Block von `css/style.css` (nach Zeile 186) einfügen — Werte aus `data-model.md` Spalte "Dark"

**Checkpoint**: Alle benötigten CSS-Variablen sind definiert; `css/style.css` hat noch keine hardcodierten Farbwerte ersetzt

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: Keine — Phase 1 ist das gesamte Fundament. User Stories können sequenziell direkt starten.

*(Diese Phase entfällt — Setup (Phase 1) liefert alle Voraussetzungen.)*

---

## Phase 3: User Story 1 — Theme und Dark Mode Konsistenz (P1) 🎯 MVP

**Goal**: Alle 85 Hex + 24 rgb/rgba-Instanzen in `css/style.css` durch `var(--*)` ersetzen; Dark Mode und Admin-Theming wirken lückenlos auf alle UI-Elemente.

**Independent Test**: Dark Mode aktivieren → kein einziges UI-Element zeigt noch einen hellen hardcodierten Farbwert. `grep -rE 'color:|background:|border:|outline:|box-shadow:' css/style.css | grep -E '#[0-9a-fA-F]{3,8}|rgb\(|rgba\('` → 0 Treffer.

- [ ] T004 [US1] Hardcodierte Farbwerte in `css/style.css` Zeilen 1–500 ersetzen: Reset, html/body/a, brand-logo, app-header, error-banner, loading-overlay, toast, overflow-indicators, FC-overrides-Start — gemäß Mapping-Tabelle in `specs/036-css-refactor/research.md`
- [ ] T005 [US1] Hardcodierte Farbwerte in `css/style.css` Zeilen 501–1000 ersetzen: FC-overrides-Ende, event-content, modal, confirmation-dialog, settings-page-Start — gemäß Mapping-Tabelle in `specs/036-css-refactor/research.md`
- [ ] T006 [US1] Hardcodierte Farbwerte in `css/style.css` Zeilen 1001–1500 ersetzen: settings-page-Ende, toolbar, view-mode-switch, working-hours-modal-row, clipboard-banner, lean-form, ArbZG-warnings, help-button, docs-panel-Start — gemäß Mapping-Tabelle in `specs/036-css-refactor/research.md`
- [ ] T007 [US1] Hardcodierte Farbwerte in `css/style.css` Zeilen 1501–2088 ersetzen: docs-panel-Ende, chatbot-button, chatbot-panel, AI-highlighted-fields, mobile-responsive, break-ticket, anomaly-badge, a11y-utilities, licenses-page — gemäß Mapping-Tabelle in `specs/036-css-refactor/research.md`
- [ ] T008 [US1] US1 verifizieren: (a) SC-001-Grep (`grep -rE 'color:|background:|border:|outline:|box-shadow:' css/style.css | grep -E '#[0-9a-fA-F]'` → 0 Treffer); (b) App starten (`npm run dev`), Dark Mode + Custom-Theme visuell prüfen — keine hellen Artefakte; (c) `npm run test:ui` → alle Playwright-Tests grün

**Checkpoint**: Dark Mode und Admin-Theming wirken auf 100 % der Farbflächen. US1 ist unabhängig demonstrierbar.

---

## Phase 4: User Story 2 — Komponentenweise CSS-Struktur (P2)

**Goal**: `css/style.css` (2088 Zeilen) wird in 5 Komponenten-Dateien aufgeteilt; alle ≤ 400 Zeilen; visuell identische Ausgabe.

**Independent Test**: `wc -l css/*.css` — kein File > 400 Zeilen. `npm run test:ui` → grün. `chatbot.css` entfernen → nur Chat-Panel beeinträchtigt.

- [ ] T009 [P] [US2] `css/base.css` erstellen: `:root`-Variablen (Zeilen 1–116), `:root[data-theme='dark']`-Block (117–186), html/body/a/brand-logo (187–197), error-banner (240–271), loading-overlay (272–298), toast (299–316), a11y-utilities (1947–1993) aus `css/style.css` — Reihenfolge und Inhalt exakt wie im Original
- [ ] T010 [P] [US2] `css/calendar.css` erstellen: app-header (198–232), calendar-container (233–239), overflow-indicators (317–357), FullCalendar-overrides (358–483), toolbar-right (805–812), view-mode-switch (813–876), working-hours-modal-row (877–888), clipboard-banner (889–916), ArbZG-warnings (1202–1235), break-ticket (1847–1866), anomaly-badge (1867–1946), mobile-responsive Kalender-Anteil (1664–1780) — Dark-Mode-Komponent-Overrides ans Ende
- [ ] T011 [P] [US2] `css/time-entry.css` erstellen: modal (484–630), confirmation-dialog (631–660), lean-form (917–1201), AI-highlighted-fields (1560–1663), mobile-responsive Formular-Anteil (1781–1846) — Dark-Mode-Komponent-Overrides ans Ende
- [ ] T012 [P] [US2] `css/docs.css` erstellen: help-button (1236–1256), docs-panel (1257–1389), chatbot-button (1390–1409), chatbot-panel (1410–1559) — Dark-Mode-Komponent-Overrides ans Ende
- [ ] T013 [P] [US2] `css/settings.css` erstellen: settings-page (661–737), welcome-banner (738–752), config-error (753–763), password-toggle (764–782), version-display (783–790), auth-method-toggle (791–804), licenses-page (1994–2088) — Dark-Mode-Komponent-Overrides ans Ende
- [ ] T014 [US2] `index.html` aktualisieren: `<link rel="stylesheet" href="css/style.css" />` ersetzen durch 5 `<link>`-Tags in Reihenfolge: base.css → calendar.css → time-entry.css → docs.css → settings.css (gemäß `specs/036-css-refactor/contracts/css-architecture.md`)
- [ ] T015 [US2] `settings.html` aktualisieren: `<link rel="stylesheet" href="css/style.css" />` ersetzen durch 3 `<link>`-Tags: base.css → docs.css → settings.css (gemäß `specs/036-css-refactor/contracts/css-architecture.md`)
- [ ] T016 [US2] `css/style.css` löschen (da vollständig migriert); falls externe Referenzen existieren: durch einzeiligen Stub-Kommentar ersetzen
- [ ] T017 [US2] US2 verifizieren: (a) `wc -l css/*.css` — kein File > 400 Zeilen; (b) `npm run test:ui` → alle grün; (c) `npm run htmlhint` → keine neuen Fehler; (d) visueller Vergleich App im Browser (Light + Dark) gegen Vorher-Screenshot aus T001

**Checkpoint**: CSS ist modular. Jede Komponenten-Datei ist eigenständig editierbar. US1 bleibt voll funktional.

---

## Phase 5: User Story 3 — Automatischer Linter (P3)

**Goal**: Stylelint (`stylelint-config-standard` + Farb-Verbot) und HTMLHint `no-style-tag` sind in `npm run lint` und CI integriert; alle bestehenden Stylelint-Verstöße behoben.

**Independent Test**: (a) `echo ".x { color: #ff0000; }" > /tmp/bad.css && npx stylelint /tmp/bad.css` → Exit-Code 1; `rm /tmp/bad.css && npm run lint` → Exit-Code 0. (b) `<style></style>` in HTML-Datei einfügen → `npm run htmlhint` schlägt fehl.

- [ ] T018 [US3] `stylelint` + `stylelint-config-standard` als dev-dependencies installieren: `npm install --save-dev stylelint stylelint-config-standard` — `package.json` + `package-lock.json` werden aktualisiert
- [ ] T019 [US3] `.stylelintrc.json` erstellen mit `"extends": ["stylelint-config-standard"]` + Regeln `"color-no-hex": true`, `"color-named": "never"`, `"function-disallowed-list": ["rgb", "rgba", "hsl", "hsla"]` — Ausnahmen für FullCalendar-Variable-Definitionen dokumentieren falls nötig
- [ ] T020 [US3] Alle Stylelint-Verstöße in `css/**/*.css` beheben: zunächst `npx stylelint --fix 'css/**/*.css'` (auto-fix), dann `npx stylelint 'css/**/*.css'` und verbleibende manuelle Fixes (Farb-Funktions-Notation, fehlende Leerzeilen etc.)
- [ ] T021 [US3] `package.json` `lint`-Script erweitern: `"lint": "eslint . && stylelint 'css/**/*.css'"` — `lint:fix`-Script analog ergänzen
- [ ] T022 [US3] `.htmlhintrc` erweitern: `"no-style-tag": true` hinzufügen
- [ ] T023 [US3] SBoM regenerieren nach dep-Änderung: `npm run oss:generate` → `sbom.json` + `attributions.json` aktualisiert; CI `oss:drift`-Gate bleibt grün
- [ ] T024 [US3] US3 verifizieren: (a) SC-004-Szenario ausführen (bad.css → fail, remove → pass); (b) `npm run lint` → grün; (c) `npm run htmlhint` → grün; (d) temporären `<style></style>` in `index.html` einfügen → `npm run htmlhint` fails; rückgängig machen

**Checkpoint**: Alle drei Quality-Gates (ESLint, Stylelint, HTMLHint) laufen in einem `npm run lint`-Aufruf. Neuer CI-Schritt ist aktiv.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finale Qualitätssicherung, CI-Integration bestätigen, CLAUDE.md aktualisieren

- [ ] T025 SC-005 Ladezeit-Delta messen: Browser DevTools Netzwerk-Wasserfall mit 5 `<link>`-Tags vs. alter Einzeldatei vergleichen; Delta dokumentieren (Soll: < 50 ms); bei Überschreitung: HTTP/2-Multiplexing-Konfiguration des Dev-Servers prüfen
- [ ] T026 Vollständige Quality-Pipeline ausführen: `npm run lint && npm run format:check && npm run htmlhint && npm run typecheck && npm run test:coverage && npm run sqi && npm run test:ui` — alle Schritte grün; SQI-Composite ≥ 80 (GREEN)
- [ ] T027 `CLAUDE.md` Recent-Changes-Eintrag für Feature 036 ergänzen: neue Technologien (`stylelint`, `stylelint-config-standard`), neue Dateien (`css/base.css`, `css/calendar.css`, `css/time-entry.css`, `css/docs.css`, `css/settings.css`), entfernte Datei (`css/style.css`)

---

## Dependencies & Execution Order

### Phase-Abhängigkeiten

- **Phase 1 (Setup)**: Keine Abhängigkeiten — sofort startbar
- **Phase 3 (US1)**: Erfordert Phase 1 abgeschlossen (T002, T003 — neue Variablen müssen existieren)
- **Phase 4 (US2)**: Erfordert Phase 3 abgeschlossen (US2 splittet die bereits refaktorierte Datei; Split vor Farb-Ersatz wäre doppelter Aufwand)
- **Phase 5 (US3)**: Unabhängig von Phase 3 und 4 — kann parallel zu US2 starten sobald Phase 1 abgeschlossen; aber Stylelint-Fix (T020) ist einfacher nach dem Split (kleinere Dateien)
- **Phase 6 (Polish)**: Erfordert alle User Stories abgeschlossen

### User Story Abhängigkeiten

- **US1 (P1)**: Startet nach Phase 1 (T002–T003) — keine Abhängigkeit auf US2/US3
- **US2 (P2)**: Startet nach US1 (arbeitet auf der bereits farb-bereinigten style.css)
- **US3 (P3)**: Kann nach Phase 1 parallel zu US2 begonnen werden; T020 (Stylelint-Fix) sollte nach US2 erfolgen (splittet Arbeit auf kleinere Dateien)

### Innerhalb User Story 1

- T002–T003 (Variablen definieren) → T004–T007 (ersetzen, sequenziell je Dateiabschnitt) → T008 (verifizieren)
- T004–T007 sind sequenziell da sie dieselbe Datei editieren

### Innerhalb User Story 2

- T009–T013 [P]: alle parallelisierbar (verschiedene Zieldateien)
- T014–T015: nach T009–T013 (benötigen die neuen Dateien)
- T016: nach T014–T015 (style.css erst löschen wenn beide HTML-Dateien umgestellt)
- T017: nach T016

### Parallele Möglichkeiten

- T009, T010, T011, T012, T013 → gleichzeitig ausführbar (je eine CSS-Zieldatei)
- T018–T022 (US3-Setup) → parallel zu US2 möglich, wenn zwei separate Arbeitsstränge

---

## Parallel Example: User Story 2 — Datei-Split

```
# Alle 5 Komponenten-Dateien gleichzeitig erstellen:
T009: Erstelle css/base.css      (Variablen + Reset)
T010: Erstelle css/calendar.css  (Kalender-Komponenten)
T011: Erstelle css/time-entry.css (Modal + Formular)
T012: Erstelle css/docs.css      (Chatbot + Docs)
T013: Erstelle css/settings.css  (Settings-Seite)
# Dann sequenziell: T014 → T015 → T016 → T017
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1: T001–T003 (Baseline + neue Variablen)
2. Phase 3: T004–T008 (alle hardcodierten Farben ersetzen)
3. **STOP und validieren**: Dark Mode + Custom Theme visuell prüfen, `npm run test:ui`
4. Demo: vollständig konsistentes Theming

### Inkrementelle Lieferung

1. Phase 1 + US1 → Theme-Konsistenz (MVP)
2. US2 → Modulare CSS-Struktur
3. US3 → Dauerhafter Linter-Gate
4. Jede Phase liefert eigenständig prüfbaren Mehrwert

---

## Notes

- T004–T007 editieren dieselbe Datei sequenziell — kein [P]-Marker
- T009–T013 erstellen verschiedene Dateien — alle [P]-markiert
- Commit nach jeder abgeschlossenen Phase (nicht nach jedem Task)
- T016 (style.css löschen) erst nach erfolgreichem T017-Check rückgängig machen falls Playwright-Tests fehlschlagen
- Keine Vitest-Unit-Tests nötig — CSS hat keine testbare Business-Logik; Playwright-Screenshots sind die Regressionsharness
- `sbom.json`-Regeneration (T023) ist Pflicht für CI `oss:drift`-Gate
