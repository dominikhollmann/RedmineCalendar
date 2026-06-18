---

## Quality Gate Checklist

*Dieser Abschnitt wird via Preset-Composition an jede Spec angehängt (nicht im spec-template.md selbst). Änderungen: `.specify/preset-sources/redminecalendar/templates/spec-quality-gate-appendix.md`*

### Vor dem Weitergang zu `/speckit-plan`

- [ ] Alle `[NEEDS CLARIFICATION]`-Marker aufgelöst (oder via `/speckit-clarify` bearbeitet)
- [ ] User Stories haben P1/P2/P3-Priorität und sind **unabhängig testbar**
- [ ] Acceptance Scenarios im Given/When/Then-Format vorhanden
- [ ] Kein direkter Datenbankzugriff — ausschließlich Redmine REST API (**Constitution I**)
- [ ] Keine Hardcoded Credentials — alle API-Keys über `config.json` oder verschlüsseltes localStorage (**Constitution V**)
- [ ] Neue Abhängigkeiten begründet (YAGNI — **Constitution IV**)
- [ ] Ähnelt das Feature bestehender Funktionalität? → vorhandene Module/Utilities identifiziert, Wiederverwendung statt Neubau eingeplant (**Constitution VII**)
- [ ] Feature ist user-facing? → `docs/content.en.md` + `docs/content.de.md` müssen aktualisiert werden (wird bei UAT als Hardgate erzwungen — besser jetzt schon einplanen)

### Spec Kit Workflow Reminder

```bash
# Einzelne Phasen manuell:
# /speckit-specify → /speckit-clarify → /speckit-plan → /speckit-tasks → /speckit-implement → /speckit-uat-run

# Oder als vollständige Pipeline mit Gates:
specify workflow run speckit --input spec="<feature-beschreibung>"
specify workflow resume <run_id>   # nach jedem Gate
```
- [ ] Neue `js/*.js`-Module geplant? → `js/knowledge.topics.json` muss aktualisiert werden (CI-Gate: `npm run knowledge:check`)
