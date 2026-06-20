// Outlook calendar booking tool: fetches calendar events for a day and
// returns a structured proposal list for the chatbot to present to the user.

/** @typedef {import('./types').TimeEntry} TimeEntry */
import { t } from './i18n.js';
import { readWorkingHours, readWeeklyHours } from './working-hours.js';
import { getCentralConfigSync } from './config-store.js';
import { fetchTimeEntries, resolveIssueSubject, mapTimeEntry } from './redmine-api.js';
import { isOutlookConfigured, fetchCalendarEvents, parseCalendarProposals } from './outlook.js';
import { isValidDate } from './chatbot-tools-validators.js';

export async function executeBookOutlookDay({ date }) {
  if (date !== undefined && !isValidDate(date))
    return { result: 'Invalid date — expected YYYY-MM-DD.' };
  if (!isOutlookConfigured()) return { result: t('outlook.not_configured') };
  const targetDate = date || new Date().toISOString().slice(0, 10);

  let events;
  try {
    events = await fetchCalendarEvents(targetDate);
  } catch (err) {
    return { result: t('outlook.fetch_error', { message: err.message }) };
  }
  if (events.length === 0) return { result: t('outlook.no_events', { date: targetDate }) };

  const existingEntries = /** @type {TimeEntry[]} */ (
    (await fetchTimeEntries(targetDate, targetDate)).map(mapTimeEntry).filter((x) => x !== null)
  );
  const cfg = readBookingConfig();
  const { proposals, skippedOverlap, skippedInformational } = parseCalendarProposals(
    events,
    /** @type {any} */ (existingEntries),
    cfg.weeklyHours,
    cfg.holidayTicket,
    cfg.vacationTicket,
    cfg.breakTicket,
    cfg.workStart
  );
  const ticketSubjects = await resolveTicketSubjects(proposals);
  const g = groupProposals(proposals);

  const lines = [];
  appendExcludedSection(lines, skippedOverlap, skippedInformational);
  appendBreakSection(lines, g.breakProposals, cfg.breakTicket, ticketSubjects);
  appendBookableSection(lines, g.workProposals, targetDate, ticketSubjects);
  appendNeedsInputSection(lines, g.needsInput);
  if (proposals.length === 0 && skippedOverlap.length === 0 && skippedInformational.length === 0) {
    lines.push(t('outlook.no_events', { date: targetDate }));
  }
  return { result: lines.join('\n') };
}

function readBookingConfig() {
  const cfg = getCentralConfigSync();
  return {
    weeklyHours: readWeeklyHours() ?? 40,
    holidayTicket: positiveTicketOrNull(cfg?.holidayTicket),
    vacationTicket: positiveTicketOrNull(cfg?.vacationTicket),
    breakTicket: positiveTicketOrNull(cfg?.breakTicket),
    workStart: readWorkingHours()?.start || '09:00',
  };
}

function positiveTicketOrNull(value) {
  return Number.isFinite(value) && value > 0 ? value : null;
}

async function resolveTicketSubjects(proposals) {
  const ids = new Set();
  for (const p of proposals) if (p.ticketId) ids.add(p.ticketId);
  const subjects = {};
  for (const id of ids) {
    try {
      subjects[id] = await resolveIssueSubject(id);
    } catch {
      subjects[id] = '';
    }
  }
  return subjects;
}

function groupProposals(proposals) {
  return {
    breakProposals: proposals.filter((p) => p.category === 'break'),
    workProposals: proposals.filter((p) => p.category !== 'break' && p.status === 'proposed'),
    needsInput: proposals.filter((p) => p.status === 'needs-ticket'),
  };
}

function appendExcludedSection(lines, skippedOverlap, skippedInformational) {
  if (skippedOverlap.length === 0 && skippedInformational.length === 0) return;
  lines.push(t('outlook.excluded_header'));
  for (const subject of skippedOverlap) {
    lines.push(`- ${t('outlook.skipped_overlap_item', { subject })}`);
  }
  for (const subject of skippedInformational) {
    lines.push(`- ${t('outlook.skipped_informational_item', { subject })}`);
  }
  lines.push('');
}

function appendBreakSection(lines, breakProposals, breakTicket, ticketSubjects) {
  if (breakProposals.length === 0) {
    if (!breakTicket) {
      lines.push(t('chatbot.break_routing_disabled'));
      lines.push('');
    }
    return;
  }
  lines.push(
    t('outlook.break_section_header', {
      ticket: breakTicket,
      ticketSubject: ticketSubjects[breakTicket] || '',
    })
  );
  for (const p of breakProposals) {
    lines.push(
      `- ${t('outlook.break_proposal', {
        subject: p.subject,
        ticket: p.ticketId,
        ticketSubject: ticketSubjects[p.ticketId] || '',
        start: p.startTime,
        end: p.endTime,
      })}`
    );
  }
  lines.push('');
}

function appendBookableSection(lines, workProposals, date, ticketSubjects) {
  if (workProposals.length === 0) return;
  lines.push(t('outlook.bookable_header', { date }));
  for (const p of workProposals) {
    lines.push(`- ${formatBookableProposal(p, ticketSubjects)}`);
  }
  lines.push('');
}

function formatBookableProposal(p, ticketSubjects) {
  const ticketSubject = p.ticketId ? ticketSubjects[p.ticketId] || '' : '';
  const base = { subject: p.subject, ticket: p.ticketId, ticketSubject, hours: p.hours };
  if (p.isAllDay && p.category === 'holiday') return t('outlook.holiday_proposal_subject', base);
  if (p.isAllDay && p.category === 'vacation') return t('outlook.vacation_proposal_subject', base);
  return t('outlook.meeting_with_ticket_subject', { ...base, start: p.startTime, end: p.endTime });
}

function appendNeedsInputSection(lines, needsInput) {
  if (needsInput.length === 0) return;
  lines.push(t('outlook.needs_input_header'));
  for (const p of needsInput) {
    if (p.isAllDay) {
      lines.push(`- ${t('outlook.allday_ask', { subject: p.subject })}`);
    } else {
      lines.push(
        `- ${t('outlook.meeting_no_ticket', { subject: p.subject, start: p.startTime, end: p.endTime, hours: p.hours })}`
      );
    }
  }
  lines.push('');
}
