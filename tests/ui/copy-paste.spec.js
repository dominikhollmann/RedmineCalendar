import { test, expect } from '@playwright/test';
import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';

test.describe('Copy and paste time entries', () => {
  test.beforeEach(async ({ page }) => {
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await setupCredentials(page);
    await page.reload();
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  test('selecting an entry and pressing Ctrl+C shows clipboard banner', async ({ page }) => {
    const event = page.locator('.fc-event').first();
    await event.click();
    await page.keyboard.press('Control+c');
    const banner = page.locator('#clipboard-banner');
    await expect(banner).toBeVisible({ timeout: 3000 });
  });
});
