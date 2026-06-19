import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Minimal localStorage mock for Node environment
const _store = {};
const localStorageMock = {
  getItem: (k) => _store[k] ?? null,
  setItem: (k, v) => {
    _store[k] = String(v);
  },
  removeItem: (k) => {
    delete _store[k];
  },
  key: (i) => Object.keys(_store)[i] ?? null,
  get length() {
    return Object.keys(_store).length;
  },
  clear: () => {
    for (const k of Object.keys(_store)) delete _store[k];
  },
};

// Expose localStorage globally before importing the module under test
globalThis.localStorage = localStorageMock;

const {
  hasPlanningAiConsent,
  recordPlanningAiConsent,
  withdrawPlanningAiConsent,
  getPlanningAiConsentRecord,
  deletePlanningData,
  listPlanningData,
  runRetentionCleanup,
} = await import('../../js/privacy-store.js');

const AI_CONSENT_KEY = 'redmine_calendar_ai_consent';
const SNAPSHOT_PREFIX = 'redmine_calendar_planning_snapshot_';

beforeEach(() => {
  localStorageMock.clear();
});

afterEach(() => {
  localStorageMock.clear();
});

describe('hasPlanningAiConsent', () => {
  it('returns false when key is absent', () => {
    expect(hasPlanningAiConsent()).toBe(false);
  });

  it('returns false when consentedAt is null', () => {
    localStorage.setItem(AI_CONSENT_KEY, JSON.stringify({ consentedAt: null, withdrawnAt: null }));
    expect(hasPlanningAiConsent()).toBe(false);
  });

  it('returns true when consentedAt is set and withdrawnAt is null', () => {
    localStorage.setItem(
      AI_CONSENT_KEY,
      JSON.stringify({ consentedAt: '2026-06-01T10:00:00.000Z', withdrawnAt: null })
    );
    expect(hasPlanningAiConsent()).toBe(true);
  });

  it('returns true when withdrawnAt < consentedAt (re-consented after withdrawal)', () => {
    localStorage.setItem(
      AI_CONSENT_KEY,
      JSON.stringify({
        consentedAt: '2026-06-05T10:00:00.000Z',
        withdrawnAt: '2026-06-02T10:00:00.000Z',
      })
    );
    expect(hasPlanningAiConsent()).toBe(true);
  });

  it('returns false when withdrawnAt >= consentedAt (consent withdrawn)', () => {
    localStorage.setItem(
      AI_CONSENT_KEY,
      JSON.stringify({
        consentedAt: '2026-06-01T10:00:00.000Z',
        withdrawnAt: '2026-06-10T10:00:00.000Z',
      })
    );
    expect(hasPlanningAiConsent()).toBe(false);
  });

  it('returns false when stored JSON is malformed', () => {
    localStorage.setItem(AI_CONSENT_KEY, 'not-json');
    expect(hasPlanningAiConsent()).toBe(false);
  });
});

describe('recordPlanningAiConsent', () => {
  it('creates a record with consentedAt set and withdrawnAt null', () => {
    recordPlanningAiConsent();
    const raw = localStorage.getItem(AI_CONSENT_KEY);
    expect(raw).not.toBeNull();
    const record = JSON.parse(raw);
    expect(record.consentedAt).toBeTruthy();
    expect(record.withdrawnAt).toBeNull();
  });

  it('overwrites an existing record on re-consent', () => {
    localStorage.setItem(
      AI_CONSENT_KEY,
      JSON.stringify({ consentedAt: '2026-01-01T00:00:00.000Z', withdrawnAt: null })
    );
    recordPlanningAiConsent();
    const record = JSON.parse(localStorage.getItem(AI_CONSENT_KEY));
    expect(record.consentedAt).not.toBe('2026-01-01T00:00:00.000Z');
    expect(record.withdrawnAt).toBeNull();
  });

  it('makes hasPlanningAiConsent return true', () => {
    recordPlanningAiConsent();
    expect(hasPlanningAiConsent()).toBe(true);
  });
});

