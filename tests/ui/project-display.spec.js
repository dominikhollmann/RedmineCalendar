import { test, expect } from '@playwright/test';
import { setupCredentials, mockCdn, setupConfig, mockRedmineApi } from './helpers.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function currentWeekDates() {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((day + 6) % 7));
  const fmt = d => d.toISOString().slice(0, 10);
  return { mon: fmt(mon) };
}

test.describe('Project Display and Search', () => {
  test.beforeEach(async ({ page }) => {
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
  });

  test('calendar events show project identifier and name', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
    const projectText = await page.locator('.ev-project').first().textContent();
    expect(projectText).toContain('\u2014');
    expect(projectText).toContain('Web App');
  });

  test('search results show project identifier', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
    await page.locator('.fc-event').first().dblclick();
    await page.waitForSelector('#lean-time-modal', { timeout: 5000 });

    const searchInput = page.locator('#lean-search');
    await searchInput.fill('Implement');
    await page.waitForTimeout(1000);

    const projectSpan = page.locator('.lean-row-project').first();
    await expect(projectSpan).toBeVisible({ timeout: 5000 });
    const text = await projectSpan.textContent();
    expect(text).toContain('web-app');
  });

  test('fallback: shows name only when no identifier', async ({ page }) => {
    const { mon } = currentWeekDates();
    await page.route('**/mock-proxy/time_entries.json*', (route) => {
      const entries = {
        time_entries: [{
          id: 200, hours: 1.0, spent_on: mon,
          comments: 'Test', easy_time_from: '09:00:00', easy_time_to: '10:00:00',
          issue: { id: 99, subject: 'No-ID project task' },
          project: { id: 5, name: 'Legacy Project' },
          activity: { id: 9, name: 'Development' },
        }],
        total_count: 1, offset: 0, limit: 100,
      };
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(entries) });
    });
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
    const projectText = await page.locator('.ev-project').first().textContent();
    expect(projectText).toBe('Legacy Project');
    expect(projectText).not.toContain('null');
  });

  test('mobile viewport shows project info', async ({ page, context }) => {
    await context.addInitScript(() => {
      const fakeNow = new Date('2026-04-22T12:00:00').getTime();
      const OrigDate = Date;
      class FakeDate extends OrigDate {
        constructor(...args) { if (args.length === 0) super(fakeNow); else super(...args); }
        static now() { return fakeNow; }
      }
      window.Date = FakeDate;
    });
    await page.setViewportSize({ width: 375, height: 812 });
    const wed = '2026-04-22';
    await page.route('**/mock-proxy/time_entries.json*', (route) => {
      const entries = {
        time_entries: [{
          id: 101, hours: 2.0, spent_on: wed,
          comments: '', easy_time_from: '09:00:00', easy_time_to: '11:00:00',
          issue: { id: 42, subject: 'Test' },
          project: { id: 1, name: 'Web App', identifier: 'web-app' },
          activity: { id: 9, name: 'Development' },
        }],
        total_count: 1, offset: 0, limit: 100,
      };
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(entries) });
    });
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
    const projectEl = page.locator('.ev-project').first();
    await expect(projectEl).toBeVisible();
  });
});
