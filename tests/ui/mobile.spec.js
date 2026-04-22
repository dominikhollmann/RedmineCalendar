import { test, expect } from '@playwright/test';
import { setupConfig, mockRedmineApi, setupCredentials, mockCdn } from './helpers.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function todayEntries() {
  const today = new Date().toISOString().slice(0, 10);
  const fixture = JSON.parse(readFileSync(resolve(__dirname, '..', 'fixtures', 'api-responses', 'time-entries.json'), 'utf-8'));
  fixture.time_entries.forEach(e => { e.spent_on = today; });
  return fixture;
}

test.describe('Mobile Calendar View', () => {

  // ── Mobile viewport tests ──────────────────────────────────────
  test.describe('mobile viewport (375px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await mockCdn(page);
      await setupCredentials(page);
      await setupConfig(page);
      const entries = todayEntries();
      await page.route('**/mock-proxy/time_entries.json*', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(entries) })
      );
      await page.goto('/index.html');
      await page.waitForSelector('.fc-event', { timeout: 10000 });
    });

    test('renders day view with single day column', async ({ page }) => {
      const cols = await page.locator('.fc-timegrid-col:not(.fc-timegrid-axis)').count();
      expect(cols).toBe(1);
    });

    test('FC toolbar is hidden', async ({ page }) => {
      const toolbar = page.locator('.fc .fc-header-toolbar');
      await expect(toolbar).toBeHidden();
    });

    test('mobile date element exists in header', async ({ page }) => {
      const mobileDate = page.locator('#mobile-date');
      await expect(mobileDate).toBeAttached();
    });

    test('swipe left navigates to next day', async ({ page }) => {
      const calendarEl = page.locator('#calendar');
      const dayHeader = page.locator('.fc-col-header-cell');
      const textBefore = await dayHeader.first().textContent();

      await calendarEl.evaluate((el) => {
        el.dispatchEvent(new TouchEvent('touchstart', {
          touches: [new Touch({ identifier: 0, target: el, clientX: 300, clientY: 400 })],
        }));
        el.dispatchEvent(new TouchEvent('touchend', {
          changedTouches: [new Touch({ identifier: 0, target: el, clientX: 200, clientY: 400 })],
        }));
      });

      await page.waitForTimeout(500);
      const textAfter = await dayHeader.first().textContent();
      expect(textAfter).not.toBe(textBefore);
    });

    test('swipe right navigates to previous day', async ({ page }) => {
      const calendarEl = page.locator('#calendar');
      const dayHeader = page.locator('.fc-col-header-cell');
      const textBefore = await dayHeader.first().textContent();

      await calendarEl.evaluate((el) => {
        el.dispatchEvent(new TouchEvent('touchstart', {
          touches: [new Touch({ identifier: 0, target: el, clientX: 200, clientY: 400 })],
        }));
        el.dispatchEvent(new TouchEvent('touchend', {
          changedTouches: [new Touch({ identifier: 0, target: el, clientX: 310, clientY: 400 })],
        }));
      });

      await page.waitForTimeout(500);
      const textAfter = await dayHeader.first().textContent();
      expect(textAfter).not.toBe(textBefore);
    });

    test('single tap on event opens edit form', async ({ page }) => {
      const event = page.locator('.fc-event').first();
      await event.click();

      const modal = page.locator('.lean-overlay');
      await expect(modal).toBeVisible({ timeout: 5000 });
    });
  });

  // ── Desktop viewport tests ─────────────────────────────────────
  test.describe('desktop viewport (1280px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await setupCredentials(page);
      await setupConfig(page);
      await mockRedmineApi(page);
      await page.goto('/index.html');
      await page.waitForSelector('.fc-event', { timeout: 10000 });
    });

    test('renders week view with multiple day columns', async ({ page }) => {
      const cols = await page.locator('.fc-timegrid-col:not(.fc-timegrid-axis)').count();
      expect(cols).toBeGreaterThanOrEqual(5);
    });

    test('FC toolbar is visible', async ({ page }) => {
      const toolbar = page.locator('.fc .fc-header-toolbar');
      await expect(toolbar).toBeVisible();
    });
  });
});
