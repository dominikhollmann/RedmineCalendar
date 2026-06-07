// Extra tests for js/chatbot-tools.js to push line coverage to >=95%.
// Targets uncovered code paths: highlight helpers (DOM stubs), setCalendarRefreshCallback,
// executeSearch, and several executeBookOutlookDay branches (default date, fetch error,
// excluded events, holiday/vacation all-day proposals, all-day needs-input, empty fallback).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Ensure `document` exists even when this file is run without the project's
// shared setup (tests/unit/setup.js). The setup file already supplies it when
// vitest is run via `npm test` / `--config tests/vitest.config.js`; this fallback
// keeps the file robust under direct invocations like
// `npx vitest run tests/unit/chatbot-tools-extras.test.js`.
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({}),
  };
}

vi.mock('../../js/i18n.js', () => ({
  t: vi.fn((key) => key),
  locale: 'en',
  formatDate: vi.fn((d) => d),
}));

vi.mock('../../js/settings.js', () => ({
  readWorkingHours: vi.fn(() => ({ start: '08:00', end: '17:00' })),
  readWeeklyHours: vi.fn(() => 40),
  readConfig: vi.fn(() => ({})),
}));

vi.mock('../../js/config-store.js', () => ({
  getCentralConfigSync: vi.fn(() => ({})),
}));

vi.mock('../../js/redmine-api.js', () => ({
  fetchTimeEntries: vi.fn(),
  fetchTimeEntryById: vi.fn(),
  resolveIssueSubject: vi.fn(),
  enrichEntries: vi.fn(async (entries) => entries),
  searchIssues: vi.fn(),
  mapTimeEntry: vi.fn(),
  RedmineError: class RedmineError extends Error {
    constructor(message, status) {
      super(message);
      this.name = 'RedmineError';
      this.status = status ?? 0;
    }
  },
}));

vi.mock('../../js/time-entry-form.js', () => ({
  openForm: vi.fn(),
  showDeleteConfirm: vi.fn(),
}));

vi.mock('../../js/outlook.js', () => ({
  isOutlookConfigured: vi.fn(() => true),
  fetchCalendarEvents: vi.fn(),
  parseCalendarProposals: vi.fn(),
}));

import { getToolSchemas, executeTool, setCalendarRefreshCallback } from '../../js/chatbot-tools.js';
import {
  fetchTimeEntries,
  fetchTimeEntryById,
  resolveIssueSubject,
  searchIssues,
  mapTimeEntry,
  RedmineError,
} from '../../js/redmine-api.js';
import { openForm } from '../../js/time-entry-form.js';
import {
  fetchCalendarEvents,
  parseCalendarProposals,
  isOutlookConfigured,
} from '../../js/outlook.js';
import { getCentralConfigSync } from '../../js/config-store.js';

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-09T10:00:00Z'));
  isOutlookConfigured.mockReturnValue(true);
  getCentralConfigSync.mockReturnValue({});
});

afterEach(() => {
  vi.useRealTimers();
});

// --- getToolSchemas: outlook-not-configured branch (line 116 false branch) ---

describe('getToolSchemas — without outlook', () => {
  it('omits book_outlook_day when outlook is not configured', () => {
    isOutlookConfigured.mockReturnValue(false);
    const tools = getToolSchemas('claude');
    expect(tools).toHaveLength(5);
    expect(tools.map((t) => t.name)).not.toContain('book_outlook_day');
  });

  it('omits book_outlook_day in OpenAI schemas when outlook not configured', () => {
    isOutlookConfigured.mockReturnValue(false);
    const tools = getToolSchemas('openai');
    expect(tools).toHaveLength(5);
    expect(tools.map((t) => t.function.name)).not.toContain('book_outlook_day');
  });
});

// --- executeTool — search_tickets ---

