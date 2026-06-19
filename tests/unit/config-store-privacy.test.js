// Tests for the privacy-related accessors added to config-store.js (feature 044).
// These are synchronous getters that read from the in-memory _centralConfig cache.
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock crypto and i18n to avoid IndexedDB / browser dependencies.
vi.mock('../../js/crypto.js', () => ({
  encrypt: vi.fn(),
  decrypt: vi.fn(),
}));
vi.mock('../../js/i18n.js', () => ({
  t: vi.fn((k) => k),
  locale: 'en',
  formatDate: vi.fn((d) => d),
}));

const {
  loadCentralConfig,
  resetCentralConfigCache,
  getPrivacyControllerName,
  getPrivacyControllerEmail,
  getPrivacyDpoEmail,
  getPlanningDataRetentionDays,
} = await import('../../js/config-store.js');

const BASE_CONFIG = {
  redmineUrl: 'http://example.com',
  privacyControllerName: 'ACME GmbH',
  privacyControllerEmail: 'privacy@acme.example',
  privacyDpoEmail: 'dpo@acme.example',
  planningDataRetentionDays: 90,
};

async function loadConfig(cfg) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => cfg,
  });
  await loadCentralConfig();
}

beforeEach(() => {
  resetCentralConfigCache();
});

describe('getPrivacyControllerName', () => {
  it('returns config value when set', async () => {
    await loadConfig(BASE_CONFIG);
    expect(getPrivacyControllerName()).toBe('ACME GmbH');
  });

  it('returns placeholder when config not yet loaded', () => {
    expect(getPrivacyControllerName()).toContain('[Controller name');
  });

  it('returns placeholder when field is absent from config', async () => {
    await loadConfig({ redmineUrl: 'http://x.example' });
    expect(getPrivacyControllerName()).toContain('[Controller name');
  });
});

describe('getPrivacyControllerEmail', () => {
  it('returns config value when set', async () => {
    await loadConfig(BASE_CONFIG);
    expect(getPrivacyControllerEmail()).toBe('privacy@acme.example');
  });

  it('returns placeholder when field is absent', async () => {
    await loadConfig({ redmineUrl: 'http://x.example' });
    expect(getPrivacyControllerEmail()).toContain('[Controller email');
  });
});

describe('getPrivacyDpoEmail', () => {
  it('returns config value when set', async () => {
    await loadConfig(BASE_CONFIG);
    expect(getPrivacyDpoEmail()).toBe('dpo@acme.example');
  });

  it('returns placeholder when field is absent', async () => {
    await loadConfig({ redmineUrl: 'http://x.example' });
    expect(getPrivacyDpoEmail()).toContain('[DPO email');
  });
});

describe('getPlanningDataRetentionDays', () => {
  it('returns config value when set to a positive number', async () => {
    await loadConfig(BASE_CONFIG);
    expect(getPlanningDataRetentionDays()).toBe(90);
  });

  it('returns 30 when field is absent', async () => {
    await loadConfig({ redmineUrl: 'http://x.example' });
    expect(getPlanningDataRetentionDays()).toBe(30);
  });

  it('returns 30 when field is 0 (invalid)', async () => {
    await loadConfig({ redmineUrl: 'http://x.example', planningDataRetentionDays: 0 });
    expect(getPlanningDataRetentionDays()).toBe(30);
  });

  it('returns 30 when field is negative', async () => {
    await loadConfig({ redmineUrl: 'http://x.example', planningDataRetentionDays: -5 });
    expect(getPlanningDataRetentionDays()).toBe(30);
  });

  it('returns 30 when field is non-numeric', async () => {
    await loadConfig({ redmineUrl: 'http://x.example', planningDataRetentionDays: 'many' });
    expect(getPlanningDataRetentionDays()).toBe(30);
  });
});
