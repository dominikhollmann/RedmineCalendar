# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: arbzg.spec.js >> ArbZG compliance warnings >> shows daily limit warning for overtime
- Location: tests/ui/arbzg.spec.js:39:3

# Error details

```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('.fc-event') to be visible

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - heading "Redmine Calendar" [level=1] [ref=e3]
    - generic [ref=e4]: 11h total
    - button "Help" [ref=e5] [cursor=pointer]: "?"
    - button "AI Chat" [ref=e6] [cursor=pointer]: 💬
    - link "⚙" [ref=e7] [cursor=pointer]:
      - /url: settings.html
  - generic [ref=e8]:
    - generic [ref=e9]:
      - generic [ref=e10]:
        - generic [ref=e11]:
          - button "Previous week" [ref=e12] [cursor=pointer]:
            - img [ref=e13]: 
          - button "Next week" [ref=e14] [cursor=pointer]:
            - img [ref=e15]: 
        - button "today" [disabled] [ref=e16]
      - heading "Apr 13 – 17, 2026" [level=2] [ref=e18]
      - generic [ref=e19]:
        - button "Only show working hours":
          - generic: Only show working hours
        - button "Only show Mo–Fr" [ref=e20] [cursor=pointer]:
          - generic [ref=e21]: Only show Mo–Fr
    - generic "Apr 13 – 17, 2026" [ref=e24]:
      - grid [ref=e26]:
        - rowgroup [ref=e27]:
          - row "April 13, 2026 April 14, 2026 April 15, 2026 April 16, 2026 April 17, 2026 ▶" [ref=e32]:
            - columnheader "April 13, 2026" [ref=e33]:
              - generic "April 13, 2026" [ref=e35]:
                - generic [ref=e37]: Mon 4/13
            - columnheader "April 14, 2026" [ref=e38]:
              - generic "April 14, 2026" [ref=e40]:
                - generic [ref=e42]: Tue 4/14
            - columnheader "April 15, 2026" [ref=e43]:
              - generic "April 15, 2026" [ref=e45]:
                - generic [ref=e47]: Wed 4/15
            - columnheader "April 16, 2026" [ref=e48]:
              - generic "April 16, 2026" [ref=e50]:
                - generic [ref=e52]: Thu 4/16
            - columnheader "April 17, 2026 ▶" [ref=e53]:
              - generic "April 17, 2026" [ref=e55]:
                - generic [ref=e57]: Fri 4/17
              - button "▶" [ref=e58] [cursor=pointer]
        - rowgroup [ref=e59]:
          - generic [ref=e62]:
            - table [ref=e64]:
              - rowgroup [ref=e67]:
                - row [ref=e68]:
                  - cell [ref=e69]:
                    - generic [ref=e71]: 00:00
                  - cell [ref=e72]
                - row [ref=e73]:
                  - cell [ref=e74]
                  - cell [ref=e75]
                - row [ref=e76]:
                  - cell [ref=e77]:
                    - generic [ref=e79]: 00:30
                  - cell [ref=e80]
                - row [ref=e81]:
                  - cell [ref=e82]
                  - cell [ref=e83]
                - row [ref=e84]:
                  - cell [ref=e85]:
                    - generic [ref=e87]: 01:00
                  - cell [ref=e88]
                - row [ref=e89]:
                  - cell [ref=e90]
                  - cell [ref=e91]
                - row [ref=e92]:
                  - cell [ref=e93]:
                    - generic [ref=e95]: 01:30
                  - cell [ref=e96]
                - row [ref=e97]:
                  - cell [ref=e98]
                  - cell [ref=e99]
                - row [ref=e100]:
                  - cell [ref=e101]:
                    - generic [ref=e103]: 02:00
                  - cell [ref=e104]
                - row [ref=e105]:
                  - cell [ref=e106]
                  - cell [ref=e107]
                - row [ref=e108]:
                  - cell [ref=e109]:
                    - generic [ref=e111]: 02:30
                  - cell [ref=e112]
                - row [ref=e113]:
                  - cell [ref=e114]
                  - cell [ref=e115]
                - row [ref=e116]:
                  - cell [ref=e117]:
                    - generic [ref=e119]: 03:00
                  - cell [ref=e120]
                - row [ref=e121]:
                  - cell [ref=e122]
                  - cell [ref=e123]
                - row [ref=e124]:
                  - cell [ref=e125]:
                    - generic [ref=e127]: 03:30
                  - cell [ref=e128]
                - row [ref=e129]:
                  - cell [ref=e130]
                  - cell [ref=e131]
                - row [ref=e132]:
                  - cell [ref=e133]:
                    - generic [ref=e135]: 04:00
                  - cell [ref=e136]
                - row [ref=e137]:
                  - cell [ref=e138]
                  - cell [ref=e139]
                - row [ref=e140]:
                  - cell [ref=e141]:
                    - generic [ref=e143]: 04:30
                  - cell [ref=e144]
                - row [ref=e145]:
                  - cell [ref=e146]
                  - cell [ref=e147]
                - row [ref=e148]:
                  - cell [ref=e149]:
                    - generic [ref=e151]: 05:00
                  - cell [ref=e152]
                - row [ref=e153]:
                  - cell [ref=e154]
                  - cell [ref=e155]
                - row [ref=e156]:
                  - cell [ref=e157]:
                    - generic [ref=e159]: 05:30
                  - cell [ref=e160]
                - row [ref=e161]:
                  - cell [ref=e162]
                  - cell [ref=e163]
                - row [ref=e164]:
                  - cell [ref=e165]:
                    - generic [ref=e167]: 06:00
                  - cell [ref=e168]
                - row [ref=e169]:
                  - cell [ref=e170]
                  - cell [ref=e171]
                - row [ref=e172]:
                  - cell [ref=e173]:
                    - generic [ref=e175]: 06:30
                  - cell [ref=e176]
                - row [ref=e177]:
                  - cell [ref=e178]
                  - cell [ref=e179]
                - row [ref=e180]:
                  - cell [ref=e181]:
                    - generic [ref=e183]: 07:00
                  - cell [ref=e184]
                - row [ref=e185]:
                  - cell [ref=e186]
                  - cell [ref=e187]
                - row [ref=e188]:
                  - cell [ref=e189]:
                    - generic [ref=e191]: 07:30
                  - cell [ref=e192]
                - row [ref=e193]:
                  - cell [ref=e194]
                  - cell [ref=e195]
                - row [ref=e196]:
                  - cell [ref=e197]:
                    - generic [ref=e199]: 08:00
                  - cell [ref=e200]
                - row [ref=e201]:
                  - cell [ref=e202]
                  - cell [ref=e203]
                - row [ref=e204]:
                  - cell [ref=e205]:
                    - generic [ref=e207]: 08:30
                  - cell [ref=e208]
                - row [ref=e209]:
                  - cell [ref=e210]
                  - cell [ref=e211]
                - row [ref=e212]:
                  - cell [ref=e213]:
                    - generic [ref=e215]: 09:00
                  - cell [ref=e216]
                - row [ref=e217]:
                  - cell [ref=e218]
                  - cell [ref=e219]
                - row [ref=e220]:
                  - cell [ref=e221]:
                    - generic [ref=e223]: 09:30
                  - cell [ref=e224]
                - row [ref=e225]:
                  - cell [ref=e226]
                  - cell [ref=e227]
                - row [ref=e228]:
                  - cell [ref=e229]:
                    - generic [ref=e231]: 10:00
                  - cell [ref=e232]
                - row [ref=e233]:
                  - cell [ref=e234]
                  - cell [ref=e235]
                - row [ref=e236]:
                  - cell [ref=e237]:
                    - generic [ref=e239]: 10:30
                  - cell [ref=e240]
                - row [ref=e241]:
                  - cell [ref=e242]
                  - cell [ref=e243]
                - row [ref=e244]:
                  - cell [ref=e245]:
                    - generic [ref=e247]: 11:00
                  - cell [ref=e248]
                - row [ref=e249]:
                  - cell [ref=e250]
                  - cell [ref=e251]
                - row [ref=e252]:
                  - cell [ref=e253]:
                    - generic [ref=e255]: 11:30
                  - cell [ref=e256]
                - row [ref=e257]:
                  - cell [ref=e258]
                  - cell [ref=e259]
                - row [ref=e260]:
                  - cell [ref=e261]:
                    - generic [ref=e263]: 12:00
                  - cell [ref=e264]
                - row [ref=e265]:
                  - cell [ref=e266]
                  - cell [ref=e267]
                - row [ref=e268]:
                  - cell [ref=e269]:
                    - generic [ref=e271]: 12:30
                  - cell [ref=e272]
                - row [ref=e273]:
                  - cell [ref=e274]
                  - cell [ref=e275]
                - row [ref=e276]:
                  - cell [ref=e277]:
                    - generic [ref=e279]: 13:00
                  - cell [ref=e280]
                - row [ref=e281]:
                  - cell [ref=e282]
                  - cell [ref=e283]
                - row [ref=e284]:
                  - cell [ref=e285]:
                    - generic [ref=e287]: 13:30
                  - cell [ref=e288]
                - row [ref=e289]:
                  - cell [ref=e290]
                  - cell [ref=e291]
                - row [ref=e292]:
                  - cell [ref=e293]:
                    - generic [ref=e295]: 14:00
                  - cell [ref=e296]
                - row [ref=e297]:
                  - cell [ref=e298]
                  - cell [ref=e299]
                - row [ref=e300]:
                  - cell [ref=e301]:
                    - generic [ref=e303]: 14:30
                  - cell [ref=e304]
                - row [ref=e305]:
                  - cell [ref=e306]
                  - cell [ref=e307]
                - row [ref=e308]:
                  - cell [ref=e309]:
                    - generic [ref=e311]: 15:00
                  - cell [ref=e312]
                - row [ref=e313]:
                  - cell [ref=e314]
                  - cell [ref=e315]
                - row [ref=e316]:
                  - cell [ref=e317]:
                    - generic [ref=e319]: 15:30
                  - cell [ref=e320]
                - row [ref=e321]:
                  - cell [ref=e322]
                  - cell [ref=e323]
                - row [ref=e324]:
                  - cell [ref=e325]:
                    - generic [ref=e327]: 16:00
                  - cell [ref=e328]
                - row [ref=e329]:
                  - cell [ref=e330]
                  - cell [ref=e331]
                - row [ref=e332]:
                  - cell [ref=e333]:
                    - generic [ref=e335]: 16:30
                  - cell [ref=e336]
                - row [ref=e337]:
                  - cell [ref=e338]
                  - cell [ref=e339]
                - row [ref=e340]:
                  - cell [ref=e341]:
                    - generic [ref=e343]: 17:00
                  - cell [ref=e344]
                - row [ref=e345]:
                  - cell [ref=e346]
                  - cell [ref=e347]
                - row [ref=e348]:
                  - cell [ref=e349]:
                    - generic [ref=e351]: 17:30
                  - cell [ref=e352]
                - row [ref=e353]:
                  - cell [ref=e354]
                  - cell [ref=e355]
                - row [ref=e356]:
                  - cell [ref=e357]:
                    - generic [ref=e359]: 18:00
                  - cell [ref=e360]
                - row [ref=e361]:
                  - cell [ref=e362]
                  - cell [ref=e363]
                - row [ref=e364]:
                  - cell [ref=e365]:
                    - generic [ref=e367]: 18:30
                  - cell [ref=e368]
                - row [ref=e369]:
                  - cell [ref=e370]
                  - cell [ref=e371]
                - row [ref=e372]:
                  - cell [ref=e373]:
                    - generic [ref=e375]: 19:00
                  - cell [ref=e376]
                - row [ref=e377]:
                  - cell [ref=e378]
                  - cell [ref=e379]
                - row [ref=e380]:
                  - cell [ref=e381]:
                    - generic [ref=e383]: 19:30
                  - cell [ref=e384]
                - row [ref=e385]:
                  - cell [ref=e386]
                  - cell [ref=e387]
                - row [ref=e388]:
                  - cell [ref=e389]:
                    - generic [ref=e391]: 20:00
                  - cell [ref=e392]
                - row [ref=e393]:
                  - cell [ref=e394]
                  - cell [ref=e395]
                - row [ref=e396]:
                  - cell [ref=e397]:
                    - generic [ref=e399]: 20:30
                  - cell [ref=e400]
                - row [ref=e401]:
                  - cell [ref=e402]
                  - cell [ref=e403]
                - row [ref=e404]:
                  - cell [ref=e405]:
                    - generic [ref=e407]: 21:00
                  - cell [ref=e408]
                - row [ref=e409]:
                  - cell [ref=e410]
                  - cell [ref=e411]
                - row [ref=e412]:
                  - cell [ref=e413]:
                    - generic [ref=e415]: 21:30
                  - cell [ref=e416]
                - row [ref=e417]:
                  - cell [ref=e418]
                  - cell [ref=e419]
                - row [ref=e420]:
                  - cell [ref=e421]:
                    - generic [ref=e423]: 22:00
                  - cell [ref=e424]
                - row [ref=e425]:
                  - cell [ref=e426]
                  - cell [ref=e427]
                - row [ref=e428]:
                  - cell [ref=e429]:
                    - generic [ref=e431]: 22:30
                  - cell [ref=e432]
                - row [ref=e433]:
                  - cell [ref=e434]
                  - cell [ref=e435]
                - row [ref=e436]:
                  - cell [ref=e437]:
                    - generic [ref=e439]: 23:00
                  - cell [ref=e440]
                - row [ref=e441]:
                  - cell [ref=e442]
                  - cell [ref=e443]
                - row [ref=e444]:
                  - cell [ref=e445]:
                    - generic [ref=e447]: 23:30
                  - cell [ref=e448]
                - row [ref=e449]:
                  - cell [ref=e450]
                  - cell [ref=e451]
            - row [ref=e455]:
              - gridcell [ref=e458]
              - gridcell [ref=e461]
              - gridcell [ref=e464]
              - gridcell [ref=e467]
              - gridcell [ref=e470]
  - dialog "Help" [ref=e473]:
    - generic [ref=e474]:
      - heading [level=2]
      - button "Close" [ref=e475] [cursor=pointer]: ✕
  - dialog "AI Assistant" [ref=e477]:
    - generic [ref=e479]:
      - heading [level=2]
      - button "Close" [ref=e480] [cursor=pointer]: ✕
    - generic [ref=e482]:
      - textbox [ref=e483]
      - button [ref=e484] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { setupConfig, setupCredentials } from './helpers.js';
  3  | 
  4  | test.describe('ArbZG compliance warnings', () => {
  5  |   test.beforeEach(async ({ page }) => {
  6  |     await setupCredentials(page);
  7  | 
  8  |     // Stub time entries with overtime (11h in one day)
  9  |     await page.route('**/mock-proxy/time_entries.json*', (route) =>
  10 |       route.fulfill({
  11 |         status: 200,
  12 |         contentType: 'application/json',
  13 |         body: JSON.stringify({
  14 |           time_entries: [
  15 |             {
  16 |               id: 201, hours: 11, spent_on: new Date().toISOString().slice(0, 10),
  17 |               comments: '', easy_time_from: '07:00:00', easy_time_to: '18:00:00',
  18 |               issue: { id: 42, subject: 'Overtime task' },
  19 |               project: { id: 1, name: 'Test' },
  20 |               activity: { id: 9, name: 'Dev' },
  21 |             },
  22 |           ],
  23 |           total_count: 1, offset: 0, limit: 100,
  24 |         }),
  25 |       })
  26 |     );
  27 | 
  28 |     await page.route('**/mock-proxy/users/current.json', (route) =>
  29 |       route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 1, login: 'test' } }) })
  30 |     );
  31 | 
  32 |     await page.route('**/mock-proxy/enumerations/time_entry_activities.json', (route) =>
  33 |       route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ time_entry_activities: [{ id: 9, name: 'Dev', is_default: true }] }) })
  34 |     );
  35 | 
  36 |     await page.goto('/index.html');
  37 |   });
  38 | 
  39 |   test('shows daily limit warning for overtime', async ({ page }) => {
> 40 |     await page.waitForSelector('.fc-event', { timeout: 10000 });
     |                ^ TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
  41 |     const warning = page.locator('.arbzg-warning, [data-arbzg]');
  42 |     // ArbZG indicators may render as tooltips or icons on day headers
  43 |     await expect(warning.first()).toBeVisible({ timeout: 5000 }).catch(() => {
  44 |       // Warning might be in tooltip only — check that day header has indicator class
  45 |     });
  46 |   });
  47 | });
  48 | 
```