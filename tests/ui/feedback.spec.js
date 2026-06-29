import { test, expect } from './coverage-fixture.js';
import { mockCdn, mockRedmineApi } from './helpers.js';

/**
 * Base setup: mocks CDN (FullCalendar, MSAL stub, html2canvas stub), the Redmine
 * API, and config.json (with a `feedback` block), then stores credentials via the
 * settings page and waits for the redirect to index.html.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ feedback?: object|null }} [opts]
 */
async function setupFeedbackEnv(page, { feedback = null } = {}) {
  await mockCdn(page);

  const config = {
    redmineUrl: 'http://localhost:3000/mock-proxy',
    redmineServerUrl: 'https://redmine.example.com',
    ...(feedback ? { feedback } : {}),
  };
  await page.route('**/config.json', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(config) })
  );

  await mockRedmineApi(page);

  await page.goto('/settings.html');
  await page.fill('#apiKey', 'test-api-key-12345');
  await page.click('#connect-btn');
  await page.waitForSelector('#open-calendar-btn:not([disabled])', { timeout: 10000 });
  await page.click('#open-calendar-btn');
  await page.waitForURL((url) => !url.pathname.includes('settings'), { timeout: 10000 });
}

/** Register a POST handler for Redmine issue + upload creation. Captures the body. */
async function mockTicketCreation(page) {
  const captured = { issue: null, uploaded: false };
  await page.route('**/mock-proxy/uploads.json', (route) => {
    captured.uploaded = true;
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ upload: { token: 'upload-token-1' } }),
    });
  });
  await page.route('**/mock-proxy/issues.json', (route) => {
    if (route.request().method() === 'POST') {
      captured.issue = route.request().postDataJSON();
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ issue: { id: 4242 } }),
      });
    } else {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"issues":[]}' });
    }
  });
  return captured;
}

const REDMINE_FEEDBACK = { system: 'redmine', redmineProjectId: 7 };
const GITHUB_FEEDBACK = { system: 'github', githubOwner: 'acme', githubRepo: 'cal' };

// ── US1: Redmine ticket creation ──────────────────────────────────

test.describe('US1 — Redmine ticket creation', () => {
  test.use({ bypassCSP: true });

  test('creates a Redmine ticket and shows a success toast with a link', async ({ page }) => {
    await setupFeedbackEnv(page, { feedback: REDMINE_FEEDBACK });
    const captured = await mockTicketCreation(page);
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });

    await page.locator('.feedback-toolbar-btn').click();
    const dialog = page.locator('dialog.feedback-dialog');
    await expect(dialog).toBeVisible();

    await page.selectOption('#feedback-category', 'bug');
    await page.fill('#feedback-subject', 'Calendar crashes on next week');
    await page.fill('#feedback-description', 'Calendar crashes on next week');
    await page.click('dialog.feedback-dialog button[type="submit"]');

    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // The success toast carries a clickable ticket link.
    const toastLink = page.locator('#toast a');
    await expect(toastLink).toHaveAttribute('href', 'https://redmine.example.com/issues/4242');

    expect(captured.issue).not.toBeNull();
    expect(captured.issue.issue.project_id).toBe(7);
    expect(captured.issue.issue.description).toContain('Calendar crashes on next week');
    // Context not opted in → no upload, no diagnostic sections.
    expect(captured.uploaded).toBe(false);
    expect(captured.issue.issue.description).not.toContain('## Error Log');
  });

  test('includes diagnostic sections when the consent checkbox is checked', async ({ page }) => {
    await setupFeedbackEnv(page, { feedback: REDMINE_FEEDBACK });
    const captured = await mockTicketCreation(page);
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });

    await page.locator('.feedback-toolbar-btn').click();
    const dialog = page.locator('dialog.feedback-dialog');
    await expect(dialog).toBeVisible();

    await page.selectOption('#feedback-category', 'bug');
    await page.fill('#feedback-subject', 'Bug with context');
    await page.fill('#feedback-description', 'Bug with context');
    await page.check('#feedback-consent');
    await page.waitForTimeout(400);
    await page.click('dialog.feedback-dialog button[type="submit"]');

    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    expect(captured.issue.issue.description).toContain('<h2>Environment</h2>');
    expect(captured.issue.issue.description).toContain('<h2>Network Log</h2>');
  });

  test('shows an error toast and preserves text on API failure', async ({ page }) => {
    await setupFeedbackEnv(page, { feedback: REDMINE_FEEDBACK });
    await page.route('**/mock-proxy/issues.json', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: '{"errors":["Project is invalid"]}',
        });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: '{"issues":[]}' });
      }
    });
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });

    await page.locator('.feedback-toolbar-btn').click();
    const dialog = page.locator('dialog.feedback-dialog');
    await expect(dialog).toBeVisible();

    await page.selectOption('#feedback-category', 'bug');
    await page.fill('#feedback-subject', 'Will fail');
    await page.fill('#feedback-description', 'Will fail');
    await page.click('dialog.feedback-dialog button[type="submit"]');

    // Dialog stays open, error shown, description preserved.
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.feedback-dialog__error')).not.toBeEmpty();
    await expect(page.locator('#feedback-description')).toHaveValue('Will fail');
  });
});

