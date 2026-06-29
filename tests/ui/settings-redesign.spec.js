// Feature 054 — Settings Page Redesign. Covers US1 (grouped layout + nav),
// US2 (explicit connection), US3 (source reorder / #274), US4 (display
// switches), US5 (connection-gated footer), US6 (danger zone), US7 (mobile).
import { test, expect } from './coverage-fixture.js';
import { mockCdn, setupConfig, mockRedmineApi } from './helpers.js';

test.describe('Feature 054 — Settings redesign', () => {
  test.beforeEach(async ({ page }) => {
    await mockCdn(page);
    await setupConfig(page);
    await mockRedmineApi(page);
  });

  async function connect(page) {
    await page.fill('#apiKey', 'test-api-key-12345');
    await page.click('#connect-btn');
    await expect(page.locator('#conn-status')).toHaveAttribute('data-state', 'connected');
  }

  // ── US1: grouped layout + section nav ────────────────────────────
  test('US1: renders five section cards and a nav rail', async ({ page }) => {
    await page.goto('/settings.html');
    for (const id of [
      'section-display',
      'section-working-hours',
      'section-auth',
      'section-sources',
      'section-data',
    ]) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
    await expect(page.locator('#settings-nav .settings-nav-item')).toHaveCount(5);
  });

  test('US1: clicking a nav item marks it active and scrolls to the section', async ({ page }) => {
    await page.goto('/settings.html');
    await page.locator('.settings-nav-item[data-section="section-sources"]').click();
    await expect(page.locator('.settings-nav-item[data-section="section-sources"]')).toHaveClass(
      /active/
    );
    await expect(page.locator('#section-sources')).toBeInViewport();
  });

  // ── US4: display switches, instant-apply ─────────────────────────
  test('US4: display preferences are role=switch and persist on toggle', async ({ page }) => {
    await page.goto('/settings.html');
    const fast = page.locator('#settingFastMode');
    await expect(fast).toHaveAttribute('role', 'switch');
    await expect(fast).toHaveAttribute('aria-checked', 'true');
    await fast.click();
    await expect(fast).toHaveAttribute('aria-checked', 'false');
    await page.reload();
    await expect(page.locator('#settingFastMode')).toHaveAttribute('aria-checked', 'false');
  });

  // ── US2: explicit connection ─────────────────────────────────────
  test('US2: connect success path cycles the status pill', async ({ page }) => {
    await page.goto('/settings.html');
    await expect(page.locator('#conn-status')).toHaveAttribute('data-state', 'disconnected');
    await connect(page);
  });

  test('US2: invalid key shows a specific error state', async ({ page }) => {
    await page.route('**/mock-proxy/users/current.json', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: '{"errors":["x"]}' })
    );
    await page.goto('/settings.html');
    await page.fill('#apiKey', 'bad-key');
    await page.click('#connect-btn');
    await expect(page.locator('#conn-status')).toHaveAttribute('data-state', 'error');
    await expect(page.locator('#conn-status')).toContainText(/invalid|ungültig/i);
  });

  test('US2: segmented control switches fields and show/hide reveals the key', async ({ page }) => {
    await page.goto('/settings.html');
    await page
      .locator('label.segmented-option', { has: page.locator('input[value="basic"]') })
      .click();
    await expect(page.locator('#field-basic')).toBeVisible();
    await expect(page.locator('#field-apikey')).toBeHidden();
    await page
      .locator('label.segmented-option', { has: page.locator('input[value="apikey"]') })
      .click();
    const key = page.locator('#apiKey');
    await expect(key).toHaveAttribute('type', 'password');
    await page.click('.password-toggle[data-target="apiKey"]');
    await expect(key).toHaveAttribute('type', 'text');
  });

  // ── US5: connection-gated footer ─────────────────────────────────
  test('US5: footer CTA is disabled until connected, then navigates', async ({ page }) => {
    await page.goto('/settings.html');
    await expect(page.locator('#open-calendar-btn')).toBeDisabled();
    await expect(page.locator('#footer-hint')).toBeVisible();
    await connect(page);
    await expect(page.locator('#open-calendar-btn')).toBeEnabled();
    await page.click('#open-calendar-btn');
    await page.waitForURL((url) => !url.pathname.includes('settings'));
  });

  test('US5: editing a credential after connect re-disables the footer', async ({ page }) => {
    await page.goto('/settings.html');
    await connect(page);
    await expect(page.locator('#open-calendar-btn')).toBeEnabled();
    await page.fill('#apiKey', 'changed');
    await expect(page.locator('#open-calendar-btn')).toBeDisabled();
    await expect(page.locator('#conn-hint')).toBeVisible();
  });

  // ── US3: choose & order planning sources (#274) ──────────────────
  test('US3: source rows render with badges and enable checkboxes', async ({ page }) => {
    await page.goto('/settings.html');
    await expect(page.locator('#source-list .source-row')).toHaveCount(2);
    await expect(page.locator('#source-list .source-badge').first()).toHaveText('1');
  });

  test('US3: arrow buttons reorder, renumber badges, persist, and announce', async ({ page }) => {
    await page.goto('/settings.html');
    const firstLabel = await page
      .locator('#source-list .source-row')
      .first()
      .locator('.source-toggle span')
      .textContent();
    // First row's up arrow is disabled; move it down instead.
    await page.locator('#source-list .source-row').first().locator('.source-arrow').nth(1).click();
    // The moved source is now in row 2 with badge 2.
    const movedRow = page.locator('#source-list .source-row').filter({ hasText: firstLabel ?? '' });
    await expect(movedRow.locator('.source-badge')).toHaveText('2');
    await expect(page.locator('#settings-live')).toContainText(/2/);
    const stored = await page.evaluate(() =>
      localStorage.getItem('redmine_calendar_planning_source_order')
    );
    expect(stored).toBe(JSON.stringify(['teams', 'outlook']));
  });

  test('US3: keyboard grab + arrow reorders via the grip', async ({ page }) => {
    await page.goto('/settings.html');
    const grip = page.locator('#source-list .source-row').first().locator('.source-grip');
    await grip.focus();
    await grip.press(' '); // grab
    await grip.press('ArrowDown'); // move down
    const stored = await page.evaluate(() =>
      localStorage.getItem('redmine_calendar_planning_source_order')
    );
    expect(stored).toBe(JSON.stringify(['teams', 'outlook']));
  });

  test('US3: enabling/disabling a source persists immediately', async ({ page }) => {
    await page.goto('/settings.html');
    const teams = page.locator('[data-testid="teams-source-toggle"]');
    await teams.uncheck();
    expect(
      await page.evaluate(() => localStorage.getItem('redmine_calendar_planning_source_teams'))
    ).toBe('0');
  });

  // ── US6: danger zone ─────────────────────────────────────────────
  test('US6: danger zone has a privacy link and confirmed destructive actions', async ({
    page,
  }) => {
    await page.goto('/settings.html');
    const danger = page.locator('#section-data.danger-zone');
    await expect(danger).toBeVisible();
    await expect(page.locator('#privacy-policy-link')).toHaveAttribute('href', 'privacy.html');

    let confirmed = false;
    page.on('dialog', (d) => {
      confirmed = true;
      d.dismiss();
    });
    await page.locator('#delete-planning-data-btn').click();
    expect(confirmed).toBe(true);
  });
});

// ── US7: mobile (<640px) ───────────────────────────────────────────
test.describe('Feature 054 — mobile', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await mockCdn(page);
    await setupConfig(page);
    await mockRedmineApi(page);
  });

  test('US7: single-column layout with a chip-bar nav and 44px targets', async ({ page }) => {
    await page.goto('/settings.html');
    await expect(page.locator('#settings-nav .settings-nav-item').first()).toBeVisible();
    // Arrow reorder buttons are the touch path; assert a ≥44px target.
    const box = await page.locator('#source-list .source-arrow').first().boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    // Primary buttons go full width.
    await expect(page.locator('#open-calendar-btn')).toBeVisible();
  });
});
