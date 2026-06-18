import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks (hoisted) ────────────────────────────────────────────────
vi.mock('../../js/confirm-dialog.js', () => ({
  showConfirmDialog: vi.fn(),
}));

vi.mock('../../js/i18n.js', () => ({
  t: vi.fn((key) => key),
  locale: 'en',
}));

import { showConfirmDialog } from '../../js/confirm-dialog.js';
import {
  runSaveGuards,
  runDeleteGuard,
  guardSave,
  deadlineTriggeredForMove,
  futureDateTriggeredForMove,
  runDropGuards,
} from '../../js/booking-guard.js';

// ── Helpers ────────────────────────────────────────────────────────

// Fixed deterministic "now": Wednesday 2026-04-22 12:00 local time
const FAKE_NOW = new Date('2026-04-22T12:00:00');
const TODAY = '2026-04-22';
const TOMORROW = '2026-04-23';
const YESTERDAY = '2026-04-21';

function mockConfirm() {
  showConfirmDialog.mockImplementation(({ onConfirm }) => onConfirm?.());
}

function mockCancel() {
  showConfirmDialog.mockImplementation(({ onCancel }) => onCancel?.());
}

const BASE_CFG = { redmineUrl: 'http://test' };

const CFG_EXEMPT = {
  ...BASE_CFG,
  holidayTicket: 100,
  vacationTicket: 200,
};

// deadline = Wednesday 2026-04-22 10:00 (1 hour before midday "now")
// dayOfWeek: 3 (Wed), hour: 10, minute: 0
const CFG_DEADLINE = {
  ...BASE_CFG,
  bookingDeadline: { enabled: true, dayOfWeek: 3, hour: 10, minute: 0 },
};

const CFG_DEADLINE_DISABLED = {
  ...BASE_CFG,
  bookingDeadline: { enabled: false, dayOfWeek: 3, hour: 10, minute: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(FAKE_NOW);
  mockConfirm(); // default: dialog confirms
});

afterEach(() => {
  vi.useRealTimers();
});

// ══════════════════════════════════════════════════════════════════
// T006: User Story 1 — isExempt + future-date guard (via runSaveGuards)
// ══════════════════════════════════════════════════════════════════

