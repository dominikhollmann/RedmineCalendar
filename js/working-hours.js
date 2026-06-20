import { STORAGE_KEY_WORKING_HOURS, STORAGE_KEY_WEEKLY_HOURS } from './config.js';

export function readWorkingHours() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WORKING_HOURS);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.start && parsed?.end) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function writeWorkingHours(start, end) {
  localStorage.setItem(STORAGE_KEY_WORKING_HOURS, JSON.stringify({ start, end }));
}

export function clearWorkingHours() {
  localStorage.removeItem(STORAGE_KEY_WORKING_HOURS);
}

export function readWeeklyHours() {
  const val = localStorage.getItem(STORAGE_KEY_WEEKLY_HOURS);
  const num = val ? parseFloat(val) : NaN;
  return Number.isFinite(num) && num > 0 ? num : null;
}

export function writeWeeklyHours(hours) {
  localStorage.setItem(STORAGE_KEY_WEEKLY_HOURS, String(hours));
}
