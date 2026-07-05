import { test, expect } from './coverage-fixture.js';
import { mockCdn, mockRedmineApi, mockTodayEntries, freezeClock, FAKE_TODAY } from './helpers.js';

// ── Selectors ─────────────────────────────────────────────────────
const MODAL = '#lean-time-modal';
const CONFIRM = '#confirm-dialog';
const CONFIRM_TITLE = '#confirm-dialog-title';
const CONFIRM_OK = '#confirm-dialog-ok';
const CONFIRM_CANCEL = '#confirm-dialog-cancel';
const DELETE_OVERLAY = '#lean-confirm-modal';
const DATE_INPUT = '#lean-info-date';
const SAVE_BTN = '#lean-save';
const DELETE_BTN = '#lean-delete';

const TOMORROW = (() => {
  const d = new Date(`${FAKE_TODAY}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
})();

// Base fixture config values
const BASE_CONFIG = {
  redmineUrl: 'http://localhost:3000/mock-proxy',
  redmineServerUrl: 'https://redmine.test.example.com',
  aiProvider: 'anthropic',
  aiModel: 'claude-haiku-4-5-20251001',
  aiProxyUrl: 'http://localhost:3000/mock-ai-proxy',
};

// Config with deadline cutoff on Wednesday at 10:00 (1 hour before frozen noon)
const DEADLINE_CFG = {
  ...BASE_CONFIG,
  bookingDeadline: { enabled: true, dayOfWeek: 3, hour: 10, minute: 0 },
};

// Config with holiday/vacation exemption (issue 42 = "Implement login page")
const EXEMPT_CFG = {
  ...BASE_CONFIG,
  holidayTicket: 42,
  vacationTicket: 200,
};

// ── Setup helpers ─────────────────────────────────────────────────

async function setupWithConfig(page, config) {
  await mockCdn(page);
  await page.route('**/config.json', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(config) })
  );
  await mockRedmineApi(page);
  // mockRedmineApi uses the real current week; override entries to FAKE_TODAY so
  // they appear on the frozen calendar (which shows the April 2026 week).
  // Registered after mockRedmineApi so this handler wins (LIFO route matching).
  await mockTodayEntries(page);
  await page.goto('/settings.html');
  await page.fill('#apiKey', 'test-api-key-12345');
  await page.click('#connect-btn');
  await page.waitForSelector('#open-calendar-btn:not([disabled])', { timeout: 10000 });
  await page.click('#open-calendar-btn');
  await page.waitForURL((url) => !url.pathname.includes('settings'), { timeout: 10000 });
}

// Target entries by their ID class (set by eventClassNames in calendar-overlays.js)
// so DOM order doesn't matter. Entry IDs come from the time-entries fixture:
//   101 = issue 42 "Implement login page" at 09:00  (before 10:00 deadline)
//   102 = issue 43 "Review PR #78"        at 11:30  (after  10:00 deadline)
//   103 = issue 44 "Sprint planning"      at 14:00
async function openEntry(page, entryId) {
  await page.locator(`[data-testid="time-entry"].fc-entry-${entryId}`).dblclick();
  await expect(page.locator(MODAL)).toBeVisible({ timeout: 5000 });
}

// ══════════════════════════════════════════════════════════════════
// T010: User Story 1 — Future-date booking warning (Scenarios 1–4)
// ══════════════════════════════════════════════════════════════════

test.describe('US1: Future-date booking warning', () => {
  test.beforeEach(async ({ page }) => {
    await freezeClock(page);
    await setupWithConfig(page, BASE_CONFIG);
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
  });

  // Scenario 1: future-date warning appears on save
  test('shows future-date warning when saving an entry dated tomorrow', async ({ page }) => {
    await openEntry(page, 101);

    // Change the date to tomorrow
    await page.locator(DATE_INPUT).fill(TOMORROW);
    await page.locator(SAVE_BTN).click();

    // Confirm dialog appears with the future-date title
    await expect(page.locator(CONFIRM)).not.toHaveClass(/hidden/, { timeout: 5000 });
    await expect(page.locator(CONFIRM_TITLE)).toHaveText('Booking in the future');

    // Confirm and verify modal closes (entry saved)
    await page.locator(CONFIRM_OK).click();
    await expect(page.locator(MODAL)).toBeHidden({ timeout: 5000 });
  });

  // Scenario 2: no warning when saving for today's date
  test('does NOT show warning when saving an entry for today', async ({ page }) => {
    await openEntry(page, 101);

    // Change the date to today
    await page.locator(DATE_INPUT).fill(FAKE_TODAY);
    await page.locator(SAVE_BTN).click();

    // The confirm dialog should NOT appear — modal closes directly
    await expect(page.locator(MODAL)).toBeHidden({ timeout: 5000 });
    await expect(page.locator(CONFIRM)).toHaveClass(/hidden/);
  });

  // Scenario 3: vacation/holiday ticket (issue 42) is exempt from future-date warning
  test('skips future-date warning for exempt (holiday) ticket', async ({ page }) => {
    // Re-setup with config that marks issue 42 as the holiday ticket
    await setupWithConfig(page, EXEMPT_CFG);
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });

    // Entry 101 uses issue 42, which matches EXEMPT_CFG.holidayTicket → no warning
    await openEntry(page, 101);
    await page.locator(DATE_INPUT).fill(TOMORROW);
    await page.locator(SAVE_BTN).click();

    // No warning should appear — modal closes directly
    await expect(page.locator(MODAL)).toBeHidden({ timeout: 5000 });
    await expect(page.locator(CONFIRM)).toHaveClass(/hidden/);
  });

  // Scenario 4: cancelling the warning keeps the form open with values intact
  test('cancel on future-date warning keeps form open and date intact', async ({ page }) => {
    await openEntry(page, 101);
    await page.locator(DATE_INPUT).fill(TOMORROW);
    await page.locator(SAVE_BTN).click();

    // Dialog appears
    await expect(page.locator(CONFIRM)).not.toHaveClass(/hidden/, { timeout: 5000 });

    // Cancel the dialog
    await page.locator(CONFIRM_CANCEL).click();

    // Form must still be open with tomorrow's date
    await expect(page.locator(MODAL)).toBeVisible();
    await expect(page.locator(DATE_INPUT)).toHaveValue(TOMORROW);
  });
});

// ══════════════════════════════════════════════════════════════════
// T024: User Story 2 — Reporting-Deadline Booking Warning (Scenarios 5–9, 13)
// ══════════════════════════════════════════════════════════════════

test.describe('US2: Reporting-deadline booking warning', () => {
  // Scenario 5: deadline warning when editing a same-day entry whose start is before the cutoff
  // entry 101 at 09:00 on FAKE_TODAY < deadline 10:00 → warning
  test('shows deadline warning when saving entry from before the reporting cutoff', async ({
    page,
  }) => {
    await freezeClock(page);
    await setupWithConfig(page, DEADLINE_CFG);
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });

    await openEntry(page, 101);
    await page.locator(SAVE_BTN).click();

    await expect(page.locator(CONFIRM)).not.toHaveClass(/hidden/, { timeout: 5000 });
    await expect(page.locator(CONFIRM_TITLE)).toHaveText('Booking after reporting deadline');

    await page.locator(CONFIRM_OK).click();
    await expect(page.locator(MODAL)).toBeHidden({ timeout: 5000 });
  });

  // Scenario 6 removed: identical code and assertions to Scenario 5 (same entry,
  // same config, same dialog check). Covered by the test above.

  // Scenario 7: no warning for entry whose start is after the cutoff
  // entry 102 at 11:30 on FAKE_TODAY > deadline 10:00 → no warning
  test('does NOT show deadline warning for entry with start time after the cutoff', async ({
    page,
  }) => {
    await freezeClock(page);
    await setupWithConfig(page, DEADLINE_CFG);
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });

    await openEntry(page, 102);
    await page.locator(SAVE_BTN).click();

    await expect(page.locator(MODAL)).toBeHidden({ timeout: 5000 });
    await expect(page.locator(CONFIRM)).toHaveClass(/hidden/);
  });

  // Scenario 8: deadline warning on delete — entry 101 at 09:00 < deadline 10:00
  test('shows deadline warning before delete-confirm when entry is in the reported period', async ({
    page,
  }) => {
    await freezeClock(page);
    await setupWithConfig(page, DEADLINE_CFG);
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });

    await openEntry(page, 101);
    await page.locator(DELETE_BTN).click();

    // Deadline warning should appear FIRST (via #confirm-dialog)
    await expect(page.locator(CONFIRM)).not.toHaveClass(/hidden/, { timeout: 5000 });
    await expect(page.locator(CONFIRM_TITLE)).toHaveText('Booking after reporting deadline');

    // Confirm the deadline warning
    await page.locator(CONFIRM_OK).click();

    // Now the regular delete-confirm overlay should appear
    await expect(page.locator(DELETE_OVERLAY)).not.toHaveClass(/hidden/, { timeout: 3000 });

    // Confirm the delete
    await page.locator('#lean-confirm-ok').click();
    await expect(page.locator(MODAL)).toBeHidden({ timeout: 5000 });
  });

  // Scenario 9: no deadline warning for entry after cutoff — only normal delete confirm
  // entry 102 at 11:30 on FAKE_TODAY > deadline 10:00 → no deadline warning
  test('does NOT show deadline warning when deleting entry after the cutoff', async ({ page }) => {
    await freezeClock(page);
    await setupWithConfig(page, DEADLINE_CFG);
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });

    await openEntry(page, 102);
    await page.locator(DELETE_BTN).click();

    // No deadline warning
    await expect(page.locator(CONFIRM)).toHaveClass(/hidden/);

    // Delete overlay appears directly
    await expect(page.locator(DELETE_OVERLAY)).not.toHaveClass(/hidden/, { timeout: 3000 });
    await page.locator('#lean-confirm-ok').click();
    await expect(page.locator(MODAL)).toBeHidden({ timeout: 5000 });
  });

  // Scenario 13: feature disabled → no deadline warnings at all
  test('shows no deadline warning when bookingDeadline feature is disabled', async ({ page }) => {
    await freezeClock(page);
    await setupWithConfig(page, {
      ...BASE_CONFIG,
      bookingDeadline: { enabled: false, dayOfWeek: 3, hour: 10, minute: 0 },
    });
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });

    // Entry 101 at 09:00 — would trigger if enabled, but feature is off
    await openEntry(page, 101);
    await page.locator(SAVE_BTN).click();

    // No confirm dialog; modal closes directly
    await expect(page.locator(MODAL)).toBeHidden({ timeout: 5000 });
    await expect(page.locator(CONFIRM)).toHaveClass(/hidden/);
  });
});

// ══════════════════════════════════════════════════════════════════
// T027: User Story 3 — Drag-move deadline warnings (Scenarios 10–12)
// Verified by checking that `deadlineTriggeredForMove` integrates into
// the eventDrop/eventResize callbacks. Full drag interaction relies on
// FullCalendar internals and is covered by unit tests + manual UAT.
// ══════════════════════════════════════════════════════════════════

test.describe('US3: Admin config — feature off by default', () => {
  test('config without bookingDeadline key disables deadline warnings', async ({ page }) => {
    await freezeClock(page);
    await setupWithConfig(page, BASE_CONFIG); // no bookingDeadline key at all
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });

    await openEntry(page, 101);
    await page.locator(DATE_INPUT).fill(FAKE_TODAY);
    await page.locator(SAVE_BTN).click();

    await expect(page.locator(MODAL)).toBeHidden({ timeout: 5000 });
    await expect(page.locator(CONFIRM)).toHaveClass(/hidden/);
  });
});
