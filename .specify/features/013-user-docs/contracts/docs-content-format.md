# Contract: Documentation Source File Format

**Feature**: 013-user-docs | **Date**: 2026-04-17  
**Consumers**: `js/docs.js` (panel renderer), feature 014 AI chatbot (knowledge source)

This contract defines the format that `docs/content.en.md` and `docs/content.de.md` MUST conform to. Both the panel renderer and the AI chatbot depend on this structure for correct parsing.

---

## File Locations

| File | Locale |
|------|--------|
| `docs/content.en.md` | English (default/fallback) |
| `docs/content.de.md` | German (`de` locale) |

Both files MUST exist. Both MUST cover the same feature sections (FR-002).

---

## Required Sections (FR-002)

Both files MUST contain a section (`## ` heading) for each of the following:

1. Getting Started / Overview
2. Calendar Navigation
3. Time Entries (creating, editing, deleting)
4. Copy and Paste Time Entries
5. Working Hours View
6. Work Week / Full Week Toggle
7. Favourite Issues
8. ArbZG Compliance Indicators
9. Settings (Redmine URL and API key)
10. Keyboard Shortcuts *(MUST include a Markdown table — see below)*

Section order is not mandated but MUST be consistent between `en` and `de` files.

---

## Keyboard Shortcuts Table (FR-003)

The `## Keyboard Shortcuts` section MUST contain a Markdown table with at minimum:

```markdown
## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Click | Select time entry |
| Double-click / Enter | Open time entry for editing |
| Ctrl+C | Copy selected time entry |
| Del | Delete selected time entry |
| Escape | Close dialog / deselect |
```

Additional shortcuts may be added as the application evolves.

---

## Structural Invariants

```
# [Document Title]          ← exactly one per file
                            ← blank line
## [Feature Section]        ← one per feature area
                            ← blank line
[Content]                   ← paragraphs, lists, or sub-sections
                            ← blank line
## [Next Feature Section]
...
```

- **No raw HTML** inside content files.
- **No image references** (`![...](...)` syntax not supported by renderer).
- **No code fences** (` ``` ` blocks) — not required for user documentation.
- **No nested lists deeper than 2 levels**.
- All table rows MUST have the same number of columns as the header.
- The separator row in tables (`|---|---|`) MUST be present and have at least 3 dashes per cell.

---

## Encoding and Length Guidelines

| Property | Requirement |
|----------|-------------|
| Encoding | UTF-8, no BOM |
| Line endings | LF (`\n`) |
| File size | Target <15KB per file; hard limit 50KB |
| Section count | Minimum 10 sections (FR-002); no maximum |

---

## Extensibility

Adding a new feature section requires only adding a new `## Heading` block to both `content.en.md` and `content.de.md`. No code changes are required to `js/docs.js` — the renderer is content-agnostic. This satisfies the edge case: "How does the documentation handle future features being added?"
