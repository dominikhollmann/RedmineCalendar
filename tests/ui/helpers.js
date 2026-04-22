import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, '..', 'fixtures');
const cdnDir = resolve(fixturesDir, 'cdn');

function loadFixture(name) {
  return JSON.parse(readFileSync(resolve(fixturesDir, name), 'utf-8'));
}

const cdnMap = {
  'fullcalendar@6/index.global.min.js': 'fullcalendar.min.js',
  '@fullcalendar/core@6/locales-all.global.min.js': 'fullcalendar-locales.min.js',
  'marked/marked.min.js': 'marked.min.js',
  'dompurify/dist/purify.min.js': 'purify.min.js',
};

export async function mockCdn(page) {
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
    return route.continue();
  });
}

function currentWeekDates() {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((day + 6) % 7));
  const fmt = d => d.toISOString().slice(0, 10);
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
  const currentUser = loadFixture('api-responses/current-user.json');

  await page.route('**/mock-proxy/users/current.json', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(currentUser) })
  );

  await page.route('**/mock-proxy/time_entries.json*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(timeEntries) })
  );

  await page.route('**/mock-proxy/enumerations/time_entry_activities.json', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(activities) })
  );

  await page.route('**/mock-proxy/issues.json*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(issues) })
  );

  await page.route('**/mock-proxy/issues/*.json', (route) => {
    const id = parseInt(route.request().url().match(/issues\/(\d+)/)?.[1]);
    const issue = issues.issues.find(i => i.id === id);
    if (issue) {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ issue }) });
    } else {
      route.fulfill({ status: 404, contentType: 'application/json', body: '{"errors":["Not found"]}' });
    }
  });

  await page.route('**/mock-proxy/time_entries/*.json', async (route) => {
    const method = route.request().method();
    if (method === 'PUT') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ time_entry: timeEntries.time_entries[0] }) });
    } else if (method === 'DELETE') {
      route.fulfill({ status: 200 });
    } else {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ time_entry: timeEntries.time_entries[0] }) });
    }
  });

  // POST new time entry
  await page.route('**/mock-proxy/time_entries.json', async (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ time_entry: { ...timeEntries.time_entries[0], id: 999 } }) });
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
  await page.waitForURL(url => !url.pathname.includes('settings'), { timeout: 10000 });
}
