import { getCentralConfigSync } from './config-store.js';
import { t } from './i18n.js';
import { timeToMins } from './time-utils.js';
import { DEFAULT_WEEKLY_HOURS } from './config.js';

/** @typedef {import('./types').OutlookEvent} OutlookEvent */
/** @typedef {import('./types').CalendarProposal} CalendarProposal */

let _msalInstance = null;

/**
 * Whether the admin has wired up an Azure clientId for Outlook integration.
 * @returns {boolean}
 */
export function isOutlookConfigured() {
  const cfg = getCentralConfigSync();
  return !!cfg?.azureClientId;
}

export function isDemoMode() {
  return getCentralConfigSync()?.azureClientId === 'demo';
}

// Per-day event templates for demo mode (azureClientId === 'demo').
// Each entry is [subject, from, to, allDay, sensitivity, showAs].
// yesterday: varied morning, no all-day event
const DEMO_YESTERDAY = [
  ['Team Sync #1456', '09:00:00', '09:30:00', false, 'normal', 'busy'],
  ['1:1 with Manager', '10:00:00', '10:30:00', false, 'normal', 'busy'],
  ['Lunch with Team', '12:00:00', '13:00:00', false, 'normal', 'free'],
  ['Design Review #2097', '14:00:00', '14:55:00', false, 'normal', 'busy'],
  ['Sprint Planning #2097', '15:30:00', '16:30:00', false, 'normal', 'busy'],
];

// today: has all-day event + the full variety of classifications
const DEMO_TODAY = [
  ['Bank Holiday', '00:00:00', '23:59:59', true, 'normal', 'oof'],
  ['Daily Standup #2097', '09:00:00', '09:15:00', false, 'normal', 'busy'],
  ['Sprint Planning #2097', '09:30:00', '10:30:00', false, 'normal', 'busy'],
  ['Call with Customer', '11:03:00', '11:48:00', false, 'normal', 'busy'],
  ['Lunch with Team', '12:00:00', '13:00:00', false, 'normal', 'free'],
  ['Code Review #1456', '14:00:00', '14:45:00', false, 'normal', 'busy'],
  ['Private Doctor Appointment', '15:00:00', '16:00:00', false, 'private', 'busy'],
];

// tomorrow: no all-day event, different mix
const DEMO_TOMORROW = [
  ['Daily Standup #2097', '09:00:00', '09:15:00', false, 'normal', 'busy'],
  ['Architecture Review #3001', '10:00:00', '11:30:00', false, 'normal', 'busy'],
  ['Call with Customer', '11:03:00', '11:48:00', false, 'normal', 'busy'],
  ['Lunch with Team', '12:00:00', '13:00:00', false, 'normal', 'free'],
  ['Retrospective #2097', '16:00:00', '17:00:00', false, 'normal', 'busy'],
];

// Multi-day all-day demo events for the long-Outlook-event expansion feature
// (050). Drag one onto the Bookings column to fan out one entry per weekday
// across its span. Each: [subject, startOffsetDays, spanDays, showAs].
//   - "Company Holiday": 10 days from day-after-tomorrow (always crosses a
//     weekend); showAs 'oof' routes it to holidayTicket when configured.
//   - "Workshop": 4 days starting right after the holiday; no ticket keyword
//     and showAs 'busy', so it stays "needs-ticket" and opens the modal once.
/** @type {Array<[string, number, number, string]>} */
const DEMO_MULTI_DAY_EVENTS = [
  ['Company Holiday', 2, 10, 'oof'],
  ['Workshop', 12, 4, 'busy'],
];

/** Today's local date as YYYY-MM-DD. Shared by Outlook + Teams demo generators. */
export function todayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A YYYY-MM-DD date offset from `base` by `days` (UTC arithmetic). */
export function offsetYmd(base, days) {
  const [y, m, day] = base.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, day + days));
  return dt.toISOString().slice(0, 10);
}

