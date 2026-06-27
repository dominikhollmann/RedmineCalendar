import { test, expect } from './coverage-fixture.js';
import { mockCdn, mockRedmineApi, setupConfig, freezeClock, mockTodayEntries } from './helpers.js';
import AxeBuilder from '@axe-core/playwright';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

// ── Shared setup ──────────────────────────────────────────────────
async function loginAndOpen(page) {
  await mockCdn(page);
  await setupConfig(page);
  await mockRedmineApi(page);
  await page.addInitScript(() => {
    if (!localStorage.getItem('redmine_calendar_active_view')) {
      localStorage.setItem('redmine_calendar_active_view', 'calendar');
    }
  });
  await page.goto('/settings.html');
  await page.fill('#apiKey', 'test-api-key-12345');
  await page.click('#save-btn');
  await page.waitForURL((url) => !url.pathname.includes('settings'), { timeout: 10000 });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
}

// ── US1: full-text event hover (calendar) ─────────────────────────
test.describe('Feature 053 — full-text event tooltip (US1)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndOpen(page);
  });

  test('hover a calendar event shows the full event text (issue, project, time, comment)', async ({
    page,
  }) => {
    // Entry 101: #42 Implement login page · web-app — Web App · 09:00–11:00 · "Feature development"
    await page.locator('.fc-entry-101').first().hover();
    const tooltip = page.locator('#event-tooltip-101');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toHaveClass(/anomaly-tooltip--multiline/);
    const lines = tooltip.locator('.anomaly-tooltip__line');
    await expect(lines).toHaveCount(4);
    await expect(lines.nth(0)).toHaveText('#42 Implement login page');
    await expect(lines.nth(1)).toContainText('Web App');
    await expect(lines.nth(2)).toContainText('09:00');
    await expect(lines.nth(3)).toHaveText('Feature development');
  });

  test('an event with no comment omits the comment line (no empty row)', async ({ page }) => {
    // Entry 103 (Sprint planning) has an empty comment → 3 lines, none empty.
    await page.locator('.fc-entry-103').first().hover();
    const tooltip = page.locator('#event-tooltip-103');
    await expect(tooltip).toBeVisible();
    const lines = tooltip.locator('.anomaly-tooltip__line');
    await expect(lines).toHaveCount(3);
    const texts = await lines.allTextContents();
    expect(texts.every((t) => t.trim().length > 0)).toBe(true);
  });

  test('tooltip appears on keyboard focus and hides on blur', async ({ page }) => {
    // The issue link inside the event is focusable; focusin bubbles to the event.
    const link = page.locator('.fc-entry-101 a').first();
    await link.focus();
    await expect(page.locator('#event-tooltip-101')).toBeVisible();
    await link.blur();
    await expect(page.locator('#event-tooltip-101')).toHaveCount(0);
  });

  test('tooltip hides when the pointer leaves the event', async ({ page }) => {
    await page.locator('.fc-entry-101').first().hover();
    await expect(page.locator('#event-tooltip-101')).toBeVisible();
    await page.mouse.move(5, 5); // move away
    await expect(page.locator('#event-tooltip-101')).toHaveCount(0);
  });

  test('calendar event rows no longer carry a native title attribute', async ({ page }) => {
    const issueRow = page.locator('.fc-entry-101 .ev-issue').first();
    await expect(issueRow).not.toHaveAttribute('title', /.*/);
    const projRow = page.locator('.fc-entry-101 .ev-project').first();
    await expect(projRow).not.toHaveAttribute('title', /.*/);
  });
});

