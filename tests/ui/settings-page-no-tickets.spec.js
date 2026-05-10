import { test, expect } from './coverage-fixture.js';
import { setupConfig, mockRedmineApi } from './helpers.js';

// Feature 025 (FR-006): the Settings page no longer exposes inputs for
// holidayTicket or breakTicket. Both are admin-managed via config.json.
test.describe('Settings page — no ticket-number inputs (feature 025)', () => {
  test.beforeEach(async ({ page }) => {
    await setupConfig(page);
    await mockRedmineApi(page);
  });

  test('weekly hours input is present', async ({ page }) => {
    await page.goto('/settings.html');
    await expect(page.locator('#weeklyHours')).toBeVisible();
  });

  test('does NOT render a holidayTicket input', async ({ page }) => {
    await page.goto('/settings.html');
    await expect(page.locator('#holidayTicket')).toHaveCount(0);
  });

  test('does NOT render a breakTicket input', async ({ page }) => {
    await page.goto('/settings.html');
    await expect(page.locator('#breakTicket')).toHaveCount(0);
  });

  test('does NOT render a "Holiday ticket" label (EN)', async ({ page }) => {
    await page.goto('/settings.html');
    await expect(page.locator('#label-holiday-ticket')).toHaveCount(0);
  });
});