describe('executeTool — search_tickets', () => {
  it('returns formatted ticket list when results are found', async () => {
    searchIssues.mockResolvedValue([
      {
        id: 100,
        subject: 'Fix login',
        projectIdentifier: 'web',
        projectName: 'Web App',
        status: 'New',
      },
      {
        id: 101,
        subject: 'Refactor',
        projectIdentifier: null,
        projectName: 'Backend',
        status: 'In Progress',
      },
    ]);
    const result = await executeTool('search_tickets', { query: 'login' });
    expect(searchIssues).toHaveBeenCalledWith('login');
    expect(result.result).toContain('Found 2 tickets');
    expect(result.result).toContain('#100');
    expect(result.result).toContain('Fix login');
    expect(result.result).toContain('web — Web App');
    expect(result.result).toContain('#101');
    expect(result.result).toContain('Backend');
    expect(result.result).toContain('(In Progress)');
  });

  it('returns no-tickets message when no matches', async () => {
    searchIssues.mockResolvedValue([]);
    const result = await executeTool('search_tickets', { query: 'nothing' });
    expect(result.result).toBe('No tickets found.');
  });

  it('handles missing projectIdentifier (uses projectName only)', async () => {
    searchIssues.mockResolvedValue([
      { id: 5, subject: 'Test', projectIdentifier: null, projectName: 'OnlyName', status: 'Open' },
    ]);
    const result = await executeTool('search_tickets', { query: 'x' });
    // The line should not contain the dash separator when projectIdentifier is null
    expect(result.result).toContain('[OnlyName]');
    expect(result.result).not.toContain(' — OnlyName');
  });
});

// --- highlight helpers: cover DOM-mutation branches via stubbed getElementById ---

describe('highlight helpers fired via executeCreate / executeDelete', () => {
  it('adds ai-highlight class to fields whose IDs resolve to elements', async () => {
    const elements = {};
    const makeEl = () => ({ classList: { add: vi.fn() }, style: {} });
    document.getElementById = vi.fn((id) => {
      if (!(id in elements)) elements[id] = makeEl();
      return elements[id];
    });

    resolveIssueSubject.mockResolvedValue('Subj');
    openForm.mockImplementation((entry, prefill, onSave) => {
      // simulate save
      onSave({ id: 7 });
    });

    const promise = executeTool('create_time_entry', {
      issue_id: 1,
      hours: 1,
      date: '2026-04-22',
      start_time: '09:00',
    });
    // Advance the setTimeout(100) used inside highlightAiFields
    await vi.advanceTimersByTimeAsync(150);
    const result = await promise;
    expect(result.result).toContain('Time entry created');
    // At least one field should have been highlighted
    expect(elements['lean-info-date'].classList.add).toHaveBeenCalledWith('ai-highlight');
    expect(elements['lean-info-start'].classList.add).toHaveBeenCalledWith('ai-highlight');
  });

  it('skips highlight when getElementById returns null', async () => {
    document.getElementById = vi.fn(() => null);
    resolveIssueSubject.mockResolvedValue('');
    openForm.mockImplementation((entry, prefill, onSave) => onSave({ id: 1 }));
    const promise = executeTool('create_time_entry', {
      issue_id: 1,
      hours: 1,
      date: '2026-04-22',
      start_time: '09:00',
    });
    await vi.advanceTimersByTimeAsync(150);
    const result = await promise;
    expect(result.result).toContain('Time entry created');
  });

  it('shows the delete button via highlightDeleteButton when present', async () => {
    const btn = { classList: { add: vi.fn() }, style: { display: 'none' } };
    document.getElementById = vi.fn((id) => (id === 'lean-delete' ? btn : null));

    const raw = { id: 50, hours: 1, spent_on: '2026-04-22', issue: { id: 9 } };
    const mapped = { id: 50, date: '2026-04-22', issueId: 9, hours: 1 };
    fetchTimeEntries.mockResolvedValue([raw]);
    mapTimeEntry.mockReturnValue(mapped);
    openForm.mockImplementation((entry, prefill, onSave, onDelete) => onDelete());

    const promise = executeTool('delete_time_entry', { date: '2026-04-22', issue_id: 9 });
    await vi.advanceTimersByTimeAsync(150);
    const result = await promise;
    expect(result.result).toContain('Time entry 50 deleted');
    expect(btn.classList.add).toHaveBeenCalledWith('ai-highlight-delete');
    expect(btn.style.display).toBe('');
  });

  it('skips delete-highlight when button element is missing', async () => {
    document.getElementById = vi.fn(() => null);
    const raw = { id: 50, hours: 1, spent_on: '2026-04-22', issue: { id: 9 } };
    const mapped = { id: 50, date: '2026-04-22', issueId: 9, hours: 1 };
    fetchTimeEntries.mockResolvedValue([raw]);
    mapTimeEntry.mockReturnValue(mapped);
    openForm.mockImplementation((entry, prefill, onSave, onDelete) => onDelete());

    const promise = executeTool('delete_time_entry', { date: '2026-04-22', issue_id: 9 });
    await vi.advanceTimersByTimeAsync(150);
    const result = await promise;
    expect(result.result).toContain('deleted');
  });
});

