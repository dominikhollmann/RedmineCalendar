# Phase 1 Data Model: Pre-Handover Cleanup and Quality-Bar Tightening

**Feature**: 035-handover-readiness
**Date**: 2026-05-19
**Status**: N/A — no new data entities, no state transitions, no persistent storage changes.

This feature is internal-quality work. It modifies code structure, lint configuration, CI workflows, and the SQI scoring algorithm, but introduces no new business-domain entities and changes no existing data shape.

## Touched entities (existing — for reference only, not redefined)

The implementation interacts with these existing entities; their shape is unchanged by this feature:

- **Redmine Time Entry** — `fetchTimeEntryById`'s return shape (`{ id, hours, comments, project, issue, activity, ... }`) is unchanged. Only the _error path_ changes from silent-null to throwing `RedmineError`, which is a contract change (recorded in [`contracts/redmine-api-error-surface.md`](contracts/redmine-api-error-surface.md)), not a data-model change.
- **`RedmineError`** — existing class in `js/redmine-api.js:35-105`. No new fields, no new subclasses. One additional throw site (the modified `fetchTimeEntryById`).
- **SQI report** (`coverage/sqi.json`) — the JSON shape produced by `scripts/sqi.mjs` is preserved (`{ composite, band, weights, bands, metrics: [...] }`). The `bands.moduleSize` value changes shape internally to the two-input scorer described in Decision 3 of [`research.md`](research.md); the _outer_ JSON contract for downstream consumers is unchanged because there are none — only humans read this file via the dashboard.

## No new entities

The feature is exhaustively described by:

- 11 cleanup operations on existing code
- 1 new devDependency (`@types/node`)
- 4 configuration tightenings (ESLint rules, SQI band, SQI threshold, CI workflow alignment)
- 2 documentation updates (CLAUDE.md, constitution.md)
- 2 new sibling JavaScript modules under `js/` (function exports only, no data classes)

Per the plan template, the data-model artifact is created for visibility into Phase 1's completeness checklist but contains no entity definitions. The next planning artifact ([`quickstart.md`](quickstart.md)) defines the UAT verification flow.
