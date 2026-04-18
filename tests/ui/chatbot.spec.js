import { test, expect } from '@playwright/test';
import { setupConfig, mockRedmineApi, mockAiApi, setupCredentials } from './helpers.js';

test.describe('AI Chat Assistant', () => {
  test.beforeEach(async ({ page }) => {
    await setupConfig(page);
    await mockRedmineApi(page);
    await mockAiApi(page);
    await page.goto('/index.html');
    await setupCredentials(page);
    await page.reload();
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
    await page.click('.chatbot-panel__close');
    const panel = page.locator('#chatbot-panel');
    await expect(panel).toBeHidden({ timeout: 3000 });
  });
});
