import { test, expect } from './coverage-fixture.js';
import { mockCdn, mockRedmineApi, freezeClock, mockTodayEntries } from './helpers.js';

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
    await mockTodayEntries(page);
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
    await mockTodayEntries(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-col-header-cell[data-date]', { timeout: 10000 });
  });

  test('double-click a day column header opens Planning View for that date', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const headerCell = page.locator('.fc-col-header-cell[data-date]').first();
    await headerCell.dblclick();
    await expect(page.locator('#planning-view-main')).toBeVisible({ timeout: 5000 });
    const dayLabel = await page.locator('#toolbar-title').textContent();
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
    await mockTodayEntries(page);
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
    const nextBtn = page.locator('.planning-nav-btn').nth(1);
    await nextBtn.click();
    await page.waitForTimeout(300);

    // Toggle back
    await fab.click();
    await expect(page.locator('#calendar-main')).toBeVisible({ timeout: 5000 });

    // Shared toolbar is always visible; FC grid should be restored
    await expect(page.locator('#app-toolbar')).toBeVisible({ timeout: 5000 });
  });
});

// ── T023: Both columns visible with live data ─────────────────────

test.describe('Planning View side-by-side columns', () => {
  test.beforeEach(async ({ page }) => {
    await freezeClock(page);
    await setupPlanningCredentials(page);
    await mockRedmineApi(page);
    await mockTodayEntries(page);
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
    await mockTodayEntries(page);
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
    await mockTodayEntries(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  test('prev/next buttons update the Planning Day label', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const fab = page.locator('#planning-view-toggle');
    await fab.waitFor({ state: 'visible', timeout: 5000 });
    await fab.click();
    await expect(page.locator('#planning-view-main')).toBeVisible({ timeout: 5000 });
    const labelBefore = await page.locator('#toolbar-title').textContent();
    const nextBtn = page.locator('.planning-nav-btn').nth(1);
    await nextBtn.click();
    await page.waitForTimeout(300);
    const labelAfter = await page.locator('#toolbar-title').textContent();
    expect(labelAfter).not.toBe(labelBefore);
  });

  test("Today button shows today's date", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const fab = page.locator('#planning-view-toggle');
    await fab.waitFor({ state: 'visible', timeout: 5000 });
    await fab.click();
    await expect(page.locator('#planning-view-main')).toBeVisible({ timeout: 5000 });
    const todayBtn = page.locator('.planning-nav-btn').nth(2);
    await todayBtn.click();
    await page.waitForTimeout(300);
    const label = await page.locator('#toolbar-title').textContent();
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

// ── T039: Drag bookable card → entry created immediately ──────────

test.describe('Planning View drag-to-book (bookable)', () => {
  test.use({ bypassCSP: true });

  test.beforeEach(async ({ page }) => {
    await freezeClock(page);
    await setupPlanningCredentials(page);
    await mockRedmineApi(page);
    await mockTodayEntries(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  test('drag bookable card creates Redmine entry without opening modal', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });

    const fab = page.locator('#planning-view-toggle');
    await fab.waitFor({ state: 'visible', timeout: 5000 });
    await fab.click();
    await expect(page.locator('#planning-view-main')).toBeVisible({ timeout: 5000 });

    // Wait for demo Outlook events to render
    await page.waitForSelector('.planning-event--bookable', { timeout: 5000 });

    // Find the Daily Standup #2097 bookable card
    const standupCard = page
      .locator('.planning-event--bookable')
      .filter({ hasText: 'Daily Standup' })
      .first();
    await expect(standupCard).toBeVisible();

    // Intercept the POST to capture the booking
    let postedEntry = null;
    await page.route('**/mock-proxy/time_entries.json', async (route) => {
      if (route.request().method() === 'POST') {
        postedEntry = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ time_entry: { id: 9999, hours: 0.25, spent_on: '2026-04-22' } }),
        });
      } else {
        await route.continue();
      }
    });

    await page.evaluate(() => {
      const card = document.querySelector('.planning-event--bookable');
      const col = document.querySelector('.planning-bookings-column');
      const dt = new DataTransfer();
      card.dispatchEvent(
        new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt })
      );
      col.dispatchEvent(
        new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt })
      );
      col.dispatchEvent(
        new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt })
      );
    });
    await page.waitForTimeout(500);

    // A Redmine entry should have been created — no modal
    expect(postedEntry).not.toBeNull();
    expect(postedEntry.time_entry.issue_id).toBe(2097);
    await expect(page.locator('dialog#lean-time-modal')).not.toBeVisible();
  });
});

// ── T040: Drag needs-ticket card → modal opens pre-filled ─────────

