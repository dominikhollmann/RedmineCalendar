# Contract: Time-Entry Modal Hours-Lock (FR-012)

**Feature**: 025 | **Consumer**: any code path that opens the time-entry modal | **Producer**: `js/time-entry-form.js`

> **REDESIGNED during UAT (2026-05-08, FR-019)**: The modal does NOT have a separate hours input — duration is a computed readout. The new behavior: when the break ticket is selected, the duration readout (`#lean-info-dur`) shows `"0m (break)"` instead of computed minutes, and the End time input stays editable so the calendar block reflects the real Outlook event duration. Hours are forced to 0 at save time regardless of (end − start). When `redmineAcceptsZeroHours: false` (FR-020), the saved value is `0.01` placeholder (UI still displays as 0). See spec.md FR-019 / FR-020.

## Invariant (must always hold)

> Whenever the modal's currently-selected ticket equals `centralConfig.breakTicket`, the hours `<input>` MUST be set to `0` and disabled. Selecting any other ticket MUST re-enable the hours input.

This invariant applies regardless of:
- How the modal was opened (AI-driven confirmation, manual click on an empty slot, manual edit of an existing entry).
- How the break ticket came to be selected (prefilled by the assistant, picked by the user via the ticket search).

## State machine

```
                  ┌──────────────────────────────────────┐
                  │ Modal opened                         │
                  │ (ticketId may or may not be set yet) │
                  └─────────────────┬────────────────────┘
                                    │
                                    ▼
                       ┌────────────────────────┐
                       │ on ticket-change(id):  │
                       │   id === breakTicket ? │
                       └──┬──────────────────┬──┘
                       yes│                  │no
                          ▼                  ▼
              ┌──────────────────┐   ┌──────────────────┐
              │ LOCKED state:    │   │ UNLOCKED state:  │
              │  hours = 0       │   │  hours editable  │
              │  hours.disabled  │   │  hours derived   │
              │  hours.input--   │   │   from start/end │
              │   locked class   │   │   OR restored    │
              │  aria-label =    │   │   from cache     │
              │   t('modal.hours_│   │  no .input--     │
              │    locked_break')│   │   locked class   │
              └──────────────────┘   └──────────────────┘
                          ▲                  ▲
                          └──────────────────┘
                          (transitions either direction
                           on each ticket change event)
```

## Public surface

`time-entry-form.js` already wires a ticket-change handler (existing). This contract requires:

```js
// (pseudo-code; actual implementation in time-entry-form.js)
import { getCentralConfigSync } from './settings.js';

let _restoreHours = null;

function applyHoursLock(newTicketId, hoursInput, startInput, endInput) {
  const breakTicket = getCentralConfigSync()?.breakTicket;
  if (breakTicket && Number(newTicketId) === Number(breakTicket)) {
    if (!hoursInput.disabled) _restoreHours = hoursInput.value;
    hoursInput.value = '0';
    hoursInput.disabled = true;
    hoursInput.classList.add('input--locked');
    hoursInput.setAttribute('aria-label', t('modal.hours_locked_break'));
  } else {
    hoursInput.disabled = false;
    hoursInput.classList.remove('input--locked');
    hoursInput.removeAttribute('aria-label');
    if (_restoreHours != null) {
      hoursInput.value = _restoreHours;
      _restoreHours = null;
    } else {
      // existing logic: derive from startInput / endInput
      recomputeHoursFromTimes(hoursInput, startInput, endInput);
    }
  }
}
```

This function is invoked:

- On modal open, after the initial ticket is set.
- On every ticket change (including programmatic and user-driven).
- On reset / cancel (state cleared with the modal).

## Submission guarantee

When the user clicks Save with the break ticket selected, the submitted `hours` MUST be `0`. The `disabled` attribute on the hours input prevents the user from circumventing the lock via the form. The submission code path (`createTimeEntry` / `updateTimeEntry` in `redmine-api.js`) already accepts `hours: 0` (verified against existing Redmine deployment per spec Assumptions).

## Conformance checks

### Vitest unit (`tests/unit/time-entry-modal.test.js`)

| Test | Setup | Expected |
|------|-------|----------|
| Open modal with break ticket prefilled | `breakTicket = 998`, ticket = 998 | `hours.value === '0'`, `hours.disabled === true`, has `.input--locked` |
| Switch from work ticket to break ticket | initial work, change to 998 | Locked state engaged; previous hours stored in `_restoreHours` |
| Switch from break ticket to work ticket | initial break, change to a work ticket | Unlocked; hours restored from cache |
| Switch ticket twice (work → break → work) | initial work, then 998, then back | Unlocked at the end with the original hours value preserved |
| Open modal with no central config | `getCentralConfigSync()` returns null | Lock never engages (degrades gracefully) |

### Playwright UI (`tests/ui/modal-hours-lock.spec.js`)

- Click empty calendar slot → modal opens
- Search for break ticket in ticket picker → select
- Assert hours input is disabled (DOM attribute) and reads "0"
- Click Save → verify POST payload has `hours: 0`
- Reopen modal, change ticket to a work ticket → assert hours input is editable

## Failure modes

| Scenario | Behavior |
|----------|----------|
| `breakTicket` not configured | `applyHoursLock` short-circuits to UNLOCKED branch always. Lock never engages. |
| User opens modal then admin updates `config.json` mid-session | Stale `getCentralConfigSync()` is fine — config snapshot at app load is authoritative for the session. |
| Form submission JavaScript bypassed (e.g. dev tools edit) | Out of scope — Redmine itself accepts `hours: 0` for any ticket; non-zero on the break ticket would be a deliberate user action and the spec's SC-002 only guarantees AI-driven and modal-driven entries. |