function _templatesToEvents(date, templates) {
  return templates.map(([subject, from, to, allDay, sens, showAs]) => ({
    subject,
    // All-day events mirror Graph: start at midnight, end at the EXCLUSIVE
    // midnight of the next day (the from/to columns are ignored for all-day).
    start: allDay ? `${date}T00:00:00` : `${date}T${from}`,
    end: allDay ? `${offsetYmd(date, 1)}T00:00:00` : `${date}T${to}`,
    isAllDay: allDay,
    sensitivity: sens,
    showAs,
  }));
}

/**
 * Build a multi-day all-day demo event carrying its full span. Mirrors Graph's
 * all-day shape: `end` is the EXCLUSIVE midnight of the day after the last day
 * (normalized to an inclusive last-day end by `fetchCalendarEvents`). Carrying
 * the whole range means the long-event expansion sees it regardless of which
 * day it is dragged from.
 * @param {string} today
 * @param {[string, number, number, string]} spec  [subject, offset, span, showAs]
 */
function _multiDayEvent(today, [subject, offset, span, showAs]) {
  return {
    subject,
    start: `${offsetYmd(today, offset)}T00:00:00`,
    end: `${offsetYmd(today, offset + span)}T00:00:00`,
    isAllDay: true,
    sensitivity: 'normal',
    showAs,
  };
}

/** Whether `date` falls within a multi-day spec's [start, last-day] inclusive range. */
function _dateInSpan(today, offset, span, date) {
  return date >= offsetYmd(today, offset) && date <= offsetYmd(today, offset + span - 1);
}

function generateDemoEvents(date) {
  const today = todayYmd();
  const events = [];
  if (date === today) events.push(..._templatesToEvents(date, DEMO_TODAY));
  else if (date === offsetYmd(today, -1)) events.push(..._templatesToEvents(date, DEMO_YESTERDAY));
  else if (date === offsetYmd(today, 1)) events.push(..._templatesToEvents(date, DEMO_TOMORROW));
  // Multi-day events surface on every day of their span (mirrors Graph calendarView).
  for (const spec of DEMO_MULTI_DAY_EVENTS) {
    if (_dateInSpan(today, spec[1], spec[2], date)) events.push(_multiDayEvent(today, spec));
  }
  return events;
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
const FEEDBACK_SCOPES = ['Mail.Send'];

/** Whether the user is currently signed in via MSAL. @returns {boolean} */
export function isMsalSignedIn() {
  return (getMsalInstance()?.getAllAccounts().length ?? 0) > 0;
}

/** Display name of the signed-in MSAL account, or empty string. @returns {string} */
export function getSignedInDisplayName() {
  return getMsalInstance()?.getAllAccounts()[0]?.name ?? '';
}

async function _acquireTokenWithScopes(scopes) {
  const instance = getMsalInstance();
  if (!instance) throw new Error(t('outlook.not_configured'));
  const accounts = instance.getAllAccounts();
  const req = { scopes };
  if (accounts.length > 0) req.account = accounts[0];
  try {
    return (await instance.acquireTokenSilent(req)).accessToken;
  } catch {
    return (await instance.acquireTokenPopup(req)).accessToken;
  }
}

/**
 * Send a FeedbackReport as a rich HTML email via the Graph sendMail API.
 * @param {import('./types').FeedbackReport} report
 * @param {string} htmlBody
 */
export async function sendFeedbackEmail(report, htmlBody) {
  const token = await acquireFeedbackToken();
  const isBug = report.category === 'bug';
  const msg = {
    subject: `${isBug ? 'Bug Report' : 'Suggestion'} — RedmineCalendar [${report.timestamp}]`,
    body: { contentType: 'HTML', content: htmlBody },
    toRecipients: [{ emailAddress: { address: report.feedbackEmail } }],
  };
  if (isBug && report.screenshotDataUrl) {
    msg.attachments = [
      {
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: 'screenshot.png',
        contentType: 'image/png',
        contentBytes: report.screenshotDataUrl.replace(/^data:image\/png;base64,/, ''),
      },
    ];
  }
  const resp = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: msg, saveToSentItems: false }),
  });
  if (!resp.ok) {
    if (resp.status === 403)
      throw Object.assign(new Error(t('feedback.mail_send_forbidden')), { status: 403 });
    throw new Error(t('outlook.fetch_error', { message: `HTTP ${resp.status}` }));
  }
}

