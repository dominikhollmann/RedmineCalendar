# DSGVO Impact Checklist

**Feature**: 044-dsgvo-privacy-compliance | **Version**: 1.0 | **Date**: 2026-06-18

**Purpose**: Any future feature that touches data processing MUST work through this checklist before the PR is merged. If any answer is "Yes", the implementer MUST update `privacy.html` (DE + EN content) and the data inventory section before the PR is reviewed.

**Reference**: FR-014 / FR-015 in `specs/044-dsgvo-privacy-compliance/spec.md`. Referenced in CLAUDE.md "Housekeeping" section.

---

## How to Use

1. Copy the **Instance Block** below into your feature's `specs/<NNN>-<name>/checklists/` directory (file name: `dsgvo-impact.md`), or paste a completed instance directly into your PR description.
2. Answer each trigger question honestly.
3. If any answer is "Yes", complete the "Required Actions" section before requesting review.
4. Link the completed checklist in your PR body.

---

## Trigger Questions

Work through these five questions for every PR that touches application code:

### Q1 — New personal data collection

> Does this feature collect, receive, infer, or derive any personal data that is not already documented in `privacy.html`?

Personal data includes but is not limited to: names, email addresses, calendar events, presence/activity signals, communication metadata (Teams partners, timestamps), device identifiers, IP addresses, work-schedule inferences, or any data that can identify a natural person directly or indirectly.

**Answer**: Yes / No

If Yes → you MUST update the data inventory in `privacy.html` (DE + EN) to include the new data category, its processing purpose, legal basis (cite GDPR article), retention period, and recipients.

---

### Q2 — Changed purpose or legal basis

> Does this feature change the purpose for which existing personal data is processed, or change the legal basis (Art. 6 GDPR) for any existing data-processing activity?

Examples: repurposing existing Outlook calendar data for a new AI-analysis feature; switching from "legitimate interest" to "consent" as the legal basis for an existing operation.

**Answer**: Yes / No

If Yes → you MUST update the affected section(s) in `privacy.html` (DE + EN) and assess whether existing user consents remain valid for the new purpose (Art. 6(4) GDPR compatibility test).

---

### Q3 — New data recipient

> Does this feature transmit personal data to any new external system, API, or organisation not already listed in `privacy.html`?

Recipients include: AI API providers (Claude/Anthropic, OpenAI), cloud storage providers, third-party SaaS tools, analytics services, or any system outside the company's direct control.

**Answer**: Yes / No

If Yes → you MUST:

- Add the new recipient to the "Data recipients" section in `privacy.html` (DE + EN).
- Verify a Data Processing Agreement (DPA) exists with that recipient before the feature is enabled in production.
- If the recipient is an AI provider and planning data is involved, ensure the AI consent gate in `js/chatbot-tools.js` covers the new tool (add it to the `PLANNING_TOOLS` Set).

---

### Q4 — Changed retention period

> Does this feature change how long personal data is stored, introduce a new data persistence mechanism (new localStorage keys, IndexedDB stores, etc.), or remove an existing retention enforcement?

Examples: caching a new type of data to localStorage; extending snapshot retention from 30 to 90 days; removing the startup cleanup call for a data category.

**Answer**: Yes / No

If Yes → you MUST:

- Update the retention period shown in `privacy.html` (DE + EN).
- Ensure the new localStorage keys follow the `redmine_calendar_planning_snapshot_*` naming convention so the retention cleanup in `js/privacy-store.js` covers them automatically (see `data-model.md`).
- If the retention period changes, update the `planningDataRetentionDays` default in `js/config-store.js` and the admin documentation.

---

### Q5 — New or revised user consent required

> Does this feature require the user to give new consent, or does it change the scope of an existing consent (broadening what is shared, adding a new AI provider, etc.)?

Consent is required (Art. 6(1)(a) GDPR) when: data is sent to a third-party AI provider for planning purposes; personal data is used in a way the user has not previously been informed of; or an existing consent no longer covers the expanded processing.

**Answer**: Yes / No

If Yes → you MUST:

- Evaluate whether the existing AI consent record (`redmine_calendar_ai_consent`) covers the new processing, or whether a separate consent flow is required.
- If a new or re-prompted consent is required, implement a new consent modal and update `js/privacy-store.js` accordingly.
- Update `privacy.html` (DE + EN) to describe the new consent scope.

---

## Required Actions (complete if any answer above is "Yes")

- [ ] Updated `privacy.html` — English content
- [ ] Updated `privacy.html` — German content
- [ ] Data inventory updated (new data category / changed purpose / new recipient / changed retention)
- [ ] DPA verified with any new external recipient
- [ ] `PLANNING_TOOLS` Set in `js/chatbot-tools.js` updated if new AI tool added
- [ ] Playwright test added or updated covering the new data-processing flow
- [ ] Link to completed checklist added to PR description

---

## Instance Block (copy for each new feature)

```markdown
## DSGVO Impact Checklist — Feature NNN

**Checklist version**: 1.0 (specs/044-dsgvo-privacy-compliance/checklists/dsgvo-impact.md)
**Assessed by**: [implementer name or "Claude Code"]
**Date**: YYYY-MM-DD

| Question                             | Answer   | Action taken        |
| ------------------------------------ | -------- | ------------------- |
| Q1 — New personal data collection    | Yes / No | [describe or "n/a"] |
| Q2 — Changed purpose or legal basis  | Yes / No | [describe or "n/a"] |
| Q3 — New data recipient              | Yes / No | [describe or "n/a"] |
| Q4 — Changed retention period        | Yes / No | [describe or "n/a"] |
| Q5 — New or revised consent required | Yes / No | [describe or "n/a"] |

**Privacy notice update required**: Yes / No
**privacy.html updated (EN)**: Yes / No / N/A
**privacy.html updated (DE)**: Yes / No / N/A
```
