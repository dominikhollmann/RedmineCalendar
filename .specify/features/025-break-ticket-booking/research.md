# Phase 0 Research: Break-Ticket Booking

**Feature**: 025 | **Date**: 2026-05-07

This document resolves all open decisions before Phase 1 design.

---

## R1 — Where does the AI classification run?

**Decision**: In the chatbot orchestration layer (`chatbot.js` + extended system prompt in `chatbot-tools.js`). The deterministic Outlook parser (`parseCalendarProposals` in `js/outlook.js`) stays deterministic — it continues to emit four bucket categories: `holiday`, `allday-other`, `meeting (with ticket extracted)`, and `needs-ticket` (no ticket, timed event). The AI then inspects each `needs-ticket` proposal in turn and either:

- Calls `create_time_entry` with `issueId = breakTicket`, `hours = 0`, `startTime` from the event slot, `comment` = event subject — when the AI judges the subject non-work-related, OR
- Prompts the user for a ticket — as today (existing 019 behavior).

**Rationale**:
- Keeps the deterministic core deterministic (testable with Vitest, no AI mocking required for the parser).
- AI classification runs in the existing tool-calling loop the chatbot already drives per event — no extra LLM call.
- Enforces Q5's precedence rule naturally: events with a ticket extracted from the title never enter the `needs-ticket` bucket, so the AI never sees them and never reclassifies them.

**Alternatives considered**:
- Run classification *inside* `parseCalendarProposals` — rejected: makes the parser non-deterministic and forces all unit tests to mock the LLM.
- Pre-classify the whole day in one batch LLM call before walking events — rejected: redundant cost, the chatbot already iterates events one-by-one.

---

## R2 — What does the system prompt say to teach classification?

**Decision**: Append a paragraph to the existing booking-flow system prompt in `chatbot-tools.js`. Per Q4 (G), no admin-configurable keyword list — the multilingual vocabulary is baked into the prompt. Initial seed:

```
For each event in the "needs ticket" bucket, classify the subject as work or non-work.
Non-work examples (English + German, case-insensitive — these are HINTS, not a strict list;
use judgment for variants and other languages):
  lunch, breakfast, dinner, coffee, gym, doctor, dentist, appointment,
  errand, school run, personal, break, vacation, day off,
  Mittagessen, Frühstück, Abendessen, Kaffee, Sport, Fitness, Arzt,
  Arzttermin, Zahnarzt, Termin, persönlich, Pause, privat, Urlaub.
If you classify the event as non-work AND a break ticket ID is provided in this conversation's
context, call create_time_entry with issueId=<breakTicket>, hours=0, startTime=<event.start>,
comment=<event.subject>. Do NOT ask the user about non-work events you classified yourself
unless the user has previously corrected one of your break-routings.
If no break ticket is provided, fall back to today's behavior: ask the user for a ticket.
```

**Rationale**:
- Explicit examples in EN+DE cover the user's working languages; the AI extrapolates to variants.
- "HINTS, not a strict list" gives the AI room to use subject reasoning beyond literal matches.
- Conditional on `breakTicket` being in context — preserves FR-004 fallback behavior.
- "Don't re-ask after correction" keeps the flow tight without needing a state machine; the AI's own context window is the memory.

**Alternatives considered**:
- A formal classification tool (`classify_event`) the AI must call before `create_time_entry` — rejected: extra round trip, more brittle.
- A few-shot example block — rejected: longer prompt without much accuracy gain for a vocabulary this concrete.

---

## R3 — How are 0-hour break entries rendered on FullCalendar?

**Decision**: When mapping a 0-hour time entry to a FullCalendar event in `js/calendar.js`, give the FC event a *display* end of `start + 15min` and tag it with a CSS class `fc-event--break`. The underlying `entry.hours = 0` is preserved in `extendedProps.timeEntry` for totals; only the visual span is stretched. The `.fc-event--break` class gets a distinct color (e.g. muted gray) and a small "0h" badge so the user does not mistake it for a 15-minute work entry.

