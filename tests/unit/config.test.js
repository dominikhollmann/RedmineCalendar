import { describe, it, expect } from 'vitest';
import { SLOT_DURATION, SNAP_DURATION, STORAGE_KEY_WORKING_HOURS,
         STORAGE_KEY_VIEW_MODE, STORAGE_KEY_DAY_RANGE,
         STORAGE_KEY_FAVOURITES, STORAGE_KEY_LAST_USED,
         AI_MAX_TOKENS } from '../../js/config.js';

describe('config.js constants', () => {
  it('exports SLOT_DURATION as 15-minute interval', () => {
    expect(SLOT_DURATION).toBe('00:15:00');
  });

  it('exports SNAP_DURATION as 15-minute interval', () => {
    expect(SNAP_DURATION).toBe('00:15:00');
  });

  it('exports all localStorage key constants', () => {
    expect(STORAGE_KEY_WORKING_HOURS).toBe('redmine_calendar_working_hours');
    expect(STORAGE_KEY_VIEW_MODE).toBe('redmine_calendar_view_mode');
    expect(STORAGE_KEY_DAY_RANGE).toBe('redmine_calendar_day_range');
    expect(STORAGE_KEY_FAVOURITES).toBe('redmine_calendar_favourites');
    expect(STORAGE_KEY_LAST_USED).toBe('redmine_calendar_last_used');
  });

  it('exports AI_MAX_TOKENS', () => {
    expect(AI_MAX_TOKENS).toBe(1024);
  });
});
