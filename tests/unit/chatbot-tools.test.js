import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies before importing the module under test
vi.mock('../../js/i18n.js', () => ({
  t: vi.fn((key) => key),
  locale: 'en',
  formatDate: vi.fn((d) => d),
}));

vi.mock('../../js/settings.js', () => ({
  readWorkingHours: vi.fn(() => ({ start: '08:00', end: '17:00' })),
  readWeeklyHours: vi.fn(() => 40),
  readHolidayTicket: vi.fn(() => null),
  readConfig: vi.fn(() => ({})),
}));

vi.mock('../../js/redmine-api.js', () => ({
  fetchTimeEntries: vi.fn(),
  fetchTimeEntryById: vi.fn(),
  resolveIssueSubject: vi.fn(),
  enrichEntries: vi.fn(async (entries) => entries),
  searchIssues: vi.fn(),
  mapTimeEntry: vi.fn(),
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

import { getToolSchemas, executeTool } from '../../js/chatbot-tools.js';
import { fetchTimeEntries, fetchTimeEntryById, resolveIssueSubject, mapTimeEntry } from '../../js/redmine-api.js';
import { openForm } from '../../js/time-entry-form.js';

describe('chatbot-tools schemas', () => {
  it('returns Claude tool schemas with correct names', () => {
    const tools = getToolSchemas('claude');
    expect(tools).toHaveLength(6);
    const names = tools.map(t => t.name);
    expect(names).toContain('query_time_entries');
    expect(names).toContain('create_time_entry');
    expect(names).toContain('search_tickets');
    expect(names).toContain('edit_time_entry');
    expect(names).toContain('delete_time_entry');
    expect(names).toContain('book_outlook_day');
  });

  it('returns OpenAI tool schemas with function wrapper', () => {
    const tools = getToolSchemas('openai');
    expect(tools).toHaveLength(6);
    expect(tools[0].type).toBe('function');
    expect(tools[0].function.name).toBe('query_time_entries');
  });

  it('Claude schemas have required input_schema fields', () => {
    const tools = getToolSchemas('claude');
    const query = tools.find(t => t.name === 'query_time_entries');
    expect(query.input_schema.required).toContain('from');
    expect(query.input_schema.required).toContain('to');
  });

  it('create_time_entry requires start_time', () => {
    const tools = getToolSchemas('claude');
    const create = tools.find(t => t.name === 'create_time_entry');
    expect(create.input_schema.required).toContain('start_time');
  });

  it('edit_time_entry accepts date + issue_id as alternative to entry_id', () => {
    const tools = getToolSchemas('claude');
    const edit = tools.find(t => t.name === 'edit_time_entry');
    expect(edit.input_schema.properties).toHaveProperty('entry_id');
    expect(edit.input_schema.properties).toHaveProperty('date');
    expect(edit.input_schema.properties).toHaveProperty('issue_id');
  });

  it('delete_time_entry accepts date + issue_id as alternative to entry_id', () => {
    const tools = getToolSchemas('claude');
    const del = tools.find(t => t.name === 'delete_time_entry');
    expect(del.input_schema.properties).toHaveProperty('entry_id');
    expect(del.input_schema.properties).toHaveProperty('date');
    expect(del.input_schema.properties).toHaveProperty('issue_id');
  });

  it('OpenAI schemas mirror Claude schemas', () => {
    const claude = getToolSchemas('claude');
    const openai = getToolSchemas('openai');
    expect(openai).toHaveLength(claude.length);
    openai.forEach((tool, i) => {
      expect(tool.function.name).toBe(claude[i].name);
      expect(tool.function.parameters).toEqual(claude[i].input_schema);
    });
  });
});

// --- Helper factories ---

function makeRawEntry({ id = 1, hours = 2, spent_on = '2026-04-20', issue_id = 100, subject = 'Fix bug', project = 'MyProject', activity_id = 9, comments = '', easy_time_from = '09:00:00' } = {}) {
  return {
    id,
    hours,
    spent_on,
    issue: { id: issue_id, subject },
    project: { name: project },
    activity: { id: activity_id, name: 'Development' },
    comments,
    easy_time_from,
  };
}

function makeMappedEntry(raw) {
  return {
    id: raw.id,
    date: raw.spent_on,
    startTime: raw.easy_time_from ? raw.easy_time_from.slice(0, 5) : null,
    hours: raw.hours,
    issueId: raw.issue?.id ?? null,
    issueSubject: raw.issue?.subject ?? null,
    projectName: raw.project?.name ?? null,
    activityId: raw.activity?.id ?? null,
    activityName: raw.activity?.name ?? null,
    comment: raw.comments ?? '',
    _rawComment: raw.comments ?? '',
  };
}

// --- executeTool tests ---

describe('executeTool — unknown tool', () => {
  it('returns error for unknown tool name', async () => {
    const result = await executeTool('nonexistent_tool', {});
    expect(result).toEqual({ result: 'Unknown tool: nonexistent_tool' });
  });
});

describe('executeTool — query_time_entries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches entries for date range and returns formatted summary', async () => {
    const raw1 = makeRawEntry({ id: 10, hours: 3, spent_on: '2026-04-20', issue_id: 101, subject: 'Task A', comments: 'some work' });
    const raw2 = makeRawEntry({ id: 11, hours: 1.5, spent_on: '2026-04-21', issue_id: 102, subject: 'Task B' });
    const mapped1 = makeMappedEntry(raw1);
    const mapped2 = makeMappedEntry(raw2);

    fetchTimeEntries.mockResolvedValue([raw1, raw2]);
    mapTimeEntry.mockImplementation((r) => {
      if (r.id === 10) return mapped1;
      if (r.id === 11) return mapped2;
      return null;
    });

    const result = await executeTool('query_time_entries', { from: '2026-04-20', to: '2026-04-21' });

    expect(fetchTimeEntries).toHaveBeenCalledWith('2026-04-20', '2026-04-21');
    expect(result.result).toContain('Found 2 entries');
    expect(result.result).toContain('4.5h total');
    expect(result.result).toContain('#101');
    expect(result.result).toContain('#102');
    expect(result.result).toContain('Task A');
    expect(result.result).toContain('Task B');
    expect(result.result).toContain('[ID: 10]');
    expect(result.result).toContain('[ID: 11]');
    expect(result.result).toContain('some work');
  });

  it('filters entries by issue_id when provided', async () => {
    const raw1 = makeRawEntry({ id: 10, issue_id: 101 });
    const raw2 = makeRawEntry({ id: 11, issue_id: 102 });
    const mapped1 = makeMappedEntry(raw1);
    const mapped2 = makeMappedEntry(raw2);

    fetchTimeEntries.mockResolvedValue([raw1, raw2]);
    mapTimeEntry.mockImplementation((r) => {
      if (r.id === 10) return mapped1;
      if (r.id === 11) return mapped2;
      return null;
    });

    const result = await executeTool('query_time_entries', { from: '2026-04-20', to: '2026-04-21', issue_id: 101 });

    expect(result.result).toContain('Found 1 entries');
    expect(result.result).toContain('#101');
    expect(result.result).not.toContain('#102');
  });

  it('returns no_entries_found when no entries match', async () => {
    fetchTimeEntries.mockResolvedValue([]);
    mapTimeEntry.mockReturnValue(null);

    const result = await executeTool('query_time_entries', { from: '2026-04-20', to: '2026-04-20' });
    expect(result.result).toBe('chatbot.no_entries_found');
  });

  it('returns no_entries_found when issue_id filter excludes all entries', async () => {
    const raw = makeRawEntry({ id: 10, issue_id: 101 });
    const mapped = makeMappedEntry(raw);

    fetchTimeEntries.mockResolvedValue([raw]);
    mapTimeEntry.mockReturnValue(mapped);

    const result = await executeTool('query_time_entries', { from: '2026-04-20', to: '2026-04-20', issue_id: 999 });
    expect(result.result).toBe('chatbot.no_entries_found');
  });

  it('handles entries with null mapTimeEntry results', async () => {
    const raw1 = makeRawEntry({ id: 10 });
    const raw2 = { id: null, hours: null, spent_on: null }; // invalid entry

    fetchTimeEntries.mockResolvedValue([raw1, raw2]);
    mapTimeEntry.mockImplementation((r) => {
      if (r.id === 10) return makeMappedEntry(raw1);
      return null; // invalid entries filtered out
    });

    const result = await executeTool('query_time_entries', { from: '2026-04-20', to: '2026-04-20' });
    expect(result.result).toContain('Found 1 entries');
  });

  it('includes start time in output when present', async () => {
    const raw = makeRawEntry({ id: 10, easy_time_from: '14:30:00' });
    const mapped = makeMappedEntry(raw);

    fetchTimeEntries.mockResolvedValue([raw]);
    mapTimeEntry.mockReturnValue(mapped);

    const result = await executeTool('query_time_entries', { from: '2026-04-20', to: '2026-04-20' });
    expect(result.result).toContain('14:30');
  });
});

describe('executeTool — create_time_entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls openForm with prefill data and resolves on save callback', async () => {
    resolveIssueSubject.mockResolvedValue('Fix login bug');
    openForm.mockImplementation((entry, prefill, onSave) => {
      // Simulate the user saving immediately
      onSave({ id: 99 });
    });

    const result = await executeTool('create_time_entry', {
      issue_id: 42,
      hours: 1.5,
      date: '2026-04-22',
      start_time: '10:00',
    });

    expect(resolveIssueSubject).toHaveBeenCalledWith(42);
    expect(openForm).toHaveBeenCalledTimes(1);

    const [entryArg, prefillArg] = openForm.mock.calls[0];
    expect(entryArg).toBeNull();
    expect(prefillArg.issueId).toBe(42);
    expect(prefillArg.issueSubject).toBe('Fix login bug');
    expect(prefillArg.date).toBe('2026-04-22');
    expect(prefillArg.hours).toBe(1.5);
    expect(prefillArg.startTime).toBe('10:00');
    expect(prefillArg.comment).toBe('');

    expect(result.result).toContain('Time entry created');
    expect(result.result).toContain('1.5h');
    expect(result.result).toContain('#42');
    expect(result.result).toContain('2026-04-22');
  });

  it('uses default start time when start_time not provided', async () => {
    resolveIssueSubject.mockResolvedValue('');
    openForm.mockImplementation((entry, prefill, onSave) => {
      onSave({ id: 99 });
    });

    await executeTool('create_time_entry', {
      issue_id: 42,
      hours: 2,
      date: '2026-04-22',
      // no start_time — should default to working hours start (08:00 from mock)
    });

    const prefillArg = openForm.mock.calls[0][1];
    // _defaultStart is set at module load from readWorkingHours().start = '08:00'
    expect(prefillArg.startTime).toBe('08:00');
  });

  it('passes comment when provided', async () => {
    resolveIssueSubject.mockResolvedValue('');
    openForm.mockImplementation((entry, prefill, onSave) => {
      onSave({ id: 99 });
    });

    await executeTool('create_time_entry', {
      issue_id: 42,
      hours: 1,
      date: '2026-04-22',
      start_time: '09:00',
      comment: 'Daily standup',
    });

    const prefillArg = openForm.mock.calls[0][1];
    expect(prefillArg.comment).toBe('Daily standup');
  });

  it('handles resolveIssueSubject failure gracefully', async () => {
    resolveIssueSubject.mockRejectedValue(new Error('Network error'));
    openForm.mockImplementation((entry, prefill, onSave) => {
      onSave({ id: 99 });
    });

    const result = await executeTool('create_time_entry', {
      issue_id: 42,
      hours: 1,
      date: '2026-04-22',
      start_time: '09:00',
    });

    // Should still succeed with empty subject
    const prefillArg = openForm.mock.calls[0][1];
    expect(prefillArg.issueSubject).toBe('');
    expect(result.result).toContain('Time entry created');
  });
});

