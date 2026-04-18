import { test, expect } from '@playwright/test';
import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';

test.describe('Work week toggle', () => {
  test.beforeEach(async ({ page }) => {
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await setupCredentials(page);
    await page.reload();
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  test('Mo-Fr toggle button exists', async ({ page }) => {
    const toggleBtn = page.locator('button').filter({ hasText: /Mo|Fr/i });
    await expect(toggleBtn.first()).toBeVisible();
  });
});
