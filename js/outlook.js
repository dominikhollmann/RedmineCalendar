import { getCentralConfigSync } from './settings.js';
import { t } from './i18n.js';

let _msalInstance = null;

export function isOutlookConfigured() {
  const cfg = getCentralConfigSync();
  return !!(cfg?.azureClientId);
}

function isDemoMode() {
  return getCentralConfigSync()?.azureClientId === 'demo';
}

function generateDemoEvents(date) {
  return [
    { subject: 'Bank Holiday', start: `${date}T00:00:00`, end: `${date}T23:59:59`, isAllDay: true, sensitivity: 'normal', showAs: 'oof' },
    { subject: 'Birthday John', start: `${date}T00:00:00`, end: `${date}T23:59:59`, isAllDay: true, sensitivity: 'normal', showAs: 'free' },
    { subject: 'Daily Standup #2097', start: `${date}T09:00:00`, end: `${date}T09:15:00`, isAllDay: false, sensitivity: 'normal', showAs: 'busy' },
    { subject: 'Sprint Planning #2097', start: `${date}T09:30:00`, end: `${date}T10:30:00`, isAllDay: false, sensitivity: 'normal', showAs: 'busy' },
    { subject: 'Call with Customer', start: `${date}T11:03:00`, end: `${date}T11:48:00`, isAllDay: false, sensitivity: 'normal', showAs: 'busy' },
    { subject: 'Lunch with Team', start: `${date}T12:00:00`, end: `${date}T13:00:00`, isAllDay: false, sensitivity: 'normal', showAs: 'free' },
    { subject: 'Code Review #1456', start: `${date}T14:00:00`, end: `${date}T14:45:00`, isAllDay: false, sensitivity: 'normal', showAs: 'busy' },
    { subject: 'Private Doctor Appointment', start: `${date}T15:00:00`, end: `${date}T16:00:00`, isAllDay: false, sensitivity: 'private', showAs: 'busy' },
    { subject: 'Retrospective #2097', start: `${date}T16:00:00`, end: `${date}T17:00:00`, isAllDay: false, sensitivity: 'normal', showAs: 'busy' },
  ];
}

function getMsalInstance() {
  if (_msalInstance) return _msalInstance;
  const cfg = getCentralConfigSync();
  if (!cfg?.azureClientId) return null;
  const config = {
    auth: {
      clientId: cfg.azureClientId,
      authority: cfg.azureTenantId
        ? `https://login.microsoftonline.com/${cfg.azureTenantId}`
        : 'https://login.microsoftonline.com/common',
      redirectUri: window.location.origin + window.location.pathname,
    },
    cache: { cacheLocation: 'localStorage' },
  };
  _msalInstance = new msal.PublicClientApplication(config);
  return _msalInstance;
}

const SCOPES = ['Calendars.Read'];

export async function acquireToken() {
  const instance = getMsalInstance();
  if (!instance) throw new Error(t('outlook.not_configured'));
  const accounts = instance.getAllAccounts();
  const request = { scopes: SCOPES };
  if (accounts.length > 0) request.account = accounts[0];
  try {
    const response = await instance.acquireTokenSilent(request);
    return response.accessToken;
  } catch {
    const response = await instance.acquireTokenPopup(request);
    return response.accessToken;
  }
}

