import { describe, it, expect } from 'vitest';
import { formatProject, mapTimeEntry } from '../../js/redmine-api.js';

describe('formatProject', () => {
  it('returns "ID — Name" when both available', () => {
    expect(formatProject('web-app', 'Web App')).toBe('web-app \u2014 Web App');
  });

  it('returns name only when identifier is null', () => {
    expect(formatProject(null, 'Web App')).toBe('Web App');
  });

  it('returns name only when identifier is empty', () => {
    expect(formatProject('', 'Web App')).toBe('Web App');
  });

  it('returns identifier only when name is null', () => {
    expect(formatProject('web-app', null)).toBe('web-app');
  });

  it('truncates identifier at 20 chars with ellipsis', () => {
    const longId = 'a-very-long-project-identifier-here';
    const result = formatProject(longId, 'Name');
    expect(result).toContain('\u2026');
    expect(result.split(' \u2014 ')[0].length).toBeLessThanOrEqual(21);
  });

  it('does not truncate identifier at exactly 20 chars', () => {
    const id20 = 'exactly-20-chars-zzz';
    expect(id20.length).toBe(20);
    const result = formatProject(id20, 'Name');
    expect(result).not.toContain('\u2026');
  });

  it('returns empty string when both null', () => {
    expect(formatProject(null, null)).toBe('');
  });
});

describe('mapTimeEntry projectIdentifier', () => {
  it('extracts projectIdentifier from project.identifier', () => {
    const raw = {
      id: 1, hours: 2, spent_on: '2026-04-25',
      project: { id: 1, name: 'Web App', identifier: 'web-app' },
      issue: { id: 42, subject: 'Test' },
    };
    const entry = mapTimeEntry(raw);
    expect(entry.projectIdentifier).toBe('web-app');
  });

  it('returns null when project has no identifier', () => {
    const raw = {
      id: 1, hours: 2, spent_on: '2026-04-25',
      project: { id: 1, name: 'Web App' },
    };
    const entry = mapTimeEntry(raw);
    expect(entry.projectIdentifier).toBeNull();
  });

  it('prefers issue.project.identifier over project.identifier', () => {
    const raw = {
      id: 1, hours: 2, spent_on: '2026-04-25',
      project: { id: 1, name: 'Web App', identifier: 'proj-a' },
      issue: { id: 42, subject: 'Test', project: { identifier: 'proj-b' } },
    };
    const entry = mapTimeEntry(raw);
    expect(entry.projectIdentifier).toBe('proj-b');
  });
});

describe('i18n project keys', () => {
  it('has all required project keys in English', async () => {
    const { t } = await import('../../js/i18n.js');
    expect(t('project.identifier_label')).not.toBe('project.identifier_label');
    expect(t('project.no_identifier')).not.toBe('project.no_identifier');
  });
});
