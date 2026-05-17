import { test, expect } from './coverage-fixture.js';
import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';
import AxeBuilder from '@axe-core/playwright';

// Feature 033 / US4 — permanent WCAG 2.2 AA CI regression gate.
// Surface matrix (7 surfaces × 2 themes = 14 cells) per
// specs/033-small-ux-a11y-fixes/contracts/a11y-contract.md § Contract 2.
// Every cell asserts axe reports zero WCAG 2.2 Level A or AA violations.

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

const themes = /** @type {const} */ (['light', 'dark']);

async function setTheme(page, theme) {
  // Match the inline first-paint script in index.html / settings.html
  await page.addInitScript((t) => {
    try {
      window.localStorage.setItem('redmine_calendar_theme', t);
    } catch {
      /* localStorage unavailable */
    }
  }, theme);
}

async function expectAxeClean(page, options = {}) {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (options.include) builder = builder.include(options.include);
  if (options.exclude) builder = builder.exclude(options.exclude);
  const results = await builder.analyze();
  // Render a readable failure message containing rule ID + target selector
  if (results.violations.length > 0) {
    const rendered = results.violations
      .map(
        (v) =>
          `  - ${v.id} (${v.impact || 'n/a'}): ${v.help}\n    nodes: ${v.nodes.length}\n    first: ${v.nodes[0]?.target?.join(' ')}\n    help: ${v.helpUrl}`
      )
      .join('\n');
    throw new Error(`axe violations (${results.violations.length}):\n${rendered}`);
  }
  expect(results.violations).toEqual([]);
}

// ── 1+2: Calendar desktop ────────────────────────────────────────────
for (const theme of themes) {
  test(`a11y: calendar desktop — ${theme}`, async ({ page }) => {
    await setTheme(page, theme);
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
    await expectAxeClean(page);
  });
}

// ── 3+4: Calendar mobile day-view ────────────────────────────────────
// IMPORTANT: scope `test.use({ viewport })` to a describe block. At the
// file-/loop scope it would leak the mobile viewport into every following
// test in the file, breaking their .fc-event waits (mobile day-view shows
// only one day; mocked events on other days would be invisible).
test.describe('a11y: calendar mobile day-view', () => {
  test.use({ viewport: { width: 375, height: 667 } });
  for (const theme of themes) {
    test(theme, async ({ page }) => {
      await setTheme(page, theme);
      await setupCredentials(page);
      await setupConfig(page);
      await mockRedmineApi(page);
      await page.goto('/index.html');
      await page.waitForSelector('.fc-event', { timeout: 10000 });
      await expectAxeClean(page);
    });
  }
});

// ── 5+6: Time-entry modal (open) ─────────────────────────────────────
async function openTimeEntryModal(page) {
  // Double-click an existing event — deterministic across viewport sizes
  // (slot interactions vary by FC's dateClick-vs-select routing).
  await page.locator('.fc-event').first().dblclick();
  await expect(page.locator('#lean-time-modal')).toBeVisible({ timeout: 5000 });
}

for (const theme of themes) {
  test(`a11y: time-entry modal — ${theme}`, async ({ page }) => {
    await setTheme(page, theme);
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
    await openTimeEntryModal(page);
    await expectAxeClean(page, { include: '#lean-time-modal' });
  });
}

// ── 7+8: Settings ────────────────────────────────────────────────────
for (const theme of themes) {
  test(`a11y: settings — ${theme}`, async ({ page }) => {
    await setTheme(page, theme);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/settings.html');
    await page.waitForSelector('#settings-form');
    await expectAxeClean(page);
  });
}

// ── 9+10: Chatbot panel (open) ───────────────────────────────────────
for (const theme of themes) {
  test(`a11y: chatbot panel — ${theme}`, async ({ page }) => {
    await setTheme(page, theme);
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
    const opener = page.locator('.chatbot-open-btn').first();
    if ((await opener.count()) > 0) {
      await opener.click();
      await page.waitForTimeout(200);
    }
    await expectAxeClean(page);
  });
}

// ── 11+12: In-app docs panel (open) ──────────────────────────────────
for (const theme of themes) {
  test(`a11y: docs panel — ${theme}`, async ({ page }) => {
    await setTheme(page, theme);
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
    const opener = page.locator('.docs-help-btn').first();
    if ((await opener.count()) > 0) {
      await opener.click();
      await page.waitForTimeout(200);
    }
    await expectAxeClean(page);
  });
}

// ── 13+14: Voice-input UI ────────────────────────────────────────────
for (const theme of themes) {
  test(`a11y: voice-input UI — ${theme}`, async ({ page }) => {
    await setTheme(page, theme);
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
    const chatbot = page.locator('.chatbot-open-btn').first();
    if ((await chatbot.count()) > 0) {
      await chatbot.click();
      await page.waitForTimeout(200);
    }
    // The mic button (#chatbot-audio-btn) appears inside the chatbot panel
    // when voice-input is enabled. The axe scan covers the whole open panel.
    await expectAxeClean(page);
  });
}
