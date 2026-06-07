# Feature Specification: CSS-Refaktorierung — Konsistenz, Aufteilung, Linting

**Feature Branch**: `036-css-refactor`
**Created**: 2026-05-29
**Status**: Draft
**GitHub Issue**: #121

## Überblick

Alle Farbwerte in der Anwendung müssen über CSS-Variablen gesteuert werden, damit Dark Mode und Custom-Theming lückenlos funktionieren. Die gesamte Gestaltung liegt derzeit in einer einzigen, 2 000-zeiligen Datei, die schwer zu navigieren ist und bei paralleler Entwicklung zu Merge-Konflikten führt. Ein automatischer Stilprüfer soll sicherstellen, dass keine hardcodierten Farbwerte neu eingeführt werden.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Vollständig konsistentes Theme und Dark Mode (Priority: P1)

Als Entwickler oder Nutzer wechsle ich zwischen Light Mode, Dark Mode und einem Custom-Unternehmenstheme. Ich erwarte, dass **alle** sichtbaren Farbflächen — Hintergründe, Texte, Rahmen, Badges, Warnfarben, Chatbot-Elemente — die jeweilige Theme-Palette widerspiegeln, ohne einzelne Stellen manuell nachpflegen zu müssen.

**Why this priority**: Dark Mode (030) und Theming (031) sind bereits ausgeliefert, wirken aber nur auf Elemente, die CSS-Variablen verwenden. Hardcodierte Farben sind von Themeänderungen ausgenommen und erzeugen visuelle Inkonsistenz — das ist ein ausgelieferter Fehler.

**Independent Test**: Dark Mode einschalten → alle 85 bisher hardcodierten Farbstellen müssen die Dark-Mode-Palette zeigen (kein sichtbarer weißer oder heller Fleck in dunklem Layout). Custom-Unternehmensfarbe setzen → `brandPrimary` taucht ohne Ausnahme an allen Primärfarbstellen auf.

**Acceptance Scenarios**:

1. **Given** Dark Mode ist aktiv, **When** die Anwendung geladen wird, **Then** zeigen alle Hintergründe, Texte und Rahmen ausschließlich Dark-Mode-Farben — kein Element verwendet einen hart kodierten hellen Wert.
2. **Given** ein Admin setzt `brandPrimary` in `config.json`, **When** die Seite neu geladen wird, **Then** übernehmen alle Schaltflächen, Akzentlinien und interaktiven Elemente die neue Markenfarbe ohne Ausnahme.
3. **Given** alle drei Modi gleichzeitig getestet (Light / Dark / Custom), **When** zwischen ihnen umgeschaltet wird, **Then** gibt es keine Farbmismatches — Farben, die im vorherigen Modus sichtbar waren, sind vollständig überschrieben.

---

### User Story 2 — Komponentenweise CSS-Struktur (Priority: P2)

Als Entwickler, der die Darstellung des Chatbot-Panels anpassen möchte, öffne ich eine dedizierte `chatbot.css`-Datei und finde alle zugehörigen Stile an einem Ort, ohne 2 000 Zeilen zu durchsuchen.

**Why this priority**: Trennbare CSS-Dateien reduzieren Merge-Konflikte und machen die Zuordnung Datei ↔ Komponente offensichtlich. Sie setzen die bereits etablierte Modularität der JS-Dateien (`chatbot.js`, `calendar.js` …) konsequent fort.

**Independent Test**: Eine Stildatei (`time-entry.css`) ändern und visuell prüfen, dass nur das Time-Entry-Modal beeinflusst wird und der Rest der App unverändert bleibt.

**Acceptance Scenarios**:

1. **Given** die Anwendung ist geladen, **When** ein Entwickler `chatbot.css` entfernt, **Then** ist nur das Chat-Panel visuell beeinträchtigt — alle anderen Oberflächen bleiben intakt.
2. **Given** alle CSS-Dateien zusammen eingebunden sind, **When** die Anwendung im Browser geöffnet wird, **Then** ist das visuelle Ergebnis identisch mit dem vorherigen Einzel-CSS-Stand (keine Regression).
3. **Given** ein neues UI-Feature wird entwickelt, **When** CSS hinzugefügt wird, **Then** existiert eine eindeutige Zieldatei — es gibt keine „wo soll das hin?"-Unklarheit.

