import { test, expect } from './coverage-fixture.js';
import {
  setupConfig,
  mockRedmineApi,
  setupCredentials,
  freezeClock,
  mockTodayEntries,
} from './helpers.js';
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

// WCAG relative-luminance/contrast-ratio math, run against real browser-
// computed colors (getComputedStyle resolves color-mix() to concrete values).
// axe-core's color-contrast rule can't reliably resolve a color-mix()-tinted,
// semi-transparent ancestor background (it silently reports zero violations
// AND zero incomplete either way — verified during feature 055 UAT), so this
// fills a real gap axe leaves open rather than duplicating it.
function parseColor(str) {
  const colorFn = str.match(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/);
  if (colorFn) {
    const [, r, g, b, a] = colorFn;
    return { r: Number(r) * 255, g: Number(g) * 255, b: Number(b) * 255, a: a ? Number(a) : 1 };
  }
  const rgbFn = str.match(/^rgba?\(([\d.]+), ?([\d.]+), ?([\d.]+)(?:, ?([\d.]+))?\)$/);
  if (rgbFn) {
    const [, r, g, b, a] = rgbFn;
    return { r: Number(r), g: Number(g), b: Number(b), a: a ? Number(a) : 1 };
  }
  // CSS custom properties come back as the literal authored token (e.g. a hex
  // literal), not resolved through getComputedStyle's color normalization.
  const hex = str.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (hex) {
    const [, r, g, b] = hex;
    return { r: parseInt(r, 16), g: parseInt(g, 16), b: parseInt(b, 16), a: 1 };
  }
  throw new Error(`Unparseable color: ${str}`);
}

function compositeOver(fg, bg) {
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
  };
}

function relativeLuminance({ r, g, b }) {
  const chan = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

/** WCAG contrast ratio between two (already opaque) colors, each `{r,g,b}`. */
function contrastRatio(c1, c2) {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
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
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
    await expectAxeClean(page);
  });
}

// ── 3+4: Calendar mobile day-view ────────────────────────────────────
// IMPORTANT: scope `test.use({ viewport })` to a describe block. At the
// file-/loop scope it would leak the mobile viewport into every following
// test in the file, breaking their time-entry waits (mobile day-view shows
// only one day; mocked events on other days would be invisible).
test.describe('a11y: calendar mobile day-view', () => {
  test.use({ viewport: { width: 375, height: 667 } });
  for (const theme of themes) {
    test(theme, async ({ page }) => {
      await setTheme(page, theme);
      // Mobile day-view renders only TODAY. Freeze the clock to a fixed
      // workday and land the mock entries on that same date, so the axe scan
      // always covers a populated timegrid — never an empty FullCalendar
      // scroller (which trips the `scrollable-region-focusable` rule).
      await freezeClock(page);
      await setupCredentials(page);
      await setupConfig(page);
      await mockRedmineApi(page);
      await mockTodayEntries(page);
      await page.goto('/index.html');
      await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
      await expectAxeClean(page);
    });
  }
});

// ── 5+6: Time-entry modal (open) ─────────────────────────────────────
async function openTimeEntryModal(page) {
  // Double-click an existing event — deterministic across viewport sizes
  // (slot interactions vary by FC's dateClick-vs-select routing).
  await page.locator('[data-testid="time-entry"]').first().dblclick();
  await expect(page.locator('#lean-time-modal')).toBeVisible({ timeout: 5000 });
}

for (const theme of themes) {
  test(`a11y: time-entry modal — ${theme}`, async ({ page }) => {
    await setTheme(page, theme);
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
    await openTimeEntryModal(page);
    await expectAxeClean(page, { include: '#lean-time-modal' });
  });
}

