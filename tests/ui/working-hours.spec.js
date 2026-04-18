import { test, expect } from '@playwright/test';
import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';

test.describe('Working hours toggle', () => {
  test.beforeEach(async ({ page }) => {
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  test('working hours toggle button exists', async ({ page }) => {
    const toggleBtn = page.locator('button').filter({ hasText: /working|Arbeitszeit/i });
    await expect(toggleBtn.first()).toBeVisible();
  });
});
