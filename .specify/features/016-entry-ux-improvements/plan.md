# Implementation Plan: Entry UX Improvements

**Branch**: `016-entry-ux-improvements` | **Date**: 2026-04-18 | **Spec**: [spec.md](spec.md)

## Summary

Three small UX improvements: (1) `#number` search syntax for ID-only ticket lookup, (2) clickable ticket hyperlinks on calendar entries, (3) optional comment field in the time entry form. All changes are in existing files — no new modules needed.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules)
**Files Modified**: `js/redmine-api.js`, `js/calendar.js`, `js/time-entry-form.js`, `js/i18n.js`, `css/style.css`
**Testing**: Unit tests + UI tests per constitution v1.3.0

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Redmine API Contract | PASS | Uses existing API endpoints |
| II. Calendar-First UX | PASS | Enhances calendar interactions |
| III. Test-First | PASS | Unit + UI tests included |
| IV. Simplicity & YAGNI | PASS | Minimal changes to existing files |
| V. Security by Default | PASS | Hyperlink uses config.json server URL; no XSS risk (textContent for display, href constructed from trusted config) |
