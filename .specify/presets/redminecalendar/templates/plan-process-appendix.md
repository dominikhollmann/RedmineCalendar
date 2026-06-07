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

### SQI-Gate Reminder

CI schlägt fehl bei SQI-Composite < 80. Vor dem Merge sicherstellen:

```bash
npm run sqi        # aktuellen Score prüfen
npm run lint       # ESLint: max-lines-per-function 60 (js/**), complexity 20 (scripts/**)
npm run typecheck  # JSDoc + tsc --noEmit
```
