import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────
vi.mock('../../js/i18n.js', () => ({
  t: vi.fn((key, vars = {}) => {
    if (key === 'entry.fallback_subject') return `Issue #${vars.id}`;
    return key;
  }),
  locale: 'en',
  formatDate: vi.fn((d) => d),
}));

const _config = {
  breakTicket: 998,
  redmineServerUrl: 'https://redmine.example.com',
  redmineAcceptsZeroHours: false,
};

vi.mock('../../js/settings.js', () => ({
  getCentralConfigSync: vi.fn(() => _config),
  readWorkingHours: vi.fn(() => null),
  readWeeklyHours: vi.fn(() => 40),
  readCredentials: vi.fn(async () => ({ apiKey: 'k', authType: 'apiKey' })),
}));

vi.mock('../../js/config-store.js', () => ({
  getCentralConfigSync: vi.fn(() => _config),
}));

vi.mock('../../js/redmine-api.js', () => ({
  getTimeEntryActivities: vi.fn(async () => [
    { id: 9, name: 'Default', isDefault: true },
    { id: 10, name: 'Other', isDefault: false },
  ]),
  searchIssues: vi.fn(async () => []),
  fetchIssueById: vi.fn(),
  resolveIssueSubject: vi.fn(),
  enrichEntries: vi.fn(),
  createTimeEntry: vi.fn(async (payload) => ({ id: 1234, ...payload })),
  updateTimeEntry: vi.fn(async (id, payload) => ({ id, ...payload })),
  deleteTimeEntry: vi.fn(async () => true),
  fetchProjects: vi.fn(),
  formatProject: vi.fn((id, name) => (id ? (name ? `${id} — ${name}` : id) : (name ?? ''))),
}));

// ─── DOM element factory ──────────────────────────────────────────
function makeEl(extra = {}) {
  const classes = new Set();
  const listeners = {};
  const el = {
    value: '',
    textContent: '',
    innerHTML: '',
    disabled: false,
    style: {},
    title: '',
    href: '',
    target: '',
    rel: '',
    dataset: {},
    children: [],
    classList: {
      add: vi.fn((...names) => names.forEach((n) => classes.add(n))),
      remove: vi.fn((...names) => names.forEach((n) => classes.delete(n))),
      toggle: vi.fn((name, force) => {
        const has = classes.has(name);
        const shouldHave = force === undefined ? !has : !!force;
        if (shouldHave) classes.add(name);
        else classes.delete(name);
      }),
      contains: vi.fn((n) => classes.has(n)),
    },
    setAttribute: vi.fn(function (name, val) {
      this[name] = val;
    }),
    removeAttribute: vi.fn(),
    getAttribute: vi.fn(function (name) {
      return this[name];
    }),
    addEventListener: vi.fn((evt, fn) => {
      (listeners[evt] ||= []).push(fn);
    }),
    removeEventListener: vi.fn((evt, fn) => {
      const arr = listeners[evt];
      if (!arr) return;
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    }),
    dispatch(evt, payload = {}) {
      (listeners[evt] || []).forEach((fn) => fn(payload));
    },
    appendChild: vi.fn(function (child) {
      this.children.push(child);
      return child;
    }),
    append: vi.fn(function (...kids) {
      this.children.push(...kids);
    }),
    querySelectorAll: vi.fn(() => []),
    querySelector: vi.fn(() => null),
    contains: vi.fn(() => false),
    remove: vi.fn(),
    focus: vi.fn(),
    select: vi.fn(),
    scrollIntoView: vi.fn(),
    click: vi.fn(),
    onclick: null,
    _classes: classes,
    _listeners: listeners,
    ...extra,
  };
  return el;
}

// ─── Element registry (built ONCE; reset state between tests) ─────
const registry = {};
const ELEMENT_IDS = [
  'lean-confirm-modal',
  'lean-error',
  'lean-search',
  'lean-search-results',
  'lean-ticket-info',
  'lean-ticket-idtitle',
  'lean-ticket-proj',
  'lean-info-date',
  'lean-info-start',
  'lean-info-end',
  'lean-info-dur',
  'lean-list-lastused',
  'lean-lastused-empty',
  'lean-list-favs',
  'lean-favs-empty',
  'lean-save',
  'lean-cancel',
  'lean-delete',
  'lean-confirm-cancel',
  'lean-confirm-ok',
  'lean-comment',
];

function buildRegistry() {
  ELEMENT_IDS.forEach((id) => {
    registry[id] = makeEl();
  });
  registry['lean-confirm-modal'].contains = vi.fn(() => false);
}

function resetRegistryState() {
  // Wipe each element's value/textContent/innerHTML/_classes so tests see a
  // clean DOM, but PRESERVE listeners (the module wires them once via
  // ensureModal and they must survive across tests on the same element refs).
  Object.values(registry).forEach((el) => {
    if (!el) return;
    el.value = '';
    el.textContent = '';
    el.innerHTML = '';
    el.disabled = false;
    el.style = {};
    el.title = '';
    el.children = [];
    if (el._classes) el._classes.clear();
    el.appendChild.mockClear?.();
    el.append?.mockClear?.();
    el.classList.add.mockClear?.();
    el.classList.remove.mockClear?.();
    el.classList.toggle.mockClear?.();
    el.onclick = null;
  });
  // Reset modal querySelectorAll so tests that override it don't pollute each other
  if (registry['lean-time-modal']) {
    registry['lean-time-modal'].querySelectorAll = vi.fn(() => []);
  }
  // sane defaults
  registry['lean-info-date'].value = '2026-05-09';
  registry['lean-info-start'].value = '09:00';
  registry['lean-info-end'].value = '10:00';
}

