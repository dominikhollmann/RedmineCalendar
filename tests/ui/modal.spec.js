import { test, expect } from './coverage-fixture.js';
import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';

// Feature 033 / US1 — clicking outside the time-entry modal must NOT close it.
// Escape and Cancel remain the dismissal paths. A drag that starts inside the
// modal and ends outside it (e.g., a text-selection overshoot) must also not
// close the modal.

const MODAL = '#lean-time-modal';

test.describe('Time-entry modal dismissal (US1)', () => {
  test.beforeEach(async ({ page }) => {
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
  });

  // Open the modal by double-clicking an existing mocked event. This is the
  // most reliable way to get the modal open in CI: time-entry events respond
  // to dblclick deterministically, unlike slot interactions which depend on
  // viewport size + FC's select-versus-dateClick callback routing.
  async function openModal(page) {
    await page.locator('[data-testid="time-entry"]').first().dblclick();
    await expect(page.locator(MODAL)).toBeVisible({ timeout: 5000 });
  }

  test('outside click does NOT close the modal and preserves input', async ({ page }) => {
    await openModal(page);
    // The comment input is the only always-present text input in edit mode.
    const comment = page.locator('#lean-comment');
    await comment.fill('partial query');

    // Click well outside the modal card (.lean-card sits inside .lean-overlay).
    await page.mouse.click(5, 5);

    await expect(page.locator(MODAL)).toBeVisible();
    await expect(comment).toHaveValue('partial query');
  });

  test('Escape closes the modal', async ({ page }) => {
    await openModal(page);
    await page.keyboard.press('Escape');
    await expect(page.locator(MODAL)).toBeHidden();
  });

  test('Cancel button closes the modal', async ({ page }) => {
    await openModal(page);
    await page.locator('#lean-cancel').click();
    await expect(page.locator(MODAL)).toBeHidden();
  });

  test('drag-from-inside-to-outside does NOT close the modal', async ({ page }) => {
    await openModal(page);

    const card = page.locator(`${MODAL} .lean-card`);
    const box = await card.boundingBox();
    if (!box) throw new Error('lean-card not visible');

    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(5, 5);
    await page.mouse.up();

    await expect(page.locator(MODAL)).toBeVisible();
  });
});
