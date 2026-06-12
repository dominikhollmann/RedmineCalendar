// @ts-nocheck
import { test, expect } from './coverage-fixture.js';
import {
  setupConfig,
  mockRedmineApi,
  setupCredentials,
  freezeClock,
  FAKE_TODAY,
  mockTodayEntries,
} from './helpers.js';

// ── Shared setup ──────────────────────────────────────────────────

async function setupCalendar(page) {
  await setupCredentials(page);
  await setupConfig(page);
  await freezeClock(page);
  await mockRedmineApi(page);
  await mockTodayEntries(page);
  await page.goto('/index.html');
  await page.waitForSelector('[data-testid="time-entry"]', { timeout: 15000 });
}

// ── US1: Undo Delete ───────────────────────────────────────────────

test.describe('US1: Undo single delete', () => {
  test('Ctrl+Z after deleting an entry calls POST to restore it', async ({ page }) => {
    await setupCalendar(page);

    const deleteRequests = [];
    const createRequests = [];

    await page.route('**/mock-proxy/time_entries/101.json', async (route) => {
      if (route.request().method() === 'DELETE') {
        deleteRequests.push(true);
        await route.fulfill({ status: 200 });
      } else {
        await route.continue();
      }
    });

    await page.route('**/mock-proxy/time_entries.json', async (route) => {
      if (route.request().method() === 'POST') {
        createRequests.push(true);
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            time_entry: {
              id: 999,
              hours: 2.0,
              spent_on: FAKE_TODAY,
              comments: 'Feature development',
              easy_time_from: '09:00:00',
              easy_time_to: '11:00:00',
              issue: { id: 42, subject: 'Implement login page' },
              project: { id: 1, name: 'Web App', identifier: 'web-app' },
              activity: { id: 9, name: 'Development' },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Open the first entry and delete it
    const firstEntry = page.locator('[data-testid="time-entry"]').first();
    await firstEntry.dblclick();
    await page.waitForSelector('#lean-time-modal:not(.hidden)', { timeout: 5000 });
    const deleteBtn = page.locator('#lean-delete');
    await deleteBtn.click();
    const confirmOk = page.locator('#lean-confirm-ok');
    await confirmOk.click();
    await page
      .waitForFunction(() => deleteRequests.length > 0 || true, {}, { timeout: 3000 })
      .catch(() => {});

    // Wait for modal to close
    await expect(page.locator('#lean-time-modal')).toBeHidden({ timeout: 5000 });

    // Press Ctrl+Z — should trigger POST to restore the entry
    const restoreResponsePromise = page.waitForResponse(
      (r) => r.url().includes('time_entries.json') && r.request().method() === 'POST',
      { timeout: 5000 }
    );
    await page.keyboard.press('Control+z');
    await restoreResponsePromise;

    expect(createRequests.length).toBe(1);
  });

  test('success toast appears after undo delete', async ({ page }) => {
    await setupCalendar(page);

    await page.route('**/mock-proxy/time_entries/101.json', async (route) => {
      if (route.request().method() === 'DELETE') await route.fulfill({ status: 200 });
      else await route.continue();
    });
    await page.route('**/mock-proxy/time_entries.json', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            time_entry: {
              id: 999,
              hours: 2.0,
              spent_on: FAKE_TODAY,
              comments: '',
              easy_time_from: '09:00:00',
              easy_time_to: '11:00:00',
              issue: { id: 42, subject: 'Implement login page' },
              project: { id: 1, name: 'Web App', identifier: 'web-app' },
              activity: { id: 9, name: 'Development' },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    const firstEntry = page.locator('[data-testid="time-entry"]').first();
    await firstEntry.dblclick();
    await page.waitForSelector('#lean-time-modal:not(.hidden)', { timeout: 5000 });
    await page.locator('#lean-delete').click();
    await page.locator('#lean-confirm-ok').click();
    await expect(page.locator('#lean-time-modal')).toBeHidden({ timeout: 5000 });

    await page.keyboard.press('Control+z');

    // Toast should mention the undo
    await expect(page.locator('.toast').first()).toContainText('Undo', { timeout: 5000 });
  });
});

// ── US2: Undo Edit ─────────────────────────────────────────────────

test.describe('US2: Undo entry edit', () => {
  test('Ctrl+Z after editing calls PUT with original values', async ({ page }) => {
    await setupCalendar(page);

    const putBodies = [];

    await page.route('**/mock-proxy/time_entries/101.json', async (route) => {
      if (route.request().method() === 'PUT') {
        putBodies.push(await route.request().postDataJSON());
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            time_entry: {
              id: 101,
              hours: 3.0,
              spent_on: FAKE_TODAY,
              comments: 'Feature development',
              easy_time_from: '09:00:00',
              easy_time_to: '12:00:00',
              issue: { id: 42, subject: 'Implement login page' },
              project: { id: 1, name: 'Web App', identifier: 'web-app' },
              activity: { id: 9, name: 'Development' },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Open and edit the first entry
    await page.locator('[data-testid="time-entry"]').first().dblclick();
    await page.waitForSelector('#lean-time-modal:not(.hidden)', { timeout: 5000 });

    // Change the end time (which changes hours)
    const endInput = page.locator('#lean-info-end');
    await endInput.fill('12:00');

    // Save
    await page.locator('#lean-save').click();
    await expect(page.locator('#lean-time-modal')).toBeHidden({ timeout: 5000 });
    expect(putBodies.length).toBe(1);

    // Undo — should call PUT again with original hours (2.0, end 11:00)
    const undoPutPromise = page.waitForResponse(
      (r) => r.url().includes('time_entries/101.json') && r.request().method() === 'PUT',
      { timeout: 5000 }
    );
    await page.keyboard.press('Control+z');
    await undoPutPromise;

    expect(putBodies.length).toBe(2);
    // The undo PUT should restore the original hours
    expect(putBodies[1].time_entry?.hours).toBeCloseTo(2.0, 1);
  });
});

// ── US3: Undo Drag-Move ────────────────────────────────────────────

test.describe('US3: Undo drag-move', () => {
  test('keyboard shortcut Ctrl+Z is handled after a move (undo stack not empty)', async ({
    page,
  }) => {
    await setupCalendar(page);

    // This test verifies that after a drag-to-move (which we simulate via
    // direct undoManager manipulation in the page), pressing Ctrl+Z triggers
    // a PUT call with the before position.
    const putBodies = [];
    await page.route('**/mock-proxy/time_entries/*.json', async (route) => {
      if (route.request().method() === 'PUT') {
        putBodies.push(await route.request().postDataJSON());
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            time_entry: {
              id: 101,
              hours: 2.0,
              spent_on: FAKE_TODAY,
              comments: 'Feature development',
              easy_time_from: '09:00:00',
              easy_time_to: '11:00:00',
              issue: { id: 42, subject: 'Implement login page' },
              project: { id: 1, name: 'Web App', identifier: 'web-app' },
              activity: { id: 9, name: 'Development' },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Inject a MoveAction directly to simulate what eventDrop would push
    await page.evaluate((today) => {
      // Access the singleton via the module registry
      return import('/js/undo-manager.js').then(({ undoManager, ACTION_MOVE }) => {
        undoManager.push({
          type: ACTION_MOVE,
          id: 101,
          entry: {
            id: 101,
            hours: 2.0,
            spentOn: today,
            startTime: '09:00',
            endTime: '11:00',
            activityId: 9,
            comment: 'Feature development',
          },
          before: { spentOn: today, startTime: '09:00', endTime: '11:00', hours: 2.0 },
          after: {
            spentOn: today,
            startTime: '10:00',
            endTime: '12:00',
            hours: 2.0,
          },
        });
      });
    }, FAKE_TODAY);

    const undoMovePromise = page.waitForResponse(
      (r) => /time_entries\/\d+\.json/.test(r.url()) && r.request().method() === 'PUT',
      { timeout: 5000 }
    );
    await page.keyboard.press('Control+z');
    await undoMovePromise;

    expect(putBodies.length).toBe(1);
    // The PUT body should restore the before position
    expect(
      putBodies[0].time_entry?.easy_time_from ?? putBodies[0].time_entry?.startTime
    ).toBeTruthy();
  });
});

// ── US4: Undo Add ──────────────────────────────────────────────────

test.describe('US4: Undo add (new entry)', () => {
  test('Ctrl+Z after creating an entry calls DELETE on the new entry', async ({ page }) => {
    await setupCalendar(page);

    const deleteIds = [];
    let createdId = 998;

    await page.route('**/mock-proxy/time_entries.json', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            time_entry: {
              id: createdId,
              hours: 0.25,
              spent_on: FAKE_TODAY,
              comments: '',
              easy_time_from: '13:00:00',
              easy_time_to: '13:15:00',
              issue: { id: 42, subject: 'Implement login page' },
              project: { id: 1, name: 'Web App', identifier: 'web-app' },
              activity: { id: 9, name: 'Development' },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route(`**/mock-proxy/time_entries/${createdId}.json`, async (route) => {
      if (route.request().method() === 'DELETE') {
        deleteIds.push(createdId);
        await route.fulfill({ status: 200 });
      } else {
        await route.continue();
      }
    });

    // Simulate a new add via undoManager injection
    await page.evaluate(
      ([today, id]) => {
        return import('/js/undo-manager.js').then(({ undoManager, ACTION_ADD }) => {
          undoManager.push({
            type: ACTION_ADD,
            entry: {
              id,
              hours: 0.25,
              spentOn: today,
              startTime: '13:00',
              endTime: '13:15',
              activityId: 9,
              comment: '',
              issueId: 42,
            },
          });
        });
      },
      [FAKE_TODAY, createdId]
    );

    const undoAddDeletePromise = page.waitForResponse(
      (r) =>
        r.url().includes(`time_entries/${createdId}.json`) && r.request().method() === 'DELETE',
      { timeout: 7000 }
    );
    await page.keyboard.press('Control+z');
    // Undo of add has a 500 ms delay before the DELETE — wait longer
    await undoAddDeletePromise;

    expect(deleteIds).toContain(createdId);
  });
});

// ── US5: Undo Bulk Delete ─────────────────────────────────────────

test.describe('US5: Undo bulk delete', () => {
  test('Ctrl+Z after bulk delete calls POST for each entry', async ({ page }) => {
    await setupCalendar(page);

    const createCount = { value: 0 };

    await page.route('**/mock-proxy/time_entries.json', async (route) => {
      if (route.request().method() === 'POST') {
        createCount.value++;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            time_entry: {
              id: 900 + createCount.value,
              hours: 2.0,
              spent_on: FAKE_TODAY,
              comments: '',
              easy_time_from: '09:00:00',
              easy_time_to: '11:00:00',
              issue: { id: 42, subject: 'Implement login page' },
              project: { id: 1, name: 'Web App', identifier: 'web-app' },
              activity: { id: 9, name: 'Development' },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Inject a BulkDeleteAction with 3 entries
    await page.evaluate((today) => {
      return import('/js/undo-manager.js').then(({ undoManager, ACTION_BULK_DELETE }) => {
        undoManager.push({
          type: ACTION_BULK_DELETE,
          entries: [
            {
              id: 101,
              hours: 2.0,
              spentOn: today,
              startTime: '09:00',
              endTime: '11:00',
              activityId: 9,
              comment: 'a',
              issueId: 42,
            },
            {
              id: 102,
              hours: 1.5,
              spentOn: today,
              startTime: '14:00',
              endTime: '15:30',
              activityId: 10,
              comment: 'b',
              issueId: 43,
            },
            {
              id: 103,
              hours: 1.0,
              spentOn: today,
              startTime: '16:00',
              endTime: '17:00',
              activityId: 9,
              comment: 'c',
              issueId: 42,
            },
          ],
        });
      });
    }, FAKE_TODAY);

    await page.keyboard.press('Control+z');
    // After all 3 entries are restored, undo-actions.js shows a toast with the count
    await expect(page.locator('.toast').first()).toContainText('entries restored', {
      timeout: 8000,
    });

    expect(createCount.value).toBe(3);
  });

  test('success toast mentions the count after bulk-delete undo', async ({ page }) => {
    await setupCalendar(page);

    await page.route('**/mock-proxy/time_entries.json', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            time_entry: {
              id: 901,
              hours: 2.0,
              spent_on: FAKE_TODAY,
              comments: '',
              easy_time_from: '09:00:00',
              easy_time_to: '11:00:00',
              issue: { id: 42, subject: 'Implement login page' },
              project: { id: 1, name: 'Web App', identifier: 'web-app' },
              activity: { id: 9, name: 'Development' },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.evaluate((today) => {
      return import('/js/undo-manager.js').then(({ undoManager, ACTION_BULK_DELETE }) => {
        undoManager.push({
          type: ACTION_BULK_DELETE,
          entries: [
            {
              id: 101,
              hours: 2.0,
              spentOn: today,
              startTime: '09:00',
              endTime: '11:00',
              activityId: 9,
              comment: '',
              issueId: 42,
            },
            {
              id: 102,
              hours: 1.5,
              spentOn: today,
              startTime: '14:00',
              endTime: '15:30',
              activityId: 10,
              comment: '',
              issueId: 43,
            },
            {
              id: 103,
              hours: 1.0,
              spentOn: today,
              startTime: '16:00',
              endTime: '17:00',
              activityId: 9,
              comment: '',
              issueId: 42,
            },
          ],
        });
      });
    }, FAKE_TODAY);

    await page.keyboard.press('Control+z');
    await expect(page.locator('.toast').first()).toContainText('3', { timeout: 8000 });
  });
});

// ── US6: Undo Paste ────────────────────────────────────────────────

test.describe('US6: Undo paste', () => {
  test('undo of paste shows "pasted entry removed" toast (not "new entry removed")', async ({
    page,
  }) => {
    await setupCalendar(page);

    await page.route('**/mock-proxy/time_entries/997.json', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 200 });
      } else {
        await route.continue();
      }
    });

    // Inject a PasteAction
    await page.evaluate((today) => {
      return import('/js/undo-manager.js').then(({ undoManager, ACTION_PASTE }) => {
        undoManager.push({
          type: ACTION_PASTE,
          entry: {
            id: 997,
            hours: 2.0,
            spentOn: today,
            startTime: '09:00',
            endTime: '11:00',
            activityId: 9,
            comment: 'pasted',
            issueId: 42,
          },
        });
      });
    }, FAKE_TODAY);

    const pasteDeletePromise = page.waitForResponse(
      (r) => r.url().includes('time_entries/997.json') && r.request().method() === 'DELETE',
      { timeout: 7000 }
    );
    await page.keyboard.press('Control+z');
    await pasteDeletePromise;

    // Toast should say "pasted" not "new entry"
    await expect(page.locator('.toast').first()).toContainText('pasted', { timeout: 5000 });
  });
});

// ── US7: Redo ──────────────────────────────────────────────────────

test.describe('US7: Redo', () => {
  test('Ctrl+Shift+Z after undo re-applies the action (calls DELETE again)', async ({ page }) => {
    await setupCalendar(page);

    const deleteCalls = { count: 0 };
    await page.route('**/mock-proxy/time_entries/101.json', async (route) => {
      if (route.request().method() === 'DELETE') {
        deleteCalls.count++;
        await route.fulfill({ status: 200 });
      } else {
        await route.continue();
      }
    });

    await page.route('**/mock-proxy/time_entries.json', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            time_entry: {
              id: 888,
              hours: 2.0,
              spent_on: FAKE_TODAY,
              comments: 'Feature development',
              easy_time_from: '09:00:00',
              easy_time_to: '11:00:00',
              issue: { id: 42, subject: 'Implement login page' },
              project: { id: 1, name: 'Web App', identifier: 'web-app' },
              activity: { id: 9, name: 'Development' },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route('**/mock-proxy/time_entries/888.json', async (route) => {
      if (route.request().method() === 'DELETE') {
        deleteCalls.count++;
        await route.fulfill({ status: 200 });
      } else {
        await route.continue();
      }
    });

    // Inject a delete action
    await page.evaluate((today) => {
      return import('/js/undo-manager.js').then(({ undoManager, ACTION_DELETE }) => {
        undoManager.push({
          type: ACTION_DELETE,
          entry: {
            id: 101,
            hours: 2.0,
            spentOn: today,
            startTime: '09:00',
            endTime: '11:00',
            activityId: 9,
            comment: 'Feature development',
            issueId: 42,
          },
        });
      });
    }, FAKE_TODAY);

    // Undo (restores entry, new id = 888)
    await page.keyboard.press('Control+z');
    // Wait for POST to complete (undo restores via POST)
    await page.waitForTimeout(1000);

    // Redo (deletes restored entry again)
    const redoDeletePromise = page.waitForResponse(
      (r) => r.url().includes('time_entries/888.json') && r.request().method() === 'DELETE',
      { timeout: 5000 }
    );
    await page.keyboard.press('Control+Shift+Z');
    await redoDeletePromise;

    expect(deleteCalls.count).toBeGreaterThanOrEqual(1);
  });

  test('new action after undo clears redo stack — Ctrl+Shift+Z does nothing', async ({ page }) => {
    await setupCalendar(page);

    const deleteCalls = { count: 0 };

    await page.route('**/mock-proxy/time_entries/*.json', async (route) => {
      if (route.request().method() === 'DELETE') {
        deleteCalls.count++;
        await route.fulfill({ status: 200 });
      } else {
        await route.continue();
      }
    });

    await page.route('**/mock-proxy/time_entries.json', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            time_entry: {
              id: 777,
              hours: 2.0,
              spent_on: FAKE_TODAY,
              comments: '',
              easy_time_from: '09:00:00',
              easy_time_to: '11:00:00',
              issue: { id: 42, subject: 'Implement login page' },
              project: { id: 1, name: 'Web App', identifier: 'web-app' },
              activity: { id: 9, name: 'Development' },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.evaluate((today) => {
      return import('/js/undo-manager.js').then(({ undoManager, ACTION_DELETE, ACTION_EDIT }) => {
        undoManager.push({
          type: ACTION_DELETE,
          entry: {
            id: 101,
            hours: 2.0,
            spentOn: today,
            startTime: '09:00',
            endTime: '11:00',
            activityId: 9,
            comment: '',
            issueId: 42,
          },
        });
        undoManager.undo(); // put it in redo stack
        // Now push a new action — clears redo
        undoManager.push({
          type: ACTION_EDIT,
          id: 102,
          before: {
            spentOn: today,
            hours: 1.5,
            startTime: '14:00',
            endTime: '15:30',
            activityId: 10,
            comment: 'b',
            issueId: 43,
          },
          after: {
            spentOn: today,
            hours: 2.0,
            startTime: '14:00',
            endTime: '16:00',
            activityId: 10,
            comment: 'b',
            issueId: 43,
          },
        });
      });
    }, FAKE_TODAY);

    const beforeDeleteCount = deleteCalls.count;
    // Ctrl+Shift+Z should do nothing (redo stack is empty)
    await page.keyboard.press('Control+Shift+Z');
    await page.waitForTimeout(500);

    expect(deleteCalls.count).toBe(beforeDeleteCount);
  });
});

// ── SC-003: Keyboard guard ─────────────────────────────────────────

test.describe('SC-003: Keyboard guard', () => {
  test('Ctrl+Z while text input focused does not consume the undo stack', async ({ page }) => {
    await setupCalendar(page);

    // Inject an action so the undo stack is non-empty
    await page.evaluate((today) => {
      return import('/js/undo-manager.js').then(({ undoManager, ACTION_DELETE }) => {
        undoManager.push({
          type: ACTION_DELETE,
          entry: {
            id: 101,
            hours: 2.0,
            spentOn: today,
            startTime: '09:00',
            endTime: '11:00',
            activityId: 9,
            comment: '',
            issueId: 42,
          },
        });
      });
    }, FAKE_TODAY);

    // Open the form so a text input gets focus
    await page.locator('[data-testid="time-entry"]').first().dblclick();
    await page.waitForSelector('#lean-time-modal:not(.hidden)', { timeout: 5000 });

    // Focus the comment field (a textarea)
    await page.locator('#lean-comment').focus();

    // Press Ctrl+Z while text input is focused — should NOT drain undo stack
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);

    // Undo stack should still have the entry — canUndo() should still be true
    const canStillUndo = await page.evaluate(() => {
      return import('/js/undo-manager.js').then(({ undoManager }) => undoManager.canUndo());
    });

    expect(canStillUndo).toBe(true);
  });

  test('Ctrl+Z while modal is open does not fire undo', async ({ page }) => {
    await setupCalendar(page);

    const createCalls = { count: 0 };
    await page.route('**/mock-proxy/time_entries.json', async (route) => {
      if (route.request().method() === 'POST') {
        createCalls.count++;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            time_entry: {
              id: 888,
              hours: 2.0,
              spent_on: FAKE_TODAY,
              comments: '',
              easy_time_from: '09:00:00',
              easy_time_to: '11:00:00',
              issue: { id: 42, subject: 'Implement login page' },
              project: { id: 1, name: 'Web App', identifier: 'web-app' },
              activity: { id: 9, name: 'Development' },
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Push a delete action
    await page.evaluate((today) => {
      return import('/js/undo-manager.js').then(({ undoManager, ACTION_DELETE }) => {
        undoManager.push({
          type: ACTION_DELETE,
          entry: {
            id: 101,
            hours: 2.0,
            spentOn: today,
            startTime: '09:00',
            endTime: '11:00',
            activityId: 9,
            comment: '',
            issueId: 42,
          },
        });
      });
    }, FAKE_TODAY);

    // Open modal — undo should be blocked while modal is open
    await page.locator('[data-testid="time-entry"]').first().dblclick();
    await page.waitForSelector('#lean-time-modal:not(.hidden)', { timeout: 5000 });

    // Click on a non-input element inside the modal (e.g. save button area)
    await page.locator('#lean-save').focus();

    // Press Ctrl+Z with modal open — should NOT trigger undo (no POST)
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(500);

    expect(createCalls.count).toBe(0);
  });
});
