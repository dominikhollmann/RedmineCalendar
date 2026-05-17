import { test, expect } from './coverage-fixture.js';
import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';

// Feature 033 / US1 — clicking outside the time-entry modal must NOT close it.
// Escape, X, and Cancel remain the only dismissal paths. A drag that starts
// inside the modal and ends outside it (e.g., a text-selection overshoot) must
// also not close the modal.

test.describe('Time-entry modal dismissal (US1)', () => {
  test.beforeEach(async ({ page }) => {
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  async function openModal(page) {
    const slot = page.locator('.fc-timegrid-slot[data-time="10:00:00"]').first();
    await slot.click();
    await expect(page.locator('#lean-time-modal')).toBeVisible({ timeout: 5000 });
  }

  test('outside click does NOT close the modal and preserves input', async ({ page }) => {
    await openModal(page);
    const search = page.locator('#lean-ticket-search, input[placeholder*="ticket" i]').first();
    await search.fill('partial query');

    // Click on the dim backdrop area outside the card. The .lean-overlay is
    // the full-screen wrapper; the .lean-card is the visible modal box. We
    // click well outside the card.
    await page.mouse.click(5, 5);

    await expect(page.locator('#lean-time-modal')).toBeVisible();
    await expect(search).toHaveValue('partial query');
  });

  test('Escape closes the modal', async ({ page }) => {
    await openModal(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('#lean-time-modal')).toBeHidden();
  });

  test('Cancel button closes the modal', async ({ page }) => {
    await openModal(page);
    await page.locator('#lean-cancel').click();
    await expect(page.locator('#lean-time-modal')).toBeHidden();
  });

  test('drag-from-inside-to-outside does NOT close the modal', async ({ page }) => {
    await openModal(page);

    const card = page.locator('#lean-time-modal .lean-card');
    const box = await card.boundingBox();
    if (!box) throw new Error('lean-card not visible');

    // mousedown inside the card, drag to a point well outside, mouseup.
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(5, 5);
    await page.mouse.up();

    await expect(page.locator('#lean-time-modal')).toBeVisible();
  });
});
