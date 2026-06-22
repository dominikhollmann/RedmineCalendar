// @ts-nocheck — DOM-heavy module; exported normalisers are JSDoc-typed.

/** @typedef {import('./types.d.ts').TeamsCall} TeamsCall */
/** @typedef {import('./types.d.ts').TeamsMeeting} TeamsMeeting */
/** @typedef {import('./types.d.ts').TeamsActivityRecord} TeamsActivityRecord */
/** @typedef {import('./types.d.ts').PlanningEvent} PlanningEvent */
/** @typedef {import('./types.d.ts').TimeEntry} TimeEntry */

import { t } from './i18n.js';
import { STORAGE_KEY_PLANNING_SOURCE_TEAMS } from './config.js';
import { stampClosedStatus } from './redmine-api.js';
import {
  isOutlookConfigured,
  isDemoMode,
  isMsalSignedIn,
  acquireToken,
  roundToQuarter,
  getSignedInDisplayName,
  extractTicketId,
  todayYmd,
  offsetYmd,
} from './outlook.js';
import {
  renderColumnPrompt,
  createColumnState,
  withSpinnerAndError,
} from './planning-view-column-base.js';
import { renderPlanningColumn, rerenderPlanningColumn } from './planning-view-column-render.js';

// ── Per-column state ──────────────────────────────────────────────

const col = createColumnState();
export const getSelectedEventIds = col.getSelectedEventIds;
export const getSelectedEvents = col.getSelectedEvents;
export const clearSelection = col.clearSelection;

// ── Active FC instance (boxed so the shared orchestrator can swap it) ─────────
const _fcRef = { current: null };

// ── Demo mode ─────────────────────────────────────────────────────

// [dayOffset, id, subject, actualStart, actualEnd, scheduledStart, scheduledEnd]
const _DEMO_MEETINGS = [
  [-1, 'sync', 'Team Sync #1456', '09:03', '09:27', '09:00', '09:30'],
  [-1, 'design', 'Design Review #2097', '14:02', '14:57', '14:00', '14:55'],
  [0, 'standup', 'Daily Standup #2097', '09:01', '09:13', '09:00', '09:15'],
  [0, 'planning', 'Sprint Planning #2097', '09:33', '10:28', '09:30', '10:30'],
  [1, 'arch', 'Architecture Review #3001', '10:05', '11:23', '10:00', '11:30'],
  [1, 'retro', 'Retrospective #2097', '16:03', '16:58', '16:00', '17:00'],
];
// [dayOffset, id, startHHMM, endHHMM, participants]
const _DEMO_CALLS = [[0, 'call-1', '11:03', '11:48', ['Anna Müller', 'Ben Schmidt']]];

function _generateDemoTeamsActivity(date) {
  const today = todayYmd();
  const diff =
    date === today
      ? 0
      : date === offsetYmd(today, -1)
        ? -1
        : date === offsetYmd(today, 1)
          ? 1
          : null;
  if (diff === null) return [];
  const records = [];
  for (const [d, id, subj, aS, aE, sS, sE] of _DEMO_MEETINGS) {
    if (d !== diff) continue;
    records.push({
      id: `demo-${id}`,
      subject: subj,
      joinUrl: `https://teams.microsoft.com/demo/${id}`,
      scheduledStart: `${date}T${sS}:00`,
      scheduledEnd: `${date}T${sE}:00`,
      actualStart: `${date}T${aS}:00`,
      actualEnd: `${date}T${aE}:00`,
      participants: [],
      type: 'meeting',
      durationMinutes: 0,
    });
  }
  for (const [d, id, start, end, parts] of _DEMO_CALLS) {
    if (d !== diff) continue;
    records.push({
      id: `demo-${id}`,
      startDateTime: `${date}T${start}:00`,
      endDateTime: `${date}T${end}:00`,
      durationMinutes: (new Date(`${date}T${end}:00`) - new Date(`${date}T${start}:00`)) / 60_000,
      participants: parts,
      type: 'call',
    });
  }
  return records;
}

// ── Call normalisation (T016, T013a) ─────────────────────────────

/**
 * Normalise a raw TeamsCall into a planning-item-compatible shape.
 * Returns null when durationMinutes < 1 (exclude very short calls).
 * @param {TeamsCall} record
 * @param {string} signedInUserName  Display name to exclude from participant list
 */
export function normaliseCall(record, signedInUserName) {
  if (record.durationMinutes < 1) return null;
  const others = (record.participants ?? []).filter((p) => p !== signedInUserName);
  const subject =
    others.length === 0
      ? t('planning.teams_solo_call')
      : others.length > 3
        ? t('planning.teams_participants_truncated', { first: others[0], n: others.length - 1 })
        : others.join(', ');
  const displayStartTime = record.startDateTime.slice(11, 16);
  const displayEndTime = record.endDateTime.slice(11, 16);
  return {
    subject,
    startTime: roundToQuarter(displayStartTime),
    endTime: roundToQuarter(displayEndTime),
    displayStartTime,
    displayEndTime,
    hours: record.durationMinutes / 60,
    durationMinutes: record.durationMinutes,
    participants: others,
    bookingComment: '', // no personal data in Redmine comment per FR-012
    ticketId: null, // calls never have issue references
    source: 'Teams',
    rawEvent: record,
  };
}

