import { test, expect } from '@playwright/test';
import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';

test.describe('Calendar page', () => {
  test.beforeEach(async ({ page }) => {
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  test('loads and displays time entries', async ({ page }) => {
    const events = page.locator('.fc-event');
    await expect(events.first()).toBeVisible();
  });

  test('displays week total in header', async ({ page }) => {
    const total = page.locator('#week-total');
    await expect(total).toBeVisible();
  });

  test('navigates to previous week', async ({ page }) => {
    const titleBefore = await page.locator('.fc-toolbar-title').textContent();
    await page.click('.fc-prev-button');
    const titleAfter = await page.locator('.fc-toolbar-title').textContent();
    expect(titleAfter).not.toBe(titleBefore);
  });

  test('navigates to next week', async ({ page }) => {
    const titleBefore = await page.locator('.fc-toolbar-title').textContent();
    await page.click('.fc-next-button');
    const titleAfter = await page.locator('.fc-toolbar-title').textContent();
    expect(titleAfter).not.toBe(titleBefore);
  });

  test('today button returns to current week', async ({ page }) => {
    await page.click('.fc-prev-button');
    await page.click('.fc-today-button');
    const todayCol = page.locator('.fc-day-today');
    await expect(todayCol.first()).toBeVisible();
  });
});
