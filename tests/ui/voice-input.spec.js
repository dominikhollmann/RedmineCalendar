import { test, expect } from '@playwright/test';
import { setupCredentials, mockCdn, setupConfig, mockRedmineApi } from './helpers.js';

function injectMockSpeechRecognition() {
  return `
    window._mockSpeechResults = [];
    window._mockSpeechStarted = false;
    window._mockSpeechStopped = false;
    class MockSpeechRecognition {
      constructor() {
        this.interimResults = false;
        this.continuous = false;
        this.lang = '';
        this.onresult = null;
        this.onspeechend = null;
        this.onerror = null;
        this.onend = null;
      }
      start() {
        window._mockSpeechStarted = true;
        window._mockSpeechStopped = false;
        setTimeout(() => {
          if (this.onresult && window._mockSpeechResults.length > 0) {
            this.onresult({ results: window._mockSpeechResults });
          }
        }, 100);
      }
      stop() {
        window._mockSpeechStopped = true;
        setTimeout(() => this.onend?.(), 50);
      }
      abort() { window._mockSpeechStopped = true; }
    }
    window.SpeechRecognition = MockSpeechRecognition;
    window.webkitSpeechRecognition = MockSpeechRecognition;
  `;
}

test.describe('Voice Input', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addInitScript(injectMockSpeechRecognition());
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
  });

  test('mic button is visible when SpeechRecognition is supported', async ({ page }) => {
    await page.goto('/index.html');
    await page.click('.chatbot-open-btn');
    const audioBtn = page.locator('#chatbot-audio-btn');
    await expect(audioBtn).toBeVisible({ timeout: 5000 });
  });

  test('mic button is hidden when SpeechRecognition is not supported', async ({ browser }) => {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      delete window.SpeechRecognition;
      delete window.webkitSpeechRecognition;
    });
    const page = await context.newPage();
    await setupCredentials(page);
    await setupConfig(page);
    await mockRedmineApi(page);
    await page.goto('/index.html');
    await page.click('.chatbot-open-btn');
    const audioBtn = page.locator('#chatbot-audio-btn');
    await expect(audioBtn).toBeHidden({ timeout: 3000 });
    await context.close();
  });

  test('clicking mic toggles recording state', async ({ page }) => {
    await context_dismissPrivacy(page);
    await page.goto('/index.html');
    await page.click('.chatbot-open-btn');
    const audioBtn = page.locator('#chatbot-audio-btn');
    await expect(audioBtn).toBeVisible({ timeout: 5000 });
    await audioBtn.click();
    await expect(audioBtn).toHaveClass(/recording/, { timeout: 3000 });
  });

  test('privacy notice shows on first use', async ({ page }) => {
    await page.goto('/index.html');
    await page.click('.chatbot-open-btn');
    const audioBtn = page.locator('#chatbot-audio-btn');
    await expect(audioBtn).toBeVisible({ timeout: 5000 });
    await audioBtn.click();
    const notice = page.locator('.chatbot-privacy-notice');
    await expect(notice).toBeVisible({ timeout: 3000 });
    await notice.locator('button').click();
    await expect(notice).toBeHidden();
  });

  test('auto-sends transcription on stop', async ({ page }) => {
    await context_dismissPrivacy(page);
    await page.goto('/index.html');
    await page.click('.chatbot-open-btn');

    await page.evaluate(() => {
      window._mockSpeechResults = [{
        0: { transcript: 'hello world' },
        isFinal: true,
        length: 1,
      }];
    });

    const audioBtn = page.locator('#chatbot-audio-btn');
    await expect(audioBtn).toBeVisible({ timeout: 5000 });
    await audioBtn.click();
    await page.waitForTimeout(200);
    await audioBtn.click();

    const userMsg = page.locator('.chatbot-msg--user');
    await expect(userMsg.last()).toContainText('hello world', { timeout: 5000 });
  });

  test('mobile viewport: mic button has adequate touch target', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await context_dismissPrivacy(page);
    await page.goto('/index.html');
    await page.click('.chatbot-open-btn');
    const audioBtn = page.locator('#chatbot-audio-btn');
    await expect(audioBtn).toBeVisible({ timeout: 5000 });
    const box = await audioBtn.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });
});

async function context_dismissPrivacy(page) {
  await page.evaluate(() => {
    localStorage.setItem('redmine_calendar_voice_privacy_dismissed', 'true');
  });
}