// ── Meeting normalisation (T017, T013b) ───────────────────────────

/**
 * Normalise a raw TeamsMeeting into a planning-item-compatible shape.
 * Returns null when actual join/leave times are unavailable (FR-005).
 * Extracts a Redmine ticket ID from the meeting subject if present (e.g. "#42").
 * @param {TeamsMeeting} record
 */
export function normaliseMeeting(record) {
  if (!record.actualStart || !record.actualEnd) return null;
  const displayStartTime = record.actualStart.slice(11, 16);
  const displayEndTime = record.actualEnd.slice(11, 16);
  const startTime = roundToQuarter(displayStartTime);
  const endTime = roundToQuarter(displayEndTime);
  const startMins = Number(startTime.split(':')[0]) * 60 + Number(startTime.split(':')[1]);
  const endMins = Number(endTime.split(':')[0]) * 60 + Number(endTime.split(':')[1]);
  const hours = Math.max((endMins - startMins) / 60, record.durationMinutes / 60);
  const fallback = t('planning.teams_meeting_fallback');
  const subject = record.subject || fallback;
  const ticketId = record.subject ? extractTicketId(record.subject) : null;
  return {
    subject,
    startTime,
    endTime,
    displayStartTime,
    displayEndTime,
    hours,
    bookingComment: subject,
    ticketId,
    source: 'Teams',
    rawEvent: record,
  };
}

// ── Fetch Teams activity (T015) ───────────────────────────────────

