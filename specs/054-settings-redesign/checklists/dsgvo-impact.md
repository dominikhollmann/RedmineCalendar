## DSGVO Impact Checklist — Feature 054 (Settings Page Redesign)

**Checklist version**: 1.0 (specs/044-dsgvo-privacy-compliance/checklists/dsgvo-impact.md)
**Assessed by**: Claude Code
**Date**: 2026-06-29

| Question                             | Answer | Action taken                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1 — New personal data collection    | No     | The redesign only reorganises existing controls. No new personal data is collected, inferred, or derived.                                                                                                                                                                                                                                                                          |
| Q2 — Changed purpose or legal basis  | No     | Processing purposes and legal bases for credentials, working hours, and planning data are unchanged.                                                                                                                                                                                                                                                                               |
| Q3 — New data recipient              | No     | The connection check reuses the existing `getCurrentUser()` (`/users/current.json`) Redmine call. No new external recipient.                                                                                                                                                                                                                                                       |
| Q4 — Changed retention period        | No     | One new localStorage key is added — `redmine_calendar_planning_source_order` — but it stores only a non-personal UI preference (planning-source column order, e.g. `["outlook","teams"]`). It contains no personal data and is now cleared by `deletePlanningData()` (added to `PLANNING_PREF_KEYS` in `js/privacy-store.js`). No retention change for any personal-data category. |
| Q5 — New or revised consent required | No     | The AI planning-consent scope is unchanged. The existing delete-planning-data and consent withdraw/grant controls are moved into the new "Daten & Datenschutz" danger-zone card without behavioural change.                                                                                                                                                                        |

**Privacy notice update required**: No
**privacy.html updated (EN)**: N/A
**privacy.html updated (DE)**: N/A

**Notes**: The redesign converts the Settings page to a grouped, card-based layout with instant-apply controls, an explicit Redmine connection flow, and reorderable planning sources. All data-processing behaviour is preserved; the only persistence change is a non-personal column-order preference that is covered by the existing planning-data deletion flow.
