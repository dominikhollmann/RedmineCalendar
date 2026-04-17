# UX Requirements Quality Checklist: Configurable Working Hours and Calendar View Toggle

**Purpose**: Validate that UX requirements for the settings form and calendar toggle are complete, clear, consistent, and measurable — before implementation begins. This checklist tests the *requirements*, not the implementation.
**Created**: 2026-04-01
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md)

## Requirement Completeness

- [x] CHK001 - Are input format requirements (HH:MM, 24-hour) specified for both the working hours start and end fields, or only implied by context? [Completeness, Spec §FR-001]
- [x] CHK002 - Does the spec define what UI element type is used for time input (free-text, time picker, dropdown), or is this left undefined? [Completeness, Gap]
- [x] CHK003 - Are requirements defined for the visual appearance of the toggle button label — specifically, what text or icon it shows in each state ("Working hours" vs "24h")? [Completeness, Gap]
- [x] CHK004 - Is the expected behavior defined for the toggle button when it transitions from disabled to enabled (i.e., when the user configures working hours for the first time during the same session)? [Completeness, Gap]
- [x] CHK005 - Are loading/saving state requirements defined for the settings form (e.g., is the save button disabled while saving, is there a confirmation message)? [Completeness, Gap]
- [x] CHK006 - Are requirements specified for what happens to the calendar scroll position when the toggle switches between working hours and 24h view? [Completeness, Gap]

## Requirement Clarity

- [x] CHK007 - Is "immediately" in FR-007 ("switching MUST take effect immediately") quantified with a specific maximum response time? [Clarity, Spec §FR-007] — *Note: plan.md sets 300 ms per Principle II, but this target is not referenced in the spec itself.*
- [x] CHK008 - Is the term "clearly disabled" (toggle inactive state from research.md) specified in the spec with visual and interactive criteria (greyed out, unclickable, tooltip text)? [Clarity, Ambiguity, Gap] — *Resolved: FR-005 updated with explicit disabled state criteria and tooltip text.*
- [x] CHK009 - FR-004 states the calendar "defaults to showing only the time range" on load — is it clear whether this applies to every page load (including after toggle was last set to 24h) or only to the very first load? [Clarity, Spec §FR-004, Conflict with FR-008] — *Resolved: FR-004 and FR-008 rewritten; persisted state wins on all reloads except the very first load after initial configuration.*
- [x] CHK010 - Is the word "configured" (used throughout FRs and acceptance scenarios) consistently defined? Does it mean "saved at least once" or "currently has a non-empty value in storage"? [Clarity, Consistency] — *Resolved: Glossary entry added to spec defining "configured" as a valid {start, end} object successfully saved to local storage.*
- [x] CHK011 - Is the validation rule "end time must be strictly after start time" specified in the spec (FR-003), or does it only appear in the data-model? The spec and data-model must align. [Clarity, Spec §FR-003]
- [x] CHK012 - US2, Scenario 5 says the toggle is "disabled or hidden" when unconfigured — are both options (disabled vs hidden) acceptable, or should the spec specify exactly one behaviour? [Clarity, Spec US2 §Scenario 5, Ambiguity] — *Resolved: Spec updated to "disabled" (not hidden) in FR-005, US2 Scenario 5, and Assumptions.*

## Requirement Consistency

- [x] CHK013 - FR-004 says the calendar defaults to working hours view when configured. FR-008 says the toggle state is persisted. If the user last used 24h view and reloads, which takes precedence? Are these two requirements consistent? [Consistency, Conflict, Spec §FR-004 vs §FR-008] — *Resolved: FR-004 and FR-008 rewritten with explicit precedence rule.*
- [x] CHK014 - The clarification (Session 2026-04-01) states "once working hours are saved, the calendar switches to the working hours view as its default on next load." Does this override the persisted toggle state from FR-008, and is that conflict resolved in the spec? [Consistency, Conflict] — *Resolved: Assumptions section and Clarifications updated to match the FR-004/FR-008 precedence rule.*
- [x] CHK015 - Are the storage key names (`redmine_calendar_working_hours`, `redmine_calendar_view_mode`) referenced consistently between research.md and data-model.md, or do they drift? [Consistency]
- [x] CHK016 - US1, Scenario 4 says "the calendar immediately reflects the updated range" when settings change. FR-007 says toggling takes effect immediately. Are both "immediacy" requirements held to the same standard? [Consistency, Spec §US1-S4, §FR-007]

