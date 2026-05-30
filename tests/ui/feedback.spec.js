import { test, expect } from './coverage-fixture.js';
import { mockCdn, mockRedmineApi } from './helpers.js';

// MSAL stub with one account signed in — used to exercise the Graph send path.
const MSAL_SIGNED_IN = `
window.msal = {
  PublicClientApplication: class {
    constructor() {}
    getAllAccounts() { return [{ username: 'test@example.com' }]; }
    async acquireTokenSilent() { return { accessToken: 'mock-feedback-token' }; }
    async acquireTokenPopup() { return { accessToken: 'mock-feedback-token' }; }
  }
};`;

/**
 * Base setup: mocks CDN (incl. FullCalendar, MSAL, html2canvas stubs),
 * Redmine API, and config.json; then stores credentials via the settings page
 * and waits for the redirect to index.html.
 */
async function setupFeedbackEnv(page, { feedbackEmail = null, msalSignedIn = false } = {}) {
  await mockCdn(page); // handles FullCalendar, MSAL unsigned-in stub, html2canvas stub

  if (msalSignedIn) {
    // Override the default unsigned-in MSAL stub with a signed-in one.
    await page.route('**/msal-browser**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: MSAL_SIGNED_IN })
    );
  }

  const config = {
    redmineUrl: 'http://localhost:3000/mock-proxy',
    // azureClientId is required for getMsalInstance() to initialise MSAL.
    ...(msalSignedIn ? { azureClientId: 'test-client-id' } : {}),
    ...(feedbackEmail ? { feedbackEmail } : {}),
  };
  await page.route('**/config.json', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(config) })
  );

  await mockRedmineApi(page);

  // Persist credentials: fill settings page → save → wait for redirect to index.html.
  await page.goto('/settings.html');
  await page.fill('#apiKey', 'test-api-key-12345');
  await page.click('#save-btn');
  await page.waitForURL((url) => !url.pathname.includes('settings'), { timeout: 10000 });
}

// ── UAT Scenario 1: Bug Report full flow via Office 365 ───────────

test.describe('UAT Scenario 1 — Bug Report via Office 365', () => {
  // bypassCSP so page JS can reach graph.microsoft.com (intercepted by route mock).
  // In production the server-side Content-Security-Policy header adds connect-src.
  test.use({ bypassCSP: true });

  test('submits bug report email via Graph API and closes dialog', async ({ page }) => {
    let capturedMailBody = null;

    // Intercept Graph sendMail before setting up the environment so the route
    // is registered before index.html loads feedback.js.
    await page.route('https://graph.microsoft.com/v1.0/me/sendMail', (route) => {
      capturedMailBody = route.request().postDataJSON();
      route.fulfill({ status: 202 });
    });

    await setupFeedbackEnv(page, { feedbackEmail: 'admin@test.com', msalSignedIn: true });
    // Fresh navigation so calendar + feedback.js both initialize with the routes above.
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });

    // FAB button should be visible.
    const fab = page.locator('.feedback-fab');
    await expect(fab).toBeVisible({ timeout: 5000 });

    // Open feedback dialog.
    await fab.click();
    const dialog = page.locator('dialog.feedback-dialog');
    await expect(dialog).toBeVisible();

    // Select "Bug Report" category and wait for async context collection.
    await page.selectOption('#feedback-category', 'bug');
    await page.waitForTimeout(500);

    // Fill description and submit.
    await page.fill('#feedback-description', 'Calendar crashes when clicking next week');
    await page.click('dialog.feedback-dialog button[type="submit"]');

    // Dialog should close after successful send.
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Graph API must have received a correctly-shaped request.
    expect(capturedMailBody).not.toBeNull();
    expect(capturedMailBody.message.subject).toContain('Bug Report');
    expect(capturedMailBody.message.toRecipients[0].emailAddress.address).toBe('admin@test.com');
    expect(capturedMailBody.message.body.contentType).toBe('HTML');
    expect(capturedMailBody.message.body.content).toContain(
      'Calendar crashes when clicking next week'
    );
  });

  test('dialog opens with category selector and context details', async ({ page }) => {
    await setupFeedbackEnv(page, { feedbackEmail: 'admin@test.com', msalSignedIn: true });
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });

    await page.locator('.feedback-fab').click();
    const dialog = page.locator('dialog.feedback-dialog');
    await expect(dialog).toBeVisible();

    await expect(dialog.locator('#feedback-category')).toBeVisible();
    await expect(dialog.locator('#feedback-description')).toBeVisible();
    await expect(dialog.locator('details.feedback-dialog__context')).toBeAttached();
  });

  test('validation error shown when no category selected', async ({ page }) => {
    await setupFeedbackEnv(page, { feedbackEmail: 'admin@test.com', msalSignedIn: true });
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });

    await page.locator('.feedback-fab').click();
    const dialog = page.locator('dialog.feedback-dialog');
    await expect(dialog).toBeVisible();

    // Submit with no category (but a description).
    await page.fill('#feedback-description', 'some text');
    await page.click('dialog.feedback-dialog button[type="submit"]');

    await expect(dialog.locator('.feedback-dialog__error')).not.toBeEmpty();
    await expect(dialog).toBeVisible();
  });

  test('cancel button closes dialog without submitting', async ({ page }) => {
    await setupFeedbackEnv(page, { feedbackEmail: 'admin@test.com', msalSignedIn: false });
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });

    await page.locator('.feedback-fab').click();
    const dialog = page.locator('dialog.feedback-dialog');
    await expect(dialog).toBeVisible();

    await page.fill('#feedback-description', 'typed something');
    await page.click('dialog.feedback-dialog .btn-secondary');

    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });
});

// ── UAT Scenario 4: Button hidden when feedbackEmail absent ────────

test.describe('UAT Scenario 4 — Button hidden when feedbackEmail absent', () => {
  test('FAB is not rendered when feedbackEmail is not in config', async ({ page }) => {
    await setupFeedbackEnv(page, { feedbackEmail: null });
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
    await page.waitForTimeout(300);

    await expect(page.locator('.feedback-fab')).toHaveCount(0);
  });

  test('FAB is rendered when feedbackEmail is configured', async ({ page }) => {
    await setupFeedbackEnv(page, { feedbackEmail: 'feedback@example.com' });
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });

    await expect(page.locator('.feedback-fab')).toBeVisible({ timeout: 5000 });
  });

  test('FAB is visible on settings.html when feedbackEmail configured', async ({ page }) => {
    await setupFeedbackEnv(page, { feedbackEmail: 'feedback@example.com' });
    // Navigate to settings page again after credentials are stored.
    await page.goto('/settings.html');
    await page.waitForTimeout(500);

    await expect(page.locator('.feedback-fab')).toBeVisible({ timeout: 5000 });
  });
});
