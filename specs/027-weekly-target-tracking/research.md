# Research: Weekly Hours Target Tracking

**Feature**: 027-weekly-target-tracking
**Date**: 2026-05-10
**Phase**: 0 (Outline & Research)

This feature adds a UI indicator on top of data the app already loads. The "research" is therefore primarily a survey of touch-points in the existing codebase — there are no new technologies, libraries, or external integrations to evaluate.

---

## R1 — Where the existing week total renders

**Decision**: Reuse the existing `updateWeekTotal(events)` function in `js/calendar.js:303` as the single render entry point for the target indicator.

**Rationale**:

- It already executes after every entry CRUD via the `loadWeekEntries()` → `updateWeekTotal()` chain plus the `updateAllIndicators()` re-render hook (`js/calendar.js:289`).
- It owns the `#week-total` DOM node inside `.app-header` (`js/calendar.js:308`).
- Adding a sibling `#week-target` span (or extending the existing element with structured children) keeps the change local and avoids duplicate render paths.

**Alternatives considered**:

- **A new render hook listening on a custom event**: rejected — would introduce an event-bus pattern not used elsewhere; YAGNI.
- **Re-render only on calendar-view-change**: rejected — would miss CRUD updates, violating FR-007.

---

## R2 — How `weeklyHours` is read

**Decision**: Read via the existing `readWeeklyHours()` getter in `js/settings.js` (storage key `redmine_calendar_weekly_hours`, exported as `STORAGE_KEY_WEEKLY_HOURS` from `js/config.js:16`).

**Rationale**:

- Already used by `js/chatbot-tools.js:360` and `js/outlook.js`. Reusing the same getter guarantees a single source of truth and keeps the feature spec's promise that no new persistent settings are introduced.
- Returns `null`/`undefined` when unset, which maps cleanly to FR-006 ("hide the indicator").

**Alternatives considered**:

- **Read directly from `localStorage`** in `week-target.js`: rejected — duplicates parsing/validation; the pure module should accept `weeklyHours` as a numeric parameter so it stays unit-testable without DOM/storage.

---

## R3 — How holiday-ticket and break-ticket entries are identified

**Decision**:

- **Break-ticket**: read `cfg.breakTicket` from `config.json` exactly as `js/calendar.js:53` already does. Entries with `Number(entry.issueId) === Number(cfg.breakTicket)` contribute 0 to booked hours (already true today; we just preserve the contract).
- **Holiday-ticket**: read `cfg.holidayTicket` from `config.json`. Entries with that issueId mark the day as "filled" for the remaining-workdays computation.

**Rationale**:

- Both tickets are admin-managed (per CLAUDE.md), so the values come from `config.json`, not per-user settings. The legacy `redmine_calendar_holiday_ticket` localStorage key was removed in feature 023's FR-007 cleanup; the constant in `js/config.js:17` is dead code that this feature does NOT need to delete (out of scope; tracked separately under feature 026).
- The `computeWeekProgress` function will accept `holidayTicket` and `breakTicket` as numeric parameters, mirroring the parameter style of `parseCalendarProposals` in `js/outlook.js:233`.

**Alternatives considered**:

- **Detect holidays by activity name string match (e.g., "Holiday")**: rejected — locale-dependent and brittle; the ticket-ID approach is what the rest of the codebase uses.
- **Skip the holiday case entirely in v1**: rejected — explicitly required by FR-003 / spec edge case "Holiday/OOO bookings on a workday".

---

## R4 — How "today" is determined consistently with the rest of the app

**Decision**: Use local-timezone day-boundary semantics. `today = new Date(); today.setHours(0,0,0,0)`. A weekday is "in the past" iff its local-midnight start is strictly less than today.

**Rationale**:

- The rest of the app uses local-time semantics (e.g., `splitMidnightEntries`, day-cell rendering). Using anything else here would create a mismatch between the user's perception of "today" and the indicator.
- The constitution requires UTC for _storage_; display logic is the UI layer's responsibility (Constitution §"Technology Constraints").

**Alternatives considered**:

- **Use UTC midnight**: rejected — would mark a Mon-evening user as already past Monday in some timezones.
- **Inject `now` from the caller**: adopted in spirit — the `computeWeekProgress` signature accepts a `today` parameter so unit tests can pin the date deterministically.

---

## R5 — Re-render trigger after entry CRUD

**Decision**: No new wiring needed. The existing `loadWeekEntries()` flow already calls `updateWeekTotal()` after each fetch, and `updateAllIndicators()` is invoked at `js/calendar.js:289` after every CRUD round-trip.

**Rationale**:

- FR-007 requires updates without a page reload after add/edit/delete/move/resize. All of those go through `loadWeekEntries()` (or its quieter sibling) on success.
- Riding the existing trigger keeps the indicator naturally consistent with the week total — they are computed from the same `events` array.

**Alternatives considered**:

- **MutationObserver on the calendar DOM**: rejected — overkill, brittle, and FullCalendar's internal DOM is not a stable contract.
- **Subscribe to FullCalendar's `eventsSet` callback**: deferred — useful future generalization but unnecessary for this feature's requirements.

---

## R6 — i18n keys

**Decision**: Add the following keys to `js/i18n.js` in both EN and DE:

| Key                         | EN                                                                                              | DE                                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `weekTarget.bookedOfTarget` | `{booked} / {target}`                                                                           | `{booked} / {target}`                                                                                     |
| `weekTarget.remaining`      | `{hours}h left`                                                                                 | `{hours}h offen`                                                                                          |
| `weekTarget.remainingDays`  | `{days}d`                                                                                       | `{days}d`                                                                                                 |
| `weekTarget.metSuffix`      | `✓`                                                                                             | `✓`                                                                                                       |
| `weekTarget.tooltip`        | `Booked {booked}h of weekly target {target}h. {remaining}h across {days} remaining workday(s).` | `{booked}h von wöchentlichem Ziel {target}h gebucht. {remaining}h auf {days} verbleibende(n) Werktag(e).` |

**Rationale**:

- All user-visible strings localized per the project rule.
- Single-character tokens (`d`, `h`, `✓`) are kept identical across locales for compactness.

---

## Outcome

All Phase 0 unknowns resolved. No `[NEEDS CLARIFICATION]` items remain. Ready for Phase 1 design (data-model, quickstart).
