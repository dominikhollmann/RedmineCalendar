# Feature Specification: Smart AI Context Loading

**Feature Branch**: `020-smart-ai-context`
**Created**: 2026-04-19
**Status**: Draft
**Input**: User description: "Optimize AI chatbot context — currently all source code and specs are sent in every system prompt, using excessive tokens and causing rate limits. Send only relevant context based on the user's question."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reduced Token Usage (Priority: P1)

A user chats with the AI assistant. Instead of sending all source code and all feature specs in every request, the system sends only the context relevant to the user's question. This dramatically reduces token usage, lowers API costs, and avoids rate limits.

**Why this priority**: The current approach sends ~50KB+ of source code and specs in every system prompt. With tool calling (2 API calls per interaction), this doubles the waste. Reducing context size is the highest-impact optimization for cost and rate limits.

**Independent Test**: Ask a simple question like "How do I copy a time entry?" and measure the token count of the API request. Compare to the current token count — it should be significantly smaller.

**Acceptance Scenarios**:

1. **Given** a user asks "How do I copy a time entry?", **When** the AI processes the request, **Then** only the copy-paste documentation and relevant source (clipboard logic in calendar.js) are included in the context — not the entire codebase.
2. **Given** a user asks "What is the ArbZG daily limit?", **When** the AI processes the request, **Then** only the ArbZG documentation and arbzg.js are included — not settings.js, chatbot.js, etc.
3. **Given** a user asks the AI to create a time entry, **When** the tool call is made, **Then** the context includes only the tool schemas and time entry form logic — not all feature specs.
4. **Given** the reduced context, **When** the AI responds, **Then** the response quality is the same as with full context (no loss of accuracy for relevant questions).

---

### User Story 2 - Graceful Fallback for Broad Questions (Priority: P2)

When a user asks a broad question that spans multiple features ("Tell me everything about the app"), the system includes enough context to give a useful answer without sending everything.

**Why this priority**: Some questions genuinely need broad context. The system should handle this gracefully without falling back to sending the entire codebase.

**Independent Test**: Ask "What features does this app have?" — verify the AI gives a comprehensive answer using the user documentation (which covers all features) without needing all source code.

**Acceptance Scenarios**:

1. **Given** a user asks a broad question, **When** the system selects context, **Then** it prioritizes user documentation (which summarizes all features) over source code.
2. **Given** a user asks about a topic that spans multiple modules, **When** context is selected, **Then** only the relevant modules are included, not all of them.
3. **Given** the AI cannot answer from the selected context, **When** it responds, **Then** it says "I don't have enough context to answer that" rather than hallucinating.

---

### Edge Cases

- What if the user's question is ambiguous and the system selects wrong context? The AI should still be able to say "I'm not sure" rather than give wrong answers.
- What about follow-up questions in a conversation? The system should consider the conversation history when selecting context (e.g., if the user has been asking about ArbZG, keep ArbZG context loaded).
- What about tool calls? The AI needs the tool schemas in every request, but not all the source code.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST select relevant context based on the user's message before sending it to the AI.
- **FR-002**: User documentation (`docs/content.*.md`) MUST always be included as baseline context (it covers all features concisely).
- **FR-003**: Source code files MUST only be included when the question is about implementation details, debugging, or technical questions — not for general usage questions.
- **FR-004**: Feature specs MUST NOT be included in the system prompt (they are developer artifacts, not needed for user-facing assistance).
- **FR-005**: Tool schemas MUST always be included when tool calling is enabled.
- **FR-006**: The context selection MUST NOT degrade response quality for questions that the full-context version could answer.
- **FR-007**: The system prompt size MUST be reduced by at least 60% for typical user questions compared to the current approach.
- **FR-008**: Conversation history MUST be considered when selecting context for follow-up questions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Average system prompt size reduced by at least 60% for typical queries.
- **SC-002**: API rate limit errors reduced by at least 50% compared to current behavior.
- **SC-003**: Response accuracy for feature-usage questions remains at 90%+ (no regression from full context).
- **SC-004**: AI chat response time improves (smaller prompts = faster API responses).

## Assumptions

- User documentation (`docs/content.en.md` / `docs/content.de.md`) is comprehensive enough to answer most usage questions without source code.
- The AI model can determine what context it needs from the user's message (keyword matching, topic classification).
- Source code context is only needed for technical/debugging questions — most users ask "how do I..." questions that the docs can answer.
- Feature specs (`.specify/features/*/spec.md`) are developer artifacts and not useful for end-user assistance — removing them from the prompt has no impact on response quality.
- The context selection can be done client-side (in the browser) without an additional API call — e.g., keyword matching or a simple topic classifier.
