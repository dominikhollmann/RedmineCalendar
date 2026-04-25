# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: calendar.spec.js >> Calendar page >> today button returns to current week
- Location: tests/ui/calendar.spec.js:37:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.fc-day-today').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.fc-day-today').first()

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - heading "Redmine Calendar" [level=1] [ref=e3]
    - generic [ref=e4]: 11h 30m total
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
          - row "April 13, 2026 April 14, 2026 April 15, 2026 April 16, 2026 April 17, 2026" [ref=e32]:
            - columnheader "April 13, 2026" [ref=e33]:
              - generic "April 13, 2026" [ref=e35]:
                - generic [ref=e37]: Mon 4/13
            - columnheader "April 14, 2026" [ref=e38]:
              - generic "April 14, 2026" [ref=e40]:
                - generic [ref=e41]:
                  - generic [ref=e42]: Tue 4/14
                  - generic [ref=e43]: 3h 30m
            - columnheader "April 15, 2026" [ref=e44]:
              - generic "April 15, 2026" [ref=e46]:
                - generic [ref=e47]:
                  - generic [ref=e48]: Wed 4/15
                  - generic [ref=e49]:
                    - generic [ref=e50] [cursor=pointer]: ⚠
                    - text: 8h
            - columnheader "April 16, 2026" [ref=e51]:
              - generic "April 16, 2026" [ref=e53]:
                - generic [ref=e55]: Thu 4/16
            - columnheader "April 17, 2026" [ref=e56]:
              - generic "April 17, 2026" [ref=e58]:
                - generic [ref=e60]: Fri 4/17
        - rowgroup [ref=e61]:
          - generic [ref=e64]:
            - table [ref=e66]:
              - rowgroup [ref=e69]:
                - row [ref=e70]:
                  - cell [ref=e71]:
                    - generic [ref=e73]: 00:00
                  - cell [ref=e74]
                - row [ref=e75]:
                  - cell [ref=e76]
                  - cell [ref=e77]
                - row [ref=e78]:
                  - cell [ref=e79]:
                    - generic [ref=e81]: 00:30
                  - cell [ref=e82]
                - row [ref=e83]:
                  - cell [ref=e84]
                  - cell [ref=e85]
                - row [ref=e86]:
                  - cell [ref=e87]:
                    - generic [ref=e89]: 01:00
                  - cell [ref=e90]
                - row [ref=e91]:
                  - cell [ref=e92]
                  - cell [ref=e93]
                - row [ref=e94]:
                  - cell [ref=e95]:
                    - generic [ref=e97]: 01:30
                  - cell [ref=e98]
                - row [ref=e99]:
                  - cell [ref=e100]
                  - cell [ref=e101]
                - row [ref=e102]:
                  - cell [ref=e103]:
                    - generic [ref=e105]: 02:00
                  - cell [ref=e106]
                - row [ref=e107]:
                  - cell [ref=e108]
                  - cell [ref=e109]
                - row [ref=e110]:
                  - cell [ref=e111]:
                    - generic [ref=e113]: 02:30
                  - cell [ref=e114]
                - row [ref=e115]:
                  - cell [ref=e116]
                  - cell [ref=e117]
                - row [ref=e118]:
                  - cell [ref=e119]:
                    - generic [ref=e121]: 03:00
                  - cell [ref=e122]
                - row [ref=e123]:
                  - cell [ref=e124]
                  - cell [ref=e125]
                - row [ref=e126]:
                  - cell [ref=e127]:
                    - generic [ref=e129]: 03:30
                  - cell [ref=e130]
                - row [ref=e131]:
                  - cell [ref=e132]
                  - cell [ref=e133]
                - row [ref=e134]:
                  - cell [ref=e135]:
                    - generic [ref=e137]: 04:00
                  - cell [ref=e138]
                - row [ref=e139]:
                  - cell [ref=e140]
                  - cell [ref=e141]
                - row [ref=e142]:
                  - cell [ref=e143]:
                    - generic [ref=e145]: 04:30
                  - cell [ref=e146]
                - row [ref=e147]:
                  - cell [ref=e148]
                  - cell [ref=e149]
                - row [ref=e150]:
                  - cell [ref=e151]:
                    - generic [ref=e153]: 05:00
                  - cell [ref=e154]
                - row [ref=e155]:
                  - cell [ref=e156]
                  - cell [ref=e157]
                - row [ref=e158]:
                  - cell [ref=e159]:
                    - generic [ref=e161]: 05:30
                  - cell [ref=e162]
                - row [ref=e163]:
                  - cell [ref=e164]
                  - cell [ref=e165]
                - row [ref=e166]:
                  - cell [ref=e167]:
                    - generic [ref=e169]: 06:00
                  - cell [ref=e170]
                - row [ref=e171]:
                  - cell [ref=e172]
                  - cell [ref=e173]
                - row [ref=e174]:
                  - cell [ref=e175]:
                    - generic [ref=e177]: 06:30
                  - cell [ref=e178]
                - row [ref=e179]:
                  - cell [ref=e180]
                  - cell [ref=e181]
                - row [ref=e182]:
                  - cell [ref=e183]:
                    - generic [ref=e185]: 07:00
                  - cell [ref=e186]
                - row [ref=e187]:
                  - cell [ref=e188]
                  - cell [ref=e189]
                - row [ref=e190]:
                  - cell [ref=e191]:
                    - generic [ref=e193]: 07:30
                  - cell [ref=e194]
                - row [ref=e195]:
                  - cell [ref=e196]
                  - cell [ref=e197]
                - row [ref=e198]:
                  - cell [ref=e199]:
                    - generic [ref=e201]: 08:00
                  - cell [ref=e202]
                - row [ref=e203]:
                  - cell [ref=e204]
                  - cell [ref=e205]
                - row [ref=e206]:
                  - cell [ref=e207]:
                    - generic [ref=e209]: 08:30
                  - cell [ref=e210]
                - row [ref=e211]:
                  - cell [ref=e212]
                  - cell [ref=e213]
                - row [ref=e214]:
                  - cell [ref=e215]:
                    - generic [ref=e217]: 09:00
                  - cell [ref=e218]
                - row [ref=e219]:
                  - cell [ref=e220]
                  - cell [ref=e221]
                - row [ref=e222]:
                  - cell [ref=e223]:
                    - generic [ref=e225]: 09:30
                  - cell [ref=e226]
                - row [ref=e227]:
                  - cell [ref=e228]
                  - cell [ref=e229]
                - row [ref=e230]:
                  - cell [ref=e231]:
                    - generic [ref=e233]: 10:00
                  - cell [ref=e234]
                - row [ref=e235]:
                  - cell [ref=e236]
                  - cell [ref=e237]
                - row [ref=e238]:
                  - cell [ref=e239]:
                    - generic [ref=e241]: 10:30
                  - cell [ref=e242]
                - row [ref=e243]:
                  - cell [ref=e244]
                  - cell [ref=e245]
                - row [ref=e246]:
                  - cell [ref=e247]:
                    - generic [ref=e249]: 11:00
                  - cell [ref=e250]
                - row [ref=e251]:
                  - cell [ref=e252]
                  - cell [ref=e253]
                - row [ref=e254]:
                  - cell [ref=e255]:
                    - generic [ref=e257]: 11:30
                  - cell [ref=e258]
                - row [ref=e259]:
                  - cell [ref=e260]
                  - cell [ref=e261]
                - row [ref=e262]:
                  - cell [ref=e263]:
                    - generic [ref=e265]: 12:00
                  - cell [ref=e266]
                - row [ref=e267]:
                  - cell [ref=e268]
                  - cell [ref=e269]
                - row [ref=e270]:
                  - cell [ref=e271]:
                    - generic [ref=e273]: 12:30
                  - cell [ref=e274]
                - row [ref=e275]:
                  - cell [ref=e276]
                  - cell [ref=e277]
                - row [ref=e278]:
                  - cell [ref=e279]:
                    - generic [ref=e281]: 13:00
                  - cell [ref=e282]
                - row [ref=e283]:
                  - cell [ref=e284]
                  - cell [ref=e285]
                - row [ref=e286]:
                  - cell [ref=e287]:
                    - generic [ref=e289]: 13:30
                  - cell [ref=e290]
                - row [ref=e291]:
                  - cell [ref=e292]
                  - cell [ref=e293]
                - row [ref=e294]:
                  - cell [ref=e295]:
                    - generic [ref=e297]: 14:00
                  - cell [ref=e298]
                - row [ref=e299]:
                  - cell [ref=e300]
                  - cell [ref=e301]
                - row [ref=e302]:
                  - cell [ref=e303]:
                    - generic [ref=e305]: 14:30
                  - cell [ref=e306]
                - row [ref=e307]:
                  - cell [ref=e308]
                  - cell [ref=e309]
                - row [ref=e310]:
                  - cell [ref=e311]:
                    - generic [ref=e313]: 15:00
                  - cell [ref=e314]
                - row [ref=e315]:
                  - cell [ref=e316]
                  - cell [ref=e317]
                - row [ref=e318]:
                  - cell [ref=e319]:
                    - generic [ref=e321]: 15:30
                  - cell [ref=e322]
                - row [ref=e323]:
                  - cell [ref=e324]
                  - cell [ref=e325]
                - row [ref=e326]:
                  - cell [ref=e327]:
                    - generic [ref=e329]: 16:00
                  - cell [ref=e330]
                - row [ref=e331]:
                  - cell [ref=e332]
                  - cell [ref=e333]
                - row [ref=e334]:
                  - cell [ref=e335]:
                    - generic [ref=e337]: 16:30
                  - cell [ref=e338]
                - row [ref=e339]:
                  - cell [ref=e340]
                  - cell [ref=e341]
                - row [ref=e342]:
                  - cell [ref=e343]:
                    - generic [ref=e345]: 17:00
                  - cell [ref=e346]
                - row [ref=e347]:
                  - cell [ref=e348]
                  - cell [ref=e349]
                - row [ref=e350]:
                  - cell [ref=e351]:
                    - generic [ref=e353]: 17:30
                  - cell [ref=e354]
                - row [ref=e355]:
                  - cell [ref=e356]
                  - cell [ref=e357]
                - row [ref=e358]:
                  - cell [ref=e359]:
                    - generic [ref=e361]: 18:00
                  - cell [ref=e362]
                - row [ref=e363]:
                  - cell [ref=e364]
                  - cell [ref=e365]
                - row [ref=e366]:
                  - cell [ref=e367]:
                    - generic [ref=e369]: 18:30
                  - cell [ref=e370]
                - row [ref=e371]:
                  - cell [ref=e372]
                  - cell [ref=e373]
                - row [ref=e374]:
                  - cell [ref=e375]:
                    - generic [ref=e377]: 19:00
                  - cell [ref=e378]
                - row [ref=e379]:
                  - cell [ref=e380]
                  - cell [ref=e381]
                - row [ref=e382]:
                  - cell [ref=e383]:
                    - generic [ref=e385]: 19:30
                  - cell [ref=e386]
                - row [ref=e387]:
                  - cell [ref=e388]
                  - cell [ref=e389]
                - row [ref=e390]:
                  - cell [ref=e391]:
                    - generic [ref=e393]: 20:00
                  - cell [ref=e394]
                - row [ref=e395]:
                  - cell [ref=e396]
                  - cell [ref=e397]
                - row [ref=e398]:
                  - cell [ref=e399]:
                    - generic [ref=e401]: 20:30
                  - cell [ref=e402]
                - row [ref=e403]:
                  - cell [ref=e404]
                  - cell [ref=e405]
                - row [ref=e406]:
                  - cell [ref=e407]:
                    - generic [ref=e409]: 21:00
                  - cell [ref=e410]
                - row [ref=e411]:
                  - cell [ref=e412]
                  - cell [ref=e413]
                - row [ref=e414]:
                  - cell [ref=e415]:
                    - generic [ref=e417]: 21:30
                  - cell [ref=e418]
                - row [ref=e419]:
                  - cell [ref=e420]
                  - cell [ref=e421]
                - row [ref=e422]:
                  - cell [ref=e423]:
                    - generic [ref=e425]: 22:00
                  - cell [ref=e426]
                - row [ref=e427]:
                  - cell [ref=e428]
                  - cell [ref=e429]
                - row [ref=e430]:
                  - cell [ref=e431]:
                    - generic [ref=e433]: 22:30
                  - cell [ref=e434]
                - row [ref=e435]:
                  - cell [ref=e436]
                  - cell [ref=e437]
                - row [ref=e438]:
                  - cell [ref=e439]:
                    - generic [ref=e441]: 23:00
                  - cell [ref=e442]
                - row [ref=e443]:
                  - cell [ref=e444]
                  - cell [ref=e445]
                - row [ref=e446]:
                  - cell [ref=e447]:
                    - generic [ref=e449]: 23:30
                  - cell [ref=e450]
                - row [ref=e451]:
                  - cell [ref=e452]
                  - cell [ref=e453]
            - 'row "#42 Implement login page Web App 09:00 – 11:00 (2h) Feature development #43 Review PR #78 Web App 14:00 – 15:30 (1h 30m) Code review #44 Sprint planning Internal 08:00 – 16:00 (8h)" [ref=e457]':
              - gridcell [ref=e460]
              - 'gridcell "#42 Implement login page Web App 09:00 – 11:00 (2h) Feature development #43 Review PR #78 Web App 14:00 – 15:30 (1h 30m) Code review" [ref=e463]':
                - generic [ref=e464]:
                  - generic:
                    - generic [ref=e468] [cursor=pointer]:
                      - generic [ref=e469]: "#42 Implement login page"
                      - generic [ref=e470]: Web App
                      - generic [ref=e471]: 09:00 – 11:00 (2h)
                      - generic [ref=e472]: Feature development
                    - generic [ref=e476] [cursor=pointer]:
                      - generic [ref=e477]: "#43 Review PR #78"
                      - generic [ref=e478]: Web App
                      - generic [ref=e479]: 14:00 – 15:30 (1h 30m)
                      - generic [ref=e480]: Code review
              - gridcell "#44 Sprint planning Internal 08:00 – 16:00 (8h)" [ref=e482]:
                - generic [ref=e487] [cursor=pointer]:
                  - generic [ref=e488]: "#44 Sprint planning"
                  - generic [ref=e489]: Internal
                  - generic [ref=e490]: 08:00 – 16:00 (8h)
              - gridcell [ref=e492]
              - gridcell [ref=e495]
  - dialog "Help" [ref=e498]:
    - generic [ref=e499]:
      - heading [level=2]
      - button "Close" [ref=e500] [cursor=pointer]: ✕
  - dialog "AI Assistant" [ref=e502]:
    - generic [ref=e504]:
      - heading [level=2]
      - button "Close" [ref=e505] [cursor=pointer]: ✕
    - generic [ref=e507]:
      - textbox [ref=e508]
      - button [ref=e509] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { setupConfig, mockRedmineApi, setupCredentials } from './helpers.js';
  3  | 
  4  | test.describe('Calendar page', () => {
  5  |   test.beforeEach(async ({ page }) => {
  6  |     await setupCredentials(page);
  7  |     await setupConfig(page);
  8  |     await mockRedmineApi(page);
  9  |     await page.goto('/index.html');
  10 |     await page.waitForSelector('.fc-event', { timeout: 10000 });
  11 |   });
  12 | 
  13 |   test('loads and displays time entries', async ({ page }) => {
  14 |     const events = page.locator('.fc-event');
  15 |     await expect(events.first()).toBeVisible();
  16 |   });
  17 | 
  18 |   test('displays week total in header', async ({ page }) => {
  19 |     const total = page.locator('#week-total');
  20 |     await expect(total).toBeVisible();
  21 |   });
  22 | 
  23 |   test('navigates to previous week', async ({ page }) => {
  24 |     const titleBefore = await page.locator('.fc-toolbar-title').textContent();
  25 |     await page.click('.fc-prev-button');
  26 |     const titleAfter = await page.locator('.fc-toolbar-title').textContent();
  27 |     expect(titleAfter).not.toBe(titleBefore);
  28 |   });
  29 | 
  30 |   test('navigates to next week', async ({ page }) => {
  31 |     const titleBefore = await page.locator('.fc-toolbar-title').textContent();
  32 |     await page.click('.fc-next-button');
  33 |     const titleAfter = await page.locator('.fc-toolbar-title').textContent();
  34 |     expect(titleAfter).not.toBe(titleBefore);
  35 |   });
  36 | 
  37 |   test('today button returns to current week', async ({ page }) => {
  38 |     await page.click('.fc-prev-button');
  39 |     await page.click('.fc-today-button');
  40 |     const todayCol = page.locator('.fc-day-today');
> 41 |     await expect(todayCol.first()).toBeVisible();
     |                                    ^ Error: expect(locator).toBeVisible() failed
  42 |   });
  43 | });
  44 | 
```