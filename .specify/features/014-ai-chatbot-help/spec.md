# Feature Specification: AI Chatbot Assistant

**Feature Branch**: `014-ai-chatbot-help`  
**Created**: 2026-04-17  
**Status**: Clarified  
**Input**: User description: "I want to integrate an AI chatbot that helps the user to use and understand the software. The chatbot should have access to the user documentation (see feature 013) and also on the specification files for more details and even the source code in case anything is really hard to find out. all access for the ai should be read-only."

## Clarifications

### Session 2026-04-17

- Q: Should the chatbot UI be a slide-in panel or a modal overlay? → A: Slide-in panel (calendar remains visible)
- Q: If the user closes and reopens the chatbot panel within the same page load, should the conversation be preserved or reset? → A: Preserve — history survives panel close; cleared only on page reload
- Q: How should the chatbot handle input in languages other than English or German? → A: Best effort — respond in the user's language; EN/DE are the only guaranteed languages
- Q: What should the chatbot do if it cannot find the answer in any knowledge source? → A: Admit it doesn't know and direct the user to the docs panel or Settings page

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Get Help Using the Application (Priority: P1)

A user is confused about how to do something in the application — for example, how to copy a time entry, what the ArbZG indicators mean, or how to configure the Redmine URL. They open the chatbot panel and ask in plain language. The chatbot responds with a clear, accurate explanation drawn from the user documentation.

**Why this priority**: This is the core value of the feature. All other stories build on this foundation, and it alone constitutes a usable MVP: a user can ask a question and get a helpful answer.

**Independent Test**: Can be fully tested by opening the chatbot, asking "How do I copy a time entry?", and verifying the response correctly describes the copy-paste workflow without requiring the user to navigate elsewhere.

**Acceptance Scenarios**:

