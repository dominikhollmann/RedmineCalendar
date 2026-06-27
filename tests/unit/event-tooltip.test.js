import { describe, it, expect } from 'vitest';
import { buildEventTooltipText } from '../../js/event-tooltip.js';

// Injected translator — mirrors the i18n fallback_subject template so the test
// is deterministic without importing the real i18n module.
const t = (key, vars) => (key === 'entry.fallback_subject' ? `Issue #${vars?.id ?? ''}` : key);

describe('buildEventTooltipText', () => {
  it('builds all four lines in order when every field is present', () => {
    const lines = buildEventTooltipText(
      {
        issueId: 123,
        issueSubject: 'Fix login',
        projectIdentifier: 'acme',
        projectName: 'ACME Web',
        startTime: '09:00',
        endTime: '09:30',
        durationHours: 0.5,
        comment: 'pairing w/ Sam',
      },
      t
    );
    expect(lines).toEqual([
      '#123 Fix login',
      'acme — ACME Web',
      '09:00 – 09:30 (30m)',
      'pairing w/ Sam',
    ]);
  });

  it('index 0 is always the issue line and is never empty', () => {
    const lines = buildEventTooltipText({ issueId: 7, issueSubject: 'Thing' }, t);
    expect(lines[0]).toBe('#7 Thing');
  });

  it('uses the localized fallback when the subject is null', () => {
    const lines = buildEventTooltipText({ issueId: 42, issueSubject: null }, t);
    expect(lines[0]).toBe('Issue #42');
  });

  it('omits the project line when no project data is present', () => {
    const lines = buildEventTooltipText(
      { issueId: 1, issueSubject: 'S', startTime: '08:00', endTime: '09:00', durationHours: 1 },
      t
    );
    expect(lines).toEqual(['#1 S', '08:00 – 09:00 (1h)']);
  });

  it('omits the time line when start or end is missing', () => {
    const lines = buildEventTooltipText(
      { issueId: 1, issueSubject: 'S', startTime: '08:00', endTime: null },
      t
    );
    expect(lines).toEqual(['#1 S']);
  });

  it('omits the comment line when comment is absent or empty', () => {
    const withEmpty = buildEventTooltipText({ issueId: 1, issueSubject: 'S', comment: '' }, t);
    expect(withEmpty).toEqual(['#1 S']);
    const withNull = buildEventTooltipText({ issueId: 1, issueSubject: 'S', comment: null }, t);
    expect(withNull).toEqual(['#1 S']);
  });

  it('derives the duration from start/end when durationHours is not supplied', () => {
    const lines = buildEventTooltipText(
      { issueId: 1, issueSubject: 'S', startTime: '09:00', endTime: '10:30' },
      t
    );
    expect(lines[1]).toBe('09:00 – 10:30 (1h 30m)');
  });

  it('drops the # prefix when there is a subject but no issue id (planning meeting)', () => {
    const lines = buildEventTooltipText({ issueId: null, issueSubject: 'Daily Standup' }, t);
    expect(lines[0]).toBe('Daily Standup');
  });

  it('returns no empty strings (every present line carries content)', () => {
    const lines = buildEventTooltipText(
      { issueId: 1, issueSubject: 'S', projectName: 'P', comment: 'c' },
      t
    );
    expect(lines.every((l) => l.length > 0)).toBe(true);
  });

  it('is deterministic and side-effect-free for the same input', () => {
    const fields = { issueId: 1, issueSubject: 'S', projectName: 'P' };
    expect(buildEventTooltipText(fields, t)).toEqual(buildEventTooltipText(fields, t));
    expect(fields).toEqual({ issueId: 1, issueSubject: 'S', projectName: 'P' });
  });
});
