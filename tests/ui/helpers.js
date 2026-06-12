import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, '..', 'fixtures');
const cdnDir = resolve(fixturesDir, 'cdn');

function loadFixture(name) {
  return JSON.parse(readFileSync(resolve(fixturesDir, name), 'utf-8'));
}

// Patterns use unique substrings that survive version bumps.
// 'fullcalendar@6' matches fullcalendar@6.x.y but NOT @fullcalendar/core@6.x.y.
const cdnMap = {
  'fullcalendar@6': 'fullcalendar.min.js',
  'locales-all.global.min.js': 'fullcalendar-locales.min.js',
  'marked@': 'marked.min.js',
  dompurify: 'purify.min.js',
};

export async function mockCdn(page) {
  // Tests mock the entire network, so the production CSP and SRI integrity
  // attributes add no value here — and they actively break test runs:
  //  - SRI: mocked CDN fixtures don't match the committed integrity hashes,
  //    so the browser blocks marked/dompurify/FullCalendar/MSAL.
  //  - CSP: connect-src/default-src can block the same-origin mock proxy
  //    depending on whether the runner serves over HTTP or HTTPS.
  // Strip both from any served HTML document so behaviour is identical across
  // npx-serve (CI) and the HTTPS dev-server (local with certs).
  await page.route(
    (url) => url.pathname === '/' || url.pathname.endsWith('.html'),
    async (route) => {
      const resp = await route.fetch();
      const ct = resp.headers()['content-type'] || '';
      if (!ct.includes('text/html')) return route.fulfill({ response: resp });
      const body = (await resp.text())
        .replace(/<meta\s+http-equiv="Content-Security-Policy"[\s\S]*?\/>/i, '')
        .replace(/\s+integrity="[^"]*"/g, '')
        .replace(/\s+crossorigin="[^"]*"/g, '');
      await route.fulfill({ response: resp, body });
    }
  );

  await page.route('https://cdn.jsdelivr.net/npm/**', (route) => {
    const url = route.request().url();
    for (const [pattern, file] of Object.entries(cdnMap)) {
      if (url.includes(pattern)) {
        return route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: readFileSync(resolve(cdnDir, file)),
        });
      }
    }
    // Inline stubs for packages that have no fixture file.
    if (url.includes('msal-browser')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: 'window.msal = { PublicClientApplication: class { constructor() {} getAllAccounts() { return []; } } };',
      });
    }
    return route.continue();
  });
}

// A fixed Wednesday — a deterministic, always-visible workday. Tests whose
// assertions depend on the calendar's *current day* (the mobile day-view
// renders only today) freeze the clock here so the rendered DOM is identical
// on every run, regardless of the weekday the suite happens to execute on.
export const FAKE_TODAY = '2026-04-22';

// Pins the browser clock to FAKE_TODAY (noon) for every page navigation.
// MUST be called before the first goto so the init script is in place.
export async function freezeClock(page) {
  await page.addInitScript((iso) => {
    const fakeNow = new Date(iso).getTime();
    const OrigDate = Date;
    class FakeDate extends OrigDate {
      constructor(...args) {
        if (args.length === 0) super(fakeNow);
        else super(...args);
      }
      static now() {
        return fakeNow;
      }
    }
    window.Date = FakeDate;
  }, `${FAKE_TODAY}T12:00:00`);
}

// Overrides the time-entries list endpoint so every mock entry lands on
// FAKE_TODAY. Pair with freezeClock so the calendar's "today" matches the
// data. Register AFTER mockRedmineApi — the most-recent route handler wins.
export async function mockTodayEntries(page) {
  const timeEntries = loadFixture('api-responses/time-entries.json');
  // Land every entry on FAKE_TODAY at staggered, non-overlapping times.
  // Overlapping events split into cramped side-by-side columns on a narrow
  // mobile viewport, shrinking the issue-link tap targets below the WCAG
  // 2.5.8 (target-size) minimum; staggered times keep them full-width.
  const starts = ['09:00:00', '11:30:00', '14:00:00'];
  timeEntries.time_entries.forEach((e, i) => {
    e.spent_on = FAKE_TODAY;
    e.easy_time_from = starts[i % starts.length];
    e.hours = 2;
  });
  await page.route('**/mock-proxy/time_entries.json*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(timeEntries),
    })
  );
}

function currentWeekDates() {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((day + 6) % 7));
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { mon: fmt(mon), tue: fmt(new Date(mon.getTime() + 86400000)) };
}

export async function mockRedmineApi(page) {
  const timeEntries = loadFixture('api-responses/time-entries.json');
  const { mon, tue } = currentWeekDates();
  timeEntries.time_entries[0].spent_on = mon;
  timeEntries.time_entries[1].spent_on = mon;
  timeEntries.time_entries[2].spent_on = tue;
  const activities = loadFixture('api-responses/activities.json');
  const issues = loadFixture('api-responses/issues.json');
  const projects = loadFixture('api-responses/projects.json');
  const currentUser = loadFixture('api-responses/current-user.json');

  await page.route('**/mock-proxy/users/current.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(currentUser),
    })
  );

  await page.route('**/mock-proxy/time_entries.json*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(timeEntries),
    })
  );

  await page.route('**/mock-proxy/enumerations/time_entry_activities.json', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(activities),
    })
  );

  await page.route('**/mock-proxy/projects.json*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(projects) })
  );

  await page.route('**/mock-proxy/issues.json*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(issues) })
  );

  await page.route('**/mock-proxy/issues/*.json', (route) => {
    const id = parseInt(
      route
        .request()
        .url()
        .match(/issues\/(\d+)/)?.[1]
    );
    const issue = issues.issues.find((i) => i.id === id);
    if (issue) {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ issue }),
      });
    } else {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: '{"errors":["Not found"]}',
      });
    }
  });

  await page.route('**/mock-proxy/time_entries/*.json', async (route) => {
    const method = route.request().method();
    if (method === 'PUT') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ time_entry: timeEntries.time_entries[0] }),
      });
    } else if (method === 'DELETE') {
      route.fulfill({ status: 200 });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ time_entry: timeEntries.time_entries[0] }),
      });
    }
  });

  // POST new time entry
  await page.route('**/mock-proxy/time_entries.json', async (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ time_entry: { ...timeEntries.time_entries[0], id: 999 } }),
      });
    } else {
      route.continue();
    }
  });
}

export async function mockAiApi(page) {
  await page.route('**/mock-ai-proxy/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ content: [{ text: 'I can help you with RedmineCalendar!' }] }),
    })
  );
}

export async function setupConfig(page) {
  const config = loadFixture('config.json');
  await page.route('**/config.json', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(config) })
  );
}

export async function setupCredentials(page) {
  await mockCdn(page);
  await setupConfig(page);
  await mockRedmineApi(page);
  await page.goto('/settings.html');
  await page.fill('#apiKey', 'test-api-key-12345');
  await page.click('#save-btn');
  await page.waitForURL((url) => !url.pathname.includes('settings'), { timeout: 10000 });
}