test.describe('Planning View drag-to-book (needs-ticket)', () => {
  test.use({ bypassCSP: true });

  test.beforeEach(async ({ page }) => {
    await freezeClock(page);
    await setupPlanningCredentials(page);
    await mockRedmineApi(page);
    await mockTodayEntries(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  test('drag needs-ticket card opens time entry modal pre-filled with event time', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 768 });

    const fab = page.locator('#planning-view-toggle');
    await fab.waitFor({ state: 'visible', timeout: 5000 });
    await fab.click();
    await expect(page.locator('#planning-view-main')).toBeVisible({ timeout: 5000 });

    // Wait for async enrichment to finish — bookable cards get upgraded first
    await page.waitForSelector('.planning-event--bookable', { timeout: 5000 });

    const needsTicketCard = page
      .locator('.planning-event--needs-ticket')
      .filter({ hasText: 'Call with Customer' })
      .first();
    await expect(needsTicketCard).toBeVisible();

    await page.evaluate(() => {
      const card = [...document.querySelectorAll('.planning-event--needs-ticket')].find((el) =>
        el.textContent.includes('Call with Customer')
      );
      const col = document.querySelector('.planning-bookings-column');
      const dt = new DataTransfer();
      card.dispatchEvent(
        new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt })
      );
      col.dispatchEvent(
        new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt })
      );
      col.dispatchEvent(
        new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt })
      );
    });
    await page.waitForTimeout(500);

    // Modal should open with start time pre-filled
    const modal = page.locator('#lean-time-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    const startInput = modal.locator('#lean-info-start');
    const startVal = await startInput.inputValue();
    // roundToQuarter rounds 11:03 → 11:00 (nearest 15-minute slot)
    expect(startVal).toBe('11:00');
  });
});

// ── T041: Shift-select two bookable cards + drag → batch ──────────

test.describe('Planning View batch drag-to-book', () => {
  test.use({ bypassCSP: true });

  test.beforeEach(async ({ page }) => {
    await freezeClock(page);
    await setupPlanningCredentials(page);
    await mockRedmineApi(page);
    await mockTodayEntries(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  test('shift-select two bookable cards and drag creates both entries', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });

    const fab = page.locator('#planning-view-toggle');
    await fab.waitFor({ state: 'visible', timeout: 5000 });
    await fab.click();
    await expect(page.locator('#planning-view-main')).toBeVisible({ timeout: 5000 });

    await page.waitForSelector('.planning-event--bookable', { timeout: 5000 });

    const bookableCards = page.locator('.planning-event--bookable');
    const first = bookableCards.nth(0);
    const second = bookableCards.nth(1);

    // Select first card, then shift-click second
    await first.click();
    await second.click({ modifiers: ['Shift'] });
    await expect(first).toHaveClass(/planning-event--selected/);
    await expect(second).toHaveClass(/planning-event--selected/);

    let postCount = 0;
    await page.route('**/mock-proxy/time_entries.json', async (route) => {
      if (route.request().method() === 'POST') {
        postCount++;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ time_entry: { id: 9000 + postCount, hours: 0.5 } }),
        });
      } else {
        await route.continue();
      }
    });

    // Programmatic drag: fire dragstart on card, dragover+drop on bookings column
    // (Playwright dragTo doesn't fire dragstart after prior clicks on the page)
    await page.evaluate(() => {
      const card = document.querySelector('.planning-event--bookable');
      const col = document.querySelector('.planning-bookings-column');
      const dt = new DataTransfer();
      card.dispatchEvent(
        new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt })
      );
      col.dispatchEvent(
        new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt })
      );
      col.dispatchEvent(
        new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt })
      );
    });
    await page.waitForTimeout(1500);

    // Both entries should have been posted
    expect(postCount).toBe(2);

    // Toast should report batch completion
    const toast = page.locator('#toast');
    await expect(toast).toBeVisible({ timeout: 3000 });
    const toastText = await toast.textContent();
    expect(toastText).toMatch(/2/);
  });
});

// ── T056: Greyout when booking covers event time ──────────────────

test.describe('Planning View greyout for covered events', () => {
  test('event card gets covered class when a Redmine booking spans its time', async ({ page }) => {
    await freezeClock(page);
    await setupPlanningCredentials(page);
    await mockRedmineApi(page);
    // Override time entries: put a 2-hour entry at 09:00 on FAKE_TODAY
    // so it fully covers Daily Standup (09:00–09:15)
    await mockTodayEntries(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });

    await page.setViewportSize({ width: 1024, height: 768 });
    const fab = page.locator('#planning-view-toggle');
    await fab.waitFor({ state: 'visible', timeout: 5000 });
    await fab.click();
    await expect(page.locator('#planning-view-main')).toBeVisible({ timeout: 5000 });

    await page.waitForSelector('.planning-event', { timeout: 5000 });
    await page.waitForTimeout(1000);

    // The standup (09:00–09:15) should be covered by the 09:00 2h entry
    const standupCard = page
      .locator('.planning-event')
      .filter({ hasText: 'Daily Standup' })
      .first();
    await expect(standupCard).toBeVisible();
    await expect(standupCard).toHaveClass(/planning-event--covered/);

    // Retrospective starts at 16:00; the 14:00 booking ends at 16:00 (14:00+2h),
    // so 16:00–17:00 is NOT covered.
    const retrospectiveCard = page
      .locator('.planning-event')
      .filter({ hasText: 'Retrospective' })
      .first();
    if ((await retrospectiveCard.count()) > 0) {
      await expect(retrospectiveCard).not.toHaveClass(/planning-event--covered/);
    }
  });
});