async function _fetchAttendanceReport(token, omId) {
  const arResp = await fetch(
    `https://graph.microsoft.com/v1.0/me/onlineMeetings/${omId}/attendanceReports?$top=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!arResp.ok) return null;
  return (await arResp.json()).value?.[0] ?? null;
}

function _pickActualTimes(report) {
  const me = report.attendanceRecords?.find((r) => r.identity?.displayName === null);
  const actualStart = me?.firstJoinDateTime ?? report.meetingStartDateTime;
  const actualEnd = me?.lastLeaveDateTime ?? report.meetingEndDateTime;
  return actualStart && actualEnd ? { actualStart, actualEnd } : null;
}

async function _resolveActualTimes(token, ev, joinUrl) {
  const encUrl = encodeURIComponent(joinUrl);
  const omResp = await fetch(
    `https://graph.microsoft.com/v1.0/me/onlineMeetings?$filter=joinUrl eq '${encUrl}'`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!omResp.ok) return null;
  const omData = await omResp.json();
  const omId = omData.value?.[0]?.id;
  if (!omId) return null;
  const report = await _fetchAttendanceReport(token, omId);
  if (!report) return null;
  const times = _pickActualTimes(report);
  if (!times) return null;
  const { actualStart, actualEnd } = times;
  const durMs = new Date(actualEnd) - new Date(actualStart);
  return /** @type {TeamsMeeting} */ ({
    id: omId,
    subject: ev.subject ?? '',
    joinUrl,
    scheduledStart: ev.start?.dateTime ?? ev.start ?? '',
    scheduledEnd: ev.end?.dateTime ?? ev.end ?? '',
    actualStart,
    actualEnd,
    participants: [],
    type: 'meeting',
    durationMinutes: durMs / 60_000,
  });
}

/**
 * Fetch Teams calls and meetings for a single day.
 * Track A: online meetings via calendarView + attendance reports.
 * Track B: direct calls via /communications/callRecords (requires admin consent).
 * @param {string} date  YYYY-MM-DD
 * @param {HTMLElement} container  For rendering permissions-unavailable notice (FR-015)
 * @returns {Promise<TeamsActivityRecord[]>}
 */
async function _fetchTeamsActivity(date, container) {
  if (isDemoMode()) return _generateDemoTeamsActivity(date);
  const token = await acquireToken();
  const records = [];
  const start = `${date}T00:00:00.000Z`;
  const end = `${date}T23:59:59.999Z`;

  // Track A — online meetings with actual join/leave times
  const calUrl =
    `https://graph.microsoft.com/v1.0/me/calendarView` +
    `?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}` +
    `&$filter=isOnlineMeeting eq true&$select=subject,start,end,onlineMeeting&$top=50`;
  const calResp = await fetch(calUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (calResp.ok) {
    const calData = await calResp.json();
    for (const ev of calData.value ?? []) {
      const joinUrl = ev.onlineMeeting?.joinUrl;
      if (!joinUrl) continue;
      try {
        const meeting = await _resolveActualTimes(token, ev, joinUrl);
        if (meeting) records.push(meeting);
      } catch {
        /* attendance data unavailable — skip per FR-005 */
      }
    }
  }

  // Track B — direct call records (requires CallRecords.Read.All application permission)
  const callUrl =
    `https://graph.microsoft.com/v1.0/communications/callRecords` +
    `?$filter=startDateTime ge ${start} and startDateTime lt ${end}&$select=id,startDateTime,endDateTime,participants`;
  const callResp = await fetch(callUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (callResp.status === 403) {
    renderColumnPrompt(
      container,
      t('planning.teams_unavailable_permissions'),
      null,
      'planning-column-prompt'
    );
  } else if (callResp.ok) {
    const callData = await callResp.json();
    for (const rec of callData.value ?? []) {
      const durMs = new Date(rec.endDateTime) - new Date(rec.startDateTime);
      records.push({
        id: rec.id,
        startDateTime: rec.startDateTime,
        endDateTime: rec.endDateTime,
        durationMinutes: durMs / 60_000,
        participants: (rec.participants ?? [])
          .map((p) => p.user?.displayName ?? '')
          .filter(Boolean),
        type: 'call',
      });
    }
  }
  return records;
}

// ── Availability guard ────────────────────────────────────────────

function _checkTeamsAvailability(container, date, bookings, bookingsContainer) {
  const enabled = localStorage.getItem(STORAGE_KEY_PLANNING_SOURCE_TEAMS) === '1';
  if (!enabled) {
    renderColumnPrompt(container, t('planning.teams_disabled'), null, 'planning-column-prompt');
    return false;
  }
  if (isDemoMode()) return true;
  if (!isOutlookConfigured()) {
    renderColumnPrompt(
      container,
      t('planning.teams_not_connected'),
      null,
      'planning-column-prompt'
    );
    return false;
  }
  if (!isMsalSignedIn()) {
    renderColumnPrompt(
      container,
      t('planning.teams_sign_in'),
      async () => {
        try {
          await acquireToken();
          await renderTeamsColumn(container, date, bookings, bookingsContainer);
        } catch {
          /* handled by popup */
        }
      },
      'planning-column-prompt',
      'planning.teams_retry'
    );
    return false;
  }
  return true;
}

// ── Teams-specific adapter: normalised items → buildPlanningEvents input ──

async function _buildTeamsItems(normalisedItems, _bookings) {
  const proposals = normalisedItems.map((item) => ({
    subject: item.subject,
    startTime: item.startTime,
    endTime: item.endTime,
    hours: item.hours,
    isAllDay: false,
    ticketId: item.ticketId ?? null,
    source: item.source ?? 'Teams',
    category: 'meeting',
    status: 'needs-ticket',
  }));
  await stampClosedStatus(proposals);
  return proposals.map((proposal, i) => {
    const item = normalisedItems[i];
    return {
      proposal,
      displayStartTime: item.displayStartTime,
      displayEndTime: item.displayEndTime,
      rawEvent: item.rawEvent,
      bookingComment: item.bookingComment,
      idPrefix: 'teams_',
    };
  });
}

// ── Main render functions ─────────────────────────────────────────

/**
 * Fetch Teams activity and render the Teams column as a FC instance.
 * @param {HTMLElement} container
 * @param {string} date  YYYY-MM-DD
 * @param {TimeEntry[]} bookings
 * @param {HTMLElement|null} _bookingsContainer  unused
 * @returns {Promise<PlanningEvent[]>}
 */
export async function renderTeamsColumn(container, date, bookings, _bookingsContainer) {
  return renderPlanningColumn({
    container,
    date,
    bookings,
    col,
    fcRef: _fcRef,
    availabilityGuard: (c, d, b) => _checkTeamsAvailability(c, d, b, null),
    fetchAndBuildItems: async () => {
      const records = await withSpinnerAndError(
        container,
        () => _fetchTeamsActivity(date, container),
        () => renderTeamsColumn(container, date, bookings, null),
        'planning.teams_error',
        'planning.teams_retry'
      );
      if (!records) return null;

      const normalisedItems = [];
      for (const rec of records) {
        if (rec.type === 'call') {
          const n = normaliseCall(rec, getSignedInDisplayName());
          if (n) normalisedItems.push(n);
        } else {
          const n = normaliseMeeting(rec);
          if (n) normalisedItems.push(n);
        }
      }
      return _buildTeamsItems(normalisedItems, bookings);
    },
  });
}

/**
 * Re-render using already-fetched events (after slot-height or booking change).
 * @param {HTMLElement} container
 * @param {PlanningEvent[]} planningEvents
 * @param {HTMLElement|null} _bookingsContainer  unused
 */
export function rerenderTeamsColumn(container, planningEvents, _bookingsContainer) {
  rerenderPlanningColumn(col, _fcRef, planningEvents);
}