export async function fetchCalendarEvents(date) {
  if (isDemoMode()) return generateDemoEvents(date);

  const token = await acquireToken();
  const start = `${date}T00:00:00.000Z`;
  const end = `${date}T23:59:59.999Z`;
  const url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}&$select=subject,start,end,isAllDay,sensitivity,showAs&$orderby=start/dateTime&$top=50`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(t('outlook.fetch_error', { message: `HTTP ${response.status}` }));
  }
  const data = await response.json();
  return (data.value ?? []).map(ev => ({
    subject: ev.subject ?? '',
    start: ev.start?.dateTime ?? '',
    end: ev.end?.dateTime ?? '',
    isAllDay: ev.isAllDay ?? false,
    sensitivity: ev.sensitivity ?? 'normal',
    showAs: ev.showAs ?? 'busy',
  }));
}

export function roundToQuarter(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMins = h * 60 + m;
  const rounded = Math.round(totalMins / 15) * 15;
  const rh = Math.floor(rounded / 60) % 24;
  const rm = rounded % 60;
  return `${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}`;
}

function extractTicketId(subject) {
  const match = subject.match(/#(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

const NON_WORK_KEYWORDS = [
  // English
  'lunch', 'breakfast', 'dinner', 'coffee', 'gym', 'doctor', 'dentist',
  'appointment', 'errand', 'school run', 'school pickup', 'personal',
  'break', 'vacation', 'day off', 'walk', 'private',
  // German (lowercased; includes umlauts)
  'mittagessen', 'frühstück', 'abendessen', 'kaffee', 'sport', 'fitness',
  'arzt', 'arzttermin', 'zahnarzt', 'persönlich', 'pause', 'privat',
  'urlaub', 'spaziergang',
];

// Pure-information events that should never be booked (birthdays, reminders).
const INFORMATIONAL_KEYWORDS = [
  // English
  'birthday', 'anniversary', 'reminder', 'fyi', 'office closed',
  // German
  'geburtstag', 'jubiläum', 'erinnerung', 'büro geschlossen',
];

// Bank/public holidays — routed to holidayTicket. Includes generic terms plus
// the most common DE+EN public-holiday names so Outlook-subscribed holiday
// calendars (which use the holiday's name as the event subject) get auto-routed.
const BANK_HOLIDAY_KEYWORDS = [
  // Generic
  'bank holiday', 'public holiday', 'national holiday', 'holiday',
  'feiertag',
  // German federal/common
  'neujahr', 'silvester',
  'karfreitag', 'ostermontag', 'ostersonntag',
  'maifeiertag', 'tag der arbeit',
  'christi himmelfahrt',
  'pfingstmontag', 'pfingstsonntag',
  'fronleichnam',
  'mariä himmelfahrt',
  'tag der deutschen einheit',
  'reformationstag',
  'allerheiligen',
  'buß- und bettag', 'buss- und bettag',
  'weihnachten', 'weihnachtstag', 'heiligabend',
  // English (US/UK common)
  "new year's day", "new year's eve",
  'good friday', 'easter monday', 'easter sunday',
  'memorial day',
  'independence day', 'fourth of july',
  'labor day', 'labour day',
  'columbus day', 'veterans day',
  'thanksgiving',
  'christmas day', 'christmas eve', 'boxing day',
];

// Personal vacation / OOO — routed to vacationTicket.
const VACATION_KEYWORDS = [
  'vacation', 'urlaub', 'day off', 'ooo', 'out of office', 'abwesend',
  'pto', 'annual leave',
];

// Sick-leave detection: sick events should never auto-route — they need an
// explicit user decision because the company's sick-leave ticket is not
// derivable from the calendar.
const SICK_KEYWORDS = [
  'sick', 'sick day', 'sick leave',
  'krank', 'krankheit', 'krankmeldung',
];

// Overtime-compensation events: the user is taking time off against
// accumulated overtime, so no hours are booked (treated like a break).
const OVERTIME_COMP_KEYWORDS = [
  'overtime', 'comp time', 'compensation time', 'time off in lieu', 'toil',
  'überstundenausgleich', 'überstundenabbau', 'zeitausgleich', 'gleittag',
];

const LETTER_RE = /\p{L}/u;

function normalizeForMatch(s) {
  // Normalize curly apostrophes/dashes so multi-word holiday/vacation names
  // match regardless of which character variant Outlook uses.
  return s.toLowerCase()
    .replace(/[‘’‛ʼ]/g, "'")
    .replace(/[–—]/g, '-');
}

function matchesAnyKeyword(subject, keywords) {
  if (!subject) return false;
  const lower = normalizeForMatch(subject);
  return keywords.some(kw => {
    let from = 0;
    while (from <= lower.length) {
      const idx = lower.indexOf(kw, from);
      if (idx === -1) return false;
      const before = idx === 0 ? '' : lower[idx - 1];
      const after = idx + kw.length >= lower.length ? '' : lower[idx + kw.length];
      if (!LETTER_RE.test(before) && !LETTER_RE.test(after)) return true;
      from = idx + 1;
    }
    return false;
  });
}

export function classifyAsNonWork(subject) {
  return matchesAnyKeyword(subject, NON_WORK_KEYWORDS);
}

export function classifyAsInformational(subject) {
  return matchesAnyKeyword(subject, INFORMATIONAL_KEYWORDS);
}

export function classifyAsBankHoliday(subject) {
  return matchesAnyKeyword(subject, BANK_HOLIDAY_KEYWORDS);
}

export function classifyAsVacation(subject) {
  return matchesAnyKeyword(subject, VACATION_KEYWORDS);
}

export function classifyAsSick(subject) {
  return matchesAnyKeyword(subject, SICK_KEYWORDS);
}

export function classifyAsOvertimeComp(subject) {
  return matchesAnyKeyword(subject, OVERTIME_COMP_KEYWORDS);
}

function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function timeToMins(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function parseCalendarProposals(events, existingEntries, weeklyHours, holidayTicket, vacationTicket, breakTicket, workStart) {
  const dailyHours = weeklyHours ? Math.round((weeklyHours / 5) * 4) / 4 : 8;
  const anchorStart = workStart || '09:00';
  const proposals = [];
  const skippedOverlap = [];
  const skippedInformational = [];

  for (const ev of events) {
    // FR-014: Outlook sensitivity flag is not a routing signal.

    if (ev.isAllDay) {
      // Sick-leave events override every other classification — the company's
      // sick-leave ticket cannot be inferred from the calendar, so we never
      // auto-route them. They land in "needs user input".
      const isSick = classifyAsSick(ev.subject);
      const subjectIsBankHoliday = !isSick && classifyAsBankHoliday(ev.subject);
      const isOvertimeComp = !isSick && !subjectIsBankHoliday && classifyAsOvertimeComp(ev.subject);
      const isVacation    = !isSick && !subjectIsBankHoliday && !isOvertimeComp && classifyAsVacation(ev.subject);
      // Fallback signal: Outlook subscriptions tag holidays as showAs='oof'.
      // Treat any all-day "absent" event with no keyword match as a bank holiday.
      const isAbsentFallback = !isSick && !subjectIsBankHoliday && !isOvertimeComp && !isVacation
        && ev.showAs === 'oof';
      const isBankHoliday = subjectIsBankHoliday || isAbsentFallback;
      if (!isSick && !isBankHoliday && !isOvertimeComp && !isVacation && classifyAsInformational(ev.subject)) {
        skippedInformational.push(ev.subject);
        continue;
      }

      let category, ticketId, hours, endTime;
      if (isBankHoliday && holidayTicket) {
        category = 'holiday';
        ticketId = holidayTicket;
        hours    = dailyHours;
        endTime  = addHoursToTime(anchorStart, dailyHours);
      } else if (isOvertimeComp && breakTicket) {
        // Overtime compensation: full-day visual block but 0 hours booked.
        category = 'break';
        ticketId = breakTicket;
        hours    = 0;
        endTime  = addHoursToTime(anchorStart, dailyHours);
      } else if (isVacation && vacationTicket) {
        category = 'vacation';
        ticketId = vacationTicket;
        hours    = dailyHours;
        endTime  = addHoursToTime(anchorStart, dailyHours);
      } else {
        category = 'allday-other';
        ticketId = null;
        hours    = 0;
        endTime  = anchorStart;
      }

      proposals.push({
        subject: ev.subject,
        startTime: anchorStart,
        endTime,
        hours,
        ticketId,
        ticketSubject: null,
        isAllDay: true,
        category,
        status: ticketId ? 'proposed' : 'needs-ticket',
      });
      continue;
    }

    const startLocal = ev.start.slice(11, 16);
    const endLocal = ev.end.slice(11, 16);
    const startRounded = roundToQuarter(startLocal);
    const endRounded = roundToQuarter(endLocal);
    const startMins = timeToMins(startRounded);
    const endMins = timeToMins(endRounded);

    if (endMins <= startMins) continue;

    const overlaps = existingEntries.some(entry => {
      const eStart = timeToMins(entry.startTime);
      const eEnd = eStart + Math.round(entry.hours * 60);
      return intervalsOverlap(startMins, endMins, eStart, eEnd);
    });

    if (overlaps) {
      skippedOverlap.push(ev.subject);
      continue;
    }

    const hours = Math.round((endMins - startMins) / 15) * 0.25;
    const extractedTicket = extractTicketId(ev.subject);

    // Extraction wins over classification (Q5/UAT-6).
    if (extractedTicket) {
      proposals.push({
        subject: ev.subject,
        startTime: startRounded,
        endTime: endRounded,
        hours,
        ticketId: extractedTicket,
        ticketSubject: null,
        isAllDay: false,
        category: 'meeting',
        status: 'proposed',
      });
      continue;
    }

    // Subject-based non-work classification (FR-001) — non-work events plus
    // overtime-compensation timed blocks both route to the break ticket.
    if (breakTicket && (classifyAsNonWork(ev.subject) || classifyAsOvertimeComp(ev.subject))) {
      proposals.push({
        subject: ev.subject,
        startTime: startRounded,
        endTime: endRounded,
        hours: 0,
        ticketId: breakTicket,
        ticketSubject: null,
        isAllDay: false,
        category: 'break',
        status: 'proposed',
      });
      continue;
    }

    proposals.push({
      subject: ev.subject,
      startTime: startRounded,
      endTime: endRounded,
      hours,
      ticketId: null,
      ticketSubject: null,
      isAllDay: false,
      category: 'meeting',
      status: 'needs-ticket',
    });
  }

  return { proposals, skippedOverlap, skippedInformational };
}

function addHoursToTime(hhmm, hours) {
  const [h, m] = hhmm.split(':').map(Number);
  const totalMins = h * 60 + m + Math.round(hours * 60);
  const eh = Math.floor(totalMins / 60) % 24;
  const em = totalMins % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}
