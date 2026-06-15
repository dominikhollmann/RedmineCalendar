// @ts-nocheck — DOM-heavy module; exported normalisers are JSDoc-typed.

/** @typedef {import('./types.d.ts').TeamsCall} TeamsCall */
/** @typedef {import('./types.d.ts').TeamsMeeting} TeamsMeeting */
/** @typedef {import('./types.d.ts').TeamsActivityRecord} TeamsActivityRecord */
/** @typedef {import('./types.d.ts').PlanningEvent} PlanningEvent */
/** @typedef {import('./types.d.ts').TimeEntry} TimeEntry */

import { t } from './i18n.js';
import { STORAGE_KEY_PLANNING_SOURCE_TEAMS } from './config.js';
import { formatProject, fetchIssueInfo } from './redmine-api.js';
import { formatDuration } from './time-entry-form-utils.js';
import {
  isOutlookConfigured,
  isMsalSignedIn,
  acquireToken,
  roundToQuarter,
  getSignedInDisplayName,
} from './outlook.js';
import { cachedLookupIssue } from './planning-view-cache.js';
import { isFullyCovered, classifyProposal } from './planning-view-outlook.js';

// ── Module state ──────────────────────────────────────────────────

/** @type {PlanningEvent[]} */
let _renderedEvents = [];
/** @type {Set<string>} */
const _selectedIds = new Set();
let _pxPerMin = 0;
/** @type {(() => void) | null} */
let _clearOtherColumns = null;

// ── Call normalisation (T016, T013a) ─────────────────────────────

/**
 * Normalise a raw TeamsCall into a PlanningEvent-compatible shape.
 * Returns null when durationMinutes < 1 (exclude very short calls).
 * @param {TeamsCall} record
 * @param {string} signedInUserName  Display name to exclude from participant list
 * @returns {{subject:string,startTime:string,endTime:string,displayStartTime:string,displayEndTime:string,hours:number,durationMinutes:number,participants:string[],bookingComment:string,rawEvent:TeamsCall}|null}
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
    rawEvent: record,
  };
}

// ── Meeting normalisation (T017, T013b) ───────────────────────────

/**
 * Normalise a raw TeamsMeeting into a PlanningEvent-compatible shape.
 * Returns null when actual join/leave times are unavailable (FR-005).
 * @param {TeamsMeeting} record
 * @returns {{subject:string,startTime:string,endTime:string,displayStartTime:string,displayEndTime:string,hours:number,bookingComment:string,rawEvent:TeamsMeeting}|null}
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
  return {
    subject,
    startTime,
    endTime,
    displayStartTime,
    displayEndTime,
    hours,
    bookingComment: subject,
    rawEvent: record,
  };
}

// ── Fetch Teams activity (T015) ───────────────────────────────────

/**
 * Fetch Teams calls and meetings for a single day.
 * Track A: online meetings via calendarView + attendance reports.
 * Track B: direct calls via /communications/callRecords (requires admin consent).
 * @param {string} date  YYYY-MM-DD
 * @param {HTMLElement} container  For rendering permissions-unavailable notice (FR-015)
 * @returns {Promise<TeamsActivityRecord[]>}
 */
async function _fetchTeamsActivity(date, container) {
  const token = await acquireToken();
  const records = [];

  // Track A — online meetings with actual join/leave times
  const start = `${date}T00:00:00.000Z`;
  const end = `${date}T23:59:59.999Z`;
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
    // Admin consent not granted — show graceful notice per FR-015
    _renderUnavailable(container, t('planning.teams_unavailable_permissions'));
  } else if (callResp.ok) {
    const callData = await callResp.json();
    for (const rec of callData.value ?? []) {
      const durMs = new Date(rec.endDateTime) - new Date(rec.startDateTime);
      const durationMinutes = durMs / 60_000;
      records.push({
        id: rec.id,
        startDateTime: rec.startDateTime,
        endDateTime: rec.endDateTime,
        durationMinutes,
        participants: (rec.participants ?? [])
          .map((p) => p.user?.displayName ?? '')
          .filter(Boolean),
        type: 'call',
      });
    }
  }

  return records;
}

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

