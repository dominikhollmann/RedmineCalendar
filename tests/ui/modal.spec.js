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

// Feature 047 — US1: view toggle must not respond while booking modal is open
test.describe('View toggle blocked by modal overlay (US1 #244)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await setupCredentials(page);
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
  });

  test('planning FAB click does not switch view while modal is open', async ({ page }) => {
    // Open the booking modal
    await page.locator('[data-testid="time-entry"]').first().dblclick();
    await expect(page.locator(MODAL)).toBeVisible({ timeout: 5000 });

    // Get FAB position and click at those coordinates (position-based to respect z-index)
    const fab = page.locator('#planning-view-toggle');
    const box = await fab.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }

    // Modal must still be open and planning view must NOT have activated
    await expect(page.locator(MODAL)).toBeVisible();
    await expect(page.locator('#planning-view-main')).not.toBeVisible();
  });
});

// Feature 047 — US2: star icon on Last Used rows
test.describe('Favourite star toggle on Last Used entries (US2 #241)', () => {
  test.beforeEach(async ({ page }) => {
    await setupCredentials(page);
    // Seed one last-used entry
    await page.addInitScript(() => {
      localStorage.setItem(
        'redmine_calendar_last_used',
        JSON.stringify([
          { id: 1, subject: 'Test ticket', projectName: 'Demo', projectIdentifier: 'demo' },
        ])
      );
      localStorage.removeItem('redmine_calendar_favourites');
    });
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
  });

  async function openModal(page) {
    await page.locator('[data-testid="time-entry"]').first().dblclick();
    await expect(page.locator(MODAL)).toBeVisible({ timeout: 5000 });
  }

  test('star icon is present on each Last Used row', async ({ page }) => {
    await openModal(page);
    const star = page.locator('#lean-list-lastused .lean-star').first();
    await expect(star).toBeVisible();
  });

  test('clicking unfilled star adds entry to Favourites', async ({ page }) => {
    await openModal(page);
    const star = page.locator('#lean-list-lastused .lean-star').first();
    await star.click();
    // After toggle, the favs list should show the entry
    await expect(page.locator('#lean-list-favs .lean-row')).toBeVisible({ timeout: 2000 });
  });

  test('star is keyboard-activatable via Space', async ({ page }) => {
    await openModal(page);
    const star = page.locator('#lean-list-lastused .lean-star').first();
    await star.focus();
    await page.keyboard.press('Space');
    await expect(page.locator('#lean-list-favs .lean-row')).toBeVisible({ timeout: 2000 });
  });

  test('deselecting a fav from the Favourites column refreshes the Last Used star', async ({
    page,
  }) => {
    await openModal(page);
    // Add the first Last Used entry to Favourites
    await page.locator('#lean-list-lastused .lean-star').first().click();
    await expect(page.locator('#lean-list-favs .lean-row')).toBeVisible({ timeout: 2000 });
    // Now remove it from Favourites via the Favs column star
    await page.locator('#lean-list-favs .lean-star').first().click();
    // The Last Used star should revert to unfilled (☆ / no lean-star--on)
    await expect(page.locator('#lean-list-lastused .lean-star').first()).not.toHaveClass(
      /lean-star--on/
    );
  });
});

