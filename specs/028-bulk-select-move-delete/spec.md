# Feature Specification: Bulk Multi-Select for Move and Delete

**Feature Branch**: `028-bulk-select-move-delete`
**Created**: 2026-05-09
**Status**: Draft
**Input**: User description: "Bulk multi-select for move and delete — allow selecting multiple time entries on the calendar at once (e.g. shift-click or a select mode), then move them all by a delta (e.g. shift one day earlier/later) or delete them in one action. Should work on desktop; mobile can be deferred. Must show a confirmation before bulk delete."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Bulk Move Multiple Entries by a Day Delta (Priority: P1)

A power user has just imported a week from Outlook (or copy-pasted entries to mirror last week's pattern) and realises an entire group of entries should be shifted one day — for example, the customer rescheduled a workshop. Today, the only option is to drag each entry one at a time. The user wants to select multiple entries and shift them all by one day (forward or backward) in a single operation, preserving each entry's start time-of-day and duration.

**Why this priority**: This is the operation that motivated the feature — it converts a slow, error-prone repetitive task into a single click. It is also the harder half of the feature (the selection model + multi-write to Redmine), so it should drive the design.

**Independent Test**: Selecting two or more entries via shift-click shows them as visually selected and reveals a contextual bulk-action toolbar. Triggering "shift +1 day" moves every selected entry forward by one calendar day. Each entry retains its original start time and duration within its new day. The calendar refreshes to reflect the moves and any selection that has scrolled off the visible week is cleared.

**Acceptance Scenarios**:

1. **Given** I am on the calendar with three entries on Monday, **When** I shift-click each entry in turn, **Then** all three appear visually selected and a contextual bulk-action toolbar becomes visible.
2. **Given** I have three entries selected on Monday, **When** I trigger "shift +1 day", **Then** all three entries move to Tuesday, each preserving its original start time-of-day and duration.
3. **Given** I have entries selected, **When** I trigger "shift −1 day", **Then** all selected entries move backward by one calendar day with the same time-preserving rule.
4. **Given** I have entries selected, **When** I click on an empty area of the calendar, **Then** the selection is cleared and the bulk-action toolbar disappears.
5. **Given** I have entries selected, **When** I navigate to a different week, **Then** the selection is cleared.
6. **Given** I trigger a bulk move and one of the selected entries fails in Redmine (e.g., 422 validation error), **When** the operation completes, **Then** the system reports the per-entry outcome (succeeded vs. failed) and the failed entries remain selected so I can retry.
7. **Given** I have a single-entry drag in progress on a non-selected entry, **When** I drop it on a new day, **Then** only that one entry moves (other selected entries are not affected).

---

### User Story 2 - Bulk Delete Multiple Entries with a Confirmation (Priority: P2)

A user has just realised they accidentally double-imported their week from Outlook and needs to remove the duplicates. Selecting and deleting one at a time is slow; deleting all at once without a confirmation is dangerous. The user wants a one-action delete with a clear confirmation that names the exact count.

**Why this priority**: Less frequently needed than moving, but critical when needed. The confirmation requirement is non-negotiable since deletion is destructive and cannot be undone via Redmine. Slightly lower priority than move because move is harder to do manually (you have to drag) while delete is at least keyboard-accessible per entry today.

**Independent Test**: With multiple entries selected, triggering "delete" shows a confirmation dialog stating the count (e.g., "Delete 5 entries?"). Confirming removes all selected entries from Redmine and from the calendar; cancelling preserves both the entries and the selection.

**Acceptance Scenarios**:

1. **Given** I have 5 entries selected, **When** I trigger the bulk-delete action, **Then** I see a confirmation dialog stating "Delete 5 entries?" (or equivalent localized text with the count).
2. **Given** the bulk-delete confirmation is open, **When** I confirm, **Then** all 5 selected entries are removed from Redmine and from the calendar.
3. **Given** the bulk-delete confirmation is open, **When** I cancel, **Then** no entries are deleted and the selection is preserved as it was.
4. **Given** I trigger bulk-delete and one of the entries fails to delete in Redmine, **When** the operation completes, **Then** the system reports the per-entry outcome and the failed entries remain on the calendar and selected.
5. **Given** only one entry is selected (selection size = 1), **When** I trigger the bulk-delete action, **Then** the same confirmation flow runs (no special-case bypass).

---

### Edge Cases

- A selected entry's target day after a "shift +N day" lands on a day Redmine refuses (e.g., locked period, validation rule) → that entry's update fails; report the failure, keep it selected, leave others moved.
- Move shifts an entry off the visible week (e.g., last entry of the week +1 day) → the move succeeds, the entry leaves the visible week, and the selection is updated to drop the off-screen entry.
- User attempts a "shift" action with 0 entries selected → the toolbar should not be visible at all; if reachable, the action is a no-op.
- Two selected entries collide after a shift (occupy the same time slot) → both moves succeed; the calendar may render them as overlapping. (The new anomaly-detection feature, if landed, would flag the overlap, but that is independent.)
- User triggers a bulk action while a Redmine request is still pending → either queue the new action or block it with a brief "still working" indicator; do not start two concurrent batches.
- Network drops mid-batch → entries already updated remain updated; remaining entries fail with a network error; report the partition.
- Mobile viewport (`< 768px`) → the bulk-select interaction is unavailable in v1; users on mobile see the existing single-entry interactions only and no contextual toolbar.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Users MUST be able to select multiple time entries on the calendar via shift-click on a time-entry block.
- **FR-002**: Selected entries MUST be visually distinct from non-selected entries (e.g., outline, brightness, or check indicator).
- **FR-003**: A contextual bulk-action toolbar MUST be visible whenever the selection contains at least one entry; it MUST expose, at minimum, "shift +1 day", "shift −1 day", and "delete".
- **FR-004**: The "shift +N day" action MUST move every selected entry by the specified day delta, preserving each entry's start time-of-day and duration within its new day.
- **FR-005**: The "delete" action MUST display a confirmation dialog that states the exact number of entries to be deleted before any deletion is performed.
- **FR-006**: Confirming the delete action MUST delete every selected entry from Redmine; cancelling MUST leave all entries and the selection intact.
- **FR-007**: Clicking an empty area of the calendar MUST clear the selection and hide the bulk-action toolbar.
- **FR-008**: Navigating to a different week (prev / next / today) MUST clear the selection.
- **FR-009**: A single-entry drag operation MUST continue to operate on only the dragged entry, regardless of whether other entries are selected.
- **FR-010**: When a bulk action partially succeeds, the system MUST report the per-entry outcome to the user (e.g., "3 of 5 moved; 2 failed: …") and MUST keep the failed entries selected so the user can retry without reselecting.
- **FR-011**: The calendar MUST not initiate a second concurrent bulk batch while one is in progress; the toolbar MUST surface that state visually (disabled actions or progress indicator) until the batch completes.
- **FR-012**: Bulk multi-select MAY be unavailable on mobile (`< 768px` viewport) for v1; the toolbar and shift-click selection MUST NOT appear on mobile.
- **FR-013**: All new user-visible strings (selection count, toolbar labels, confirmation copy, success/failure messages) MUST be added to `js/i18n.js` in both EN and DE.
- **FR-014**: After a successful bulk action, the calendar MUST refresh to reflect the new state without a full page reload, and any updated weekly totals (existing or new from feature 027) MUST update with it.

### Key Entities

- **Selection**: a transient client-side set of currently-selected time entries on the calendar. Cleared on week navigation, empty-click, or successful full-selection action. Not persisted across sessions or page reloads.
- **Bulk Action**: an operation (`move(delta)` or `delete`) applied to every entry in the selection. Reports per-entry success/failure and updates the selection accordingly.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can shift a 5-entry group of time entries by one calendar day in fewer than 10 seconds end-to-end (open-app baseline assumed; counts from first shift-click to confirmation that the move completed).
- **SC-002**: A user can delete 5 selected time entries in fewer than 15 seconds end-to-end, including the confirmation step.
- **SC-003**: 0% chance of accidental bulk deletion: every bulk-delete action MUST go through the confirmation dialog before any entry is removed from Redmine.
- **SC-004**: When a bulk action partially fails, the user can identify exactly which entries failed without re-running the action (verified by a UI test: stub Redmine to reject 1 of 3 entries, assert the failure message names the entry).
- **SC-005**: All previously existing single-entry interactions (single drag, single resize, single click to edit, single delete via the entry form) continue to work identically — verified by the existing test suites continuing to pass.
- **SC-006**: Mobile users (`< 768px`) see no degradation: the existing single-entry flows remain available and no bulk-related UI elements appear in the layout.

## Assumptions

- Bulk multi-select is desktop-first per Constitution Principle II ("Mobile responsiveness MAY be deferred provided the feature spec explicitly declares Mobile support out of scope for vN"). Touch-equivalent multi-select on `< 768px` viewports is explicitly **out of scope for v1** and may be added in a later release.
- Drag-and-drop of a single entry continues to operate on only that entry; bulk move requires the explicit contextual toolbar action. This prevents fat-finger group moves and keeps the existing single-entry drag behaviour unchanged.
- Selection size of 1 still uses the bulk-action confirmation flow for delete (no special-case bypass) so the user experience is consistent.
- Bulk move is restricted to ±1 day deltas in v1; multi-day jumps and cross-week jumps via toolbar are deferred.
- Bulk operations on entry attributes other than date/delete (e.g., bulk change of comment, ticket, or activity) are out of scope for v1.
- Per-entry Redmine failures during a batch are reported but the batch does not abort partway (best-effort; the user retries failures).
- Selection state lives only in browser memory; it is not persisted across reloads.
- All new selection logic and bulk-action handling MUST be covered by Vitest unit tests (selection model, day-delta math, partial-failure aggregation), and the user-facing confirmation flow + toolbar visibility MUST be covered by Playwright UI tests, per Constitution Principle III.
