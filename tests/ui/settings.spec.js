import { test, expect } from './coverage-fixture.js';
import { mockCdn, setupConfig, mockRedmineApi } from './helpers.js';

test.describe('Settings page', () => {
  test.beforeEach(async ({ page }) => {
    // mockCdn strips the page CSP so the same-origin /mock-proxy connection test
    // (connect → getCurrentUser) is not blocked under the local HTTPS dev-server.
    await mockCdn(page);
    await setupConfig(page);
    await mockRedmineApi(page);
  });

  test('shows welcome banner for first-time user', async ({ page }) => {
    await page.goto('/settings.html');
    await expect(page.locator('#first-time-banner')).toBeVisible();
  });

  // Feature 033 / US3: the admin-info block (Redmine URL / AI provider / AI
  // model) is removed from the Settings page.
  test('does NOT show admin-info block', async ({ page }) => {
    await page.goto('/settings.html');
    await page.waitForSelector('#section-auth');
    await expect(page.locator('#admin-info')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('mock-proxy');
    await expect(page.locator('body')).not.toContainText('anthropic');
    await expect(page.locator('body')).not.toContainText('claude-haiku');
  });

  // Feature 054: explicit Verbinden + connection-gated footer (no global save).
  test('connect enables the footer CTA which opens the calendar', async ({ page }) => {
    await page.goto('/settings.html');
    await expect(page.locator('#open-calendar-btn')).toBeDisabled();
    await page.fill('#apiKey', 'test-api-key-12345');
    await page.click('#connect-btn');
    await expect(page.locator('#conn-status')).toHaveAttribute('data-state', 'connected');
    await expect(page.locator('#open-calendar-btn')).toBeEnabled();
    await page.click('#open-calendar-btn');
    await page.waitForURL((url) => !url.pathname.includes('settings'));
    expect(page.url()).not.toContain('settings');
  });

  // Feature 054: editing a credential after connecting invalidates the status.
  test('editing the key after connect returns to disconnected with a hint', async ({ page }) => {
    await page.goto('/settings.html');
    await page.fill('#apiKey', 'test-api-key-12345');
    await page.click('#connect-btn');
    await expect(page.locator('#conn-status')).toHaveAttribute('data-state', 'connected');
    await page.fill('#apiKey', 'changed-key');
    await expect(page.locator('#conn-status')).toHaveAttribute('data-state', 'disconnected');
    await expect(page.locator('#conn-hint')).toBeVisible();
    await expect(page.locator('#open-calendar-btn')).toBeDisabled();
  });

  test('toggles between API key and basic auth', async ({ page }) => {
    await page.goto('/settings.html');
    await page
      .locator('label.segmented-option', { has: page.locator('input[value="basic"]') })
      .click();
    await expect(page.locator('#field-basic')).toBeVisible();
    await expect(page.locator('#field-apikey')).toBeHidden();
  });

  test('shows error for missing config.json', async ({ page }) => {
    await page.route('**/config.json', (route) => route.fulfill({ status: 404 }));
    await page.goto('/settings.html');
    await expect(page.locator('#config-error')).toBeVisible();
  });

  test('password toggle shows/hides API key', async ({ page }) => {
    await page.goto('/settings.html');
    const input = page.locator('#apiKey');
    await expect(input).toHaveAttribute('type', 'password');
    await page.click('.password-toggle[data-target="apiKey"]');
    await expect(input).toHaveAttribute('type', 'text');
  });

  // Feature 047 / 054 — Fast Mode is now a role=switch control.
  test('Fast Mode switch is present and on by default', async ({ page }) => {
    await page.goto('/settings.html');
    const sw = page.locator('#settingFastMode');
    await expect(sw).toBeVisible();
    await expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  test('toggling Fast Mode off persists false to localStorage', async ({ page }) => {
    await page.goto('/settings.html');
    await page.locator('#settingFastMode').click();
    await expect(page.locator('#settingFastMode')).toHaveAttribute('aria-checked', 'false');
    const value = await page.evaluate(() => localStorage.getItem('redmine_calendar_fast_mode'));
    expect(value).toBe('false');
  });
});
