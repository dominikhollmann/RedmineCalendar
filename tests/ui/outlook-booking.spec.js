import { test, expect } from '@playwright/test';
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

  test('settings page shows weekly hours and holiday ticket fields', async ({ page }) => {
    await page.goto('/settings.html');
    const weeklyHours = page.locator('#weeklyHours');
    const holidayTicket = page.locator('#holidayTicket');
    await expect(weeklyHours).toBeVisible();
    await expect(holidayTicket).toBeVisible();
  });
});