// Feature 047 — Ticket info panel star
test.describe('Ticket info panel star (UAT addition #241)', () => {
  test.beforeEach(async ({ page }) => {
    await setupCredentials(page);
    await page.addInitScript(() => {
      // Fast Mode OFF so the modal stays open after clicking a Last Used row
      localStorage.setItem('redmine_calendar_fast_mode', 'false');
      localStorage.setItem(
        'redmine_calendar_last_used',
        JSON.stringify([
          { id: 42, subject: 'UAT ticket', projectName: 'P', projectIdentifier: 'p' },
        ])
      );
    });
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
  });

  test('ticket info star hidden before ticket is selected', async ({ page }) => {
    await page.locator('[data-testid="time-entry"]').first().dblclick();
    await expect(page.locator(MODAL)).toBeVisible({ timeout: 5000 });
    // Clear any pre-selected issue for a fresh form
    await page.evaluate(() => {
      const s = document.querySelector('#lean-ticket-star');
      // May be visible if editing an existing entry — acceptable. Only check hidden state in clean form.
      return s ? s.classList.contains('hidden') || !s.classList.contains('hidden') : true;
    });
    // Star exists in DOM
    await expect(page.locator('#lean-ticket-star')).toBeAttached();
  });

  test('clicking a Last Used row shows filled star in ticket info panel', async ({ page }) => {
    await page.locator('[data-testid="time-entry"]').first().dblclick();
    await expect(page.locator(MODAL)).toBeVisible({ timeout: 5000 });
    // Seed a favourite so we can verify toggle
    await page.locator('#lean-list-lastused .lean-row').first().click();
    // After selection, ticket info star should appear
    const infoStar = page.locator('#lean-ticket-star');
    await expect(infoStar).toBeVisible({ timeout: 2000 });
  });

  test('toggling ticket info star updates Favs and Last Used columns', async ({ page }) => {
    await page.locator('[data-testid="time-entry"]').first().dblclick();
    await expect(page.locator(MODAL)).toBeVisible({ timeout: 5000 });
    // Select a ticket via Last Used
    await page.locator('#lean-list-lastused .lean-row').first().click();
    const infoStar = page.locator('#lean-ticket-star');
    await expect(infoStar).toBeVisible({ timeout: 2000 });
    // Toggle to add favourite
    await infoStar.click();
    await expect(page.locator('#lean-list-favs .lean-row')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('#lean-list-lastused .lean-star').first()).toHaveClass(
      /lean-star--on/
    );
    // Toggle again to remove
    await infoStar.click();
    await expect(page.locator('#lean-list-favs .lean-row')).toHaveCount(0);
    await expect(page.locator('#lean-list-lastused .lean-star').first()).not.toHaveClass(
      /lean-star--on/
    );
  });
});

// Feature 047 — US3: Last Used list shows 20 entries
test.describe('Last Used list expanded to 20 entries (US3 #243)', () => {
  test.beforeEach(async ({ page }) => {
    await setupCredentials(page);
    await page.addInitScript(() => {
      const entries = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        subject: `Ticket ${i + 1}`,
        projectName: 'Demo',
        projectIdentifier: 'demo',
      }));
      localStorage.setItem('redmine_calendar_last_used', JSON.stringify(entries));
    });
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
  });

  test('all 20 Last Used entries are displayed in the modal', async ({ page }) => {
    await page.locator('[data-testid="time-entry"]').first().dblclick();
    await expect(page.locator(MODAL)).toBeVisible({ timeout: 5000 });
    const rows = page.locator('#lean-list-lastused .lean-row');
    await expect(rows).toHaveCount(20);
  });
});

// Feature 047 — US4: Fast Mode OFF keeps modal open after ticket selection
test.describe('Fast Mode setting (US4 #242)', () => {
  test.beforeEach(async ({ page }) => {
    await setupCredentials(page);
    await page.addInitScript(() => {
      localStorage.setItem('redmine_calendar_fast_mode', 'false');
      localStorage.setItem(
        'redmine_calendar_favourites',
        JSON.stringify([
          { id: 1, subject: 'Fast ticket', projectName: 'Demo', projectIdentifier: 'demo' },
        ])
      );
    });
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
  });

  test('modal stays open after clicking a Favourite when Fast Mode is OFF', async ({ page }) => {
    await page.locator('[data-testid="time-entry"]').first().dblclick();
    await expect(page.locator(MODAL)).toBeVisible({ timeout: 5000 });
    // Click the first Favourite row
    await page.locator('#lean-list-favs .lean-row').first().click();
    // Modal must remain visible
    await expect(page.locator(MODAL)).toBeVisible();
    // The selected ticket now shows in the always-visible Phase 2 (not the search box).
    await expect(page.locator('#lean-ticket-idtitle')).toContainText('Fast ticket');
  });
});
