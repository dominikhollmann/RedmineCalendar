import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../js/i18n.js', () => ({ t: vi.fn((k) => k), locale: 'en' }));
vi.mock('../../js/config.js', () => ({
  STORAGE_KEY_PLANNING_SOURCE_OUTLOOK: 'redmine_calendar_planning_source_outlook',
  STORAGE_KEY_VIEW_MODE: 'redmine_calendar_view_mode',
  STORAGE_KEY_DAY_RANGE: 'redmine_calendar_day_range',
}));
vi.mock('../../js/outlook.js', () => ({
  isOutlookConfigured: vi.fn(() => false),
  isMsalSignedIn: vi.fn(() => false),
  fetchCalendarEvents: vi.fn(async () => []),
  parseCalendarProposals: vi.fn(() => ({
    proposals: [],
    skippedOverlap: [],
    skippedInformational: [],
  })),
  acquireToken: vi.fn(async () => 'token'),
  roundToQuarter: vi.fn((hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    const rounded = Math.round((h * 60 + m) / 15) * 15;
    return `${String(Math.floor(rounded / 60)).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`;
  }),
}));
vi.mock('../../js/config-store.js', () => ({ getCentralConfigSync: vi.fn(() => ({})) }));
vi.mock('../../js/settings.js', () => ({ readWorkingHours: vi.fn(() => null) }));
vi.mock('../../js/notify.js', () => ({ showToast: vi.fn() }));
vi.mock('../../js/calendar-config.js', () => ({
  createTimegridColumn: vi.fn(() => ({
    cal: { getEvents: vi.fn(() => []), addEvent: vi.fn(), removeAllEvents: vi.fn() },
    setDate: vi.fn(),
    setEvents: vi.fn(),
    destroy: vi.fn(),
  })),
}));
vi.mock('../../js/redmine-api.js', () => ({
  formatProject: vi.fn(() => ''),
  fetchIssueInfo: vi.fn(async () => null),
  fetchIssueStatuses: vi.fn(async () => new Map()),
  stampClosedStatus: vi.fn(async () => {}),
}));
vi.mock('../../js/time-entry-form-utils.js', () => ({
  formatDuration: vi.fn((h) => `${h}h`),
  diffMinutes: vi.fn((a, b) => {
    const toM = (s) => {
      const [h, m] = s.split(':').map(Number);
      return h * 60 + m;
    };
    return (toM(b) - toM(a) + 1440) % 1440;
  }),
}));

import {
  classifyProposal,
  isFullyCovered,
  renderOutlookColumn,
} from '../../js/planning-view-outlook.js';
import {
  isOutlookConfigured,
  isMsalSignedIn,
  fetchCalendarEvents,
  parseCalendarProposals,
} from '../../js/outlook.js';

// ── T007: classifyProposal ────────────────────────────────────────

describe('classifyProposal', () => {
  it('returns bookable for meeting with ticket', () => {
    const proposal = { category: 'meeting', status: 'proposed', ticketId: 2097 };
    expect(classifyProposal(proposal)).toBe('bookable');
  });

  it('returns needs-ticket for meeting without ticket', () => {
    const proposal = { category: 'meeting', status: 'needs-ticket', ticketId: null };
    expect(classifyProposal(proposal)).toBe('needs-ticket');
  });

  it('returns break for break category', () => {
    const proposal = { category: 'break', ticketId: 99 };
    expect(classifyProposal(proposal)).toBe('break');
  });

  it('returns bookable for holiday with ticket', () => {
    const proposal = { category: 'holiday', ticketId: 10 };
    expect(classifyProposal(proposal)).toBe('bookable');
  });

  it('returns bookable for vacation with ticket', () => {
    const proposal = { category: 'vacation', ticketId: 11 };
    expect(classifyProposal(proposal)).toBe('bookable');
  });

  it('returns needs-ticket for allday-other without ticket', () => {
    const proposal = { category: 'allday-other', ticketId: null };
    expect(classifyProposal(proposal)).toBe('needs-ticket');
  });
});

// ── T008: isFullyCovered ──────────────────────────────────────────

describe('isFullyCovered', () => {
  function entry(startTime, hours) {
    return { startTime, hours, date: '2026-06-08' };
  }

  it('returns true when single booking covers the full range', () => {
    expect(isFullyCovered('09:00', '09:15', [entry('09:00', 0.25)])).toBe(true);
  });

  it('returns true when two merged bookings cover the full range', () => {
    expect(isFullyCovered('09:00', '10:00', [entry('09:00', 0.5), entry('09:30', 0.5)])).toBe(true);
  });

  it('returns false for partial coverage', () => {
    expect(isFullyCovered('09:00', '10:00', [entry('09:00', 0.5)])).toBe(false);
  });

  it('returns false for no bookings', () => {
    expect(isFullyCovered('09:00', '09:15', [])).toBe(false);
  });

  it('all-day: returns true when sum of booking hours >= event hours', () => {
    expect(isFullyCovered('09:00', '17:00', [entry('09:00', 4), entry('13:00', 4)], true, 8)).toBe(
      true
    );
  });

  it('all-day: returns false when sum of booking hours < event hours', () => {
    expect(isFullyCovered('09:00', '17:00', [entry('09:00', 3)], true, 8)).toBe(false);
  });
});

