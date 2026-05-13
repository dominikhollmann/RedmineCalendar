# In-flight feature regression check (T056b)

**Run date**: 2026-05-13
**Reference**: FR-012 + tasks.md T056b

Check goal: confirm that the 6 in-flight features at the time of BACKLOG migration (022, 027, 028, 029, 030, 031) have correctly-labelled GitHub Issues AND that their `quickstart.md` files parse cleanly under the new `/speckit.uat.run` extension.

## Results

| Feature                            | Issue # | Status label     | Matches expected BACKLOG state?       | `quickstart.md` present?                               | UAT-checkbox count (`- [ ]`/`- [x]`) | Verdict            |
| ---------------------------------- | ------- | ---------------- | ------------------------------------- | ------------------------------------------------------ | ------------------------------------ | ------------------ |
| 022 — AI Production Quality        | #44     | `status:clarify` | ✓ (BACKLOG had clarify=✓, plan=⬜)    | no — feature only at `clarify`, no plan/quickstart yet | n/a                                  | **PASS**           |
| 027 — Weekly Hours Target Tracking | #43     | `status:tasks`   | ✓ (BACKLOG had tasks=✓, implement=⬜) | yes                                                    | 0                                    | **PASS w/ caveat** |
| 028 — Bulk Multi-Select            | #42     | `status:tasks`   | ✓                                     | yes                                                    | 0                                    | **PASS w/ caveat** |
| 029 — Anomaly Detection            | #41     | `status:tasks`   | ✓                                     | yes                                                    | 0                                    | **PASS w/ caveat** |
| 030 — Dark Mode                    | #40     | `status:tasks`   | ✓                                     | yes                                                    | 0                                    | **PASS w/ caveat** |
| 031 — Fluent 2 UI Redesign         | #39     | `status:tasks`   | ✓                                     | yes                                                    | 0                                    | **PASS w/ caveat** |

## Caveat noted (not a regression introduced by feature 032)

The 027–031 `quickstart.md` files use **numbered-list step format** (e.g. `### S1.`, `1.`, `2.`, `3.`) rather than Markdown checkbox format (`- [ ]` / `- [x]`). The new `/speckit.uat.run` extension command (Phase 4) — like the original `/speckit.uat` skill it replaced — scans for `- [ ]` items in §3 of its outline. With zero such items, the run would report "all tests already marked as passed" and offer to re-run a section.

**Same gap existed pre-feature-032** — the original `.claude/commands/speckit.uat.md` also looked for `- [ ]` items. This is a quickstart-authoring-style mismatch, not a workflow regression introduced by the audit. Authors of new features should follow the checkbox style if they want full `/speckit.uat.run` walkthrough automation; existing numbered-list quickstarts continue to work as a human-followed script.

Action: documented in `CONTRIBUTING.md` (handover team will pick a single convention going forward).

## Conclusion

All 6 in-flight features have correctly-labelled, correctly-cross-referenced Issues. Status-label transitions on them at the next `/speckit.plan` / `/speckit.tasks` / `/speckit.implement` invocation will work through the `after_*` hooks. **No regression — FR-012 satisfied.**
