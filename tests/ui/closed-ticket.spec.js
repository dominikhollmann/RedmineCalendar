import { test, expect } from './coverage-fixture.js';
import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';

const MODAL = '#lean-time-modal';
const BADGE = '#closed-ticket-badge';
const CONFIRM = '#confirm-dialog';

const CLOSED_ISSUE = {
  id: 99,
  subject: 'Closed Feature Ticket',
  status: { id: 5, name: 'Closed', is_closed: true },
  project: { id: 1, name: 'Demo Project', identifier: 'demo' },
  tracker: { id: 1, name: 'Feature' },
};

async function mockClosedIssue(page) {
  await page.route('**/mock-proxy/issues/99.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ issue: CLOSED_ISSUE }),
    })
  );
  await page.route(
    (url) => url.href.includes('/mock-proxy/issues.json') && url.href.includes('issue_id=99'),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ issues: [CLOSED_ISSUE], total_count: 1 }),
      })
  );
}

async function mockIssue42Closed(page) {
  await page.route('**/mock-proxy/issues/42.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        issue: {
          id: 42,
          subject: 'Implement login page',
          status: { id: 5, name: 'Closed', is_closed: true },
          project: { id: 1, name: 'Demo' },
        },
      }),
    })
  );
}

async function openModal(page) {
  await page.locator('[data-testid="time-entry"]').first().dblclick();
  await expect(page.locator(MODAL)).toBeVisible({ timeout: 5000 });
}

test.describe('Closed-ticket booking gate', () => {
  test.beforeEach(async ({ page }) => {
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
  });

  test('confirm-dialog element is present on page', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
    await expect(page.locator(CONFIRM)).toHaveCount(1);
  });

  test('closed-ticket badge element is present in page structure', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
    await openModal(page);
    await expect(page.locator(BADGE)).toHaveCount(1);
  });

  test('US1: selecting a closed ticket shows badge and confirmation dialog on save', async ({
    page,
  }) => {
    await mockClosedIssue(page);
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
    await openModal(page);

    await page.fill('#lean-search', '#99');
    await page.waitForSelector('.lean-search-results .lean-row', { timeout: 5000 });
    await page.locator('.lean-search-results .lean-row').first().click();

    await expect(page.locator(CONFIRM)).not.toHaveClass(/hidden/, { timeout: 5000 });
    await expect(page.locator(BADGE)).toHaveClass(/visible/);
  });

  test('US1: cancelling the confirmation dialog keeps the modal open', async ({ page }) => {
    await mockClosedIssue(page);
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
    await openModal(page);

    await page.fill('#lean-search', '#99');
    await page.waitForSelector('.lean-search-results .lean-row', { timeout: 5000 });
    await page.locator('.lean-search-results .lean-row').first().click();
    await expect(page.locator(CONFIRM)).not.toHaveClass(/hidden/, { timeout: 5000 });

    await page.locator('#confirm-dialog-cancel').click();
    await expect(page.locator(CONFIRM)).toHaveClass(/hidden/);
    await expect(page.locator(MODAL)).toBeVisible();
    await expect(page.locator(BADGE)).toHaveClass(/visible/);
  });

  test('US1: open ticket shows no badge and no dialog', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
    await openModal(page);

    await page.fill('#lean-search', '#42');
    await page.waitForSelector('.lean-search-results .lean-row', { timeout: 5000 });
    await page.locator('.lean-search-results .lean-row').first().click();

    await expect(page.locator(MODAL)).toBeHidden({ timeout: 5000 });
    await expect(page.locator(CONFIRM)).toHaveClass(/hidden/);
  });

  test('US2: edit form for closed-ticket entry shows badge', async ({ page }) => {
    await mockIssue42Closed(page);
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });

    await page.locator('[data-testid="time-entry"]').first().dblclick();
    await expect(page.locator(MODAL)).toBeVisible({ timeout: 5000 });

    await expect(page.locator(BADGE)).toHaveClass(/visible/, { timeout: 3000 });
  });

  test('US2: edit form for open-ticket entry shows no badge', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });

    await page.locator('[data-testid="time-entry"]').first().dblclick();
    await expect(page.locator(MODAL)).toBeVisible({ timeout: 5000 });

    await expect(page.locator(BADGE)).not.toHaveClass(/visible/);
  });

  test('US6: confirm-dialog overlay structure has required child elements', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
    await expect(page.locator('#confirm-dialog-title')).toHaveCount(1);
    await expect(page.locator('#confirm-dialog-message')).toHaveCount(1);
    await expect(page.locator('#confirm-dialog-ok')).toHaveCount(1);
    await expect(page.locator('#confirm-dialog-cancel')).toHaveCount(1);
  });
});
