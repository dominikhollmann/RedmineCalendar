// Feature 044 / T011 — Playwright UI tests for privacy.html.
// Verifies: footer link reachable from settings.html, page renders without
// errors, bilingual content, fixture controller name and retention period
// visible on the page.

import { test, expect } from './coverage-fixture.js';
import { mockCdn, setupConfig, setupCredentials } from './helpers.js';

test.describe('Feature 044 — Privacy Notice (privacy.html)', () => {
  test('settings footer shows a Privacy link (EN)', async ({ page }) => {
    await setupCredentials(page);
    await setupConfig(page);
    await page.goto('/settings.html');
    const link = page.locator('.settings-footer a[href="privacy.html"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveText(/Privacy/i);
  });

  test('settings footer shows a Datenschutz link (DE)', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'languages', { value: ['de'], configurable: true });
      Object.defineProperty(navigator, 'language', { value: 'de', configurable: true });
    });
    await setupCredentials(page);
    await setupConfig(page);
    await page.goto('/settings.html');
    const link = page.locator('.settings-footer a[href="privacy.html"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveText(/Datenschutz/i);
  });

  test('clicking the footer link navigates to privacy.html', async ({ page }) => {
    await setupCredentials(page);
    await setupConfig(page);
    await page.goto('/settings.html');
    await page.locator('.settings-footer a[href="privacy.html"]').click();
    await expect(page).toHaveURL(/\/privacy(?:\.html)?$/);
  });

  test('privacy.html is directly reachable without authentication', async ({ page }) => {
    await mockCdn(page);
    await setupConfig(page);
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/privacy.html');
    await page.waitForSelector('.privacy-card', { timeout: 10000 });
    expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
  });

  test('privacy.html renders all required GDPR sections', async ({ page }) => {
    await mockCdn(page);
    await setupConfig(page);
    await page.goto('/privacy.html');
    await page.waitForSelector('.privacy-card', { timeout: 10000 });
    await expect(page.locator('#privacy-controller-section')).toBeVisible();
    await expect(page.locator('#privacy-data-section')).toBeVisible();
    await expect(page.locator('#privacy-retention-section')).toBeVisible();
    await expect(page.locator('#privacy-rights-section')).toBeVisible();
    await expect(page.locator('#privacy-ttdsg-section')).toBeVisible();
    await expect(page.locator('#privacy-betriebsrat-section')).toBeVisible();
  });

  test('privacy.html shows controller name from fixture config', async ({ page }) => {
    await mockCdn(page);
    await setupConfig(page);
    await page.goto('/privacy.html');
    await page.waitForSelector('#privacy-controller-section', { timeout: 10000 });
    await expect(page.locator('#privacy-controller-section')).toContainText('Test Controller GmbH');
  });

  test('privacy.html shows retention period from fixture config (30 days)', async ({ page }) => {
    await mockCdn(page);
    await setupConfig(page);
    await page.goto('/privacy.html');
    await page.waitForSelector('#privacy-retention-section', { timeout: 10000 });
    await expect(page.locator('#privacy-retention-section')).toContainText('30');
  });

  test('privacy.html renders fully in DE locale', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'languages', { value: ['de'], configurable: true });
      Object.defineProperty(navigator, 'language', { value: 'de', configurable: true });
    });
    await mockCdn(page);
    await setupConfig(page);
    await page.goto('/privacy.html');
    await page.waitForSelector('.privacy-card', { timeout: 10000 });
    // Page title must be present and translated (not the EN fallback key)
    const title = page.locator('h1');
    await expect(title).not.toHaveText('privacy.title');
    // Controller section heading must appear in DE
    const heading = page.locator('#privacy-controller-section h2');
    await expect(heading).toBeVisible();
    await expect(heading).not.toHaveText('privacy.controller.heading');
  });
});
