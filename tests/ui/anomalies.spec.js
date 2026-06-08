import { test, expect } from './coverage-fixture.js';
import { mockCdn, setupConfig } from './helpers.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, '..', 'fixtures');
function loadFixture(name) {
  return JSON.parse(readFileSync(resolve(fixturesDir, name), 'utf-8'));
}

function currentMonday() {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((day + 6) % 7));
  return mon.toISOString().slice(0, 10);
}

// Override mockRedmineApi locally so each test gets a tailored entry list.
async function mockApi(page, timeEntriesList) {
  const activities = loadFixture('api-responses/activities.json');
  const issues = loadFixture('api-responses/issues.json');
  const currentUser = loadFixture('api-responses/current-user.json');
  const payload = {
    time_entries: timeEntriesList,
    total_count: timeEntriesList.length,
    offset: 0,
    limit: 100,
  };

  await page.route('**/mock-proxy/users/current.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(currentUser),
    })
  );
  await page.route('**/mock-proxy/time_entries.json*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) })
  );
  await page.route('**/mock-proxy/enumerations/time_entry_activities.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(activities),
    })
  );
  await page.route('**/mock-proxy/issues.json*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(issues) })
  );
  await page.route('**/mock-proxy/issues/*.json', (route) => {
    const id = parseInt(
      route
        .request()
        .url()
        .match(/issues\/(\d+)/)?.[1]
    );
    const issue = issues.issues.find((i) => i.id === id);
    if (issue) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ issue }),
      });
    } else {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: '{"errors":["Not found"]}',
      });
    }
  });
  await page.route('**/mock-proxy/time_entries/*.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ time_entry: timeEntriesList[0] }),
    })
  );
}

async function loginAndOpen(page) {
  await mockCdn(page);
  await setupConfig(page);
  await page.goto('/settings.html');
  await page.fill('#apiKey', 'test-api-key-12345');
  await page.click('#save-btn');
  await page.waitForURL((url) => !url.pathname.includes('settings'), { timeout: 10000 });
  await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
}