/**
 * Acquire a Mail.Send-scoped token (separate from Calendars.Read).
 * @returns {Promise<string>}
 */
export async function acquireFeedbackToken() {
  return _acquireTokenWithScopes(FEEDBACK_SCOPES);
}

/**
 * Acquire a Graph API access token via MSAL — silent first, popup as fallback.
 * @returns {Promise<string>} The bearer access token.
 * @throws {Error} when Outlook is not configured.
 */
export async function acquireToken() {
  return _acquireTokenWithScopes(SCOPES);
}

/**
 * Normalize an all-day event's end from Graph's EXCLUSIVE convention (midnight of
 * the day after the last day) to an inclusive last-day end, so downstream
 * date-slice logic (multi-day detection, weekday expansion, span display) counts
 * the correct number of days. No-op for timed events and ends that are not at
 * midnight (defensive — Graph always returns midnight for all-day events).
 * @param {OutlookEvent} ev
 * @returns {OutlookEvent}
 */
function _normalizeAllDayEnd(ev) {
  if (!ev.isAllDay || !ev.end || ev.end.slice(11, 16) !== '00:00') return ev;
  return { ...ev, end: `${offsetYmd(ev.end.slice(0, 10), -1)}T23:59:59` };
}

/**
 * Fetch Outlook calendar events for a single day. Returns demo data when
 * `azureClientId === 'demo'`. All-day ends are normalized from Graph's exclusive
 * convention to an inclusive last day.
 * @param {string} date  YYYY-MM-DD
 * @returns {Promise<OutlookEvent[]>}
 * @throws {Error} on Graph API errors.
 */
export async function fetchCalendarEvents(date) {
  if (isDemoMode()) return generateDemoEvents(date).map(_normalizeAllDayEnd);

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
  return (data.value ?? []).map((ev) =>
    _normalizeAllDayEnd({
      subject: ev.subject ?? '',
      start: ev.start?.dateTime ?? '',
      end: ev.end?.dateTime ?? '',
      isAllDay: ev.isAllDay ?? false,
      sensitivity: ev.sensitivity ?? 'normal',
      showAs: ev.showAs ?? 'busy',
    })
  );
}

/**
 * Round an `HH:MM` string to the nearest 15-minute boundary.
 * @param {string} timeStr  HH:MM
 * @returns {string}        HH:MM
 */
export function roundToQuarter(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMins = h * 60 + m;
  const rounded = Math.round(totalMins / 15) * 15;
  const rh = Math.floor(rounded / 60) % 24;
  const rm = rounded % 60;
  return `${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}`;
}

