import { test, expect } from './coverage-fixture.js';
import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';

// Feature 025: when the break ticket is the selected ticket, the modal must:
//   • leave the End-time input editable (we want the real Outlook event end);
//   • show the duration readout as "0m (break)" instead of computing minutes;
//   • save the entry with hours=0 regardless of (end − start).
test.describe('Modal duration readout for break ticket (feature 025)', () => {
  async function setupWithBreakTicket(page, breakTicketId) {
    await setupCredentials(page);
    const cfg = {
      redmineUrl: 'http://localhost:3000/mock-proxy',
      redmineServerUrl: 'https://redmine.test.example.com',
      aiProvider: 'anthropic',
      aiModel: 'claude-haiku-4-5-20251001',
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

  test('opening an entry on the break ticket shows "0m (break)" duration and keeps End editable', async ({
    page,
  }) => {
    // Time-entry fixture #101 is on issue #42.
    await setupWithBreakTicket(page, 42);
    await page.locator('.fc-event').first().dblclick();
    await page.waitForFunction(() => !!document.getElementById('lean-time-modal'));

    const state = await page.evaluate(() => {
      const endInput = document.getElementById('lean-info-end');
      const durEl = document.getElementById('lean-info-dur');
      return {
        endDisabled: endInput?.disabled,
        endHasLockClass: endInput?.classList.contains('input--locked'),
        durText: durEl?.textContent ?? '',
        durHasBreakClass: durEl?.classList.contains('info-dur--break'),
      };
    });
    expect(state.endDisabled).toBe(false);
    expect(state.endHasLockClass).toBe(false);
    expect(state.durText.toLowerCase()).toContain('break');
    expect(state.durHasBreakClass).toBe(true);
  });

  test('opening an entry NOT on the break ticket shows the computed duration and editable End', async ({
    page,
  }) => {
    await setupWithBreakTicket(page, 998); // fixture #101 is on #42, not 998
    await page.locator('.fc-event').first().dblclick();
    await page.waitForFunction(() => !!document.getElementById('lean-time-modal'));

    const state = await page.evaluate(() => {
      const endInput = document.getElementById('lean-info-end');
      const durEl = document.getElementById('lean-info-dur');
      return {
        endDisabled: endInput?.disabled,
        durHasBreakClass: durEl?.classList.contains('info-dur--break'),
      };
    });
    expect(state.endDisabled).toBe(false);
    expect(state.durHasBreakClass).toBe(false);
  });

  test('lock does not engage when central config has no breakTicket', async ({ page }) => {
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });

    await page.locator('.fc-event').first().dblclick();
    await page.waitForFunction(() => !!document.getElementById('lean-time-modal'));

    const state = await page.evaluate(() => {
      const endInput = document.getElementById('lean-info-end');
      const durEl = document.getElementById('lean-info-dur');
      return {
        endDisabled: endInput?.disabled,
        durHasBreakClass: durEl?.classList.contains('info-dur--break'),
      };
    });
    expect(state.endDisabled).toBe(false);
    expect(state.durHasBreakClass).toBe(false);
  });
});
