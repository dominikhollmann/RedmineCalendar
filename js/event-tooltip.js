// Pure leaf: assembles the ordered, localized text lines for one calendar /
// planning event's full-text hover tooltip (feature 053). No DOM, no
// module-level i18n — the translator is injected so the builder is
// node-unit-testable and free of import cycles. Reuses the existing
// formatProject / formatDuration helpers so the tooltip lines match the chip.

import { formatProject } from './redmine-api.js';
import { formatDuration, diffMinutes } from './time-entry-form-utils.js';

/**
 * @typedef {Object} EventTooltipFields
 * @property {number|string|null} [issueId]
 * @property {string|null} [issueSubject]
 * @property {string|null} [projectIdentifier]
 * @property {string|null} [projectName]
 * @property {string|null} [startTime]      HH:MM
 * @property {string|null} [endTime]        HH:MM
 * @property {number|null} [durationHours]  derived from start/end when omitted
 * @property {string|null} [comment]
 */

/**
 * Assemble the ordered tooltip lines describing one event:
 * `[issueLine, projectLine?, timeLine?, commentLine?]`. Lines whose source data
 * is absent are omitted entirely (never blank). The issue line is always present.
 *
 * @param {EventTooltipFields} fields
 * @param {(key: string, vars?: Record<string, any>) => string} t  i18n translator
 * @returns {string[]}
 */
export function buildEventTooltipText(fields, t) {
  const lines = [];

  // Line 1 — issue (always present). A subject with an id renders "#id subject";
  // a subject without an id (e.g. a planning meeting) drops the bare "#"; no
  // subject falls back to the localized "Issue #id".
  const hasSubject = fields.issueSubject != null && fields.issueSubject !== '';
  const hasId = fields.issueId != null && fields.issueId !== '';
  if (hasSubject) {
    lines.push(hasId ? `#${fields.issueId} ${fields.issueSubject}` : String(fields.issueSubject));
  } else {
    lines.push(t('entry.fallback_subject', { id: fields.issueId ?? '' }));
  }

  // Line 2 — project (omitted when no project data).
  if (fields.projectName || fields.projectIdentifier) {
    const projLine = formatProject(fields.projectIdentifier, fields.projectName);
    if (projLine) lines.push(projLine);
  }

  // Line 3 — time range + duration (omitted unless both start and end present).
  if (fields.startTime && fields.endTime) {
    const durationHours =
      fields.durationHours != null
        ? fields.durationHours
        : diffMinutes(fields.startTime, fields.endTime) / 60;
    lines.push(`${fields.startTime} – ${fields.endTime} (${formatDuration(durationHours)})`);
  }

  // Line 4 — comment (omitted when absent/empty).
  if (fields.comment) lines.push(String(fields.comment));

  return lines;
}
