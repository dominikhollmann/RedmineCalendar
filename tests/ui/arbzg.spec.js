import { test, expect } from '@playwright/test';
import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';

test.describe('ArbZG compliance warnings', () => {
  test('calendar renders with time entries and ArbZG module is loaded', async ({ page }) => {
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
    const hasArbzgTooltip = await page.locator('#arbzg-tooltip').count();
    expect(hasArbzgTooltip).toBe(1);
  });
});
