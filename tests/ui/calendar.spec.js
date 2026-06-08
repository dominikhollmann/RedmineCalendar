import { test, expect } from './coverage-fixture.js';
import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';
import { CalendarPage } from './pages/CalendarPage.js';

async function setup(page) {
  await setupCredentials(page);
  await setupConfig(page);
  await mockRedmineApi(page);
  await page.goto('/index.html');
}

test.describe('Calendar page', () => {
  test.describe('with loaded entries', () => {
    test.beforeEach(async ({ page }) => {
      await setup(page);
      await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
    });

    test('loads and displays time entries', async ({ page }) => {
      const cal = new CalendarPage(page);
      await expect(cal.timeEntries.first()).toBeVisible();
    });

    test('displays week total in header', async ({ page }) => {
      const cal = new CalendarPage(page);
      await expect(cal.weekTotal).toBeVisible();
    });

    test('navigates to previous week', async ({ page }) => {
      const cal = new CalendarPage(page);
      const titleBefore = await cal.navTitle.textContent();
      await cal.navPrev.click();
      const titleAfter = await cal.navTitle.textContent();
      expect(titleAfter).not.toBe(titleBefore);
    });

    test('navigates to next week', async ({ page }) => {
      const cal = new CalendarPage(page);
      const titleBefore = await cal.navTitle.textContent();
      await cal.navNext.click();
      const titleAfter = await cal.navTitle.textContent();
      expect(titleAfter).not.toBe(titleBefore);
    });

    test('today button returns to current week', async ({ page }) => {
      const cal = new CalendarPage(page);
      await cal.navPrev.click();
      await cal.navToday.click();
      const title = await cal.navTitle.textContent();
      expect(title).toBeTruthy();
    });

    test('opens time-entry modal on event double-click', async ({ page }) => {
      const cal = new CalendarPage(page);
      await cal.timeEntries.first().dblclick();
      await expect(page.locator('#lean-time-modal')).toBeVisible({ timeout: 5000 });
    });
  });

  test('shows no events for empty week', async ({ page }) => {
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.route('**/mock-proxy/time_entries.json*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"time_entries":[],"total_count":0,"offset":0,"limit":100}',
      })
    );
    await page.goto('/index.html');
    const cal = new CalendarPage(page);
    await page.waitForResponse('**/mock-proxy/time_entries.json*');
    await expect(cal.loading).toBeHidden({ timeout: 5000 });
    await expect(cal.timeEntries).toHaveCount(0);
  });

  test('shows error banner on API 403', async ({ page }) => {
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.route('**/mock-proxy/time_entries.json*', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: '{"errors":["You are not authorized to access this resource."]}',
      })
    );
    await page.goto('/index.html');
    const cal = new CalendarPage(page);
    await expect(cal.errorBanner).toBeVisible({ timeout: 10000 });
  });

  test('shows error banner on API 500', async ({ page }) => {
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.route('**/mock-proxy/time_entries.json*', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: '{"errors":["Internal Server Error"]}',
      })
    );
    await page.goto('/index.html');
    const cal = new CalendarPage(page);
    await expect(cal.errorBanner).toBeVisible({ timeout: 10000 });
  });

  test('shows loading overlay while fetching entries', async ({ page }) => {
    let resolve;
    const blocker = new Promise((r) => (resolve = r));
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.route('**/mock-proxy/time_entries.json*', async (route) => {
      await blocker;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"time_entries":[],"total_count":0,"offset":0,"limit":100}',
      });
    });
    await page.goto('/index.html');
    const cal = new CalendarPage(page);
    await expect(cal.loading).toBeVisible({ timeout: 5000 });
    resolve();
    await expect(cal.loading).toBeHidden({ timeout: 5000 });
  });

  test('retry button triggers a new fetch after error', async ({ page }) => {
    await setupCredentials(page);
    // Use a toggle instead of callCount: robust against any pre-navigation
    // fetches from the settings-redirect page consuming the first slot.
    let shouldFail = true;
    await page.route('**/mock-proxy/time_entries.json*', (route) => {
      if (shouldFail) {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: '{"errors":["Internal Server Error"]}',
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"time_entries":[],"total_count":0,"offset":0,"limit":100}',
      });
    });
    await page.goto('/index.html');
    const cal = new CalendarPage(page);
    await expect(cal.errorBanner).toBeVisible({ timeout: 10000 });
    shouldFail = false;
    await cal.errorRetry.click();
    await expect(cal.errorBanner).toBeHidden({ timeout: 5000 });
  });

  test('navigates across year boundary (Dec → Jan)', async ({ page }) => {
    await page.addInitScript(() => {
      const fakeNow = new Date('2025-12-28T12:00:00').getTime();
      const OrigDate = Date;
      class FakeDate extends OrigDate {
        constructor(...args) {
          if (args.length === 0) super(fakeNow);
          else super(...args);
        }
        static now() {
          return fakeNow;
        }
      }
      window.Date = FakeDate;
    });
    await setupCredentials(page);
    // mockRedmineApi uses currentWeekDates() in Node.js (real clock = June 2026),
    // so its entries never appear in the Dec 2025 week. Override with Dec entries.
    await page.route('**/mock-proxy/time_entries.json*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          time_entries: [
            {
              id: 101,
              hours: 2.0,
              spent_on: '2025-12-22',
              comments: 'Year boundary test entry',
              easy_time_from: '09:00:00',
              easy_time_to: '11:00:00',
              issue: { id: 42, subject: 'Test task' },
              project: { id: 1, name: 'Web App', identifier: 'web-app' },
              activity: { id: 9, name: 'Development' },
            },
          ],
          total_count: 1,
          offset: 0,
          limit: 100,
        }),
      })
    );
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });

    const cal = new CalendarPage(page);
    const titleDec = await cal.navTitle.textContent();
    expect(titleDec).toMatch(/Dec|Dez/i);

    await cal.navNext.click();
    const titleJan = await cal.navTitle.textContent();
    expect(titleJan).toMatch(/Jan/i);
  });
});
