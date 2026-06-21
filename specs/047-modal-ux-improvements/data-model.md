# Data Model: Modal UX Improvements (047)

No new entities. One new localStorage key; one constant changed.

---

## New localStorage Key

| Key                          | Type             | Default         | Values                                          | Persisted by                        |
| ---------------------------- | ---------------- | --------------- | ----------------------------------------------- | ----------------------------------- |
| `redmine_calendar_fast_mode` | string \| absent | absent (→ true) | `'false'` = off; absent or any other value = on | `settings-page.js` onChange handler |

**Read**: `getFastMode()` in `js/time-entry-form-utils.js` — returns `localStorage.getItem(STORAGE_KEY_FAST_MODE) !== 'false'`
**Write**: Settings page checkbox onChange: `localStorage.setItem(STORAGE_KEY_FAST_MODE, 'false')` when unchecked; `localStorage.removeItem(STORAGE_KEY_FAST_MODE)` (or `setItem(..., 'true')`) when re-checked.

---

## Changed Constant

| Location                              | Name         | Old value | New value |
| ------------------------------------- | ------------ | --------- | --------- |
| `js/time-entry-form-utils.js` line 11 | `RECENT_CAP` | `8`       | `20`      |

Existing entries in `redmine_calendar_last_used` with more than 20 items will be silently trimmed on the next call to `addLastUsed()`. No migration needed; data loss is acceptable (oldest entries only).

---

## Unchanged Entities

- `redmine_calendar_favourites`: shape unchanged; star toggle on Last Used rows calls existing `toggleFavourite()` which writes to this key.
- `redmine_calendar_last_used`: shape unchanged; only the cap grows.
