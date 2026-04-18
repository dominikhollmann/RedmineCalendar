# Implementation Plan: AI Chat Calendar Actions

**Branch**: `015-chat-calendar-actions` | **Date**: 2026-04-18 | **Spec**: [spec.md](spec.md)

## Summary

Add tool/function calling to the AI chatbot so users can query, create, edit, and delete time entries via natural language. The AI invokes structured tools; for write operations the app opens the existing time entry modal pre-filled with the AI-extracted values, so the user confirms via the familiar Save/Delete UI. Queries are executed directly and results returned in the chat.

## Technical Context

**Language/Version**: JavaScript ES2022 (vanilla ES modules)
**Primary Dependencies**: Claude API (tool calling), OpenAI API (tool calling), existing chatbot infrastructure (feature 014)
**Testing**: Unit tests for tool schema/dispatch, UI tests for chat → modal flow
**Target Platform**: Modern browsers
**Project Type**: Static web application — chatbot enhancement
**Constraints**: No new dependencies; tool calling via existing API providers

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Redmine API Contract | PASS | Uses existing redmine-api.js methods |
| II. Calendar-First UX | PASS | Modal-based confirmation preserves calendar interaction patterns |
| III. Test-First | PASS | Unit + UI tests per constitution v1.3.0 |
| IV. Simplicity & YAGNI | PASS | Reuses existing modal and API client; no new abstractions |
| V. Security by Default | PASS | Write operations require user confirmation via modal |

## Project Structure

```text
js/chatbot-api.js       # Updated: add tool calling support for Claude + OpenAI
js/chatbot-tools.js     # NEW: tool schemas, dispatch logic, parameter validation
js/chatbot.js           # Updated: handle tool_use responses, open modal
js/knowledge.js         # Updated: include current date in system prompt
js/time-entry-form.js   # Unchanged (modal already supports prefill)
js/redmine-api.js       # Unchanged (query/CRUD already exists)
tests/unit/chatbot-tools.test.js  # NEW: test tool dispatch and validation
tests/ui/chatbot.spec.js          # Updated: test chat → modal flow
```
