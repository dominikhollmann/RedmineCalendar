import { describe, it, expect } from 'vitest';
import { timeToMins } from '../../js/time-utils.js';

describe('timeToMins', () => {
  it('converts HH:MM to minutes since midnight', () => {
    expect(timeToMins('09:30')).toBe(570);
  });
  it('handles midnight', () => {
    expect(timeToMins('00:00')).toBe(0);
  });
  it('handles end-of-day', () => {
    expect(timeToMins('23:59')).toBe(1439);
  });
  it('handles noon', () => {
    expect(timeToMins('12:00')).toBe(720);
  });
});
