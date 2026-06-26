import {
  STORAGE_KEY_WORKING_HOURS,
  STORAGE_KEY_WEEKLY_HOURS,
  DEFAULT_WEEKLY_HOURS,
} from './config.js';

const DEFAULT_WORKING_HOURS = { start: '08:00', end: '18:00' };

export function readWorkingHours() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WORKING_HOURS);
    if (!raw) return DEFAULT_WORKING_HOURS;
    const parsed = JSON.parse(raw);
    if (parsed?.start && parsed?.end) return parsed;
    return DEFAULT_WORKING_HOURS;
  } catch {
    return DEFAULT_WORKING_HOURS;
  }
}

export function writeWorkingHours(start, end) {
  localStorage.setItem(STORAGE_KEY_WORKING_HOURS, JSON.stringify({ start, end }));
}

export function clearWorkingHours() {
  localStorage.removeItem(STORAGE_KEY_WORKING_HOURS);
}

/**
 * Weekly contracted hours. Always returns a usable value — falls back to
 * DEFAULT_WEEKLY_HOURS when nothing valid is stored, so callers never need to
 * handle a missing/zero configuration.
 * @returns {number}
 */
export function readWeeklyHours() {
  const val = localStorage.getItem(STORAGE_KEY_WEEKLY_HOURS);
  const num = val ? parseFloat(val) : NaN;
  return Number.isFinite(num) && num > 0 ? num : DEFAULT_WEEKLY_HOURS;
}

export function writeWeeklyHours(hours) {
  localStorage.setItem(STORAGE_KEY_WEEKLY_HOURS, String(hours));
}
