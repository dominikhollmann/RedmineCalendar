import { describe, it, expect } from 'vitest';
import { resolveConfigTicket } from '../../js/config-store.js';

describe('resolveConfigTicket', () => {
  it('returns the positive integer ticket id from config', () => {
    expect(resolveConfigTicket({ breakTicket: 42 }, 'breakTicket')).toBe(42);
  });

  it('returns null when the field is absent or the config is nullish', () => {
    expect(resolveConfigTicket({}, 'breakTicket')).toBeNull();
    expect(resolveConfigTicket(null, 'breakTicket')).toBeNull();
    expect(resolveConfigTicket(undefined, 'breakTicket')).toBeNull();
  });

  it('returns null for non-positive or non-finite values', () => {
    expect(resolveConfigTicket({ x: 0 }, 'x')).toBeNull();
    expect(resolveConfigTicket({ x: -3 }, 'x')).toBeNull();
    expect(resolveConfigTicket({ x: 'foo' }, 'x')).toBeNull();
    expect(resolveConfigTicket({ x: NaN }, 'x')).toBeNull();
  });
});
