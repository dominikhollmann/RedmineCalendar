# Feature Specification: Time Entry Anomaly Detection

**Feature Branch**: `029-anomaly-detection`
**Created**: 2026-05-09
**Status**: Draft
**Input**: User description: "Anomaly detection — passively flag time entries that look suspicious so the user can review them. Examples: very short entries that look like typos (e.g. 0.1h that should probably be 1h), overlapping entries on the same day. Surface as a non-blocking visual indicator on the entry; clicking shows the reason. No auto-fix."

> Note: an earlier draft of this spec also included an "unfamiliar ticket" rule (flag entries on tickets the user had never booked before). It was descoped on user request — too noisy for new users and too easy to false-positive on legitimately new tickets. v1 ships with two rules: very-short-entry and overlapping-entries.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Catch Typo-Style Very Short Entries (Priority: P1)

A user finishes booking their week and submits the time sheet on Friday. Two weeks later their manager points out that one entry is 0.1h instead of the intended 1h — a missed decimal that cost them invoiced time. The user wants the app to passively flag entries with suspiciously short durations so they catch the typo before submission.

**Why this priority**: This is the highest-cost mistake the system can catch — typo-style very short entries directly translate into lost billable hours. The rule is simple, easy to implement, and produces near-zero false positives in practice (intentional 0.1h entries are very rare). It is also the most visible win for the user.

**Independent Test**: Creating an entry with duration ≤ 0.1h on any ticket renders the entry with a non-blocking visual indicator. Hovering or clicking the indicator reveals a human-readable reason ("Very short entry — possible typo"). Editing the entry to a longer duration removes the indicator without a page reload.

**Acceptance Scenarios**:

1. **Given** I create a time entry with duration 0.1h on any ticket, **When** the entry renders on the calendar, **Then** the entry shows a small non-blocking anomaly indicator.
2. **Given** an entry shows the anomaly indicator, **When** I hover or click the indicator, **Then** a human-readable reason appears (e.g., "Very short entry — possible typo (0.1h)").
3. **Given** an entry was flagged for being very short, **When** I edit it to a longer duration (e.g., 1h), **Then** the indicator disappears without a page reload.
4. **Given** an entry that was longer than 0.1h, **When** I shrink it to 0.1h via drag-resize, **Then** the indicator appears without a page reload.
5. **Given** I have multiple very short entries, **When** the calendar renders, **Then** every short entry shows its own indicator independently (no aggregation).

---

### User Story 2 - Catch Overlapping Entries on the Same Day (Priority: P2)

A user creates two entries that occupy overlapping times on the same day — for example, 14:00–15:00 on TICKET-A and 14:30–15:30 on TICKET-B. This is almost always unintended (you cannot work on two things simultaneously) and represents either a forgotten end-time, a duplicate booking, or a wrong start-time. The user wants the system to flag both overlapping entries so they can fix one.

**Why this priority**: Overlaps are common when copy-pasting or adjusting entries quickly. Catching them prevents over-bookings that inflate the daily total and look suspicious to managers. Lower priority than typo-detection because the impact is detectable through the daily total even without this feature, but the indicator localises the problem to the offending entries.

**Independent Test**: Creating two entries whose time ranges overlap on the same day shows both with anomaly indicators. Hovering or clicking the indicator names the overlapping entry. Removing or shrinking one entry so they no longer overlap removes both indicators without a page reload. Zero-duration synthetic break-ticket blocks (feature 025) MUST NOT trigger overlap flags.

**Acceptance Scenarios**:

1. **Given** I have two entries on Monday: 14:00–15:00 and 14:30–15:30, **When** the calendar renders, **Then** both entries show an overlap anomaly indicator.
2. **Given** an entry is flagged for overlap, **When** I hover or click the indicator, **Then** a human-readable reason names the overlapping entry (e.g., "Overlaps with 14:30–15:30 entry on the same day").
3. **Given** I have a 14:00–15:00 entry and a synthetic break-ticket block at 14:30, **When** the calendar renders, **Then** neither entry shows an overlap indicator (synthetic break blocks are excluded from this rule).
4. **Given** two entries overlap, **When** I edit one to no longer overlap (e.g., move it to 16:00), **Then** the indicators on both entries disappear without a page reload.
5. **Given** two entries are exactly back-to-back (one ends at 15:00, the next starts at 15:00 — no overlap), **When** the calendar renders, **Then** neither entry shows an overlap indicator.

---

### Edge Cases