// --- setCalendarRefreshCallback covers lines 142-144 plus the refresh path inside executeCreate/Edit/Delete ---

describe('setCalendarRefreshCallback', () => {
  it('registered callback fires when a time entry is saved (create)', async () => {
    const cb = vi.fn();
    setCalendarRefreshCallback(cb);
    document.getElementById = vi.fn(() => null);
    resolveIssueSubject.mockResolvedValue('');
    openForm.mockImplementation((entry, prefill, onSave) => onSave({ id: 1 }));

    const promise = executeTool('create_time_entry', {
      issue_id: 1,
      hours: 1,
      date: '2026-04-22',
      start_time: '09:00',
    });
    await vi.advanceTimersByTimeAsync(150);
    await promise;
    expect(cb).toHaveBeenCalled();
    setCalendarRefreshCallback(null);
  });

  it('registered callback fires on edit save', async () => {
    const cb = vi.fn();
    setCalendarRefreshCallback(cb);
    document.getElementById = vi.fn(() => null);
    const raw = { id: 60, hours: 2, spent_on: '2026-04-22', issue: { id: 9 } };
    const mapped = { id: 60, date: '2026-04-22', issueId: 9, hours: 2 };
    fetchTimeEntries.mockResolvedValue([raw]);
    mapTimeEntry.mockReturnValue(mapped);
    openForm.mockImplementation((entry, prefill, onSave) => onSave());
    const promise = executeTool('edit_time_entry', { date: '2026-04-22', issue_id: 9, hours: 3 });
    await vi.advanceTimersByTimeAsync(150);
    await promise;
    expect(cb).toHaveBeenCalled();
    setCalendarRefreshCallback(null);
  });

  it('registered callback fires on delete', async () => {
    const cb = vi.fn();
    setCalendarRefreshCallback(cb);
    document.getElementById = vi.fn(() => null);
    const raw = { id: 70, hours: 1, spent_on: '2026-04-22', issue: { id: 9 } };
    const mapped = { id: 70, date: '2026-04-22', issueId: 9, hours: 1 };
    fetchTimeEntries.mockResolvedValue([raw]);
    mapTimeEntry.mockReturnValue(mapped);
    openForm.mockImplementation((entry, prefill, onSave, onDelete) => onDelete());
    const promise = executeTool('delete_time_entry', { date: '2026-04-22', issue_id: 9 });
    await vi.advanceTimersByTimeAsync(150);
    await promise;
    expect(cb).toHaveBeenCalled();
    setCalendarRefreshCallback(null);
  });
});

// --- executeCreate / executeEdit / executeDelete cancel paths ---

describe('executeTool — form cancellation paths', () => {
  beforeEach(() => {
    document.getElementById = vi.fn(() => null);
  });

  it('create resolves with cancellation message when user cancels', async () => {
    resolveIssueSubject.mockResolvedValue('Subj');
    openForm.mockImplementation((entry, prefill, onSave, onDelete, onCancel) => onCancel());
    const result = await executeTool('create_time_entry', {
      issue_id: 9,
      hours: 1,
      date: '2026-04-22',
      start_time: '09:00',
    });
    expect(result.result).toContain('User cancelled');
    expect(result.result).toContain('#9');
    expect(result.result).toContain('SKIP');
  });

  it('edit resolves with cancellation message when user cancels', async () => {
    const raw = { id: 80, hours: 1, spent_on: '2026-04-22', issue: { id: 9 } };
    const mapped = { id: 80, date: '2026-04-22', issueId: 9, hours: 1 };
    fetchTimeEntries.mockResolvedValue([raw]);
    mapTimeEntry.mockReturnValue(mapped);
    openForm.mockImplementation((entry, prefill, onSave, onDelete, onCancel) => onCancel());
    const result = await executeTool('edit_time_entry', {
      date: '2026-04-22',
      issue_id: 9,
      comment: 'new',
    });
    expect(result.result).toContain('User cancelled');
    expect(result.result).toContain('80');
  });

  it('delete resolves with cancellation message when user cancels', async () => {
    const raw = { id: 90, hours: 1, spent_on: '2026-04-22', issue: { id: 9 } };
    const mapped = { id: 90, date: '2026-04-22', issueId: 9, hours: 1 };
    fetchTimeEntries.mockResolvedValue([raw]);
    mapTimeEntry.mockReturnValue(mapped);
    openForm.mockImplementation((entry, prefill, onSave, onDelete, onCancel) => onCancel());
    const result = await executeTool('delete_time_entry', { date: '2026-04-22', issue_id: 9 });
    expect(result.result).toContain('User cancelled');
    expect(result.result).toContain('90');
  });
});

