# Contract: `js/booking-guard.js` Public API

## `runSaveGuards(opts) → Promise<boolean>`

Runs the full booking-guard chain for a **create or edit** operation.

Returns `true` if the operation should proceed, `false` if the user cancelled any dialog.

### Parameters

| Field                    | Type                   | Required | Description                                 |
| ------------------------ | ---------------------- | -------- | ------------------------------------------- |
| `opts.date`              | `string` (YYYY-MM-DD)  | yes      | New (or current) entry date                 |
| `opts.startTime`         | `string\|null` (HH:MM) | no       | New (or current) entry start time           |
| `opts.originalDate`      | `string\|null`         | no       | Pre-edit date; `null` for new entries       |
| `opts.originalStartTime` | `string\|null`         | no       | Pre-edit start time; `null` for new entries |
| `opts.issueId`           | `number\|null`         | no       | Ticket ID — checked against exemption list  |
| `opts.cfg`               | `CentralConfig`        | yes      | Already-loaded admin config                 |

### Guard sequence

1. **Future-date guard** — skip if `issueId` is exempt. Shows dialog if `date > today`.
   - Cancel → return `false` immediately.
2. **Deadline guard** — operation is `'create'` when `originalDate` is null, else `'edit'`.
   - Cancel → return `false`.
3. Both pass → return `true`.

---

## `runDeleteGuard(date, startTime, cfg) → Promise<boolean>`

Runs the **deadline guard only** for a **delete** operation (single entry).

Returns `true` if the deletion should proceed, `false` if the user cancelled.

### Parameters

| Field       | Type                   | Description                                |
| ----------- | ---------------------- | ------------------------------------------ |
| `date`      | `string` (YYYY-MM-DD)  | Entry date                                 |
| `startTime` | `string\|null` (HH:MM) | Entry start time (null → treated as 00:00) |
| `cfg`       | `CentralConfig`        | Already-loaded admin config                |

---

## `deadlineTriggeredForMove(origDate, origTime, newDate, newTime, cfg) → boolean`

Synchronous helper for `eventDrop` / `eventResize` drag handlers. Returns `true` if the move touches the reported period.

Used by `calendar.js` to decide whether to show the deadline dialog before calling `updateTimeEntry`.

### Parameters

| Field      | Type            | Description                       |
| ---------- | --------------- | --------------------------------- |
| `origDate` | `string`        | Entry's date before the drag      |
| `origTime` | `string\|null`  | Entry's startTime before the drag |
| `newDate`  | `string`        | Entry's date after the drag       |
| `newTime`  | `string\|null`  | Entry's startTime after the drag  |
| `cfg`      | `CentralConfig` | Already-loaded admin config       |

For `eventResize` (start unchanged), pass the same value for both `orig*` and `new*`.

---

## Internal helpers (not exported)

| Function                                         | Purpose                                                                           |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `lastDeadlineBefore(now, cfg)`                   | Computes the most recent deadline `Date` before `now`; returns `null` if disabled |
| `toDatetime(date, time)`                         | Combines YYYY-MM-DD + HH:MM into a `Date`; null time → 00:00                      |
| `deadlineTriggered(op, origDt, newDt, deadline)` | Pure boolean — applies the FR-015 trigger matrix                                  |
| `isExempt(issueId, cfg)`                         | True if issueId matches holidayTicket or vacationTicket                           |
