# Feature Specification: Time Entry Anomaly Detection

**Feature Branch**: `029-anomaly-detection`
**Created**: 2026-05-09
**Status**: Draft
**Input**: User description: "Anomaly detection — passively flag time entries that look suspicious so the user can review them. Examples: very short entries that look like typos (e.g. 0.1h that should probably be 1h), overlapping entries on the same day, an entry on a ticket the user has never booked before. Surface as a non-blocking visual indicator on the entry; clicking shows the reason. No auto-fix."

## User Scenarios & Testing *(mandatory)*

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

### User Story 3 - Catch Entries on Unfamiliar Tickets (Priority: P3)

A user typos a ticket number when creating an entry — they meant TICKET-1234 but typed TICKET-1243, which happens to be a real but unrelated ticket. The user wants a hint when they book on a ticket they have never touched before, so they can confirm whether the choice was intentional. New users (with very little history) should not be spammed with this warning since every ticket is unfamiliar to them.

**Why this priority**: Lower-impact than typo-detection or overlap-detection because the most common mis-typed ticket either does not exist (Redmine returns an error) or is so unrelated the user notices when picking it. Still useful for catching typos that land on a real ticket. Carries the highest false-positive risk of the three rules — hence the noise-suppression threshold for new users.

**Independent Test**: With at least 20 prior entries in history (the noise threshold), creating an entry on a ticket the user has never booked before renders that entry with an "unfamiliar ticket" indicator. With fewer than 20 prior entries, creating the same entry shows no indicator. Editing the entry to a familiar ticket removes the indicator.

**Acceptance Scenarios**:

1. **Given** my available booking history contains at least 20 prior entries and none of them are on TICKET-9999, **When** I create my first entry on TICKET-9999, **Then** the entry shows an "unfamiliar ticket" indicator.
2. **Given** an entry is flagged for unfamiliar ticket, **When** I hover or click the indicator, **Then** the reason names the ticket (e.g., "First entry on this ticket — please confirm it is correct").
3. **Given** my available booking history contains fewer than 20 prior entries, **When** I create entries on tickets new to me, **Then** none of them show an "unfamiliar ticket" indicator.
4. **Given** an entry is flagged for unfamiliar ticket, **When** I edit it to a ticket I have used before, **Then** the indicator disappears without a page reload.
5. **Given** I create a second entry on TICKET-9999 in the same session (so it is no longer "first"), **When** the calendar renders, **Then** the second entry does not show an unfamiliar-ticket indicator (the rule fires only on the first encounter for the visible window).

---

### Edge Cases