- An entry matches multiple rules simultaneously (e.g., a 0.05h entry that also overlaps another entry) → all matching reasons are surfaced in the indicator's detail (not stacked indicators per rule).
- Multi-day entry that is split at midnight by the existing renderer (e.g., a 23:00–01:00 entry rendered as two day-blocks) → treated as a single underlying entry for all rules; both halves carry the same indicator if any.
- Holiday/OOO booking (single 8h block on a configured holiday ticket) → not flagged for any rule (the duration is normal; no overlap unless the user double-booked).
- Synthetic break-ticket blocks (feature 025) → never trigger any rule; never count toward another entry's overlap rule.
- Entry deleted while the indicator's tooltip is open → tooltip dismisses with the entry; no orphan UI.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST evaluate every visible time entry against the configured anomaly rules and attach a non-blocking visual indicator to any entry that matches at least one rule.
- **FR-002**: Anomaly rule "very short entry": flag any entry whose duration is ≤ 0.1h (6 minutes).
- **FR-003**: Anomaly rule "overlapping entries": flag every entry whose time range intersects another non-synthetic entry on the same day. Zero-duration synthetic break-ticket blocks MUST be excluded from this rule.
- **FR-004**: Clicking or hovering an anomaly indicator MUST reveal a short, human-readable reason for the flag. When multiple rules match the same entry, the detail view MUST list all matching reasons.
- **FR-005**: When an entry is edited (duration, start time, ticket) so that it no longer matches any rule, the indicator MUST disappear without a page reload. When an edit causes an entry to start matching a rule, the indicator MUST appear without a page reload.
- **FR-006**: The system MUST NOT auto-fix, auto-modify, auto-delete, or block any entry based on anomaly detection. The user remains fully in control.
- **FR-007**: Anomaly evaluation MUST operate on data already loaded into the calendar — it MUST NOT trigger additional Redmine fetches.
- **FR-008**: Anomaly indicators MUST be visible in both the desktop and mobile (`< 768px`) calendar layouts. The indicator MUST NOT displace or hide existing entry content (issue, time, comment).
- **FR-009**: All new user-visible strings (rule names, reason messages, tooltip labels) MUST be added to `js/i18n.js` in both EN and DE.
- **FR-010**: Anomaly rules MUST be applied uniformly to every entry in the visible week — there is no per-rule disable, dismiss, or suppression UI in v1.
- **FR-011**: The visual indicator MUST be unobtrusive (e.g., a small badge or icon) so that a screen full of indicators does not overwhelm the user.

### Key Entities

- **Anomaly Rule**: a deterministic predicate evaluated against a time entry (and optionally the surrounding entries on the same day). Rules in v1: `very-short-entry`, `overlapping-entries`.
- **Anomaly Tag**: a non-persistent client-side metadata tag attached to a time entry at render time, carrying a rule identifier and a human-readable reason. Recomputed on every render and on every entry change.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: At least 90% of typo-style very short entries (duration ≤ 0.1h that the user later corrects to ≥ 1h) are surfaced via an anomaly indicator at render time.
- **SC-002**: An entry's anomaly state recomputes within 300 ms after any add/edit/delete (consistent with Constitution Principle II).
- **SC-003**: No additional Redmine API calls are issued specifically for anomaly detection (verified by capturing network traffic in a UI test).
- **SC-004**: All previously existing entry interactions (create, edit, delete, drag, resize, copy-paste) continue to work identically — verified by the existing test suites continuing to pass.
- **SC-005**: A user can determine the reason for a flagged entry in 1 interaction (click or hover the indicator) and in under 2 seconds.
- **SC-006**: Synthetic break-ticket blocks (feature 025) are never flagged by any rule (verified by a UI test that creates an entry adjacent to a break block).

## Assumptions

- Anomaly rules are always on; v1 does not provide a per-rule disable, a dismiss action, or an "ignore this entry" affordance. If real-world usage shows specific rules generate too much noise, those rules can be tuned or disabled in a follow-up.
- An entry that matches multiple rules shows a single indicator with all matching reasons listed in the detail tooltip — not multiple stacked indicators per rule.
- Anomaly evaluation is purely client-side on already-loaded data; the server (Redmine) is unaware of and unaffected by anomaly detection.
- Anomaly indicators are visible in both desktop and mobile layouts (no mobile deferral).
- The "unfamiliar ticket" rule that appeared in an earlier draft is explicitly **out of scope** for this feature. New tickets must not be flagged.
- All anomaly rule logic MUST be covered by Vitest unit tests (edge cases for break blocks and exact-boundary overlaps), and the indicator's appear/disappear behaviour and tooltip MUST be covered by Playwright UI tests, per Constitution Principle III.
