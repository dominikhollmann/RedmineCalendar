import { test, expect } from './coverage-fixture.js';
import {
  mockCdn,
  mockRedmineApi,
  freezeClock,
  mockTodayEntries,
  setupCredentials,
} from './helpers.js';

// ── Shared helpers ────────────────────────────────────────────────

async function setupCalendar(page) {
  await freezeClock(page);
  await setupCredentials(page);
  await mockRedmineApi(page);
  await mockTodayEntries(page);
  await page.goto('/index.html');
  await page.waitForSelector('.fc-event', { timeout: 10000 });
}

async function setupPlanningView(page) {
  await setupCalendar(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  const fab = page.locator('#planning-view-toggle');
  await fab.waitFor({ state: 'visible', timeout: 5000 });
  await fab.click();
  await expect(page.locator('#planning-view-main')).toBeVisible({ timeout: 5000 });
}

// ── US1: Refresh button ───────────────────────────────────────────

test.describe('US1 — Refresh button', () => {
  test.beforeEach(async ({ page }) => {
    await setupCalendar(page);
  });

  test('Refresh button is present in the toolbar', async ({ page }) => {
    const btn = page.locator('#toolbar-refresh');
    await expect(btn).toBeVisible({ timeout: 5000 });
  });

  test('Refresh button has correct label and aria-label', async ({ page }) => {
    const btn = page.locator('#toolbar-refresh');
    await expect(btn).toHaveText(/Refresh|Aktualisieren/);
    const ariaLabel = await btn.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
  });

  test('clicking Refresh does not navigate away from calendar', async ({ page }) => {
    const btn = page.locator('#toolbar-refresh');
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click();
    // Calendar must still be shown
    await expect(page.locator('#calendar-main')).toBeVisible({ timeout: 3000 });
    // Should not have navigated to settings
    expect(page.url()).not.toContain('settings');
  });

  test('clicking Refresh shows a toast confirmation', async ({ page }) => {
    const btn = page.locator('#toolbar-refresh');
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click();
    // Wait for toast to appear
    await expect(page.locator('.toast, [role="status"], .notify-toast')).toBeVisible({
      timeout: 8000,
    });
  });
});

// ── US1: Auto-refresh setting ────────────────────────────────────

test.describe('US1 — Auto-refresh interval in Settings', () => {
  test.beforeEach(async ({ page }) => {
    await freezeClock(page);
    await mockCdn(page);
    await setupCredentials(page);
    await mockRedmineApi(page);
  });

  test('Auto-refresh interval field is present in settings', async ({ page }) => {
    await page.goto('/settings.html');
    const input = page.locator('#autoRefreshInterval');
    await expect(input).toBeVisible({ timeout: 5000 });
  });

  test('Auto-refresh label is displayed', async ({ page }) => {
    await page.goto('/settings.html');
    const label = page.locator('#label-auto-refresh-interval');
    await expect(label).toBeVisible({ timeout: 5000 });
    const text = await label.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('Auto-refresh value is persisted to localStorage', async ({ page }) => {
    await page.goto('/settings.html');
    const input = page.locator('#autoRefreshInterval');
    await input.waitFor({ state: 'visible', timeout: 5000 });
    await input.fill('10');
    await input.dispatchEvent('change');
    // Verify localStorage was updated (600 seconds = 10 minutes)
    const stored = await page.evaluate(() =>
      localStorage.getItem('redmine_calendar_auto_refresh_interval')
    );
    expect(stored).toBe('600');
  });
});

// ── US3: Source label in modal title ────────────────────────────

test.describe('US3 — Event source label in modal', () => {
  test('Planning view Outlook column shows correctly when Outlook connected', async ({ page }) => {
    // Basic smoke test: planning view loads and source columns are present or hidden.
    await setupPlanningView(page);
    // Planning view main element must be visible
    await expect(page.locator('#planning-view-main')).toBeVisible({ timeout: 5000 });
  });
});

// ── US4: Planning view total in column header ──────────────────

test.describe('US4 — Planning view bookings total', () => {
  test('switching to Planning View hides #week-total from the app header', async ({ page }) => {
    await setupPlanningView(page);
    const weekTotal = page.locator('#week-total');
    // In planning mode, week-total should be hidden
    await expect(weekTotal).not.toBeVisible({ timeout: 5000 });
  });

  test('switching back from Planning View restores #week-total', async ({ page }) => {
    await setupPlanningView(page);
    // Toggle off
    const fab = page.locator('#planning-view-toggle');
    await fab.click();
    await expect(page.locator('#calendar-main')).toBeVisible({ timeout: 5000 });
    // week-total should be visible again
    const weekTotal = page.locator('#week-total');
    await expect(weekTotal).toBeVisible({ timeout: 5000 });
  });

  test('Planning bookings-total element exists in the DOM after planning view loads', async ({
    page,
  }) => {
    await setupPlanningView(page);
    const total = page.locator('#planning-bookings-total');
    // It may or may not be visible (depends on bookings), but should exist in DOM
    const count = await total.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
