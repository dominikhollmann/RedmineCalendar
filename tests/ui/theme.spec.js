import { test, expect } from './coverage-fixture.js';
import { mockCdn, setupConfig, mockRedmineApi } from './helpers.js';

test.describe('Feature 030 — dark mode (settings-only)', () => {
  test.beforeEach(async ({ page }) => {
    await mockCdn(page);
    await setupConfig(page);
    await mockRedmineApi(page);
  });

  test('S1: Settings page shows the dark-mode toggle unchecked by default', async ({ page }) => {
    await page.goto('/settings.html');
    await expect(page.locator('#settingDarkMode')).not.toBeChecked();
  });

  test('S2: enabling dark mode immediately re-styles Settings (data-theme set)', async ({
    page,
  }) => {
    await page.goto('/settings.html');
    await page.locator('#settingDarkMode').check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    // Body background should differ between themes (using --color-bg)
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).not.toBe('rgb(248, 250, 252)'); // not light --color-bg
  });

  test('S5: dark theme persists across reload (data-theme set from first paint)', async ({
    page,
  }) => {
    await page.goto('/settings.html');
    await page.locator('#settingDarkMode').check();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('S3: calendar inherits the dark theme', async ({ page }) => {
    await page.goto('/settings.html');
    await page.locator('#settingDarkMode').check();
    // Save credentials so we can reach calendar
    await page.fill('#apiKey', 'test-api-key-12345');
    await page.click('#save-btn');
    await page.waitForURL((url) => !url.pathname.includes('settings'), { timeout: 10000 });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('S6: no theme toggle in the calendar toolbar / app header', async ({ page }) => {
    await page.goto('/settings.html');
    await page.fill('#apiKey', 'test-api-key-12345');
    await page.click('#save-btn');
    await page.waitForURL((url) => !url.pathname.includes('settings'), { timeout: 10000 });
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
    // No theme toggle anywhere in the header or FC toolbar:
    const themeControl = page.locator('.app-header #settingDarkMode, .fc-toolbar #settingDarkMode');
    await expect(themeControl).toHaveCount(0);
  });

  test('S7: switching back to Light removes data-theme', async ({ page }) => {
    await page.goto('/settings.html');
    await page.locator('#settingDarkMode').check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('#settingDarkMode').uncheck();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
  });

  test('S8: first-time visit defaults to light', async ({ page }) => {
    // Pre-clear storage before any navigation
    await page.addInitScript(() => {
      try {
        localStorage.removeItem('redmine_calendar_theme');
      } catch {
        /* ignore */
      }
    });
    await page.goto('/settings.html');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
    await expect(page.locator('#settingDarkMode')).not.toBeChecked();
  });

  test('S9: data-theme is set before paint on a fresh load (inline head script)', async ({
    page,
  }) => {
    // Pre-seed storage by visiting once and toggling
    await page.goto('/settings.html');
    await page.locator('#settingDarkMode').check();
    // Now do a fresh navigation that exercises the inline head script
    await page.goto('/index.html');
    // The attribute should be present immediately, before any module script
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
