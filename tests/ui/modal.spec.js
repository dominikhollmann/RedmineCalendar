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
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  // Match the working pattern from time-entry.spec.js: select a slot via
  // mouse drag (mousedown → move → mouseup over the same cell). A plain
  // .click() does not always trigger FullCalendar's `select` callback on
  // desktop viewports (>768 px), whereas dateClick fires only on mobile.
  async function openModalViaDrag(page) {
    const slot = page.locator('.fc-timegrid-slot[data-time="10:00:00"]').first();
    const box = await slot.boundingBox();
    if (!box) throw new Error('time-grid slot not found');
    const x = box.x + box.width / 2;
    const y = box.y + 10;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 20);
    await page.mouse.up();
    await expect(page.locator(MODAL)).toBeVisible({ timeout: 5000 });
  }

  test('outside click does NOT close the modal and preserves input', async ({ page }) => {
    await openModalViaDrag(page);
    const search = page.locator('#lean-ticket-search, input[placeholder*="ticket" i]').first();
    await search.fill('partial query');

    // Click well outside the modal card (.lean-card sits inside .lean-overlay).
    await page.mouse.click(5, 5);

    await expect(page.locator(MODAL)).toBeVisible();
    await expect(search).toHaveValue('partial query');
  });

  test('Escape closes the modal', async ({ page }) => {
    await openModalViaDrag(page);
    await page.keyboard.press('Escape');
    await expect(page.locator(MODAL)).toBeHidden();
  });

  test('Cancel button closes the modal', async ({ page }) => {
    await openModalViaDrag(page);
    await page.locator('#lean-cancel').click();
    await expect(page.locator(MODAL)).toBeHidden();
  });

  test('drag-from-inside-to-outside does NOT close the modal', async ({ page }) => {
    await openModalViaDrag(page);

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
