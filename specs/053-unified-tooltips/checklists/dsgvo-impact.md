## DSGVO Impact Checklist — Feature 053 (Unified Tooltips + Full-Text Event Hover)

**Checklist version**: 1.0 (specs/044-dsgvo-privacy-compliance/checklists/dsgvo-impact.md)
**Assessed by**: Claude Code
**Date**: 2026-06-27

| Question                             | Answer | Action taken                                                                                                      |
| ------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------- |
| Q1 — New personal data collection    | No     | n/a — the tooltip only re-presents event data already fetched and rendered on the chip; nothing new is collected. |
| Q2 — Changed purpose or legal basis  | No     | n/a — no change to how existing data is processed.                                                                |
| Q3 — New data recipient              | No     | n/a — fully client-side rendering; no new network calls or external systems.                                      |
| Q4 — Changed retention period        | No     | n/a — no persistence; tooltip text is built at render time and never stored (no new localStorage/IndexedDB keys). |
| Q5 — New or revised consent required | No     | n/a — no new processing requiring consent.                                                                        |

**Privacy notice update required**: No
**privacy.html updated (EN)**: N/A
**privacy.html updated (DE)**: N/A
