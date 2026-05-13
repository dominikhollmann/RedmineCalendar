## Summary

<!-- One or two sentences: what changed, and why. -->

## Related

<!-- Link the BACKLOG.md feature, Spec Kit folder (specs/NNN-…), or issue. -->

- Feature: `specs/NNN-…`
- Issue: #

## Type

- [ ] Feature (Spec Kit flow completed: specify → plan → tasks → implement → uat)
- [ ] Bug fix
- [ ] Refactor / chore (no user-visible change)
- [ ] Docs only
- [ ] Process / tooling (`.claude/`, `.specify/`, CI, scripts/) — may target `main` directly

## Checklist

- [ ] Branch follows `NNN-short-name` naming (or is a process-only change targeting `main`)
- [ ] All user-visible strings go through `t('key')` in `js/i18n/{en,de}.js`
- [ ] Tests added or updated (Vitest unit + Playwright UI as appropriate)
- [ ] `npm run lint && npm run format:check && npm run typecheck && npm test` all green locally
- [ ] `npm run sqi` shows no regression vs. `main` (composite ≥ current band)
- [ ] UAT completed for feature work — `quickstart.md` items checked off
- [ ] `BACKLOG.md` updated (move to **Done** once UAT passes)
- [ ] CHANGELOG.md `[Unreleased]` entry added for user-visible change

## Test plan

<!-- How a reviewer can verify this. Bulleted manual steps + which automated tests cover it. -->

- [ ]
- [ ]