// Document setup
buildRegistry();
global.document.getElementById = vi.fn((id) => registry[id] ?? null);
global.document.querySelector = vi.fn(() => null);
global.document.querySelectorAll = vi.fn(() => []);
global.document.addEventListener = vi.fn();
global.document.removeEventListener = vi.fn();
global.document.createElement = vi.fn((tag) => makeEl({ tagName: tag.toUpperCase() }));
global.document.body = {
  appendChild: vi.fn(),
  removeChild: vi.fn(),
  classList: { add: vi.fn(), remove: vi.fn() },
  // First ensureModal() call goes through this path; create the modal element
  // so the listener wiring after this line in ensureModal can attach to it.
  insertAdjacentHTML: vi.fn(() => {
    if (!registry['lean-time-modal']) {
      registry['lean-time-modal'] = makeEl();
      registry['lean-time-modal'].querySelector = vi.fn((sel) => {
        if (sel === '.lean-card') {
          // outside-click test toggles whether contains returns true; default true
          return registry['lean-time-modal']._card ?? makeEl({ contains: vi.fn(() => false) });
        }
        return null;
      });
      registry['lean-time-modal'].querySelectorAll = vi.fn(() => []);
    }
  }),
};
global.requestAnimationFrame = (fn) => fn();

// ─── Import module under test ─────────────────────────────────────
const mod = await import('../../js/time-entry-form.js');
const { applyHoursLock, isBreakTicketSelected, openForm, showDeleteConfirm } = mod;

// ─── Helpers ──────────────────────────────────────────────────────
async function flush() {
  await new Promise((r) => setTimeout(r, 0));
}

beforeEach(async () => {
  // reset config to safe default
  _config.breakTicket = 998;
  _config.redmineServerUrl = 'https://redmine.example.com';
  _config.redmineAcceptsZeroHours = false;
  // reset localStorage
  localStorage.clear();
  // wipe element state but keep references (so previously-attached listeners stay)
  resetRegistryState();
  // reset call history but keep implementations from vi.mock factories
  const {
    searchIssues,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    getTimeEntryActivities,
  } = await import('../../js/redmine-api.js');
  searchIssues.mockClear();
  createTimeEntry.mockClear();
  updateTimeEntry.mockClear();
  deleteTimeEntry.mockClear();
  getTimeEntryActivities.mockClear();
  global.document.addEventListener.mockClear();
  global.document.removeEventListener.mockClear();
});

// ───────────────────────────────────────────────────────────────────
describe('time-entry-form: applyHoursLock & isBreakTicketSelected (extras)', () => {
  it('shows duration when start/end set and no break ticket', () => {
    registry['lean-info-start'].value = '08:00';
    registry['lean-info-end'].value = '08:30';
    applyHoursLock();
    expect(registry['lean-info-dur'].textContent).toBe('30m');
  });

  it('handles missing infoDur gracefully (returns early)', () => {
    const original = registry['lean-info-dur'];
    registry['lean-info-dur'] = null;
    expect(() => applyHoursLock()).not.toThrow();
    registry['lean-info-dur'] = original;
  });

  it('formats hours-only durations', () => {
    registry['lean-info-start'].value = '09:00';
    registry['lean-info-end'].value = '11:00';
    applyHoursLock();
    expect(registry['lean-info-dur'].textContent).toBe('2h');
  });

  it('formats hours+minutes durations', () => {
    registry['lean-info-start'].value = '09:00';
    registry['lean-info-end'].value = '10:45';
    applyHoursLock();
    expect(registry['lean-info-dur'].textContent).toBe('1h 45m');
  });

  it('treats overnight wrap by adding 1440 minutes', () => {
    registry['lean-info-start'].value = '23:30';
    registry['lean-info-end'].value = '00:30';
    applyHoursLock();
    expect(registry['lean-info-dur'].textContent).toBe('1h');
  });
});

