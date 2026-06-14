// @ts-nocheck
import { t } from './i18n.js';
import { deselectAll } from './entry-selection.js';

/** @type {{ issueId: number, issueSubject: string|null, projectName: string|null, activityId: number|null, hours: number, comment: string|null, startTime: string|null }|null} */
let _clipboard = null;

/** Copy a time entry into the shared clipboard and show the clipboard banner. */
export function copyToClipboard(entry) {
  _clipboard = {
    issueId: entry.issueId,
    issueSubject: entry.issueSubject,
    projectName: entry.projectName,
    activityId: entry.activityId,
    hours: entry.hours,
    comment: entry.comment,
    startTime: entry.startTime,
  };
  deselectAll();
  document.getElementById('clipboard-banner-text').textContent = t('calendar.clipboard_banner', {
    id: String(entry.issueId),
    subject: entry.issueSubject ?? '',
  });
  document.getElementById('clipboard-banner').classList.remove('hidden');
}

/** Clear the clipboard and hide the banner. */
export function clearClipboard() {
  _clipboard = null;
  document.getElementById('clipboard-banner').classList.add('hidden');
}

/** Return the current clipboard payload, or null if empty. */
export function getClipboard() {
  return _clipboard;
}

document.getElementById('clipboard-banner-clear')?.addEventListener('click', clearClipboard);
