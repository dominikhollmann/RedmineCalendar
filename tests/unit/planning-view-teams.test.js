// T013: Unit tests for js/planning-view-teams.js
// These tests MUST FAIL before T014–T020 implement the module.

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../js/i18n.js', () => ({
  t: vi.fn((k, vars) => (vars ? `${k}:${JSON.stringify(vars)}` : k)),
  locale: 'en',
}));
vi.mock('../../js/config.js', () => ({
  STORAGE_KEY_PLANNING_SOURCE_TEAMS: 'redmine_calendar_planning_source_teams',
}));
vi.mock('../../js/outlook.js', () => ({
  isOutlookConfigured: vi.fn(() => false),
  isDemoMode: vi.fn(() => false),
  isMsalSignedIn: vi.fn(() => false),
  getSignedInDisplayName: vi.fn(() => ''),
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
  extractTicketId: vi.fn((s) => {
    const m = s?.match(/#(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  }),
}));
vi.mock('../../js/config-store.js', () => ({ getCentralConfigSync: vi.fn(() => ({})) }));
vi.mock('../../js/settings.js', () => ({ readWorkingHours: vi.fn(() => null) }));
vi.mock('../../js/notify.js', () => ({ showToast: vi.fn() }));
vi.mock('../../js/redmine-api.js', () => ({
  formatProject: vi.fn(() => ''),
  fetchIssueInfo: vi.fn(async () => null),
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
vi.mock('../../js/planning-view-column-base.js', () => ({
  isFullyCovered: vi.fn(() => false),
  classifyProposal: vi.fn(() => 'needs-ticket'),
  renderTimeGrid: vi.fn(),
  renderColumnPrompt: vi.fn(),
  buildPlanningEvents: vi.fn(() => []),
  buildCardContent: vi.fn(() => []),
  renderColumnCards: vi.fn(),
  createColumnState: vi.fn(() => ({
    getSelectedEventIds: vi.fn(() => new Set()),
    getSelectedEvents: vi.fn(() => []),
    clearSelection: vi.fn(),
    syncSelectionClasses: vi.fn(),
    setRenderedEvents: vi.fn(),
    handleCardClick: vi.fn(),
    handleDragStart: vi.fn(),
    enrichTicketInfoAsync: vi.fn(async () => {}),
  })),
}));

import { normaliseCall, normaliseMeeting } from '../../js/planning-view-teams.js';

// ── T013a: call normalisation ─────────────────────────────────────

describe('normaliseCall', () => {
  it('returns null when durationMinutes < 1', () => {
    const call = {
      id: 'call1',
      startDateTime: '2026-06-14T09:00:00Z',
      endDateTime: '2026-06-14T09:00:30Z',
      durationMinutes: 0,
      participants: ['Alice'],
      type: 'call',
    };
    expect(normaliseCall(call, 'Bob')).toBeNull();
  });

  it('returns a proposal-shaped object for a valid call', () => {
    const call = {
      id: 'call1',
      startDateTime: '2026-06-14T09:05:00Z',
      endDateTime: '2026-06-14T09:20:00Z',
      durationMinutes: 15,
      participants: ['Alice', 'Bob', 'Charlie'],
      type: 'call',
    };
    const result = normaliseCall(call, 'Charlie');
    expect(result).not.toBeNull();
    expect(result.durationMinutes).toBe(15);
  });

  it('excludes the signed-in user from participant list', () => {
    const call = {
      id: 'call1',
      startDateTime: '2026-06-14T10:05:00Z',
      endDateTime: '2026-06-14T10:20:00Z',
      durationMinutes: 15,
      participants: ['Alice', 'Bob'],
      type: 'call',
    };
    const result = normaliseCall(call, 'Bob');
    expect(result).not.toBeNull();
    expect(result.participants).not.toContain('Bob');
    expect(result.participants).toContain('Alice');
  });

  it('uses solo-call i18n key when participant list is empty after filtering', () => {
    const call = {
      id: 'call1',
      startDateTime: '2026-06-14T10:05:00Z',
      endDateTime: '2026-06-14T10:20:00Z',
      durationMinutes: 15,
      participants: ['SoloUser'],
      type: 'call',
    };
    const result = normaliseCall(call, 'SoloUser');
    expect(result).not.toBeNull();
    expect(result.subject).toContain('planning.teams_solo_call');
  });

  it('sets displayStartTime to raw HH:MM from ISO start (not rounded)', () => {
    const call = {
      id: 'call1',
      startDateTime: '2026-06-14T10:07:00Z',
      endDateTime: '2026-06-14T10:22:00Z',
      durationMinutes: 15,
      participants: ['Alice'],
      type: 'call',
    };
    const result = normaliseCall(call, 'Bob');
    // displayStartTime should be raw '10:07', not rounded '10:00'
    expect(result.displayStartTime).toBe('10:07');
  });

  it('sets startTime to roundToQuarter(displayStartTime)', () => {
    const call = {
      id: 'call1',
      startDateTime: '2026-06-14T10:07:00Z',
      endDateTime: '2026-06-14T10:22:00Z',
      durationMinutes: 15,
      participants: ['Alice'],
      type: 'call',
    };
    const result = normaliseCall(call, 'Bob');
    // 10:07 rounds to 10:00
    expect(result.startTime).toBe('10:00');
  });

  it('sets bookingComment to empty string (no personal data per FR-012)', () => {
    const call = {
      id: 'call1',
      startDateTime: '2026-06-14T10:05:00Z',
      endDateTime: '2026-06-14T10:20:00Z',
      durationMinutes: 15,
      participants: ['Alice'],
      type: 'call',
    };
    const result = normaliseCall(call, 'Bob');
    expect(result.bookingComment).toBe('');
  });
});

// ── T013b: meeting normalisation ──────────────────────────────────

describe('normaliseMeeting', () => {
  it('returns null when actualStart is absent', () => {
    const meeting = {
      id: 'meeting1',
      subject: 'Standup',
      joinUrl: 'https://teams.microsoft.com/l/meetup-join/...',
      scheduledStart: '2026-06-14T09:00:00Z',
      scheduledEnd: '2026-06-14T09:30:00Z',
      actualStart: null,
      actualEnd: null,
      participants: ['Alice', 'Bob'],
      type: 'meeting',
    };
    expect(normaliseMeeting(meeting)).toBeNull();
  });

  it('returns null when actualEnd is absent', () => {
    const meeting = {
      id: 'meeting1',
      subject: 'Standup',
      joinUrl: 'https://teams.microsoft.com/l/meetup-join/...',
      scheduledStart: '2026-06-14T09:00:00Z',
      scheduledEnd: '2026-06-14T09:30:00Z',
      actualStart: '2026-06-14T09:01:00Z',
      actualEnd: null,
      participants: ['Alice', 'Bob'],
      type: 'meeting',
    };
    expect(normaliseMeeting(meeting)).toBeNull();
  });

  it('sets displayStartTime to raw actual join time HH:MM (not scheduled)', () => {
    const meeting = {
      id: 'meeting1',
      subject: 'Standup',
      joinUrl: 'https://teams.microsoft.com/l/meetup-join/...',
      scheduledStart: '2026-06-14T09:00:00Z',
      scheduledEnd: '2026-06-14T09:30:00Z',
      actualStart: '2026-06-14T09:03:00Z',
      actualEnd: '2026-06-14T09:27:00Z',
      participants: ['Alice', 'Bob'],
      type: 'meeting',
    };
    const result = normaliseMeeting(meeting);
    expect(result).not.toBeNull();
    // displayStartTime = actual join '09:03', not scheduled '09:00'
    expect(result.displayStartTime).toBe('09:03');
  });

  it('sets startTime to roundToQuarter(displayStartTime)', () => {
    const meeting = {
      id: 'meeting1',
      subject: 'Standup',
      joinUrl: 'https://teams.microsoft.com/l/meetup-join/...',
      scheduledStart: '2026-06-14T09:00:00Z',
      scheduledEnd: '2026-06-14T09:30:00Z',
      actualStart: '2026-06-14T09:03:00Z',
      actualEnd: '2026-06-14T09:27:00Z',
      participants: ['Alice', 'Bob'],
      type: 'meeting',
    };
    const result = normaliseMeeting(meeting);
    // 09:03 rounds to 09:00
    expect(result.startTime).toBe('09:00');
  });

  it('sets bookingComment to the meeting subject (FR-012)', () => {
    const meeting = {
      id: 'meeting1',
      subject: 'Q2 Planning',
      joinUrl: 'https://teams.microsoft.com/l/meetup-join/...',
      scheduledStart: '2026-06-14T10:00:00Z',
      scheduledEnd: '2026-06-14T11:00:00Z',
      actualStart: '2026-06-14T10:02:00Z',
      actualEnd: '2026-06-14T10:58:00Z',
      participants: ['Alice', 'Bob'],
      type: 'meeting',
    };
    const result = normaliseMeeting(meeting);
    expect(result.bookingComment).toBe('Q2 Planning');
  });

  it('falls back to meeting-fallback i18n key when subject is empty', () => {
    const meeting = {
      id: 'meeting1',
      subject: '',
      joinUrl: 'https://teams.microsoft.com/l/meetup-join/...',
      scheduledStart: '2026-06-14T10:00:00Z',
      scheduledEnd: '2026-06-14T11:00:00Z',
      actualStart: '2026-06-14T10:02:00Z',
      actualEnd: '2026-06-14T10:58:00Z',
      participants: ['Alice'],
      type: 'meeting',
    };
    const result = normaliseMeeting(meeting);
    expect(result.subject).toContain('planning.teams_meeting_fallback');
    expect(result.bookingComment).toContain('planning.teams_meeting_fallback');
  });

  it('extracts ticketId from meeting subject when an issue reference is present', () => {
    const meeting = {
      id: 'meeting1',
      subject: 'Sprint Review #42',
      joinUrl: 'https://teams.microsoft.com/l/meetup-join/...',
      scheduledStart: '2026-06-14T09:00:00Z',
      scheduledEnd: '2026-06-14T09:30:00Z',
      actualStart: '2026-06-14T09:02:00Z',
      actualEnd: '2026-06-14T09:28:00Z',
      participants: ['Alice', 'Bob'],
      type: 'meeting',
    };
    const result = normaliseMeeting(meeting);
    expect(result).not.toBeNull();
    expect(result.ticketId).toBe(42);
  });

  it('sets ticketId to null when no issue reference is in the subject', () => {
    const meeting = {
      id: 'meeting1',
      subject: 'Daily Standup',
      joinUrl: 'https://teams.microsoft.com/l/meetup-join/...',
      scheduledStart: '2026-06-14T09:00:00Z',
      scheduledEnd: '2026-06-14T09:15:00Z',
      actualStart: '2026-06-14T09:01:00Z',
      actualEnd: '2026-06-14T09:13:00Z',
      participants: ['Alice'],
      type: 'meeting',
    };
    const result = normaliseMeeting(meeting);
    expect(result).not.toBeNull();
    expect(result.ticketId).toBeNull();
  });
});
