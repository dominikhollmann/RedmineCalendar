import { redirectToSettingsIfMissing }            from './settings.js';
import { fetchTimeEntries, resolveIssueSubject,
         mapTimeEntry, updateTimeEntry,
         deleteTimeEntry }                         from './redmine-api.js';
import { SLOT_DURATION, SNAP_DURATION,
         START_HOUR, END_HOUR }                    from './config.js';
import { openForm }                                from './time-entry-form.js';

redirectToSettingsIfMissing();

// ── DOM refs ──────────────────────────────────────────────────────
const calendarEl     = document.getElementById('calendar');
const loadingOverlay = document.getElementById('loading-overlay');
const errorBanner    = document.getElementById('error-banner');
const errorMessage   = document.getElementById('error-message');
const errorRetry     = document.getElementById('error-retry');
const errorDismiss   = document.getElementById('error-dismiss');
const toastEl        = document.getElementById('toast');

let calendar;          // FullCalendar instance
let _lastStart = null; // last fetched week start (for retry)
let _lastEnd   = null;

// ── Toast ─────────────────────────────────────────────────────────
export function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  setTimeout(() => toastEl.classList.add('hidden'), 3000);
}

// ── Error banner ──────────────────────────────────────────────────
function showError(message, retryFn) {
  errorMessage.textContent = message;
  errorBanner.classList.remove('hidden');
  errorRetry.onclick = () => { errorBanner.classList.add('hidden'); retryFn?.(); };
}
function hideError() { errorBanner.classList.add('hidden'); }
errorDismiss.addEventListener('click', hideError);

// ── Loading state ─────────────────────────────────────────────────
function setLoading(on) {
  loadingOverlay.classList.toggle('hidden', !on);
  if (calendar) calendar.setOption('selectable', !on);
}

// ── Daily totals ──────────────────────────────────────────────────
function computeDailyTotals(events) {
  const totals = {};
  for (const ev of events) {
    const day = ev.extendedProps?.timeEntry?.date;
    if (day) totals[day] = (totals[day] ?? 0) + (ev.extendedProps.timeEntry.hours ?? 0);
  }
  return totals;
}

function formatHours(h) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

// ── Midnight split (T039) ─────────────────────────────────────────
function splitMidnightEntries(timeEntries) {
  const result = [];
  for (const entry of timeEntries) {
    if (!entry.startTime) { result.push(entry); continue; }
    const [h, m] = entry.startTime.split(':').map(Number);
    const startMinutes = h * 60 + m;
    const durationMinutes = Math.round(entry.hours * 60);
    const endMinutes = startMinutes + durationMinutes;

    if (endMinutes <= 24 * 60) {
      result.push(entry);
    } else {
      // First segment: start to midnight
      const firstMins = 24 * 60 - startMinutes;
      result.push({ ...entry, hours: firstMins / 60 });

      // Second segment: midnight to end on next day
      const nextDate = new Date(entry.date + 'T00:00:00');
      nextDate.setDate(nextDate.getDate() + 1);
      const nextDateStr = nextDate.toISOString().slice(0, 10);
      const secondMins = endMinutes - 24 * 60;
      result.push({
        ...entry,
        id: null,           // visual clone — not a separate Redmine record
        date: nextDateStr,
        startTime: '00:00',
        hours: secondMins / 60,
        _isMidnightContinuation: true,
      });
    }
  }
  return result;
}

// ── Map TimeEntry → FullCalendar event object ─────────────────────
function toFcEvent(entry) {
  const hasStart = !!entry.startTime;
  const [h, m] = hasStart ? entry.startTime.split(':').map(Number) : [0, 0];
  const startMs = (h * 60 + m) * 60000;
  const endMs   = startMs + Math.round(entry.hours * 60) * 60000;

  const dateBase = entry.date + 'T';
  const start    = dateBase + toHHMM(h * 60 + m);
  const end      = dateBase + toHHMM((h * 60 + m) + Math.round(entry.hours * 60));

  const durationLabel = formatHours(entry.hours);
  const title = (entry.issueSubject ?? `Issue #${entry.issueId}`) + `  (${durationLabel})`;

  return {
    id:    entry.id ? String(entry.id) : undefined,
    title,
    start,
    end,
    classNames: hasStart ? [] : ['no-start-time'],
    extendedProps: { timeEntry: entry },
  };
}

