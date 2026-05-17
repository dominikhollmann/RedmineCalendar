# Quickstart — Small UX & Accessibility Fixes

How to reproduce each story's bug, drive the fix red→green, and run the verification locally. This file doubles as the source-of-truth for `/speckit-uat-run` to walk through with the user.

## Prerequisites

- Local checkout on branch `033-small-ux-a11y-fixes`.
- `npm install` complete; `@axe-core/playwright` installed as a dev dependency (added by Story 4 task; until then, Story 4 tests are skipped).
- A `config.json` reachable by `npm run dev` with both `holidayTicket` and `vacationTicket` set to known Redmine ticket IDs (e.g., 1001 and 1002) for Story 2 reproduction.
- `npm run dev` running on `https://localhost:3000` (HTTPS dev server + bundled CORS proxies — required for the time-entry modal to work end-to-end).

## Story 1 — Time-entry modal no longer closes on outside click

### Reproduce (current bug, before fix)

1. `npm run dev`, open `https://localhost:3000`.
2. Click any empty slot on the calendar — the time-entry modal opens.
3. Type a few characters into the issue-search input.
4. Click anywhere on the dim backdrop outside the modal box.
5. **Observed**: modal closes, your typed text is lost.

### Red test (before fix)

`tests/ui/modal.spec.js` adds a test case: open modal → type into search → click backdrop → assert modal is still visible AND search input still contains the typed text. Run `npm run test:ui -- modal.spec.js` — the test fails because the modal closes.

### Green (fix)

Edit `js/time-entry-form.js`:

- Delete the `_outsideClickHandler` module variable (line 35).
- Delete the cleanup blocks at lines 787–790 and 801–804.
- Delete the handler-installation block at lines 859–870 (the `setTimeout` that installs the document-level click listener).

Re-run `npm run test:ui -- modal.spec.js` — green.

### Verify Escape and X still close

The same test file adds two more cases: (a) open modal → press Escape → assert modal hidden; (b) open modal → click X → assert modal hidden. Both pass against the same source change because the keydown handler and the X button onclick are untouched.

### Verify drag-from-inside-to-outside (FR-003)

The same test file adds a case using Playwright's `page.mouse.move`/`down`/`up`: open modal → mousedown inside the modal content → drag pointer outside → mouseup → assert modal still open. This passes "for free" once the outside-click handler is removed (there is no longer any handler that would close on outside).

## Story 2 — ArbZG exemption for vacation / holiday entries

### Reproduce (current bug)

1. Set `holidayTicket: 1001` and `vacationTicket: 1002` in your dev `config.json`.
2. Book a single 8-hour time entry on ticket `1001` for any Monday.
3. Reload the calendar.
4. **Observed**: an ArbZG "break required" warning (and possibly other warnings) appears on that day even though it is a public-holiday entry.

### Red tests (before fix) — `tests/unit/arbzg.test.js`

Add unit tests that import `computeArbzgWarnings` from `js/arbzg.js`:

- `holidayTicket-only day produces zero warnings of any category` — pass `[{date:'2026-05-04', issueId:1001, hours:8, startTime:'09:00'}]` + `cfg={holidayTicket:1001}` → expect every category empty.
- `vacationTicket-only day produces zero warnings of any category` — same with `issueId:1002` + `cfg={vacationTicket:1002}`.
- `mixed day evaluates only non-exempt entries` — pass `[{...1001,4h},{...regular,4h}]` + cfg → expect break-rule input to see only the 4 h of regular work.
- `vacation entry on Sunday does not trigger sunday warning` — pass a Sunday-dated `1002` entry → expect `sunday` array empty.
- `missing cfg behaves as today` — pass `cfg=undefined` → expect identical output to current implementation (snapshot the current behaviour first, then assert byte-equivalence after the change).
- `non-positive ticket value treated as unconfigured` — `cfg={holidayTicket:0}` and `cfg={holidayTicket:'bad'}` → no exemption.

Run `npm test -- arbzg`. All new tests fail (function signature is `(entries, year)` — the cfg argument is ignored today).

### Green (fix) — `js/arbzg.js`

1. Update the JSDoc for `computeArbzgWarnings` to add the cfg parameter (shape per `data-model.md`).
2. Inside the function, change the existing line `const filtered = entries.filter((e) => !e._isMidnightContinuation);` to additionally drop exempt entries:

   ```js
   const holidayId = positiveIntOrNull(cfg?.holidayTicket);
   const vacationId = positiveIntOrNull(cfg?.vacationTicket);
   const filtered = entries.filter((e) => {
     if (e._isMidnightContinuation) return false;
     const id = Number(e?.issueId);
     if (holidayId != null && id === holidayId) return false;
     if (vacationId != null && id === vacationId) return false;
     return true;
   });
   ```

3. Define `positiveIntOrNull` inline (or reuse the same helper from `js/chatbot-tools.js` — `positiveTicketOrNull`; the project already has this exact predicate).

### Green (fix) — `js/calendar.js`

Update both call sites (currently at lines 446 and ~496) to pass the cfg:

```js
window._calendarArbzgWarnings = computeArbzgWarnings(entries, year, {
  holidayTicket: cfg?.holidayTicket,
  vacationTicket: cfg?.vacationTicket,
});
```