// ── T009: Coverage-rounding + display-time fix (FR-013) ───────────
// These tests MUST FAIL before T010 implements the fix.

function makeContainer() {
  return {
    innerHTML: '',
    appendChild: vi.fn(),
    querySelector: vi.fn(() => null),
    querySelectorAll: vi.fn(() => []),
    addEventListener: vi.fn(),
  };
}

function makeRawEvent(startISO, endISO) {
  return {
    subject: 'Test meeting',
    start: startISO,
    end: endISO,
    isAllDay: false,
    sensitivity: 'normal',
    showAs: 'busy',
  };
}

function makeProposal(startTime, endTime) {
  return {
    subject: 'Test meeting',
    startTime,
    endTime,
    hours: (new Date(`2000-01-01T${endTime}`) - new Date(`2000-01-01T${startTime}`)) / 3_600_000,
    isAllDay: false,
    ticketId: null,
    category: 'meeting',
    status: 'needs-ticket',
  };
}

describe('renderOutlookColumn — displayStartTime/displayEndTime (FR-013)', () => {
  const lsStore = {};
  const lsMock = {
    getItem: vi.fn((key) => lsStore[key] ?? null),
    setItem: vi.fn((key, val) => {
      lsStore[key] = String(val);
    }),
    removeItem: vi.fn((key) => {
      delete lsStore[key];
    }),
    clear: vi.fn(() => {
      Object.keys(lsStore).forEach((k) => delete lsStore[k]);
    }),
  };

  const makeEl = () => ({
    className: '',
    style: {},
    dataset: {},
    title: '',
    draggable: false,
    textContent: '',
    appendChild: vi.fn(),
    addEventListener: vi.fn(),
    classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn(), contains: vi.fn(() => false) },
    querySelector: vi.fn(() => null),
    querySelectorAll: vi.fn(() => []),
  });

  beforeEach(() => {
    vi.mocked(isOutlookConfigured).mockReturnValue(true);
    vi.mocked(isMsalSignedIn).mockReturnValue(true);
    vi.stubGlobal('localStorage', lsMock);
    vi.stubGlobal('document', {
      createElement: vi.fn(() => makeEl()),
      getElementById: vi.fn(() => null),
      querySelector: vi.fn(() => null),
      querySelectorAll: vi.fn(() => []),
    });
    vi.stubGlobal('DOMPurify', { sanitize: vi.fn((s) => String(s)) });
  });

  afterEach(() => {
    vi.mocked(isOutlookConfigured).mockReturnValue(false);
    vi.mocked(isMsalSignedIn).mockReturnValue(false);
    vi.mocked(fetchCalendarEvents).mockReset();
    vi.mocked(parseCalendarProposals).mockReset();
  });

  it('planning event carries raw displayStartTime (not rounded proposal.startTime)', async () => {
    // Raw event 10:05–10:55; parseCalendarProposals has already rounded to 10:00–11:00
    vi.mocked(fetchCalendarEvents).mockResolvedValueOnce([
      makeRawEvent('2026-06-14T10:05:00', '2026-06-14T10:55:00'),
    ]);
    vi.mocked(parseCalendarProposals).mockReturnValueOnce({
      proposals: [makeProposal('10:00', '11:00')],
      skippedInformational: [],
      skippedOverlap: [],
    });
    const events = await renderOutlookColumn(makeContainer(), '2026-06-14', [], null);
    expect(events).toHaveLength(1);
    // Before T010: displayStartTime is undefined → FAILS
    expect(events[0].displayStartTime).toBe('10:05');
  });

  it('planning event carries raw displayEndTime (not rounded proposal.endTime)', async () => {
    vi.mocked(fetchCalendarEvents).mockResolvedValueOnce([
      makeRawEvent('2026-06-14T10:05:00', '2026-06-14T10:55:00'),
    ]);
    vi.mocked(parseCalendarProposals).mockReturnValueOnce({
      proposals: [makeProposal('10:00', '11:00')],
      skippedInformational: [],
      skippedOverlap: [],
    });
    const events = await renderOutlookColumn(makeContainer(), '2026-06-14', [], null);
    expect(events).toHaveLength(1);
    // Before T010: displayEndTime is undefined → FAILS
    expect(events[0].displayEndTime).toBe('10:55');
  });

  it('isCovered uses rounded times — a 10:00–11:00 booking covers raw event 10:01–11:01', async () => {
    // raw 10:01 → rounds to 10:00; raw 11:01 → rounds to 11:00
    // A booking from 10:00 for 1 h covers [600, 660]; without rounding [601, 661] is not covered.
    vi.mocked(fetchCalendarEvents).mockResolvedValueOnce([
      makeRawEvent('2026-06-14T10:01:00', '2026-06-14T11:01:00'),
    ]);
    vi.mocked(parseCalendarProposals).mockReturnValueOnce({
      proposals: [makeProposal('10:01', '11:01')],
      skippedInformational: [],
      skippedOverlap: [],
    });
    const booking = { startTime: '10:00', hours: 1.0, date: '2026-06-14' };
    const events = await renderOutlookColumn(makeContainer(), '2026-06-14', [booking], null);
    expect(events).toHaveLength(1);
    // Before T010: isFullyCovered('10:01','11:01',...) → false (booking [600,660] < [601,661]) → FAILS
    expect(events[0].isCovered).toBe(true);
  });
});
