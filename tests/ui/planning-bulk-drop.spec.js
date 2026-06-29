import { test, expect } from './coverage-fixture.js';
import { mockCdn, mockRedmineApi, freezeClock, mockTodayEntries } from './helpers.js';

// T012 — E2E for multi-day planning-event expansion (feature 050).
//
// The demo data (js/outlook.js) provides two permanent multi-day all-day events,
// relative to FAKE_TODAY (2026-04-22, a Wednesday):
//   • "Company Holiday" — offset +2..+11 (Apr 24 – May 3): spans two weekends →
//      6 weekdays (Apr 24, 27, 28, 29, 30, May 1).
//   • "Workshop"        — offset +12..+15 (May 4 – May 7, Mon–Thu): 4 weekdays.
// Both are needs-ticket here because the test config sets no holidayTicket; a
// separate test adds holidayTicket (+ a valid issue) to exercise the silent path.

const HOLIDAY = 'Company Holiday';
const WORKSHOP = 'Workshop';

async function setupConfig(page, extra = {}) {
  await mockCdn(page);
  await page.route('**/config.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        redmineUrl: 'http://localhost:3000/mock-proxy',
        redmineServerUrl: 'https://redmine.test.example.com',
        azureClientId: 'demo',
        ...extra,
      }),
    })
  );
}

async function login(page) {
  await page.goto('/settings.html');
  await page.fill('#apiKey', 'test-api-key-12345');
  await page.click('#connect-btn');
  await page.waitForSelector('#open-calendar-btn:not([disabled])', { timeout: 10000 });
  await page.click('#open-calendar-btn');
  await page.waitForURL((url) => !url.pathname.includes('settings'), { timeout: 10000 });
}

async function openPlanning(page) {
  await page.setViewportSize({ width: 1024, height: 768 });
  const fab = page.locator('#planning-view-toggle');
  await fab.waitFor({ state: 'visible', timeout: 5000 });
  await fab.click();
  await expect(page.locator('#planning-view-main')).toBeVisible({ timeout: 5000 });
  await page.waitForSelector('.planning-event', { timeout: 5000 });
}

// Click the day-forward nav until a planning card with `text` is visible.
async function navigateToCard(page, text, maxClicks = 16) {
  const card = page.locator('.planning-event').filter({ hasText: text });
  for (let i = 0; i < maxClicks; i++) {
    if (
      await card
        .first()
        .isVisible()
        .catch(() => false)
    )
      return;
    await page.click('#toolbar-next');
    await page.waitForTimeout(350);
  }
  await expect(card.first()).toBeVisible({ timeout: 2000 });
}

// Programmatic HTML5 drag of the card matching `text` onto the bookings column.
async function dragCardToBookings(page, text) {
  await page.evaluate((t) => {
    const card = [...document.querySelectorAll('.planning-event')].find((el) =>
      el.textContent.includes(t)
    );
    const col = document.querySelector('.planning-bookings-column');
    const dt = new DataTransfer();
    card.dispatchEvent(
      new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt })
    );
    col.dispatchEvent(
      new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt })
    );
    col.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
  }, text);
}

// Count POST creations with unique ids so the bookings render + undo work.
async function trackCreates(page) {
  const counter = { posts: 0 };
  await page.route('**/mock-proxy/time_entries.json', async (route) => {
    if (route.request().method() === 'POST') {
      counter.posts++;
      // Echo the posted fields (issue_id etc.) like real Redmine does, so the
      // first saved entry carries an issueId the silent days can reuse.
      const te = JSON.parse(route.request().postData() || '{}').time_entry ?? {};
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ time_entry: { ...te, id: 7000 + counter.posts } }),
      });
    } else {
      await route.continue();
    }
  });
  return counter;
}

async function selectTicketAndSave(page) {
  await page.fill('#lean-search', '#43');
  await page.waitForSelector('.lean-search-results .lean-row', { timeout: 5000 });
  await page.locator('.lean-search-results .lean-row').first().click();
  const confirmOk = page.locator('#confirm-dialog-ok');
  await page.waitForTimeout(300);
  // Selecting a ticket auto-saves; if it didn't, click Save explicitly.
  if (!(await confirmOk.isVisible().catch(() => false))) {
    const save = page.locator('#lean-save');
    if (await save.isEnabled().catch(() => false)) await save.click().catch(() => {});
  }
  // The demo events are after the frozen "today", so saving raises the
  // "Booking in the future" guard — confirm it to complete the batch.
  await confirmOk.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
  if (await confirmOk.isVisible().catch(() => false)) await confirmOk.click();
}