---

### User Story 3 — Automatischer Linter blockiert neue Hardcoded-Farben (Priority: P3)

Als Entwickler, der versehentlich `color: #ff0000` schreibt, erhalte ich sofort eine Fehlermeldung im Terminal (und in CI), bevor der Code den Branch verlässt.

**Why this priority**: Ohne automatische Durchsetzung schleichen sich hardcodierte Werte wieder ein. Der Linter macht die Regel unumgehbar.

**Independent Test**: Eine Datei mit `background: #abc123` temporär anlegen → `npm run lint` schlägt fehl. Datei entfernen → `npm run lint` ist grün.

**Acceptance Scenarios**:

1. **Given** eine CSS-Datei enthält einen hardcodierten Hex-Wert, **When** `npm run lint` ausgeführt wird, **Then** bricht der Lauf mit einer klaren Fehlermeldung ab.
2. **Given** ausschließlich CSS-Variablen (`var(--*)`) für Farben verwendet werden, **When** `npm run lint` ausgeführt wird, **Then** ist der Lauf erfolgreich.
3. **Given** ein Pull-Request wird geöffnet, **When** CI läuft, **Then** schlägt der Lint-Schritt bei neu eingeführten hardcodierten Farben fehl und verhindert den Merge.

---

### Edge Cases

- Was passiert, wenn eine CSS-Variable in Dark Mode **nicht** überschrieben ist? → Sie muss einen sinnvollen Light-Mode-Fallback haben; fehlt dieser, ist das ein Spec-Fehler.
- Was passiert bei Farben in Inline-Styles in HTML oder JavaScript (nicht CSS)? → Scope dieser Spec ist ausschließlich CSS-Dateien; JS-seitige Inline-Styles sind Out-of-scope und werden in einem separaten Ticket erfasst, falls vorhanden.
- Was passiert, wenn der Admin `brandPrimary` nicht konfiguriert? → Der System-Default (bestehende Primärfarbe) gilt unverändert — kein visueller Bruch.
- Was passiert, wenn `@import` zwischen CSS-Dateien Ladereihenfolge beeinflusst? → `@import` wird **nicht** verwendet; Reihenfolge wird ausschließlich über `<link>`-Tags in HTML gesteuert.
- Was passiert mit CSS in SVG-Dateien oder Third-Party-Widgets (FullCalendar)? → Third-Party-Override-Blöcke landen in der Zieldatei, die zur Komponente gehört; FullCalendar-Overrides bleiben in `calendar.css`.

---

## Requirements _(mandatory)_

### Functional Requirements

**Phase 1 — Hardcodierte Farben eliminieren**

- **FR-001**: Alle hardcodierten Farbwerte (Hex, `rgb()`, `rgba()`, `hsl()`) in `css/style.css` MÜSSEN durch Referenzen auf CSS Custom Properties ersetzt werden.
- **FR-002**: Neue Custom Properties MÜSSEN so definiert sein, dass sie **relativ zu den bestehenden Basis-Variablen** (`--brand-primary`, `--brand-accent`, `--background`, `--surface`, `--text` o. Ä.) berechnet oder abgeleitet werden, sodass Themeänderungen automatisch propagieren.
- **FR-003**: Der bestehende `[data-theme="dark"]`-Block MUSS alle Farbvariablen vollständig überschreiben — kein Element darf im Dark Mode einen Light-Mode-Farbwert anzeigen.
- **FR-004**: Die Admin-konfigurierbaren Theme-Variablen (`brandPrimary`, `brandAccent`, `brandLogoUrl`, `brandFontFamily` aus Feature 031) MÜSSEN als Eintrittspunkte erhalten bleiben und alle abgeleiteten Variablen steuern.
- **FR-005**: Nach Abschluss von Phase 1 DARF keine CSS-Datei der Anwendung einen hardcodierten Farbwert enthalten (verifizierbar per `grep`). `<style>`-Blöcke in HTML-Dateien sind generell verboten — alle Stile MÜSSEN in dedizierten CSS-Dateien liegen.

