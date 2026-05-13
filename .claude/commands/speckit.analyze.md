---
description: Perform a non-destructive cross-artifact consistency and quality analysis across spec.md, plan.md, and tasks.md after task generation.
---

## Dot-form wrapper

This file exists so users can type the dot-form slash command `/speckit.analyze`. The canonical implementation lives at:

**[`.claude/skills/speckit-analyze/SKILL.md`](../skills/speckit-analyze/SKILL.md)**

That skill is the 3-way-merged vanilla Spec Kit 0.8.8 version (settled in feature 032's Phase 2 upgrade). Follow it exactly.

If `User Input` (`$ARGUMENTS`) was provided to this command, pass it through to the skill.

## Why this is a wrapper

Feature 032's audit migrated the project's bespoke `.claude/commands/speckit.*.md` slash-command bodies to use the vanilla skill versions, removing ~1,680 LOC of divergence and one source of upgrade pain. The dot-form `.claude/commands/*.md` files are kept as **thin wrappers** so the project's docs (which use `/speckit.X` everywhere) continue to work; the dash-form `/speckit-X` invocations route directly to the skill. Both forms behave identically.