test.describe('Planning View — multi-day expansion (bulk drop)', () => {
  test.use({ bypassCSP: true });

  test.beforeEach(async ({ page }) => {
    await freezeClock(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await mockTodayEntries(page);
    await login(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  test('needs-ticket multi-day: modal once with locked date + notice, books one entry per weekday', async ({
    page,
  }) => {
    const counter = await trackCreates(page);
    await openPlanning(page);
    await navigateToCard(page, WORKSHOP);

    // The card shows the date span (not a 00:00–23:59 time).
    const card = page.locator('.planning-event').filter({ hasText: WORKSHOP }).first();
    await expect(card).toContainText(/\(\d+d\)/);

    await dragCardToBookings(page, WORKSHOP);

    // Modal opens once, with the bulk notice above a locked date.
    const modal = page.locator('#lean-time-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.bulk-day-notice')).toBeVisible();
    await expect(page.locator('.bulk-day-notice')).toContainText(/will be booked|werden gebucht/);
    await expect(page.locator('#lean-info-date')).toBeDisabled();

    await selectTicketAndSave(page);
    await page.waitForTimeout(1500);

    // Workshop = May 4–7 (Mon–Thu) → 4 weekday entries, booked from one modal.
    expect(counter.posts).toBe(4);
    await expect(modal).toBeHidden();
    const toast = page.locator('#toast');
    await expect(toast).toBeVisible({ timeout: 3000 });
    await expect(toast).toContainText('4');
  });

  test('weekend days are excluded from the expansion', async ({ page }) => {
    const counter = await trackCreates(page);
    await openPlanning(page);
    await navigateToCard(page, HOLIDAY);
    await dragCardToBookings(page, HOLIDAY);

    await expect(page.locator('#lean-time-modal')).toBeVisible({ timeout: 5000 });
    await selectTicketAndSave(page);
    await page.waitForTimeout(1500);

    // Company Holiday spans Apr 24 – May 3 (10 calendar days, two weekends) →
    // only 6 weekdays are booked.
    expect(counter.posts).toBe(6);
  });

  test('cancelling the modal discards the whole drop', async ({ page }) => {
    const counter = await trackCreates(page);
    await openPlanning(page);
    await navigateToCard(page, WORKSHOP);
    await dragCardToBookings(page, WORKSHOP);

    const modal = page.locator('#lean-time-modal');
    await expect(modal).toBeVisible({ timeout: 5000 });
    await page.click('#lean-cancel');
    await page.waitForTimeout(800);

    expect(counter.posts).toBe(0);
    await expect(modal).toBeHidden();
  });

  test('a single undo removes every entry from the batch', async ({ page }) => {
    const counter = await trackCreates(page);
    let deletes = 0;
    await page.route('**/mock-proxy/time_entries/*.json', async (route) => {
      if (route.request().method() === 'DELETE') {
        deletes++;
        await route.fulfill({ status: 200 });
      } else {
        await route.continue();
      }
    });

    await openPlanning(page);
    await navigateToCard(page, WORKSHOP);
    await dragCardToBookings(page, WORKSHOP);
    await expect(page.locator('#lean-time-modal')).toBeVisible({ timeout: 5000 });
    await selectTicketAndSave(page);
    await page.waitForTimeout(1500);
    expect(counter.posts).toBe(4);

    // One Ctrl+Z removes all four entries atomically.
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(1500);
    expect(deletes).toBe(4);
  });
});

test.describe('Planning View — multi-day pre-mapped (silent) path', () => {
  test.use({ bypassCSP: true });

  test.beforeEach(async ({ page }) => {
    await freezeClock(page);
    // holidayTicket routes the all-day "Company Holiday" straight to a ticket.
    await setupConfig(page, { holidayTicket: 2132 });
    await mockRedmineApi(page);
    await mockTodayEntries(page);
    // The holiday ticket must resolve as a valid (open) issue for the column to
    // classify the card as bookable instead of needs-ticket.
    await page.route('**/mock-proxy/issues/2132.json', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          issue: {
            id: 2132,
            subject: 'Public Holiday',
            project: { id: 1, name: 'Test' },
            status: { id: 1, name: 'New', is_closed: false },
          },
        }),
      })
    );
    await login(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  test('pre-mapped multi-day event books every weekday with no modal', async ({ page }) => {
    const counter = await trackCreates(page);
    await openPlanning(page);
    await navigateToCard(page, HOLIDAY);

    // Wait for async ticket enrichment to upgrade the card to bookable.
    const card = page.locator('.planning-event--bookable').filter({ hasText: HOLIDAY }).first();
    await expect(card).toBeVisible({ timeout: 5000 });

    await dragCardToBookings(page, HOLIDAY);
    await page.waitForTimeout(1500);

    // No modal, and the same 6 weekdays are booked silently.
    await expect(page.locator('#lean-time-modal')).toBeHidden();
    expect(counter.posts).toBe(6);
    await expect(page.locator('#toast')).toContainText('6');
  });
});