// ── Availability guard (T014) ─────────────────────────────────────

function _renderUnavailable(container, message, retryFn) {
  const div = document.createElement('div');
  div.className = 'planning-teams-prompt';
  div.textContent = message;
  if (retryFn) {
    const btn = document.createElement('button');
    btn.textContent = t('planning.teams_retry');
    btn.addEventListener('click', retryFn);
    div.appendChild(document.createElement('br'));
    div.appendChild(btn);
  }
  container.appendChild(div);
}

function _checkTeamsAvailability(container) {
  const enabled = localStorage.getItem(STORAGE_KEY_PLANNING_SOURCE_TEAMS) === '1';
  if (!enabled) {
    _renderUnavailable(container, t('planning.teams_disabled'));
    return false;
  }
  if (!isOutlookConfigured()) {
    _renderUnavailable(container, t('planning.teams_not_connected'));
    return false;
  }
  if (!isMsalSignedIn()) {
    _renderUnavailable(container, t('planning.teams_sign_in'), async () => {
      try {
        await acquireToken();
        await renderTeamsColumn(container._date, container._bookings, container._bookingsEl);
      } catch {
        /* handled by popup */
      }
    });
    return false;
  }
  return true;
}

// ── Build planning events (T019) ──────────────────────────────────

function _buildPlanningEvents(normalisedItems, bookings) {
  const ticketLookup = new Map();
  for (const b of bookings) {
    if (b.issueId != null && !ticketLookup.has(b.issueId)) {
      ticketLookup.set(b.issueId, {
        issueSubject: b.issueSubject ?? null,
        projectName: b.projectName ?? null,
        projectIdentifier: b.projectIdentifier ?? null,
      });
    }
  }
  return normalisedItems.map((item, i) => {
    const proposal = {
      subject: item.subject,
      startTime: item.startTime,
      endTime: item.endTime,
      hours: item.hours,
      isAllDay: false,
      ticketId: null,
      category: 'meeting',
      status: 'needs-ticket',
    };
    const rawCategory = classifyProposal(proposal);
    const planningCategory = rawCategory === 'bookable' ? 'needs-ticket' : rawCategory;
    const sanitised = DOMPurify.sanitize(item.subject, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    return {
      id: `teams_${sanitised}_${item.startTime}_${i}`,
      proposal,
      rawEvent: item.rawEvent,
      planningCategory,
      isCovered: isFullyCovered(
        roundToQuarter(item.displayStartTime),
        roundToQuarter(item.displayEndTime),
        bookings,
        false,
        item.hours
      ),
      ticketInfo: null,
      selected: false,
      displayStartTime: item.displayStartTime,
      displayEndTime: item.displayEndTime,
      bookingComment: item.bookingComment,
    };
  });
}

// ── Card rendering helpers ────────────────────────────────────────

function _toMins(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function _buildCardContent(planningEvent, showDetails) {
  const { proposal, ticketInfo, displayStartTime, displayEndTime } = planningEvent;
  const subjectEl = document.createElement('div');
  subjectEl.className = 'ev-issue';
  subjectEl.textContent = DOMPurify.sanitize(proposal.subject, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  if (!showDetails) return [subjectEl];
  const els = [subjectEl];
  if (proposal.ticketId) {
    const ticketEl = document.createElement('div');
    ticketEl.className = 'ev-project';
    if (ticketInfo?.invalid) {
      ticketEl.textContent = `⚠️ #${proposal.ticketId} ${t('planning.ticket_invalid')}`;
    } else {
      const sub = ticketInfo?.issueSubject;
      ticketEl.textContent = sub ? `#${proposal.ticketId} ${sub}` : `#${proposal.ticketId}`;
    }
    els.push(ticketEl);
  }
  if (ticketInfo?.projectName || ticketInfo?.projectIdentifier) {
    const projEl = document.createElement('div');
    projEl.className = 'ev-project';
    projEl.textContent = formatProject(
      ticketInfo.projectIdentifier ?? null,
      ticketInfo.projectName ?? null
    );
    els.push(projEl);
  }
  const timeEl = document.createElement('div');
  timeEl.className = 'ev-time';
  timeEl.textContent = `${displayStartTime}–${displayEndTime} (${formatDuration(proposal.hours)})`;
  els.push(timeEl);
  return els;
}

function _measurePxPerMin(bookingsContainer) {
  const slotEl = bookingsContainer?.querySelector('.fc-timegrid-slot');
  if (!slotEl) return 0;
  return slotEl.getBoundingClientRect().height / 15;
}

function _renderCards(container, planningEvents, bookingsContainer) {
  _pxPerMin = bookingsContainer ? _measurePxPerMin(bookingsContainer) : 0;
  const timedArea = document.createElement('div');
  timedArea.className = 'planning-teams-timed';
  if (_pxPerMin > 0) {
    const fcSlots = bookingsContainer?.querySelectorAll('.fc-timegrid-slot[data-time]');
    const minMin = _toMins((fcSlots?.[0]?.dataset.time ?? '00:00:00').slice(0, 5));
    const fcBody = bookingsContainer?.querySelector('.fc-timegrid-body');
    if (fcBody) timedArea.style.height = `${fcBody.getBoundingClientRect().height}px`;
    for (const pe of planningEvents) {
      const startMin = _toMins(pe.proposal.startTime);
      const endMin = _toMins(pe.proposal.endTime);
      const top = (startMin - minMin) * _pxPerMin;
      const height = Math.max((endMin - startMin) * _pxPerMin, 18);
      const card = document.createElement('div');
      card.className = `planning-event planning-event--${pe.planningCategory}`;
      if (pe.isCovered) card.classList.add('planning-event--covered');
      card.dataset.planningId = pe.id;
      card.style.top = `${top}px`;
      card.style.height = `${height}px`;
      card.draggable = true;
      card.addEventListener('dragstart', (e) => _handleDragStart(e, pe));
      card.addEventListener('click', (e) => _handleCardClick(e, pe));
      if (pe.isCovered) card.title = t('planning.event_covered');
      const showDetails = height >= 30;
      card.dataset.showDetails = showDetails ? '1' : '0';
      _buildCardContent(pe, showDetails).forEach((el) => card.appendChild(el));
      timedArea.appendChild(card);
    }
  } else if (planningEvents.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'planning-empty-msg';
    empty.textContent = t('planning.teams_empty');
    timedArea.appendChild(empty);
  }
  container.appendChild(timedArea);
}

// ── Selection (T021, T023) ────────────────────────────────────────

/** @returns {Set<string>} */
export function getSelectedEventIds() {
  return new Set(_selectedIds);
}

/** @returns {PlanningEvent[]} */
export function getSelectedEvents() {
  return _renderedEvents.filter((e) => _selectedIds.has(e.id));
}

export function clearSelection() {
  _selectedIds.clear();
  _renderedEvents.forEach((e) => (e.selected = false));
  document
    .querySelectorAll('.planning-event--selected, .planning-event-chip--selected')
    .forEach((el) => {
      el.classList.remove('planning-event--selected', 'planning-event-chip--selected');
    });
}

export function registerClearOtherColumns(fn) {
  _clearOtherColumns = fn;
}

function _syncSelectionClasses() {
  document.querySelectorAll('[data-planning-id]').forEach((el) => {
    const id = el.dataset.planningId;
    const isSelected = _selectedIds.has(id);
    el.classList.toggle(
      'planning-event--selected',
      isSelected && el.classList.contains('planning-event')
    );
    el.classList.toggle(
      'planning-event-chip--selected',
      isSelected && el.classList.contains('planning-event-chip')
    );
  });
}

function _handleCardClick(e, planningEvent) {
  if (e.shiftKey) {
    if (_selectedIds.has(planningEvent.id)) {
      _selectedIds.delete(planningEvent.id);
      planningEvent.selected = false;
    } else {
      _selectedIds.add(planningEvent.id);
      planningEvent.selected = true;
    }
  } else {
    _clearOtherColumns?.();
    clearSelection();
    _selectedIds.add(planningEvent.id);
    planningEvent.selected = true;
  }
  _syncSelectionClasses();
}

function _handleDragStart(e, planningEvent) {
  if (!_selectedIds.has(planningEvent.id)) {
    _clearOtherColumns?.();
    clearSelection();
    _selectedIds.add(planningEvent.id);
    planningEvent.selected = true;
    _syncSelectionClasses();
  }
  e.dataTransfer.setData('planning/events', JSON.stringify([...getSelectedEventIds()]));
  e.dataTransfer.effectAllowed = 'copy';
}

// ── Async ticket enrichment ───────────────────────────────────────

async function _enrichTicketInfoAsync(planningEvents) {
  const byTicket = new Map();
  for (const pe of planningEvents) {
    if (!pe.proposal.ticketId) continue;
    if (pe.ticketInfo != null && !pe.ticketInfo.invalid) continue;
    const tid = pe.proposal.ticketId;
    if (!byTicket.has(tid)) byTicket.set(tid, []);
    byTicket.get(tid).push(pe);
  }
  if (!byTicket.size) return;
  await Promise.allSettled(
    [...byTicket.entries()].map(async ([ticketId, events]) => {
      try {
        const info = await cachedLookupIssue(ticketId, () => fetchIssueInfo(ticketId));
        const ticketInfo = info ?? {
          invalid: true,
          issueSubject: null,
          projectName: null,
          projectIdentifier: null,
        };
        for (const pe of events) {
          pe.ticketInfo = ticketInfo;
          pe.planningCategory = ticketInfo.invalid ? 'needs-ticket' : classifyProposal(pe.proposal);
          _updateCardContent(pe);
        }
      } catch {
        /* network error — leave state as-is */
      }
    })
  );
}

function _updateCardContent(planningEvent) {
  document.querySelectorAll(`[data-planning-id="${planningEvent.id}"]`).forEach((card) => {
    const showDetails = card.dataset.showDetails !== '0';
    card.classList.remove('planning-event--bookable', 'planning-event--needs-ticket');
    card.classList.add(`planning-event--${planningEvent.planningCategory}`);
    while (card.firstChild) card.removeChild(card.firstChild);
    _buildCardContent(planningEvent, showDetails).forEach((el) => card.appendChild(el));
  });
}

// ── Main render functions (T020, T021) ────────────────────────────

/**
 * Fetch Teams activity and render the Teams column.
 * @param {HTMLElement} container
 * @param {string} date  YYYY-MM-DD
 * @param {TimeEntry[]} bookings
 * @param {HTMLElement|null} bookingsContainer
 * @returns {Promise<PlanningEvent[]>}
 */
export async function renderTeamsColumn(container, date, bookings, bookingsContainer) {
  container.innerHTML = '';
  _renderedEvents = [];
  _selectedIds.clear();

  if (!_checkTeamsAvailability(container)) return [];

  const spinner = document.createElement('div');
  spinner.className = 'planning-column-spinner';
  container.appendChild(spinner);

  let records;
  try {
    records = await _fetchTeamsActivity(date, container);
  } catch (err) {
    container.innerHTML = '';
    _renderUnavailable(container, t('planning.teams_error', { message: err.message }), () =>
      renderTeamsColumn(container, date, bookings, bookingsContainer)
    );
    return [];
  }

  container.innerHTML = '';

  // Normalise raw records
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

  const planningEvents = _buildPlanningEvents(normalisedItems, bookings);
  _renderedEvents = planningEvents;
  _renderCards(container, planningEvents, bookingsContainer);

  container.addEventListener('click', (e) => {
    if (!e.target.closest('[data-planning-id]')) clearSelection();
  });

  _enrichTicketInfoAsync(planningEvents).catch(() => {});
  return planningEvents;
}

/**
 * Re-render using already-fetched events (after slot-height change).
 * @param {HTMLElement} container
 * @param {PlanningEvent[]} planningEvents
 * @param {HTMLElement|null} bookingsContainer
 */
export function rerenderTeamsColumn(container, planningEvents, bookingsContainer) {
  container.innerHTML = '';
  _renderCards(container, planningEvents, bookingsContainer);
  container.addEventListener('click', (e) => {
    if (!e.target.closest('[data-planning-id]')) clearSelection();
  });
  _syncSelectionClasses();
}
