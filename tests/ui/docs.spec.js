import { test, expect } from '@playwright/test';
import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';

test.describe('Documentation panel', () => {
  test.beforeEach(async ({ page }) => {
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  test('opens docs panel on help button click', async ({ page }) => {
    await page.click('.docs-help-btn');
    const panel = page.locator('#docs-panel');
    await expect(panel).toBeVisible();
  });

  test('closes docs panel on close button', async ({ page }) => {
    await page.click('.docs-help-btn');
    await expect(page.locator('#docs-panel')).toBeVisible();
    await page.click('.docs-panel__close');
    await page.waitForTimeout(500);
    const isHidden = await page.locator('#docs-panel').evaluate(el => el.hasAttribute('hidden'));
    expect(isHidden).toBe(true);
  });
});