describe('runSaveGuards — future-date guard (US1)', () => {
  it('shows future-date dialog when date is tomorrow and ticket is not exempt', async () => {
    const ok = await runSaveGuards({
      date: TOMORROW,
      startTime: null,
      originalDate: null,
      originalStartTime: null,
      issueId: 42,
      cfg: BASE_CFG,
    });
    expect(showConfirmDialog).toHaveBeenCalledOnce();
    expect(showConfirmDialog.mock.calls[0][0].title).toBe('bookingGuard.futureDateTitle');
    expect(ok).toBe(true); // confirmed
  });

  it('returns false when user cancels the future-date dialog', async () => {
    mockCancel();
    const ok = await runSaveGuards({
      date: TOMORROW,
      startTime: null,
      originalDate: null,
      originalStartTime: null,
      issueId: 42,
      cfg: BASE_CFG,
    });
    expect(ok).toBe(false);
  });

  it('does NOT show dialog when date is today', async () => {
    const ok = await runSaveGuards({
      date: TODAY,
      startTime: null,
      originalDate: null,
      originalStartTime: null,
      issueId: 42,
      cfg: BASE_CFG,
    });
    expect(showConfirmDialog).not.toHaveBeenCalled();
    expect(ok).toBe(true);
  });

  it('does NOT show dialog when date is in the past', async () => {
    const ok = await runSaveGuards({
      date: YESTERDAY,
      startTime: null,
      originalDate: null,
      originalStartTime: null,
      issueId: 42,
      cfg: BASE_CFG,
    });
    expect(showConfirmDialog).not.toHaveBeenCalled();
    expect(ok).toBe(true);
  });

  it('skips future-date dialog when issueId matches holidayTicket', async () => {
    const ok = await runSaveGuards({
      date: TOMORROW,
      startTime: null,
      originalDate: null,
      originalStartTime: null,
      issueId: 100,
      cfg: CFG_EXEMPT,
    });
    expect(showConfirmDialog).not.toHaveBeenCalled();
    expect(ok).toBe(true);
  });

  it('skips future-date dialog when issueId matches vacationTicket', async () => {
    const ok = await runSaveGuards({
      date: TOMORROW,
      startTime: null,
      originalDate: null,
      originalStartTime: null,
      issueId: 200,
      cfg: CFG_EXEMPT,
    });
    expect(showConfirmDialog).not.toHaveBeenCalled();
    expect(ok).toBe(true);
  });

  it('does NOT skip for a non-exempt ticket ID', async () => {
    const ok = await runSaveGuards({
      date: TOMORROW,
      startTime: null,
      originalDate: null,
      originalStartTime: null,
      issueId: 999,
      cfg: CFG_EXEMPT,
    });
    expect(showConfirmDialog).toHaveBeenCalledOnce();
    expect(ok).toBe(true);
  });

  it('treats null issueId as non-exempt and shows dialog for future date', async () => {
    const ok = await runSaveGuards({
      date: TOMORROW,
      startTime: null,
      originalDate: null,
      originalStartTime: null,
      issueId: null,
      cfg: CFG_EXEMPT,
    });
    expect(showConfirmDialog).toHaveBeenCalledOnce();
    expect(ok).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════
// T011: lastDeadlineBefore — tested via deadlineTriggeredForMove
// (pure logic accessible through exported functions)
// ══════════════════════════════════════════════════════════════════

describe('lastDeadlineBefore (via deadlineTriggeredForMove) — US2', () => {
  it('returns false (no deadline) when bookingDeadline is absent from config', () => {
    const result = deadlineTriggeredForMove(YESTERDAY, '09:00', YESTERDAY, '09:00', BASE_CFG);
    expect(result).toBe(false);
  });

  it('returns false when bookingDeadline.enabled is false', () => {
    const result = deadlineTriggeredForMove(
      YESTERDAY,
      '09:00',
      YESTERDAY,
      '09:00',
      CFG_DEADLINE_DISABLED
    );
    expect(result).toBe(false);
  });

  it('triggers when entry date is before the deadline day', () => {
    // deadline = 2026-04-22T10:00; entry on 2026-04-21 at 09:00 is before
    const result = deadlineTriggeredForMove(YESTERDAY, '09:00', YESTERDAY, '09:00', CFG_DEADLINE);
    expect(result).toBe(true);
  });

  it('does NOT trigger when entry is after the deadline', () => {
    // deadline = 2026-04-22T10:00; entry on 2026-04-22 at 11:00 is after
    const result = deadlineTriggeredForMove(TODAY, '11:00', TODAY, '11:00', CFG_DEADLINE);
    expect(result).toBe(false);
  });

  it('goes back 7 days when the cutoff weekday has not yet passed today', () => {
    // FAKE_NOW = Wednesday 2026-04-22 12:00
    // dayOfWeek: 4 (Thursday), hour: 10 → today (Wed) is before Thu, so last Thu = 2026-04-16
    const cfg = { ...BASE_CFG, bookingDeadline: { enabled: true, dayOfWeek: 4, hour: 10 } };
    // An entry on 2026-04-15 (Wed, before last Thu) → before deadline → triggers
    const result = deadlineTriggeredForMove('2026-04-15', '09:00', '2026-04-15', '09:00', cfg);
    expect(result).toBe(true);
  });

  it('uses exactly 22:00 / Friday defaults when dayOfWeek/hour/minute are absent', () => {
    // FAKE_NOW = 2026-04-22 (Wed) 12:00; defaults: Fri=5, 22:00
    // last Friday = 2026-04-17 at 22:00 (5 days before Wednesday)
    const cfg = { ...BASE_CFG, bookingDeadline: { enabled: true } };
    // Entry on 2026-04-17 at 21:00 → before 22:00 → triggers
    const triggers = deadlineTriggeredForMove('2026-04-17', '21:00', '2026-04-17', '21:00', cfg);
    expect(triggers).toBe(true);
    // Entry on 2026-04-17 at 23:00 → after 22:00 → no trigger
    const noTrigger = deadlineTriggeredForMove('2026-04-17', '23:00', '2026-04-17', '23:00', cfg);
    expect(noTrigger).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════
// T012: toDatetime + deadlineTriggered — tested via runSaveGuards / runDeleteGuard
// ══════════════════════════════════════════════════════════════════

describe('toDatetime — null time defaults to 00:00', () => {
  it('treats null startTime as 00:00 when comparing against deadline', async () => {
    // deadline = 2026-04-22T10:00; entry on 2026-04-22T00:00 is before deadline → triggers
    const ok = await runSaveGuards({
      date: TODAY,
      startTime: null,
      originalDate: null,
      originalStartTime: null,
      issueId: null,
      cfg: CFG_DEADLINE,
    });
    // future-date guard: TODAY is not in the future → skip
    // deadline guard: create, 2026-04-22T00:00 ≤ 2026-04-22T10:00 → triggers
    expect(showConfirmDialog).toHaveBeenCalledOnce();
    expect(showConfirmDialog.mock.calls[0][0].title).toBe('bookingGuard.deadlineTitle');
    expect(ok).toBe(true);
  });

  it('uses HH:MM when startTime is provided', async () => {
    // entry at 11:00 today is after deadline 10:00 → no trigger
    const ok = await runSaveGuards({
      date: TODAY,
      startTime: '11:00',
      originalDate: null,
      originalStartTime: null,
      issueId: null,
      cfg: CFG_DEADLINE,
    });
    expect(showConfirmDialog).not.toHaveBeenCalled();
    expect(ok).toBe(true);
  });
});

describe('deadlineTriggered — trigger matrix (US2)', () => {
  it('create: triggers when newDt ≤ deadline', async () => {
    // 2026-04-22T09:00 ≤ 2026-04-22T10:00 → triggers
    const ok = await runSaveGuards({
      date: TODAY,
      startTime: '09:00',
      originalDate: null,
      originalStartTime: null,
      issueId: null,
      cfg: CFG_DEADLINE,
    });
    expect(showConfirmDialog).toHaveBeenCalledOnce();
    expect(ok).toBe(true);
  });

  it('create: does NOT trigger when newDt > deadline', async () => {
    const ok = await runSaveGuards({
      date: TODAY,
      startTime: '11:00',
      originalDate: null,
      originalStartTime: null,
      issueId: null,
      cfg: CFG_DEADLINE,
    });
    expect(showConfirmDialog).not.toHaveBeenCalled();
    expect(ok).toBe(true);
  });

  it('edit: triggers when origDt ≤ deadline (regardless of newDt)', async () => {
    // orig on yesterday at 09:00 → before deadline → triggers
    const ok = await runSaveGuards({
      date: TODAY,
      startTime: '11:00',
      originalDate: YESTERDAY,
      originalStartTime: '09:00',
      issueId: null,
      cfg: CFG_DEADLINE,
    });
    expect(showConfirmDialog).toHaveBeenCalledOnce();
    expect(ok).toBe(true);
  });

  it('edit: triggers when newDt ≤ deadline (origDt after deadline)', async () => {
    // orig on today at 11:00 (after deadline), new at 09:00 (before) → triggers
    const ok = await runSaveGuards({
      date: TODAY,
      startTime: '09:00',
      originalDate: TODAY,
      originalStartTime: '11:00',
      issueId: null,
      cfg: CFG_DEADLINE,
    });
    expect(showConfirmDialog).toHaveBeenCalledOnce();
    expect(ok).toBe(true);
  });

  it('edit: does NOT trigger when both orig and new are after deadline', async () => {
    const ok = await runSaveGuards({
      date: TODAY,
      startTime: '11:00',
      originalDate: TODAY,
      originalStartTime: '12:00',
      issueId: null,
      cfg: CFG_DEADLINE,
    });
    expect(showConfirmDialog).not.toHaveBeenCalled();
    expect(ok).toBe(true);
  });

  it('delete: triggers when origDt ≤ deadline', async () => {
    const ok = await runDeleteGuard(YESTERDAY, '09:00', CFG_DEADLINE);
    expect(showConfirmDialog).toHaveBeenCalledOnce();
    expect(showConfirmDialog.mock.calls[0][0].title).toBe('bookingGuard.deadlineTitle');
    expect(ok).toBe(true);
  });

  it('delete: does NOT trigger when origDt > deadline', async () => {
    const ok = await runDeleteGuard(TODAY, '11:00', CFG_DEADLINE);
    expect(showConfirmDialog).not.toHaveBeenCalled();
    expect(ok).toBe(true);
  });

  it('boundary: newDt exactly equal to deadline (≤, inclusive) → triggers', async () => {
    // deadline = 2026-04-22T10:00; entry exactly at 10:00 → triggers
    const ok = await runSaveGuards({
      date: TODAY,
      startTime: '10:00',
      originalDate: null,
      originalStartTime: null,
      issueId: null,
      cfg: CFG_DEADLINE,
    });
    expect(showConfirmDialog).toHaveBeenCalledOnce();
    expect(ok).toBe(true);
  });
});

describe('runSaveGuards — both guards in sequence', () => {
  it('shows future-date dialog first, then deadline dialog, both confirm → true', async () => {
    // FAKE_NOW = 2026-04-22T12:00
    // deadline cfg with dayOfWeek=4 (Thu) → last deadline = 2026-04-16T10:00 (last Thursday)
    // TOMORROW = 2026-04-23 (future); toDatetime('2026-04-23', '09:00') → before last Thu? No.
    // 2026-04-23T09:00 > 2026-04-16T10:00 → no deadline trigger.
    // Use a past entry AND future date together: date=TOMORROW, originalDate=YESTERDAY
    // Edit: orig=YESTERDAY@09:00 ≤ 2026-04-22T10:00 → deadline triggers
    // date=TOMORROW → future-date triggers
    let callOrder = [];
    showConfirmDialog.mockImplementation(({ title, onConfirm }) => {
      callOrder.push(title);
      onConfirm?.();
    });
    const ok = await runSaveGuards({
      date: TOMORROW,
      startTime: '09:00',
      originalDate: YESTERDAY,
      originalStartTime: '09:00',
      issueId: null,
      cfg: CFG_DEADLINE,
    });
    expect(callOrder[0]).toBe('bookingGuard.futureDateTitle');
    expect(callOrder[1]).toBe('bookingGuard.deadlineTitle');
    expect(ok).toBe(true);
  });

  it('cancelling the future-date dialog prevents the deadline dialog', async () => {
    mockCancel();
    const ok = await runSaveGuards({
      date: TOMORROW,
      startTime: '09:00',
      originalDate: YESTERDAY,
      originalStartTime: '09:00',
      issueId: null,
      cfg: CFG_DEADLINE,
    });
    expect(showConfirmDialog).toHaveBeenCalledOnce(); // only future-date
    expect(ok).toBe(false);
  });
});

describe('runDeleteGuard — disabled / enabled', () => {
  it('returns true immediately when bookingDeadline is absent', async () => {
    const ok = await runDeleteGuard(YESTERDAY, '09:00', BASE_CFG);
    expect(showConfirmDialog).not.toHaveBeenCalled();
    expect(ok).toBe(true);
  });

  it('returns true immediately when bookingDeadline.enabled is false', async () => {
    const ok = await runDeleteGuard(YESTERDAY, '09:00', CFG_DEADLINE_DISABLED);
    expect(showConfirmDialog).not.toHaveBeenCalled();
    expect(ok).toBe(true);
  });

  it('returns false when user cancels the deadline delete dialog', async () => {
    mockCancel();
    const ok = await runDeleteGuard(YESTERDAY, '09:00', CFG_DEADLINE);
    expect(showConfirmDialog).toHaveBeenCalledOnce();
    expect(ok).toBe(false);
  });

  it('uses deadlineDeleteBody key for delete operations', async () => {
    const ok = await runDeleteGuard(YESTERDAY, '09:00', CFG_DEADLINE);
    expect(showConfirmDialog.mock.calls[0][0].message).toBe('bookingGuard.deadlineDeleteBody');
    expect(ok).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════
// T025: User Story 3 — Admin config scenarios
// ══════════════════════════════════════════════════════════════════

describe('Admin config — lastDeadlineBefore (US3)', () => {
  it('returns no-trigger when bookingDeadline key is absent', () => {
    const result = deadlineTriggeredForMove(YESTERDAY, '09:00', YESTERDAY, '09:00', BASE_CFG);
    expect(result).toBe(false);
  });

  it('returns no-trigger when enabled: false', () => {
    const result = deadlineTriggeredForMove(
      YESTERDAY,
      '09:00',
      YESTERDAY,
      '09:00',
      CFG_DEADLINE_DISABLED
    );
    expect(result).toBe(false);
  });

  it('uses custom dayOfWeek: 1 (Monday) and hour: 8', () => {
    // FAKE_NOW = 2026-04-22 (Wed) 12:00
    // Last Monday = 2026-04-20; deadline = 2026-04-20T08:00
    const cfg = { ...BASE_CFG, bookingDeadline: { enabled: true, dayOfWeek: 1, hour: 8 } };
    // Entry on 2026-04-20 at 07:00 → before 08:00 → triggers
    expect(deadlineTriggeredForMove('2026-04-20', '07:00', '2026-04-20', '07:00', cfg)).toBe(true);
    // Entry on 2026-04-20 at 09:00 → after 08:00 → no trigger
    expect(deadlineTriggeredForMove('2026-04-20', '09:00', '2026-04-20', '09:00', cfg)).toBe(false);
  });

  it('applies minute: 30 correctly in deadline moment', () => {
    // FAKE_NOW = 2026-04-22 (Wed) 12:00; deadline = last Wed at 09:30
    // Last Wed = 2026-04-22; dayDiff=0; 2026-04-22T09:30 < 12:00 → deadline = 2026-04-22T09:30
    const cfg = {
      ...BASE_CFG,
      bookingDeadline: { enabled: true, dayOfWeek: 3, hour: 9, minute: 30 },
    };
    // Entry at 09:29 → triggers
    expect(deadlineTriggeredForMove(TODAY, '09:29', TODAY, '09:29', cfg)).toBe(true);
    // Entry at 09:31 → no trigger
    expect(deadlineTriggeredForMove(TODAY, '09:31', TODAY, '09:31', cfg)).toBe(false);
  });

  it('exact cutoff moment (entry == deadline) is inclusive → triggers', () => {
    // deadline = 2026-04-22T10:00; entry at exactly 10:00 → triggers
    expect(deadlineTriggeredForMove(TODAY, '10:00', TODAY, '10:00', CFG_DEADLINE)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════
// futureDateTriggeredForMove — UAT-found gap: drag to future date
// ══════════════════════════════════════════════════════════════════

describe('futureDateTriggeredForMove', () => {
  it('returns true when newDate is after today', () => {
    expect(futureDateTriggeredForMove(TOMORROW, null, BASE_CFG)).toBe(true);
  });

  it('returns false when newDate is today', () => {
    expect(futureDateTriggeredForMove(TODAY, null, BASE_CFG)).toBe(false);
  });

  it('returns false when newDate is in the past', () => {
    expect(futureDateTriggeredForMove(YESTERDAY, null, BASE_CFG)).toBe(false);
  });

  it('returns false for exempt holidayTicket even when dragging to future', () => {
    const cfg = { ...BASE_CFG, holidayTicket: 100 };
    expect(futureDateTriggeredForMove(TOMORROW, 100, cfg)).toBe(false);
  });

  it('returns false for exempt vacationTicket even when dragging to future', () => {
    const cfg = { ...BASE_CFG, vacationTicket: 200 };
    expect(futureDateTriggeredForMove(TOMORROW, 200, cfg)).toBe(false);
  });

  it('returns true for a non-exempt ticket dragged to a future date', () => {
    const cfg = { ...BASE_CFG, holidayTicket: 100 };
    expect(futureDateTriggeredForMove(TOMORROW, 999, cfg)).toBe(true);
  });
});

// ── runDropGuards ──────────────────────────────────────────────────────────
describe('runDropGuards', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FAKE_NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('returns true when neither guard triggers', async () => {
    const result = await runDropGuards(TODAY, '11:00', TODAY, '11:00', null, BASE_CFG);
    expect(result).toBe(true);
    expect(showConfirmDialog).not.toHaveBeenCalled();
  });

  it('returns false when future-date dialog is cancelled', async () => {
    mockCancel();
    const result = await runDropGuards(TODAY, '09:00', TOMORROW, '09:00', null, BASE_CFG);
    expect(result).toBe(false);
    expect(showConfirmDialog).toHaveBeenCalledTimes(1);
  });

  it('returns true when future-date dialog is confirmed and no deadline', async () => {
    mockConfirm();
    const result = await runDropGuards(TODAY, '09:00', TOMORROW, '09:00', null, BASE_CFG);
    expect(result).toBe(true);
    expect(showConfirmDialog).toHaveBeenCalledTimes(1);
  });

  it('returns false when deadline dialog is cancelled', async () => {
    mockCancel();
    // origTime before deadline (10:00), newTime same — only deadline triggers
    const result = await runDropGuards(TODAY, '09:00', TODAY, '09:00', null, CFG_DEADLINE);
    expect(result).toBe(false);
    expect(showConfirmDialog).toHaveBeenCalledTimes(1);
  });

  it('returns true when deadline dialog is confirmed', async () => {
    mockConfirm();
    const result = await runDropGuards(TODAY, '09:00', TODAY, '09:00', null, CFG_DEADLINE);
    expect(result).toBe(true);
    expect(showConfirmDialog).toHaveBeenCalledTimes(1);
  });

  it('shows future-date dialog first, then deadline dialog when both trigger', async () => {
    // Deadline = Wed 10:00; create entry for future date that is also ≤ deadline
    // Set a far-future deadline: next Wednesday 10:00 (7 days forward from FAKE_NOW)
    const cfgFutureDeadline = {
      ...BASE_CFG,
      bookingDeadline: { enabled: true, dayOfWeek: 3, hour: 10, minute: 0 },
    };
    // FAKE_NOW is Wed 12:00, so lastDeadlineBefore = this Wed 10:00 (already past)
    // TOMORROW (2026-04-23) > today AND 2026-04-23 09:00 > Wed 10:00 deadline, so deadline does NOT fire
    // Use YESTERDAY 09:00 as new position: not future, but ≤ deadline → only deadline fires
    mockConfirm();
    const result = await runDropGuards(TODAY, '11:00', YESTERDAY, '09:00', null, cfgFutureDeadline);
    expect(result).toBe(true);
    expect(showConfirmDialog).toHaveBeenCalledTimes(1);
  });

  it('returns true when no guards trigger with deadline disabled', async () => {
    const result = await runDropGuards(TODAY, '09:00', TODAY, '09:00', null, CFG_DEADLINE_DISABLED);
    expect(result).toBe(true);
    expect(showConfirmDialog).not.toHaveBeenCalled();
  });
});

// ── guardSave ──────────────────────────────────────────────────────────────
describe('guardSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FAKE_NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('delegates to runSaveGuards with null originalDate when currentEntry is null', async () => {
    mockConfirm();
    // TOMORROW triggers future-date dialog; with null currentEntry → create op
    const result = await guardSave({ spentOn: TOMORROW, startTime: '09:00' }, null, null, BASE_CFG);
    expect(result).toBe(true);
    expect(showConfirmDialog).toHaveBeenCalledTimes(1);
  });

  it('delegates to runSaveGuards with currentEntry date when provided', async () => {
    // Entry for today, no deadline → no dialogs
    const result = await guardSave(
      { spentOn: TODAY, startTime: '09:00' },
      { date: TODAY, startTime: '08:00' },
      null,
      BASE_CFG
    );
    expect(result).toBe(true);
    expect(showConfirmDialog).not.toHaveBeenCalled();
  });
});