**Rationale**:
- A literal 0-duration FullCalendar event renders as a 1-pixel slice, effectively invisible (verified against FC v6 behavior). Users cannot click to edit.
- Synthetic 15-minute display preserves clickability and maintains visual hierarchy.
- Totals logic in `calendar.js:160` reads `extendedProps.timeEntry.hours` — unchanged at 0 — so no risk of double-counting.
- Distinct styling fulfills FR-010's "visually distinguish" requirement for both the proposal summary AND the persisted calendar entry.

**Alternatives considered**:
- Render in FullCalendar's all-day row — rejected: misleading for events that conceptually happened at a specific time slot (e.g. a 14:00 doctor appointment).
- Set the FC event's `display: 'background'` — rejected: not clickable, can't be edited in-place.
- CSS-only `min-height` on `.fc-event` — rejected: FullCalendar's slot-positioning math doesn't honor min-height for sub-slot durations; the hit area would still be tiny.

---

## R4 — Modal hours-lock UX

**Decision**: Use the native `disabled` attribute on the hours `<input>`, plus a CSS class `.input--locked` for visual feedback (reduced opacity, "not-allowed" cursor). When the user changes the ticket selection in the modal:

```
on ticket-change(newTicketId):
  if newTicketId === centralConfig.breakTicket:
    save previous hours into a transient _restoreHours field
    set hoursInput.value = '0'
    hoursInput.disabled = true
    hoursInput.classList.add('input--locked')
    hoursInput.setAttribute('aria-label', t('modal.hours_locked_break'))
  else:
    if _restoreHours is set: hoursInput.value = _restoreHours
    else: recompute hours from startInput/endInput
    hoursInput.disabled = false
    hoursInput.classList.remove('input--locked')
    hoursInput.removeAttribute('aria-label')
```

**Rationale**:
- Native `disabled` blocks form submission of an edited value and provides accessible semantics for screen readers automatically.
- Restore-on-revert preserves user intent if they bounce off the break ticket and back to a real ticket.
- Aria-label announces the lock reason — users with screen readers get the same explanation sighted users get from the visual treatment.

**Alternatives considered**:
- Hide the hours field entirely when break ticket is selected — rejected: less discoverable; user can't tell at a glance that the entry is 0h.
- Read-only attribute instead of disabled — rejected: read-only inputs still submit; we want hours=0 to be guaranteed in the request.

---

## R5 — Holiday booking shape change: migration impact

**Decision**: No migration script. New holiday entries written after this feature ships will include `startTime` anchored at workStart (09:00 fallback). Existing holiday entries already in Redmine have no `startTime` in the form data (current `js/outlook.js:128` writes `startTime: null`); they're stored on the Redmine side as `spent_on + hours` with no time anchor and will continue to render in the calendar's all-day-row pathway (`js/calendar.js:176` falls through for `!entry.startTime`).

**Rationale**:
- Forward-only change — no risk to existing data.
- Mixed rendering (some holidays in time grid, some in all-day row) is acceptable for the transition window; over time as users book new holidays, the calendar becomes consistent.
- Constitution IV (Simplicity & YAGNI) — a migration script for cosmetic alignment is not justified.

**Alternatives considered**:
- Backfill existing holiday entries via a one-shot script that reads each entry and PATCHes a startTime — rejected: requires admin orchestration, risks API rate limits, and the cosmetic gain is small.

---

## R6 — Sensitivity-filter removal: blast radius

**Decision**: Remove the `if (ev.sensitivity === 'private' || ev.sensitivity === 'confidential')` block at `js/outlook.js:118` entirely. Update `parseCalendarProposals`'s return shape to drop `skippedPrivate` (callers must adapt). Adjust `chatbot-tools.js:357` to no longer read `skippedPrivate`. Leave the `outlook.skipped_private_item` i18n key in `i18n.js` unused for one release for safety, then delete in a follow-up.

**Rationale**:
- The filter has exactly one caller. Single-point change.
- `skippedPrivate` is unused after removal; dropping the array keeps the return shape clean.
- Keeping the i18n key for one release prevents accidental crashes if external code still references it (defense in depth, low cost).

