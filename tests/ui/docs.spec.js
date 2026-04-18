import { test, expect } from '@playwright/test';
import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';

test.describe('Documentation panel', () => {
  test.beforeEach(async ({ page }) => {
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await setupCredentials(page);
    await page.reload();
  });

  test('opens docs panel on help button click', async ({ page }) => {
    await page.click('.docs-help-btn');
    const panel = page.locator('#docs-panel');
    await expect(panel).toBeVisible();
  });

  test('closes docs panel on close button', async ({ page }) => {
    await page.click('.docs-help-btn');
    await page.click('.docs-panel__close');
    const panel = page.locator('#docs-panel');
    await expect(panel).toBeHidden({ timeout: 3000 });
  });
});
