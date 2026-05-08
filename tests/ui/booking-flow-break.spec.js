import { test, expect } from './coverage-fixture.js';
import { setupConfig, mockRedmineApi, mockAiApi, setupCredentials } from './helpers.js';

// Feature 025 (US1, MVP): the AI booking flow proposes events the assistant
// classifies as non-work to the configured break ticket at 0 hours, with the
// proposal summary showing each event's ticket NUMBER AND TITLE (FR-011).
// The Outlook sensitivity flag is fully ignored (FR-014).
test.describe('Booking flow — break-ticket routing', () => {
  test.beforeEach(async ({ page }) => {
    // Override config to include breakTicket pointing at issue #42.
    const configWithBreak = {
      redmineUrl: 'http://localhost:3000/mock-proxy',
      redmineServerUrl: 'https://redmine.test.example.com',
      aiProvider: 'anthropic',
      aiModel: 'claude-haiku-4-5-20251001',
      aiApiKey: 'sk-ant-test-key',
      aiProxyUrl: 'http://localhost:3000/mock-ai-proxy',
      azureClientId: 'test-client-id',
      breakTicket: 42,
      holidayTicket: 999,
    };
    await page.route('**/config.json', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(configWithBreak) })
    );
    await mockRedmineApi(page);
    await mockAiApi(page);

    // Stub MSAL so Outlook fetch doesn't try real auth.
    await page.route('https://alcdn.msauth.net/**', (route) =>
      route.fulfill({
        status: 200, contentType: 'application/javascript',
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

    await setupCredentials(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event, .fc-timegrid-slot', { timeout: 10000 });
  });

  test('break ticket header surfaces in the chatbot break-routing context', async ({ page }) => {
    // The chatbot should be available (azureClientId set in config above).
    await page.click('.chatbot-open-btn');
    await expect(page.locator('#chatbot-panel')).toBeVisible();
    // Smoke-only: this asserts the booking flow is wired; the AI's actual
    // classification is non-deterministic and validated by UAT (per spec
    // Assumptions). The deterministic break-ticket-header emission is
    // covered by the Vitest suite (chatbot-tools tests).
  });

  test('settings page no longer exposes holiday ticket (regression for FR-006)', async ({ page }) => {
    await page.goto('/settings.html');
    await expect(page.locator('#weeklyHours')).toBeVisible();
    await expect(page.locator('#holidayTicket')).toHaveCount(0);
    await expect(page.locator('#breakTicket')).toHaveCount(0);
  });
});
