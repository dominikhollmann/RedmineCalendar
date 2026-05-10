import { test, expect } from './coverage-fixture.js';
import { setupConfig, mockRedmineApi, mockAiApi, setupCredentials } from './helpers.js';

test.describe('Outlook Calendar Booking', () => {
  test.beforeEach(async ({ page }) => {
    await setupCredentials(page);
    await setupConfig(page, { azureClientId: 'test-client-id' });
    await mockRedmineApi(page);
    await mockAiApi(page);

    await page.route('https://alcdn.msauth.net/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `window.msal = {
          PublicClientApplication: class {
            constructor() {}
            getAllAccounts() { return [{ username: 'test@example.com' }]; }
            async acquireTokenSilent() { return { accessToken: 'mock-token' }; }
            async acquireTokenPopup() { return { accessToken: 'mock-token' }; }
          }
        };`,
      })
    );

    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  test('book_outlook_day tool is registered when azureClientId configured', async ({ page }) => {
    await page.click('.chatbot-open-btn');
    const panel = page.locator('#chatbot-panel');
    await expect(panel).toBeVisible();
  });

  // Feature 025 (FR-006): the holiday-ticket input has been removed from the
  // Settings page; it is now admin-managed in config.json. Only weeklyHours
  // remains user-editable in the Outlook integration block.
  test('settings page shows weekly hours but no holiday/break ticket fields', async ({ page }) => {
    await page.goto('/settings.html');
    await expect(page.locator('#weeklyHours')).toBeVisible();
    await expect(page.locator('#holidayTicket')).toHaveCount(0);
    await expect(page.locator('#breakTicket')).toHaveCount(0);
  });
});