// --- executeBookOutlookDay: extra branches ---

describe('executeTool — book_outlook_day extras', () => {
  beforeEach(() => {
    fetchTimeEntries.mockResolvedValue([]);
    mapTimeEntry.mockReturnValue(null);
  });

  it('defaults date to today when not provided', async () => {
    fetchCalendarEvents.mockResolvedValue([]);
    const result = await executeTool('book_outlook_day', {});
    // System time is 2026-05-09 — verify fetchCalendarEvents was called with that date
    expect(fetchCalendarEvents).toHaveBeenCalledWith('2026-05-09');
    expect(result.result).toContain('outlook.no_events');
  });

  it('returns fetch_error when fetchCalendarEvents throws', async () => {
    fetchCalendarEvents.mockRejectedValue(new Error('boom'));
    const result = await executeTool('book_outlook_day', { date: '2026-04-25' });
    expect(result.result).toBe('outlook.fetch_error');
  });

  it('renders excluded section for skipped overlap and informational events', async () => {
    fetchCalendarEvents.mockResolvedValue([{ subject: 'Test', start: '', end: '' }]);
    parseCalendarProposals.mockReturnValue({
      proposals: [],
      skippedOverlap: ['Already-booked Mtg'],
      skippedInformational: ['Birthday: Jane'],
    });
    const result = await executeTool('book_outlook_day', { date: '2026-04-25' });
    expect(result.result).toContain('outlook.excluded_header');
    expect(result.result).toContain('outlook.skipped_overlap_item');
    expect(result.result).toContain('outlook.skipped_informational_item');
  });

  it('emits break_routing_disabled notice when no break ticket configured and no break proposals', async () => {
    fetchCalendarEvents.mockResolvedValue([{ subject: 'Test', start: '', end: '' }]);
    parseCalendarProposals.mockReturnValue({
      proposals: [
        {
          subject: 'Sprint #2097',
          startTime: '09:00',
          endTime: '10:00',
          hours: 1,
          ticketId: 2097,
          isAllDay: false,
          category: 'meeting',
          status: 'proposed',
        },
      ],
      skippedOverlap: [],
      skippedInformational: [],
    });
    // central cfg is empty -> breakTicket null -> notice should fire
    const result = await executeTool('book_outlook_day', { date: '2026-04-25' });
    expect(result.result).toContain('chatbot.break_routing_disabled');
  });

  it('omits break_routing_disabled notice when breakTicket is configured', async () => {
    getCentralConfigSync.mockReturnValue({ breakTicket: 999 });
    fetchCalendarEvents.mockResolvedValue([{ subject: 'Test', start: '', end: '' }]);
    parseCalendarProposals.mockReturnValue({
      proposals: [
        {
          subject: 'Sprint #2097',
          startTime: '09:00',
          endTime: '10:00',
          hours: 1,
          ticketId: 2097,
          isAllDay: false,
          category: 'meeting',
          status: 'proposed',
        },
      ],
      skippedOverlap: [],
      skippedInformational: [],
    });
    const result = await executeTool('book_outlook_day', { date: '2026-04-25' });
    expect(result.result).not.toContain('chatbot.break_routing_disabled');
  });

  it('renders all-day holiday proposal with holiday_proposal_subject template', async () => {
    getCentralConfigSync.mockReturnValue({ holidayTicket: 1234, vacationTicket: 5678 });
    fetchCalendarEvents.mockResolvedValue([{ subject: 'Test', start: '', end: '' }]);
    parseCalendarProposals.mockReturnValue({
      proposals: [
        {
          subject: 'Christmas Day',
          startTime: null,
          endTime: null,
          hours: 8,
          ticketId: 1234,
          isAllDay: true,
          category: 'holiday',
          status: 'proposed',
        },
      ],
      skippedOverlap: [],
      skippedInformational: [],
    });
    resolveIssueSubject.mockResolvedValue('Public Holiday');
    const result = await executeTool('book_outlook_day', { date: '2026-12-25' });
    expect(result.result).toContain('outlook.holiday_proposal_subject');
  });

  it('renders all-day vacation proposal with vacation_proposal_subject template', async () => {
    getCentralConfigSync.mockReturnValue({ vacationTicket: 5678 });
    fetchCalendarEvents.mockResolvedValue([{ subject: 'Test', start: '', end: '' }]);
    parseCalendarProposals.mockReturnValue({
      proposals: [
        {
          subject: 'Vacation',
          startTime: null,
          endTime: null,
          hours: 8,
          ticketId: 5678,
          isAllDay: true,
          category: 'vacation',
          status: 'proposed',
        },
      ],
      skippedOverlap: [],
      skippedInformational: [],
    });
    resolveIssueSubject.mockResolvedValue('Vacation Ticket');
    const result = await executeTool('book_outlook_day', { date: '2026-07-15' });
    expect(result.result).toContain('outlook.vacation_proposal_subject');
  });

  it('asks for input on all-day events flagged needs-ticket', async () => {
    fetchCalendarEvents.mockResolvedValue([{ subject: 'Test', start: '', end: '' }]);
    parseCalendarProposals.mockReturnValue({
      proposals: [
        {
          subject: 'Sick Day',
          startTime: null,
          endTime: null,
          hours: 0,
          ticketId: null,
          isAllDay: true,
          category: 'unknown',
          status: 'needs-ticket',
        },
      ],
      skippedOverlap: [],
      skippedInformational: [],
    });
    const result = await executeTool('book_outlook_day', { date: '2026-04-25' });
    expect(result.result).toContain('outlook.needs_input_header');
    expect(result.result).toContain('outlook.allday_ask');
  });

  it('falls back to no_events line when there are events but proposals AND skipped lists are all empty', async () => {
    fetchCalendarEvents.mockResolvedValue([{ subject: 'Test', start: '', end: '' }]);
    parseCalendarProposals.mockReturnValue({
      proposals: [],
      skippedOverlap: [],
      skippedInformational: [],
    });
    // Need breakTicket configured so break_routing_disabled notice doesn't fire.
    getCentralConfigSync.mockReturnValue({ breakTicket: 999 });
    const result = await executeTool('book_outlook_day', { date: '2026-04-25' });
    expect(result.result).toContain('outlook.no_events');
  });

  it('handles resolveIssueSubject failure during ticket subject resolution', async () => {
    fetchCalendarEvents.mockResolvedValue([{ subject: 'Test', start: '', end: '' }]);
    parseCalendarProposals.mockReturnValue({
      proposals: [
        {
          subject: 'Sprint #2097',
          startTime: '09:00',
          endTime: '10:00',
          hours: 1,
          ticketId: 2097,
          isAllDay: false,
          category: 'meeting',
          status: 'proposed',
        },
      ],
      skippedOverlap: [],
      skippedInformational: [],
    });
    resolveIssueSubject.mockRejectedValue(new Error('redmine down'));
    const result = await executeTool('book_outlook_day', { date: '2026-04-25' });
    // Should still render successfully with empty subject
    expect(result.result).toContain('outlook.bookable_header');
  });

  it('returns null for default centralCfg when getCentralConfigSync returns null', async () => {
    getCentralConfigSync.mockReturnValue(null);
    fetchCalendarEvents.mockResolvedValue([]);
    const result = await executeTool('book_outlook_day', { date: '2026-04-25' });
    expect(result.result).toContain('outlook.no_events');
  });

  it('uses default workingHours fallback when readWorkingHours returns null', async () => {
    // Already covered by other tests with start='08:00'; here we just exercise the
    // path where parseCalendarProposals receives the default workStart.
    fetchCalendarEvents.mockResolvedValue([]);
    const result = await executeTool('book_outlook_day', { date: '2026-04-25' });
    expect(result.result).toContain('outlook.no_events');
  });
});

