import { describe, it, expect } from 'vitest';
import { t, formatDate } from '../../js/i18n.js';

describe('t() translation', () => {
  it('returns English translation for known key', () => {
    expect(t('modal.save_btn')).toBe('Save');
  });

  it('substitutes {{placeholder}} variables', () => {
    const result = t('error.unexpected', { status: '500' });
    expect(result).toContain('500');
  });

  it('returns key itself for unknown keys', () => {
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('preserves unreplaced placeholders', () => {
    const result = t('error.unexpected');
    expect(result).toContain('{{status}}');
  });
});

describe('validation error keys exist', () => {
  it('has ticket_required key', () => {
    expect(t('modal.ticket_required')).not.toBe('modal.ticket_required');
  });

  it('has date_required key', () => {
    expect(t('modal.date_required')).not.toBe('modal.date_required');
  });

  it('has start_required key', () => {
    expect(t('modal.start_required')).not.toBe('modal.start_required');
  });

  it('has end_required key', () => {
    expect(t('modal.end_required')).not.toBe('modal.end_required');
  });

  it('has comment_placeholder key', () => {
    expect(t('modal.comment_placeholder')).not.toBe('modal.comment_placeholder');
  });

  it('has chatbot tool keys', () => {
    expect(t('chatbot.no_entries_found')).not.toBe('chatbot.no_entries_found');
    expect(t('chatbot.multiple_matches')).not.toBe('chatbot.multiple_matches');
    expect(t('chatbot.retry_btn')).not.toBe('chatbot.retry_btn');
  });

  it('has version label', () => {
    expect(t('version.label')).toBe('Version');
  });
});

describe('formatDate()', () => {
  it('formats YYYY-MM-DD as-is for en locale', () => {
    expect(formatDate('2026-04-18')).toBe('2026-04-18');
  });

  it('returns input on invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});
