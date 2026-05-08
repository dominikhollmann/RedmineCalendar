# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: project-display.spec.js >> Project Display and Search >> calendar events show project identifier and name
- Location: tests/ui/project-display.spec.js:25:3

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "Web App"
Received string:    "internal — Internal"
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - heading "Redmine Calendar" [level=1] [ref=e3]
    - generic [ref=e4]: 11h 30m total
    - button "Help" [ref=e5] [cursor=pointer]: "?"
    - button "AI Chat" [ref=e6] [cursor=pointer]: ✨
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
      - heading "May 4 – 8, 2026" [level=2] [ref=e18]
      - generic [ref=e19]:
        - button "Only show working hours":
          - generic: Only show working hours
        - button "Only show Mo–Fr" [ref=e20] [cursor=pointer]:
          - generic [ref=e21]: Only show Mo–Fr
    - generic "May 4 – 8, 2026" [ref=e24]:
      - grid [ref=e26]:
        - rowgroup [ref=e27]:
          - row "May 4, 2026 May 5, 2026 May 6, 2026 May 7, 2026 May 8, 2026 ▶" [ref=e32]:
            - columnheader "May 4, 2026" [ref=e33]:
              - generic "May 4, 2026" [ref=e35]:
                - generic [ref=e36]:
                  - generic [ref=e37]: Mon, 5/4
                  - generic [ref=e38]:
                    - generic [ref=e39] [cursor=pointer]: ⚠
                    - text: 8h
            - columnheader "May 5, 2026" [ref=e40]:
              - generic "May 5, 2026" [ref=e42]:
                - generic [ref=e44]: Tue, 5/5
            - columnheader "May 6, 2026" [ref=e45]:
              - generic "May 6, 2026" [ref=e47]:
                - generic [ref=e49]: Wed, 5/6
            - columnheader "May 7, 2026" [ref=e50]:
              - generic "May 7, 2026" [ref=e52]:
                - generic [ref=e54]: Thu, 5/7
            - columnheader "May 8, 2026 ▶" [ref=e55]:
              - generic "May 8, 2026" [ref=e57]:
                - generic [ref=e59]: Fri, 5/8
              - button "▶" [ref=e60] [cursor=pointer]
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
            - row "#44 Sprint planning internal — Internal 08:00 – 16:00 (8h)" [ref=e457]:
              - gridcell "#44 Sprint planning internal — Internal 08:00 – 16:00 (8h)" [ref=e460]:
                - generic [ref=e465] [cursor=pointer]:
                  - generic "#44 Sprint planning" [ref=e466]:
                    - link "#44 Sprint planning" [ref=e467]:
                      - /url: https://redmine.test.example.com/issues/44
                  - generic "internal — Internal" [ref=e468]
                  - generic [ref=e469]: 08:00 – 16:00 (8h)
              - gridcell [ref=e471]
              - gridcell [ref=e474]
              - gridcell [ref=e477]
              - gridcell [ref=e480]
  - dialog "Help" [ref=e483]:
    - generic [ref=e485]:
      - heading [level=2]
      - button "Close" [ref=e486] [cursor=pointer]: ✕
  - dialog "AI Assistant" [ref=e488]:
    - generic [ref=e490]:
      - heading [level=2]
      - button "Close" [ref=e491] [cursor=pointer]: ✕
    - generic [ref=e493]:
      - textbox [ref=e494]
      - button [ref=e495] [cursor=pointer]
