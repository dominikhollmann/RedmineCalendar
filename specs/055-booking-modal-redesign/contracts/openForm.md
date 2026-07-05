# Contract: `openForm()` public entry point (UNCHANGED — regression contract)

The redesign is presentation-only. This contract MUST hold exactly as it does today so every caller
(calendar day-cell click, planning-card booking, chatbot tool, bulk/Outlook flows) is unaffected.

## Signature

```js
openForm(entry, (prefill = {}), onSave, onDelete, onCancel);
```

Exported from `js/time-entry-form.js`. No change to name, arity, parameter meaning, or module path.

| Param      | Type                    | Meaning                                                                                                                                                      |
| ---------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `entry`    | `TimeEntry \| null`     | Existing entry to edit, or `null` to create.                                                                                                                 |
| `prefill`  | object                  | `{ date, startTime, hours, activityId?, comment?, issueId?, issueSubject?, projectName?, projectIdentifier?, sourceEvent?, bulkDayCount? }` for new entries. |
| `onSave`   | `(saved) => void`       | Called after a successful create/update.                                                                                                                     |
| `onDelete` | `(id) => void`          | Called after a successful delete.                                                                                                                            |
| `onCancel` | `() => void` (optional) | Called on Cancel / Escape / ✕ / backdrop dismissal.                                                                                                          |

## Behavioural guarantees preserved

- **Create vs edit**: `entry` non-null → edit mode (delete affordance shown, fields prefilled from
  the entry). `null` → create (delete hidden).
- **Prefill**: date/start/hours prefilled; comment prefilled; `issueId` pre-selects the ticket and
  enables Save.
- **Fast mode** (`getFastMode()`): when ON, selecting a ticket auto-saves with defaults and closes;
  when OFF, selection populates the (now always-visible) Phase 2 for editing. _(clarified)_
- **Break ticket**: when the configured break ticket is selected, hours forced to
  `breakHoursForRedmine()` at save and the duration reads `modal.duration_break`.
- **Closed ticket**: closed indicator shown; save against a closed ticket surfaces the existing
  confirm dialog before persisting.
- **Bulk / source-event**: `bulkDayCount` locks the date input + shows the bulk notice;
  `sourceEvent` renders the source-event info block (subject DOMPurify-sanitised).
- **Undo**: create/update/delete each dispatch the existing `undo:push` CustomEvent with the same
  payload shape.
- **Keyboard**: Escape closes; Enter activates (saves when a ticket is selected, else selects the
  highlighted row); ArrowUp/Down navigate rows.
- **Re-exports**: `formatDuration`, `timeToMins`, `minsToTime`, `diffMinutes`, `validateTimeInputs`,
  `capLastUsed` remain re-exported from `js/time-entry-form.js` for existing importers/tests.
- **Other exports** consumed elsewhere (`applyHoursLock`, `isBreakTicketSelected`,
  `showDeleteConfirm`) remain exported with unchanged behaviour.

## Verification

Existing Playwright specs that drive `openForm` via the calendar/planning UI must pass unchanged
(save, edit, delete, closed-ticket confirm, break-ticket duration, bulk-day lock, fast-mode
auto-close). Any assertion that targets the OLD DOM structure (single 3-col grid, floating search
dropdown, `.lean-row` as a `div`) is updated to the new structure but keeps the same behavioural
expectation.
