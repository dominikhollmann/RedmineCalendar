// Feature 031 — Fluent 2 + CI overlay UI checks.
// This spec covers the functional integration of branding.js into the page
// bootstrap. Actual visual-regression baselines (Playwright `toHaveScreenshot`)
// are kept out of CI here to avoid OS-specific font-rendering drift per
// research.md §R6; a reviewer captures baselines locally with
// `--update-snapshots` when needed.
import { test, expect } from './coverage-fixture.js';
import { mockCdn, mockRedmineApi } from './helpers.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, '..', 'fixtures');
const baseConfig = JSON.parse(readFileSync(resolve(fixturesDir, 'config.json'), 'utf-8'));

async function withConfig(page, overrides) {
  const merged = { ...baseConfig, ...overrides };
  await page.route('**/config.json', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(merged) })
  );
}

test.describe('Feature 031 — Fluent 2 + CI overlay', () => {
  test.beforeEach(async ({ page }) => {
    await mockCdn(page);
    await mockRedmineApi(page);
  });

  test('S7: brand-logo placeholder exists on both pages (hidden by default)', async ({ page }) => {
    await withConfig(page, {});
    await page.goto('/settings.html');
    const logo = page.locator('.brand-logo');
    await expect(logo).toHaveCount(1);
    await expect(logo).toBeHidden();
  });

  test('S6: brandPrimary sets --ci-primary on <html>', async ({ page }) => {
    await withConfig(page, { brandPrimary: '#0F6CBD' });
    await page.goto('/settings.html');
    // Wait for the async config-driven CI apply to land.
    await page.waitForFunction(
      () =>
        getComputedStyle(document.documentElement).getPropertyValue('--ci-primary').trim() !== ''
    );
    const ciPrimary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--ci-primary').trim()
    );
    expect(ciPrimary).toBe('#0F6CBD');
  });

  test('S7: valid brandLogoUrl shows the logo', async ({ page }) => {
    await withConfig(page, { brandLogoUrl: 'https://example.com/logo.svg' });
    await page.goto('/settings.html');
    const logo = page.locator('.brand-logo');
    // Assert DOM state, not visual visibility: a broken external image has
    // zero intrinsic dimensions in headless CI and would fail toBeVisible()
    // for the wrong reason. We're verifying branding.js wired the src and
    // cleared the `hidden` attribute — not that the URL actually resolves.
    await expect(logo).toHaveAttribute('src', 'https://example.com/logo.svg');
    await expect.poll(() => logo.evaluate((el) => el.hidden)).toBe(false);
  });

  test('S9: invalid brandPrimary falls back gracefully (no --ci-primary set)', async ({ page }) => {
    await withConfig(page, { brandPrimary: 'red' });
    await page.goto('/settings.html');
    // Give the async dynamic-import a tick to land.
    await page.waitForTimeout(200);
    const ciPrimary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--ci-primary').trim()
    );
    expect(ciPrimary).toBe('');
  });

  test('S10: empty CI → design-system default primary used by .btn-primary', async ({ page }) => {
    await withConfig(page, {});
    await page.goto('/settings.html');
    await page.waitForSelector('.btn-primary');
    const bg = await page
      .locator('.btn-primary')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    // Should resolve to the design-system brand-primary (#0f6cbd → rgb(15, 108, 189))
    expect(bg).toBe('rgb(15, 108, 189)');
  });

  test('S11/S33: Settings has exactly one theme toggle (still owned by 030)', async ({ page }) => {
    await withConfig(page, {});
    await page.goto('/settings.html');
    // 030 ships a single `#settingDarkMode` checkbox under Kalenderanzeige — 031
    // does not add a second toggle anywhere.
    await expect(page.locator('#settingDarkMode')).toHaveCount(1);
    await expect(page.locator('input[name="theme"]')).toHaveCount(0);
  });

  test('S12: CI primary is theme-independent (constant across light/dark)', async ({ page }) => {
    await withConfig(page, { brandPrimary: '#0F6CBD' });
    await page.goto('/settings.html');
    await page.waitForFunction(
      () =>
        getComputedStyle(document.documentElement).getPropertyValue('--ci-primary').trim() !== ''
    );
    const lightCi = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--ci-primary').trim()
    );
    await page.locator('#settingDarkMode').check();
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    const darkCi = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--ci-primary').trim()
    );
    expect(darkCi).toBe(lightCi);
  });
});