// Feature 055 UAT follow-up: the booking modal's ticket-ID text
// (.lean-row-id, .lean-ticket-idtitle a) used raw --color-primary instead of
// the D3-safeguarded --color-link-on-dark, so a dark admin CI accent (e.g.
// #6c2bd9) dropped it to ~2.2:1 against the selected-row tint — well below
// the WCAG AA 4.5:1 floor. Mirrors the settings D3 test below; extends the
// same coverage to the modal, which had no purple-CI-in-dark-mode case before.
test('a11y: time-entry modal — dark mode with purple CI accent (D3 safeguard)', async ({
  page,
}) => {
  await setTheme(page, 'dark');
  await setupCredentials(page);
  await page.route('**/config.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        redmineUrl: 'http://localhost:3000/mock-proxy',
        redmineServerUrl: 'https://redmine.test.example.com',
        brandPrimary: '#6c2bd9',
      }),
    })
  );
  await mockRedmineApi(page);
  await page.addInitScript(() => {
    localStorage.setItem(
      'redmine_calendar_last_used',
      JSON.stringify([
        { id: 2141, subject: 'lorem2', projectName: 'Test', projectIdentifier: '180' },
      ])
    );
  });
  await page.goto('/index.html');
  await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
  await openTimeEntryModal(page);
  await page.locator('#lean-list-lastused .lean-row').first().click();
  await expectAxeClean(page, { include: '#lean-time-modal' });
});

// Same scenario as above, computed via real WCAG math instead of axe — axe
// can't see this particular failure (see the comment above parseColor()), so
// this is the test that actually catches a regression of the D3 fix on
// .lean-row-id / .lean-ticket-idtitle a.
test('a11y: time-entry modal ticket-ID text clears 4.5:1 in dark mode with purple CI accent', async ({
  page,
}) => {
  await setTheme(page, 'dark');
  await setupCredentials(page);
  await page.route('**/config.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        redmineUrl: 'http://localhost:3000/mock-proxy',
        redmineServerUrl: 'https://redmine.test.example.com',
        brandPrimary: '#6c2bd9',
      }),
    })
  );
  await mockRedmineApi(page);
  await page.addInitScript(() => {
    localStorage.setItem(
      'redmine_calendar_last_used',
      JSON.stringify([
        { id: 2141, subject: 'lorem2', projectName: 'Test', projectIdentifier: '180' },
      ])
    );
  });
  await page.goto('/index.html');
  await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
  await openTimeEntryModal(page);
  await page.locator('#lean-list-lastused .lean-row').first().click();

  const data = await page.evaluate(() => {
    const wrap = document.querySelector('#lean-list-lastused .lean-row-wrap');
    const idSpan = wrap.querySelector('.lean-row-id');
    const link = document.querySelector('#lean-ticket-idtitle a');
    return {
      wrapBg: getComputedStyle(wrap).backgroundColor,
      idColor: getComputedStyle(idSpan).color,
      surfaceBg: getComputedStyle(document.documentElement).getPropertyValue('--color-surface'),
      linkColor: link ? getComputedStyle(link).color : null,
    };
  });

  const surface = parseColor(data.surfaceBg.trim());
  const rowBg = compositeOver(parseColor(data.wrapBg), surface);
  expect(contrastRatio(parseColor(data.idColor), rowBg)).toBeGreaterThanOrEqual(4.5);
  if (data.linkColor) {
    expect(contrastRatio(parseColor(data.linkColor), surface)).toBeGreaterThanOrEqual(4.5);
  }
});

// ── 7+8: Settings ────────────────────────────────────────────────────
for (const theme of themes) {
  test(`a11y: settings — ${theme}`, async ({ page }) => {
    await setTheme(page, theme);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/settings.html');
    await page.waitForSelector('#section-auth');
    await expectAxeClean(page);
  });
}

// ── Feature 054 / T040: dark-mode contrast with a dark CI accent ───────
// A dark admin --ci-primary (#6c2bd9) on the dark canvas would drop link +
// focus-ring contrast below WCAG 3:1 without the D3 color-mix safeguard.
// Assert axe finds no colour-contrast violations on the redesigned settings
// surface in dark mode with the purple CI fixture configured.
test('a11y: settings — dark mode with purple CI accent (D3 safeguard)', async ({ page }) => {
  await setTheme(page, 'dark');
  await page.route('**/config.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        redmineUrl: 'http://localhost:3000/mock-proxy',
        redmineServerUrl: 'https://redmine.test.example.com',
        brandPrimary: '#6c2bd9',
      }),
    })
  );
  await mockRedmineApi(page);
  await page.goto('/settings.html');
  await page.waitForSelector('#section-auth');
  await expectAxeClean(page);
});

// ── 9+10: Chatbot panel (open) ───────────────────────────────────────
for (const theme of themes) {
  test(`a11y: chatbot panel — ${theme}`, async ({ page }) => {
    await setTheme(page, theme);
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
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
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
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
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
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
