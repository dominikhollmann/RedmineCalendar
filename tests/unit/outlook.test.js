import { describe, it, expect, vi } from 'vitest';

vi.mock('../../js/settings.js', () => ({
  readWeeklyHours: vi.fn(() => 40),
  readWorkingHours: vi.fn(() => ({ start: '09:00', end: '17:00' })),
}));

vi.mock('../../js/config-store.js', () => ({
  getCentralConfigSync: vi.fn(() => ({ azureClientId: 'test-client-id', holidayTicket: 999 })),
}));

vi.mock('../../js/i18n.js', () => ({
  t: vi.fn((key) => key),
  locale: 'en',
}));

import {
  roundToQuarter,
  parseCalendarProposals,
  isOutlookConfigured,
  classifyAsNonWork,
  classifyAsInformational,
  classifyAsBankHoliday,
  classifyAsVacation,
  classifyAsSick,
  classifyAsOvertimeComp,
} from '../../js/outlook.js';

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
      const { proposals } = parseCalendarProposals(events, [], 40, null, null, null, '09:00');
      expect(proposals).toHaveLength(1);
      expect(proposals[0].ticketId).toBe(2097);
      expect(proposals[0].status).toBe('proposed');
    });

    it('sets needs-ticket when no ticket in title', () => {
      const events = [makeEvent('Team Lunch', '12:00', '13:00')];
      const { proposals } = parseCalendarProposals(events, [], 40, null, null, null, '09:00');
      expect(proposals[0].ticketId).toBeNull();
      expect(proposals[0].status).toBe('needs-ticket');
    });

    it('rounds start and end times', () => {
      const events = [makeEvent('Meeting #1', '10:03', '10:52')];
      const { proposals } = parseCalendarProposals(events, [], 40, null, null, null, '09:00');
      expect(proposals[0].startTime).toBe('10:00');
      expect(proposals[0].endTime).toBe('10:45');
    });

    it('calculates hours from rounded times', () => {
      const events = [makeEvent('Meeting #1', '09:00', '10:30')];
      const { proposals } = parseCalendarProposals(events, [], 40, null, null, null, '09:00');
      expect(proposals[0].hours).toBe(1.5);
    });

    // FR-014: sensitivity flag is no longer a routing signal — formerly-filtered
    // private/confidential events now flow through the normal proposal path.
    it('does NOT filter private events (FR-014); ticket-extracted private events appear as work', () => {
      const events = [
        makeEvent('1:1 with Manager #2097', '11:00', '11:30', { sensitivity: 'private' }),
        makeEvent('Normal Meeting #1', '10:00', '11:00'),
      ];
      const { proposals } = parseCalendarProposals(events, [], 40, null, null, null, '09:00');
      expect(proposals).toHaveLength(2);
      const priv = proposals.find((p) => p.subject === '1:1 with Manager #2097');
      expect(priv.ticketId).toBe(2097);
      expect(priv.status).toBe('proposed');
    });

    it('does NOT filter confidential events; surfaces them in proposals', () => {
      const events = [
        makeEvent('Secret Doctor Visit', '14:00', '15:00', { sensitivity: 'confidential' }),
      ];
      const { proposals } = parseCalendarProposals(events, [], 40, null, null, null, '09:00');
      expect(proposals).toHaveLength(1);
      expect(proposals[0].subject).toBe('Secret Doctor Visit');
      expect(proposals[0].status).toBe('needs-ticket');
    });

    it('return value no longer includes skippedPrivate (FR-014)', () => {
      const events = [makeEvent('Anything', '09:00', '10:00', { sensitivity: 'private' })];
      const result = parseCalendarProposals(events, [], 40, null, null, null, '09:00');
      expect(result.skippedPrivate).toBeUndefined();
    });

    it('detects overlap with existing entries', () => {
      const events = [makeEvent('Overlap #1', '09:00', '10:00')];
      const existing = [{ startTime: '09:00', hours: 1 }];
      const { proposals, skippedOverlap } = parseCalendarProposals(
        events,
        existing,
        40,
        null,
        null,
        null,
        '09:00'
      );
      expect(proposals).toHaveLength(0);
      expect(skippedOverlap).toEqual(['Overlap #1']);
    });

    it('does not skip non-overlapping entries', () => {
      const events = [makeEvent('No Overlap #1', '10:00', '11:00')];
      const existing = [{ startTime: '09:00', hours: 1 }];
      const { proposals } = parseCalendarProposals(events, existing, 40, null, null, null, '09:00');
      expect(proposals).toHaveLength(1);
    });

    // FR-013: holiday all-day events now anchor at workStart with workStart+dailyHours end
    it('handles all-day holiday with holiday ticket — anchored at workStart (FR-013)', () => {
      const events = [
        {
          subject: 'Bank Holiday',
          start: '',
          end: '',
          isAllDay: true,
          sensitivity: 'normal',
          showAs: 'free',
        },
      ];
      const { proposals } = parseCalendarProposals(events, [], 40, 999, null, null, '08:00');
      expect(proposals[0].category).toBe('holiday');
      expect(proposals[0].ticketId).toBe(999);
      expect(proposals[0].hours).toBe(8);
      expect(proposals[0].startTime).toBe('08:00');
      expect(proposals[0].endTime).toBe('16:00');
      expect(proposals[0].status).toBe('proposed');
    });

    it('uses 09:00 fallback for holiday when workStart is unset (FR-013)', () => {
      const events = [
        {
          subject: 'Bank Holiday',
          start: '',
          end: '',
          isAllDay: true,
          sensitivity: 'normal',
          showAs: 'free',
        },
      ];
      const { proposals } = parseCalendarProposals(events, [], 40, 999, null, null, undefined);
      expect(proposals[0].startTime).toBe('09:00');
      expect(proposals[0].endTime).toBe('17:00'); // 09:00 + 8h
    });

    it('handles all-day vacation event without vacationTicket configured', () => {
      const events = [
        {
          subject: 'Day Off',
          start: '',
          end: '',
          isAllDay: true,
          sensitivity: 'normal',
          showAs: 'free',
        },
      ];
      const { proposals } = parseCalendarProposals(events, [], 40, null, null, null, '09:00');
      expect(proposals[0].category).toBe('allday-other');
      expect(proposals[0].ticketId).toBeNull();
      expect(proposals[0].status).toBe('needs-ticket');
    });

    it('handles all-day non-holiday non-informational event', () => {
      const events = [
        {
          subject: 'Team Offsite',
          start: '',
          end: '',
          isAllDay: true,
          sensitivity: 'normal',
          showAs: 'busy',
        },
      ];
      const { proposals } = parseCalendarProposals(events, [], 40, 999, null, null, '09:00');
      expect(proposals[0].category).toBe('allday-other');
      expect(proposals[0].status).toBe('needs-ticket');
    });

    it('calculates daily hours from weekly hours (vacation routed to vacationTicket)', () => {
      const events = [
        {
          subject: 'Urlaub',
          start: '',
          end: '',
          isAllDay: true,
          sensitivity: 'normal',
          showAs: 'free',
        },
      ];
      // vacationTicket=999 so Urlaub auto-routes there; expect dailyHours = 38.5 / 5 = 7.7 → 7.75
      const { proposals } = parseCalendarProposals(events, [], 38.5, null, 999, null, '09:00');
      expect(proposals[0].category).toBe('vacation');
      expect(proposals[0].hours).toBe(7.75);
    });

    it('extracts first ticket number when multiple present', () => {
      const events = [makeEvent('Review #100 and #200', '09:00', '10:00')];
      const { proposals } = parseCalendarProposals(events, [], 40, null, null, null, '09:00');
      expect(proposals[0].ticketId).toBe(100);
    });

    it('skips zero-duration events after rounding', () => {
      const events = [makeEvent('Quick chat', '10:00', '10:02')];
      const { proposals } = parseCalendarProposals(events, [], 40, null, null, null, '09:00');
      expect(proposals).toHaveLength(0);
    });

    // Feature 025 — non-work classifier
    it('routes non-work events to break ticket and preserves real end time', () => {
      const events = [
        makeEvent('Lunch with Team', '12:00', '13:00'),
        makeEvent('Private Doctor Appointment', '15:00', '16:00'),
      ];
      const { proposals } = parseCalendarProposals(events, [], 40, null, null, 2134, '09:00');
      expect(proposals).toHaveLength(2);
      for (const p of proposals) {
        expect(p.category).toBe('break');
        expect(p.ticketId).toBe(2134);
        expect(p.hours).toBe(0);
        expect(p.status).toBe('proposed');
        expect(p.endTime).not.toBe(p.startTime); // real Outlook end preserved
      }
      expect(proposals[0]).toMatchObject({ startTime: '12:00', endTime: '13:00' });
      expect(proposals[1]).toMatchObject({ startTime: '15:00', endTime: '16:00' });
    });

    it('falls back to needs-ticket when non-work but no break ticket configured', () => {
      const events = [makeEvent('Lunch with Team', '12:00', '13:00')];
      const { proposals } = parseCalendarProposals(events, [], 40, null, null, null, '09:00');
      expect(proposals[0].category).toBe('meeting');
      expect(proposals[0].status).toBe('needs-ticket');
      expect(proposals[0].ticketId).toBeNull();
    });

    it('extraction wins over classification (UAT-6)', () => {
      const events = [makeEvent('Lunch Sync #1234', '12:00', '13:00')];
      const { proposals } = parseCalendarProposals(events, [], 40, null, null, 2134, '09:00');
      expect(proposals[0].category).toBe('meeting');
      expect(proposals[0].ticketId).toBe(1234);
      expect(proposals[0].hours).toBe(1);
    });

    it('does not classify work-sounding subjects as non-work', () => {
      const events = [makeEvent('Sprint Planning', '10:00', '11:00')];
      const { proposals } = parseCalendarProposals(events, [], 40, null, null, 2134, '09:00');
      expect(proposals[0].category).toBe('meeting');
      expect(proposals[0].status).toBe('needs-ticket');
    });
  });

  describe('classifyAsNonWork', () => {
    it('matches English keywords', () => {
      expect(classifyAsNonWork('Lunch with Team')).toBe(true);
      expect(classifyAsNonWork('Private Doctor Appointment')).toBe(true);
      expect(classifyAsNonWork('Coffee chat')).toBe(true);
      expect(classifyAsNonWork('Gym session')).toBe(true);
    });

    it('matches German keywords (with umlauts)', () => {
      expect(classifyAsNonWork('Mittagessen mit Team')).toBe(true);
      expect(classifyAsNonWork('Arzttermin')).toBe(true);
      expect(classifyAsNonWork('Persönlich')).toBe(true);
    });

    it('does not match work-sounding subjects', () => {
      expect(classifyAsNonWork('Sprint Planning')).toBe(false);
      expect(classifyAsNonWork('Daily Standup')).toBe(false);
      expect(classifyAsNonWork('Code Review')).toBe(false);
      expect(classifyAsNonWork('Birthday John')).toBe(false);
    });

    it('respects word boundaries (no false-positive substring)', () => {
      // "ungym" should not match "gym"; "doctorate" should not match "doctor"
      expect(classifyAsNonWork('Ungymous Council')).toBe(false);
      expect(classifyAsNonWork('Doctorate Defense')).toBe(false);
    });

    it('returns false for empty input', () => {
      expect(classifyAsNonWork('')).toBe(false);
      expect(classifyAsNonWork(null)).toBe(false);
      expect(classifyAsNonWork(undefined)).toBe(false);
    });
  });

  describe('classifyAsInformational', () => {
    it('matches birthday/anniversary/reminder keywords (EN)', () => {
      expect(classifyAsInformational('Birthday John')).toBe(true);
      expect(classifyAsInformational('Sarah anniversary')).toBe(true);
      expect(classifyAsInformational('Reminder: Dentist next week')).toBe(true);
    });

    it('matches German variants', () => {
      expect(classifyAsInformational('Geburtstag Julia')).toBe(true);
      expect(classifyAsInformational('5. Jubiläum')).toBe(true);
      expect(classifyAsInformational('Erinnerung: Steuern')).toBe(true);
    });

    it('does not match work-sounding subjects', () => {
      expect(classifyAsInformational('Sprint Planning')).toBe(false);
      expect(classifyAsInformational('Bank Holiday')).toBe(false);
      expect(classifyAsInformational('Lunch with Team')).toBe(false);
    });
  });

  describe('parseCalendarProposals — informational all-day events', () => {
    it('routes informational all-day events to skippedInformational, not proposals', () => {
      const events = [
        {
          subject: 'Birthday John',
          start: '',
          end: '',
          isAllDay: true,
          sensitivity: 'normal',
          showAs: 'free',
        },
      ];
      const { proposals, skippedInformational } = parseCalendarProposals(
        events,
        [],
        40,
        999,
        null,
        2134,
        '09:00'
      );
      expect(proposals).toHaveLength(0);
      expect(skippedInformational).toEqual(['Birthday John']);
    });

    it('still routes holiday all-day events to holiday ticket (informational does not steal them)', () => {
      const events = [
        {
          subject: 'Bank Holiday',
          start: '',
          end: '',
          isAllDay: true,
          sensitivity: 'normal',
          showAs: 'free',
        },
      ];
      const { proposals, skippedInformational } = parseCalendarProposals(
        events,
        [],
        40,
        999,
        null,
        2134,
        '09:00'
      );
      expect(proposals).toHaveLength(1);
      expect(proposals[0].category).toBe('holiday');
      expect(skippedInformational).toEqual([]);
    });

    it('non-informational all-day non-holiday still asks (allday-other)', () => {
      const events = [
        {
          subject: 'Team Offsite',
          start: '',
          end: '',
          isAllDay: true,
          sensitivity: 'normal',
          showAs: 'busy',
        },
      ];
      const { proposals, skippedInformational } = parseCalendarProposals(
        events,
        [],
        40,
        999,
        null,
        2134,
        '09:00'
      );
      expect(proposals[0].category).toBe('allday-other');
      expect(proposals[0].status).toBe('needs-ticket');
      expect(skippedInformational).toEqual([]);
    });
  });

  describe('classifyAsBankHoliday / classifyAsVacation / classifyAsSick / classifyAsOvertimeComp', () => {
    it('bank-holiday classifier matches public-holiday terms (EN+DE)', () => {
      expect(classifyAsBankHoliday('Bank Holiday')).toBe(true);
      expect(classifyAsBankHoliday('Public Holiday')).toBe(true);
      expect(classifyAsBankHoliday('Feiertag')).toBe(true);
      expect(classifyAsBankHoliday('Holiday')).toBe(true); // user choice — plain "holiday" → bank
    });

    it('bank-holiday classifier matches named DE+EN public holidays', () => {
      expect(classifyAsBankHoliday('Christi Himmelfahrt')).toBe(true);
      expect(classifyAsBankHoliday('Karfreitag')).toBe(true);
      expect(classifyAsBankHoliday('Pfingstmontag')).toBe(true);
      expect(classifyAsBankHoliday('Tag der Deutschen Einheit')).toBe(true);
      expect(classifyAsBankHoliday('Weihnachten')).toBe(true);
      expect(classifyAsBankHoliday('Heiligabend')).toBe(true);
      expect(classifyAsBankHoliday('Christmas Day')).toBe(true);
      expect(classifyAsBankHoliday('Boxing Day')).toBe(true);
      expect(classifyAsBankHoliday('Thanksgiving')).toBe(true);
    });

    it('bank-holiday classifier handles curly apostrophes', () => {
      // Outlook may use curly apostrophes in localized holiday names
      expect(classifyAsBankHoliday('New Year’s Day')).toBe(true);
      expect(classifyAsBankHoliday("New Year's Day")).toBe(true);
    });

    it('vacation classifier matches vacation/OOO terms', () => {
      expect(classifyAsVacation('Vacation')).toBe(true);
      expect(classifyAsVacation('Urlaub')).toBe(true);
      expect(classifyAsVacation('Day off')).toBe(true);
      expect(classifyAsVacation('Out of office')).toBe(true);
      expect(classifyAsVacation('OOO')).toBe(true);
      expect(classifyAsVacation('Annual leave')).toBe(true);
    });

    it('sick classifier matches sick-leave terms but NOT vacation', () => {
      expect(classifyAsSick('Sick day')).toBe(true);
      expect(classifyAsSick('Krank')).toBe(true);
      expect(classifyAsSick('Krankmeldung')).toBe(true);
      expect(classifyAsSick('Vacation')).toBe(false);
      expect(classifyAsSick('Urlaub')).toBe(false);
    });

    it('overtime-comp classifier matches comp-time terms (EN+DE)', () => {
      expect(classifyAsOvertimeComp('Comp time')).toBe(true);
      expect(classifyAsOvertimeComp('Überstundenausgleich')).toBe(true);
      expect(classifyAsOvertimeComp('Überstundenabbau')).toBe(true);
      expect(classifyAsOvertimeComp('Zeitausgleich')).toBe(true);
      expect(classifyAsOvertimeComp('Gleittag')).toBe(true);
      expect(classifyAsOvertimeComp('Vacation')).toBe(false);
    });
  });

  describe('parseCalendarProposals — split holiday / vacation / overtime / sick routing', () => {
    const allDay = (subject) => ({
      subject,
      start: '',
      end: '',
      isAllDay: true,
      sensitivity: 'normal',
      showAs: 'free',
    });
    const HOLIDAY = 100;
    const VACATION = 200;
    const BREAK = 300;

    it('routes Bank Holiday to holidayTicket with daily hours', () => {
      const { proposals } = parseCalendarProposals(
        [allDay('Bank Holiday')],
        [],
        40,
        HOLIDAY,
        VACATION,
        BREAK,
        '09:00'
      );
      expect(proposals[0].category).toBe('holiday');
      expect(proposals[0].ticketId).toBe(HOLIDAY);
      expect(proposals[0].hours).toBe(8);
    });

    it('routes named holiday "Christi Himmelfahrt" to holidayTicket', () => {
      const { proposals } = parseCalendarProposals(
        [allDay('Christi Himmelfahrt')],
        [],
        40,
        HOLIDAY,
        VACATION,
        BREAK,
        '09:00'
      );
      expect(proposals[0].category).toBe('holiday');
      expect(proposals[0].ticketId).toBe(HOLIDAY);
    });

    it("uses showAs=oof + isAllDay fallback when subject doesn't match any keyword", () => {
      const ev = {
        subject: 'Erntedankfest',
        start: '',
        end: '',
        isAllDay: true,
        sensitivity: 'normal',
        showAs: 'oof',
      };
      const { proposals } = parseCalendarProposals([ev], [], 40, HOLIDAY, VACATION, BREAK, '09:00');
      expect(proposals[0].category).toBe('holiday');
      expect(proposals[0].ticketId).toBe(HOLIDAY);
    });

    it('subject keyword still wins over showAs fallback (Urlaub + showAs=oof → vacation)', () => {
      const ev = {
        subject: 'Urlaub',
        start: '',
        end: '',
        isAllDay: true,
        sensitivity: 'normal',
        showAs: 'oof',
      };
      const { proposals } = parseCalendarProposals([ev], [], 40, HOLIDAY, VACATION, BREAK, '09:00');
      expect(proposals[0].category).toBe('vacation');
      expect(proposals[0].ticketId).toBe(VACATION);
    });

    it('does NOT apply showAs fallback when showAs=busy or free', () => {
      const ev = {
        subject: 'Random Day',
        start: '',
        end: '',
        isAllDay: true,
        sensitivity: 'normal',
        showAs: 'busy',
      };
      const { proposals } = parseCalendarProposals([ev], [], 40, HOLIDAY, VACATION, BREAK, '09:00');
      expect(proposals[0].category).toBe('allday-other');
    });

    it('routes Urlaub to vacationTicket (NOT holidayTicket)', () => {
      const { proposals } = parseCalendarProposals(
        [allDay('Urlaub')],
        [],
        40,
        HOLIDAY,
        VACATION,
        BREAK,
        '09:00'
      );
      expect(proposals[0].category).toBe('vacation');
      expect(proposals[0].ticketId).toBe(VACATION);
      expect(proposals[0].hours).toBe(8);
    });

    it('routes Überstundenausgleich to breakTicket with 0h (NOT vacation)', () => {
      const { proposals } = parseCalendarProposals(
        [allDay('Überstundenausgleich')],
        [],
        40,
        HOLIDAY,
        VACATION,
        BREAK,
        '09:00'
      );
      expect(proposals[0].category).toBe('break');
      expect(proposals[0].ticketId).toBe(BREAK);
      expect(proposals[0].hours).toBe(0);
      // Visual block spans the workday (start..start+dailyHours)
      expect(proposals[0].startTime).toBe('09:00');
      expect(proposals[0].endTime).toBe('17:00');
    });

    it('routes sick-leave events to needs-ticket (no auto-routing)', () => {
      const { proposals } = parseCalendarProposals(
        [allDay('Krank')],
        [],
        40,
        HOLIDAY,
        VACATION,
        BREAK,
        '09:00'
      );
      expect(proposals[0].category).toBe('allday-other');
      expect(proposals[0].status).toBe('needs-ticket');
      expect(proposals[0].ticketId).toBeNull();
    });

    it('falls back to allday-other when vacationTicket unset for a vacation event', () => {
      const { proposals } = parseCalendarProposals(
        [allDay('Urlaub')],
        [],
        40,
        HOLIDAY,
        null,
        BREAK,
        '09:00'
      );
      expect(proposals[0].category).toBe('allday-other');
      expect(proposals[0].status).toBe('needs-ticket');
    });

    // Timed overtime-comp event should auto-route to break, same path as
    // generic non-work events.
    it('routes timed Überstundenabbau to break ticket', () => {
      const events = [
        {
          subject: 'Überstundenabbau',
          start: '2026-04-25T14:00:00',
          end: '2026-04-25T17:00:00',
          isAllDay: false,
          sensitivity: 'normal',
          showAs: 'free',
        },
      ];
      const { proposals } = parseCalendarProposals(
        events,
        [],
        40,
        HOLIDAY,
        VACATION,
        BREAK,
        '09:00'
      );
      expect(proposals[0].category).toBe('break');
      expect(proposals[0].ticketId).toBe(BREAK);
      expect(proposals[0].hours).toBe(0);
      expect(proposals[0].startTime).toBe('14:00');
      expect(proposals[0].endTime).toBe('17:00');
    });
  });
});