describe('executeTool — edit_time_entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('finds entry by entry_id and opens edit form', async () => {
    const raw = makeRawEntry({ id: 55, hours: 2, issue_id: 101, subject: 'Task A' });
    const mapped = makeMappedEntry(raw);

    fetchTimeEntryById.mockResolvedValue(raw);
    mapTimeEntry.mockReturnValue(mapped);
    openForm.mockImplementation((entry, prefill, onSave) => {
      onSave({ id: 55 });
    });

    const result = await executeTool('edit_time_entry', { entry_id: 55, hours: 3 });

    expect(fetchTimeEntryById).toHaveBeenCalledWith(55);
    expect(openForm).toHaveBeenCalledTimes(1);

    const [entryArg] = openForm.mock.calls[0];
    expect(entryArg.id).toBe(55);
    expect(entryArg.hours).toBe(3); // overridden hours
    expect(entryArg.issueId).toBe(101);

    expect(result.result).toContain('Time entry 55 updated');
  });

  it('finds entry by date + issue_id and opens edit form', async () => {
    const raw = makeRawEntry({ id: 77, hours: 1, spent_on: '2026-04-22', issue_id: 200 });
    const mapped = makeMappedEntry(raw);

    fetchTimeEntries.mockResolvedValue([raw]);
    mapTimeEntry.mockReturnValue(mapped);
    openForm.mockImplementation((entry, prefill, onSave) => {
      onSave({ id: 77 });
    });

    const result = await executeTool('edit_time_entry', { date: '2026-04-22', issue_id: 200 });

    expect(fetchTimeEntries).toHaveBeenCalledWith('2026-04-22', '2026-04-22');
    expect(openForm).toHaveBeenCalledTimes(1);

    const [entryArg] = openForm.mock.calls[0];
    expect(entryArg.id).toBe(77);
    expect(result.result).toContain('Time entry 77 updated');
  });

  it('returns no_entries_found when entry_id not found', async () => {
    fetchTimeEntries.mockResolvedValue([]);
    mapTimeEntry.mockReturnValue(null);

    const result = await executeTool('edit_time_entry', { entry_id: 999 });

    expect(result.result).toBe('chatbot.no_entries_found');
    expect(openForm).not.toHaveBeenCalled();
  });

  it('returns no_entries_found when date search yields no matches', async () => {
    fetchTimeEntries.mockResolvedValue([]);

    const result = await executeTool('edit_time_entry', { date: '2026-04-22', issue_id: 999 });

    expect(result.result).toBe('chatbot.no_entries_found');
    expect(openForm).not.toHaveBeenCalled();
  });

  it('returns multiple_matches when date+issue yields multiple entries', async () => {
    const raw1 = makeRawEntry({ id: 10, hours: 1, spent_on: '2026-04-22', issue_id: 200, easy_time_from: '09:00:00' });
    const raw2 = makeRawEntry({ id: 11, hours: 2, spent_on: '2026-04-22', issue_id: 200, easy_time_from: '14:00:00' });
    const mapped1 = makeMappedEntry(raw1);
    const mapped2 = makeMappedEntry(raw2);

    fetchTimeEntries.mockResolvedValue([raw1, raw2]);
    mapTimeEntry.mockImplementation((r) => {
      if (r.id === 10) return mapped1;
      if (r.id === 11) return mapped2;
      return null;
    });

    const result = await executeTool('edit_time_entry', { date: '2026-04-22', issue_id: 200 });

    expect(result.result).toContain('chatbot.multiple_matches');
    expect(result.result).toContain('ID 10');
    expect(result.result).toContain('ID 11');
    expect(openForm).not.toHaveBeenCalled();
  });

  it('returns no_entries_found when neither entry_id nor date provided', async () => {
    const result = await executeTool('edit_time_entry', {});
    expect(result.result).toBe('chatbot.no_entries_found');
    expect(openForm).not.toHaveBeenCalled();
  });

  it('applies comment override when provided', async () => {
    const raw = makeRawEntry({ id: 55, comments: 'old comment' });
    const mapped = makeMappedEntry(raw);

    fetchTimeEntries.mockResolvedValue([raw]);
    mapTimeEntry.mockReturnValue(mapped);
    openForm.mockImplementation((entry, prefill, onSave) => {
      onSave({ id: 55 });
    });

    await executeTool('edit_time_entry', { entry_id: 55, comment: 'new comment' });

    const [entryArg] = openForm.mock.calls[0];
    expect(entryArg.comment).toBe('new comment');
  });

  it('preserves original values when no overrides given', async () => {
    const raw = makeRawEntry({ id: 55, hours: 2, comments: 'keep this' });
    const mapped = makeMappedEntry(raw);

    fetchTimeEntries.mockResolvedValue([raw]);
    mapTimeEntry.mockReturnValue(mapped);
    openForm.mockImplementation((entry, prefill, onSave) => {
      onSave({ id: 55 });
    });

    await executeTool('edit_time_entry', { entry_id: 55 });

    const [entryArg] = openForm.mock.calls[0];
    expect(entryArg.hours).toBe(2);
    expect(entryArg.comment).toBe('keep this');
  });
});