**Phase 2 — Komponentenweise Dateiaufteilung**

- **FR-006**: `css/style.css` MUSS in mindestens fünf logische Dateien aufgeteilt werden: `base.css` (Reset, Variablen, Typografie), `calendar.css` (FullCalendar-Overrides und Kalenderansicht), `time-entry.css` (Time-Entry-Modal und Formular), `chatbot.css` (Chat-Panel und Nachrichten), `settings.css` (Settings-Seite).
- **FR-007**: Dark-Mode-Überschreibungen (`[data-theme="dark"]`) MÜSSEN am Ende der jeweiligen Komponenten-Datei platziert werden (z. B. alle Dark-Mode-Regeln für den Kalender am Ende von `calendar.css`). Es gibt keine separate `dark-mode.css`. Diese Konvention stellt sicher, dass Light-Mode- und Dark-Mode-Regeln einer Komponente immer in derselben Datei stehen.
- **FR-008**: Die Dateien MÜSSEN über `<link>`-Tags in `index.html` und `settings.html` eingebunden werden — kein Build-Step, kein CSS-`@import`.
- **FR-009**: Das visuelle Erscheinungsbild der Anwendung MUSS nach der Aufteilung pixel-identisch zum Zustand vor der Aufteilung sein (verifizierbar durch Playwright-Screenshot-Vergleich oder manuelle Inspektion).
- **FR-010**: Die Originaldatei `css/style.css` MUSS nach erfolgreicher Migration entfernt oder auf einen einzeiligen Kommentar reduziert werden, der auf die neue Struktur verweist.

**Phase 3 — Stylelint-Integration**

- **FR-011**: Stylelint MUSS als Dev-Dependency installiert werden, mit `stylelint-config-standard` als Basis-Preset. Alle durch das Standard-Preset aufgedeckten bestehenden Verstöße MÜSSEN im Rahmen von Phase 3 behoben werden — kein Grandfathering per `disable`-Kommentar für Standardregeln.
- **FR-012**: Zusätzlich zum Standard-Preset MUSS eine explizite Regel hardcodierte Farbwerte (`#rrggbb`, `#rgb`, `rgb()`, `rgba()`, `hsl()`, `hsla()`) als Fehler markieren. Erlaubt sind ausschließlich `var(--*)`, `transparent`, `currentColor` und `inherit`/`initial`/`unset`.
- **FR-013**: Stylelint MUSS in den CI-Lint-Schritt integriert sein (`.github/workflows/ci.yml`) und bei Verstößen mit Exit-Code ≠ 0 abbrechen.
- **FR-014**: Bestehende Stylelint-Ausnahmen (z. B. für FullCalendar-Override-Kommentare) MÜSSEN dokumentiert und minimal gehalten werden.
- **FR-015**: `<style>`-Blöcke in HTML-Dateien MÜSSEN durch HTMLHint (`"no-style-tag": true` in `.htmlhintrc`) verboten sein. Der bestehende `npm run htmlhint`-Schritt erzwingt diese Regel bereits in CI.

### Key Entities

