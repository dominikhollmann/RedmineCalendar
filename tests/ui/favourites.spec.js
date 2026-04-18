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

  test('favourites section appears in time entry form', async ({ page }) => {
    const slot = page.locator('.fc-timegrid-slot[data-time="10:00:00"]').first();
    await slot.click();
    const favouritesHeading = page.locator('text=/Favourites|Favoriten/i');
    await expect(favouritesHeading.first()).toBeVisible({ timeout: 5000 });
  });
});
