import { test, expect } from './coverage-fixture.js';
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

  // Feature 033 / US3: the admin-info block (Redmine URL / AI provider / AI
  // model) is removed from the Settings page.
  test('does NOT show admin-info block', async ({ page }) => {
    await page.goto('/settings.html');
    await page.waitForSelector('#settings-form');
    // The element is gone entirely
    await expect(page.locator('#admin-info')).toHaveCount(0);
    // None of the previously-displayed config values appear anywhere
    await expect(page.locator('body')).not.toContainText('mock-proxy');
    await expect(page.locator('body')).not.toContainText('anthropic');
    await expect(page.locator('body')).not.toContainText('claude-haiku');
  });

  test('saves API key and redirects to calendar', async ({ page }) => {
    await page.goto('/settings.html');
    await page.fill('#apiKey', 'test-api-key-12345');
    await page.click('#save-btn');
    await page.waitForURL((url) => !url.pathname.includes('settings'));
    expect(page.url()).not.toContain('settings');
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
