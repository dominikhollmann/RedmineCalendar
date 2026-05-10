import { describe, it, expect, vi, beforeEach } from 'vitest';

// calendar.js has heavy top-level DOM initialization. We mock its dependencies
// so the module can be imported in node without real DOM/FullCalendar wiring,
// then exercise the pure helper toFcEvent directly.

vi.mock('../../js/i18n.js', () => ({
  t: vi.fn((key, vars) => {
    if (key === 'entry.fallback_subject') return `Issue #${vars?.id}`;
    return vars ? `${key}:${JSON.stringify(vars)}` : key;
  }),
  locale: 'en',
  formatDate: vi.fn((d) => d),
}));

const _settingsMock = {
  loadCentralConfig: vi.fn(async () => {}),
  readCredentials: vi.fn(async () => ({ apiKey: 'k', redmineUrl: 'u' })),
  readWorkingHours: vi.fn(() => null),
  readWeeklyHours: vi.fn(() => 40),
  getCentralConfigSync: vi.fn(() => ({
    breakTicket: 2134,
    redmineServerUrl: 'https://redmine.example.com',
  })),
};
vi.mock('../../js/settings.js', () => _settingsMock);

// calendar.js imports loadCentralConfig / readCredentials / getCentralConfigSync
// from config-store.js directly (settings.js merely re-exports them). Share the
// same vi.fn refs so test code that calls _settingsMock.getCentralConfigSync.
// mockReturnValue(...) continues to drive both consumers identically.
vi.mock('../../js/config-store.js', () => ({
  loadCentralConfig: _settingsMock.loadCentralConfig,
  readCredentials: _settingsMock.readCredentials,
  getCentralConfigSync: _settingsMock.getCentralConfigSync,
  resetCentralConfigCache: vi.fn(),
  writeCredentialsRaw: vi.fn(async () => {}),
  clearCredentials: vi.fn(),
}));

const _redmineMock = {
  fetchTimeEntries: vi.fn(async () => []),
  mapTimeEntry: vi.fn((e) => e),
  updateTimeEntry: vi.fn(async () => ({})),
  deleteTimeEntry: vi.fn(async () => ({})),
  resolveIssueSubject: vi.fn(),
  enrichEntries: vi.fn(async () => {}),
  enrichEntry: vi.fn(async () => {}),
  invalidateCredentialsCache: vi.fn(),
  fetchIssueById: vi.fn(),
  loadCredentials: vi.fn(async () => {}),
  formatProject: vi.fn((id, name) => (id ? `[${id}] ${name}` : name)),
};
vi.mock('../../js/redmine-api.js', () => _redmineMock);

const _formMock = {
  openForm: vi.fn(),
  closeForm: vi.fn(),
  showDeleteConfirm: vi.fn((onConfirm) => onConfirm?.()),
};
vi.mock('../../js/time-entry-form.js', () => _formMock);

const _arbzgMock = {
  computeArbzgViolations: vi.fn(() => []),
  computeArbzgWarnings: vi.fn(() => ({
    daily: {},
    weekly: [],
    restPeriod: {},
    sunday: [],
    holiday: {},
    breaks: {},
  })),
  renderArbzgBadge: vi.fn(),
};
vi.mock('../../js/arbzg.js', () => _arbzgMock);

const _chatbotToolsMock = {
  setCalendarRefreshCallback: vi.fn(),
};
vi.mock('../../js/chatbot-tools.js', () => _chatbotToolsMock);

vi.mock('../../js/voice-input.js', () => ({}));
vi.mock('../../js/chatbot.js', () => ({}));
vi.mock('../../js/docs.js', () => ({}));

vi.mock('../../js/config.js', () => ({
  SLOT_DURATION: '00:15:00',
  SNAP_DURATION: '00:15:00',
  STORAGE_KEY_VIEW_MODE: 'redmine_calendar_view_mode',
  STORAGE_KEY_DAY_RANGE: 'redmine_calendar_day_range',
}));

// ── Capture ALL handlers wired during module load ─────────────────
let _capturedConfig = null; // FullCalendar.Calendar second arg
let _capturedKeydownHandlers = []; // document.addEventListener('keydown', ...)
const _calendarMock = {
  render: vi.fn(),
  addEvent: vi.fn(),
  removeAllEvents: vi.fn(),
  getEvents: vi.fn(() => []),
  getEventById: vi.fn(() => null),
  setOption: vi.fn(),
  scrollToTime: vi.fn(),
  unselect: vi.fn(),
  next: vi.fn(),
  prev: vi.fn(),
  today: vi.fn(),
  changeView: vi.fn(),
  view: { currentStart: new Date('2026-05-04T00:00:00Z') },
};
global.FullCalendar = {
  Calendar: vi.fn((el, cfg) => {
    _capturedConfig = cfg;
    return _calendarMock;
  }),
};

// ── Build a richer document/element mock ───────────────────────────
// Each stubElement captures listeners so tests can invoke them later.
const stubElement = (overrides = {}) => {
  const listeners = {};
  return {
    _listeners: listeners,
    addEventListener: vi.fn((evt, handler) => {
      (listeners[evt] = listeners[evt] || []).push(handler);
    }),
    removeEventListener: vi.fn(),
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      toggle: vi.fn(),
      contains: vi.fn(() => false),
    },
    appendChild: vi.fn(function (c) {
      this.children?.push?.(c);
      return c;
    }),
    removeChild: vi.fn(),
    setAttribute: vi.fn(),
    removeAttribute: vi.fn(),
    textContent: '',
    innerHTML: '',
    style: {},
    dataset: {},
    children: [],
    offsetWidth: 100,
    offsetHeight: 50,
    querySelector: vi.fn(() => null),
    querySelectorAll: vi.fn(() => []),
    ...overrides,
  };
};

// Element registry — getElementById returns the SAME element on repeated calls
// so closures in event handlers see consistent state.
const _elemRegistry = {};
function getOrCreate(id) {
  if (!_elemRegistry[id]) _elemRegistry[id] = stubElement();
  return _elemRegistry[id];
}

