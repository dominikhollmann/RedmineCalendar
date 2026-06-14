import { describe, it, expect, vi } from 'vitest';

vi.mock('../../js/i18n.js', () => ({ t: vi.fn((k) => k), locale: 'en' }));
vi.mock('../../js/config.js', () => ({
  STORAGE_KEY_PLANNING_SOURCE_OUTLOOK: 'redmine_calendar_planning_source_outlook',
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
}));
vi.mock('../../js/config-store.js', () => ({ getCentralConfigSync: vi.fn(() => ({})) }));
vi.mock('../../js/settings.js', () => ({ readWorkingHours: vi.fn(() => null) }));
vi.mock('../../js/notify.js', () => ({ showToast: vi.fn() }));

import {
  classifyProposal,
  isFullyCovered,
  proposalDisplayHours,
} from '../../js/planning-view-outlook.js';

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

// ── proposalDisplayHours ─────────────────────────────────────────

describe('proposalDisplayHours', () => {
  it('returns raw duration for a regular meeting (14:00–14:55 → 55m)', () => {
    const proposal = { category: 'meeting', startTime: '14:00', endTime: '14:55', hours: 1.0 };
    expect(proposalDisplayHours(proposal)).toBeCloseTo(55 / 60);
  });

  it('returns proposal.hours (0) for a break regardless of time range', () => {
    const proposal = { category: 'break', startTime: '12:00', endTime: '13:00', hours: 0 };
    expect(proposalDisplayHours(proposal)).toBe(0);
  });

  it('returns raw duration for a needs-ticket meeting', () => {
    const proposal = { category: 'meeting', startTime: '09:00', endTime: '09:30', hours: 0.5 };
    expect(proposalDisplayHours(proposal)).toBeCloseTo(0.5);
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