## Acceptance Criteria Quality

- [x] CHK017 - SC-001 states "configure working hours in under 1 minute" — is this criterion measurable in a way that distinguishes pass from fail for the settings form UX (or is it trivially always true)? [Measurability, Spec §SC-001] — *Resolved: SC-001 removed from spec (trivially always true, not a meaningful gate).*
- [x] CHK018 - SC-003 states "single interaction (one click/tap)" — does this account for the disabled state of the toggle? If the toggle is disabled and the user must first go to settings, is SC-003 still achievable? [Measurability, Conflict, Spec §SC-003]
- [x] CHK019 - SC-004 ("view mode preference survives page reload in 100% of cases") — is it clear this applies independently of whether working hours are configured, or only when they are? [Clarity, Measurability, Spec §SC-004]
- [x] CHK020 - SC-005 states "all data remains accessible by toggling to 24h view" — is this criterion sufficient to cover the edge case where the user has not yet configured working hours (toggle is disabled)? [Coverage, Spec §SC-005]

## Scenario Coverage

- [x] CHK021 - Are requirements defined for the user returning to the settings page and *clearing* working hours (removing previously saved values)? The spec defines saving but not unsetting. [Coverage, Gap] — *Resolved: FR-011 added — clearing both fields and saving removes working hours from storage, reverts calendar to 24h view, disables toggle.*
- [x] CHK022 - Is the alternate flow covered where the user opens settings, edits working hours but does *not* save (navigates away), and then opens the calendar — should the calendar reflect the old saved value? [Coverage, Alternate Flow, Gap]
- [x] CHK023 - Are requirements defined for the behaviour when `localStorage` is unavailable or write-protected (e.g., private browsing mode, storage quota exceeded)? [Coverage, Exception Flow, Gap] — *Resolved: Out of scope — single-user local tool; private browsing and quota exceeded are not realistic scenarios.*
- [x] CHK024 - US2, Scenario 3 covers week navigation preserving toggle state. Are requirements also defined for navigating *between months* or *using the "today" button*? [Coverage, Spec §US2-S3]

## Edge Case Coverage

- [x] CHK025 - The edge case "midnight-to-midnight (00:00–24:00)" is listed — does the spec define what the toggle button shows/does in this state (since both views are identical)? [Edge Case, Spec §Edge Cases]
- [x] CHK026 - The edge case "start time entry before working hours in working hours view" is covered. Is there a requirement for entries that *span* the working hours boundary (e.g., a 4h entry starting at 07:00 when work starts at 08:00)? [Edge Case, Gap]
- [x] CHK027 - Are requirements defined for the concurrent scenario where two browser tabs have the app open and one tab changes working hours — should the second tab respond? [Edge Case, Gap] — *Resolved: Out of scope — single-user local tool; multi-tab sync is not a requirement.*

## Dependencies & Assumptions

- [x] CHK028 - The assumption "working hours are the same for all days" is documented. Is there a requirement to *display* this assumption to the user in the settings UI (e.g., "applied to all weekdays") to prevent misunderstanding? [Assumption, Spec §Assumptions] — *Resolved: No label needed — out of scope.*
- [x] CHK029 - The plan depends on FullCalendar v6's `setOption()` API for dynamic range switching. Is there a requirement or note about graceful degradation if this API behaves differently in a future CDN version? [Dependency, Gap] — *Resolved: Out of scope — personal tool, no versioning policy required.*
- [x] CHK030 - Is the interaction between this feature's `redmine_calendar_view_mode` localStorage key and feature 002's day-range preference (Mo–Fr vs full week) explicitly specified — do they share a key or are they independent? [Dependency, Consistency, Spec §Assumptions]

## Notes

- CHK009 and CHK013/CHK014 identify a potential conflict between FR-004 (working hours default on load) and FR-008 (persisted toggle state). This is the highest-priority issue to resolve before implementation.
- CHK012 identifies an ambiguity (disabled vs hidden toggle) that should be resolved in the spec before tasks are generated.
- Items marked `[Gap]` represent requirements that are missing from the spec and may need to be added or explicitly declared out of scope.
- Check items off as completed: change `- [ ]` to `- [x]`
