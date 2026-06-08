import { test, expect } from './coverage-fixture.js';
import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';

test.describe('Time entry CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
  });

  // Feature 033 / US4 note: pre-feature, `[role="dialog"].first()` selector
  // was finding the offscreen-but-rendered docs-panel (display:flex with
  // transform:translateX(100%) despite the [hidden] attribute) and Playwright
  // treated it as visible. US4's `.docs-panel[hidden] { display: none }`
  // correctly hides it. The two tests below now target the actual
  // time-entry modal by id and open it deterministically via dblclick on
  // an existing event — slot interactions depend on viewport size + FC's
  // dateClick-versus-select routing which differs by device class.
  test('double-clicking an entry opens edit form', async ({ page }) => {
    const event = page.locator('[data-testid="time-entry"]').first();
    await event.dblclick();
    await expect(page.locator('#lean-time-modal')).toBeVisible({ timeout: 5000 });
  });
});
