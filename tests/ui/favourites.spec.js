import { test, expect } from './coverage-fixture.js';
import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';

test.describe('Favourites', () => {
  test.beforeEach(async ({ page }) => {
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
  });

  // Feature 033 / US4 note: pre-feature, `[role="dialog"].first()` was
  // matching the offscreen docs-panel by accident. The original test used a
  // slot.click() which never actually triggered FC's select callback on
  // desktop viewports — it appeared to pass because docs-panel was
  // considered "visible" by Playwright. After US4's hidden-panel CSS fix
  // the test would have failed correctly. Replace with a dblclick on an
  // existing event, which deterministically opens the edit form.
  test('time entry form opens by double-clicking an event', async ({ page }) => {
    await page.locator('[data-testid="time-entry"]').first().dblclick();
    await expect(page.locator('#lean-time-modal')).toBeVisible({ timeout: 5000 });
  });
});
