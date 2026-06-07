// Input-validation helpers shared across chatbot tool implementations.
// Pure functions, no imports — safe to import from any sub-module.

const _DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const _TIME_RE = /^\d{2}:\d{2}$/;
export const isValidDate = (v) => typeof v === 'string' && _DATE_RE.test(v);
export const isValidTime = (v) => v == null || (typeof v === 'string' && _TIME_RE.test(v));
export const isValidId = (v) => v == null || (Number.isInteger(v) && v > 0);
export const isValidHours = (v) =>
  v == null || (typeof v === 'number' && isFinite(v) && v >= 0 && v <= 24);
export const isValidQuery = (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= 500;
