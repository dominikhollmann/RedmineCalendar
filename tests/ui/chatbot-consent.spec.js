// Feature 044 / T022 — Playwright UI tests for the AI planning consent gate.
// Verifies: modal shown on first planning-tool call, decline cancels,
// accept stores consent and proceeds, subsequent calls skip the modal,
// withdrawal causes re-prompt.

import { test, expect } from './coverage-fixture.js';
import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';

const AI_CONSENT_KEY = 'redmine_calendar_ai_consent';

// Claude-format tool_use response for book_outlook_day.
const TOOL_USE_RESPONSE = JSON.stringify({
  id: 'msg_consent_test',
  type: 'message',
  role: 'assistant',
  content: [
    {
      type: 'tool_use',
      id: 'toolu_01',
      name: 'book_outlook_day',
      input: { date: '2026-06-19' },
    },
  ],
  stop_reason: 'tool_use',
});

// Text-only response returned after the tool result is sent back.
const TEXT_RESPONSE = JSON.stringify({
  id: 'msg_text',
  type: 'message',
  role: 'assistant',
  content: [{ type: 'text', text: 'Done processing your request.' }],
  stop_reason: 'end_turn',
});

/**
 * Mocks the AI proxy: odd-numbered calls return tool_use, even return text.
 * This lets tests trigger multiple consent-gate flows (decline + retry).
 */
async function mockAiAlternating(page) {
  let callCount = 0;
  await page.route('**/mock-ai-proxy/**', (route) => {
    const body = callCount % 2 === 0 ? TOOL_USE_RESPONSE : TEXT_RESPONSE;
    callCount++;
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body,
    });
  });
}

async function openChatbot(page) {
  await page.click('.chatbot-open-btn');
  await expect(page.locator('#chatbot-panel')).toBeVisible();
}

async function sendChatMessage(page, text) {
  await page.fill('#chatbot-input', text);
  await page.locator('.chatbot-send-btn').click();
}

/** Seeds consent directly on the already-loaded page (avoids addInitScript
 * which would re-run on every subsequent navigation and can override
 * withdrawals). */
async function seedConsent(page) {
  await page.evaluate((key) => {
    window.localStorage.setItem(
      key,
      JSON.stringify({ consentedAt: new Date().toISOString(), withdrawnAt: null })
    );
  }, AI_CONSENT_KEY);
}

test.describe('Feature 044 — AI planning consent gate', () => {
  test.beforeEach(async ({ page }) => {
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
  });

  test('consent modal appears when no consent recorded (planning tool call)', async ({ page }) => {
    await mockAiAlternating(page);
    await openChatbot(page);
    await sendChatMessage(page, 'Book my Outlook day');
    await expect(page.locator('.consent-modal-backdrop')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.consent-modal')).toBeVisible();
    await expect(page.locator('.consent-modal')).toContainText(/Share planning data/i);
  });

  test('decline closes the modal and does not store consent', async ({ page }) => {
    await mockAiAlternating(page);
    await openChatbot(page);
    await sendChatMessage(page, 'Book my Outlook day');
    await expect(page.locator('.consent-modal-backdrop')).toBeVisible({ timeout: 10000 });
    await page.locator('.consent-modal .btn-secondary').click();

    // Modal must close
    await expect(page.locator('.consent-modal-backdrop')).toHaveCount(0);
    // Consent must NOT be stored
    const stored = await page.evaluate((k) => localStorage.getItem(k), AI_CONSENT_KEY);
    expect(stored).toBeNull();
    // Chatbot continues (AI responds with text after the declined tool_result)
    await expect(page.locator('.chatbot-msg').last()).toBeVisible({ timeout: 10000 });
  });

  test('modal reappears after decline (consent not stored on decline)', async ({ page }) => {
    await mockAiAlternating(page);
    await openChatbot(page);

    // First message — decline
    await sendChatMessage(page, 'Book my Outlook day');
    await expect(page.locator('.consent-modal-backdrop')).toBeVisible({ timeout: 10000 });
    await page.locator('.consent-modal .btn-secondary').click();
    await expect(page.locator('.consent-modal-backdrop')).toHaveCount(0);
    // Wait for the AI's text reply to render before sending next message
    await expect(page.locator('.chatbot-msg').last()).toBeVisible({ timeout: 10000 });

    // Second message — modal must reappear (alternating mock returns TOOL_USE again)
    await sendChatMessage(page, 'Book my Outlook day again');
    await expect(page.locator('.consent-modal-backdrop')).toBeVisible({ timeout: 10000 });
  });

  test('accept stores consent and action proceeds', async ({ page }) => {
    await mockAiAlternating(page);
    await openChatbot(page);
    await sendChatMessage(page, 'Book my Outlook day');
    await expect(page.locator('.consent-modal-backdrop')).toBeVisible({ timeout: 10000 });
    await page.locator('.consent-modal .btn-primary').click();

    // Modal must close
    await expect(page.locator('.consent-modal-backdrop')).toHaveCount(0);
    // Consent must be persisted
    const raw = await page.evaluate((k) => localStorage.getItem(k), AI_CONSENT_KEY);
    expect(raw).not.toBeNull();
    const record = JSON.parse(raw);
    expect(record.consentedAt).toBeTruthy();
    expect(record.withdrawnAt).toBeNull();
    // Chat shows a response
    await expect(page.locator('.chatbot-msg').last()).toBeVisible({ timeout: 15000 });
  });

  test('subsequent planning call skips the consent modal', async ({ page }) => {
    // Seed consent directly on the already-loaded page (not via addInitScript
    // which would re-run on every navigation and interfere with withdrawal tests)
    await seedConsent(page);
    await mockAiAlternating(page);
    await openChatbot(page);
    await sendChatMessage(page, 'Book my Outlook day');

    // Wait for the chatbot to respond; modal must never appear
    await expect(page.locator('.chatbot-msg').last()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.consent-modal-backdrop')).toHaveCount(0);
  });

  test('withdrawal via Settings causes consent modal to reappear', async ({ page }) => {
    // Seed consent on the already-loaded index.html page
    await seedConsent(page);

    // Navigate to Settings and withdraw
    await setupConfig(page);
    await page.goto('/settings.html');
    await page.waitForSelector('#withdraw-consent-btn', { timeout: 10000 });
    // Feature 054: withdraw is gated behind a confirm() dialog.
    await page.evaluate(() => {
      window.confirm = () => true;
    });
    await page.locator('#withdraw-consent-btn').click();

    // Verify withdrawal took effect in storage
    const raw = await page.evaluate((k) => localStorage.getItem(k), AI_CONSENT_KEY);
    const record = JSON.parse(raw);
    expect(new Date(record.withdrawnAt) >= new Date(record.consentedAt)).toBe(true);

    // Navigate back to calendar and trigger a planning tool
    await mockRedmineApi(page);
    await mockAiAlternating(page);
    await page.goto('/index.html');
    await page.waitForSelector('[data-testid="time-entry"]', { timeout: 10000 });
    await openChatbot(page);
    await sendChatMessage(page, 'Book my Outlook day');
    // Modal must reappear because consent was withdrawn
    await expect(page.locator('.consent-modal-backdrop')).toBeVisible({ timeout: 10000 });
  });
});
