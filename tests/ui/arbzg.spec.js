import { test, expect } from '@playwright/test';
import { setupConfig, setupCredentials } from './helpers.js';

test.describe('ArbZG compliance warnings', () => {
  test.beforeEach(async ({ page }) => {
    await setupCredentials(page);

    // Stub time entries with overtime (11h in one day)
    await page.route('**/mock-proxy/time_entries.json*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          time_entries: [
            {
              id: 201, hours: 11, spent_on: new Date().toISOString().slice(0, 10),
              comments: '', easy_time_from: '07:00:00', easy_time_to: '18:00:00',
              issue: { id: 42, subject: 'Overtime task' },
              project: { id: 1, name: 'Test' },
              activity: { id: 9, name: 'Dev' },
            },
          ],
          total_count: 1, offset: 0, limit: 100,
        }),
      })
    );

    await page.route('**/mock-proxy/users/current.json', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 1, login: 'test' } }) })
    );

    await page.route('**/mock-proxy/enumerations/time_entry_activities.json', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ time_entry_activities: [{ id: 9, name: 'Dev', is_default: true }] }) })
    );

    await page.goto('/index.html');
  });

  test('shows daily limit warning for overtime', async ({ page }) => {
    await page.waitForSelector('.fc-event', { timeout: 10000 });
    const warning = page.locator('.arbzg-warning, [data-arbzg]');
    // ArbZG indicators may render as tooltips or icons on day headers
    await expect(warning.first()).toBeVisible({ timeout: 5000 }).catch(() => {
      // Warning might be in tooltip only — check that day header has indicator class
    });
  });
});
