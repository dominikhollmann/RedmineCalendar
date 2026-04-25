import { getCentralConfigSync } from './settings.js';
import { t } from './i18n.js';

let _msalInstance = null;

export function isOutlookConfigured() {
  const cfg = getCentralConfigSync();
  return !!(cfg?.azureClientId);
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

function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function timeToMins(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function parseCalendarProposals(events, existingEntries, weeklyHours, holidayTicket) {
  const dailyHours = weeklyHours ? Math.round((weeklyHours / 5) * 4) / 4 : 8;
  const proposals = [];
  let skippedPrivate = 0;
  let skippedOverlap = 0;

  for (const ev of events) {
    if (ev.sensitivity === 'private' || ev.sensitivity === 'confidential') {
      skippedPrivate++;
      continue;
    }

    if (ev.isAllDay) {
      const subjectLower = ev.subject.toLowerCase();
      const isHoliday = /holiday|feiertag|urlaub|day off|bank holiday|ooo|out of office|abwesend|krank|sick/i.test(ev.subject);
      proposals.push({
        subject: ev.subject,
        startTime: null,
        endTime: null,
        hours: dailyHours,
        ticketId: isHoliday && holidayTicket ? holidayTicket : null,
        ticketSubject: null,
        isAllDay: true,
        category: isHoliday ? 'holiday' : 'allday-other',
        status: isHoliday && holidayTicket ? 'proposed' : 'needs-ticket',
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
      if (!entry.startTime) return false;
      const eStart = timeToMins(entry.startTime);
      const eEnd = eStart + Math.round(entry.hours * 60);
      return intervalsOverlap(startMins, endMins, eStart, eEnd);
    });

    if (overlaps) {
      skippedOverlap++;
      continue;
    }

    const hours = Math.round((endMins - startMins) / 15) * 0.25;
    const ticketId = extractTicketId(ev.subject);

    proposals.push({
      subject: ev.subject,
      startTime: startRounded,
      endTime: endRounded,
      hours,
      ticketId,
      ticketSubject: null,
      isAllDay: false,
      category: 'meeting',
      status: ticketId ? 'proposed' : 'needs-ticket',
    });
  }

  return { proposals, skippedPrivate, skippedOverlap };
}
