# Implementation Plan: Smart AI Context Loading

**Branch**: `020-smart-ai-context` | **Date**: 2026-04-19 | **Spec**: [spec.md](spec.md)

## Summary

Reduce system prompt size by ~70%: always include user docs (concise), remove feature specs entirely, include source code only for technical questions via keyword matching. Conversation history informs context selection for follow-ups.

## Technical Context

**Files Modified**: `js/knowledge.js`
**Testing**: Unit test for context selection logic
**Approach**: Keyword-based topic classifier maps user messages to relevant source files

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| III. Test-First | PASS | Unit tests for context selection |
| IV. Simplicity & YAGNI | PASS | Simple keyword matching, no ML/embeddings |
