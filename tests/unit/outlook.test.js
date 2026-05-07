import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../js/settings.js', () => ({
  getCentralConfigSync: vi.fn(() => ({ azureClientId: 'test-client-id', holidayTicket: 999 })),
  readWeeklyHours: vi.fn(() => 40),
  readWorkingHours: vi.fn(() => ({ start: '09:00', end: '17:00' })),
}));

vi.mock('../../js/i18n.js', () => ({
  t: vi.fn((key) => key),
  locale: 'en',
}));

import { roundToQuarter, parseCalendarProposals, isOutlookConfigured } from '../../js/outlook.js';

describe('outlook.js', () => {
  describe('isOutlookConfigured', () => {
    it('returns true when azureClientId is set', () => {
      expect(isOutlookConfigured()).toBe(true);
    });
  });

  describe('roundToQuarter', () => {
    it('rounds down to nearest quarter', () => {
      expect(roundToQuarter('10:03')).toBe('10:00');
      expect(roundToQuarter('10:07')).toBe('10:00');
    });

    it('rounds up to nearest quarter', () => {
      expect(roundToQuarter('10:08')).toBe('10:15');
      expect(roundToQuarter('10:13')).toBe('10:15');
    });

    it('keeps exact quarter hours', () => {
      expect(roundToQuarter('10:00')).toBe('10:00');
      expect(roundToQuarter('10:15')).toBe('10:15');
      expect(roundToQuarter('10:30')).toBe('10:30');
      expect(roundToQuarter('10:45')).toBe('10:45');
    });

    it('rounds at midpoint (7.5 min) up', () => {
      expect(roundToQuarter('10:22')).toBe('10:15');
      expect(roundToQuarter('10:23')).toBe('10:30');
    });

    it('handles midnight boundary', () => {
      expect(roundToQuarter('23:53')).toBe('00:00');
    });

    it('handles zero', () => {
      expect(roundToQuarter('00:00')).toBe('00:00');
    });
  });

  describe('parseCalendarProposals', () => {
    const makeEvent = (subject, start, end, opts = {}) => ({
      subject,
      start: `2026-04-25T${start}:00`,
      end: `2026-04-25T${end}:00`,
      isAllDay: opts.isAllDay ?? false,
      sensitivity: opts.sensitivity ?? 'normal',
      showAs: opts.showAs ?? 'busy',
    });

    it('extracts ticket number from meeting title', () => {
      const events = [makeEvent('Sprint Review #2097', '09:00', '10:00')];
      const { proposals } = parseCalendarProposals(events, [], 40, null, '09:00');
      expect(proposals).toHaveLength(1);
      expect(proposals[0].ticketId).toBe(2097);
      expect(proposals[0].status).toBe('proposed');
    });

    it('sets needs-ticket when no ticket in title', () => {
      const events = [makeEvent('Team Lunch', '12:00', '13:00')];
      const { proposals } = parseCalendarProposals(events, [], 40, null, '09:00');
      expect(proposals[0].ticketId).toBeNull();
      expect(proposals[0].status).toBe('needs-ticket');
    });

    it('rounds start and end times', () => {
      const events = [makeEvent('Meeting #1', '10:03', '10:52')];
      const { proposals } = parseCalendarProposals(events, [], 40, null, '09:00');
      expect(proposals[0].startTime).toBe('10:00');
      expect(proposals[0].endTime).toBe('10:45');
    });

    it('calculates hours from rounded times', () => {
      const events = [makeEvent('Meeting #1', '09:00', '10:30')];
      const { proposals } = parseCalendarProposals(events, [], 40, null, '09:00');
      expect(proposals[0].hours).toBe(1.5);
    });

    // FR-014: sensitivity flag is no longer a routing signal — formerly-filtered
    // private/confidential events now flow through the normal proposal path.
    it('does NOT filter private events (FR-014); ticket-extracted private events appear as work', () => {
      const events = [
        makeEvent('1:1 with Manager #2097', '11:00', '11:30', { sensitivity: 'private' }),
        makeEvent('Normal Meeting #1', '10:00', '11:00'),
      ];
      const { proposals } = parseCalendarProposals(events, [], 40, null, '09:00');
      expect(proposals).toHaveLength(2);
      const priv = proposals.find(p => p.subject === '1:1 with Manager #2097');
      expect(priv.ticketId).toBe(2097);
      expect(priv.status).toBe('proposed');
    });

    it('does NOT filter confidential events; surfaces them in proposals', () => {
      const events = [makeEvent('Secret Doctor Visit', '14:00', '15:00', { sensitivity: 'confidential' })];
      const { proposals } = parseCalendarProposals(events, [], 40, null, '09:00');
      expect(proposals).toHaveLength(1);
      expect(proposals[0].subject).toBe('Secret Doctor Visit');
      expect(proposals[0].status).toBe('needs-ticket');
    });

    it('return value no longer includes skippedPrivate (FR-014)', () => {
      const events = [makeEvent('Anything', '09:00', '10:00', { sensitivity: 'private' })];
      const result = parseCalendarProposals(events, [], 40, null, '09:00');
      expect(result.skippedPrivate).toBeUndefined();
    });

    it('detects overlap with existing entries', () => {
      const events = [makeEvent('Overlap #1', '09:00', '10:00')];
      const existing = [{ startTime: '09:00', hours: 1 }];
      const { proposals, skippedOverlap } = parseCalendarProposals(events, existing, 40, null, '09:00');
      expect(proposals).toHaveLength(0);
      expect(skippedOverlap).toEqual(['Overlap #1']);
    });

    it('does not skip non-overlapping entries', () => {
      const events = [makeEvent('No Overlap #1', '10:00', '11:00')];
      const existing = [{ startTime: '09:00', hours: 1 }];
      const { proposals } = parseCalendarProposals(events, existing, 40, null, '09:00');
      expect(proposals).toHaveLength(1);
    });

    // FR-013: holiday all-day events now anchor at workStart with workStart+dailyHours end
    it('handles all-day holiday with holiday ticket — anchored at workStart (FR-013)', () => {
      const events = [{
        subject: 'Bank Holiday', start: '', end: '', isAllDay: true,
        sensitivity: 'normal', showAs: 'free',
      }];
      const { proposals } = parseCalendarProposals(events, [], 40, 999, '08:00');
      expect(proposals[0].category).toBe('holiday');
      expect(proposals[0].ticketId).toBe(999);
      expect(proposals[0].hours).toBe(8);
      expect(proposals[0].startTime).toBe('08:00');
      expect(proposals[0].endTime).toBe('16:00');
      expect(proposals[0].status).toBe('proposed');
    });

    it('uses 09:00 fallback for holiday when workStart is unset (FR-013)', () => {
      const events = [{
        subject: 'Bank Holiday', start: '', end: '', isAllDay: true,
        sensitivity: 'normal', showAs: 'free',
      }];
      const { proposals } = parseCalendarProposals(events, [], 40, 999, undefined);
      expect(proposals[0].startTime).toBe('09:00');
      expect(proposals[0].endTime).toBe('17:00'); // 09:00 + 8h
    });

    it('handles all-day holiday without holiday ticket', () => {
      const events = [{
        subject: 'Day Off', start: '', end: '', isAllDay: true,
        sensitivity: 'normal', showAs: 'free',
      }];
      const { proposals } = parseCalendarProposals(events, [], 40, null, '09:00');
      expect(proposals[0].category).toBe('holiday');
      expect(proposals[0].ticketId).toBeNull();
      expect(proposals[0].status).toBe('needs-ticket');
    });

    it('handles all-day non-holiday event', () => {
      const events = [{
        subject: 'Birthday John', start: '', end: '', isAllDay: true,
        sensitivity: 'normal', showAs: 'free',
      }];
      const { proposals } = parseCalendarProposals(events, [], 40, 999, '09:00');
      expect(proposals[0].category).toBe('allday-other');
      expect(proposals[0].status).toBe('needs-ticket');
    });

    it('calculates daily hours from weekly hours', () => {
      const events = [{
        subject: 'Urlaub', start: '', end: '', isAllDay: true,
        sensitivity: 'normal', showAs: 'free',
      }];
      const { proposals } = parseCalendarProposals(events, [], 38.5, 999, '09:00');
      expect(proposals[0].hours).toBe(7.75);
    });

    it('extracts first ticket number when multiple present', () => {
      const events = [makeEvent('Review #100 and #200', '09:00', '10:00')];
      const { proposals } = parseCalendarProposals(events, [], 40, null, '09:00');
      expect(proposals[0].ticketId).toBe(100);
    });

    it('skips zero-duration events after rounding', () => {
      const events = [makeEvent('Quick chat', '10:00', '10:02')];
      const { proposals } = parseCalendarProposals(events, [], 40, null, '09:00');
      expect(proposals).toHaveLength(0);
    });
  });
});
