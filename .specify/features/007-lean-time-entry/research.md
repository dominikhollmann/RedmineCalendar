# Research: Super Lean Time Entry UX (007)

## Decision 1: Form trigger point

**Decision**: Replace the `openForm()` call inside the FullCalendar `select` callback (`calendar.js:552`) with a call to the new lean form.

**Rationale**: The `select` callback already receives `startStr`, `endStr`, and `date` — exactly what the lean form needs. No changes to FullCalendar config required.

**Alternatives considered**: Separate entry point (new button in toolbar) — rejected because the spec explicitly requires "select time range on calendar" as the trigger.

---

## Decision 2: Activity field — auto-select default

**Decision**: Fetch activities on form open (or lazily once per session), silently select the default activity, and never show the field to the user.

**Rationale**: Redmine's REST API requires `activity_id` on `POST /time_entries`. The spec removes the activity field from the UI. The existing `getTimeEntryActivities()` API method already returns `isDefault` on each activity — the first `isDefault: true` entry is used. Result cached in module-level variable to avoid repeated API calls.

**Alternatives considered**: Hardcode a fixed activity ID — rejected (not portable across Redmine instances). Require activity in lean form — rejected by spec.

---

## Decision 3: localStorage schema

**Decision**:
- Key `redmine_calendar_favourites`: `JSON array of {id: number, subject: string, projectName: string}`
- Key `redmine_calendar_last_used`: `JSON array of {id: number, subject: string, projectName: string}`, max 5 entries, newest first

**Rationale**: Consistent with existing localStorage usage in the project (`redmine_calendar_working_hours`, `redmine_calendar_view_mode`, `redmine_calendar_day_range`). Storing `subject` and `projectName` avoids an extra API call to re-resolve them when displaying the list.

**Alternatives considered**: Cookie storage (existing config pattern) — rejected because cookies have 4KB limit which could be hit with many favourites. IndexedDB — rejected (overkill, YAGNI).

---

## Decision 4: Keyboard UX

**Decision**: Arrow keys navigate the search/favourites list; Enter selects the highlighted item and submits; Escape closes the form without saving. The first item in the list is highlighted by default when the form opens (from favourites/last used).

**Rationale**: The spec's P1 success criterion is "under 10 seconds from selection to saved". Keyboard-first is the fastest path: drag → type 2–3 chars → arrow if needed → Enter. No mouse required after the initial drag.

**Alternatives considered**: Click-only — rejected (too slow). Tab navigation — supplementary, not primary.

---

## Decision 5: Edit flow

**Decision**: Clicking an existing calendar event opens a minimal edit form showing the current ticket and a Delete button. Ticket can be changed via the same search + favourites UX. Duration changes are handled by drag-to-resize/move (already implemented) — no duration input in edit form.

**Rationale**: The spec says "fully replaces the existing form". The existing `eventClick` handler needs a target form. A lean edit form is consistent with the feature's minimalism principle. Duration editing via drag is already working and requires no form.

**Alternatives considered**: Keep old full form for edit only — rejected ("old form is removed" per spec assumption). No edit form at all — rejected (users need to be able to correct or delete entries).

---

## Decision 6: Module structure

**Decision**: Rewrite `js/time-entry-form.js` in-place. No new files. The module still exports `openForm(entry, prefill, onSave, onDelete)` with the same signature so `calendar.js` requires no import changes.

**Rationale**: `calendar.js` already calls `openForm()` with this signature. Keeping the same export avoids touching `calendar.js` at all for the create flow. For the edit flow, `eventClick` also calls `openForm()` — same signature, lean behaviour.

**Alternatives considered**: New module `lean-form.js` — rejected (adds a file for no benefit; same interface, same callers).