// ───────────────────────────────────────────────────────────────────
describe('time-entry-form: openForm new-entry flow', () => {
  it('opens with prefill, populates date/start, and reveals modal', async () => {
    const prefill = { date: '2026-05-09', startTime: '09:00', endTime: '10:00', hours: 1 };
    openForm(null, prefill, vi.fn(), vi.fn(), vi.fn());
    await flush();
    expect(registry['lean-info-date'].value).toBe('2026-05-09');
    expect(registry['lean-info-start'].value).toBe('09:00');
    expect(registry['lean-info-end'].value).toBe('10:00');
    // delete btn should be hidden for new entries
    expect(registry['lean-delete'].style.display).toBe('none');
    // ticket placeholder applied
    expect(registry['lean-ticket-idtitle']._classes.has('lean-ticket-placeholder')).toBe(true);
    // modal shown (hidden class removed)
    expect(registry['lean-time-modal']._classes.has('hidden')).toBe(false);
  });

  it('uses today when no prefill date/hours given', async () => {
    vi.setSystemTime(new Date('2026-05-09T10:00:00Z'));
    openForm(null, {}, vi.fn(), vi.fn(), vi.fn());
    await flush();
    expect(registry['lean-info-date'].value).toMatch(/^2026-05-09$/);
    // no start/end given -> start blank, end blank
    expect(registry['lean-info-start'].value).toBe('');
    expect(registry['lean-info-end'].value).toBe('');
    vi.useRealTimers();
  });

  it('renders empty-state messages for last-used and favourites', async () => {
    openForm(null, { date: '2026-05-09' }, vi.fn(), vi.fn(), vi.fn());
    await flush();
    expect(registry['lean-lastused-empty']._classes.has('hidden')).toBe(false);
    expect(registry['lean-favs-empty']._classes.has('hidden')).toBe(false);
  });

  it('populates from existing entry (issueId + subject)', async () => {
    const entry = {
      id: 42,
      date: '2026-05-08',
      startTime: '13:00',
      endTime: '14:00',
      hours: 1,
      issueId: 555,
      issueSubject: 'Fix bug',
      projectName: 'Apollo',
      projectIdentifier: 'apollo',
      comment: 'hello',
    };
    openForm(entry, {}, vi.fn(), vi.fn(), vi.fn());
    await flush();
    expect(registry['lean-search'].value).toBe('#555 Fix bug');
    expect(registry['lean-save'].disabled).toBe(false);
    expect(registry['lean-comment'].value).toBe('hello');
    // delete btn should be visible
    expect(registry['lean-delete'].style.display).toBe('');
    // ticket info link rendered (anchor appended)
    expect(registry['lean-ticket-idtitle'].appendChild).toHaveBeenCalled();
  });

  it('falls back to no link when redmineServerUrl is unset', async () => {
    _config.redmineServerUrl = '';
    const entry = {
      id: 1,
      date: '2026-05-09',
      startTime: '09:00',
      endTime: '10:00',
      hours: 1,
      issueId: 7,
      issueSubject: 'X',
      projectName: 'P',
      projectIdentifier: 'p',
    };
    openForm(entry, {}, vi.fn(), vi.fn(), vi.fn());
    await flush();
    expect(registry['lean-ticket-idtitle'].textContent).toBe('#7 X');
  });

  it('uses prefill issueId fallback when current entry has none', async () => {
    openForm(
      null,
      {
        date: '2026-05-09',
        startTime: '09:00',
        endTime: '10:00',
        issueId: 11,
        issueSubject: 'Prefilled',
        projectName: 'PN',
      },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    expect(registry['lean-search'].value).toBe('#11 Prefilled');
    expect(registry['lean-save'].disabled).toBe(false);
  });

  it('uses default subject "Issue #X" when no subject is provided', async () => {
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00', issueId: 99 },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    expect(registry['lean-search'].value).toBe('#99 Issue #99');
  });
});

// ───────────────────────────────────────────────────────────────────
describe('time-entry-form: search input flow', () => {
  it('clears results when query is too short', async () => {
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    registry['lean-search'].value = 'a';
    registry['lean-search'].dispatch('input');
    await flush();
    expect(registry['lean-search-results']._classes.has('hidden')).toBe(true);
    expect(registry['lean-search-results'].innerHTML).toBe('');
  });

  it('triggers searchIssues for queries length >=2 and renders empty state', async () => {
    const { searchIssues } = await import('../../js/redmine-api.js');
    searchIssues.mockResolvedValueOnce([]);
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    registry['lean-search'].value = 'foo';
    registry['lean-search'].dispatch('input');
    // wait debounce 300ms
    await new Promise((r) => setTimeout(r, 350));
    expect(searchIssues).toHaveBeenCalledWith('foo');
  });

  it('shows error on searchIssues failure', async () => {
    const { searchIssues } = await import('../../js/redmine-api.js');
    searchIssues.mockRejectedValueOnce(new Error('boom'));
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    registry['lean-search'].value = 'bar';
    registry['lean-search'].dispatch('input');
    await new Promise((r) => setTimeout(r, 350));
    expect(registry['lean-error']._classes.has('hidden')).toBe(false);
  });
});

// ───────────────────────────────────────────────────────────────────
describe('time-entry-form: time input change handlers', () => {
  it('onStartChange auto-fills end when end is empty (uses prefill hours)', async () => {
    openForm(null, { date: '2026-05-09', hours: 0.5 }, vi.fn(), vi.fn(), vi.fn());
    await flush();
    registry['lean-info-start'].value = '08:00';
    registry['lean-info-end'].value = '';
    registry['lean-info-start'].dispatch('change');
    expect(registry['lean-info-end'].value).toBe('08:30');
    expect(registry['lean-info-dur'].textContent).toBe('30m');
  });

  it('onStartChange recomputes duration when both set', async () => {
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    registry['lean-info-start'].value = '09:30';
    registry['lean-info-end'].value = '10:00';
    registry['lean-info-start'].dispatch('change');
    expect(registry['lean-info-dur'].textContent).toBe('30m');
  });

  it('onStartChange returns early when start is empty', async () => {
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    registry['lean-info-start'].value = '';
    registry['lean-info-dur'].textContent = 'unchanged';
    registry['lean-info-start'].dispatch('change');
    expect(registry['lean-info-dur'].textContent).toBe('unchanged');
  });

  it('onEndChange recomputes duration', async () => {
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    registry['lean-info-end'].value = '10:30';
    registry['lean-info-end'].dispatch('change');
    expect(registry['lean-info-dur'].textContent).toBe('1h 30m');
  });

  it('onEndChange returns early when start or end missing', async () => {
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    registry['lean-info-end'].value = '';
    registry['lean-info-dur'].textContent = 'unchanged';
    registry['lean-info-end'].dispatch('change');
    expect(registry['lean-info-dur'].textContent).toBe('unchanged');
  });
});

// ───────────────────────────────────────────────────────────────────
describe('time-entry-form: keyboard navigation (Escape, Arrows, Enter)', () => {
  it('Escape triggers closeModal which calls onCancel', async () => {
    const onCancel = vi.fn();
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
      vi.fn(),
      vi.fn(),
      onCancel
    );
    await flush();
    // Find the keydown listener attached via document.addEventListener
    const calls = global.document.addEventListener.mock.calls;
    const kdCalls = calls.filter((c) => c[0] === 'keydown');
    const handler = kdCalls[kdCalls.length - 1][1];
    handler({ key: 'Escape', preventDefault: vi.fn() });
    expect(registry['lean-time-modal']._classes.has('hidden')).toBe(true);
    expect(onCancel).toHaveBeenCalled();
  });

  it('ArrowDown/ArrowUp do nothing when there are no rows', async () => {
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    const calls = global.document.addEventListener.mock.calls.filter((c) => c[0] === 'keydown');
    const handler = calls[calls.length - 1][1];
    expect(() => handler({ key: 'ArrowDown', preventDefault: vi.fn() })).not.toThrow();
    expect(() => handler({ key: 'ArrowUp', preventDefault: vi.fn() })).not.toThrow();
  });

  it('Enter triggers doSave when ticket is already selected', async () => {
    const onSave = vi.fn();
    const entry = {
      id: 7,
      date: '2026-05-09',
      startTime: '09:00',
      endTime: '10:00',
      hours: 1,
      issueId: 5,
      issueSubject: 'X',
      projectName: 'P',
    };
    openForm(entry, {}, onSave, vi.fn(), vi.fn());
    await flush();
    const { updateTimeEntry } = await import('../../js/redmine-api.js');
    const calls = global.document.addEventListener.mock.calls.filter((c) => c[0] === 'keydown');
    const handler = calls[calls.length - 1][1];
    handler({ key: 'Enter', preventDefault: vi.fn() });
    await flush();
    await flush();
    expect(updateTimeEntry).toHaveBeenCalled();
    expect(onSave).toHaveBeenCalled();
  });

  it('Enter on highlighted search row triggers selectAndSave', async () => {
    // Set up both last-used AND favourites so buildEmptyStateVisibleRows
    // walks both branches (covers listLastUsed.forEach loop body).
    localStorage.setItem(
      'redmine_calendar_last_used',
      JSON.stringify([{ id: 30, subject: 'Recent', projectName: 'P', projectIdentifier: 'p' }])
    );
    localStorage.setItem(
      'redmine_calendar_favourites',
      JSON.stringify([{ id: 21, subject: 'Bug', projectName: 'P', projectIdentifier: 'p' }])
    );
    const luRow = makeEl();
    luRow.dataset = { id: '30' };
    const favRow = makeEl();
    favRow.dataset = { id: '21' };
    registry['lean-list-favs'].querySelectorAll = vi.fn(() => [favRow]);
    registry['lean-list-lastused'].querySelectorAll = vi.fn(() => [luRow]);
    registry['lean-search-results'].querySelectorAll = vi.fn(() => []);
    const onSave = vi.fn();
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
      onSave,
      vi.fn(),
      vi.fn()
    );
    await flush();
    const calls = global.document.addEventListener.mock.calls.filter((c) => c[0] === 'keydown');
    const handler = calls[calls.length - 1][1];
    // ArrowDown to highlight index 0
    handler({ key: 'ArrowDown', preventDefault: vi.fn() });
    handler({ key: 'ArrowUp', preventDefault: vi.fn() });
    handler({ key: 'Enter', preventDefault: vi.fn() });
    await flush();
    const { createTimeEntry } = await import('../../js/redmine-api.js');
    expect(createTimeEntry).toHaveBeenCalled();
  });

  it('unknown keys are ignored', async () => {
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    const calls = global.document.addEventListener.mock.calls.filter((c) => c[0] === 'keydown');
    const handler = calls[calls.length - 1][1];
    expect(() => handler({ key: 'Tab', preventDefault: vi.fn() })).not.toThrow();
  });

  it('Enter with no selected ticket and no highlighted row is a no-op', async () => {
    const { createTimeEntry } = await import('../../js/redmine-api.js');
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    const calls = global.document.addEventListener.mock.calls.filter((c) => c[0] === 'keydown');
    const handler = calls[calls.length - 1][1];
    // No ticket selected (_selectedIssue=null) and no highlighted row (highlightedIndex=-1)
    handler({ key: 'Enter', preventDefault: vi.fn() });
    await flush();
    expect(createTimeEntry).not.toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────
describe('time-entry-form: doSave validation and edit/create paths', () => {
  it('shows date_required when date input AND fallbacks are empty', async () => {
    // Pass a prefill that selects a ticket but has no date so the OR-fallback
    // chain in doSave reduces to '' when infoDate.value is cleared.
    openForm(
      null,
      { startTime: '09:00', endTime: '10:00', issueId: 5, issueSubject: 'X', projectName: 'PN' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    registry['lean-info-date'].value = '';
    await registry['lean-save'].onclick();
    expect(registry['lean-error'].textContent).toContain('modal.date_required');
  });

  it('shows start_required when start input is empty', async () => {
    openForm(
      null,
      { date: '2026-05-09', issueId: 5, issueSubject: 'X', projectName: 'PN' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    registry['lean-info-start'].value = '';
    await registry['lean-save'].onclick();
    expect(registry['lean-error'].textContent).toContain('modal.start_required');
  });

  it('shows end_required when end input is empty', async () => {
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', issueId: 5, issueSubject: 'X', projectName: 'PN' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    registry['lean-info-end'].value = '';
    await registry['lean-save'].onclick();
    expect(registry['lean-error'].textContent).toContain('modal.end_required');
  });

  it('rejects when end <= start', async () => {
    const entry = {
      id: 1,
      date: '2026-05-09',
      startTime: '09:00',
      endTime: '10:00',
      hours: 1,
      issueId: 5,
      issueSubject: 'X',
      projectName: '',
    };
    openForm(entry, {}, vi.fn(), vi.fn(), vi.fn());
    await flush();
    registry['lean-info-start'].value = '10:00';
    registry['lean-info-end'].value = '09:00';
    await registry['lean-save'].onclick();
    expect(registry['lean-error'].textContent).toContain('modal.end_before_start');
    expect(registry['lean-save'].disabled).toBe(false);
  });

  it('shows ticket_required when no ticket selected (manual save)', async () => {
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    await registry['lean-save'].onclick();
    expect(registry['lean-error'].textContent).toContain('modal.ticket_required');
  });

  it('successfully creates a new entry', async () => {
    const { createTimeEntry } = await import('../../js/redmine-api.js');
    const onSave = vi.fn();
    openForm(
      null,
      {
        date: '2026-05-09',
        startTime: '09:00',
        endTime: '10:00',
        issueId: 5,
        issueSubject: 'X',
        projectName: 'PN',
        activityId: 77,
      },
      onSave,
      vi.fn(),
      vi.fn()
    );
    await flush();
    await registry['lean-save'].onclick();
    await flush();
    expect(createTimeEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        issueId: 5,
        hours: 1,
        activityId: 77,
        startTime: '09:00',
        endTime: '10:00',
        spentOn: '2026-05-09',
      })
    );
    expect(onSave).toHaveBeenCalled();
    // last-used updated
    const lu = JSON.parse(localStorage.getItem('redmine_calendar_last_used'));
    expect(lu[0].id).toBe(5);
  });

  it('successfully updates an existing entry', async () => {
    const { updateTimeEntry } = await import('../../js/redmine-api.js');
    updateTimeEntry.mockResolvedValueOnce({ id: 99 }); // no issueSubject -> triggers fallback merge
    const onSave = vi.fn();
    const entry = {
      id: 99,
      date: '2026-05-09',
      startTime: '09:00',
      endTime: '10:00',
      hours: 1,
      issueId: 5,
      issueSubject: 'X',
      projectName: 'PN',
    };
    openForm(entry, {}, onSave, vi.fn(), vi.fn());
    await flush();
    await registry['lean-save'].onclick();
    await flush();
    expect(updateTimeEntry).toHaveBeenCalledWith(99, expect.any(Object));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ issueSubject: 'X' }));
  });

  it('shows error message from rejected save', async () => {
    const { createTimeEntry } = await import('../../js/redmine-api.js');
    createTimeEntry.mockRejectedValueOnce(new Error('Server down'));
    openForm(
      null,
      {
        date: '2026-05-09',
        startTime: '09:00',
        endTime: '10:00',
        issueId: 5,
        issueSubject: 'X',
        projectName: 'PN',
      },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    await registry['lean-save'].onclick();
    await flush();
    expect(registry['lean-error'].textContent).toBe('Server down');
    expect(registry['lean-save'].disabled).toBe(false);
  });

  it('uses default save_failed when error has no message', async () => {
    const { createTimeEntry } = await import('../../js/redmine-api.js');
    createTimeEntry.mockRejectedValueOnce({}); // empty object, no message
    openForm(
      null,
      {
        date: '2026-05-09',
        startTime: '09:00',
        endTime: '10:00',
        issueId: 5,
        issueSubject: 'X',
        projectName: 'PN',
      },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    await registry['lean-save'].onclick();
    await flush();
    expect(registry['lean-error'].textContent).toBe('modal.save_failed');
  });
});

// ───────────────────────────────────────────────────────────────────
describe('time-entry-form: break-ticket behaviour', () => {
  it('isBreakTicketSelected becomes true after openForm with the break ticket id', async () => {
    _config.breakTicket = 998;
    const entry = {
      id: 1,
      date: '2026-05-09',
      startTime: '09:00',
      endTime: '10:00',
      hours: 1,
      issueId: 998,
      issueSubject: 'Break',
      projectName: 'P',
    };
    openForm(entry, {}, vi.fn(), vi.fn(), vi.fn());
    await flush();
    expect(isBreakTicketSelected()).toBe(true);
    // duration readout shows break label
    expect(registry['lean-info-dur'].textContent).toBe('modal.duration_break');
  });

  it('save with break ticket sends 0.01 when redmineAcceptsZeroHours is false', async () => {
    _config.breakTicket = 998;
    _config.redmineAcceptsZeroHours = false;
    const { createTimeEntry } = await import('../../js/redmine-api.js');
    openForm(
      null,
      {
        date: '2026-05-09',
        startTime: '09:00',
        endTime: '10:00',
        issueId: 998,
        issueSubject: 'Break',
        projectName: 'P',
      },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    await registry['lean-save'].onclick();
    await flush();
    expect(createTimeEntry).toHaveBeenCalledWith(expect.objectContaining({ hours: 0.01 }));
  });

  it('save with break ticket sends 0 when redmineAcceptsZeroHours is true', async () => {
    _config.breakTicket = 998;
    _config.redmineAcceptsZeroHours = true;
    const { createTimeEntry } = await import('../../js/redmine-api.js');
    openForm(
      null,
      {
        date: '2026-05-09',
        startTime: '09:00',
        endTime: '10:00',
        issueId: 998,
        issueSubject: 'Break',
        projectName: 'P',
      },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    await registry['lean-save'].onclick();
    await flush();
    expect(createTimeEntry).toHaveBeenCalledWith(expect.objectContaining({ hours: 0 }));
  });

  it('onStartChange shows break label when break ticket selected and end empty', async () => {
    _config.breakTicket = 998;
    openForm(
      null,
      { date: '2026-05-09', issueId: 998, issueSubject: 'Break', hours: 1 },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    registry['lean-info-start'].value = '08:00';
    registry['lean-info-end'].value = '';
    registry['lean-info-start'].dispatch('change');
    expect(registry['lean-info-dur'].textContent).toBe('modal.duration_break');
  });

  it('onStartChange shows break label when break ticket selected and end set', async () => {
    _config.breakTicket = 998;
    openForm(
      null,
      {
        date: '2026-05-09',
        startTime: '09:00',
        endTime: '10:00',
        issueId: 998,
        issueSubject: 'Break',
      },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    registry['lean-info-start'].value = '08:30';
    registry['lean-info-start'].dispatch('change');
    expect(registry['lean-info-dur'].textContent).toBe('modal.duration_break');
  });

  it('onEndChange shows break label when break ticket selected', async () => {
    _config.breakTicket = 998;
    openForm(
      null,
      {
        date: '2026-05-09',
        startTime: '09:00',
        endTime: '10:00',
        issueId: 998,
        issueSubject: 'Break',
      },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    registry['lean-info-end'].value = '11:00';
    registry['lean-info-end'].dispatch('change');
    expect(registry['lean-info-dur'].textContent).toBe('modal.duration_break');
  });
});

// ───────────────────────────────────────────────────────────────────
describe('time-entry-form: cancel', () => {
  it('cancel button closes modal and calls onCancel', async () => {
    const onCancel = vi.fn();
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
      vi.fn(),
      vi.fn(),
      onCancel
    );
    await flush();
    registry['lean-cancel'].onclick();
    expect(onCancel).toHaveBeenCalled();
    expect(registry['lean-time-modal']._classes.has('hidden')).toBe(true);
  });

  // Feature 033 / US1: outside-click no longer closes the modal. The previous
  // two tests verifying that behaviour have been removed. The replacement
  // behaviour ("outside click does nothing") is covered by tests/ui/modal.spec.js
  // because the implementation is now the absence of an event handler — there
  // is no JS-side observable hook for a unit test to assert on.
});

// ───────────────────────────────────────────────────────────────────
describe('time-entry-form: delete flow', () => {
  it('delete button opens confirm overlay; confirm calls deleteTimeEntry and onDelete', async () => {
    const { deleteTimeEntry } = await import('../../js/redmine-api.js');
    const onDelete = vi.fn();
    const entry = {
      id: 77,
      date: '2026-05-09',
      startTime: '09:00',
      endTime: '10:00',
      hours: 1,
      issueId: 5,
      issueSubject: 'X',
      projectName: '',
    };
    openForm(entry, {}, vi.fn(), onDelete, vi.fn());
    await flush();
    registry['lean-delete'].onclick();
    expect(registry['lean-confirm-modal']._classes.has('hidden')).toBe(false);
    // confirm OK
    await registry['lean-confirm-ok'].onclick();
    await flush();
    expect(deleteTimeEntry).toHaveBeenCalledWith(77);
    expect(onDelete).toHaveBeenCalledWith(77);
  });

  it('confirm overlay cancel button closes overlay without deleting', async () => {
    const { deleteTimeEntry } = await import('../../js/redmine-api.js');
    const entry = {
      id: 77,
      date: '2026-05-09',
      startTime: '09:00',
      endTime: '10:00',
      hours: 1,
      issueId: 5,
      issueSubject: 'X',
    };
    openForm(entry, {}, vi.fn(), vi.fn(), vi.fn());
    await flush();
    registry['lean-delete'].onclick();
    registry['lean-confirm-cancel'].onclick();
    expect(registry['lean-confirm-modal']._classes.has('hidden')).toBe(true);
    expect(deleteTimeEntry).not.toHaveBeenCalled();
  });

  it('shows error when deleteTimeEntry rejects', async () => {
    const { deleteTimeEntry } = await import('../../js/redmine-api.js');
    deleteTimeEntry.mockRejectedValueOnce(new Error('No perms'));
    const entry = {
      id: 77,
      date: '2026-05-09',
      startTime: '09:00',
      endTime: '10:00',
      hours: 1,
      issueId: 5,
      issueSubject: 'X',
    };
    openForm(entry, {}, vi.fn(), vi.fn(), vi.fn());
    await flush();
    registry['lean-delete'].onclick();
    await registry['lean-confirm-ok'].onclick();
    await flush();
    expect(registry['lean-error'].textContent).toBe('No perms');
    expect(registry['lean-delete'].disabled).toBe(false);
  });

  it('uses default delete_failed when rejection has no message', async () => {
    const { deleteTimeEntry } = await import('../../js/redmine-api.js');
    deleteTimeEntry.mockRejectedValueOnce({});
    const entry = {
      id: 77,
      date: '2026-05-09',
      startTime: '09:00',
      endTime: '10:00',
      hours: 1,
      issueId: 5,
      issueSubject: 'X',
    };
    openForm(entry, {}, vi.fn(), vi.fn(), vi.fn());
    await flush();
    registry['lean-delete'].onclick();
    await registry['lean-confirm-ok'].onclick();
    await flush();
    expect(registry['lean-error'].textContent).toBe('modal.delete_failed');
  });

  it('confirm overlay Escape key cancels overlay', async () => {
    const entry = {
      id: 77,
      date: '2026-05-09',
      startTime: '09:00',
      endTime: '10:00',
      hours: 1,
      issueId: 5,
      issueSubject: 'X',
    };
    openForm(entry, {}, vi.fn(), vi.fn(), vi.fn());
    await flush();
    registry['lean-delete'].onclick();
    // The most recent keydown listener belongs to the confirm overlay
    const calls = global.document.addEventListener.mock.calls.filter((c) => c[0] === 'keydown');
    const handler = calls[calls.length - 1][1];
    handler({ key: 'Escape', preventDefault: vi.fn() });
    expect(registry['lean-confirm-modal']._classes.has('hidden')).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────
describe('time-entry-form: showDeleteConfirm standalone', () => {
  it('opens confirm overlay; OK invokes the provided callback', async () => {
    const onConfirm = vi.fn();
    showDeleteConfirm(onConfirm);
    expect(registry['lean-confirm-modal']._classes.has('hidden')).toBe(false);
    registry['lean-confirm-ok'].onclick();
    expect(onConfirm).toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────
describe('time-entry-form: favourites & last-used rendering', () => {
  it('renders rows for last-used and favourites from localStorage', async () => {
    localStorage.setItem(
      'redmine_calendar_last_used',
      JSON.stringify([{ id: 1, subject: 'A', projectName: 'P1', projectIdentifier: 'p1' }])
    );
    localStorage.setItem(
      'redmine_calendar_favourites',
      JSON.stringify([{ id: 2, subject: 'B', projectName: 'P2', projectIdentifier: 'p2' }])
    );
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    // rows added to listLastUsed / listFavs
    expect(registry['lean-list-lastused'].appendChild).toHaveBeenCalled();
    expect(registry['lean-list-favs'].appendChild).toHaveBeenCalled();
    // empty states hidden
    expect(registry['lean-lastused-empty']._classes.has('hidden')).toBe(true);
    expect(registry['lean-favs-empty']._classes.has('hidden')).toBe(true);
  });

  it('handles malformed JSON in localStorage gracefully', async () => {
    localStorage.setItem('redmine_calendar_last_used', '{not-json');
    localStorage.setItem('redmine_calendar_favourites', '{also-not}');
    expect(() =>
      openForm(
        null,
        { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
        vi.fn(),
        vi.fn(),
        vi.fn()
      )
    ).not.toThrow();
    await flush();
  });

  it('addLastUsed deduplicates by id and caps at 8', async () => {
    // pre-fill last_used with one matching ticket
    localStorage.setItem(
      'redmine_calendar_last_used',
      JSON.stringify([{ id: 5, subject: 'OLD', projectName: '', projectIdentifier: null }])
    );
    const onSave = vi.fn();
    openForm(
      null,
      {
        date: '2026-05-09',
        startTime: '09:00',
        endTime: '10:00',
        issueId: 5,
        issueSubject: 'NEW',
        projectName: 'PN',
      },
      onSave,
      vi.fn(),
      vi.fn()
    );
    await flush();
    await registry['lean-save'].onclick();
    await flush();
    const lu = JSON.parse(localStorage.getItem('redmine_calendar_last_used'));
    expect(lu).toHaveLength(1);
    expect(lu[0].subject).toBe('NEW');
  });

  it('caps last-used at 8 entries', async () => {
    const seed = Array.from({ length: 10 }, (_, i) => ({
      id: 100 + i,
      subject: `T${i}`,
      projectName: '',
    }));
    localStorage.setItem('redmine_calendar_last_used', JSON.stringify(seed));
    openForm(
      null,
      {
        date: '2026-05-09',
        startTime: '09:00',
        endTime: '10:00',
        issueId: 999,
        issueSubject: 'NEW',
        projectName: 'PN',
      },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    await registry['lean-save'].onclick();
    await flush();
    const lu = JSON.parse(localStorage.getItem('redmine_calendar_last_used'));
    expect(lu).toHaveLength(8);
    expect(lu[0].id).toBe(999);
  });
});

// ───────────────────────────────────────────────────────────────────
describe('time-entry-form: search results rendering', () => {
  it('renders search results and marks favourites with a star', async () => {
    const { searchIssues } = await import('../../js/redmine-api.js');
    searchIssues.mockResolvedValueOnce([
      { id: 50, subject: 'Hit', projectName: 'P', projectIdentifier: 'p' },
      { id: 51, subject: 'Hit2', projectName: 'P', projectIdentifier: 'p' },
    ]);
    localStorage.setItem(
      'redmine_calendar_favourites',
      JSON.stringify([{ id: 50, subject: 'Hit', projectName: 'P' }])
    );
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    registry['lean-search'].value = 'hit';
    registry['lean-search'].dispatch('input');
    await new Promise((r) => setTimeout(r, 350));
    expect(registry['lean-search-results'].appendChild).toHaveBeenCalled();
  });

  it('shows no_results message when search returns empty', async () => {
    const { searchIssues } = await import('../../js/redmine-api.js');
    searchIssues.mockResolvedValueOnce([]);
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    registry['lean-search'].value = 'zz';
    registry['lean-search'].dispatch('input');
    await new Promise((r) => setTimeout(r, 350));
    // The "no results" div is appendChild'd to searchResults
    expect(registry['lean-search-results'].appendChild).toHaveBeenCalled();
  });
});

// ───────────────────────────────────────────────────────────────────
describe('time-entry-form: enrichStaleTickets + toggleFavourite + AI highlights', () => {
  it('enrichStaleTickets updates favourites that are missing projectName via searchIssues', async () => {
    // Seed favourites with one stale entry (no projectName / no projectIdentifier)
    localStorage.setItem(
      'redmine_calendar_favourites',
      JSON.stringify([{ id: 200, subject: 'Stale', projectName: '', projectIdentifier: null }])
    );
    const { searchIssues } = await import('../../js/redmine-api.js');
    searchIssues.mockResolvedValueOnce([
      { id: 200, subject: 'Stale', projectName: 'P200', projectIdentifier: 'p200' },
    ]);
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    // Wait for the async enrich loop to finish
    await new Promise((r) => setTimeout(r, 50));
    const favs = JSON.parse(localStorage.getItem('redmine_calendar_favourites'));
    expect(favs[0].projectName).toBe('P200');
    expect(favs[0].projectIdentifier).toBe('p200');
  });

  it('enrichStaleTickets silently swallows searchIssues errors', async () => {
    localStorage.setItem(
      'redmine_calendar_favourites',
      JSON.stringify([{ id: 201, subject: 'Stale', projectName: '', projectIdentifier: null }])
    );
    const { searchIssues } = await import('../../js/redmine-api.js');
    searchIssues.mockRejectedValueOnce(new Error('net'));
    expect(() =>
      openForm(
        null,
        { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
        vi.fn(),
        vi.fn(),
        vi.fn()
      )
    ).not.toThrow();
    await new Promise((r) => setTimeout(r, 50));
  });

  it('toggleFavourite via star button on a favourites row removes the favourite', async () => {
    localStorage.setItem(
      'redmine_calendar_favourites',
      JSON.stringify([{ id: 250, subject: 'F', projectName: 'P', projectIdentifier: 'p' }])
    );
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    // The favourites row's appendChild was called. Walk the children of the row
    // via the fav list element's appendChild calls.
    const favListAppendCalls = registry['lean-list-favs'].appendChild.mock.calls;
    expect(favListAppendCalls.length).toBeGreaterThan(0);
    const row = favListAppendCalls[0][0];
    // The row's appendChild was called twice — once for the label (via append),
    // once for the star.
    const starCall = row.appendChild.mock.calls.find(
      (c) => c[0]?.textContent === '★' || c[0]?.textContent === '☆'
    );
    expect(starCall).toBeTruthy();
    const star = starCall[0];
    // Click the star
    star.dispatch('click', { stopPropagation: vi.fn() });
    const favsAfter = JSON.parse(localStorage.getItem('redmine_calendar_favourites'));
    expect(favsAfter).toHaveLength(0);
  });

  it('toggleFavourite via star button on a search row adds a favourite', async () => {
    const { searchIssues } = await import('../../js/redmine-api.js');
    searchIssues.mockResolvedValueOnce([
      { id: 260, subject: 'NewFav', projectName: 'P', projectIdentifier: 'p' },
    ]);
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    registry['lean-search'].value = 'new';
    registry['lean-search'].dispatch('input');
    await new Promise((r) => setTimeout(r, 350));
    const calls = registry['lean-search-results'].appendChild.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const row = calls[0][0];
    const starCall = row.appendChild.mock.calls.find(
      (c) => c[0]?.textContent === '☆' || c[0]?.textContent === '★'
    );
    expect(starCall).toBeTruthy();
    starCall[0].dispatch('click', { stopPropagation: vi.fn() });
    const favs = JSON.parse(localStorage.getItem('redmine_calendar_favourites'));
    expect(favs.find((f) => f.id === 260)).toBeTruthy();
  });

  it('resetFormUI clears AI highlight classes on modal children', async () => {
    // Make modal.querySelectorAll return a child with classList so the forEach body executes
    const child = makeEl();
    registry['lean-time-modal'].querySelectorAll = vi.fn(() => [child]);
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    expect(child.classList.remove).toHaveBeenCalledWith('ai-highlight', 'ai-highlight-delete');
  });
});

// ───────────────────────────────────────────────────────────────────
describe('time-entry-form: null/absent prefill + optional DOM elements', () => {
  it('openForm with null prefill uses {} as default (prefill ?? {} branch)', async () => {
    // Passing null for prefill exercises the `?? {}` right side at resetFormState line 442
    expect(() => openForm(null, null, vi.fn(), vi.fn(), vi.fn())).not.toThrow();
    await flush();
    // Modal was revealed (hidden class removed)
    expect(registry['lean-time-modal']._classes.has('hidden')).toBe(false);
  });

  it('openForm does not throw when lean-comment element is absent', async () => {
    const original = registry['lean-comment'];
    registry['lean-comment'] = null; // document.getElementById returns null for lean-comment
    expect(() =>
      openForm(
        null,
        { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
        vi.fn(),
        vi.fn(),
        vi.fn()
      )
    ).not.toThrow();
    await flush();
    registry['lean-comment'] = original;
  });
});

describe('time-entry-form: default activity caching', () => {
  it('does not refetch default activity once cached', async () => {
    const { getTimeEntryActivities } = await import('../../js/redmine-api.js');
    // _defaultActivityId is cached after the first openForm in any prior test.
    // Verify subsequent opens never refetch.
    getTimeEntryActivities.mockClear();
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    openForm(
      null,
      { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
      vi.fn(),
      vi.fn(),
      vi.fn()
    );
    await flush();
    expect(getTimeEntryActivities).not.toHaveBeenCalled();
  });

  it('openForm does not throw when activities mock would reject (cached path)', async () => {
    expect(() =>
      openForm(
        null,
        { date: '2026-05-09', startTime: '09:00', endTime: '10:00' },
        vi.fn(),
        vi.fn(),
        vi.fn()
      )
    ).not.toThrow();
  });
});