// ── US2: GitHub prefilled form ────────────────────────────────────

test.describe('US2 — GitHub prefilled form', () => {
  test.use({ bypassCSP: true });

  test('opens a prefilled GitHub issue URL and shows a confirmation toast', async ({ page }) => {
    await page.addInitScript(() => {
      window.__lastOpen = null;
      window.open = (href) => {
        window.__lastOpen = href;
        return null;
      };
    });
    await setupFeedbackEnv(page, { feedback: GITHUB_FEEDBACK });
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });

    await page.locator('.feedback-toolbar-btn').click();
    const dialog = page.locator('dialog.feedback-dialog');
    await expect(dialog).toBeVisible();

    await page.selectOption('#feedback-category', 'suggestion');
    await page.fill('#feedback-subject', 'Add dark mode toggle');
    await page.fill('#feedback-description', 'Add dark mode toggle');
    await page.click('dialog.feedback-dialog button[type="submit"]');

    await expect(dialog).not.toBeVisible({ timeout: 3000 });

    const lastOpen = await page.evaluate(() => window.__lastOpen);
    expect(lastOpen).toContain('https://github.com/acme/cal/issues/new');
    expect(decodeURIComponent(lastOpen)).toContain('Add dark mode toggle');
    // No GitHub token anywhere in the URL.
    expect(lastOpen.toLowerCase()).not.toContain('token');
  });
});

// ── US3: Consent checkbox ─────────────────────────────────────────

test.describe('US3 — Consent checkbox', () => {
  test('checkbox is unchecked by default and the context preview is hidden', async ({ page }) => {
    await setupFeedbackEnv(page, { feedback: REDMINE_FEEDBACK });
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });

    await page.locator('.feedback-toolbar-btn').click();
    const dialog = page.locator('dialog.feedback-dialog');
    await expect(dialog).toBeVisible();

    await expect(dialog.locator('#feedback-consent')).not.toBeChecked();
    await expect(dialog.locator('details.feedback-dialog__context')).toBeHidden();
    // The disclosure warning is always visible next to the checkbox.
    await expect(dialog.locator('.feedback-dialog__consent-warning')).toBeVisible();
  });

  test('checking the box reveals the context preview', async ({ page }) => {
    await setupFeedbackEnv(page, { feedback: REDMINE_FEEDBACK });
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });

    await page.locator('.feedback-toolbar-btn').click();
    const dialog = page.locator('dialog.feedback-dialog');
    await expect(dialog).toBeVisible();

    await page.selectOption('#feedback-category', 'bug');
    await page.check('#feedback-consent');
    await expect(dialog.locator('details.feedback-dialog__context')).toBeVisible();

    await page.uncheck('#feedback-consent');
    await expect(dialog.locator('details.feedback-dialog__context')).toBeHidden();
  });
});

// ── Validation + dismissal ────────────────────────────────────────

test.describe('Validation and dismissal', () => {
  test('validation error shown when no category selected', async ({ page }) => {
    await setupFeedbackEnv(page, { feedback: REDMINE_FEEDBACK });
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });

    await page.locator('.feedback-toolbar-btn').click();
    const dialog = page.locator('dialog.feedback-dialog');
    await expect(dialog).toBeVisible();

    await page.fill('#feedback-description', 'some text');
    await page.click('dialog.feedback-dialog button[type="submit"]');

    await expect(dialog.locator('.feedback-dialog__error')).not.toBeEmpty();
    await expect(dialog).toBeVisible();
  });

  test('cancel button closes the dialog', async ({ page }) => {
    await setupFeedbackEnv(page, { feedback: REDMINE_FEEDBACK });
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });

    await page.locator('.feedback-toolbar-btn').click();
    const dialog = page.locator('dialog.feedback-dialog');
    await expect(dialog).toBeVisible();

    await page.fill('#feedback-description', 'typed something');
    await page.click('dialog.feedback-dialog .modal-actions .btn-secondary');
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });

  test('Escape key closes the dialog', async ({ page }) => {
    await setupFeedbackEnv(page, { feedback: REDMINE_FEEDBACK });
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });

    await page.locator('.feedback-toolbar-btn').click();
    const dialog = page.locator('dialog.feedback-dialog');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });
});

// ── Config gating ─────────────────────────────────────────────────

test.describe('Config gating', () => {
  test('button hidden when no feedback channel is configured', async ({ page }) => {
    await setupFeedbackEnv(page, {});
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
    await page.waitForTimeout(300);
    await expect(page.locator('.feedback-toolbar-btn')).toHaveCount(0);
  });
});
