import { test, expect } from '@playwright/test';
import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Feature 025 (FR-012): when the break ticket is selected in the time-entry
// modal, the End-time input MUST be set equal to Start (giving 0h) and
// disabled. Switching back to a non-break ticket re-enables it.
test.describe('Modal hours-lock for break ticket', () => {
  test.beforeEach(async ({ page }) => {
    // Override config to include breakTicket = 42 (which exists in issues fixture)
    const configWithBreak = {
      redmineUrl: 'http://localhost:3000/mock-proxy',
      redmineServerUrl: 'https://redmine.test.example.com',
      aiProvider: 'anthropic',
      aiModel: 'claude-haiku-4-5-20251001',
      aiApiKey: 'sk-ant-test-key',
      aiProxyUrl: 'http://localhost:3000/mock-ai-proxy',
      breakTicket: 42,
      holidayTicket: 999,
    };
    await page.route('**/config.json', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(configWithBreak) })
    );
    await mockRedmineApi(page);
    await setupCredentials(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event, .fc-timegrid-slot', { timeout: 10000 });
  });

  test('selecting break ticket disables End input and sets End = Start (0h)', async ({ page }) => {
    // Open the modal by clicking an empty slot
    await page.locator('.fc-timegrid-slot[data-time="10:00:00"]').first().click();
    const modal = page.locator('#lean-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });

    const startInput = page.locator('#lean-info-start');
    const endInput   = page.locator('#lean-info-end');

    // Capture the auto-set start, then search for the break ticket
    const startValue = await startInput.inputValue();
    await page.locator('#lean-search').fill('Implement login');
    await page.locator('#lean-search-results .lean-result, [role="option"]').first().click({ timeout: 5000 });

    // After selecting break ticket (#42 = "Implement login page"):
    // FR-012 — End is locked, has .input--locked class, and equals Start.
    await expect(endInput).toBeDisabled();
    await expect(endInput).toHaveClass(/input--locked/);
    await expect(endInput).toHaveValue(startValue);
  });

  test('switching from break ticket back to a different ticket re-enables End', async ({ page }) => {
    await page.locator('.fc-timegrid-slot[data-time="10:00:00"]').first().click();
    await expect(page.locator('#lean-modal')).toBeVisible({ timeout: 5000 });

    // First select break ticket (id 42)
    await page.locator('#lean-search').fill('Implement login');
    await page.locator('#lean-search-results .lean-result, [role="option"]').first().click({ timeout: 5000 });
    await expect(page.locator('#lean-info-end')).toBeDisabled();

    // Now search for a non-break ticket (id 43 - "Review PR #78")
    await page.locator('#lean-search').fill('Review PR');
    await page.locator('#lean-search-results .lean-result, [role="option"]').first().click({ timeout: 5000 });

    // End should be re-enabled and no longer have the locked class
    const endInput = page.locator('#lean-info-end');
    await expect(endInput).toBeEnabled();
    await expect(endInput).not.toHaveClass(/input--locked/);
  });
});