- **CSS Custom Property**: Eine benannte Variable (`--name: value`) im `:root`-Block oder einem Theme-Selektor; steuert Farben anwendungsweit.
- **Theme-Schicht**: Der `[data-theme="dark"]`-Selektor sowie die admin-konfigurierbaren `brandPrimary`/`brandAccent`-Einstiegspunkte aus Feature 031; beide überschreiben `:root`-Defaults.
- **Komponenten-CSS-Datei**: Eine eigenständige CSS-Datei, die ausschließlich Stile einer logischen UI-Komponente enthält (kein Scope-Overflow in andere Bereiche).

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Nach Phase 1 enthält **keine Komponenten-CSS-Datei** einen hardcodierten Farbwert; jeder Farbwert wird über ein `var(--…)`-Token bezogen. Einzige Ausnahme ist der zentrale Token-Definitionsblock in `css/base.css` (`:root` + `:root[data-theme='dark']`), in dem die Literale per `/* stylelint-disable color-no-hex, color-named, function-disallowed-list */` bewusst gehalten werden. Durchgesetzt durch Stylelint (`color-no-hex`, `color-named`, `function-disallowed-list`).
- **SC-002**: Im Dark Mode sind **alle** Farbflächen sichtbar korrekt umgestellt — manuelle Inspektion oder automatisierter Screenshot-Vergleich zeigt keine hellen Artefakte auf dunklem Hintergrund.
- **SC-003**: Einheitliche Modulgrößen-Policy über `js/**`, `scripts/**` und `css/**`, gemessen in **effektiven Zeilen** (Leer- und Kommentarzeilen ausgeschlossen, identisch zur eslint-`max-lines`-Zählung mit `skipBlankLines + skipComments`): **weicher** Schwellwert 500 (geht in die SQI-`moduleSize`-Metrik ein) und **harter** Schwellwert 600 (CI-/Test-Fehler via `tests/unit/module-size.test.js`). Nach Phase 2 liegt jede CSS-Datei unter dem harten 600-Limit (von vorher 2 088 Zeilen in einer Datei).
- **SC-004**: `npm run lint` schlägt nach Phase 3 fehl, wenn eine Test-CSS-Datei mit einem hardcodierten Farbwert eingeführt wird — und ist grün, sobald die Datei entfernt wird.
- **SC-005**: Die Gesamtladezeit der Seite (Netzwerk-Wasserfall) erhöht sich durch die Dateiaufteilung um weniger als 50 ms gegenüber dem Baseline-Stand (HTTP/1.1-Einzel-Request vs. parallele `<link>`-Requests unter HTTP/2 sind vergleichbar).
- **SC-006**: Kein Playwright-UI-Test schlägt nach der Migration fehl (visuelle Regression gilt als Blocker).

---

## Clarifications

### Session 2026-05-29

- Q: Wo landen Dark-Mode-Überschreibungen (`[data-theme="dark"]`) — pro Komponenten-Datei am Ende, oder in einer zentralen `dark-mode.css`? → A: Pro Komponenten-Datei am Ende (keine separate `dark-mode.css`).
- Q: Sollen `<style>`-Blöcke in HTML-Dateien erlaubt oder generell verboten sein? → A: Verboten — alle Stile müssen in dedizierten CSS-Dateien liegen; HTMLHint (`no-style-tag`) erzwingt das.
- Q: Stylelint-Basis-Config: minimale eigene Config nur mit Farb-Verbot, oder `stylelint-config-standard` als vollständiges Preset? → A: `stylelint-config-standard` als Basis; alle dadurch aufgedeckten Verstöße werden in Phase 3 behoben (kein Grandfathering).

---

## Assumptions

- Dark Mode (Feature 030) und Fluent2-Theming (Feature 031) sind vollständig implementiert und in `main` gemergt. Die bestehenden Theme-Variablen dienen als Ausgangspunkt — sie werden nicht umbenannt.
- Die Anwendung läuft auf HTTP/2 in Production (Unternehmens-Intranet), sodass parallele `<link>`-Requests keine Leistungseinbuße bedeuten.
- Inline-Styles in HTML oder JavaScript-generierten DOM-Elementen sind **nicht** Bestandteil dieser Spec; sie werden separat adressiert, falls relevant.
- FullCalendar-CDN-eigene Styles werden nicht verändert — nur die projekt-eigenen Override-Regeln werden umstrukturiert.
- `npm run lint` umfasst nach dieser Änderung sowohl ESLint (JS) als auch Stylelint (CSS) in einem einzigen Aufruf.
- Bestehende Playwright-Tests dienen als Regressionsgate für Phase 2; neue Screenshot-Tests werden nicht explizit gefordert, können aber in der Planungsphase ergänzt werden.
