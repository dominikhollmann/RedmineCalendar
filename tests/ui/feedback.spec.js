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

// ── UAT Scenario 2: Suggestion flow ───────────────────────────────

test.describe('UAT Scenario 2 — Suggestion flow', () => {
  test.use({ bypassCSP: true });

  test('suggestion submit triggers mailto fallback and closes dialog', async ({ page }) => {
    // Intercept window.open via addInitScript so the stub is in place before
    // feedback.js loads. We block the real window.open to avoid popup warnings.
    await page.addInitScript(() => {
      window.__lastOpen = null;
      window.open = (href) => {
        window.__lastOpen = href;
      };
    });

    await setupFeedbackEnv(page, { feedbackEmail: 'admin@test.com', msalSignedIn: false });
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });

    await page.locator('.feedback-fab').click();
    const dialog = page.locator('dialog.feedback-dialog');
    await expect(dialog).toBeVisible();

    await page.selectOption('#feedback-category', 'suggestion');
    await page.waitForTimeout(300);
    await page.fill('#feedback-description', 'Add dark mode toggle');
    await page.click('dialog.feedback-dialog button[type="submit"]');

    // Dialog closes after mailto is dispatched.
    await expect(dialog).not.toBeVisible({ timeout: 3000 });

    // Verify the mailto URL was built with the correct category label.
    const lastOpen = await page.evaluate(() => window.__lastOpen);
    expect(lastOpen).toContain('mailto:');
    expect(decodeURIComponent(lastOpen)).toContain('Suggestion');
  });

  test('switching to Suggestion hides error/network/log context sections', async ({ page }) => {
    await setupFeedbackEnv(page, { feedbackEmail: 'admin@test.com', msalSignedIn: false });
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });

    await page.locator('.feedback-fab').click();
    const dialog = page.locator('dialog.feedback-dialog');
    await expect(dialog).toBeVisible();

    // Open the context details panel.
    await dialog
      .locator('details.feedback-dialog__context')
      .evaluate((el) => el.setAttribute('open', ''));

    // Select Suggestion — should render only screenshot + environment.
    await page.selectOption('#feedback-category', 'suggestion');
    await page.waitForTimeout(500);

    const contextBody = dialog.locator('.feedback-dialog__context-body');
    await expect(contextBody.locator('text=feedback.section_errors')).toHaveCount(0);
    await expect(contextBody.locator('text=feedback.section_network')).toHaveCount(0);
    await expect(contextBody.locator('text=feedback.section_app_log')).toHaveCount(0);
  });

  test('cancel closes suggestion dialog without sending', async ({ page }) => {
    await setupFeedbackEnv(page, { feedbackEmail: 'admin@test.com', msalSignedIn: false });
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });

    await page.locator('.feedback-fab').click();
    const dialog = page.locator('dialog.feedback-dialog');
    await expect(dialog).toBeVisible();

    await page.selectOption('#feedback-category', 'suggestion');
    await page.fill('#feedback-description', 'some idea');
    await page.click('dialog.feedback-dialog .btn-secondary');

    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });
});

// ── UAT Scenario 5: Screenshot capture fails gracefully ───────────

test.describe('UAT Scenario 5 — Screenshot capture fails gracefully', () => {
  test('shows unavailable note when html2canvas throws', async ({ page }) => {
    // Override html2canvas to throw before the page initialises.
    await page.addInitScript(() => {
      window.html2canvas = () => Promise.reject(new Error('capture blocked'));
    });

    await setupFeedbackEnv(page, { feedbackEmail: 'admin@test.com' });
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });

    await page.locator('.feedback-fab').click();
    const dialog = page.locator('dialog.feedback-dialog');
    await expect(dialog).toBeVisible();

    // Open the context panel to inspect screenshot section.
    await dialog
      .locator('details.feedback-dialog__context')
      .evaluate((el) => el.setAttribute('open', ''));
    await page.selectOption('#feedback-category', 'bug');
    await page.waitForTimeout(600);

    // Screenshot unavailable text should be present.
    const contextBody = dialog.locator('.feedback-dialog__context-body');
    await expect(contextBody.locator('.screenshot-unavailable')).toBeVisible({ timeout: 3000 });
  });

  test('submission succeeds when screenshot is null', async ({ page }) => {
    await page.addInitScript(() => {
      window.html2canvas = () => Promise.reject(new Error('unavailable'));
      window.__lastOpen = null;
      window.open = (href) => {
        window.__lastOpen = href;
      };
    });

    await setupFeedbackEnv(page, { feedbackEmail: 'admin@test.com', msalSignedIn: false });
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });

    await page.locator('.feedback-fab').click();
    const dialog = page.locator('dialog.feedback-dialog');
    await expect(dialog).toBeVisible();

    await page.selectOption('#feedback-category', 'suggestion');
    await page.waitForTimeout(300);
    await page.fill('#feedback-description', 'Works without screenshot');
    await page.click('dialog.feedback-dialog button[type="submit"]');

    // Dialog must close (no crash from null screenshot).
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });
});

// ── UAT Scenario 6: Keyboard accessibility ────────────────────────

test.describe('UAT Scenario 6 — Keyboard accessibility', () => {
  test('dialog can be navigated and submitted with keyboard only', async ({ page }) => {
    await page.addInitScript(() => {
      window.__lastOpen = null;
      window.open = (href) => {
        window.__lastOpen = href;
      };
    });

    await setupFeedbackEnv(page, { feedbackEmail: 'admin@test.com', msalSignedIn: false });
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });

    // Focus FAB directly and activate with keyboard.
    const fab = page.locator('.feedback-fab');
    await expect(fab).toBeVisible();
    await fab.focus();
    await page.keyboard.press('Enter');

    const dialog = page.locator('dialog.feedback-dialog');
    await expect(dialog).toBeVisible();

    // Select Suggestion via keyboard (ArrowDown twice from blank).
    const select = dialog.locator('#feedback-category');
    await select.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(300);

    // Tab to description, type, then focus submit and press Enter.
    await page.keyboard.press('Tab');
    await page.keyboard.type('Keyboard-only suggestion');
    const submitBtn = dialog.locator('button[type="submit"]');
    await submitBtn.focus();
    await page.keyboard.press('Enter');

    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });

  test('Escape key closes the dialog', async ({ page }) => {
    await setupFeedbackEnv(page, { feedbackEmail: 'admin@test.com' });
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });

    await page.locator('.feedback-fab').click();
    const dialog = page.locator('dialog.feedback-dialog');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });
});

// ── UAT Scenario 7: Settings page ─────────────────────────────────

test.describe('UAT Scenario 7 — Feedback button on settings page', () => {
  test('FAB visible on settings.html and dialog opens', async ({ page }) => {
    await setupFeedbackEnv(page, { feedbackEmail: 'admin@test.com' });
    await page.goto('/settings.html');
    await page.waitForTimeout(500);

    const fab = page.locator('.feedback-fab');
    await expect(fab).toBeVisible({ timeout: 5000 });

    await fab.click();
    const dialog = page.locator('dialog.feedback-dialog');
    await expect(dialog).toBeVisible();

    // No FullCalendar on settings page — calendarState should gracefully be null.
    await page.selectOption('#feedback-category', 'bug');
    await page.waitForTimeout(400);
    // Context renders without crashing (no .fc element on settings page).
    await expect(dialog.locator('details.feedback-dialog__context')).toBeAttached();
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
