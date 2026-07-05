// Feature 044 / T018 — Playwright UI tests for settings-page.js privacy controls.
// Covers: delete-planning-data button flow, consent status display, withdrawal,
// and the Art. 15 planning-data viewer.

import { test, expect } from './coverage-fixture.js';
import { setupCredentials, setupConfig } from './helpers.js';

const AI_CONSENT_KEY = 'redmine_calendar_ai_consent';
const SNAPSHOT_KEY = 'redmine_calendar_planning_snapshot_test';
// Use a non-planning key that the settings page doesn't try to decrypt or modify.
// (redmine_calendar_credentials is read + decrypted by settings-page.js on load,
// which can clear it if the stored value isn't a valid encryption envelope.)
const NON_PLANNING_KEY = 'redmine_calendar_theme';

async function gotoSettings(page) {
  await setupCredentials(page);
  await setupConfig(page);
  await page.goto('/settings.html');
  // Feature 054: privacy controls live in the Daten & Datenschutz danger-zone card.
  await page.waitForSelector('#section-data', { timeout: 10000 });
}

test.describe('Feature 044 — Settings privacy controls', () => {
  // ── Delete planning data ──────────────────────────────────────────────────

  test('delete button is present in Settings', async ({ page }) => {
    await gotoSettings(page);
    await expect(page.locator('#delete-planning-data-btn')).toBeVisible();
  });

  test('cancel confirmation leaves planning keys intact', async ({ page }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({ consentedAt: new Date().toISOString(), withdrawnAt: null })
      );
    }, AI_CONSENT_KEY);
    await gotoSettings(page);

    // Intercept window.confirm and return false (cancel)
    await page.evaluate(() => {
      window.confirm = () => false;
    });
    await page.locator('#delete-planning-data-btn').click();

    const value = await page.evaluate((k) => localStorage.getItem(k), AI_CONSENT_KEY);
    expect(value).not.toBeNull();
  });

  test('confirming delete removes planning keys', async ({ page }) => {
    await page.addInitScript(
      (keys) => {
        const [consentKey, snapshotKey] = keys;
        window.localStorage.setItem(
          consentKey,
          JSON.stringify({ consentedAt: new Date().toISOString(), withdrawnAt: null })
        );
        window.localStorage.setItem(
          snapshotKey,
          JSON.stringify({ _writtenAt: new Date().toISOString() })
        );
      },
      [AI_CONSENT_KEY, SNAPSHOT_KEY]
    );
    await gotoSettings(page);

    await page.evaluate(() => {
      window.confirm = () => true;
    });
    await page.locator('#delete-planning-data-btn').click();

    const consent = await page.evaluate((k) => localStorage.getItem(k), AI_CONSENT_KEY);
    const snapshot = await page.evaluate((k) => localStorage.getItem(k), SNAPSHOT_KEY);
    expect(consent).toBeNull();
    expect(snapshot).toBeNull();
  });

  test('delete does not touch non-planning keys', async ({ page }) => {
    await page.addInitScript(
      (keys) => {
        const [consentKey, nonPlanningKey] = keys;
        window.localStorage.setItem(
          consentKey,
          JSON.stringify({ consentedAt: new Date().toISOString(), withdrawnAt: null })
        );
        // theme key is read-only by the dark-mode init script; settings-page.js
        // does not modify it, so it is a safe non-planning key for this assertion.
        window.localStorage.setItem(nonPlanningKey, 'light');
      },
      [AI_CONSENT_KEY, NON_PLANNING_KEY]
    );
    await gotoSettings(page);

    await page.evaluate(() => {
      window.confirm = () => true;
    });
    await page.locator('#delete-planning-data-btn').click();

    const theme = await page.evaluate((k) => localStorage.getItem(k), NON_PLANNING_KEY);
    expect(theme).toBe('light');
  });

  test('delete with no planning data present completes gracefully', async ({ page }) => {
    await gotoSettings(page);
    await page.evaluate(() => {
      window.confirm = () => true;
    });
    // Must not throw or show an error state
    await expect(page.locator('#delete-planning-data-btn').click()).resolves.toBeUndefined();
  });

  // ── Consent status + withdrawal ───────────────────────────────────────────

  test('consent status shows "none" when no consent recorded', async ({ page }) => {
    await gotoSettings(page);
    await expect(page.locator('#consent-status')).toContainText(/No AI planning consent/i);
  });

  test('consent status shows "active" when consent is recorded', async ({ page }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({ consentedAt: new Date().toISOString(), withdrawnAt: null })
      );
    }, AI_CONSENT_KEY);
    await gotoSettings(page);
    await expect(page.locator('#consent-status')).toContainText(/consent to share/i);
  });

  test('withdraw button is hidden when no consent is active', async ({ page }) => {
    await gotoSettings(page);
    await expect(page.locator('#withdraw-consent-btn')).toBeHidden();
  });

  test('withdraw button is visible when consent is active', async ({ page }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({ consentedAt: new Date().toISOString(), withdrawnAt: null })
      );
    }, AI_CONSENT_KEY);
    await gotoSettings(page);
    await expect(page.locator('#withdraw-consent-btn')).toBeVisible();
  });

  test('clicking withdraw sets withdrawnAt and updates status', async ({ page }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({ consentedAt: new Date().toISOString(), withdrawnAt: null })
      );
    }, AI_CONSENT_KEY);
    await gotoSettings(page);
    // Feature 054: withdraw is now gated behind a confirm() dialog.
    await page.evaluate(() => {
      window.confirm = () => true;
    });
    await page.locator('#withdraw-consent-btn').click();

    // Status must flip back to "none"
    await expect(page.locator('#consent-status')).toContainText(/No AI planning consent/i);
    // Withdraw button must hide
    await expect(page.locator('#withdraw-consent-btn')).toBeHidden();
    // withdrawnAt must be set in localStorage
    const raw = await page.evaluate((k) => localStorage.getItem(k), AI_CONSENT_KEY);
    const record = JSON.parse(raw);
    expect(record.withdrawnAt).toBeTruthy();
  });

  // ── Art. 15 data viewer ───────────────────────────────────────────────────

  test('data viewer shows empty message when no planning data', async ({ page }) => {
    await gotoSettings(page);
    // active_view is written by the test-infrastructure initScript (mockRedmineApi) and
    // is a PLANNING_PREF_KEY, so the viewer would list it. Remove it to test the truly
    // empty state — this key is infrastructure-only and not part of the test scenario.
    await page.evaluate(() => localStorage.removeItem('redmine_calendar_active_view'));
    const viewer = page.locator('#planning-data-viewer');
    await viewer.click(); // open the <details>
    await expect(page.locator('#planning-data-content')).toContainText(/No planning data stored/i);
  });

  test('data viewer lists planning keys when present', async ({ page }) => {
    await page.addInitScript((key) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({ consentedAt: new Date().toISOString(), withdrawnAt: null })
      );
    }, AI_CONSENT_KEY);
    await gotoSettings(page);
    const viewer = page.locator('#planning-data-viewer');
    await viewer.click();
    await expect(page.locator('#planning-data-content')).toContainText(AI_CONSENT_KEY);
  });
});