Run `npm test -- arbzg` → green. Run `npm run test:coverage` → confirm new filter lines hit ≥ 95 %.

### Manual verification

Repeat the reproduction steps — the holiday-ticket day shows no ArbZG warnings of any category; the weekly badge does not flag the vacation week.

## Story 3 — Settings page no longer shows the server-configuration block

### Reproduce (current bug)

1. Open `https://localhost:3000/settings.html`.
2. **Observed**: a section at the top of the settings card lists "Redmine URL: …", "AI Provider: …", "AI Model: …".

### Red test — `tests/ui/settings.spec.js`

Add a test: navigate to `settings.html` → assert that no element on the page has text matching the `config.json` `redmineUrl` value. The test fails today.

### Green (fix)

- `js/settings.js`: delete the `renderAdminInfo` function (lines 77–86) and the call site at line 151.
- `settings.html`: delete the `<div id="admin-info" …>` line and its surrounding empty block.
- `css/style.css`: delete the `.admin-info` rules (around lines 754 and 1795).
- `js/i18n/en.js` and `js/i18n/de.js`: delete the four `admin.heading`, `admin.redmine_url`, `admin.ai_provider`, `admin.ai_model` keys.

Run `npm run test:ui -- settings.spec.js` → green. Run `npm run lint && npm run typecheck` → green (no orphan references).

### Manual verification

Reload `settings.html`. The first content under the page header is now the working-hours toggle row; no admin info appears anywhere.

## Story 4 — Accessibility audit & remediation (full app, WCAG 2.2 AA)

### Step 4a — Install the CI scan harness (red, for everyone)

1. `npm install --save-dev @axe-core/playwright`.
2. Create `tests/ui/a11y.spec.js` implementing the surface matrix in `contracts/a11y-contract.md` § Contract 2. Each cell:

   ```js
   import { AxeBuilder } from '@axe-core/playwright';
   const results = await new AxeBuilder({ page })
     .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'])
     .analyze();
   expect(results.violations).toEqual([]);
   ```

3. Run `npm run test:ui -- a11y.spec.js` — almost every cell fails. **This is the audit driver.** Each violation produces a row in `a11y-audit.md`.

### Step 4b — Audit (produce `a11y-audit.md`)

For each failing cell, transcribe the axe finding(s) into the appropriate surface section in `a11y-audit.md` per the schema in `data-model.md`. Add manual findings the scanner cannot detect:

- Keyboard-only walkthrough: Tab through every surface; record any keyboard trap, missing focus indicator, illogical Tab order.
- Screen-reader sanity pass (NVDA on Windows, or VoiceOver on macOS): record any missing accessible names, dynamic content not announced, dialog-pattern violations.
- Contrast: confirm axe-flagged pairs and check the Fluent 2 token layer (feature 031) for any default-token failures.

Each finding gets a triage decision per FR-014; default is **Fixed in this feature**.

### Step 4c — Remediate (green)

Work surface by surface, lowest-effort first:

1. **Static HTML/lang** (`index.html`, `settings.html`): ensure `<html lang="…">` is set on first paint and updates if the locale changes at runtime.
2. **Decorative icons** (across all surfaces): `aria-hidden="true"` on anything purely visual; accessible labels on meaningful icons.
3. **Time-entry modal** — already gains the dialog ARIA pattern per Contract 1; add `role`, `aria-modal`, `aria-labelledby`, focus trap, focus restore, `inert` on the calendar underneath.
4. **Settings** — landmarks (`<main>`, `<header>`), accessible form labels, contrast.
5. **Calendar (desktop + mobile day-view)** — focus indicators with ≥3:1 contrast in both themes; mobile day-view target sizes ≥24×24 CSS px (WCAG 2.5.8); `aria-live="polite"` on the anomaly-tag container.
6. **Chatbot panel** — convert to dialog ARIA pattern; sentence-boundary live region for streaming output; ensure Escape closes; restore focus to the open-chatbot button.
7. **Docs panel** — same dialog ARIA pattern as chatbot.
8. **Voice-input UI** — `aria-live="polite"` region announcing state transitions (idle / listening / processing); accessible label on the mic button that reflects state; `aria-busy` during processing.
9. **Fluent 2 tokens** — fix any contrast failures in `css/style.css` token definitions, not per-component (per spec edge case).

### Step 4d — Verify (green CI gate)

- `npm run test:ui -- a11y.spec.js` — all 14 cells green.
- `npm run test:ui` (full suite) — green.
- `npm run test:coverage` — green (≥ 95 % per file).
- `npm run sqi:json` — composite stays in GREEN band (≥ 60).
- Commit `a11y-audit.md` with all rows in "Fixed" triage (or "Deferred" with the FR-014-mandated owner + follow-up issue, or "N/A" with rationale).

## Full local verification

```bash
npm install
npm run lint && npm run format:check && npm run htmlhint && npm run typecheck
npm run test:coverage   # Vitest unit tests (incl. ArbZG)
npm run test:ui         # Playwright UI tests (incl. 14 axe cells)
npm run sqi             # Software Quality Index — must be GREEN
```

All of these are the constitution VI gate; CI runs them in the same order.
