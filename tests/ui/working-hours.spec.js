import { test, expect } from '@playwright/test';
import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';

test.describe('Working hours toggle', () => {
  test.beforeEach(async ({ page }) => {
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await setupCredentials(page);
    await page.evaluate(() => {
      localStorage.setItem('redmine_calendar_working_hours', JSON.stringify({ start: '08:00', end: '17:00' }));
    });
    await page.reload();
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  test('working hours toggle button exists', async ({ page }) => {
    const toggleBtn = page.locator('button').filter({ hasText: /working|Arbeitszeit/i });
    await expect(toggleBtn.first()).toBeVisible();
  });
});
