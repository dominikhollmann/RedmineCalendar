import { test, expect } from '@playwright/test';
import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';

// Feature 025 (FR-012): when the break ticket is the selected ticket in the
// time-entry modal, End-time MUST equal Start-time (giving 0h) and the End
// input MUST be disabled with the .input--locked styling. This spec covers
// the modal-open path: opening the modal in edit mode for an entry already
// on the break ticket engages the lock automatically; opening for a normal
// work ticket leaves the End input editable. The "switch ticket while modal
// is open" path is exercised by the unit tests (tests/unit/time-entry-modal.test.js)
// since the modal's selectAndSave auto-submits on click, which would close
// the modal before Playwright could observe the transient lock state.
test.describe('Modal hours-lock for break ticket (FR-012)', () => {
  async function setupWithBreakTicket(page, breakTicketId) {
    await setupCredentials(page);
    const cfg = {
      redmineUrl: 'http://localhost:3000/mock-proxy',
      redmineServerUrl: 'https://redmine.test.example.com',
      aiProvider: 'anthropic',
      aiModel: 'claude-haiku-4-5-20251001',
      aiApiKey: 'sk-ant-test-key',
      aiProxyUrl: 'http://localhost:3000/mock-ai-proxy',
      breakTicket: breakTicketId,
      holidayTicket: 999,
    };
    await page.route('**/config.json', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cfg) })
    );
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  }

  test('opening an entry on the break ticket engages the End-input lock', async ({ page }) => {
    // Time-entry fixture #101 is on issue #42 ("Implement login page").
    // Configure breakTicket = 42 so opening that entry should engage the lock.
    await setupWithBreakTicket(page, 42);
    await page.locator('.fc-event').first().dblclick();
    await page.waitForFunction(() => !!document.getElementById('lean-time-modal'));

    const state = await page.evaluate(() => {
      const endInput   = document.getElementById('lean-info-end');
      const startInput = document.getElementById('lean-info-start');
      return {
        endDisabled: endInput?.disabled,
        endHasLockClass: endInput?.classList.contains('input--locked'),
        endValue: endInput?.value,
        startValue: startInput?.value,
        endAriaLabel: endInput?.getAttribute('aria-label'),
      };
    });
    expect(state.endDisabled).toBe(true);
    expect(state.endHasLockClass).toBe(true);
    expect(state.endValue).toBe(state.startValue);
    expect(state.endAriaLabel).toBeTruthy();
  });

  test('opening an entry NOT on the break ticket leaves End editable', async ({ page }) => {
    // Configure breakTicket = 998 (a different id). The fixture entry #101
    // is on issue #42, so the lock must NOT engage.
    await setupWithBreakTicket(page, 998);
    await page.locator('.fc-event').first().dblclick();
    await page.waitForFunction(() => !!document.getElementById('lean-time-modal'));

    const state = await page.evaluate(() => {
      const endInput = document.getElementById('lean-info-end');
      return {
        endDisabled: endInput?.disabled,
        endHasLockClass: endInput?.classList.contains('input--locked'),
      };
    });
    expect(state.endDisabled).toBe(false);
    expect(state.endHasLockClass).toBe(false);
  });

  test('lock does not engage when central config has no breakTicket', async ({ page }) => {
    // Use the default fixture config which has no breakTicket.
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });

    await page.locator('.fc-event').first().dblclick();
    await page.waitForFunction(() => !!document.getElementById('lean-time-modal'));

    const state = await page.evaluate(() => {
      const endInput = document.getElementById('lean-info-end');
      return {
        endDisabled: endInput?.disabled,
        endHasLockClass: endInput?.classList.contains('input--locked'),
      };
    });
    expect(state.endDisabled).toBe(false);
    expect(state.endHasLockClass).toBe(false);
  });
});