1. **Given** a user is on the main calendar view, **When** they open the chatbot and ask a question about any documented feature, **Then** the chatbot responds with a relevant, accurate answer within a reasonable time.
2. **Given** the chatbot has responded, **When** the user asks a follow-up question in the same session, **Then** the chatbot maintains conversational context and gives a coherent follow-up answer.
3. **Given** a user has had a conversation and closes the panel, **When** they reopen the panel within the same page load, **Then** the full conversation history is still visible and the session continues.
3. **Given** a user asks a question in German, **When** the chatbot processes it, **Then** the response is also in German (matching the user's language).
4. **Given** a user asks something completely outside the scope of the application (e.g. "What is the weather today?"), **When** the chatbot responds, **Then** it politely declines and redirects the user to application-related topics.

---

### User Story 2 - Get Clarification on Feature Behaviour (Priority: P2)

A user encounters behaviour they don't understand — for example, why a time entry can't be saved, what a specific constraint means, or what happens to entries when switching the day range. They ask the chatbot for a deeper explanation. The chatbot can draw on the feature specifications for more detail than the user documentation alone provides.

**Why this priority**: Some questions require more detail than the user docs cover. Falling back to the spec files bridges the gap without exposing implementation details unnecessarily. Independently testable once P1 is working.

**Independent Test**: Can be tested by asking a question whose answer is only in the spec files (not the user docs), and verifying the chatbot gives a correct, detailed response.

**Acceptance Scenarios**:

1. **Given** a user asks a question whose answer is in the specification files but not in the user documentation, **When** the chatbot responds, **Then** it provides a correct and helpful answer derived from the spec.
2. **Given** the chatbot uses information from spec files, **When** it responds, **Then** it presents the information in plain, user-friendly language (not raw spec formatting).

---

### User Story 3 - Source Code Lookup for Edge Cases (Priority: P3)

A technically sophisticated user (e.g. a developer self-hosting the app) asks a very specific question whose answer can only be determined from the source code — for example, the exact format of the start-time tag in comments, or which localStorage key stores a specific preference. The chatbot looks up the source code and provides an accurate answer.

**Why this priority**: This covers a narrow but valid use case. The source code is a last-resort reference; most users will never need it. It is independently testable once P1 and P2 are working.

**Independent Test**: Can be tested by asking a question that can only be answered by reading the source code (e.g. "What is the exact format of the start time tag stored in entry comments?") and verifying the chatbot gives the correct answer (`[start:HH:MM]`).

**Acceptance Scenarios**:

1. **Given** a user asks a question whose answer requires reading the source code, **When** the chatbot responds, **Then** it provides a correct answer and, if appropriate, notes that the detail is a technical implementation.
2. **Given** the chatbot accesses source code, **When** it responds, **Then** it does not expose security-sensitive information (e.g. API keys, credentials, or user data).

---

### Edge Cases

- What happens if the AI service is unavailable — does the chatbot show a clear error or silently fail?
- Non-EN/DE languages: the chatbot responds on a best-effort basis in the user's language; English and German are the only guaranteed languages.
- What if the user's question is ambiguous — does the chatbot ask for clarification or guess?
- What if the user documentation (feature 013) has not yet been written or is incomplete?
- Cannot find answer: chatbot honestly admits it doesn't know and directs the user to the docs panel or Settings page (FR-011).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST provide a clearly accessible chatbot entry point (e.g. a chat icon or button) visible on the main calendar view without scrolling, which opens a slide-in panel alongside the calendar (not a modal — the calendar MUST remain visible and interactive while the panel is open).
- **FR-002**: The chatbot MUST be able to answer questions using the user documentation (feature 013) as its primary knowledge source.
- **FR-003**: The chatbot MUST be able to fall back to the feature specification files (`.specify/features/*/spec.md`) when the user documentation does not contain a sufficient answer.
- **FR-004**: The chatbot MUST be able to fall back to the application source code as a last resort for questions that cannot be answered from documentation or specifications.
- **FR-005**: All chatbot access to documentation, specifications, and source code MUST be read-only; the chatbot MUST NOT modify any file or application state.
- **FR-006**: The chatbot MUST maintain conversational context within a single session (i.e. follow-up questions relate to the previous exchange).
- **FR-007**: The chatbot MUST respond in the same language the user writes in. English and German are the guaranteed supported languages. For other languages, the chatbot responds on a best-effort basis using the AI model's native multilingual capability; no fallback to English is required for non-EN/DE input.
- **FR-008**: The chatbot MUST decline to answer questions unrelated to the application and redirect the user to relevant topics.
- **FR-009**: The chatbot MUST display a clear, user-friendly error message if the underlying AI service is unavailable or returns an error.
- **FR-010**: The chatbot MUST NOT expose sensitive information such as API keys, credentials, or personal user data in its responses, even if such information appears in source files.
- **FR-011**: When the chatbot cannot find a sufficient answer in any knowledge source, it MUST acknowledge this honestly and direct the user to the documentation panel or Settings page as a next step, rather than guessing or hallucinating an answer.

### Key Entities

- **Chatbot Session**: A single continuous conversation between a user and the chatbot, lasting until the page is reloaded. Closing and reopening the panel within the same page load preserves the conversation history.
- **Knowledge Source**: Any read-only resource the chatbot may consult — user documentation, specification files, or source code — accessed in priority order.
- **Chatbot Panel**: A slide-in panel that opens alongside the calendar, displaying the conversation history and accepting user input without obscuring the calendar view.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 90% of questions about documented features receive a correct and relevant answer on the first attempt.
- **SC-002**: The chatbot responds to any question within 10 seconds under normal network conditions.
- **SC-003**: The chatbot correctly declines 100% of out-of-scope questions (e.g. questions unrelated to the application) without providing an irrelevant answer.
- **SC-004**: Users can find the answer to their question via the chatbot in fewer interactions than navigating the documentation manually, as measured by session length.
- **SC-005**: No sensitive data (API keys, credentials) appears in any chatbot response across all tested scenarios.

## Assumptions

- An external AI service (accessed via API) will power the chatbot; the application itself does not run a local AI model. The choice of specific AI provider is a planning-phase decision.
- The chatbot will be embedded in the existing single-page application without requiring a backend server beyond what the CORS proxy already provides.
- User documentation (feature 013) will be completed and available before this feature is fully implemented; if not, the chatbot falls back to specification files only.
- The chatbot panel is a slide-in panel added to `index.html`; it does not replace or modify the existing settings or documentation pages, and it does not obscure the calendar.
- Conversation history persists in-memory for the lifetime of the page; it survives panel close/reopen but is cleared on page reload. No conversation data is stored server-side or in any persistent storage.
- The source code access is scoped to the application's own files in the repository; the chatbot does not access external codebases or dependencies.
- All strings in the chatbot UI (labels, placeholder text, error messages) are managed through the existing localisation system (`js/i18n.js`).
