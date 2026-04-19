# Implementation Plan: Mobile Calendar View

**Branch**: `012-mobile-calendar` | **Date**: 2026-04-19 | **Spec**: [spec.md](spec.md)

## Summary

Make the existing web app responsive for mobile devices. CSS media queries adapt the calendar to a single-day timegrid view on narrow screens, the time entry form to full-width, and panels (chat, docs) to full-screen overlays. Add swipe navigation between days. No separate codebase — single responsive app.

## Technical Context

**Language/Version**: CSS3 media queries + JavaScript ES2022 (touch events)
**Primary Dependencies**: FullCalendar v6 (already has timeGridDay view), existing CSS
**Testing**: UI tests with mobile viewport, manual testing on phone
**Target Platform**: Mobile browsers (Chrome/Safari on iOS and Android)
**Project Type**: Static web application — responsive adaptation
**Constraints**: CSS-only changes where possible; minimal JS for swipe navigation and view auto-switching

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Redmine API Contract | N/A | No API changes |
| II. Calendar-First UX | PASS | Calendar remains the primary view, adapted for touch |
| III. Test-First | PASS | UI tests with mobile viewport |
| IV. Simplicity & YAGNI | PASS | CSS media queries, no new dependencies |
| V. Security by Default | N/A | No security changes |

## Project Structure

```text
css/style.css           # Updated: add media queries for mobile breakpoints
css/mobile.css          # NEW: dedicated mobile stylesheet (imported conditionally)
js/calendar.js          # Updated: auto-switch to day view on mobile, swipe handler
index.html              # Updated: viewport meta tag (already present)
settings.html           # Already responsive (settings-card has max-width)
tests/ui/mobile.spec.js # NEW: mobile viewport UI tests
```
