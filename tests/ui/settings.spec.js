import { test, expect } from '@playwright/test';
import { setupConfig, mockRedmineApi } from './helpers.js';

test.describe('Settings page', () => {
  test.beforeEach(async ({ page }) => {
    await setupConfig(page);
    await mockRedmineApi(page);
  });

  test('shows welcome banner for first-time user', async ({ page }) => {
    await page.goto('/settings.html');
    const banner = page.locator('#first-time-banner');
    await expect(banner).toBeVisible();
  });

  test('shows admin config as read-only', async ({ page }) => {
    await page.goto('/settings.html');
    const adminInfo = page.locator('#admin-info');
    await expect(adminInfo).toBeVisible();
    await expect(adminInfo).toContainText('redmine');
  });

  test('saves API key and redirects to calendar', async ({ page }) => {
    await page.goto('/settings.html');
    await page.fill('#apiKey', 'test-api-key-12345');
    await page.click('#save-btn');
    await page.waitForURL('**/index.html');
    expect(page.url()).toContain('index.html');
  });

  test('toggles between API key and basic auth', async ({ page }) => {
    await page.goto('/settings.html');
    const basicRadio = page.locator('input[value="basic"]');
    await basicRadio.click();
    await expect(page.locator('#field-basic')).toBeVisible();
    await expect(page.locator('#field-apikey')).toBeHidden();
  });

  test('shows error for missing config.json', async ({ page }) => {
    await page.route('**/config.json', (route) => route.fulfill({ status: 404 }));
    await page.goto('/settings.html');
    const error = page.locator('#config-error');
    await expect(error).toBeVisible();
  });

  test('password toggle shows/hides API key', async ({ page }) => {
    await page.goto('/settings.html');
    const input = page.locator('#apiKey');
    await expect(input).toHaveAttribute('type', 'password');
    await page.click('.password-toggle[data-target="apiKey"]');
    await expect(input).toHaveAttribute('type', 'text');
  });
});