describe('withdrawPlanningAiConsent', () => {
  it('sets withdrawnAt to a timestamp >= consentedAt', () => {
    recordPlanningAiConsent();
    withdrawPlanningAiConsent();
    const record = JSON.parse(localStorage.getItem(AI_CONSENT_KEY));
    expect(record.withdrawnAt).toBeTruthy();
    expect(new Date(record.withdrawnAt) >= new Date(record.consentedAt)).toBe(true);
  });

  it('makes hasPlanningAiConsent return false after withdrawal', () => {
    recordPlanningAiConsent();
    withdrawPlanningAiConsent();
    expect(hasPlanningAiConsent()).toBe(false);
  });

  it('is a no-op (does not throw) when no record exists', () => {
    expect(() => withdrawPlanningAiConsent()).not.toThrow();
  });
});

describe('getPlanningAiConsentRecord', () => {
  it('returns null when key is absent', () => {
    expect(getPlanningAiConsentRecord()).toBeNull();
  });

  it('returns the parsed record', () => {
    const record = { consentedAt: '2026-06-01T10:00:00.000Z', withdrawnAt: null };
    localStorage.setItem(AI_CONSENT_KEY, JSON.stringify(record));
    expect(getPlanningAiConsentRecord()).toEqual(record);
  });

  it('returns null on malformed JSON', () => {
    localStorage.setItem(AI_CONSENT_KEY, 'bad');
    expect(getPlanningAiConsentRecord()).toBeNull();
  });
});

describe('deletePlanningData', () => {
  it('removes the consent key', () => {
    recordPlanningAiConsent();
    deletePlanningData();
    expect(localStorage.getItem(AI_CONSENT_KEY)).toBeNull();
  });

  it('removes planning snapshot keys', () => {
    localStorage.setItem(
      `${SNAPSHOT_PREFIX}day_2026-06-01`,
      JSON.stringify({ _writtenAt: '2026-06-01T00:00:00.000Z' })
    );
    localStorage.setItem(
      `${SNAPSHOT_PREFIX}day_2026-06-02`,
      JSON.stringify({ _writtenAt: '2026-06-02T00:00:00.000Z' })
    );
    const result = deletePlanningData();
    expect(localStorage.getItem(`${SNAPSHOT_PREFIX}day_2026-06-01`)).toBeNull();
    expect(localStorage.getItem(`${SNAPSHOT_PREFIX}day_2026-06-02`)).toBeNull();
    expect(result.removed.length).toBeGreaterThanOrEqual(2);
    expect(result.errors).toEqual([]);
  });

  it('removes planning preference flags', () => {
    localStorage.setItem('redmine_calendar_planning_source_outlook', '1');
    localStorage.setItem('redmine_calendar_planning_source_teams', '0');
    localStorage.setItem('redmine_calendar_active_view', 'planning');
    deletePlanningData();
    expect(localStorage.getItem('redmine_calendar_planning_source_outlook')).toBeNull();
    expect(localStorage.getItem('redmine_calendar_planning_source_teams')).toBeNull();
    expect(localStorage.getItem('redmine_calendar_active_view')).toBeNull();
  });

  it('does not remove non-planning keys', () => {
    localStorage.setItem('redmine_calendar_credentials', 'secret');
    localStorage.setItem('redmine_calendar_view_mode', 'working');
    deletePlanningData();
    expect(localStorage.getItem('redmine_calendar_credentials')).toBe('secret');
    expect(localStorage.getItem('redmine_calendar_view_mode')).toBe('working');
  });

  it('returns empty removed list and no errors when nothing to delete', () => {
    const result = deletePlanningData();
    expect(result.errors).toEqual([]);
    expect(result.removed).toEqual([]);
  });
});

describe('listPlanningData', () => {
  it('returns an empty object when no planning keys exist', () => {
    localStorage.setItem('redmine_calendar_credentials', 'unrelated');
    expect(listPlanningData()).toEqual({});
  });

  it('includes the consent key when present', () => {
    recordPlanningAiConsent();
    const data = listPlanningData();
    expect(data[AI_CONSENT_KEY]).toBeTruthy();
  });

  it('includes planning snapshot keys', () => {
    const payload = { _writtenAt: '2026-06-01T00:00:00.000Z', data: 'x' };
    localStorage.setItem(`${SNAPSHOT_PREFIX}foo`, JSON.stringify(payload));
    const data = listPlanningData();
    expect(data[`${SNAPSHOT_PREFIX}foo`]).toEqual(payload);
  });

  it('includes planning preference flags', () => {
    localStorage.setItem('redmine_calendar_planning_source_outlook', '1');
    const data = listPlanningData();
    // '1' is valid JSON that parses to the number 1
    expect(data['redmine_calendar_planning_source_outlook']).toBe(1);
  });
});