describe('executeTool — delete_time_entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('finds entry by entry_id and opens delete form', async () => {
    const raw = makeRawEntry({ id: 88, hours: 1, issue_id: 300 });
    const mapped = makeMappedEntry(raw);

    fetchTimeEntryById.mockResolvedValue(raw);
    mapTimeEntry.mockReturnValue(mapped);
    openForm.mockImplementation((entry, prefill, onSave, onDelete) => {
      onDelete();
    });

    const result = await executeTool('delete_time_entry', { entry_id: 88 });

    expect(fetchTimeEntryById).toHaveBeenCalledWith(88);
    expect(openForm).toHaveBeenCalledTimes(1);

    const [entryArg, prefillArg, onSaveArg] = openForm.mock.calls[0];
    expect(entryArg.id).toBe(88);
    expect(prefillArg).toEqual({});
    expect(onSaveArg).toBeNull();

    expect(result.result).toContain('Time entry 88 deleted');
  });

  it('finds entry by date + issue_id and opens delete form', async () => {
    const raw = makeRawEntry({ id: 44, spent_on: '2026-04-22', issue_id: 150 });
    const mapped = makeMappedEntry(raw);

    fetchTimeEntries.mockResolvedValue([raw]);
    mapTimeEntry.mockReturnValue(mapped);
    openForm.mockImplementation((entry, prefill, onSave, onDelete) => {
      onDelete();
    });

    const result = await executeTool('delete_time_entry', { date: '2026-04-22', issue_id: 150 });

    expect(fetchTimeEntries).toHaveBeenCalledWith('2026-04-22', '2026-04-22');
    expect(result.result).toContain('Time entry 44 deleted');
  });

  it('returns no_entries_found when entry not found by entry_id', async () => {
    fetchTimeEntryById.mockResolvedValue(null);
    mapTimeEntry.mockReturnValue(null);

    const result = await executeTool('delete_time_entry', { entry_id: 999 });

    expect(result.result).toBe('chatbot.no_entries_found');
    expect(openForm).not.toHaveBeenCalled();
  });

  it('returns no_entries_found when date search yields no matches', async () => {
    fetchTimeEntries.mockResolvedValue([]);

    const result = await executeTool('delete_time_entry', { date: '2026-04-22', issue_id: 999 });

    expect(result.result).toBe('chatbot.no_entries_found');
    expect(openForm).not.toHaveBeenCalled();
  });

  it('returns multiple_matches when multiple entries match date + issue_id', async () => {
    const raw1 = makeRawEntry({ id: 20, spent_on: '2026-04-22', issue_id: 150, easy_time_from: '08:00:00' });
    const raw2 = makeRawEntry({ id: 21, spent_on: '2026-04-22', issue_id: 150, easy_time_from: '13:00:00' });
    const mapped1 = makeMappedEntry(raw1);
    const mapped2 = makeMappedEntry(raw2);

    fetchTimeEntries.mockResolvedValue([raw1, raw2]);
    mapTimeEntry.mockImplementation((r) => {
      if (r.id === 20) return mapped1;
      if (r.id === 21) return mapped2;
      return null;
    });

    const result = await executeTool('delete_time_entry', { date: '2026-04-22', issue_id: 150 });

    expect(result.result).toContain('chatbot.multiple_matches');
    expect(result.result).toContain('ID 20');
    expect(result.result).toContain('ID 21');
    expect(openForm).not.toHaveBeenCalled();
  });

  it('returns no_entries_found when neither entry_id nor date provided', async () => {
    const result = await executeTool('delete_time_entry', {});
    expect(result.result).toBe('chatbot.no_entries_found');
    expect(openForm).not.toHaveBeenCalled();
  });

  it('passes correct entry shape to openForm for delete', async () => {
    const raw = makeRawEntry({ id: 88, hours: 3, spent_on: '2026-04-22', issue_id: 300, subject: 'Deploy', project: 'Infra', activity_id: 5, comments: 'final deploy' });
    const mapped = makeMappedEntry(raw);

    fetchTimeEntryById.mockResolvedValue(raw);
    mapTimeEntry.mockReturnValue(mapped);
    openForm.mockImplementation((entry, prefill, onSave, onDelete) => {
      onDelete();
    });

    await executeTool('delete_time_entry', { entry_id: 88 });

    const [entryArg] = openForm.mock.calls[0];
    expect(entryArg).toEqual({
      id: 88,
      date: '2026-04-22',
      issueId: 300,
      issueSubject: 'Deploy',
      projectName: 'Infra',
      activityId: 5,
      hours: 3,
      startTime: '09:00',
      comment: 'final deploy',
    });
  });

  describe('executeTool — book_outlook_day', () => {
    let fetchCalendarEvents, parseCalendarProposals, isOutlookConfigured;

    beforeEach(async () => {
      vi.clearAllMocks();
      fetchTimeEntries.mockResolvedValue([]);
      mapTimeEntry.mockReturnValue(null);
      const outlook = await import('../../js/outlook.js');
      fetchCalendarEvents = outlook.fetchCalendarEvents;
      parseCalendarProposals = outlook.parseCalendarProposals;
      isOutlookConfigured = outlook.isOutlookConfigured;
      isOutlookConfigured.mockReturnValue(true);
    });

    it('returns not-configured message when outlook not configured', async () => {
      isOutlookConfigured.mockReturnValue(false);
      const result = await executeTool('book_outlook_day', { date: '2026-04-25' });
      expect(result.result).toBe('outlook.not_configured');
    });

    it('returns no-events message when no calendar events', async () => {
      fetchCalendarEvents.mockResolvedValue([]);
      const result = await executeTool('book_outlook_day', { date: '2026-04-25' });
      expect(result.result).toContain('outlook.no_events');
    });

    it('returns formatted summary with proposals', async () => {
      fetchCalendarEvents.mockResolvedValue([{ subject: 'Test', start: '', end: '' }]);
      parseCalendarProposals.mockReturnValue({
        proposals: [
          { subject: 'Sprint #2097', startTime: '09:00', endTime: '10:00', hours: 1, ticketId: 2097, isAllDay: false, category: 'meeting', status: 'proposed' },
        ],
        skippedPrivate: 0,
        skippedOverlap: 0,
      });
      const result = await executeTool('book_outlook_day', { date: '2026-04-25' });
      expect(result.result).toContain('outlook.summary_header');
      expect(result.result).toContain('outlook.meeting_with_ticket');
    });
  });
});
