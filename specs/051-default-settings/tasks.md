# Tasks: Sensible First-Launch Defaults

**Branch**: `051-default-settings` | **Date**: 2026-06-25

## Task List

### T-01 — Update unit tests for readWorkingHours (Red)

**File**: `tests/unit/settings.test.js`

- [ ] Change `'readWorkingHours returns null when not set'` to expect `{start:'08:00',end:'18:00'}`
- [ ] Change `'clearWorkingHours removes stored value'` to expect the factory default (not `null`) after clearing

### T-02 — Update unit tests for readWorkingHours edge cases (Red)

**File**: `tests/unit/settings-extras.test.js`

- [ ] Change `'returns null on malformed JSON'` → expect factory default
- [ ] Change `'returns null when stored object is missing fields'` → expect factory default
- [ ] Change `'returns null when stored value is the string "null"'` → expect factory default

### T-03 — Update unit test for readWeeklyHours (Red)

**File**: `tests/unit/settings-extras.test.js`

- [ ] Change `'readWeeklyHours returns null when not set'` → expect `40`

### T-04 — Implement readWorkingHours default (Green)

**File**: `js/working-hours.js`

- [ ] Change `if (!raw) return null;` → `if (!raw) return { start: '08:00', end: '18:00' };`
- [ ] Change `return null;` after missing-fields guard → `return { start: '08:00', end: '18:00' };`
- [ ] Change `catch { return null; }` → `catch { return { start: '08:00', end: '18:00' }; }`

### T-05 — Implement readWeeklyHours default (Green)

**File**: `js/working-hours.js`

- [ ] Change `const num = val ? parseFloat(val) : NaN;` to use the key-absent branch for default:
  `if (val === null) return 40;` before the parse, or adjust the ternary to return `40` when `val` is null

### T-06 — Implement active-view default (FR-001)

**File**: `js/planning-view.js`

- [ ] Line ~97: Change `=== 'planning'` to `!== 'calendar'`

### T-07 — Implement Teams-source default (FR-008)

**File**: `js/planning-view.js`

- [ ] Line ~156: Change `=== '1'` to `!== '0'`

### T-08 — Implement Settings toggle defaults (FR-010)

**File**: `js/settings-page.js`

- [ ] Line 75: Change `=== 'working'` to `!== '24h'`
- [ ] Line 76: Change `=== 'workweek'` to `!== 'full-week'`
- [ ] Line ~217: Change `=== '1'` to `!== '0'`

### T-09 — Verify: all unit tests pass

```bash
npm test
```

### T-10 — Verify: lint + typecheck pass

```bash
npm run lint && npm run typecheck
```

### T-11 — Verify: SQI ≥ 80

```bash
npm run sqi
```
