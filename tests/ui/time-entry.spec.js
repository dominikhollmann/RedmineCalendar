import { test, expect } from '@playwright/test';
import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';

test.describe('Time entry CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await setupCredentials(page);
    await page.reload();
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  test('clicking a time slot opens the entry form', async ({ page }) => {
    const slot = page.locator('.fc-timegrid-slot[data-time="10:00:00"]').first();
    await slot.click();
    const modal = page.locator('[role="dialog"], .modal, .time-entry-form');
    await expect(modal.first()).toBeVisible({ timeout: 5000 });
  });

  test('double-clicking an entry opens edit form', async ({ page }) => {
    const event = page.locator('.fc-event').first();
    await event.dblclick();
    const modal = page.locator('[role="dialog"], .modal, .time-entry-form');
    await expect(modal.first()).toBeVisible({ timeout: 5000 });
  });
});