// ── US1: full-text event hover in the planning bookings column ─────
test.describe('Feature 053 — full-text tooltip in planning view (US1)', () => {
  test('hovering a bookings-column event shows the full-text tooltip', async ({ page }) => {
    // Planning view shows a single day (today), so pin the clock and land the
    // mock bookings on that day. The bookings column reuses the calendar-overlays
    // event mount, so its entries get the same multi-line tooltip — and here we
    // also confirm it is not clipped by the scrollable column.
    await freezeClock(page);
    await mockCdn(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await mockTodayEntries(page);
    await page.addInitScript(() => {
      localStorage.setItem('redmine_calendar_active_view', 'calendar');
    });
    await page.goto('/settings.html');
    await page.fill('#apiKey', 'test-api-key-12345');
    await page.click('#save-btn');
    await page.waitForURL((url) => !url.pathname.includes('settings'), { timeout: 10000 });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });

    const fab = page.locator('#planning-view-toggle');
    await fab.waitFor({ state: 'visible', timeout: 5000 });
    await fab.click();
    await expect(page.locator('#planning-view-main')).toBeVisible({ timeout: 5000 });
    const bookingEvent = page.locator('#planning-view-main [data-testid="time-entry"]').first();
    await bookingEvent.waitFor({ state: 'visible', timeout: 10000 });
    await bookingEvent.hover();
    const tooltip = page.locator('.anomaly-tooltip--multiline:visible').first();
    await expect(tooltip).toBeVisible();
    await expect(tooltip.locator('.anomaly-tooltip__line').first()).toContainText('#');
  });
});

// ── US2: app-wide label tooltips (T018) ───────────────────────────
test.describe('Feature 053 — unified label tooltips (US2)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndOpen(page);
  });

  const labelTargets = [
    { selector: '.settings-link', name: 'settings link' },
    { selector: '.docs-help-btn', name: 'docs help button' },
    { selector: '.chatbot-open-btn', name: 'chatbot button' },
    { selector: '#toolbar-refresh', name: 'refresh button' },
  ];

  for (const { selector, name } of labelTargets) {
    test(`${name} has no native title and shows the custom tooltip on hover`, async ({ page }) => {
      const el = page.locator(selector).first();
      await el.waitFor({ state: 'visible', timeout: 5000 });
      await expect(el).not.toHaveAttribute('title', /.*/);
      await el.hover();
      const tip = page.locator('.anomaly-tooltip--fixed:visible').first();
      await expect(tip).toBeVisible();
    });
  }

  test('feedback button uses the custom tooltip (no native title)', async ({ page }) => {
    const btn = page.locator('.feedback-toolbar-btn').first();
    if ((await btn.count()) === 0) test.skip(true, 'feedback not configured');
    await expect(btn).not.toHaveAttribute('title', /.*/);
  });
});

// ── US3: keyboard + screen-reader accessibility (T020) ────────────
test.describe('Feature 053 — accessibility (US3)', () => {
  test('a focused label tooltip exposes its text via aria-describedby', async ({ page }) => {
    await loginAndOpen(page);
    const btn = page.locator('.docs-help-btn').first();
    await btn.focus();
    const describedBy = await btn.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const tip = page.locator(`#${describedBy}`);
    await expect(tip).toBeVisible();
    expect((await tip.textContent())?.trim().length).toBeGreaterThan(0);
  });

  test('a focused event tooltip exposes its full text via aria-describedby', async ({ page }) => {
    await loginAndOpen(page);
    const link = page.locator('.fc-entry-101 a').first();
    await link.focus();
    await expect(page.locator('#event-tooltip-101')).toBeVisible();
    // focusin bubbles to the event element which carries the description link.
    const eventEl = page.locator('.fc-entry-101').first();
    await expect(eventEl).toHaveAttribute('aria-describedby', 'event-tooltip-101');
  });

  // A shown tooltip adds DOM to <body>; assert that extra DOM introduces no new
  // WCAG 2.2 A/AA violations in both themes (the full 7×2 surface matrix lives in
  // a11y.spec.js; here we specifically scan with a tooltip visible).
  for (const theme of /** @type {const} */ (['light', 'dark'])) {
    test(`axe clean with a visible event tooltip — ${theme}`, async ({ page }) => {
      await page.addInitScript((tval) => {
        try {
          window.localStorage.setItem('redmine_calendar_theme', tval);
        } catch {
          /* localStorage unavailable */
        }
      }, theme);
      await loginAndOpen(page);
      await page.locator('.fc-entry-101').first().hover();
      await expect(page.locator('#event-tooltip-101')).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
