# Data Model: Booking Guard Warnings (042)

## New config shape — `bookingDeadline` (in `config.json`)

```jsonc
{
  "bookingDeadline": {
    "enabled": true, // boolean — feature off when false or key absent
    "dayOfWeek": 5, // 0 (Sun) … 6 (Sat); 5 = Friday
    "hour": 22, // 0–23, 24-h clock
    "minute": 0, // 0–59
  },
}
```

Default when absent: feature disabled (no warnings shown).

## New TypeScript types (additions to `js/types.d.ts`)

```ts
export interface BookingDeadlineConfig {
  enabled: boolean;
  dayOfWeek?: number; // 0–6, default 5 (Friday)
  hour?: number; // 0–23, default 22
  minute?: number; // 0–59, default 0
}

// Extend CentralConfig:
// bookingDeadline?: BookingDeadlineConfig;
```

## Key derived value — "deadline moment"

A `Date` object representing the most recent past occurrence of the configured weekday + hour:minute before the current time. Recomputed on each guard call.

```
algorithm:
  candidate = today at hour:minute:00
  dayDiff   = (candidate.getDay() − dayOfWeek + 7) % 7
  candidate = candidate − dayDiff days
  if candidate ≥ now: candidate = candidate − 7 days
  → deadline = candidate
```

## Start-position representation

Guards operate on `StartPosition` pairs derived from existing `TimeEntry` fields:

| Field       | Source                            | Notes                                      |
| ----------- | --------------------------------- | ------------------------------------------ |
| `date`      | `entry.date` (YYYY-MM-DD)         | Always present                             |
| `startTime` | `entry.startTime` (HH:MM or null) | null → defaults to "00:00" for comparisons |

## Guard trigger matrix (FR-015)

| Operation   | Check                                                              |
| ----------- | ------------------------------------------------------------------ |
| Create      | `newDate+newTime ≤ deadline`                                       |
| Edit / move | `(origDate+origTime ≤ deadline)` OR `(newDate+newTime ≤ deadline)` |
| Delete      | `origDate+origTime ≤ deadline`                                     |

All comparisons are **inclusive** (`≤`). Time is never taken from the entry's `endTime`.

## Exemption list (future-date warning only)

Ticket IDs matching `config.holidayTicket` or `config.vacationTicket` are exempt from the future-date warning. No exemptions apply to the deadline warning.
