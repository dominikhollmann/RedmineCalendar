import { readFileSync } from 'fs';
import { resolve } from 'path';

const fixturesDir = resolve(import.meta.dirname, '..', 'fixtures');

function loadFixture(name) {
  return JSON.parse(readFileSync(resolve(fixturesDir, name), 'utf-8'));
}

export async function mockRedmineApi(page) {
  const timeEntries = loadFixture('api-responses/time-entries.json');
  const activities = loadFixture('api-responses/activities.json');
  const issues = loadFixture('api-responses/issues.json');
  const currentUser = loadFixture('api-responses/current-user.json');

  await page.route('**/proxy/users/current.json', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(currentUser) })
  );

  await page.route('**/proxy/time_entries.json*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(timeEntries) })
  );

  await page.route('**/proxy/enumerations/time_entry_activities.json', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(activities) })
  );

  await page.route('**/proxy/issues.json*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(issues) })
  );

  await page.route('**/proxy/issues/*.json', (route) => {
    const id = parseInt(route.request().url().match(/issues\/(\d+)/)?.[1]);
    const issue = issues.issues.find(i => i.id === id);
    if (issue) {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ issue }) });
    } else {
      route.fulfill({ status: 404, contentType: 'application/json', body: '{"errors":["Not found"]}' });
    }
  });

  await page.route('**/proxy/time_entries/*.json', async (route) => {
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
  await page.route('**/proxy/time_entries.json', async (route) => {
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
  await page.evaluate(() => {
    const creds = JSON.stringify({ authType: 'apikey', apiKey: 'test-api-key-12345' });
    const fakeEncrypted = JSON.stringify({ iv: btoa('fake-iv-1234'), ciphertext: btoa(creds) });
    localStorage.setItem('redmine_calendar_credentials', fakeEncrypted);
  });
}