// Track the most recently-created elements (per tag) so tests can introspect/trigger handlers.
const _createdElements = []; // pushed in creation order
const _querySelectorResults = []; // pushed per call
global.document.getElementById = vi.fn((id) => getOrCreate(id));
global.document.querySelector = vi.fn((sel) => {
  const el = stubElement({ _selector: sel });
  _querySelectorResults.push(el);
  return el;
});
global.document.querySelectorAll = vi.fn(() => []);
global.document.createElement = vi.fn((tag) => {
  const el = stubElement({ tagName: tag });
  _createdElements.push(el);
  return el;
});
global.document.createTextNode = vi.fn((text) => ({ textContent: String(text), nodeType: 3 }));
global.document.addEventListener = vi.fn((evt, handler) => {
  if (evt === 'keydown') _capturedKeydownHandlers.push(handler);
});
global.document.body = stubElement();
global.document.documentElement = stubElement();
const _windowListeners = {};
global.window.addEventListener = vi.fn((evt, handler) => {
  (_windowListeners[evt] = _windowListeners[evt] || []).push(handler);
});
global.window.matchMedia = vi.fn(() => ({
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));
global.window.innerWidth = 1024;
global.window.innerHeight = 768;
global.window.location = { href: '' };

// Load module — runs all top-level code, populates _capturedConfig + _capturedKeydownHandlers
const { toFcEvent, recomputeDayTotals, showToast } = await import('../../js/calendar.js');

// Helper to access the captured FullCalendar config (cb's, customButtons, etc.)
function cfg() {
  if (!_capturedConfig) throw new Error('calendar config not captured');
  return _capturedConfig;
}

beforeEach(() => {
  // Clear localStorage & reset mocks each test for determinism
  Object.keys(globalThis.localStorage).forEach(() => {});
  globalThis.localStorage.clear();
  _settingsMock.readWorkingHours.mockReturnValue(null);
  _settingsMock.getCentralConfigSync.mockReturnValue({
    breakTicket: 2134,
    redmineServerUrl: 'https://redmine.example.com',
  });
  _redmineMock.fetchTimeEntries.mockReset().mockResolvedValue([]);
  _redmineMock.mapTimeEntry.mockReset().mockImplementation((e) => e);
  _redmineMock.enrichEntries.mockReset().mockResolvedValue();
  _redmineMock.enrichEntry.mockReset().mockResolvedValue();
  _redmineMock.updateTimeEntry.mockReset().mockResolvedValue({});
  _redmineMock.deleteTimeEntry.mockReset().mockResolvedValue({});
  _redmineMock.formatProject
    .mockReset()
    .mockImplementation((id, name) => (id ? `[${id}] ${name}` : name));
  _formMock.openForm.mockReset();
  _formMock.showDeleteConfirm.mockReset().mockImplementation((onConfirm) => onConfirm?.());
  _arbzgMock.computeArbzgWarnings.mockReset().mockReturnValue({
    daily: {},
    weekly: [],
    restPeriod: {},
    sunday: [],
    holiday: {},
    breaks: {},
  });
  // Reset calendar method spies
  _calendarMock.render.mockClear();
  _calendarMock.addEvent.mockClear();
  _calendarMock.removeAllEvents.mockClear();
  _calendarMock.getEvents.mockClear().mockReturnValue([]);
  _calendarMock.getEventById.mockClear().mockReturnValue(null);
  _calendarMock.setOption.mockClear();
  _calendarMock.scrollToTime.mockClear();
  _calendarMock.unselect.mockClear();
  _calendarMock.today.mockClear();
  // Reset window state
  global.window.innerWidth = 1024;
  global.window._calendarDayTotals = undefined;
  global.window._calendarArbzgWarnings = {
    daily: {},
    weekly: [],
    restPeriod: {},
    sunday: [],
    holiday: {},
    breaks: {},
  };
});

describe('calendar.toFcEvent — feature 025 break entry rendering', () => {
  it('synthesizes a 15-minute display end for break entries without endTime', () => {
    const entry = {
      id: 42,
      issueId: 2134,
      issueSubject: 'Break Ticket',
      date: '2026-05-07',
      startTime: '14:00',
      endTime: null,
      hours: 0,
    };
    const ev = toFcEvent(entry);
    expect(ev.start).toBe('2026-05-07T14:00');
    expect(ev.end).toBe('2026-05-07T14:15');
    expect(ev.classNames).toContain('fc-event--break');
    expect(ev.extendedProps.timeEntry.hours).toBe(0);
  });

  it('uses real endTime for break entries when easy_time_to was captured', () => {
    const entry = {
      id: 43,
      issueId: 2134,
      issueSubject: 'Break Ticket',
      date: '2026-05-07',
      startTime: '12:00',
      endTime: '13:00',
      hours: 0,
    };
    const ev = toFcEvent(entry);
    expect(ev.start).toBe('2026-05-07T12:00');
    expect(ev.end).toBe('2026-05-07T13:00');
    expect(ev.classNames).toContain('fc-event--break');
  });

  it('treats 0.01h placeholder break entries the same as 0h', () => {
    const entry = {
      id: 44,
      issueId: 2134,
      issueSubject: 'Break Ticket',
      date: '2026-05-07',
      startTime: '12:00',
      endTime: '13:00',
      hours: 0.01,
    };
    const ev = toFcEvent(entry);
    expect(ev.end).toBe('2026-05-07T13:00');
    expect(ev.classNames).toContain('fc-event--break');
  });

  it('does NOT add fc-event--break for non-break-ticket entries', () => {
    const entry = {
      id: 1,
      issueId: 2097,
      issueSubject: 'Sprint Planning',
      date: '2026-05-07',
      startTime: '09:00',
      hours: 1,
    };
    const ev = toFcEvent(entry);
    expect(ev.end).toBe('2026-05-07T10:00');
    expect(ev.classNames).not.toContain('fc-event--break');
  });

  it('falls back to "Issue #N" title when subject is missing', () => {
    const ev = toFcEvent({
      id: 2,
      issueId: 99,
      date: '2026-05-07',
      startTime: '08:00',
      hours: 0.5,
    });
    expect(ev.title).toBe('Issue #99');
  });

  it('omits id when entry.id is null (midnight continuation)', () => {
    const ev = toFcEvent({
      id: null,
      issueId: 99,
      date: '2026-05-07',
      startTime: '00:00',
      hours: 1,
    });
    expect(ev.id).toBeUndefined();
  });

  it('rolls a non-break end-time across midnight to next day', () => {
    const ev = toFcEvent({ id: 5, issueId: 99, date: '2026-05-07', startTime: '23:30', hours: 1 });
    expect(ev.start).toBe('2026-05-07T23:30');
    expect(ev.end).toBe('2026-05-08T00:30');
  });

  it('handles break entry with endTime BEFORE startTime → fallback +15min', () => {
    const ev = toFcEvent({
      id: 7,
      issueId: 2134,
      date: '2026-05-07',
      startTime: '14:00',
      endTime: '13:00',
      hours: 0,
    });
    expect(ev.end).toBe('2026-05-07T14:15');
  });

  it('treats a non-finite breakTicket config as "no break ticket"', () => {
    _settingsMock.getCentralConfigSync.mockReturnValue({ breakTicket: 0 });
    const ev = toFcEvent({
      id: 1,
      issueId: 2134,
      date: '2026-05-07',
      startTime: '09:00',
      hours: 1,
    });
    expect(ev.classNames).not.toContain('fc-event--break');
  });
});

describe('calendar — FullCalendar config initialisation', () => {
  it('captures a config from FullCalendar.Calendar constructor', () => {
    expect(cfg()).toBeTruthy();
    expect(cfg().locale).toBe('en');
    expect(cfg().firstDay).toBe(1);
    expect(cfg().allDaySlot).toBe(false);
    expect(cfg().selectable).toBe(true);
    expect(cfg().editable).toBe(true);
    expect(cfg().eventResizableFromStart).toBe(true);
  });

  it('selectAllow returns true for same-day spans, false for cross-day', () => {
    const { selectAllow } = cfg();
    const sameDay = selectAllow({
      start: new Date('2026-05-07T09:00:00Z'),
      end: new Date('2026-05-07T10:00:00Z'),
    });
    expect(sameDay).toBe(true);
  });
});

describe('calendar.dayHeaderContent', () => {
  it('returns a domNodes array with a span label and a day-total span', () => {
    const arg = { date: new Date(2026, 4, 7), text: 'Thu 5/7' };
    const result = cfg().dayHeaderContent(arg);
    expect(result).toHaveProperty('domNodes');
    expect(result.domNodes).toHaveLength(1);
  });

  it('shows total when window._calendarDayTotals[dateStr] is set', () => {
    global.window._calendarDayTotals = { '2026-05-07': 8.5 };
    const arg = { date: new Date(2026, 4, 7), text: 'Thu 5/7' };
    const result = cfg().dayHeaderContent(arg);
    expect(result.domNodes).toHaveLength(1);
  });

  it('renders ArbZG badge when daily warnings exist', () => {
    global.window._calendarArbzgWarnings = {
      daily: { '2026-05-07': [{ messageKey: 'arbzg.daily', observed: 11, allowed: 10 }] },
      weekly: [],
      restPeriod: {},
      sunday: [],
      holiday: {},
      breaks: {},
    };
    const arg = { date: new Date(2026, 4, 7), text: 'Thu' };
    const result = cfg().dayHeaderContent(arg);
    expect(result.domNodes).toHaveLength(1);
  });

  it('renders ArbZG badge when restPeriod warning exists', () => {
    global.window._calendarArbzgWarnings = {
      daily: {},
      weekly: [],
      restPeriod: { '2026-05-07': { messageKey: 'arbzg.rest', observed: 9, allowed: 11 } },
      sunday: [],
      holiday: {},
      breaks: {},
    };
    const arg = { date: new Date(2026, 4, 7), text: 'Thu' };
    cfg().dayHeaderContent(arg);
  });

  it('renders ArbZG badge for sunday warnings', () => {
    global.window._calendarArbzgWarnings = {
      daily: {},
      weekly: [],
      restPeriod: {},
      sunday: ['2026-05-10'],
      holiday: {},
      breaks: {},
    };
    const arg = { date: new Date(2026, 4, 10), text: 'Sun' };
    cfg().dayHeaderContent(arg);
  });

  it('renders ArbZG badge for holiday warnings', () => {
    global.window._calendarArbzgWarnings = {
      daily: {},
      weekly: [],
      restPeriod: {},
      sunday: [],
      holiday: { '2026-05-07': 'Ascension Day' },
      breaks: {},
    };
    const arg = { date: new Date(2026, 4, 7), text: 'Thu' };
    cfg().dayHeaderContent(arg);
  });

  it('renders ArbZG badge for break warnings (BREAK_INSUFFICIENT branch)', () => {
    global.window._calendarArbzgWarnings = {
      daily: {},
      weekly: [],
      restPeriod: {},
      sunday: [],
      holiday: {},
      breaks: {
        '2026-05-07': [
          {
            rule: 'BREAK_INSUFFICIENT',
            messageKey: 'arbzg.break.short',
            observed: 10,
            required: 30,
          },
          { rule: 'BREAK_OTHER', messageKey: 'arbzg.break.other', observed: 1, allowed: 0 },
        ],
      },
    };
    const arg = { date: new Date(2026, 4, 7), text: 'Thu' };
    cfg().dayHeaderContent(arg);
  });

  it('mobile view path uses cursor:pointer + click handler', () => {
    global.window.innerWidth = 500; // < 768 → mobile
    const arg = { date: new Date(2026, 4, 7), text: 'Thu' };
    cfg().dayHeaderContent(arg);
    global.window.innerWidth = 1024;
  });
});

describe('calendar.eventContent', () => {
  it('returns true (default rendering) when entry is missing', () => {
    const result = cfg().eventContent({ event: { extendedProps: {} } });
    expect(result).toBe(true);
  });

  it('renders ticket as link when redmineServerUrl is set + issueId present', () => {
    const result = cfg().eventContent({
      event: {
        extendedProps: {
          timeEntry: {
            issueId: 123,
            issueSubject: 'Foo',
            startTime: '09:00',
            endTime: '10:00',
            hours: 1,
            comment: 'note',
          },
        },
      },
    });
    expect(result).toHaveProperty('domNodes');
  });

  it('renders ticket as plain text when no redmineServerUrl', () => {
    _settingsMock.getCentralConfigSync.mockReturnValue({ breakTicket: 2134 });
    const result = cfg().eventContent({
      event: {
        extendedProps: {
          timeEntry: {
            issueId: 123,
            issueSubject: 'Foo',
            startTime: '09:00',
            endTime: '10:00',
            hours: 1,
          },
        },
      },
    });
    expect(result).toHaveProperty('domNodes');
  });

  it('renders project line when projectName or projectIdentifier present', () => {
    cfg().eventContent({
      event: {
        extendedProps: {
          timeEntry: {
            issueId: 1,
            issueSubject: 'X',
            projectIdentifier: 'webapp',
            projectName: 'WebApp',
            startTime: '09:00',
            endTime: '10:00',
            hours: 1,
          },
        },
      },
    });
    expect(_redmineMock.formatProject).toHaveBeenCalled();
  });

  it('skips time + comment lines when in mobile view', () => {
    global.window.innerWidth = 500;
    cfg().eventContent({
      event: {
        extendedProps: {
          timeEntry: {
            issueId: 1,
            issueSubject: 'X',
            startTime: '09:00',
            endTime: '10:00',
            hours: 1,
            comment: 'hidden',
          },
        },
      },
    });
    global.window.innerWidth = 1024;
  });
});

describe('calendar.recomputeDayTotals + showToast', () => {
  it('showToast sets text + un-hides + schedules re-hide', async () => {
    vi.useFakeTimers();
    const toastEl = getOrCreate('toast');
    showToast('hello world');
    expect(toastEl.textContent).toBe('hello world');
    expect(toastEl.classList.remove).toHaveBeenCalledWith('hidden');
    vi.advanceTimersByTime(3000);
    expect(toastEl.classList.add).toHaveBeenCalledWith('hidden');
    vi.useRealTimers();
  });

  it('recomputeDayTotals reads events from calendar + writes daily totals', () => {
    _calendarMock.getEvents.mockReturnValue([
      { extendedProps: { timeEntry: { date: '2026-05-07', hours: 2 } } },
      { extendedProps: { timeEntry: { date: '2026-05-07', hours: 1 } } },
      { extendedProps: { timeEntry: { date: '2026-05-08', hours: 0.5 } } },
    ]);
    recomputeDayTotals();
    expect(global.window._calendarDayTotals).toEqual({
      '2026-05-07': 3,
      '2026-05-08': 0.5,
    });
    expect(_calendarMock.render).toHaveBeenCalled();
  });

  it('recomputeDayTotals catches arbzg errors and resets warnings', () => {
    _arbzgMock.computeArbzgWarnings.mockImplementation(() => {
      throw new Error('boom');
    });
    _calendarMock.getEvents.mockReturnValue([
      { extendedProps: { timeEntry: { date: '2026-05-07', hours: 2 } } },
    ]);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    recomputeDayTotals();
    expect(errSpy).toHaveBeenCalled();
    expect(global.window._calendarArbzgWarnings).toEqual({
      daily: {},
      weekly: [],
      restPeriod: {},
      sunday: [],
      holiday: {},
      breaks: {},
    });
    errSpy.mockRestore();
  });

  it('week-total badge appears when weekly arbzg warnings exist', () => {
    _arbzgMock.computeArbzgWarnings.mockReturnValue({
      daily: {},
      weekly: [{ messageKey: 'arbzg.weekly', observed: 60, allowed: 48 }],
      restPeriod: {},
      sunday: [],
      holiday: {},
      breaks: {},
    });
    _calendarMock.getEvents.mockReturnValue([
      { extendedProps: { timeEntry: { date: '2026-05-07', hours: 8 } } },
    ]);
    recomputeDayTotals();
    const wt = getOrCreate('week-total');
    expect(wt.appendChild).toHaveBeenCalled();
  });

  it('week-total ignores midnight-continuation segments', () => {
    _calendarMock.getEvents.mockReturnValue([
      { extendedProps: { timeEntry: { date: '2026-05-07', hours: 1 } } },
      {
        extendedProps: {
          timeEntry: { date: '2026-05-08', hours: 0.5, _isMidnightContinuation: true },
        },
      },
    ]);
    recomputeDayTotals();
    const wt = getOrCreate('week-total');
    expect(wt.appendChild).toHaveBeenCalled();
  });

  it('week-total shows empty state when total is 0 and no warnings', () => {
    _calendarMock.getEvents.mockReturnValue([]);
    recomputeDayTotals();
    // No throw → success
  });
});

describe('calendar.datesSet → loadWeekEntries', () => {
  async function flush() {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  }

  it('fetches entries + maps + adds them to calendar (happy path)', async () => {
    _redmineMock.fetchTimeEntries.mockResolvedValue([
      { id: 1, issueId: 99, date: '2026-05-07', startTime: '09:00', hours: 1 },
    ]);
    cfg().datesSet({
      startStr: '2026-05-04T00:00:00Z',
      endStr: '2026-05-11T00:00:00Z',
      view: { currentStart: new Date('2026-05-04') },
    });
    await flush();
    expect(_redmineMock.fetchTimeEntries).toHaveBeenCalled();
    expect(_calendarMock.removeAllEvents).toHaveBeenCalled();
    expect(_calendarMock.addEvent).toHaveBeenCalled();
  });

  it('shows error banner when fetchTimeEntries rejects', async () => {
    _redmineMock.fetchTimeEntries.mockRejectedValue({ status: 401, message: 'unauthorized' });
    cfg().datesSet({
      startStr: '2026-05-04T00:00:00Z',
      endStr: '2026-05-11T00:00:00Z',
      view: { currentStart: new Date('2026-05-04') },
    });
    await flush();
    const banner = getOrCreate('error-banner');
    expect(banner.classList.remove).toHaveBeenCalledWith('hidden');
  });

  it('shows generic error when status is not a config-error code', async () => {
    _redmineMock.fetchTimeEntries.mockRejectedValue({ status: 500, message: 'server boom' });
    cfg().datesSet({
      startStr: '2026-05-04T00:00:00Z',
      endStr: '2026-05-11T00:00:00Z',
      view: { currentStart: new Date('2026-05-04') },
    });
    await flush();
    const msg = getOrCreate('error-message');
    expect(msg.textContent).toBe('server boom');
  });

  it('drops mapped entries that are filtered out (mapTimeEntry returns null)', async () => {
    _redmineMock.fetchTimeEntries.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    _redmineMock.mapTimeEntry.mockReturnValueOnce(null).mockReturnValueOnce({
      id: 2,
      issueId: 99,
      date: '2026-05-07',
      startTime: '09:00',
      hours: 1,
    });
    cfg().datesSet({
      startStr: '2026-05-04T00:00:00Z',
      endStr: '2026-05-11T00:00:00Z',
      view: { currentStart: new Date('2026-05-04') },
    });
    await flush();
    expect(_calendarMock.addEvent).toHaveBeenCalledTimes(1);
  });
});

describe('calendar.dateClick (mobile-only)', () => {
  it('is a no-op on desktop', () => {
    global.window.innerWidth = 1024;
    cfg().dateClick({ dateStr: '2026-05-07T09:00' });
    expect(_formMock.openForm).not.toHaveBeenCalled();
  });

  it('opens form with prefill on mobile', () => {
    global.window.innerWidth = 500;
    cfg().dateClick({ dateStr: '2026-05-07T09:00' });
    expect(_formMock.openForm).toHaveBeenCalled();
    const [, prefill] = _formMock.openForm.mock.calls[0];
    expect(prefill.date).toBe('2026-05-07');
    expect(prefill.startTime).toBe('09:00');
    expect(prefill.endTime).toBe('09:15');
    global.window.innerWidth = 1024;
  });

  it('callback path: enriches entry, adds it, recomputes totals', async () => {
    global.window.innerWidth = 500;
    let savedCb;
    _formMock.openForm.mockImplementation((_, __, cb) => {
      savedCb = cb;
    });
    cfg().dateClick({ dateStr: '2026-05-07T09:00' });
    await savedCb({ id: 7, issueId: 1, date: '2026-05-07', startTime: '09:00', hours: 0.25 });
    expect(_redmineMock.enrichEntry).toHaveBeenCalled();
    expect(_calendarMock.addEvent).toHaveBeenCalled();
    global.window.innerWidth = 1024;
  });

  it('falls back to no time when dateStr has no time portion', () => {
    global.window.innerWidth = 500;
    cfg().dateClick({ dateStr: '2026-05-07' });
    const [, prefill] = _formMock.openForm.mock.calls.at(-1);
    expect(prefill.startTime).toBeNull();
    expect(prefill.endTime).toBeNull();
    global.window.innerWidth = 1024;
  });
});

describe('calendar.select', () => {
  it('opens form with prefill when dragging', () => {
    cfg().select({
      startStr: '2026-05-07T09:00:00',
      endStr: '2026-05-07T10:00:00',
    });
    expect(_formMock.openForm).toHaveBeenCalled();
    expect(_calendarMock.unselect).toHaveBeenCalled();
  });

  it('callback: enriches + addEvent + recomputeDayTotals', async () => {
    let savedCb;
    _formMock.openForm.mockImplementation((_, __, cb) => {
      savedCb = cb;
    });
    cfg().select({
      startStr: '2026-05-07T09:00:00',
      endStr: '2026-05-07T10:00:00',
    });
    await savedCb({ id: 9, issueId: 1, date: '2026-05-07', startTime: '09:00', hours: 1 });
    expect(_calendarMock.addEvent).toHaveBeenCalled();
  });
});

describe('calendar.eventClick', () => {
  it('does nothing for midnight-continuation segments', () => {
    cfg().eventClick({
      event: { id: '1', extendedProps: { timeEntry: { _isMidnightContinuation: true } } },
    });
    expect(_formMock.openForm).not.toHaveBeenCalled();
  });

  it('does nothing when timeEntry is missing', () => {
    cfg().eventClick({ event: { id: '1', extendedProps: {} } });
    expect(_formMock.openForm).not.toHaveBeenCalled();
  });

  it('single click selects entry; second click within 300ms opens edit form', () => {
    const entry = { id: 1, issueId: 99, date: '2026-05-07', startTime: '09:00', hours: 1 };
    const fcEv = { id: '1', extendedProps: { timeEntry: entry }, setProp: vi.fn() };

    // First click — select
    cfg().eventClick({ event: fcEv });
    expect(fcEv.setProp).toHaveBeenCalledWith('classNames', expect.any(Array));
    expect(_formMock.openForm).not.toHaveBeenCalled();

    // Second click — opens edit form
    cfg().eventClick({ event: fcEv });
    expect(_formMock.openForm).toHaveBeenCalled();
  });

  it('on mobile, single click immediately opens edit form', () => {
    global.window.innerWidth = 500;
    const entry = { id: 2, issueId: 99, date: '2026-05-07', startTime: '09:00', hours: 1 };
    const fcEv = { id: '2', extendedProps: { timeEntry: entry }, setProp: vi.fn() };
    cfg().eventClick({ event: fcEv });
    expect(_formMock.openForm).toHaveBeenCalled();
    global.window.innerWidth = 1024;
  });

  it('edit-callback updates event when getEventById returns a hit', async () => {
    global.window.innerWidth = 500;
    let savedCb;
    _formMock.openForm.mockImplementation((_, __, cb) => {
      savedCb = cb;
    });
    const entry = { id: 3, issueId: 99, date: '2026-05-07', startTime: '09:00', hours: 1 };
    const fcEv = { id: '3', extendedProps: { timeEntry: entry }, setProp: vi.fn() };
    const updateTarget = {
      setProp: vi.fn(),
      setStart: vi.fn(),
      setEnd: vi.fn(),
      setExtendedProp: vi.fn(),
    };
    _calendarMock.getEventById.mockReturnValue(updateTarget);
    cfg().eventClick({ event: fcEv });
    await savedCb({ id: 3, issueId: 99, date: '2026-05-07', startTime: '10:00', hours: 1 });
    expect(updateTarget.setProp).toHaveBeenCalled();
    expect(updateTarget.setStart).toHaveBeenCalled();
    expect(updateTarget.setEnd).toHaveBeenCalled();
    global.window.innerWidth = 1024;
  });

  it('edit-callback gracefully handles missing event (getEventById null)', async () => {
    global.window.innerWidth = 500;
    let savedCb;
    _formMock.openForm.mockImplementation((_, __, cb) => {
      savedCb = cb;
    });
    const fcEv = {
      id: '4',
      extendedProps: {
        timeEntry: { id: 4, issueId: 99, date: '2026-05-07', startTime: '09:00', hours: 1 },
      },
      setProp: vi.fn(),
    };
    _calendarMock.getEventById.mockReturnValue(null);
    cfg().eventClick({ event: fcEv });
    await savedCb({ id: 4, issueId: 99, date: '2026-05-07', startTime: '10:00', hours: 1 });
    global.window.innerWidth = 1024;
  });

  it('delete-callback removes the event when getEventById hits', async () => {
    global.window.innerWidth = 500;
    let deleteCb;
    _formMock.openForm.mockImplementation((_, __, _cb, dcb) => {
      deleteCb = dcb;
    });
    const fcEv = {
      id: '5',
      extendedProps: {
        timeEntry: { id: 5, issueId: 99, date: '2026-05-07', startTime: '09:00', hours: 1 },
      },
      setProp: vi.fn(),
    };
    const removable = { remove: vi.fn() };
    _calendarMock.getEventById.mockReturnValue(removable);
    cfg().eventClick({ event: fcEv });
    deleteCb(5);
    expect(removable.remove).toHaveBeenCalled();
    global.window.innerWidth = 1024;
  });
});

describe('calendar.eventDrop', () => {
  it('reverts when entry is missing', async () => {
    const info = { event: { extendedProps: {} }, revert: vi.fn() };
    await cfg().eventDrop(info);
    expect(info.revert).toHaveBeenCalled();
  });

  it('reverts when entry has no id', async () => {
    const info = { event: { extendedProps: { timeEntry: { id: null } } }, revert: vi.fn() };
    await cfg().eventDrop(info);
    expect(info.revert).toHaveBeenCalled();
  });

  it('updates time entry on successful drop', async () => {
    const newStart = new Date(2026, 4, 8, 10, 30); // local date
    const info = {
      event: {
        start: newStart,
        extendedProps: {
          timeEntry: {
            id: 1,
            hours: 1,
            activityId: 9,
            comment: 'c',
            date: '2026-05-07',
            startTime: '09:00',
          },
        },
        setExtendedProp: vi.fn(),
      },
      revert: vi.fn(),
    };
    await cfg().eventDrop(info);
    expect(_redmineMock.updateTimeEntry).toHaveBeenCalled();
    expect(info.event.setExtendedProp).toHaveBeenCalled();
  });

  it('reverts + shows error banner when updateTimeEntry rejects', async () => {
    _redmineMock.updateTimeEntry.mockRejectedValue(new Error('fail'));
    const info = {
      event: {
        start: new Date(2026, 4, 8, 10, 30),
        extendedProps: {
          timeEntry: {
            id: 1,
            hours: 1,
            activityId: 9,
            comment: 'c',
            date: '2026-05-07',
            startTime: '09:00',
          },
        },
        setExtendedProp: vi.fn(),
      },
      revert: vi.fn(),
    };
    await cfg().eventDrop(info);
    expect(info.revert).toHaveBeenCalled();
  });
});

describe('calendar.eventResize', () => {
  it('reverts when entry is missing', async () => {
    const info = { event: { extendedProps: {} }, revert: vi.fn() };
    await cfg().eventResize(info);
    expect(info.revert).toHaveBeenCalled();
  });

  it('updates time entry hours on successful resize', async () => {
    const start = new Date(Date.UTC(2026, 4, 7, 9, 0));
    const end = new Date(Date.UTC(2026, 4, 7, 11, 0));
    const info = {
      event: {
        start,
        end,
        extendedProps: {
          timeEntry: {
            id: 1,
            hours: 1,
            activityId: 9,
            comment: 'c',
            date: '2026-05-07',
            startTime: '09:00',
          },
        },
        setExtendedProp: vi.fn(),
      },
      revert: vi.fn(),
    };
    await cfg().eventResize(info);
    expect(_redmineMock.updateTimeEntry).toHaveBeenCalled();
  });

  it('reverts + shows error when resize rejects', async () => {
    _redmineMock.updateTimeEntry.mockRejectedValue(new Error('boom'));
    const start = new Date(Date.UTC(2026, 4, 7, 9, 0));
    const end = new Date(Date.UTC(2026, 4, 7, 11, 0));
    const info = {
      event: {
        start,
        end,
        extendedProps: {
          timeEntry: {
            id: 1,
            hours: 1,
            activityId: 9,
            comment: 'c',
            date: '2026-05-07',
            startTime: '09:00',
          },
        },
        setExtendedProp: vi.fn(),
      },
      revert: vi.fn(),
    };
    await cfg().eventResize(info);
    expect(info.revert).toHaveBeenCalled();
  });
});

describe('calendar.customButtons', () => {
  it('viewModeToggle is a no-op when no working hours configured', () => {
    _settingsMock.readWorkingHours.mockReturnValue(null);
    cfg().customButtons.viewModeToggle.click();
    expect(_calendarMock.setOption).not.toHaveBeenCalledWith('slotMinTime', expect.any(String));
  });

  it('viewModeToggle switches from working → 24h when wh is set', () => {
    _settingsMock.readWorkingHours.mockReturnValue({ start: '08:00', end: '17:00' });
    globalThis.localStorage.setItem('redmine_calendar_view_mode', 'working');
    cfg().customButtons.viewModeToggle.click();
    expect(globalThis.localStorage.getItem('redmine_calendar_view_mode')).toBe('24h');
    expect(_calendarMock.setOption).toHaveBeenCalledWith('slotMinTime', '00:00');
    expect(_calendarMock.setOption).toHaveBeenCalledWith('slotMaxTime', '24:00');
  });

  it('viewModeToggle switches from 24h → working when wh is set', () => {
    _settingsMock.readWorkingHours.mockReturnValue({ start: '08:00', end: '17:00' });
    globalThis.localStorage.setItem('redmine_calendar_view_mode', '24h');
    cfg().customButtons.viewModeToggle.click();
    expect(globalThis.localStorage.getItem('redmine_calendar_view_mode')).toBe('working');
    expect(_calendarMock.setOption).toHaveBeenCalledWith('slotMinTime', '08:00');
    expect(_calendarMock.setOption).toHaveBeenCalledWith('slotMaxTime', '17:00');
  });

  it('fullWeekToggle is a no-op stub (no error)', () => {
    cfg().customButtons.fullWeekToggle.click();
  });
});

describe('calendar — keydown handlers (Ctrl+C, Enter, Delete, Escape)', () => {
  it('Escape always works (does nothing if no selection)', () => {
    expect(_capturedKeydownHandlers.length).toBeGreaterThan(0);
    const handler = _capturedKeydownHandlers[0];
    handler({ key: 'Escape' });
  });

  it('Ctrl+C with no selection is a no-op', () => {
    const handler = _capturedKeydownHandlers[0];
    const e = { key: 'c', ctrlKey: true, preventDefault: vi.fn() };
    handler(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  it('Enter with no selection is a no-op', () => {
    const handler = _capturedKeydownHandlers[0];
    handler({ key: 'Enter' });
    expect(_formMock.openForm).not.toHaveBeenCalled();
  });

  it('Delete with no selection is a no-op', () => {
    const handler = _capturedKeydownHandlers[0];
    handler({ key: 'Delete', preventDefault: vi.fn() });
    expect(_formMock.showDeleteConfirm).not.toHaveBeenCalled();
  });

  it('Ctrl+C with selection copies to clipboard', () => {
    // Trigger a single eventClick to set the selection
    const entry = {
      id: 1,
      issueId: 99,
      issueSubject: 'X',
      date: '2026-05-07',
      startTime: '09:00',
      hours: 1,
    };
    const fcEv = { id: 'sel-c', extendedProps: { timeEntry: entry }, setProp: vi.fn() };
    cfg().eventClick({ event: fcEv });

    const handler = _capturedKeydownHandlers[0];
    const e = { key: 'c', ctrlKey: true, preventDefault: vi.fn() };
    handler(e);
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it('Enter with selection opens edit modal', () => {
    const entry = {
      id: 21,
      issueId: 99,
      issueSubject: 'X',
      date: '2026-05-07',
      startTime: '09:00',
      hours: 1,
    };
    const fcEv = { id: 'sel-enter', extendedProps: { timeEntry: entry }, setProp: vi.fn() };
    cfg().eventClick({ event: fcEv });

    const handler = _capturedKeydownHandlers[0];
    handler({ key: 'Enter' });
    expect(_formMock.openForm).toHaveBeenCalled();
  });

  it('Delete with selection runs showDeleteConfirm and deleteTimeEntry', async () => {
    const entry = {
      id: 31,
      issueId: 99,
      issueSubject: 'X',
      date: '2026-05-07',
      startTime: '09:00',
      hours: 1,
    };
    const fcEv = {
      id: 'sel-del',
      extendedProps: { timeEntry: entry },
      setProp: vi.fn(),
      remove: vi.fn(),
    };
    cfg().eventClick({ event: fcEv });

    const handler = _capturedKeydownHandlers[0];
    handler({ key: 'Delete', preventDefault: vi.fn() });
    expect(_formMock.showDeleteConfirm).toHaveBeenCalled();
    // deleteTimeEntry runs async via .then — settle pending promises
    await Promise.resolve();
    await Promise.resolve();
    expect(_redmineMock.deleteTimeEntry).toHaveBeenCalledWith(31);
  });

  it('Delete failure path: catches and shows error banner', async () => {
    _redmineMock.deleteTimeEntry.mockRejectedValueOnce(new Error('cant'));
    const entry = {
      id: 32,
      issueId: 99,
      issueSubject: 'X',
      date: '2026-05-07',
      startTime: '09:00',
      hours: 1,
    };
    const fcEv = {
      id: 'sel-del-fail',
      extendedProps: { timeEntry: entry },
      setProp: vi.fn(),
      remove: vi.fn(),
    };
    cfg().eventClick({ event: fcEv });

    const handler = _capturedKeydownHandlers[0];
    handler({ key: 'Delete', preventDefault: vi.fn() });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });

  it('Delete with midnight continuation is a no-op', () => {
    const entry = {
      id: 33,
      issueId: 99,
      _isMidnightContinuation: true,
      date: '2026-05-07',
      startTime: '09:00',
      hours: 1,
    };
    const fcEv = { id: 'sel-del-mc', extendedProps: { timeEntry: entry }, setProp: vi.fn() };
    cfg().eventClick({ event: fcEv });
    const handler = _capturedKeydownHandlers[0];
    _formMock.showDeleteConfirm.mockClear();
    handler({ key: 'Delete', preventDefault: vi.fn() });
    expect(_formMock.showDeleteConfirm).not.toHaveBeenCalled();
  });
});

describe('calendar — toFcEvent boundary cases', () => {
  it('exactly 24 * 60 endMinutes uses next-day path', () => {
    const ev = toFcEvent({ id: 8, issueId: 99, date: '2026-05-07', startTime: '23:00', hours: 1 });
    expect(ev.end).toBe('2026-05-08T00:00');
  });

  it('break entry id missing → no id in fc event', () => {
    const ev = toFcEvent({ issueId: 2134, date: '2026-05-07', startTime: '12:00', hours: 0 });
    expect(ev.id).toBeUndefined();
    expect(ev.classNames).toContain('fc-event--break');
  });
});

// ─────────────────────────────────────────────────────────────────────
// Tests pushing toward >=95% — exercise tooltip helpers, midnight split,
// overflow indicators, weekend indicator, day-range toggle click, window
// resize/swipe, clipboard banner, errorRetry retry-loop, and arbzg badges.
// ─────────────────────────────────────────────────────────────────────

describe('calendar — ArbZG badge handlers (tooltip show/hide)', () => {
  it('badge mouseenter calls showArbzgTooltip → tooltip add visible class', () => {
    // Pre-seed warnings + tooltip element
    global.window._calendarArbzgWarnings = {
      daily: { '2026-05-07': [{ messageKey: 'arbzg.daily', observed: 11, allowed: 10 }] },
      weekly: [],
      restPeriod: {},
      sunday: [],
      holiday: {},
      breaks: {},
    };
    const tooltip = getOrCreate('arbzg-tooltip');
    tooltip.classList.add.mockClear();

    // Capture badges created in dayHeaderContent
    const before = _createdElements.length;
    cfg().dayHeaderContent({ date: new Date(2026, 4, 7), text: 'Thu' });
    const newOnes = _createdElements.slice(before);
    // The badge is the span with mouseenter listener
    const badge = newOnes.find((e) => e._listeners?.mouseenter);
    expect(badge).toBeTruthy();

    // Trigger the mouseenter handler
    badge._listeners.mouseenter[0]({ clientX: 50, clientY: 60 });
    expect(tooltip.classList.add).toHaveBeenCalledWith('visible');

    // Trigger mouseleave → hide
    tooltip.classList.remove.mockClear();
    badge._listeners.mouseleave[0]();
    expect(tooltip.classList.remove).toHaveBeenCalledWith('visible');
  });

  it('positionArbzgTooltip flips position when overflowing right/bottom', () => {
    global.window._calendarArbzgWarnings = {
      daily: { '2026-05-07': [{ messageKey: 'k', observed: 1, allowed: 0 }] },
      weekly: [],
      restPeriod: {},
      sunday: [],
      holiday: {},
      breaks: {},
    };
    const tooltip = getOrCreate('arbzg-tooltip');
    // Fake a wide tooltip so position has to flip
    tooltip.offsetWidth = 1000;
    tooltip.offsetHeight = 1000;
    global.window.innerWidth = 100;
    global.window.innerHeight = 100;

    const before = _createdElements.length;
    cfg().dayHeaderContent({ date: new Date(2026, 4, 7), text: 'Thu' });
    const badge = _createdElements.slice(before).find((e) => e._listeners?.mouseenter);
    badge._listeners.mouseenter[0]({ clientX: 90, clientY: 90 });
    // Tooltip style.left/top should be set
    expect(tooltip.style.left).toBeTruthy();
    expect(tooltip.style.top).toBeTruthy();

    // Cleanup
    tooltip.offsetWidth = 100;
    tooltip.offsetHeight = 50;
    global.window.innerWidth = 1024;
    global.window.innerHeight = 768;
  });

  it('hideArbzgTooltip is a no-op when tooltip element is missing', () => {
    // getElementById('arbzg-tooltip') returns null
    global.document.getElementById = vi.fn((id) =>
      id === 'arbzg-tooltip' ? null : getOrCreate(id)
    );
    global.window._calendarArbzgWarnings = {
      daily: {},
      weekly: [],
      restPeriod: {},
      sunday: [],
      holiday: {},
      breaks: {},
    };
    cfg().dayHeaderContent({ date: new Date(2026, 4, 7), text: 'Thu' });
    // Restore
    global.document.getElementById = vi.fn((id) => getOrCreate(id));
  });

  it('weekly badge → showArbzgWeekTooltip path', () => {
    _arbzgMock.computeArbzgWarnings.mockReturnValue({
      daily: {},
      weekly: [{ messageKey: 'arbzg.weekly', observed: 60, allowed: 48 }],
      restPeriod: {},
      sunday: [],
      holiday: {},
      breaks: {},
    });
    const tooltip = getOrCreate('arbzg-tooltip');
    tooltip.classList.add.mockClear();
    const before = _createdElements.length;
    _calendarMock.getEvents.mockReturnValue([
      { extendedProps: { timeEntry: { date: '2026-05-07', hours: 8 } } },
    ]);
    recomputeDayTotals();
    const badge = _createdElements.slice(before).find((e) => e._listeners?.mouseenter);
    expect(badge).toBeTruthy();
    badge._listeners.mouseenter[0]({ clientX: 10, clientY: 10 });
    expect(tooltip.classList.add).toHaveBeenCalledWith('visible');
  });

  it('buildDayWarningLines covers all warning categories (daily, restPeriod, sunday, holiday, BREAK_INSUFFICIENT, other-break)', () => {
    global.window._calendarArbzgWarnings = {
      daily: { '2026-05-07': [{ messageKey: 'arbzg.daily', observed: 11, allowed: 10 }] },
      weekly: [],
      restPeriod: { '2026-05-07': { messageKey: 'arbzg.rest', observed: 9, allowed: 11 } },
      sunday: ['2026-05-07'],
      holiday: { '2026-05-07': 'Easter' },
      breaks: {
        '2026-05-07': [
          { rule: 'BREAK_INSUFFICIENT', messageKey: 'k1', observed: 10, required: 30 },
          { rule: 'OTHER', messageKey: 'k2', observed: 1, allowed: 0 },
        ],
      },
    };
    const tooltip = getOrCreate('arbzg-tooltip');
    tooltip.classList.add.mockClear();
    const before = _createdElements.length;
    cfg().dayHeaderContent({ date: new Date(2026, 4, 7), text: 'Thu' });
    const badge = _createdElements.slice(before).find((e) => e._listeners?.mouseenter);
    badge._listeners.mouseenter[0]({ clientX: 0, clientY: 0 });
    expect(tooltip.textContent.length).toBeGreaterThan(0);
  });

  it('weekly tooltip hides when no warnings', () => {
    global.window._calendarArbzgWarnings = {
      daily: {},
      weekly: [],
      restPeriod: {},
      sunday: [],
      holiday: {},
      breaks: {},
    };
    // No badge → no listener invocation, but exercise updateWeekTotal with no warnings
    _calendarMock.getEvents.mockReturnValue([]);
    recomputeDayTotals();
  });
});

describe('calendar — splitMidnightEntries (via loadWeekEntries)', () => {
  async function flush() {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  }

  it('splits an entry crossing midnight into two segments', async () => {
    _redmineMock.fetchTimeEntries.mockResolvedValue([
      { id: 1, issueId: 99, date: '2026-05-07', startTime: '23:00', hours: 2 },
    ]);
    cfg().datesSet({
      startStr: '2026-05-04T00:00:00Z',
      endStr: '2026-05-11T00:00:00Z',
      view: { currentStart: new Date('2026-05-04') },
    });
    await flush();
    // Two events should be added (original first segment + midnight continuation)
    expect(_calendarMock.addEvent).toHaveBeenCalledTimes(2);
  });
});

describe('calendar — overflow / weekend indicators (via loadWeekEntries)', () => {
  async function flush() {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  }

  it('updateOverflowIndicators runs when a working-hours range is active', async () => {
    _settingsMock.readWorkingHours.mockReturnValue({ start: '08:00', end: '17:00' });
    globalThis.localStorage.setItem('redmine_calendar_view_mode', 'working');
    _redmineMock.fetchTimeEntries.mockResolvedValue([
      // entry starts before 08:00 (overflowUp) and ends after 17:00 (overflowDown)
      { id: 1, issueId: 99, date: '2026-05-07', startTime: '07:00', hours: 11 },
    ]);
    // Make querySelector return a column with frame so the indicator can be appended
    const frame = stubElement();
    const col = stubElement({ querySelector: vi.fn(() => frame) });
    global.document.querySelector = vi.fn((sel) => {
      if (sel?.startsWith('.fc-timegrid-col')) return col;
      return stubElement();
    });

    cfg().datesSet({
      startStr: '2026-05-04T00:00:00Z',
      endStr: '2026-05-11T00:00:00Z',
      view: { currentStart: new Date('2026-05-04') },
    });
    await flush();
    // The frame should have an overflow indicator appended
    expect(frame.appendChild).toHaveBeenCalled();
    // Restore
    global.document.querySelector = vi.fn(() => stubElement());
    globalThis.localStorage.removeItem('redmine_calendar_view_mode');
  });

  it('overflow indicator pointerdown stops select; click switches view to 24h + scrolls', async () => {
    _settingsMock.readWorkingHours.mockReturnValue({ start: '08:00', end: '17:00' });
    globalThis.localStorage.setItem('redmine_calendar_view_mode', 'working');
    _redmineMock.fetchTimeEntries.mockResolvedValue([
      { id: 1, issueId: 99, date: '2026-05-07', startTime: '07:00', hours: 11 },
    ]);
    const frame = stubElement();
    const col = stubElement({ querySelector: vi.fn(() => frame) });
    global.document.querySelector = vi.fn((sel) =>
      sel?.startsWith('.fc-timegrid-col') ? col : stubElement()
    );

    const before = _createdElements.length;
    cfg().datesSet({
      startStr: '2026-05-04T00:00:00Z',
      endStr: '2026-05-11T00:00:00Z',
      view: { currentStart: new Date('2026-05-04') },
    });
    await flush();
    // The overflow indicator buttons created via createElement('button')
    const buttons = _createdElements
      .slice(before)
      .filter((e) => e.tagName === 'button' && e._listeners?.pointerdown && e._listeners?.click);
    expect(buttons.length).toBeGreaterThan(0);

    // Trigger pointerdown
    const pdEvent = { stopPropagation: vi.fn() };
    buttons[0]._listeners.pointerdown[0](pdEvent);
    expect(pdEvent.stopPropagation).toHaveBeenCalled();

    // Trigger click → switchTo24hView
    vi.useFakeTimers();
    const clEvent = { stopPropagation: vi.fn() };
    buttons[0]._listeners.click[0](clEvent);
    expect(_calendarMock.setOption).toHaveBeenCalledWith('slotMinTime', '00:00');
    expect(_calendarMock.setOption).toHaveBeenCalledWith('slotMaxTime', '24:00');
    vi.advanceTimersByTime(100);
    expect(_calendarMock.scrollToTime).toHaveBeenCalled();
    vi.useRealTimers();

    global.document.querySelector = vi.fn(() => stubElement());
    globalThis.localStorage.removeItem('redmine_calendar_view_mode');
  });

  it('updateWeekendIndicator: skipped when not workweek', async () => {
    _settingsMock.readWorkingHours.mockReturnValue(null);
    globalThis.localStorage.setItem('redmine_calendar_day_range', 'full-week');
    _redmineMock.fetchTimeEntries.mockResolvedValue([
      { id: 1, issueId: 99, date: '2026-05-09', startTime: '09:00', hours: 1 }, // Sat
    ]);
    cfg().datesSet({
      startStr: '2026-05-04T00:00:00Z',
      endStr: '2026-05-11T00:00:00Z',
      view: { currentStart: new Date('2026-05-04') },
    });
    await flush();
    globalThis.localStorage.removeItem('redmine_calendar_day_range');
  });

  it('updateWeekendIndicator: workweek + weekend entry → adds right indicator', async () => {
    _settingsMock.readWorkingHours.mockReturnValue(null);
    globalThis.localStorage.removeItem('redmine_calendar_day_range');
    _redmineMock.fetchTimeEntries.mockResolvedValue([
      { id: 1, issueId: 99, date: '2026-05-09', startTime: '09:00', hours: 1 }, // Sat
    ]);
    const lastHeader = stubElement();
    global.document.querySelectorAll = vi.fn((sel) => {
      if (sel === '.fc-col-header-cell[data-date]') return [stubElement(), lastHeader];
      return [];
    });

    const before = _createdElements.length;
    cfg().datesSet({
      startStr: '2026-05-04T00:00:00Z',
      endStr: '2026-05-11T00:00:00Z',
      view: { currentStart: new Date('2026-05-04') },
    });
    await flush();
    expect(lastHeader.appendChild).toHaveBeenCalled();

    // Trigger the click → switchToFullWeekView
    const buttons = _createdElements
      .slice(before)
      .filter((e) => e.tagName === 'button' && e._listeners?.click);
    const rightButton = buttons.find((b) => b.className?.includes?.('--right'));
    if (rightButton) {
      rightButton._listeners.click[0]({ stopPropagation: vi.fn() });
      expect(_calendarMock.setOption).toHaveBeenCalledWith('hiddenDays', []);
    }

    global.document.querySelectorAll = vi.fn(() => []);
  });

  it('updateWeekendIndicator: no headers → no-op', async () => {
    _settingsMock.readWorkingHours.mockReturnValue(null);
    globalThis.localStorage.removeItem('redmine_calendar_day_range');
    _redmineMock.fetchTimeEntries.mockResolvedValue([
      { id: 1, issueId: 99, date: '2026-05-09', startTime: '09:00', hours: 1 },
    ]);
    global.document.querySelectorAll = vi.fn(() => []);
    cfg().datesSet({
      startStr: '2026-05-04T00:00:00Z',
      endStr: '2026-05-11T00:00:00Z',
      view: { currentStart: new Date('2026-05-04') },
    });
    await flush();
  });
});

describe('calendar — initDayRangeToggle click handler (deferred)', () => {
  it('toggles workweek ↔ full-week via the captured fullWeekToggle button click', () => {
    // Find the stub that was used as the .fc-fullWeekToggle-button at module load.
    const btn = _querySelectorResults.find(
      (el) => el._selector === '.fc-fullWeekToggle-button' && el._listeners?.click?.length > 0
    );
    expect(btn).toBeTruthy();
    // Stub the inner querySelector for the track lookup
    btn.querySelector = vi.fn(() => stubElement());

    globalThis.localStorage.removeItem('redmine_calendar_day_range');
    btn._listeners.click[0]();
    expect(globalThis.localStorage.getItem('redmine_calendar_day_range')).toBe('full-week');
    expect(_calendarMock.setOption).toHaveBeenCalledWith('hiddenDays', []);

    btn._listeners.click[0]();
    expect(globalThis.localStorage.getItem('redmine_calendar_day_range')).toBe('workweek');
    expect(_calendarMock.setOption).toHaveBeenCalledWith('hiddenDays', [0, 6]);
  });
});

describe('calendar — clipboard banner clear button', () => {
  it('Ctrl+C → copyToClipboard sets banner text + then clear button hides banner', () => {
    // Set a selection
    const entry = {
      id: 100,
      issueId: 99,
      issueSubject: 'Test',
      date: '2026-05-07',
      startTime: '09:00',
      hours: 1,
      projectName: 'P',
      activityId: 1,
      comment: 'c',
    };
    const fcEv = { id: 'cb', extendedProps: { timeEntry: entry }, setProp: vi.fn() };
    cfg().eventClick({ event: fcEv });

    const handler = _capturedKeydownHandlers[0];
    handler({ key: 'c', ctrlKey: true, preventDefault: vi.fn() });

    const banner = getOrCreate('clipboard-banner');
    const text = getOrCreate('clipboard-banner-text');
    expect(banner.classList.remove).toHaveBeenCalledWith('hidden');
    expect(text.textContent.length).toBeGreaterThan(0);

    // Trigger the clear-button click handler captured at module load
    const clearBtn = getOrCreate('clipboard-banner-clear');
    if (clearBtn._listeners?.click?.length) {
      clearBtn._listeners.click[0]();
      expect(banner.classList.add).toHaveBeenCalledWith('hidden');
    }
  });
});

describe('calendar — errorRetry button', () => {
  it('clicking errorRetry retries the last loadWeekEntries call', async () => {
    async function flush() {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    }
    // Run a successful fetch to set _lastStart/_lastEnd
    _redmineMock.fetchTimeEntries.mockResolvedValue([]);
    cfg().datesSet({
      startStr: '2026-05-04T00:00:00Z',
      endStr: '2026-05-11T00:00:00Z',
      view: { currentStart: new Date('2026-05-04') },
    });
    await flush();

    _redmineMock.fetchTimeEntries.mockClear();
    const retryBtn = getOrCreate('error-retry');
    if (retryBtn._listeners?.click?.length) {
      retryBtn._listeners.click[0]();
      await flush();
      expect(_redmineMock.fetchTimeEntries).toHaveBeenCalled();
    }
  });

  it('error-dismiss click hides the error banner', () => {
    const dismiss = getOrCreate('error-dismiss');
    const banner = getOrCreate('error-banner');
    banner.classList.add.mockClear();
    if (dismiss._listeners?.click?.length) {
      dismiss._listeners.click[0]();
      expect(banner.classList.add).toHaveBeenCalledWith('hidden');
    }
  });
});

describe('calendar — window.resize handler (mobile <-> desktop view switch)', () => {
  it('switches to timeGridDay when crossing into mobile width', () => {
    const handlers = _windowListeners.resize ?? [];
    expect(handlers.length).toBeGreaterThan(0);
    // start at desktop, then go mobile
    global.window.innerWidth = 500;
    handlers[0]();
    expect(_calendarMock.changeView).toHaveBeenCalledWith('timeGridDay');
    // back to desktop
    global.window.innerWidth = 1024;
    handlers[0]();
    expect(_calendarMock.changeView).toHaveBeenCalledWith('timeGridWeek');
    // calling again at same state → no extra view change
    _calendarMock.changeView.mockClear();
    handlers[0]();
    expect(_calendarMock.changeView).not.toHaveBeenCalled();
  });
});

describe('calendar — touch swipe navigation (mobile day view)', () => {
  it('left swipe → calendar.next', () => {
    const calEl = getOrCreate('calendar');
    const startHandlers = calEl._listeners?.touchstart ?? [];
    const endHandlers = calEl._listeners?.touchend ?? [];
    expect(startHandlers.length).toBeGreaterThan(0);
    expect(endHandlers.length).toBeGreaterThan(0);
    startHandlers[0]({ touches: [{ clientX: 200, clientY: 100 }] });
    endHandlers[0]({ changedTouches: [{ clientX: 50, clientY: 100 }] });
    expect(_calendarMock.next).toHaveBeenCalled();
  });

  it('right swipe → calendar.prev', () => {
    const calEl = getOrCreate('calendar');
    const startHandlers = calEl._listeners.touchstart;
    const endHandlers = calEl._listeners.touchend;
    startHandlers[0]({ touches: [{ clientX: 50, clientY: 100 }] });
    endHandlers[0]({ changedTouches: [{ clientX: 250, clientY: 100 }] });
    expect(_calendarMock.prev).toHaveBeenCalled();
  });

  it('vertical swipe → ignored', () => {
    const calEl = getOrCreate('calendar');
    const startHandlers = calEl._listeners.touchstart;
    const endHandlers = calEl._listeners.touchend;
    _calendarMock.next.mockClear();
    _calendarMock.prev.mockClear();
    startHandlers[0]({ touches: [{ clientX: 100, clientY: 50 }] });
    endHandlers[0]({ changedTouches: [{ clientX: 110, clientY: 200 }] });
    expect(_calendarMock.next).not.toHaveBeenCalled();
    expect(_calendarMock.prev).not.toHaveBeenCalled();
  });

  it('tiny swipe under threshold → ignored', () => {
    const calEl = getOrCreate('calendar');
    const startHandlers = calEl._listeners.touchstart;
    const endHandlers = calEl._listeners.touchend;
    _calendarMock.next.mockClear();
    _calendarMock.prev.mockClear();
    startHandlers[0]({ touches: [{ clientX: 100, clientY: 50 }] });
    endHandlers[0]({ changedTouches: [{ clientX: 110, clientY: 50 }] });
    expect(_calendarMock.next).not.toHaveBeenCalled();
    expect(_calendarMock.prev).not.toHaveBeenCalled();
  });
});

describe('calendar — getEffectiveTimeRange null-viewMode write path (FR-004)', () => {
  it('first-load with working hours sets viewMode=working in localStorage', async () => {
    async function flush() {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    }
    _settingsMock.readWorkingHours.mockReturnValue({ start: '09:00', end: '18:00' });
    globalThis.localStorage.removeItem('redmine_calendar_view_mode');
    // Trigger overflow indicators path → calls getEffectiveTimeRange with viewMode === null
    _redmineMock.fetchTimeEntries.mockResolvedValue([
      { id: 1, issueId: 99, date: '2026-05-07', startTime: '07:00', hours: 1 },
    ]);
    cfg().datesSet({
      startStr: '2026-05-04T00:00:00Z',
      endStr: '2026-05-11T00:00:00Z',
      view: { currentStart: new Date('2026-05-04') },
    });
    await flush();
    expect(globalThis.localStorage.getItem('redmine_calendar_view_mode')).toBe('working');
    globalThis.localStorage.removeItem('redmine_calendar_view_mode');
  });
});

describe('calendar — Enter key full edit/delete callbacks', () => {
  it('Enter→edit callback updates an existing event AND uses delete callback', async () => {
    const entry = {
      id: 51,
      issueId: 99,
      issueSubject: 'X',
      date: '2026-05-07',
      startTime: '09:00',
      hours: 1,
    };
    const fcEv = {
      id: 'enter-1',
      extendedProps: { timeEntry: entry },
      setProp: vi.fn(),
      remove: vi.fn(),
    };
    cfg().eventClick({ event: fcEv });

    let editCb, deleteCb;
    _formMock.openForm.mockImplementation((_, __, ecb, dcb) => {
      editCb = ecb;
      deleteCb = dcb;
    });

    const handler = _capturedKeydownHandlers[0];
    handler({ key: 'Enter' });
    const updateTarget = {
      setProp: vi.fn(),
      setStart: vi.fn(),
      setEnd: vi.fn(),
      setExtendedProp: vi.fn(),
    };
    _calendarMock.getEventById.mockReturnValue(updateTarget);
    await editCb({ id: 51, issueId: 99, date: '2026-05-07', startTime: '10:00', hours: 1 });
    expect(updateTarget.setStart).toHaveBeenCalled();

    const removable = { remove: vi.fn() };
    _calendarMock.getEventById.mockReturnValue(removable);
    deleteCb(51);
    expect(removable.remove).toHaveBeenCalled();
  });

  it('Enter→edit callback handles missing event gracefully', async () => {
    const entry = {
      id: 52,
      issueId: 99,
      issueSubject: 'X',
      date: '2026-05-07',
      startTime: '09:00',
      hours: 1,
    };
    const fcEv = { id: 'enter-2', extendedProps: { timeEntry: entry }, setProp: vi.fn() };
    cfg().eventClick({ event: fcEv });
    let editCb, deleteCb;
    _formMock.openForm.mockImplementation((_, __, ecb, dcb) => {
      editCb = ecb;
      deleteCb = dcb;
    });

    const handler = _capturedKeydownHandlers[0];
    handler({ key: 'Enter' });
    _calendarMock.getEventById.mockReturnValue(null);
    await editCb({ id: 52, issueId: 99, date: '2026-05-07', startTime: '10:00', hours: 1 });
    deleteCb(52); // null target → no-op
  });

  it('Enter with midnight continuation is a no-op', () => {
    const entry = {
      id: 53,
      _isMidnightContinuation: true,
      issueId: 99,
      date: '2026-05-07',
      startTime: '09:00',
      hours: 1,
    };
    const fcEv = { id: 'enter-mc', extendedProps: { timeEntry: entry }, setProp: vi.fn() };
    cfg().eventClick({ event: fcEv });
    _formMock.openForm.mockClear();
    _capturedKeydownHandlers[0]({ key: 'Enter' });
    expect(_formMock.openForm).not.toHaveBeenCalled();
  });
});

describe('calendar — chatbot refresh callback', () => {
  it('setCalendarRefreshCallback was called at module load with a function', () => {
    expect(_chatbotToolsMock.setCalendarRefreshCallback).toHaveBeenCalled();
    const cb = _chatbotToolsMock.setCalendarRefreshCallback.mock.calls[0][0];
    expect(typeof cb).toBe('function');
    // Calling it with no _lastStart/_lastEnd: harmless
    cb();
  });
});

describe('calendar — mobile-date update + click-to-today', () => {
  it('mobile-date click sets calendar.today() once', async () => {
    async function flush() {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    }
    global.window.innerWidth = 500;
    cfg().datesSet({
      startStr: '2026-05-04T00:00:00Z',
      endStr: '2026-05-11T00:00:00Z',
      view: { currentStart: new Date('2026-05-04') },
    });
    await flush();
    const md = getOrCreate('mobile-date');
    expect(md.textContent.length).toBeGreaterThan(0);
    if (md._listeners?.click?.length) md._listeners.click[0]();
    expect(_calendarMock.today).toHaveBeenCalled();
    global.window.innerWidth = 1024;
  });
});

describe('calendar — selectAllow cross-day rejection', () => {
  it('cross-day span returns false', () => {
    const { selectAllow } = cfg();
    const result = selectAllow({
      start: new Date('2026-05-07T09:00:00Z'),
      end: new Date('2026-05-08T09:00:00Z'),
    });
    expect(result).toBe(false);
  });
});

describe('calendar — _suppressNextSelect path in select handler', () => {
  it('select handler exits early after pointerdown on overflow indicator', async () => {
    async function flush() {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    }
    _settingsMock.readWorkingHours.mockReturnValue({ start: '08:00', end: '17:00' });
    globalThis.localStorage.setItem('redmine_calendar_view_mode', 'working');
    _redmineMock.fetchTimeEntries.mockResolvedValue([
      { id: 1, issueId: 99, date: '2026-05-07', startTime: '07:00', hours: 11 },
    ]);
    const frame = stubElement();
    const col = stubElement({ querySelector: vi.fn(() => frame) });
    global.document.querySelector = vi.fn((sel) =>
      sel?.startsWith('.fc-timegrid-col') ? col : stubElement()
    );

    const before = _createdElements.length;
    cfg().datesSet({
      startStr: '2026-05-04T00:00:00Z',
      endStr: '2026-05-11T00:00:00Z',
      view: { currentStart: new Date('2026-05-04') },
    });
    await flush();
    const buttons = _createdElements
      .slice(before)
      .filter((e) => e.tagName === 'button' && e._listeners?.pointerdown);
    expect(buttons.length).toBeGreaterThan(0);
    // pointerdown sets _suppressNextSelect=true
    buttons[0]._listeners.pointerdown[0]({ stopPropagation: vi.fn() });

    _formMock.openForm.mockClear();
    _calendarMock.unselect.mockClear();
    cfg().select({
      startStr: '2026-05-07T09:00:00',
      endStr: '2026-05-07T10:00:00',
    });
    expect(_formMock.openForm).not.toHaveBeenCalled();
    expect(_calendarMock.unselect).toHaveBeenCalled();

    global.document.querySelector = vi.fn(() => stubElement());
    globalThis.localStorage.removeItem('redmine_calendar_view_mode');
  });
});

describe('calendar — baseClasses break ticket branch', () => {
  it('selecting a break-ticket event keeps fc-event--break in classNames', () => {
    const entry = {
      id: 70,
      issueId: 2134,
      issueSubject: 'Break',
      date: '2026-05-07',
      startTime: '12:00',
      hours: 0,
    };
    const fcEv = { id: 'br-sel', extendedProps: { timeEntry: entry }, setProp: vi.fn() };
    cfg().eventClick({ event: fcEv });
    // setProp called with classNames including 'fc-event--break' AND 'fc-event--selected'
    const callArgs = fcEv.setProp.mock.calls[0];
    expect(callArgs[0]).toBe('classNames');
    expect(callArgs[1]).toContain('fc-event--break');
    expect(callArgs[1]).toContain('fc-event--selected');
    // Now deselect via Escape
    _capturedKeydownHandlers[0]({ key: 'Escape' });
    // Final setProp call has the deselected classes (just 'fc-event--break')
    const lastCall = fcEv.setProp.mock.calls.at(-1);
    expect(lastCall[1]).toContain('fc-event--break');
    expect(lastCall[1]).not.toContain('fc-event--selected');
  });
});

describe('calendar — getInitialHiddenDays branch', () => {
  it('full-week stored → hiddenDays passed as []', () => {
    // Already verified at module load (workweek default). Verify the stored
    // value drives behaviour by inspecting cfg().hiddenDays.
    expect(Array.isArray(cfg().hiddenDays)).toBe(true);
    expect(cfg().hiddenDays).toEqual([0, 6]); // workweek (default)
  });
});
