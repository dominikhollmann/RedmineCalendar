import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────

vi.mock('../../js/i18n.js', () => ({ t: vi.fn((k, vars) => `${k}:${JSON.stringify(vars)}`) }));
vi.mock('../../js/entry-selection.js', () => ({ deselectAll: vi.fn() }));

// DOM stubs for the clipboard banner elements
const _bannerEl = { classList: { remove: vi.fn(), add: vi.fn() } };
const _bannerText = { textContent: '' };
const _clearBtn = { addEventListener: vi.fn() };

global.document = {
  getElementById: vi.fn((id) => {
    if (id === 'clipboard-banner') return _bannerEl;
    if (id === 'clipboard-banner-text') return _bannerText;
    if (id === 'clipboard-banner-clear') return _clearBtn;
    return null;
  }),
};

import { deselectAll } from '../../js/entry-selection.js';
import { copyToClipboard, clearClipboard, getClipboard } from '../../js/clipboard.js';

// ── Helpers ───────────────────────────────────────────────────────

function makeEntry(overrides = {}) {
  return {
    issueId: 42,
    issueSubject: 'Fix something',
    projectName: 'Project A',
    activityId: 7,
    hours: 1.5,
    comment: 'done',
    startTime: '09:00',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  _bannerText.textContent = '';
  clearClipboard(); // reset module state
});

// ── getClipboard ──────────────────────────────────────────────────

describe('clipboard: getClipboard', () => {
  it('returns null initially', () => {
    expect(getClipboard()).toBeNull();
  });

  it('returns the copied entry after copyToClipboard', () => {
    const entry = makeEntry();
    copyToClipboard(entry);
    expect(getClipboard()).toMatchObject({ issueId: 42, hours: 1.5 });
  });

  it('returns null after clearClipboard', () => {
    copyToClipboard(makeEntry());
    clearClipboard();
    expect(getClipboard()).toBeNull();
  });
});

// ── copyToClipboard ───────────────────────────────────────────────

describe('clipboard: copyToClipboard', () => {
  it('stores the expected fields from the entry', () => {
    const entry = makeEntry();
    copyToClipboard(entry);
    const clip = getClipboard();
    expect(clip).toEqual({
      issueId: 42,
      issueSubject: 'Fix something',
      projectName: 'Project A',
      activityId: 7,
      hours: 1.5,
      comment: 'done',
      startTime: '09:00',
    });
  });

  it('calls deselectAll', () => {
    copyToClipboard(makeEntry());
    expect(deselectAll).toHaveBeenCalled();
  });

  it('removes hidden class from banner', () => {
    copyToClipboard(makeEntry());
    expect(_bannerEl.classList.remove).toHaveBeenCalledWith('hidden');
  });

  it('sets banner text via i18n key', () => {
    copyToClipboard(makeEntry());
    expect(_bannerText.textContent).toContain('calendar.clipboard_banner');
  });

  it('falls back to empty string when issueSubject is null', () => {
    copyToClipboard(makeEntry({ issueSubject: null }));
    expect(_bannerText.textContent).toContain('""');
  });
});

// ── clearClipboard ────────────────────────────────────────────────

describe('clipboard: clearClipboard', () => {
  it('adds hidden class to banner', () => {
    clearClipboard();
    expect(_bannerEl.classList.add).toHaveBeenCalledWith('hidden');
  });

  it('is safe to call when clipboard is already empty', () => {
    expect(() => clearClipboard()).not.toThrow();
    expect(getClipboard()).toBeNull();
  });
});
