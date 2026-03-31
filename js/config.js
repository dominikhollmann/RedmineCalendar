// ── Calendar display constants ────────────────────────────────────
export const SLOT_DURATION  = '00:15:00';
export const SNAP_DURATION  = '00:15:00';
export const START_HOUR     = 7;   // 07:00
export const END_HOUR       = 19;  // 19:00

// ── Infrastructure constants ──────────────────────────────────────
export const PROXY_PORT  = 8010;
export const COOKIE_NAME = 'redmine_calendar_config';

// ── Start-time tag helpers ────────────────────────────────────────
const START_TAG_REGEX = /\s*\[start:(\d{2}:\d{2})\]$/;

/**
 * Parse the [start:HH:MM] tag from a raw Redmine comment.
 * Returns { startTime: 'HH:MM' | null, comment: string (tag stripped) }
 */
export function parseStartTag(rawComment) {
  if (!rawComment) return { startTime: null, comment: '' };
  const match = rawComment.match(START_TAG_REGEX);
  if (!match) return { startTime: null, comment: rawComment };
  return {
    startTime: match[1],
    comment: rawComment.replace(START_TAG_REGEX, '').trimEnd(),
  };
}

/**
 * Append (or replace) the [start:HH:MM] tag at the end of a comment.
 * Returns the full string to store in Redmine's comments field.
 */
export function applyStartTag(comment, startTime) {
  const base = (comment ?? '').replace(START_TAG_REGEX, '').trimEnd();
  if (!startTime) return base;
  return base ? `${base} [start:${startTime}]` : `[start:${startTime}]`;
}