describe('deletePlanningData error branch', () => {
  it('adds key to errors when removeItem throws', () => {
    localStorage.setItem(AI_CONSENT_KEY, '{}');
    const origRemoveItem = localStorage.removeItem.bind(localStorage);
    localStorage.removeItem = (k) => {
      if (k === AI_CONSENT_KEY) throw new Error('storage full');
      origRemoveItem(k);
    };
    const result = deletePlanningData();
    expect(result.errors).toContain(AI_CONSENT_KEY);
    localStorage.removeItem = origRemoveItem;
  });
});

describe('listPlanningData JSON fallback', () => {
  it('returns raw string when value is not valid JSON', () => {
    // Planning preference flags like '1' are valid JSON (number)
    // but non-json-parseable strings fall back to raw string.
    // Directly set a planning snapshot key with a non-JSON string.
    localStorage.setItem(`${SNAPSHOT_PREFIX}malformed`, 'not-json-value');
    const data = listPlanningData();
    expect(data[`${SNAPSHOT_PREFIX}malformed`]).toBe('not-json-value');
  });
});

describe('runRetentionCleanup', () => {
  it('removes snapshot keys older than retentionDays', () => {
    const old = new Date(Date.now() - 31 * 86400000).toISOString();
    localStorage.setItem(`${SNAPSHOT_PREFIX}old`, JSON.stringify({ _writtenAt: old }));
    const result = runRetentionCleanup(30);
    expect(result.removed).toContain(`${SNAPSHOT_PREFIX}old`);
    expect(localStorage.getItem(`${SNAPSHOT_PREFIX}old`)).toBeNull();
    expect(result.error).toBeNull();
  });

  it('keeps snapshot keys within the retention window', () => {
    const recent = new Date(Date.now() - 5 * 86400000).toISOString();
    localStorage.setItem(`${SNAPSHOT_PREFIX}new`, JSON.stringify({ _writtenAt: recent }));
    const result = runRetentionCleanup(30);
    expect(result.removed).not.toContain(`${SNAPSHOT_PREFIX}new`);
    expect(localStorage.getItem(`${SNAPSHOT_PREFIX}new`)).not.toBeNull();
  });

  it('skips keys with missing _writtenAt gracefully', () => {
    localStorage.setItem(`${SNAPSHOT_PREFIX}nodate`, JSON.stringify({ data: 'x' }));
    const result = runRetentionCleanup(30);
    expect(result.removed).not.toContain(`${SNAPSHOT_PREFIX}nodate`);
    expect(result.error).toBeNull();
  });

  it('skips keys with malformed _writtenAt gracefully', () => {
    localStorage.setItem(`${SNAPSHOT_PREFIX}bad`, JSON.stringify({ _writtenAt: 'not-a-date' }));
    const result = runRetentionCleanup(30);
    expect(result.removed).not.toContain(`${SNAPSHOT_PREFIX}bad`);
    expect(result.error).toBeNull();
  });

  it('does not touch non-snapshot keys', () => {
    localStorage.setItem('redmine_calendar_credentials', 'safe');
    runRetentionCleanup(30);
    expect(localStorage.getItem('redmine_calendar_credentials')).toBe('safe');
  });

  it('returns error when outer try throws (localStorage.length throws)', () => {
    const origDescriptor = Object.getOwnPropertyDescriptor(localStorageMock, 'length');
    Object.defineProperty(localStorageMock, 'length', {
      get() {
        throw new Error('storage unavailable');
      },
      configurable: true,
    });
    const result = runRetentionCleanup(30);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe('storage unavailable');
    Object.defineProperty(localStorageMock, 'length', origDescriptor);
  });
});