export function extractTicketId(subject) {
  const match = subject.match(/#(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

const NON_WORK_KEYWORDS = [
  // English
  'lunch',
  'breakfast',
  'dinner',
  'coffee',
  'gym',
  'doctor',
  'dentist',
  'appointment',
  'errand',
  'school run',
  'school pickup',
  'personal',
  'break',
  'vacation',
  'day off',
  'walk',
  'private',
  // German (lowercased; includes umlauts)
  'mittagessen',
  'frühstück',
  'abendessen',
  'kaffee',
  'sport',
  'fitness',
  'arzt',
  'arzttermin',
  'zahnarzt',
  'persönlich',
  'pause',
  'privat',
  'urlaub',
  'spaziergang',
];

// Pure-information events that should never be booked (birthdays, reminders).
const INFORMATIONAL_KEYWORDS = [
  // English
  'birthday',
  'anniversary',
  'reminder',
  'fyi',
  'office closed',
  // German
  'geburtstag',
  'jubiläum',
  'erinnerung',
  'büro geschlossen',
];

// Bank/public holidays — routed to holidayTicket. Includes generic terms plus
// the most common DE+EN public-holiday names so Outlook-subscribed holiday
// calendars (which use the holiday's name as the event subject) get auto-routed.
const BANK_HOLIDAY_KEYWORDS = [
  // Generic
  'bank holiday',
  'public holiday',
  'national holiday',
  'holiday',
  'feiertag',
  // German federal/common
  'neujahr',
  'silvester',
  'karfreitag',
  'ostermontag',
  'ostersonntag',
  'maifeiertag',
  'tag der arbeit',
  'christi himmelfahrt',
  'pfingstmontag',
  'pfingstsonntag',
  'fronleichnam',
  'mariä himmelfahrt',
  'tag der deutschen einheit',
  'reformationstag',
  'allerheiligen',
  'buß- und bettag',
  'buss- und bettag',
  'weihnachten',
  'weihnachtstag',
  'heiligabend',
  // English (US/UK common)
  "new year's day",
  "new year's eve",
  'good friday',
  'easter monday',
  'easter sunday',
  'memorial day',
  'independence day',
  'fourth of july',
  'labor day',
  'labour day',
  'columbus day',
  'veterans day',
  'thanksgiving',
  'christmas day',
  'christmas eve',
  'boxing day',
];

// Personal vacation / OOO — routed to vacationTicket.
const VACATION_KEYWORDS = [
  'vacation',
  'urlaub',
  'day off',
  'ooo',
  'out of office',
  'abwesend',
  'pto',
  'annual leave',
];

// Sick-leave detection: sick events should never auto-route — they need an
// explicit user decision because the company's sick-leave ticket is not
// derivable from the calendar.
const SICK_KEYWORDS = ['sick', 'sick day', 'sick leave', 'krank', 'krankheit', 'krankmeldung'];

// Overtime-compensation events: the user is taking time off against
// accumulated overtime, so no hours are booked (treated like a break).
const OVERTIME_COMP_KEYWORDS = [
  'overtime',
  'comp time',
  'compensation time',
  'time off in lieu',
  'toil',
  'überstundenausgleich',
  'überstundenabbau',
  'zeitausgleich',
  'gleittag',
];

const LETTER_RE = /\p{L}/u;

function normalizeForMatch(s) {
  // Normalize curly apostrophes/dashes so multi-word holiday/vacation names
  // match regardless of which character variant Outlook uses.
  return s
    .toLowerCase()
    .replace(/[‘’‛ʼ]/g, "'")
    .replace(/[–—]/g, '-');
}

function matchesAnyKeyword(subject, keywords) {
  if (!subject) return false;
  const lower = normalizeForMatch(subject);
  return keywords.some((kw) => {
    let from = 0;
    while (from <= lower.length) {
      const idx = lower.indexOf(kw, from);
      if (idx === -1) return false;
      const before = idx === 0 ? '' : lower[idx - 1];
      const after = idx + kw.length >= lower.length ? '' : lower[idx + kw.length];
      if (!LETTER_RE.test(before) && !LETTER_RE.test(after)) return true;
      from = idx + 1;
    }
    /* c8 ignore next — unreachable for multi-char keywords; loop always exits via return on line above or via indexOf returning -1 */
    return false;
  });
}

/** Whether the subject matches a non-work keyword (lunch, gym, doctor, …). @param {string} subject @returns {boolean} */
export function classifyAsNonWork(subject) {
  return matchesAnyKeyword(subject, NON_WORK_KEYWORDS);
}

/** Whether the subject matches an informational keyword (birthday, reminder, …). @param {string} subject @returns {boolean} */
export function classifyAsInformational(subject) {
  return matchesAnyKeyword(subject, INFORMATIONAL_KEYWORDS);
}

/** Whether the subject matches a German/English bank-holiday name. @param {string} subject @returns {boolean} */
export function classifyAsBankHoliday(subject) {
  return matchesAnyKeyword(subject, BANK_HOLIDAY_KEYWORDS);
}

/** Whether the subject matches a vacation/OOO keyword. @param {string} subject @returns {boolean} */
export function classifyAsVacation(subject) {
  return matchesAnyKeyword(subject, VACATION_KEYWORDS);
}

/** Whether the subject matches a sick-leave keyword (deliberately never auto-routed). @param {string} subject @returns {boolean} */
export function classifyAsSick(subject) {
  return matchesAnyKeyword(subject, SICK_KEYWORDS);
}

/** Whether the subject matches an overtime-compensation keyword (TOIL, Gleittag, …). @param {string} subject @returns {boolean} */
export function classifyAsOvertimeComp(subject) {
  return matchesAnyKeyword(subject, OVERTIME_COMP_KEYWORDS);
}

function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function classifyAllDay(ev) {
  // Sick-leave events override every other classification — the company's
  // sick-leave ticket cannot be inferred from the calendar, so we never
  // auto-route them. They land in "needs user input".
  const isSick = classifyAsSick(ev.subject);
  if (isSick) return { kind: 'other' };
  if (classifyAsBankHoliday(ev.subject)) return { kind: 'bankHoliday' };
  if (classifyAsOvertimeComp(ev.subject)) return { kind: 'overtimeComp' };
  if (classifyAsVacation(ev.subject)) return { kind: 'vacation' };
  // Fallback signal: Outlook subscriptions tag holidays as showAs='oof'.
  // Treat any all-day "absent" event with no keyword match as a bank holiday.
  if (ev.showAs === 'oof') return { kind: 'bankHoliday' };
  if (classifyAsInformational(ev.subject)) return { kind: 'informational' };
  return { kind: 'other' };
}

function buildAllDayDispatch(dailyHours, anchorStart, holidayTicket, vacationTicket, breakTicket) {
  const fullDayEnd = addHoursToTime(anchorStart, dailyHours);
  return {
    bankHoliday: holidayTicket
      ? { category: 'holiday', ticketId: holidayTicket, hours: dailyHours, endTime: fullDayEnd }
      : null,
    // Overtime compensation: full-day visual block but 0 hours booked.
    overtimeComp: breakTicket
      ? { category: 'break', ticketId: breakTicket, hours: 0, endTime: fullDayEnd }
      : null,
    vacation: vacationTicket
      ? { category: 'vacation', ticketId: vacationTicket, hours: dailyHours, endTime: fullDayEnd }
      : null,
  };
}

function buildAllDayProposal(ev, anchorStart, dispatchEntry) {
  const resolved = dispatchEntry || {
    category: 'allday-other',
    ticketId: null,
    hours: 0,
    endTime: anchorStart,
  };
  return {
    subject: ev.subject,
    startTime: anchorStart,
    endTime: resolved.endTime,
    hours: resolved.hours,
    ticketId: resolved.ticketId,
    ticketSubject: null,
    isAllDay: true,
    category: resolved.category,
    status: resolved.ticketId ? 'proposed' : 'needs-ticket',
  };
}

function handleAllDayEvent(ev, ctx) {
  const { kind } = classifyAllDay(ev);
  if (kind === 'informational') {
    ctx.skippedInformational.push(ev.subject);
    return;
  }
  const dispatchEntry = kind === 'other' ? null : ctx.allDayDispatch[kind];
  ctx.proposals.push(buildAllDayProposal(ev, ctx.anchorStart, dispatchEntry));
}

function computeTimedBounds(ev) {
  const startRaw = ev.start.slice(11, 16);
  const endRaw = ev.end.slice(11, 16);
  const startRounded = roundToQuarter(startRaw);
  const endRounded = roundToQuarter(endRaw);
  const startMins = timeToMins(startRounded);
  const endMins = timeToMins(endRounded);
  return { startRaw, endRaw, startRounded, endRounded, startMins, endMins };
}

function hasOverlap(startMins, endMins, existingEntries) {
  return existingEntries.some((entry) => {
    if (!entry.startTime) return false;
    const eStart = timeToMins(entry.startTime);
    const eEnd = eStart + Math.round(entry.hours * 60);
    return intervalsOverlap(startMins, endMins, eStart, eEnd);
  });
}

function buildTimedProposal(ev, bounds, ticketId, category, hoursOverride) {
  const hours =
    hoursOverride !== undefined
      ? hoursOverride
      : Math.round((bounds.endMins - bounds.startMins) / 15) * 0.25;
  return {
    subject: ev.subject,
    startTime: bounds.startRaw,
    endTime: bounds.endRaw,
    startTimeBooked: bounds.startRounded,
    endTimeBooked: bounds.endRounded,
    hours,
    ticketId,
    ticketSubject: null,
    isAllDay: false,
    category,
    status: ticketId ? 'proposed' : 'needs-ticket',
  };
}

function handleTimedEvent(ev, ctx) {
  const bounds = computeTimedBounds(ev);
  if (bounds.endMins <= bounds.startMins) return;
  if (hasOverlap(bounds.startMins, bounds.endMins, ctx.existingEntries)) {
    ctx.skippedOverlap.push(ev.subject);
    return;
  }
  // Extraction wins over classification (Q5/UAT-6).
  const extractedTicket = extractTicketId(ev.subject);
  if (extractedTicket) {
    ctx.proposals.push(buildTimedProposal(ev, bounds, extractedTicket, 'meeting'));
    return;
  }
  // Subject-based non-work classification (FR-001) — non-work events plus
  // overtime-compensation timed blocks both route to the break ticket.
  if (ctx.breakTicket && (classifyAsNonWork(ev.subject) || classifyAsOvertimeComp(ev.subject))) {
    ctx.proposals.push(buildTimedProposal(ev, bounds, ctx.breakTicket, 'break', 0));
    return;
  }
  ctx.proposals.push(buildTimedProposal(ev, bounds, null, 'meeting'));
}

/**
 * Convert raw Outlook events into Redmine booking proposals, splitting them
 * into bookable, break, holiday, vacation, and "needs-input" buckets. Skipped
 * events are returned alongside the proposals so the caller can render an
 * EXCLUDED section.
 * @param {OutlookEvent[]} events
 * @param {Array<{startTime:string, hours:number}>} existingEntries  Already-booked entries to avoid double-booking.
 * @param {number|null} weeklyHours        Used to derive a daily-hours figure for all-day events; falls back to DEFAULT_WEEKLY_HOURS when missing.
 * @param {number|null} holidayTicket
 * @param {number|null} vacationTicket
 * @param {number|null} breakTicket
 * @param {string|null} workStart          HH:MM anchor for all-day events.
 * @returns {{proposals: CalendarProposal[], skippedOverlap: string[], skippedInformational: string[]}}
 */
export function parseCalendarProposals(
  events,
  existingEntries,
  weeklyHours,
  holidayTicket,
  vacationTicket,
  breakTicket,
  workStart
) {
  const dailyHours = (weeklyHours || DEFAULT_WEEKLY_HOURS) / 5;
  const anchorStart = workStart || '09:00';
  const ctx = {
    proposals: [],
    skippedOverlap: [],
    skippedInformational: [],
    existingEntries,
    breakTicket,
    anchorStart,
    allDayDispatch: buildAllDayDispatch(
      dailyHours,
      anchorStart,
      holidayTicket,
      vacationTicket,
      breakTicket
    ),
  };

  for (const ev of events) {
    // FR-014: Outlook sensitivity flag is not a routing signal.
    if (ev.isAllDay) handleAllDayEvent(ev, ctx);
    else handleTimedEvent(ev, ctx);
  }

  return {
    proposals: ctx.proposals,
    skippedOverlap: ctx.skippedOverlap,
    skippedInformational: ctx.skippedInformational,
  };
}

export function addHoursToTime(hhmm, hours) {
  const [h, m] = hhmm.split(':').map(Number);
  const totalMins = h * 60 + m + Math.round(hours * 60);
  const eh = Math.floor(totalMins / 60) % 24;
  const em = totalMins % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}