test.describe('Feature 029 — anomaly badges', () => {
  test('S1: a 0.1h entry gets the anomaly badge', async ({ page }) => {
    const mon = currentMonday();
    await mockApi(page, [
      {
        id: 201,
        hours: 0.1,
        spent_on: mon,
        comments: 'Tiny entry',
        easy_time_from: '09:00:00',
        easy_time_to: '09:06:00',
        issue: { id: 42, subject: 'Implement login page' },
        project: { id: 1, name: 'Web App', identifier: 'web-app' },
        activity: { id: 9, name: 'Development' },
      },
    ]);
    await loginAndOpen(page);
    const badge = page.locator('.fc-event__anomaly-badge').first();
    await expect(badge).toBeVisible();
  });

  test('S2: badge tooltip reveals the localized reason on click', async ({ page }) => {
    const mon = currentMonday();
    await mockApi(page, [
      {
        id: 201,
        hours: 0.1,
        spent_on: mon,
        comments: '',
        easy_time_from: '09:00:00',
        easy_time_to: '09:06:00',
        issue: { id: 42, subject: 'Login' },
        project: { id: 1, name: 'Web', identifier: 'web' },
        activity: { id: 9, name: 'Dev' },
      },
    ]);
    await loginAndOpen(page);
    const badge = page.locator('.fc-event__anomaly-badge').first();
    await badge.click();
    const tooltip = page.locator('.anomaly-tooltip').first();
    await expect(tooltip).toBeVisible();
    const text = await tooltip.textContent();
    // EN or DE — both contain "0.1"
    expect(text).toMatch(/0\.1/);
  });

  test('S5: each short entry gets its own independent badge (no aggregation)', async ({ page }) => {
    const mon = currentMonday();
    await mockApi(page, [
      {
        id: 301,
        hours: 0.1,
        spent_on: mon,
        comments: '',
        easy_time_from: '08:00:00',
        easy_time_to: '08:06:00',
        issue: { id: 42, subject: 'A' },
        project: { id: 1, name: 'P', identifier: 'p' },
        activity: { id: 9, name: 'D' },
      },
      {
        id: 302,
        hours: 0.1,
        spent_on: mon,
        comments: '',
        easy_time_from: '10:00:00',
        easy_time_to: '10:06:00',
        issue: { id: 43, subject: 'B' },
        project: { id: 1, name: 'P', identifier: 'p' },
        activity: { id: 9, name: 'D' },
      },
      {
        id: 303,
        hours: 0.1,
        spent_on: mon,
        comments: '',
        easy_time_from: '13:00:00',
        easy_time_to: '13:06:00',
        issue: { id: 44, subject: 'C' },
        project: { id: 1, name: 'P', identifier: 'p' },
        activity: { id: 9, name: 'D' },
      },
    ]);
    await loginAndOpen(page);
    const badges = page.locator('.fc-event__anomaly-badge');
    await expect(badges).toHaveCount(3);
  });

  test('S6: two overlapping entries both get badges', async ({ page }) => {
    const mon = currentMonday();
    await mockApi(page, [
      {
        id: 401,
        hours: 1,
        spent_on: mon,
        comments: '',
        easy_time_from: '14:00:00',
        easy_time_to: '15:00:00',
        issue: { id: 42, subject: 'A' },
        project: { id: 1, name: 'P', identifier: 'p' },
        activity: { id: 9, name: 'D' },
      },
      {
        id: 402,
        hours: 1,
        spent_on: mon,
        comments: '',
        easy_time_from: '14:30:00',
        easy_time_to: '15:30:00',
        issue: { id: 43, subject: 'B' },
        project: { id: 1, name: 'P', identifier: 'p' },
        activity: { id: 9, name: 'D' },
      },
    ]);
    await loginAndOpen(page);
    const badges = page.locator('.fc-event__anomaly-badge');
    await expect(badges).toHaveCount(2);
  });

  test('S10: back-to-back entries are NOT flagged', async ({ page }) => {
    const mon = currentMonday();
    await mockApi(page, [
      {
        id: 501,
        hours: 1,
        spent_on: mon,
        comments: '',
        easy_time_from: '14:00:00',
        easy_time_to: '15:00:00',
        issue: { id: 42, subject: 'A' },
        project: { id: 1, name: 'P', identifier: 'p' },
        activity: { id: 9, name: 'D' },
      },
      {
        id: 502,
        hours: 1,
        spent_on: mon,
        comments: '',
        easy_time_from: '15:00:00',
        easy_time_to: '16:00:00',
        issue: { id: 43, subject: 'B' },
        project: { id: 1, name: 'P', identifier: 'p' },
        activity: { id: 9, name: 'D' },
      },
    ]);
    await loginAndOpen(page);
    const badges = page.locator('.fc-event__anomaly-badge');
    await expect(badges).toHaveCount(0);
  });

  test('S16: anomaly evaluation issues ZERO extra Redmine requests', async ({ page }) => {
    const mon = currentMonday();
    const apiCalls = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/mock-proxy/')) apiCalls.push(url);
    });
    await mockApi(page, [
      {
        id: 601,
        hours: 0.1,
        spent_on: mon,
        comments: '',
        easy_time_from: '09:00:00',
        easy_time_to: '09:06:00',
        issue: { id: 42, subject: 'A' },
        project: { id: 1, name: 'P', identifier: 'p' },
        activity: { id: 9, name: 'D' },
      },
    ]);
    await loginAndOpen(page);
    const before = apiCalls.length;
    // Hover and click the badge — anomaly evaluation must not emit any network request.
    const badge = page.locator('.fc-event__anomaly-badge').first();
    await badge.hover();
    await badge.click();
    await page.waitForTimeout(200);
    expect(apiCalls.length).toBe(before);
  });
});
