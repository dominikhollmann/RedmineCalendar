import { describe, it, expect, vi } from 'vitest';

// calendar.js has heavy top-level DOM initialization. We mock its dependencies
// so the module can be imported in node without real DOM/FullCalendar wiring,
// then exercise the pure helper toFcEvent directly.

vi.mock('../../js/i18n.js', () => ({
  t: vi.fn((key) => key),
  locale: 'en',
  formatDate: vi.fn((d) => d),
}));

vi.mock('../../js/settings.js', () => ({
  getCentralConfigSync: vi.fn(() => ({ breakTicket: 2134 })),
  readWorkingHours: vi.fn(() => null),
  readWeeklyHours: vi.fn(() => 40),
}));

vi.mock('../../js/redmine-api.js', () => ({
  fetchTimeEntries: vi.fn(),
  mapTimeEntry: vi.fn(),
  updateTimeEntry: vi.fn(),
  deleteTimeEntry: vi.fn(),
  resolveIssueSubject: vi.fn(),
  enrichEntries: vi.fn(),
  invalidateCredentialsCache: vi.fn(),
  fetchIssueById: vi.fn(),
}));

vi.mock('../../js/time-entry-form.js', () => ({
  openForm: vi.fn(),
  closeForm: vi.fn(),
}));

vi.mock('../../js/arbzg.js', () => ({
  computeArbzgViolations: vi.fn(() => []),
  renderArbzgBadge: vi.fn(),
}));

vi.mock('../../js/voice-input.js', () => ({}));
vi.mock('../../js/chatbot.js', () => ({}));
vi.mock('../../js/docs.js', () => ({}));

// Stub global FullCalendar before importing
global.FullCalendar = { Calendar: vi.fn(() => ({ render: vi.fn(), addEvent: vi.fn() })) };

// calendar.js has heavy top-level DOM init. Provide a richer document mock
// (returns a stub element with the listeners/methods it touches) BEFORE import.
const stubElement = () => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn(), contains: vi.fn(() => false) },
  appendChild: vi.fn(),
  removeChild: vi.fn(),
  setAttribute: vi.fn(),
  removeAttribute: vi.fn(),
  textContent: '',
  innerHTML: '',
  style: {},
  dataset: {},
  children: [],
  querySelector: vi.fn(() => null),
  querySelectorAll: vi.fn(() => []),
});
// Override the basic document mock from setup.js with one that returns stubs
// for any DOM lookup so calendar.js's top-level addEventListener wiring runs.
global.document.getElementById = vi.fn(() => stubElement());
global.document.querySelector = vi.fn(() => stubElement());
global.document.querySelectorAll = vi.fn(() => []);
global.document.createElement = vi.fn(() => stubElement());
global.document.addEventListener = vi.fn();
global.document.body = stubElement();
global.document.documentElement = stubElement();
global.window.addEventListener = vi.fn();
global.window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
global.window.innerWidth = 1024;
global.window.innerHeight = 768;

const { toFcEvent } = await import('../../js/calendar.js');

describe('calendar.toFcEvent — feature 025 break entry rendering', () => {
  it('synthesizes a 15-minute display end for break entries without endTime', () => {
    const entry = {
      id: 42,
      issueId: 2134, // matches mocked breakTicket
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
      hours: 0.01, // server-side placeholder when Redmine rejects 0h
    };
    const ev = toFcEvent(entry);
    expect(ev.end).toBe('2026-05-07T13:00');
    expect(ev.classNames).toContain('fc-event--break');
  });

  it('does NOT add fc-event--break for non-break-ticket entries', () => {
    const entry = {
      id: 1,
      issueId: 2097, // not the break ticket
      issueSubject: 'Sprint Planning',
      date: '2026-05-07',
      startTime: '09:00',
      hours: 1,
    };
    const ev = toFcEvent(entry);
    expect(ev.end).toBe('2026-05-07T10:00');
    expect(ev.classNames).not.toContain('fc-event--break');
  });

});
