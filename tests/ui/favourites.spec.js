import { test, expect } from '@playwright/test';
import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';

test.describe('Favourites', () => {
  test.beforeEach(async ({ page }) => {
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  test('time entry form opens from calendar slot', async ({ page }) => {
    const slot = page.locator('.fc-timegrid-slot[data-time="10:00:00"]').first();
    await slot.click();
    const form = page.locator('[role="dialog"], .modal, .time-entry-form, .fc-popover');
    await expect(form.first()).toBeVisible({ timeout: 5000 });
  });
});
