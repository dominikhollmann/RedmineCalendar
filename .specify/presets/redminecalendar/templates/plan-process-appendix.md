---

## Process Reminder

*Dieser Abschnitt wird via Preset-Composition an jeden Plan angehängt. Änderungen: `.specify/preset-sources/redminecalendar/templates/plan-process-appendix.md`*

### Constitution Check Pflicht-Gates

Folgende Constitution-Prinzipien **müssen** im Constitution-Check-Abschnitt dieses Plans explizit adressiert sein:

| Prinzip | Leitfrage |
|---------|-----------|
| **I — Redmine API Contract** | Wird ausschließlich die offizielle REST API verwendet? Kein direkter DB-Zugriff? |
| **II — Calendar-First UX** | Wird die Kalender-Nutzbarkeit nicht beeinträchtigt? Rendering < 300 ms? |
| **III — Test-First TDD** | Sind Tests vor der Implementierung definiert (Red-Green-Refactor)? |
| **IV — Simplicity / YAGNI** | Ist jede neue Abhängigkeit mit konkretem Bedarf begründet? |
| **V — Security by Default** | Sind alle externen Daten validiert? Credentials verschlüsselt? XSS-Escaping? |
| **VI — Continuous Quality Gates** | Wird das CI-Gate-Protokoll eingehalten? SQI ≥ 80 nach Implementierung? |
| **VII — Reuse Before Reimplementation** | Wurde nach vorhandener Abstraktion gesucht? Wird statt Kopie wiederverwendet oder extrahiert? |

### Wiederverwendungs-Audit (Pflicht im Plan)

Jeder Plan **muss** in den entsprechenden Phasen explizit angeben:

- **Berührte Module**: Welche bestehenden `js/*.js`-Module oder Utilities berührt/erweitert dieses Feature? (Mit Pfaden.)
- **Wiederverwendet vs. Neu**: Was wird *wiederverwendet* (importiert, extended) vs. *neu erstellt* — und bei Neuem: warum passt keine vorhandene Abstraktion?
- **Parallel-Capability**: Entsteht eine zweite Variante einer bestehenden Capability (z.B. weitere `planning-view-*`-Quelle, zweiter API-Client, zweite Benachrichtigungslogik)? → Verweis auf das gemeinsame Base-Modul zwingend.

Undokumentierte Doppelung ist ein Verstoß gegen Constitution VII (Anti-Gaming — wie IV/VI).

### SQI-Gate Reminder

CI schlägt fehl bei SQI-Composite < 80. Vor dem Merge sicherstellen:

```bash
npm run sqi        # aktuellen Score prüfen
npm run lint       # ESLint: max-lines-per-function 60 (js/**), complexity 20 (scripts/**)
npm run typecheck  # JSDoc + tsc --noEmit
npm run dup:check  # Duplikat-Baseline-Ratchet (schlägt fehl bei neuen Clones > Baseline)
```

### UI-Test-Iteration (Playwright)

Das vollständige UI-Testsuite (`npm run test:ui`, 128 Tests, ~5 min) nur am Anfang und Ende einer Implementierungsphase ausführen. Während der Iteration:

```bash
npm run test:ui             # Einmalig — Baseline-Fehlerliste ermitteln
npm run test:ui:failed      # Wiederholt — nur fehlgeschlagene Tests erneut ausführen (Sekunden)
npm run test:ui             # Einmalig am Ende — volles Suite bestätigen, bevor letzter Commit
```

Der Pre-Push-Hook ist intelligent: Commits, die nur `specs/`, `docs/` oder `*.md`-Dateien berühren (Plan/Spec/Tasks), laufen nur durch lint + format + typecheck (~10 s). Code-Commits (`.js/.css/.html`) laufen durch die vollständige `ci:local`-Pipeline (~1 min).
