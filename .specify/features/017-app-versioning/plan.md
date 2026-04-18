# Implementation Plan: App Versioning

**Branch**: `017-app-versioning` | **Date**: 2026-04-18 | **Spec**: [spec.md](spec.md)

## Summary

Add semantic versioning to the app. The deploy workflow auto-increments the version based on commit messages (feature merge = MINOR, other = PATCH), writes a `version.json` file into the deployed build, and the app displays it on the settings page. CI/deploy workflows get path filters to skip documentation-only commits. BACKLOG.md gets a version column populated by the deploy workflow.

## Technical Context

**Language/Version**: JavaScript ES2022, GitHub Actions YAML
**Primary Dependencies**: None new (uses existing GitHub Actions)
**Testing**: Unit test for version display; existing CI validates
**Target Platform**: GitHub Actions (CI/CD), browser (version display)
**Project Type**: Static web application — CI/CD enhancement
**Constraints**: No build step; version injected as a static JSON file at deploy time

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Redmine API Contract | N/A | No Redmine API changes |
| II. Calendar-First UX | PASS | Version display is minimal, non-intrusive |
| III. Test-First | PASS | Unit test for version display logic |
| IV. Simplicity & YAGNI | PASS | Uses git tags + simple JSON file; no version management library |
| V. Security by Default | PASS | No credentials involved |

## Project Structure

```text
js/version.js           # NEW: fetch and display version
version.json            # Generated at deploy time (gitignored)
.github/workflows/ci.yml      # Updated: add path filters
.github/workflows/deploy.yml  # Updated: version generation, path filters
settings.html           # Updated: show version
js/i18n.js              # Updated: version label translations
BACKLOG.md              # Updated: add Version column
```