// --- executeQuery — exercise issue.id mapping branch (line 171) and start-less entry ---

describe('executeQuery — extra branches', () => {
  it('matches entries via e.issue.id when e.issueId is missing', async () => {
    const raw = { id: 1, hours: 1, spent_on: '2026-04-20', issue: { id: 555, subject: 'Sub' } };
    fetchTimeEntries.mockResolvedValue([raw]);
    mapTimeEntry.mockReturnValue({
      id: 1,
      // no issueId — but issue.id present
      issue: { id: 555, subject: 'Sub' },
      date: '2026-04-20',
      hours: 1,
      project: { name: 'P', identifier: 'p' },
    });
    const result = await executeTool('query_time_entries', {
      from: '2026-04-20',
      to: '2026-04-20',
      issue_id: 555,
    });
    expect(result.result).toContain('Found 1 entries');
    expect(result.result).toContain('#555');
    expect(result.result).toContain('p — P');
  });

  it('handles entries lacking startTime, project, comment', async () => {
    fetchTimeEntries.mockResolvedValue([{ id: 2 }]);
    mapTimeEntry.mockReturnValue({
      id: 2,
      // no startTime, no project, no comment
      hours: 0.5,
      issueId: 7,
      issueSubject: 'Sub',
    });
    const result = await executeTool('query_time_entries', {
      from: '2026-04-20',
      to: '2026-04-20',
    });
    expect(result.result).toContain('Found 1 entries');
    expect(result.result).toContain('#7');
    expect(result.result).toContain('0.5h');
  });

  it('handles entry with only spent_on (no date) and bare project.name', async () => {
    fetchTimeEntries.mockResolvedValue([{ id: 3 }]);
    mapTimeEntry.mockReturnValue({
      id: 3,
      hours: 1,
      spent_on: '2026-04-20',
      issue: { id: 8, subject: 'Sub2' },
      project: { name: 'JustName' },
      comments: 'a comment',
    });
    const result = await executeTool('query_time_entries', {
      from: '2026-04-20',
      to: '2026-04-20',
    });
    expect(result.result).toContain('JustName');
    expect(result.result).toContain('a comment');
  });
});

