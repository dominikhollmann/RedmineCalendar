// Pure-logic privacy / DSGVO module: consent record management, planning data
// deletion, Art. 15 data listing, and startup retention cleanup for planning
// snapshots. No DOM access; safe to import in Node test environments.

import {
  STORAGE_KEY_AI_CONSENT,
  STORAGE_KEY_PLANNING_SNAPSHOT_PREFIX,
  STORAGE_KEY_PLANNING_SOURCE_OUTLOOK,
  STORAGE_KEY_PLANNING_SOURCE_TEAMS,
  STORAGE_KEY_ACTIVE_VIEW,
} from './config.js';

/**
 * @typedef {{ consentedAt: string | null, withdrawnAt: string | null }} ConsentRecord
 */

/**
 * @typedef {{ removed: string[], errors: string[] }} DeletionResult
 */

/**
 * @typedef {{ removed: string[], error: Error | null }} RetentionResult
 */

const PLANNING_PREF_KEYS = [
  STORAGE_KEY_PLANNING_SOURCE_OUTLOOK,
  STORAGE_KEY_PLANNING_SOURCE_TEAMS,
  STORAGE_KEY_ACTIVE_VIEW,
];

/**
 * Parse the stored ConsentRecord. Returns `null` on missing key or parse error.
 * @returns {ConsentRecord | null}
 */
function _readRecord() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AI_CONSENT);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Returns `true` when the user has an active AI planning consent.
 * Active = `consentedAt` is set AND (`withdrawnAt` is null OR `withdrawnAt < consentedAt`).
 * @returns {boolean}
 */
export function hasPlanningAiConsent() {
  const record = _readRecord();
  if (!record || !record.consentedAt) return false;
  if (!record.withdrawnAt) return true;
  return new Date(record.withdrawnAt) < new Date(record.consentedAt);
}

/**
 * Write (or overwrite) the ConsentRecord — sets `consentedAt` to now, clears `withdrawnAt`.
 * @returns {void}
 */
export function recordPlanningAiConsent() {
  const record = { consentedAt: new Date().toISOString(), withdrawnAt: null };
  localStorage.setItem(STORAGE_KEY_AI_CONSENT, JSON.stringify(record));
}

/**
 * Set `withdrawnAt` on the existing ConsentRecord. No-op when no record exists.
 * @returns {void}
 */
export function withdrawPlanningAiConsent() {
  const record = _readRecord();
  if (!record) return;
  record.withdrawnAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY_AI_CONSENT, JSON.stringify(record));
}

/**
 * Return the raw ConsentRecord from localStorage, or `null` if absent / malformed.
 * @returns {ConsentRecord | null}
 */
export function getPlanningAiConsentRecord() {
  return _readRecord();
}

/**
 * Enumerate all localStorage keys that are in scope for planning data deletion:
 * the consent record, any planning snapshot keys, and the three planning
 * preference flags.
 * @returns {string[]}
 */
function _planningKeys() {
  const keys = [];
  if (localStorage.getItem(STORAGE_KEY_AI_CONSENT) !== null) {
    keys.push(STORAGE_KEY_AI_CONSENT);
  }
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(STORAGE_KEY_PLANNING_SNAPSHOT_PREFIX)) keys.push(k);
  }
  for (const k of PLANNING_PREF_KEYS) {
    if (localStorage.getItem(k) !== null) keys.push(k);
  }
  return keys;
}

/**
 * Remove all planning-related localStorage keys (consent record, snapshots,
 * and planning preference flags). Returns lists of removed keys and any errors.
 * @returns {DeletionResult}
 */
export function deletePlanningData() {
  const targets = _planningKeys();
  const removed = [];
  const errors = [];
  for (const k of targets) {
    try {
      localStorage.removeItem(k);
      removed.push(k);
    } catch {
      errors.push(k);
    }
  }
  return { removed, errors };
}

/**
 * Return a map of all planning-related localStorage keys to their parsed values.
 * Snapshot JSON values are parsed; preference flags are returned as strings.
 * @returns {Record<string, unknown>}
 */
export function listPlanningData() {
  /** @type {Record<string, unknown>} */
  const result = {};
  for (const k of _planningKeys()) {
    const raw = localStorage.getItem(k);
    if (raw === null) continue;
    try {
      result[k] = JSON.parse(raw);
    } catch {
      result[k] = raw;
    }
  }
  return result;
}

/**
 * Enumerate planning snapshot keys and remove those whose `_writtenAt`
 * timestamp is older than `retentionDays`. Keys with missing or malformed
 * `_writtenAt` are skipped (fail-open).
 * @param {number} retentionDays
 * @returns {RetentionResult}
 */
export function runRetentionCleanup(retentionDays) {
  const cutoff = retentionDays * 86400000;
  const removed = [];
  try {
    const snapshotKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_KEY_PLANNING_SNAPSHOT_PREFIX)) snapshotKeys.push(k);
    }
    for (const k of snapshotKeys) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (!parsed._writtenAt) continue;
        const written = Date.parse(parsed._writtenAt);
        if (!Number.isFinite(written)) continue;
        if (Date.now() - written > cutoff) {
          localStorage.removeItem(k);
          removed.push(k);
        }
      } catch {
        // skip malformed entries — fail-open
      }
    }
    return { removed, error: null };
  } catch (e) {
    return { removed, error: e instanceof Error ? e : new Error(String(e)) };
  }
}
