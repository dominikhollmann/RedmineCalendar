import { test, expect } from '@playwright/test';
import { setupConfig, mockRedmineApi, mockAiApi, setupCredentials } from './helpers.js';

test.describe('AI Chat Assistant', () => {
  test.beforeEach(async ({ page }) => {
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await mockAiApi(page);
    await page.goto('/index.html');
    await page.waitForSelector('.fc-event', { timeout: 10000 });
  });

  test('opens chat panel on button click', async ({ page }) => {
    await page.click('.chatbot-open-btn');
    const panel = page.locator('#chatbot-panel');
    await expect(panel).toBeVisible();
  });

  test('shows welcome message', async ({ page }) => {
    await page.click('.chatbot-open-btn');
    const messages = page.locator('.chatbot-msg');
    await expect(messages.first()).toBeVisible();
  });

  test('closes chat panel on close button', async ({ page }) => {
    await page.click('.chatbot-open-btn');
    await expect(page.locator('#chatbot-panel')).toBeVisible();
    await page.click('.chatbot-panel__close');
    await page.waitForTimeout(500);
    const isHidden = await page.locator('#chatbot-panel').evaluate(el => el.hasAttribute('hidden') || !el.classList.contains('chatbot-panel--open'));
    expect(isHidden).toBe(true);
  });
});