**Alternatives considered**:
- Preserve sensitivity skip as opt-in admin behavior — rejected: contradicts Q4's "completely ignore" answer.
- Delete the i18n key immediately — acceptable but adds risk if any third-party fork references it; the cost of waiting is one orphan string.

**Test fixtures**: `tests/unit/outlook.test.js` currently asserts that a sensitivity-private event is filtered. Those cases get rewritten: a sensitivity-private event with a work-sounding subject (e.g. `1:1 with Manager #2097`) MUST appear as a work proposal on ticket 2097.

---

## R7 — Where does breakTicket / holidayTicket live, and how is the legacy localStorage cleaned up?

**Decision**:
- Both `breakTicket` and `holidayTicket` are read from `config.json` via the existing `loadCentralConfig` / `getCentralConfigSync` path in `js/settings.js`. `chatbot-tools.js` switches from `readHolidayTicket()` (localStorage) to `getCentralConfigSync().holidayTicket`.
- The legacy `redmine_calendar_holiday_ticket` localStorage key is cleaned up at app initialization, NOT just on settings-page open. Implementation: extend `loadCentralConfig` (which is called by every page on startup) to call `localStorage.removeItem(STORAGE_KEY_HOLIDAY_TICKET)` after a successful config fetch, in a single `cleanupLegacyKeys()` helper.
- `readHolidayTicket()` and `writeHolidayTicket()` exports are removed from `settings.js`. `STORAGE_KEY_HOLIDAY_TICKET` constant is retained in `config.js` for the cleanup helper's internal use, then removed in a follow-up.

**Rationale**:
- App-init cleanup matches FR-007's intent (no shadowing) for users who never open Settings — the majority case.
- Removing `readHolidayTicket()` ensures no code path can accidentally fall back to localStorage. Compile-time guarantee, not runtime hygiene.
- Centralizing in `loadCentralConfig` keeps cleanup near the new authority (config.json) — natural locus.

**Alternatives considered**:
- Cleanup only on settings-page open — rejected (FR-007's spec wording said "settings load" but the user clarified in Q3-discussion-style spirit that we want this to be robust; users who never visit Settings would otherwise carry stale data forever).
- Lazy cleanup on every read — rejected: requires the read to exist, but `readHolidayTicket` is being removed entirely.

---

## R8 — Test strategy for AI-driven classification

**Decision**: Three test layers:

1. **Vitest unit (deterministic)**: `parseCalendarProposals` no longer reads sensitivity; tests verify ticket-extraction precedence, holiday all-day shape (with workStart anchor), break all-day shape (0h, workStart anchor), overlap exclusion. No AI is invoked here.

2. **Vitest unit (mocked AI)**: For `chatbot.js` orchestration of the booking flow with `breakTicket` in context, mock the AI tool-call response. Assert: when AI emits `create_time_entry` with `issueId === breakTicket`, the modal's hours-lock invariant (FR-012) is honored; when the AI does NOT route an event to break, the existing flow runs.

3. **Playwright UI**: One spec for the booking flow (mocked Outlook events + mocked AI responses) that walks through a day with a doctor appointment, asserts the 0h break entry is created and rendered with the synthetic 15min visual height. Second spec for ad-hoc modal use (open the time-entry modal from a calendar empty slot, switch the ticket to the break ticket, assert hours-input is disabled and reads 0; switch back to a work ticket, assert hours-input is re-enabled and restored).

**Rationale**:
- Deterministic parser → fast, reliable Vitest. The bulk of routing logic is here.
- Mocked-AI integration → covers the orchestration without flakiness; the AI prompt itself is validated by UAT (per spec Assumptions).
- Playwright → exercises the modal-lock invariant in a real browser DOM, which is where FR-012 actually has to hold.

**Alternatives considered**:
- Live-AI integration tests — rejected: non-deterministic, costs money, fails CI on transient model changes.
- Pure unit-only — rejected: the modal hours-lock is DOM-level behavior best validated in a browser.

---

## Open questions: none

All Phase 0 unknowns resolved. Phase 1 (data-model.md, contracts/, quickstart.md) can proceed.