function toHHMM(totalMinutes) {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

// ── Load week entries ─────────────────────────────────────────────
async function loadWeekEntries(startDate, endDate) {
  _lastStart = startDate;
  _lastEnd   = endDate;
  setLoading(true);
  hideError();

  try {
    const rawEntries = await fetchTimeEntries(startDate, endDate);
    const mapped = rawEntries.map(mapTimeEntry).filter(Boolean);

    // Resolve missing issue subjects
    await Promise.all(mapped.map(async (entry) => {
      if (!entry.issueSubject && entry.issueId) {
        entry.issueSubject = await resolveIssueSubject(entry.issueId);
      }
    }));

    const split = splitMidnightEntries(mapped);
    const fcEvents = split.map(toFcEvent);

    calendar.removeAllEvents();
    fcEvents.forEach(ev => calendar.addEvent(ev));
    updateDayTotals(fcEvents);
  } catch (err) {
    showError(err.message, () => loadWeekEntries(startDate, endDate));
  } finally {
    setLoading(false);
  }
}

// ── Day totals display ────────────────────────────────────────────
function updateDayTotals(events) {
  const totals = computeDailyTotals(events);
  // FullCalendar re-renders day headers via dayCellContent; store totals globally
  window._calendarDayTotals = totals;
  calendar.render(); // triggers dayCellContent re-evaluation
}

export function recomputeDayTotals() {
  const events = calendar.getEvents().map(ev => ({ extendedProps: ev.extendedProps }));
  updateDayTotals(events);
}

// ── FullCalendar init ─────────────────────────────────────────────
calendar = new FullCalendar.Calendar(calendarEl, {
  initialView:   'timeGridWeek',
  firstDay:      1, // Monday
  slotDuration:  SLOT_DURATION,
  snapDuration:  SNAP_DURATION,
  slotMinTime:   `${String(START_HOUR).padStart(2,'0')}:00`,
  slotMaxTime:   `${String(END_HOUR).padStart(2,'0')}:00`,
  allDaySlot:    false,
  selectable:    true,
  editable:      true,
  eventMinHeight: 20,
  headerToolbar: {
    left:   'prev,next today',
    center: 'title',
    right:  '',
  },

  // ── Week navigation → load entries ───────────────────────────
  datesSet(info) {
    const start = info.startStr.slice(0, 10);
    const end   = info.endStr.slice(0, 10);
    loadWeekEntries(start, end);
  },

  // ── Daily totals in column headers ────────────────────────────
  dayCellContent(arg) {
    const dateStr = arg.date.toISOString().slice(0, 10);
    const total   = window._calendarDayTotals?.[dateStr];
    const el      = document.createElement('div');
    el.innerHTML  = `<span>${arg.dayNumberText}</span>`;
    if (total) {
      const sub = document.createElement('span');
      sub.className   = 'day-total';
      sub.textContent = formatHours(total);
      el.appendChild(sub);
    }
    return { domNodes: [el] };
  },

  // ── Unknown-position badge ────────────────────────────────────
  eventContent(arg) {
    const entry = arg.event.extendedProps?.timeEntry;
    if (!entry?.startTime && !entry?._isMidnightContinuation) {
      const wrapper = document.createElement('div');
      wrapper.className = 'fc-event-main-frame';
      wrapper.innerHTML = `<span class="fc-event-title">${arg.event.title}</span><span class="unknown-badge">?</span>`;
      return { domNodes: [wrapper] };
    }
    return true; // default rendering
  },

  // ── Create entry by click / drag on empty slot ────────────────
  select(info) {
    const startStr = info.startStr; // ISO datetime
    const endStr   = info.endStr;
    const durationMs = new Date(endStr) - new Date(startStr);
    const durationHours = durationMs / 3600000;
    const date = startStr.slice(0, 10);
    const time = startStr.slice(11, 16) || '09:00';

    openForm(null, { date, startTime: time, hours: durationHours }, (newEntry) => {
      const fcEvent = toFcEvent(newEntry);
      calendar.addEvent(fcEvent);
      recomputeDayTotals();
      showToast('Time entry saved.');
    });

    calendar.unselect();
  },

  // ── Open existing entry for edit ──────────────────────────────
  eventClick(info) {
    const entry = info.event.extendedProps?.timeEntry;
    if (!entry || entry._isMidnightContinuation) return;

    openForm(entry, {}, (updatedEntry) => {
      // Update event in calendar
      const ev = calendar.getEventById(String(updatedEntry.id));
      if (ev) {
        const updated = toFcEvent(updatedEntry);
        ev.setProp('title', updated.title);
        ev.setStart(updated.start);
        ev.setEnd(updated.end);
        ev.setExtendedProp('timeEntry', updatedEntry);
      }
      recomputeDayTotals();
      showToast('Time entry updated.');
    }, (deletedId) => {
      const ev = calendar.getEventById(String(deletedId));
      if (ev) ev.remove();
      recomputeDayTotals();
      showToast('Time entry deleted.');
    });
  },

  // ── Drag-to-resize (bottom edge) ─────────────────────────────
  async eventResize(info) {
    const entry = info.event.extendedProps?.timeEntry;
    if (!entry || !entry.id) { info.revert(); return; }

    const newEnd   = info.event.end;
    const newStart = info.event.start;
    const newHours = (newEnd - newStart) / 3600000;

    try {
      const updated = await updateTimeEntry(entry.id, {
        hours:      newHours,
        activityId: entry.activityId,
        comment:    entry.comment,
        startTime:  entry.startTime,
      });
      info.event.setExtendedProp('timeEntry', { ...entry, hours: newHours });
      recomputeDayTotals();
    } catch (err) {
      info.revert();
      showError(`Resize failed: ${err.message}`, null);
    }
  },
});

calendar.render();

// Retry button re-loads current week
errorRetry.addEventListener('click', () => {
  if (_lastStart && _lastEnd) loadWeekEntries(_lastStart, _lastEnd);
});
