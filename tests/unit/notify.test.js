// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { showToast } from '../../js/notify.js';

describe('showToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="toast" class="hidden"></div>';
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('renders a plain-text message and un-hides the toast', () => {
    showToast('Saved');
    const toast = document.getElementById('toast');
    expect(toast.textContent).toBe('Saved');
    expect(toast.classList.contains('hidden')).toBe(false);
  });

  it('auto-hides after the timeout', () => {
    showToast('Saved');
    const toast = document.getElementById('toast');
    expect(toast.classList.contains('hidden')).toBe(false);
    vi.advanceTimersByTime(3000);
    expect(toast.classList.contains('hidden')).toBe(true);
  });

  it('renders a clickable link when href is provided', () => {
    showToast('Ticket created', { href: 'https://redmine.example.com/issues/42' });
    const toast = document.getElementById('toast');
    const link = toast.querySelector('a');
    expect(link).not.toBeNull();
    expect(link.href).toBe('https://redmine.example.com/issues/42');
    expect(link.textContent).toBe('Ticket created');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
  });

  it('does not interpret the message as HTML (no injection)', () => {
    showToast('<img src=x onerror=alert(1)>', { href: 'https://example.com/' });
    const toast = document.getElementById('toast');
    expect(toast.querySelector('img')).toBeNull();
    expect(toast.querySelector('a').textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('replaces a previous link on a subsequent plain-text call', () => {
    showToast('Ticket created', { href: 'https://example.com/issues/1' });
    showToast('Saved');
    const toast = document.getElementById('toast');
    expect(toast.querySelector('a')).toBeNull();
    expect(toast.textContent).toBe('Saved');
  });

  it('returns silently when the #toast element is absent', () => {
    document.body.innerHTML = '';
    expect(() => showToast('nothing')).not.toThrow();
  });
});
