import { test, expect } from './coverage-fixture.js';
import { mockCdn, setupConfig, mockRedmineApi } from './helpers.js';

// Feature 054: the dark-mode control moved from a settings checkbox to the
// header theme-toggle button (#theme-toggle). Clicking it flips light/dark.

test.describe('Feature 030/054 — dark mode (header toggle)', () => {
  test.beforeEach(async ({ page }) => {
    await mockCdn(page);
    await setupConfig(page);
    await mockRedmineApi(page);
  });

  async function connectAndOpen(page) {
    await page.fill('#apiKey', 'test-api-key-12345');
    await page.click('#connect-btn');
    await page.waitForSelector('#open-calendar-btn:not([disabled])', { timeout: 10000 });
    await page.click('#open-calendar-btn');
    await page.waitForURL((url) => !url.pathname.includes('settings'), { timeout: 10000 });
  }

  test('S1: Settings header shows the theme toggle, light by default', async ({ page }) => {
    await page.goto('/settings.html');
    await expect(page.locator('#theme-toggle')).toBeVisible();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
  });

  test('S2: clicking the toggle immediately re-styles Settings (data-theme set)', async ({
    page,
  }) => {
    await page.goto('/settings.html');
    await page.locator('#theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).not.toBe('rgb(248, 250, 252)');
  });

  test('S5: dark theme persists across reload (data-theme set from first paint)', async ({
    page,
  }) => {
    await page.goto('/settings.html');
    await page.locator('#theme-toggle').click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('S3: calendar inherits the dark theme', async ({ page }) => {
    await page.goto('/settings.html');
    await page.locator('#theme-toggle').click();
    await connectAndOpen(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('S6: no settings theme toggle leaks into the calendar header', async ({ page }) => {
    await page.goto('/settings.html');
    await connectAndOpen(page);
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
    await expect(page.locator('#theme-toggle')).toHaveCount(0);
  });

  test('S7: clicking again switches back to Light (removes data-theme)', async ({ page }) => {
    await page.goto('/settings.html');
    await page.locator('#theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.locator('#theme-toggle').click();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
  });

  test('S8: first-time visit defaults to light', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.removeItem('redmine_calendar_theme');
      } catch {
        /* ignore */
      }
    });
    await page.goto('/settings.html');
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
  });

  test('S9: data-theme is set before paint on a fresh load (inline head script)', async ({
    page,
  }) => {
    await page.goto('/settings.html');
    await page.locator('#theme-toggle').click();
    await page.goto('/index.html');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