- An entry matches multiple rules simultaneously (e.g., a 0.05h entry on an unfamiliar ticket that also overlaps another entry) → all matching reasons are surfaced in the indicator's detail (not stacked indicators per rule).
- The "available booking history" is whatever is loaded into the session from the visible week, prior weeks the user navigated to, the favourites list, and the last-used list. A deeper Redmine query is **not** triggered just to disambiguate the unfamiliar-ticket rule.
- Multi-day entry that is split at midnight by the existing renderer (e.g., a 23:00–01:00 entry rendered as two day-blocks) → treated as a single underlying entry for all rules; both halves carry the same indicator if any.
- Holiday/OOO booking (single 8h block on a configured holiday ticket) → not flagged for any rule (the holiday ticket appears in the user's history; the duration is normal; no overlap unless the user double-booked).
- Synthetic break-ticket blocks (feature 025) → never trigger any rule; never count toward another entry's overlap rule; never count as "prior entries" for the unfamiliar-ticket noise threshold.
- Entry deleted while the indicator's tooltip is open → tooltip dismisses with the entry; no orphan UI.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST evaluate every visible time entry against the configured anomaly rules and attach a non-blocking visual indicator to any entry that matches at least one rule.
- **FR-002**: Anomaly rule "very short entry": flag any entry whose duration is ≤ 0.1h (6 minutes).
- **FR-003**: Anomaly rule "overlapping entries": flag every entry whose time range intersects another non-synthetic entry on the same day. Zero-duration synthetic break-ticket blocks MUST be excluded from this rule.
- **FR-004**: Anomaly rule "unfamiliar ticket": flag an entry whose ticket has not previously appeared in the user's available booking history. The rule MUST be suppressed entirely when the user's available history contains fewer than 20 prior entries (the v1 noise-suppression threshold).
- **FR-005**: Clicking or hovering an anomaly indicator MUST reveal a short, human-readable reason for the flag. When multiple rules match the same entry, the detail view MUST list all matching reasons.
- **FR-006**: When an entry is edited (duration, start time, ticket) so that it no longer matches any rule, the indicator MUST disappear without a page reload. When an edit causes an entry to start matching a rule, the indicator MUST appear without a page reload.
- **FR-007**: The system MUST NOT auto-fix, auto-modify, auto-delete, or block any entry based on anomaly detection. The user remains fully in control.
- **FR-008**: Anomaly evaluation MUST operate on data already loaded into the calendar — it MUST NOT trigger additional Redmine fetches.
- **FR-009**: Anomaly indicators MUST be visible in both the desktop and mobile (`< 768px`) calendar layouts. The indicator MUST not displace or hide existing entry content (issue, time, comment).
- **FR-010**: All new user-visible strings (rule names, reason messages, tooltip labels) MUST be added to `js/i18n.js` in both EN and DE.
- **FR-011**: Anomaly rules MUST be applied uniformly to every entry in the visible week — there is no per-rule disable, dismiss, or suppression UI in v1.
- **FR-012**: The visual indicator MUST be unobtrusive (e.g., a small badge or icon) so that a screen full of indicators does not overwhelm the user.

### Key Entities

- **Anomaly Rule**: a deterministic predicate evaluated against a time entry (and optionally the surrounding entries on the same day or in the user's history). Rules in v1: `very-short-entry`, `overlapping-entries`, `unfamiliar-ticket`.
- **Anomaly Tag**: a non-persistent client-side metadata tag attached to a time entry at render time, carrying a rule identifier and a human-readable reason. Recomputed on every render and on every entry change.
- **Available Booking History**: the union of tickets visible to the client from the current session — visible week's entries, any prior weeks navigated, the favourites list, and the last-used list. Source for the unfamiliar-ticket rule.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of typo-style very short entries (duration ≤ 0.1h that the user later corrects to ≥ 1h) are surfaced via an anomaly indicator at render time.
- **SC-002**: Zero false-positive "unfamiliar ticket" warnings appear for users whose available history contains fewer than 20 prior entries.
- **SC-003**: An entry's anomaly state recomputes within 300 ms after any add/edit/delete (consistent with Constitution Principle II).
- **SC-004**: No additional Redmine API calls are issued specifically for anomaly detection (verified by capturing network traffic in a UI test).
- **SC-005**: All previously existing entry interactions (create, edit, delete, drag, resize, copy-paste) continue to work identically — verified by the existing test suites continuing to pass.
- **SC-006**: A user can determine the reason for a flagged entry in 1 interaction (click or hover the indicator) and in under 2 seconds.
- **SC-007**: Synthetic break-ticket blocks (feature 025) are never flagged by any rule (verified by a UI test that creates an entry adjacent to a break block).

## Assumptions

- "Available booking history" is what is already loaded into the client session: entries from the visible week, entries from any week the user has navigated to, the cached favourites list, and the cached last-used list. A deeper historical Redmine query is **not** triggered for the unfamiliar-ticket rule. This is a deliberate trade-off to keep the rule cheap and avoid extra API calls.
- The 20-entry noise-suppression threshold for the unfamiliar-ticket rule is the v1 default; it is not user-configurable. A future iteration may expose tuning if it proves too noisy or too quiet in practice.
- Anomaly rules are always on; v1 does not provide a per-rule disable, a dismiss action, or an "ignore this entry" affordance. If real-world usage shows specific rules generate too much noise, those rules can be tuned or disabled in a follow-up.
- An entry that matches multiple rules shows a single indicator with all matching reasons listed in the detail tooltip — not multiple stacked indicators per rule.
- Anomaly evaluation is purely client-side on already-loaded data; the server (Redmine) is unaware of and unaffected by anomaly detection.
- Anomaly indicators are visible in both desktop and mobile layouts (no mobile deferral).
- All anomaly rule logic MUST be covered by Vitest unit tests (one rule per file, edge cases for break blocks and the noise threshold), and the indicator's appear/disappear behaviour and tooltip MUST be covered by Playwright UI tests, per Constitution Principle III.
