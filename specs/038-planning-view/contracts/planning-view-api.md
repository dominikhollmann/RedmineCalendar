# Contract: Planning View Module API

**Branch**: `038-planning-view`  
**Date**: 2026-06-08

Defines the public exports of the three new modules and the modifications to existing modules.

---

## `js/planning-view.js` — Orchestrator

```typescript
/**
 * Show the Planning View. If date is omitted, opens for today.
 * Saves the classic calendar's current view state for FR-004 restore.
 * Hides #calendar-main; shows #planning-view-main.
 */
export function showPlanningView(date?: string): void;

/**
 * Hide the Planning View and return to the classic calendar.
 * Restores the previous view type and navigates to the week containing
 * the last Planning Day (FR-004).
 */
export function hidePlanningView(): void;

/**
 * Returns true when the Planning View is currently active.
 */
export function isPlanningViewActive(): boolean;

/**
 * Returns the currently displayed Planning Day as YYYY-MM-DD.
 */
export function getPlanningDay(): string;

/**
 * Navigate to the previous day. Skips weekends when Mo–Fr toggle is active (FR-018).
 */
export function navigateToPrevDay(): void;

/**
 * Navigate to the next day. Skips weekends when Mo–Fr toggle is active (FR-018).
 */
export function navigateToNextDay(): void;

/**
 * Navigate to the actual current date regardless of Mo–Fr toggle (FR-018).
 */
export function navigateToToday(): void;

/**
 * Trigger a refresh of the Bookings column (called after create/delete — FR-021).
 */
export function refreshBookings(): void;
```

---

## `js/planning-view-bookings.js` — Bookings Column

```typescript
/**
 * Create and mount a FullCalendar timeGridDay instance in the given container
 * for the specified date. Wires the same create/edit/delete callbacks as the
 * main calendar, including ArbZG overlays and the openForm modal.
 * Returns the FullCalendar instance.
 */
export function initBookingsCalendar(
  container: HTMLElement,
  date: string,
  onBookingChange: () => void
): object; // FullCalendar.Calendar

/**
 * Load Redmine time entries for the given date into the bookings calendar.
 * Returns the loaded entries for coverage greyout computation.
 */
export async function loadBookingsForDay(calendar: object, date: string): Promise<TimeEntry[]>;

/**
 * Destroy the FullCalendar instance and remove all event listeners.
 * Must be called before reinitializing for a new date.
 */
export function destroyBookingsCalendar(calendar: object): void;
```

---

## `js/planning-view-outlook.js` — Outlook Column

```typescript
/**
 * Fetch Outlook events for the given date, classify them, compute greyout,
 * and render them into the given container. Returns the rendered PlanningEvents.
 * Shows per-column loading spinner (FR-007) while fetching.
 */
export async function renderOutlookColumn(
  container: HTMLElement,
  date: string,
  bookings: TimeEntry[]
): Promise<PlanningEvent[]>;

/**
 * Returns the set of currently selected PlanningEvent IDs.
 */
export function getSelectedEventIds(): Set<string>;

/**
 * Returns all currently selected PlanningEvent objects (in render order).
 */
export function getSelectedEvents(): PlanningEvent[];

/**
 * Clear all selected events. Called on day navigation (FR-009b).
 */
export function clearSelection(): void;

/**
 * Pure: classify a CalendarProposal into a PlanningEventCategory.
 * Exported for unit testing.
 */
export function classifyProposal(proposal: CalendarProposal): PlanningEventCategory;

/**
 * Pure: determine whether an event's full time range is covered by existing bookings.
 * Exported for unit testing.
 * @param startHHMM - rounded start time from CalendarProposal
 * @param endHHMM   - rounded end time from CalendarProposal
 * @param bookings  - loaded Redmine entries for the day
 * @param isAllDay  - use hours-sum comparison instead of interval covering
 * @param hours     - event hours (for all-day comparison)
 */
export function isFullyCovered(
  startHHMM: string,
  endHHMM: string,
  bookings: TimeEntry[],
  isAllDay?: boolean,
  hours?: number
): boolean;
```

---

## Modified Export: `js/feedback.js`

```typescript
/**
 * Initialize the feedback button and dialog.
 * Changed: injects a toolbar button into .app-header (before the settings link)
 * instead of appending a floating FAB to document.body.
 * No-ops when feedbackEmail is not configured.
 */
export function initFeedback(): void;
```

---

## New i18n Keys

All keys must be added to both `js/i18n/en.js` and `js/i18n/de.js` before use.

| Key                              | English value                                            |
| -------------------------------- | -------------------------------------------------------- |
| `planning.toggle_label`          | `'Planning View'`                                        |
| `planning.close_label`           | `'Back to Calendar'`                                     |
| `planning.bookings_column`       | `'Bookings'`                                             |
| `planning.outlook_column`        | `'Outlook'`                                              |
| `planning.prev_day`              | `'Previous day'`                                         |
| `planning.next_day`              | `'Next day'`                                             |
| `planning.today`                 | `'Today'`                                                |
| `planning.loading_outlook`       | `'Loading Outlook events…'`                              |
| `planning.outlook_not_connected` | `'Outlook is not connected. Go to Settings to connect.'` |
| `planning.outlook_reconnect`     | `'Outlook session expired. Click to reconnect.'`         |
| `planning.outlook_disabled`      | `'Outlook source is disabled in Settings.'`              |
| `planning.outlook_error`         | `'Could not load Outlook events. {{message}}'`           |
| `planning.outlook_retry`         | `'Retry'`                                                |
| `planning.bookings_empty`        | `'No time entries for this day.'`                        |
| `planning.outlook_empty`         | `'No Outlook events for this day.'`                      |
| `planning.category_bookable`     | `'Bookable'`                                             |
| `planning.category_needs_ticket` | `'Needs ticket'`                                         |
| `planning.category_excluded`     | `'Excluded'`                                             |
| `planning.event_covered`         | `'Time already booked'`                                  |
| `planning.entry_created`         | `'Time entry created from {{subject}}.'`                 |
| `planning.batch_complete`        | `'{{success}} created, {{failed}} failed.'`              |
| `planning.batch_failed_item`     | `'Failed to book "{{subject}}": {{error}}'`              |
| `planning.source_outlook_label`  | `'Outlook'`                                              |
| `planning.sources_section`       | `'Planning View Sources'`                                |
| `planning.modal_source_info`     | `'Source event'`                                         |
| `feedback.toolbar_label`         | `'Feedback'`                                             |
