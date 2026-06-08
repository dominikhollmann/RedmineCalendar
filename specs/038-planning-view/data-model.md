# Data Model: Planning View

**Phase**: 1 — Design & Contracts  
**Branch**: `038-planning-view`  
**Date**: 2026-06-08

---

## Entities

### 1. PlanningState

In-memory, module-scope in `js/planning-view.js`. Never persisted.

| Field                    | Type                                     | Description                                                                                                         |
| ------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `_planningDay`           | `string` (YYYY-MM-DD)                    | Currently displayed Planning Day                                                                                    |
| `_isActive`              | `boolean`                                | Whether the Planning View is currently visible                                                                      |
| `_previousCalendarState` | `{ view: string, date: string } \| null` | Snapshot of the classic calendar's view type + active date, saved when Planning View opens so FR-004 can restore it |

**State transitions**:

```
Classic Calendar → Planning View
  _isActive: false → true
  _previousCalendarState: null → { view, date }
  _planningDay: (unchanged | set to today | set to clicked day)

Planning View → Classic Calendar
  _isActive: true → false
  calendar.changeView(_previousCalendarState.view)
  calendar.gotoDate(weekOf(_planningDay))
  _previousCalendarState: { ... } → null
```

---

### 2. PlanningEvent

In-memory, per-render in `js/planning-view-outlook.js`. Never persisted.

Wraps a `CalendarProposal` from `parseCalendarProposals` and adds Planning View–specific state.

| Field              | Type                    | Description                                                                    |
| ------------------ | ----------------------- | ------------------------------------------------------------------------------ |
| `id`               | `string`                | Derived unique ID: `${subject}_${startTime}` (or index fallback)               |
| `proposal`         | `CalendarProposal`      | The classified proposal from `parseCalendarProposals`                          |
| `rawEvent`         | `OutlookEvent`          | Original Outlook event (for modal display per FR-010b)                         |
| `planningCategory` | `PlanningEventCategory` | `'bookable'` \| `'needs-ticket'` \| `'excluded'`                               |
| `isCovered`        | `boolean`               | `true` if the event's full time range is covered by existing bookings (FR-016) |
| `selected`         | `boolean`               | Selection state for multi-select drag (FR-009b)                                |

**Derived fields** (computed at render; not stored):

- `planningCategory`: derived from `proposal.status` and `proposal.category`
  via `classifyProposal(proposal)`.
- `isCovered`: derived by `isFullyCovered(proposal.startTime, proposal.endTime, bookings)`.

---

### 3. PlanningEventCategory

TypeScript union type (added to `js/types.d.ts`):

```typescript
export type PlanningEventCategory = 'bookable' | 'needs-ticket' | 'excluded';
```

**Mapping from `CalendarProposal`**:

| Condition                                                                        | Category         |
| -------------------------------------------------------------------------------- | ---------------- |
| `proposal.category === 'meeting'` AND `proposal.status === 'proposed'`           | `'bookable'`     |
| `proposal.category === 'meeting'` AND `proposal.status === 'needs-ticket'`       | `'needs-ticket'` |
| `proposal.category` is `'break'`, `'holiday'`, `'vacation'`, or `'allday-other'` | `'excluded'`     |
| Event in `skippedInformational` (birthday, reminder, …)                          | `'excluded'`     |

---

### 4. PlanningSourceConfig

Persisted in `localStorage`. Controlled from the Settings page (FR-013).

| Key                                        | Type           | Default | Meaning                                               |
| ------------------------------------------ | -------------- | ------- | ----------------------------------------------------- |
| `redmine_calendar_planning_source_outlook` | `'1'` \| `'0'` | `'1'`   | Outlook source column shown (`'1'`) or hidden (`'0'`) |

Constant exported from `js/config.js`:

```js
export const STORAGE_KEY_PLANNING_SOURCE_OUTLOOK = 'redmine_calendar_planning_source_outlook';
```

---

### 5. BatchBookingResult

In-memory, transient per drag operation. Used for FR-021b outcome reporting.

| Field       | Type                                            | Description                                           |
| ----------- | ----------------------------------------------- | ----------------------------------------------------- |
| `succeeded` | `PlanningEvent[]`                               | Events where a Redmine entry was created successfully |
| `failed`    | `Array<{ event: PlanningEvent; error: Error }>` | Events where creation failed                          |

**Processing rule**: All events are always processed (no bail-out on first failure). Failed events
remain in the Outlook column so the user can retry (FR-021b).

---

## Validation Rules

| Constraint                                                                   | Where enforced                                                          |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `planningCategory === 'excluded'` → not selectable, not draggable            | `planning-view-outlook.js` render logic                                 |
| `proposal.startTime` and `proposal.endTime` must be rounded to quarter-hours | Guaranteed by `parseCalendarProposals`; no additional validation needed |
| `isFullyCovered` only fires for timed events (`proposal.isAllDay === false`) | `planning-view-outlook.js`: all-day events use hours-sum comparison     |
| Selection cleared on day navigation                                          | `planning-view.js`: calls `clearSelection()` before loading new day     |
| `_previousCalendarState` cleared after toggle-back                           | `planning-view.js`: set to `null` after restoring calendar              |

---

## New Types Added to `js/types.d.ts`

```typescript
/** Planning View classification of an Outlook event. */
export type PlanningEventCategory = 'bookable' | 'needs-ticket' | 'excluded';

/** An Outlook event enriched with Planning View classification and rendering state. */
export interface PlanningEvent {
  id: string;
  proposal: CalendarProposal;
  rawEvent: OutlookEvent;
  planningCategory: PlanningEventCategory;
  isCovered: boolean;
  selected: boolean;
}

/** Saved classic calendar state for restoring on Planning View toggle-back. */
export interface SavedCalendarState {
  view: string; // e.g. 'timeGridWeek'
  date: string; // YYYY-MM-DD of the active start
}

/** Per-event outcome from a batch drag booking operation. */
export interface BookingOutcome {
  event: PlanningEvent;
  ok: boolean;
  error?: Error;
}
```
