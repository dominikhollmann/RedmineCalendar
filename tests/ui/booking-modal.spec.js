import { test, expect } from './coverage-fixture.js';
import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';

// Feature 055 — Booking Modal Redesign: two always-visible phases on one
// screen, one-click ticket selection, always-editable Phase 2, and a
// user-resizable modal whose size persists. Selectors reuse the stable ids
// preserved from the previous modal; new structure is asserted via the
// phase/column classes.

const MODAL = '#lean-time-modal';

async function openModal(page) {
  await page.locator('[data-testid="time-entry"]').first().dblclick();
  await expect(page.locator(MODAL)).toBeVisible({ timeout: 5000 });
}

test.describe('Booking modal redesign — two phases (US1/US2)', () => {
  test.beforeEach(async ({ page }) => {
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.addInitScript(() => {
      // Fast Mode OFF so a click selects without auto-closing (US2 editing).
      localStorage.setItem('redmine_calendar_fast_mode', 'false');
      localStorage.setItem(
        'redmine_calendar_last_used',
        JSON.stringify([
          { id: 42, subject: 'Redesign ticket', projectName: 'Demo', projectIdentifier: 'demo' },
        ])
      );
      localStorage.setItem(
        'redmine_calendar_favourites',
        JSON.stringify([
          { id: 7, subject: 'Fav ticket', projectName: 'Demo', projectIdentifier: 'demo' },
        ])
      );
    });
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
  });

  test('renders Phase 1 (three columns) above Phase 2 on one screen', async ({ page }) => {
    await openModal(page);
    // Two labelled phases are both present at once — no wizard.
    await expect(page.locator(`${MODAL} .lean-phase1`)).toBeVisible();
    await expect(page.locator(`${MODAL} .lean-phase2`)).toBeVisible();
    // Phase 1 has exactly three columns: Suche / Zuletzt verwendet / Favoriten.
    await expect(page.locator(`${MODAL} .lean-phase1 .lean-col`)).toHaveCount(3);
  });

  test('Suche shows the "type to search" empty state until the user types', async ({ page }) => {
    await openModal(page);
    // Before typing: empty-state message visible, no result rows.
    await expect(page.locator('#lean-search-empty')).toBeVisible();
    await expect(page.locator('#lean-search-results .lean-row')).toHaveCount(0);
  });

  test('clicking a ticket row updates Phase 2 in place (no confirm step)', async ({ page }) => {
    await openModal(page);
    await page.locator('#lean-list-favs .lean-row').first().click();
    // Modal stays open (Fast Mode off) and Phase 2 shows the selected ticket.
    await expect(page.locator(MODAL)).toBeVisible();
    await expect(page.locator('#lean-ticket-idtitle')).toContainText('Fav ticket');
    // The selecting control is a real <button>.
    await expect(page.locator('#lean-list-favs button.lean-row').first()).toBeVisible();
  });

  test('ticket rows are real buttons and truncate on a single line', async ({ page }) => {
    await openModal(page);
    const row = page.locator('#lean-list-lastused button.lean-row').first();
    await expect(row).toBeVisible();
    // Full "#id subject — project" is exposed via the app's unified tooltip style
    // (aria-describedby + a linked .anomaly-tooltip element, portaled to <body> on
    // hover/focus), not the native title attr.
    await expect(row).not.toHaveAttribute('title');
    const tooltipId = await row.getAttribute('aria-describedby');
    await row.hover();
    await expect(page.locator(`#${tooltipId}`)).toHaveText(/#42 Redesign ticket/);
    // Subject line never wraps.
    await expect(page.locator('#lean-list-lastused .lean-row-subject').first()).toHaveCSS(
      'white-space',
      'nowrap'
    );
  });

  test('editing Start/Ende recomputes the duration', async ({ page }) => {
    await openModal(page);
    await page.locator('#lean-list-favs .lean-row').first().click();
    await page.locator('#lean-info-start').fill('09:00');
    await page.locator('#lean-info-end').fill('10:30');
    await page.locator('#lean-info-end').dispatchEvent('change');
    await expect(page.locator('#lean-info-dur')).toHaveText(/1h\s*30m/);
  });
});

test.describe('Booking modal redesign — resize + persistence (US3)', () => {
  test.beforeEach(async ({ page }) => {
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test('header and footer stay fixed; the middle region is the scroll container', async ({
    page,
  }) => {
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
    await openModal(page);
    await expect(page.locator(`${MODAL} .lean-header`)).toBeVisible();
    await expect(page.locator(`${MODAL} .lean-actions`)).toBeVisible();
    // The single scroll region wraps both phases.
    await expect(page.locator(`${MODAL} .lean-scroll .lean-phase1`)).toBeVisible();
    await expect(page.locator(`${MODAL} .lean-scroll .lean-phase2`)).toBeVisible();
  });

  test('reopens at the persisted size (restore path)', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'redmine_calendar_booking_modal_size',
        JSON.stringify({ w: 900, h: 600 })
      );
    });
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
    await openModal(page);
    const box = await page.locator(`${MODAL} .lean-card`).boundingBox();
    if (!box) throw new Error('lean-card not visible');
    // Restored to the persisted size (within a small rendering tolerance).
    expect(Math.abs(box.width - 900)).toBeLessThan(6);
    expect(Math.abs(box.height - 600)).toBeLessThan(6);
  });

  test('the card exposes a native resize affordance', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
    await openModal(page);
    await expect(page.locator(`${MODAL} .lean-card`)).toHaveCSS('resize', 'both');
  });

  test('dragging the resize handle tracks the mouse 1:1 (left/top edge does not drift)', async ({
    page,
  }) => {
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
    await openModal(page);
    const card = page.locator(`${MODAL} .lean-card`);
    const before = await card.boundingBox();
    if (!before) throw new Error('lean-card not visible');
    const handleX = before.x + before.width - 4;
    const handleY = before.y + before.height - 4;
    const dragDistance = 120;
    await page.mouse.move(handleX, handleY);
    await page.mouse.down();
    // Intermediate moves matter here, not just the final position: a flex-centered
    // resize:both element grows correctly in total width/height, but its left/top
    // edge drifts inward on every tick (auto-alignment re-centering), which makes
    // the visible bottom-right corner trail the mouse at roughly half speed — the
    // exact bug reported in UAT. A fixed-anchor element's left/top never moves.
    await page.mouse.move(handleX + dragDistance, handleY + dragDistance, { steps: 10 });
    const after = await card.boundingBox();
    await page.mouse.up();
    if (!after) throw new Error('lean-card not visible after resize');
    expect(Math.abs(after.x - before.x)).toBeLessThan(2);
    expect(Math.abs(after.y - before.y)).toBeLessThan(2);
    // The visible bottom-right corner (x + width) must track the mouse, not lag
    // behind it at half speed.
    const cornerGrowthX = after.x + after.width - (before.x + before.width);
    const cornerGrowthY = after.y + after.height - (before.y + before.height);
    expect(cornerGrowthX).toBeGreaterThan(dragDistance * 0.8);
    expect(cornerGrowthY).toBeGreaterThan(dragDistance * 0.8);
  });

  test('dragging the header repositions the card without resizing it, and the close button still works', async ({
    page,
  }) => {
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
    await openModal(page);
    const card = page.locator(`${MODAL} .lean-card`);
    const before = await card.boundingBox();
    if (!before) throw new Error('lean-card not visible');
    const header = page.locator(`${MODAL} .lean-header`);
    const hbox = await header.boundingBox();
    if (!hbox) throw new Error('lean-header not visible');
    await page.mouse.move(hbox.x + hbox.width / 2, hbox.y + hbox.height / 2);
    await page.mouse.down();
    await page.mouse.move(hbox.x + hbox.width / 2 + 150, hbox.y + hbox.height / 2 + 80, {
      steps: 10,
    });
    await page.mouse.up();
    const after = await card.boundingBox();
    if (!after) throw new Error('lean-card not visible after drag');
    expect(Math.abs(after.x - before.x - 150)).toBeLessThan(4);
    expect(Math.abs(after.y - before.y - 80)).toBeLessThan(4);
    // Dragging must not shrink the card (a flex-shrink side effect of the
    // margin-based position when margin + width overflows the flex container).
    expect(Math.abs(after.width - before.width)).toBeLessThan(2);
    expect(Math.abs(after.height - before.height)).toBeLessThan(2);
    // The close button (inside the header) must remain clickable after a drag.
    await page.locator('#lean-close').click();
    await expect(page.locator(MODAL)).toBeHidden();
  });
});
