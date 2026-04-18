import { test, expect } from '@playwright/test';
import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';

test.describe('Copy and paste time entries', () => {
  test.beforeEach(async ({ page }) => {
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  test('clipboard banner element exists on page', async ({ page }) => {
    const banner = page.locator('#clipboard-banner');
    await expect(banner).toHaveCount(1);
  });
});
