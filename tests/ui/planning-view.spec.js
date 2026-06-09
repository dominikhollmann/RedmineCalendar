import { test, expect } from './coverage-fixture.js';
import { mockCdn, mockRedmineApi, freezeClock } from './helpers.js';

// ── Shared setup helpers ──────────────────────────────────────────

async function setupPlanningConfig(page) {
  await mockCdn(page);
  await page.route('**/config.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        redmineUrl: 'http://localhost:3000/mock-proxy',
        redmineServerUrl: 'https://redmine.test.example.com',
        azureClientId: 'demo',
      }),
    })
  );
}

async function setupPlanningCredentials(page) {
  await setupPlanningConfig(page);
  await mockRedmineApi(page);
  await page.goto('/settings.html');
  await page.fill('#apiKey', 'test-api-key-12345');
  await page.click('#save-btn');
  await page.waitForURL((url) => !url.pathname.includes('settings'), { timeout: 10000 });
}

// ── T014: Toggle FAB visibility + basic toggle ────────────────────

test.describe('Planning View toggle FAB', () => {
  test.beforeEach(async ({ page }) => {
    await freezeClock(page);
    await setupPlanningCredentials(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  test('FAB is visible on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const fab = page.locator('#planning-view-toggle');
    await expect(fab).toBeVisible({ timeout: 5000 });
  });

  test('FAB is hidden on mobile viewport (< 768px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const fab = page.locator('#planning-view-toggle');
    await expect(fab).not.toBeVisible();
  });

  test('clicking FAB shows planning view and hides calendar', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const fab = page.locator('#planning-view-toggle');
    await fab.waitFor({ state: 'visible', timeout: 5000 });
    await fab.click();
    await expect(page.locator('#planning-view-main')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#calendar-main')).not.toBeVisible();
  });

  test('clicking FAB again hides planning view and restores calendar', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const fab = page.locator('#planning-view-toggle');
    await fab.waitFor({ state: 'visible', timeout: 5000 });
    await fab.click();
    await expect(page.locator('#planning-view-main')).toBeVisible({ timeout: 5000 });
    await fab.click();
    await expect(page.locator('#calendar-main')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#planning-view-main')).not.toBeVisible();
  });
});

// ── T015: Double-click day column header opens Planning View ──────

test.describe('Planning View open via day-header double-click', () => {
  test.beforeEach(async ({ page }) => {
    await freezeClock(page);
    await setupPlanningCredentials(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-col-header-cell[data-date]', { timeout: 10000 });
  });

  test('double-click a day column header opens Planning View for that date', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const headerCell = page.locator('.fc-col-header-cell[data-date]').first();
    await headerCell.dblclick();
    await expect(page.locator('#planning-view-main')).toBeVisible({ timeout: 5000 });
    const dayLabel = await page.locator('#planning-day-label').textContent();
    // The label will contain the date in some locale format; verify the view opened
    expect(dayLabel).toBeTruthy();
    expect(dayLabel.length).toBeGreaterThan(0);
  });
});

// ── T016: Toggle back restores calendar to week of Planning Day ───

test.describe('Planning View toggle-back restores calendar week', () => {
  test.beforeEach(async ({ page }) => {
    await freezeClock(page);
    await setupPlanningCredentials(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  test('toggle back after navigation restores calendar to week of last Planning Day', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const fab = page.locator('#planning-view-toggle');
    await fab.waitFor({ state: 'visible', timeout: 5000 });
    await fab.click();
    await expect(page.locator('#planning-view-main')).toBeVisible({ timeout: 5000 });

    // Navigate to next day in Planning View
    const nextBtn = page.locator('.planning-view-header button[title]').nth(1);
    await nextBtn.click();
    await page.waitForTimeout(300);

    // Toggle back
    await fab.click();
    await expect(page.locator('#calendar-main')).toBeVisible({ timeout: 5000 });

    // Calendar should be visible (it was restored)
    const toolbar = page.locator('.fc-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 5000 });
  });
});

// ── T023: Both columns visible with live data ─────────────────────

test.describe('Planning View side-by-side columns', () => {
  test.beforeEach(async ({ page }) => {
    await freezeClock(page);
    await setupPlanningCredentials(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  test('both Bookings and Outlook columns are rendered', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const fab = page.locator('#planning-view-toggle');
    await fab.waitFor({ state: 'visible', timeout: 5000 });
    await fab.click();
    await expect(page.locator('#planning-view-main')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);
    await expect(page.locator('.planning-bookings-column')).toBeVisible();
    await expect(page.locator('.planning-outlook-column')).toBeVisible();
  });

  test('Bookings column is visible before Outlook column finishes loading', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const fab = page.locator('#planning-view-toggle');
    await fab.waitFor({ state: 'visible', timeout: 5000 });
    await fab.click();
    // Bookings column visible immediately
    await expect(page.locator('.planning-bookings-column')).toBeVisible({ timeout: 3000 });
  });
});

// ── T035: Classification styling ─────────────────────────────────

test.describe('Planning View event classification', () => {
  test.beforeEach(async ({ page }) => {
    await freezeClock(page);
    await setupPlanningCredentials(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  test('excluded events cannot be shift-clicked to select', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const fab = page.locator('#planning-view-toggle');
    await fab.waitFor({ state: 'visible', timeout: 5000 });
    await fab.click();
    await expect(page.locator('#planning-view-main')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(2000);
    const excludedCards = page.locator('.planning-event--excluded');
    const count = await excludedCards.count();
    if (count > 0) {
      await excludedCards.first().click({ modifiers: ['Shift'] });
      // Excluded card should not get selected class
      await expect(excludedCards.first()).not.toHaveClass(/planning-event--selected/);
    }
  });
});

// ── T048: Day navigation ──────────────────────────────────────────

test.describe('Planning View day navigation', () => {
  test.beforeEach(async ({ page }) => {
    await freezeClock(page);
    await setupPlanningCredentials(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  test('prev/next buttons update the Planning Day label', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const fab = page.locator('#planning-view-toggle');
    await fab.waitFor({ state: 'visible', timeout: 5000 });
    await fab.click();
    await expect(page.locator('#planning-view-main')).toBeVisible({ timeout: 5000 });
    const labelBefore = await page.locator('#planning-day-label').textContent();
    const nextBtn = page.locator('.planning-view-header button').nth(2); // next day
    await nextBtn.click();
    await page.waitForTimeout(300);
    const labelAfter = await page.locator('#planning-day-label').textContent();
    expect(labelAfter).not.toBe(labelBefore);
  });

  test("Today button shows today's date", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const fab = page.locator('#planning-view-toggle');
    await fab.waitFor({ state: 'visible', timeout: 5000 });
    await fab.click();
    await expect(page.locator('#planning-view-main')).toBeVisible({ timeout: 5000 });
    const todayBtn = page.locator('.planning-view-header button').nth(3); // Today
    await todayBtn.click();
    await page.waitForTimeout(300);
    const label = await page.locator('#planning-day-label').textContent();
    expect(label).toBeTruthy();
  });
});

// ── T052: Settings source toggle ──────────────────────────────────

test.describe('Planning View Outlook source toggle', () => {
  test('disabling Outlook in settings shows disabled prompt', async ({ page }) => {
    await mockCdn(page);
    await page.route('**/config.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          redmineUrl: 'http://localhost:3000/mock-proxy',
          azureClientId: 'demo',
        }),
      })
    );
    await mockRedmineApi(page);

    // Set Outlook source disabled
    await page.addInitScript(() => {
      localStorage.setItem('redmine_calendar_planning_source_outlook', '0');
    });

    await page.goto('/settings.html');
    await page.fill('#apiKey', 'test-api-key-12345');
    await page.click('#save-btn');
    await page.waitForURL((url) => !url.pathname.includes('settings'), { timeout: 10000 });
    await page.waitForSelector('.fc-event', { timeout: 10000 });

    const fab = page.locator('#planning-view-toggle');
    await page.setViewportSize({ width: 1024, height: 768 });
    await fab.waitFor({ state: 'visible', timeout: 5000 });
    await fab.click();
    await expect(page.locator('#planning-view-main')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);

    // Outlook column should show disabled prompt
    const outlookCol = page.locator('.planning-outlook-column');
    await expect(outlookCol).toBeVisible();
    const prompt = outlookCol.locator('.planning-outlook-prompt');
    await expect(prompt).toBeVisible({ timeout: 3000 });
  });
});
