# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: settings.spec.js >> Settings page >> shows admin config as read-only
- Location: tests/ui/settings.spec.js:16:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('#admin-info')
Expected substring: "redmine"
Received string:    "Server Configuration (managed by admin)Redmine URL: http://localhost:3000/mock-proxyAI Provider: anthropicAI Model: claude-haiku-4-5-20251001"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('#admin-info')
    9 × locator resolved to <div id="admin-info" class="admin-info">…</div>
      - unexpected value "Server Configuration (managed by admin)Redmine URL: http://localhost:3000/mock-proxyAI Provider: anthropicAI Model: claude-haiku-4-5-20251001"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - heading "Redmine Calendar Settings" [level=1] [ref=e4]
      - button "Help" [ref=e5] [cursor=pointer]: "?"
    - generic [ref=e6]:
      - paragraph [ref=e7]: To get started, you need your personal Redmine API key.
      - paragraph [ref=e8]: You can find your API key in Redmine under My Account → API access key.
    - generic [ref=e9]:
      - heading "Server Configuration (managed by admin)" [level=2] [ref=e10]
      - paragraph [ref=e11]: "Redmine URL: http://localhost:3000/mock-proxy"
      - paragraph [ref=e12]: "AI Provider: anthropic"
      - paragraph [ref=e13]: "AI Model: claude-haiku-4-5-20251001"
    - generic [ref=e14]:
      - heading "Authentication method" [level=2] [ref=e15]
      - generic [ref=e16]:
        - generic [ref=e17] [cursor=pointer]:
          - radio "API Key" [checked] [ref=e18]
          - text: API Key
        - generic [ref=e19] [cursor=pointer]:
          - radio "Username & Password" [ref=e20]
          - text: Username & Password
      - generic [ref=e21]:
        - generic [ref=e22]: API key
        - generic [ref=e23]:
          - textbox "API key" [ref=e24]
          - button "Show" [ref=e25] [cursor=pointer]
        - paragraph [ref=e26]:
          - text: Find it under My Account → API access key in Redmine.
          - link "Open My Account in Redmine" [ref=e27] [cursor=pointer]:
            - /url: https://redmine.test.example.com/my/account
      - heading "Working hours" [level=2] [ref=e28]
      - generic [ref=e29]:
        - generic [ref=e30]:
          - generic [ref=e31]: Start
          - textbox "Start" [ref=e32]
        - generic [ref=e33]:
          - generic [ref=e34]: End
          - textbox "End" [ref=e35]
      - paragraph [ref=e36]: Leave both fields empty to disable the working hours view.
      - button "Save & Connect" [ref=e37] [cursor=pointer]
  - dialog "Help" [ref=e38]:
    - generic [ref=e39]:
      - heading [level=2]
      - button "Close" [ref=e40] [cursor=pointer]: ✕
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { setupConfig, mockRedmineApi } from './helpers.js';
  3  | 
  4  | test.describe('Settings page', () => {
  5  |   test.beforeEach(async ({ page }) => {
  6  |     await setupConfig(page);
  7  |     await mockRedmineApi(page);
  8  |   });
  9  | 
  10 |   test('shows welcome banner for first-time user', async ({ page }) => {
  11 |     await page.goto('/settings.html');
  12 |     const banner = page.locator('#first-time-banner');
  13 |     await expect(banner).toBeVisible();
  14 |   });
  15 | 
  16 |   test('shows admin config as read-only', async ({ page }) => {
  17 |     await page.goto('/settings.html');
  18 |     const adminInfo = page.locator('#admin-info');
  19 |     await expect(adminInfo).toBeVisible();
> 20 |     await expect(adminInfo).toContainText('redmine');
     |                             ^ Error: expect(locator).toContainText(expected) failed
  21 |   });
  22 | 
  23 |   test('saves API key and redirects to calendar', async ({ page }) => {
  24 |     await page.goto('/settings.html');
  25 |     await page.fill('#apiKey', 'test-api-key-12345');
  26 |     await page.click('#save-btn');
  27 |     await page.waitForURL(url => !url.pathname.includes('settings'));
  28 |     expect(page.url()).not.toContain('settings');
  29 |   });
  30 | 
  31 |   test('toggles between API key and basic auth', async ({ page }) => {
  32 |     await page.goto('/settings.html');
  33 |     const basicRadio = page.locator('input[value="basic"]');
  34 |     await basicRadio.click();
  35 |     await expect(page.locator('#field-basic')).toBeVisible();
  36 |     await expect(page.locator('#field-apikey')).toBeHidden();
  37 |   });
  38 | 
  39 |   test('shows error for missing config.json', async ({ page }) => {
  40 |     await page.route('**/config.json', (route) => route.fulfill({ status: 404 }));
  41 |     await page.goto('/settings.html');
  42 |     const error = page.locator('#config-error');
  43 |     await expect(error).toBeVisible();
  44 |   });
  45 | 
  46 |   test('password toggle shows/hides API key', async ({ page }) => {
  47 |     await page.goto('/settings.html');
  48 |     const input = page.locator('#apiKey');
  49 |     await expect(input).toHaveAttribute('type', 'password');
  50 |     await page.click('.password-toggle[data-target="apiKey"]');
  51 |     await expect(input).toHaveAttribute('type', 'text');
  52 |   });
  53 | });
  54 | 
```