```

# Test source

```ts
  1   | import { test, expect } from './coverage-fixture.js';
  2   | import { setupCredentials, mockCdn, setupConfig, mockRedmineApi } from './helpers.js';
  3   | import { readFileSync } from 'fs';
  4   | import { resolve, dirname } from 'path';
  5   | import { fileURLToPath } from 'url';
  6   | 
  7   | const __dirname = dirname(fileURLToPath(import.meta.url));
  8   | 
  9   | function currentWeekDates() {
  10  |   const now = new Date();
  11  |   const day = now.getDay();
  12  |   const mon = new Date(now);
  13  |   mon.setDate(now.getDate() - ((day + 6) % 7));
  14  |   const fmt = d => d.toISOString().slice(0, 10);
  15  |   return { mon: fmt(mon) };
  16  | }
  17  | 
  18  | test.describe('Project Display and Search', () => {
  19  |   test.beforeEach(async ({ page }) => {
  20  |     await setupCredentials(page);
  21  |     await setupConfig(page);
  22  |     await mockRedmineApi(page);
  23  |   });
  24  | 
  25  |   test('calendar events show project identifier and name', async ({ page }) => {
  26  |     await page.goto('/index.html');
  27  |     await page.waitForSelector('.fc-event', { timeout: 10000 });
  28  |     const projectText = await page.locator('.ev-project').first().textContent();
  29  |     expect(projectText).toContain('\u2014');
> 30  |     expect(projectText).toContain('Web App');
      |                         ^ Error: expect(received).toContain(expected) // indexOf
  31  |   });
  32  | 
  33  |   test('search results show project identifier', async ({ page }) => {
  34  |     await page.goto('/index.html');
  35  |     await page.waitForSelector('.fc-event', { timeout: 10000 });
  36  |     await page.locator('.fc-event').first().dblclick();
  37  |     await page.waitForSelector('#lean-time-modal', { timeout: 5000 });
  38  | 
  39  |     const searchInput = page.locator('#lean-search');
  40  |     await searchInput.fill('Implement');
  41  |     await page.waitForTimeout(1000);
  42  | 
  43  |     const projectSpan = page.locator('.lean-row-project').first();
  44  |     await expect(projectSpan).toBeVisible({ timeout: 5000 });
  45  |     const text = await projectSpan.textContent();
  46  |     expect(text).toContain('web-app');
  47  |   });
  48  | 
  49  |   test('fallback: shows name only when no identifier', async ({ page }) => {
  50  |     const { mon } = currentWeekDates();
  51  |     await page.route('**/mock-proxy/time_entries.json*', (route) => {
  52  |       const entries = {
  53  |         time_entries: [{
  54  |           id: 200, hours: 1.0, spent_on: mon,
  55  |           comments: 'Test', easy_time_from: '09:00:00', easy_time_to: '10:00:00',
  56  |           issue: { id: 99, subject: 'No-ID project task' },
  57  |           project: { id: 5, name: 'Legacy Project' },
  58  |           activity: { id: 9, name: 'Development' },
  59  |         }],
  60  |         total_count: 1, offset: 0, limit: 100,
  61  |       };
  62  |       route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(entries) });
  63  |     });
  64  |     await page.goto('/index.html');
  65  |     await page.waitForSelector('.fc-event', { timeout: 10000 });
  66  |     const projectText = await page.locator('.ev-project').first().textContent();
  67  |     expect(projectText).toBe('Legacy Project');
  68  |     expect(projectText).not.toContain('null');
  69  |   });
  70  | 
  71  |   test('mobile viewport shows project info', async ({ page, context }) => {
  72  |     await context.addInitScript(() => {
  73  |       const fakeNow = new Date('2026-04-22T12:00:00').getTime();
  74  |       const OrigDate = Date;
  75  |       class FakeDate extends OrigDate {
  76  |         constructor(...args) { if (args.length === 0) super(fakeNow); else super(...args); }
  77  |         static now() { return fakeNow; }
  78  |       }
  79  |       window.Date = FakeDate;
  80  |     });
  81  |     await page.setViewportSize({ width: 375, height: 812 });
  82  |     const wed = '2026-04-22';
  83  |     await page.route('**/mock-proxy/time_entries.json*', (route) => {
  84  |       const entries = {
  85  |         time_entries: [{
  86  |           id: 101, hours: 2.0, spent_on: wed,
  87  |           comments: '', easy_time_from: '09:00:00', easy_time_to: '11:00:00',
  88  |           issue: { id: 42, subject: 'Test' },
  89  |           project: { id: 1, name: 'Web App', identifier: 'web-app' },
  90  |           activity: { id: 9, name: 'Development' },
  91  |         }],
  92  |         total_count: 1, offset: 0, limit: 100,
  93  |       };
  94  |       route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(entries) });
  95  |     });
  96  |     await page.goto('/index.html');
  97  |     await page.waitForSelector('.fc-event', { timeout: 10000 });
  98  |     const projectEl = page.locator('.ev-project').first();
  99  |     await expect(projectEl).toBeVisible();
  100 |   });
  101 | });
  102 | 
```