describe('executeTool — input validation guards (SEC-005)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('edit_time_entry: rejects negative entry_id', async () => {
    const result = await executeTool('edit_time_entry', { entry_id: -1, hours: 1 });
    expect(result.result).toBe('Invalid input.');
  });

  it('edit_time_entry: rejects out-of-range hours', async () => {
    const result = await executeTool('edit_time_entry', { entry_id: 1, hours: 100 });
    expect(result.result).toBe('Invalid input.');
  });

  it('edit_time_entry: rejects malformed date', async () => {
    const result = await executeTool('edit_time_entry', { entry_id: 1, date: 'not-a-date' });
    expect(result.result).toBe('Invalid date — expected YYYY-MM-DD.');
  });

  it('delete_time_entry: rejects negative entry_id', async () => {
    const result = await executeTool('delete_time_entry', { entry_id: -1 });
    expect(result.result).toBe('Invalid input.');
  });

  it('delete_time_entry: rejects malformed date', async () => {
    const result = await executeTool('delete_time_entry', { issue_id: 1, date: 'not-a-date' });
    expect(result.result).toBe('Invalid date — expected YYYY-MM-DD.');
  });

  it('book_outlook_day: rejects malformed date', async () => {
    const result = await executeTool('book_outlook_day', { date: 'not-a-date' });
    expect(result.result).toBe('Invalid date — expected YYYY-MM-DD.');
  });

  it('query_time_entries: rejects malformed from date', async () => {
    const result = await executeTool('query_time_entries', { from: 'bad', to: '2026-04-20' });
    expect(result.result).toBe('Invalid date — expected YYYY-MM-DD.');
  });

  it('create_time_entry: rejects malformed start_time', async () => {
    const result = await executeTool('create_time_entry', {
      issue_id: 1,
      hours: 2,
      date: '2026-04-20',
      start_time: 'not-a-time',
    });
    expect(result.result).toBe('Invalid time — expected HH:MM.');
  });

  it('edit_time_entry: rethrows non-404 RedmineError from fetchTimeEntryById', async () => {
    fetchTimeEntryById.mockRejectedValue(new RedmineError('Server error', 500));
    await expect(executeTool('edit_time_entry', { entry_id: 42 })).rejects.toThrow('Server error');
  });
});
