import { test, expect } from './coverage-fixture.js';
import { setupConfig, setupCredentials } from './helpers.js';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Feature 034 / US1 — T013: Playwright UI test for the Open-source licenses
// page. Asserts the discreet Settings-footer link reaches /licenses.html, the
// rendered table mirrors attributions.json, and axe-core reports zero WCAG
// 2.2 AA failures on both themes.

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');

const attributions = JSON.parse(readFileSync(resolve(repoRoot, 'attributions.json'), 'utf8'));

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

async function setTheme(page, theme) {
  await page.addInitScript((t) => {
    try {
      window.localStorage.setItem('redmine_calendar_theme', t);
    } catch {
      /* localStorage unavailable */
    }
  }, theme);
}

async function expectAxeClean(page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  if (results.violations.length > 0) {
    const rendered = results.violations
      .map(
        (v) =>
          `  - ${v.id} (${v.impact || 'n/a'}): ${v.help}\n    nodes: ${v.nodes.length}\n    first: ${v.nodes[0]?.target?.join(' ')}`
      )
      .join('\n');
    throw new Error(`axe violations (${results.violations.length}):\n${rendered}`);
  }
  expect(results.violations).toEqual([]);
}

test('settings footer link is reachable in en', async ({ page }) => {
  await setupCredentials(page);
  await setupConfig(page);
  await page.goto('/settings.html');
  const link = page.locator('.settings-footer-line a[href="licenses.html"]');
  await expect(link).toBeVisible();
  await expect(link).toHaveText(/Open-source licenses/i);
});

test('settings footer link is reachable in de', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'languages', { value: ['de'], configurable: true });
    Object.defineProperty(navigator, 'language', { value: 'de', configurable: true });
  });
  await setupCredentials(page);
  await setupConfig(page);
  await page.goto('/settings.html');
  const link = page.locator('.settings-footer-line a[href="licenses.html"]');
  await expect(link).toBeVisible();
  await expect(link).toHaveText(/Open-Source-Lizenzen/i);
});

test('clicking the footer link navigates to /licenses.html', async ({ page }) => {
  await setupCredentials(page);
  await setupConfig(page);
  await page.goto('/settings.html');
  await page.locator('.settings-footer-line a[href="licenses.html"]').click();
  // `npx serve` strips .html for clean URLs (`/licenses`); the dev-server
  // keeps the extension (`/licenses.html`). Accept either.
  await expect(page).toHaveURL(/\/licenses(?:\.html)?$/);
});

test('licenses.html is directly reachable (shareable URL)', async ({ page }) => {
  await page.goto('/licenses.html');
  await expect(page.locator('table.licenses-table')).toBeVisible();
});

test('renders the known runtime libraries from attributions.json', async ({ page }) => {
  await page.goto('/licenses.html');
  await expect(page.locator('table.licenses-table')).toBeVisible();
  // Pick three entries that are guaranteed to be present in our manifest:
  // fullcalendar, @azure/msal-browser, spec-kit. Match each by name + version
  // cell from the rendered HTML against the committed attributions.json.
  const known = ['fullcalendar', '@azure/msal-browser', 'spec-kit'];
  for (const name of known) {
    const entry = attributions.entries.find((e) => e.name === name);
    expect(entry, `attributions.json must contain ${name}`).toBeTruthy();
    // Match the row by an EXACT-text first cell so 'fullcalendar' doesn't
    // also match the '@fullcalendar/core' row.
    const row = page.locator('table.licenses-table tbody tr', {
      has: page.locator('td', {
        hasText: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
      }),
    });
    await expect(row).toContainText(entry.version);
    await expect(row).toContainText(entry.license);
  }
});

for (const theme of /** @type {const} */ (['light', 'dark'])) {
  test(`licenses.html passes axe-core (WCAG 2.2 AA) — ${theme}`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/licenses.html');
    await page.waitForSelector('table.licenses-table', { timeout: 10000 });
    await expectAxeClean(page);
  });
}
