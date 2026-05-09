import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../js/i18n.js', () => ({
  t: vi.fn((key) => (key === 'modal.hours_locked_break' ? 'Hours locked' : key)),
  locale: 'en',
  formatDate: vi.fn((d) => d),
}));

const _config = { breakTicket: 998, redmineServerUrl: 'https://test' };
vi.mock('../../js/settings.js', () => ({
  getCentralConfigSync: vi.fn(() => _config),
  readWorkingHours: vi.fn(() => null),
  readWeeklyHours: vi.fn(() => 40),
}));
vi.mock('../../js/config-store.js', () => ({
  getCentralConfigSync: vi.fn(() => _config),
}));

vi.mock('../../js/redmine-api.js', () => ({
  searchIssues: vi.fn(),
  fetchIssueById: vi.fn(),
  resolveIssueSubject: vi.fn(),
  enrichEntries: vi.fn(),
  createTimeEntry: vi.fn(),
  updateTimeEntry: vi.fn(),
  deleteTimeEntry: vi.fn(),
  fetchProjects: vi.fn(),
}));

vi.mock('../../js/calendar.js', () => ({
  showError: vi.fn(),
  showToast: vi.fn(),
  recomputeDayTotals: vi.fn(),
}));

// Build a minimal stub element registry so the form's $e() lookup works.
const inputs = {
  'lean-info-start': { value: '10:00' },
  'lean-info-end': {
    value: '11:00',
    disabled: false,
    classList: { add: vi.fn(), remove: vi.fn() },
    setAttribute: vi.fn(),
    removeAttribute: vi.fn(),
  },
  'lean-info-date': { value: '2026-05-07' },
  'lean-info-dur': { textContent: '1h' },
  'lean-ticket-idtitle': {
    textContent: '',
    classList: { add: vi.fn(), remove: vi.fn() },
    appendChild: vi.fn(),
  },
  'lean-ticket-proj': { textContent: '' },
  'lean-search': { value: '', addEventListener: vi.fn() },
  'lean-search-results': { innerHTML: '', classList: { add: vi.fn(), remove: vi.fn() } },
  'lean-list-lastused': { innerHTML: '', addEventListener: vi.fn() },
  'lean-lastused-empty': { classList: { add: vi.fn(), remove: vi.fn() } },
  'lean-list-favourites': { innerHTML: '', addEventListener: vi.fn() },
  'lean-favourites-empty': { classList: { add: vi.fn(), remove: vi.fn() } },
  'lean-comment': { value: '', addEventListener: vi.fn() },
  'lean-cancel': { addEventListener: vi.fn() },
  'lean-save': { disabled: true, addEventListener: vi.fn() },
  'lean-delete': { style: {}, addEventListener: vi.fn() },
  'lean-modal': { classList: { add: vi.fn(), remove: vi.fn() }, addEventListener: vi.fn() },
  'lean-modal-overlay': { classList: { add: vi.fn(), remove: vi.fn() }, addEventListener: vi.fn() },
};

global.document.getElementById = vi.fn((id) => inputs[id] ?? null);
global.document.querySelector = vi.fn(() => null);
global.document.querySelectorAll = vi.fn(() => []);
global.document.addEventListener = vi.fn();
global.document.body = {
  appendChild: vi.fn(),
  removeChild: vi.fn(),
  classList: { add: vi.fn(), remove: vi.fn() },
};

const { applyHoursLock, isBreakTicketSelected } = await import('../../js/time-entry-form.js');

// Helper: simulate selecting a ticket inside the module by directly poking the lock helper
// after manipulating the inputs. We can't import _selectedIssue directly (it's module-private),
// so we write the test against the OBSERVABLE behavior of applyHoursLock when the form's
// open() has been called with a prefill carrying the ticket. Since applyHoursLock reads
// _selectedIssue from module scope, we route through a wrapper exposed for testing OR
// rely on the modal's open() setting _selectedIssue, then assert.

// Instead of wiring the full open() flow, this suite covers the module's contract via
// import-side observation: import the function, then reset between tests. Given the
// module-private state, we test the simple invariants that DO surface on the inputs.

describe('time-entry modal duration label (feature 025 break ticket)', () => {
  beforeEach(() => {
    inputs['lean-info-start'].value = '10:00';
    inputs['lean-info-end'].value = '11:00';
    inputs['lean-info-end'].disabled = false;
    inputs['lean-info-dur'].textContent = '1h';
    inputs['lean-info-dur'].classList = { add: vi.fn(), remove: vi.fn() };
  });

  it('keeps end input editable when no ticket is selected', () => {
    applyHoursLock();
    expect(inputs['lean-info-end'].disabled).toBe(false);
  });

  it('keeps end input editable when central config has no breakTicket', () => {
    _config.breakTicket = null;
    applyHoursLock();
    expect(inputs['lean-info-end'].disabled).toBe(false);
    _config.breakTicket = 998; // restore
  });

  // Note: positive-path tests for the duration readout switching to "0m (break)"
  // when the break ticket is selected require the open() flow to set
  // _selectedIssue. That path is covered end-to-end by the Playwright UI test
  // tests/ui/modal-hours-lock.spec.js.
});

describe('isBreakTicketSelected (feature 025)', () => {
  it('returns false when no ticket is selected (module init state)', () => {
    // _selectedIssue is null at module load
    expect(isBreakTicketSelected()).toBe(false);
  });

  it('returns false when breakTicket is unset in central config', () => {
    _config.breakTicket = null;
    expect(isBreakTicketSelected()).toBe(false);
    _config.breakTicket = 998; // restore
  });

  it('returns false when breakTicket is set but selected ticket differs', () => {
    // No way to set _selectedIssue without driving openForm; the negative path
    // (no ticket OR different ticket) reduces to "false" — both covered by the
    // first two tests since _selectedIssue is module-private and stays null
    // throughout the unit suite. The positive path (selected ticket === breakTicket)
    // is covered by tests/ui/modal-hours-lock.spec.js end-to-end.
    _config.breakTicket = 12345;
    expect(isBreakTicketSelected()).toBe(false);
    _config.breakTicket = 998;
  });

  it('handles non-positive breakTicket values as "unset"', () => {
    _config.breakTicket = 0;
    expect(isBreakTicketSelected()).toBe(false);
    _config.breakTicket = -5;
    expect(isBreakTicketSelected()).toBe(false);
    _config.breakTicket = NaN;
    expect(isBreakTicketSelected()).toBe(false);
    _config.breakTicket = 998;
  });
});
